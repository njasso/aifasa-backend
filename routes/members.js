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
        role
      } = req.body;

      if (!first_name || !last_name) {
        await cleanUpTempFiles(req.files);
        return res.status(400).json({ error: 'Le prénom et le nom sont requis' });
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
        cv_public_id
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
        role
      } = req.body;

      const existing = await Member.findById(memberId);
      if (!existing) {
        await cleanUpTempFiles(req.files);
        return res.status(404).json({ error: 'Membre non trouvé' });
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
        role: role || existing.role
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