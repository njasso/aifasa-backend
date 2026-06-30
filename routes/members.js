// routes/members.js
const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs'); // ✅ Utiliser fs normal (pas fs.promises)
const fsPromises = require('fs').promises; // Pour les opérations async
const path = require('path');

// Configuration de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    // ✅ Utiliser fs.existsSync (synchrone)
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// ✅ Nettoyage avec fsPromises
const cleanUpTempFiles = async (files) => {
  if (files) {
    const filesToClean = [
      ...(files.profilePicture || []),
      ...(files.cvFile || [])
    ];
    for (const file of filesToClean) {
      try {
        if (file.path && fs.existsSync(file.path)) {
          await fsPromises.unlink(file.path);
        }
      } catch (e) {
        console.error("Erreur suppression temp:", e);
      }
    }
  }
};

// ✅ Résout un email de compte utilisateur vers son user_id (pour le lien admin)
const resolveUserIdFromEmail = async (email) => {
  if (!email || !email.trim()) return undefined; // undefined = ne pas toucher au lien existant
  const { pool } = require('../config/db');
  const result = await pool.query('SELECT id FROM users WHERE email = $1', [email.trim()]);
  if (result.rows.length === 0) {
    const err = new Error(`Aucun compte utilisateur trouvé pour l'email "${email}"`);
    err.statusCode = 400;
    throw err;
  }
  return result.rows[0].id;
};

// ============ ROUTES PUBLIQUES ============

router.get('/', async (req, res) => {
  try {
    const members = await Member.findAll();
    res.json(members);
  } catch (error) {
    console.error('❌ Erreur GET membres:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// ============ ESPACE MEMBRE - LIBRE-SERVICE ============
// IMPORTANT : ces routes doivent rester déclarées AVANT '/:id' pour
// qu'Express ne traite pas "me" comme un identifiant numérique.

// GET - Ma propre fiche annuaire (membre connecté, basé sur le compte lié)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const member = await Member.findByUserId(req.user.id);
    if (!member) {
      return res.status(404).json({
        error: "Aucune fiche membre n'est associée à votre compte. Contactez un administrateur pour faire le lien."
      });
    }
    res.json(member);
  } catch (error) {
    console.error('❌ Erreur GET /members/me:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Modifier ma propre fiche annuaire (champs personnels uniquement)
// Volontairement exclus du formulaire libre-service : role, has_paid_adhesion,
// social_contribution_status, tontine_status, ag_absence_count,
// is_new_member, last_annual_inscription_date — réservés à l'admin/trésorerie.
router.put(
  '/me',
  authenticateToken,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cvFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const existing = await Member.findByUserId(req.user.id);
      if (!existing) {
        await cleanUpTempFiles(req.files);
        return res.status(404).json({
          error: "Aucune fiche membre n'est associée à votre compte. Contactez un administrateur pour faire le lien."
        });
      }

      const {
        first_name,
        last_name,
        phone_number,
        sex,
        location,
        address,
        contact,
        profession,
        employment_structure,
        company_or_project,
        activities
      } = req.body;

      const updateData = {
        first_name: first_name || existing.first_name,
        last_name: last_name || existing.last_name,
        phone_number: phone_number !== undefined ? phone_number : existing.phone_number,
        sex: sex || existing.sex,
        location: location || existing.location,
        address: address || existing.address,
        contact: contact || existing.contact,
        profession: profession || existing.profession,
        employment_structure: employment_structure !== undefined ? employment_structure : existing.employment_structure,
        company_or_project: company_or_project !== undefined ? company_or_project : existing.company_or_project,
        activities: activities !== undefined ? activities : existing.activities,
        // ⛔ role et champs de gouvernance/trésorerie volontairement non repris ici
      };

      const profilePictureFile = req.files?.profilePicture ? req.files.profilePicture[0] : null;
      if (profilePictureFile) {
        if (existing.public_id) {
          await cloudinary.uploader.destroy(existing.public_id).catch(e => console.error("Erreur suppression ancienne photo:", e));
        }
        const result = await cloudinary.uploader.upload(profilePictureFile.path, {
          folder: 'aifasa_members_profiles',
          resource_type: 'image'
        });
        updateData.photo_url = result.secure_url;
        updateData.public_id = result.public_id;
      }

      const cvFile = req.files?.cvFile ? req.files.cvFile[0] : null;
      if (cvFile) {
        if (existing.cv_public_id) {
          await cloudinary.uploader.destroy(existing.cv_public_id, { resource_type: 'raw' }).catch(e => console.error("Erreur suppression ancien CV:", e));
        }
        const result = await cloudinary.uploader.upload(cvFile.path, {
          folder: 'aifasa_members_cvs',
          resource_type: 'raw'
        });
        updateData.cv_url = result.secure_url;
        updateData.cv_public_id = result.public_id;
      }

      const member = await Member.update(existing.id, updateData);
      console.log(`✅ Membre (libre-service) mis à jour ID: ${existing.id} par user ${req.user.id}`);
      res.json(member);
    } catch (error) {
      console.error('❌ Erreur PUT /members/me:', error.message);
      await cleanUpTempFiles(req.files);
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    } finally {
      await cleanUpTempFiles(req.files);
    }
  }
);

// GET - Fiche détaillée d'un membre (public)
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }
    res.json(member);
  } catch (error) {
    console.error('❌ Erreur GET membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES ADMIN ============

// GET - Email du compte de connexion lié à un membre (admin uniquement)
// Jamais exposé via les routes publiques GET / et GET /:id pour ne pas
// divulguer les adresses email de connexion des membres.
router.get('/:id/linked-account', authenticateToken, isAdmin, async (req, res) => {
  try {
    const email = await Member.getLinkedAccountEmail(req.params.id);
    res.json({ email });
  } catch (error) {
    console.error('❌ Erreur GET /members/:id/linked-account:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST - Créer un membre
router.post(
  '/',
  authenticateToken,
  isAdmin,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cvFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      console.log('📝 POST /members - Body:', req.body);
      console.log('📎 Fichiers reçus:', req.files ? Object.keys(req.files) : 'aucun');

      const {
        first_name,
        last_name,
        phone_number,
        sex,
        location,
        address,
        contact,
        profession,
        employment_structure,
        company_or_project,
        activities,
        role,
        user_email
      } = req.body;

      if (!first_name || !last_name) {
        await cleanUpTempFiles(req.files);
        return res.status(400).json({ error: 'Le prénom et le nom sont requis' });
      }

      let user_id;
      try {
        user_id = await resolveUserIdFromEmail(user_email);
      } catch (linkError) {
        await cleanUpTempFiles(req.files);
        return res.status(linkError.statusCode || 400).json({ error: linkError.message });
      }

      const profilePictureFile = req.files?.profilePicture ? req.files.profilePicture[0] : null;
      const cvFile = req.files?.cvFile ? req.files.cvFile[0] : null;

      let photo_url = null;
      let public_id = null;
      let cv_url = null;
      let cv_public_id = null;

      if (profilePictureFile) {
        const result = await cloudinary.uploader.upload(profilePictureFile.path, {
          folder: 'aifasa_members_profiles',
          resource_type: 'image'
        });
        photo_url = result.secure_url;
        public_id = result.public_id;
      }

      if (cvFile) {
        const result = await cloudinary.uploader.upload(cvFile.path, {
          folder: 'aifasa_members_cvs',
          resource_type: 'raw'
        });
        cv_url = result.secure_url;
        cv_public_id = result.public_id;
      }

      const member = await Member.create({
        first_name,
        last_name,
        phone_number: phone_number || '',
        sex: sex || '',
        location: location || '',
        address: address || '',
        contact: contact || '',
        profession: profession || '',
        employment_structure: employment_structure || '',
        company_or_project: company_or_project || '',
        activities: activities || '',
        role: role || 'member',
        photo_url,
        public_id,
        cv_url,
        cv_public_id,
        user_id
      });

      console.log(`✅ Membre créé ID: ${member.id}`);
      res.status(201).json(member);
    } catch (error) {
      console.error('❌ Erreur POST membre:', error.message);
      await cleanUpTempFiles(req.files);
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    } finally {
      await cleanUpTempFiles(req.files);
    }
  }
);

// ✅ PUT - Mettre à jour un membre
router.put(
  '/:id',
  authenticateToken,
  isAdmin,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cvFile', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const memberId = req.params.id;
      
      console.log(`📝 PUT /members/${memberId}`);
      console.log('📦 Body reçu:', req.body);
      console.log('📎 Fichiers reçus:', req.files ? Object.keys(req.files) : 'aucun');

      const {
        first_name,
        last_name,
        phone_number,
        sex,
        location,
        address,
        contact,
        profession,
        employment_structure,
        company_or_project,
        activities,
        role,
        user_email
      } = req.body;

      const existing = await Member.findById(memberId);
      if (!existing) {
        await cleanUpTempFiles(req.files);
        return res.status(404).json({ error: 'Membre non trouvé' });
      }

      // user_email vide/absent => on ne touche pas au lien existant.
      // user_email = '' explicitement envoyé pour délier ? on garde simple :
      // seule une adresse valide modifie le lien (voir resolveUserIdFromEmail).
      let user_id = existing.user_id;
      if (user_email !== undefined) {
        try {
          const resolved = await resolveUserIdFromEmail(user_email);
          if (resolved !== undefined) user_id = resolved;
        } catch (linkError) {
          await cleanUpTempFiles(req.files);
          return res.status(linkError.statusCode || 400).json({ error: linkError.message });
        }
      }

      const updateData = {
        first_name: first_name || existing.first_name,
        last_name: last_name || existing.last_name,
        phone_number: phone_number !== undefined ? phone_number : existing.phone_number,
        sex: sex || existing.sex,
        location: location || existing.location,
        address: address || existing.address,
        contact: contact || existing.contact,
        profession: profession || existing.profession,
        employment_structure: employment_structure !== undefined ? employment_structure : existing.employment_structure,
        company_or_project: company_or_project !== undefined ? company_or_project : existing.company_or_project,
        activities: activities !== undefined ? activities : existing.activities,
        role: role || existing.role,
        user_id
      };

      console.log('📝 Données mises à jour:', updateData);

      // Gérer la photo
      const profilePictureFile = req.files?.profilePicture ? req.files.profilePicture[0] : null;
      if (profilePictureFile) {
        if (existing.public_id) {
          await cloudinary.uploader.destroy(existing.public_id).catch(e => console.error("Erreur suppression ancienne photo:", e));
        }
        const result = await cloudinary.uploader.upload(profilePictureFile.path, {
          folder: 'aifasa_members_profiles',
          resource_type: 'image'
        });
        updateData.photo_url = result.secure_url;
        updateData.public_id = result.public_id;
      }

      // Gérer le CV
      const cvFile = req.files?.cvFile ? req.files.cvFile[0] : null;
      if (cvFile) {
        if (existing.cv_public_id) {
          await cloudinary.uploader.destroy(existing.cv_public_id, { resource_type: 'raw' }).catch(e => console.error("Erreur suppression ancien CV:", e));
        }
        const result = await cloudinary.uploader.upload(cvFile.path, {
          folder: 'aifasa_members_cvs',
          resource_type: 'raw'
        });
        updateData.cv_url = result.secure_url;
        updateData.cv_public_id = result.public_id;
      }

      const member = await Member.update(memberId, updateData);
      
      if (!member) {
        return res.status(404).json({ error: 'Membre non trouvé' });
      }

      console.log(`✅ Membre mis à jour ID: ${memberId}`);
      res.json(member);
    } catch (error) {
      console.error('❌ Erreur PUT membre:', error.message);
      console.error('Stack:', error.stack);
      await cleanUpTempFiles(req.files);
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    } finally {
      await cleanUpTempFiles(req.files);
    }
  }
);

// DELETE - Supprimer un membre
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const memberId = req.params.id;
    console.log(`📝 DELETE /members/${memberId}`);

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    if (member.public_id) {
      await cloudinary.uploader.destroy(member.public_id).catch(e => console.error("Erreur suppression photo:", e));
    }

    if (member.cv_public_id) {
      await cloudinary.uploader.destroy(member.cv_public_id, { resource_type: 'raw' }).catch(e => console.error("Erreur suppression CV:", e));
    }

    await Member.delete(memberId);
    console.log(`✅ Membre supprimé ID: ${memberId}`);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erreur DELETE membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;