const express = require('express');
const router = express.Router();
// Importez le modèle de membre approprié.
// Par exemple, si vous utilisez Sequelize, ce serait '.../models/member'.
const Member = require('../models/Member'); 
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises;

// Configuration de Multer pour le stockage temporaire
const upload = multer({ dest: 'uploads/' });

// Définition des champs pour Multer
const cpUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
  { name: 'cv', maxCount: 1 }, // Ajout du champ pour le CV
  { name: 'firstName' },
  { name: 'lastName' },
  { name: 'sex' },
  { name: 'location' },
  { name: 'address' },
  { name: 'contact' },
  { name: 'profession' },
  { name: 'employmentStructure' },
  { name: 'companyOrProject' },
  { name: 'activities' },
  { name: 'role' },
  { name: 'photo_url' },
  { name: 'public_id' },
  { name: 'cv_url' }, // Ajout pour la mise à jour
  { name: 'cv_public_id' }, // Ajout pour la mise à jour
  // Champs de statut financier mis à jour
  { name: 'is_new_member' },
  { name: 'last_annual_inscription_date' },
  { name: 'has_paid_adhesion' },
  { name: 'social_contribution_status' },
  { name: 'tontine_status' },
  { name: 'ag_absence_count' }
]);

// Route pour récupérer tous les membres
router.get('/', async (req, res) => {
  try {
    const members = await Member.findAll();
    res.json(members);
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des membres', details: error.message });
  }
});

// Route pour ajouter un nouveau membre (admin seulement, avec upload)
router.post('/', authenticateToken, cpUpload, async (req, res) => {
  if (req.user.role !== 'admin') {
    if (req.files.profilePicture && req.files.profilePicture[0]) await fs.unlink(req.files.profilePicture[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    if (req.files.cv && req.files.cv[0]) await fs.unlink(req.files.cv[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const {
    firstName, lastName, sex, location, address, contact,
    profession, employmentStructure, companyOrProject, activities, role,
    is_new_member, last_annual_inscription_date, has_paid_adhesion,
    social_contribution_status, tontine_status, ag_absence_count
  } = req.body;

  let photo_url = null;
  let public_id = null;
  let cv_url = null;
  let cv_public_id = null;

  try {
    const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;
    const cvFile = req.files.cv ? req.files.cv[0] : null;

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
        resource_type: 'raw' // Important pour les documents
      });
      cv_url = result.secure_url;
      cv_public_id = result.public_id;
    }

    const member = await Member.create({
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url,
      public_id,
      cv_url,
      cv_public_id,
      is_new_member: is_new_member === 'true',
      last_annual_inscription_date: last_annual_inscription_date || null,
      has_paid_adhesion: has_paid_adhesion === 'true',
      social_contribution_status: social_contribution_status ? JSON.parse(social_contribution_status) : {},
      tontine_status: tontine_status ? JSON.parse(tontine_status) : {},
      ag_absence_count: parseInt(ag_absence_count, 10) || 0
    });

    res.status(201).json(member);

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de l\'ajout du membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du membre', details: error.message });
  } finally {
    const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;
    const cvFile = req.files.cv ? req.files.cv[0] : null;
    if (profilePictureFile) {
      await fs.unlink(profilePictureFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
    if (cvFile) {
      await fs.unlink(cvFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour mettre à jour un membre
router.put('/:id', authenticateToken, cpUpload, async (req, res) => {
  if (req.user.role !== 'admin') {
    if (req.files.profilePicture && req.files.profilePicture[0]) await fs.unlink(req.files.profilePicture[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    if (req.files.cv && req.files.cv[0]) await fs.unlink(req.files.cv[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const memberId = req.params.id;
  const {
    firstName, lastName, sex, location, address, contact,
    profession, employmentStructure, companyOrProject, activities, role,
    photo_url: existing_photo_url, public_id: existing_public_id,
    cv_url: existing_cv_url, cv_public_id: existing_cv_public_id,
    is_new_member, last_annual_inscription_date, has_paid_adhesion,
    social_contribution_status, tontine_status, ag_absence_count
  } = req.body;

  let photo_url = existing_photo_url;
  let public_id = existing_public_id;
  let cv_url = existing_cv_url;
  let cv_public_id = existing_cv_public_id;

  try {
    const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;
    const cvFile = req.files.cv ? req.files.cv[0] : null;

    if (profilePictureFile) {
      if (existing_public_id) {
        await cloudinary.uploader.destroy(existing_public_id).catch(e => console.error("Erreur suppression ancienne photo Cloudinary:", e));
      }
      const result = await cloudinary.uploader.upload(profilePictureFile.path, {
        folder: 'aifasa_members_profiles',
        resource_type: 'image'
      });
      photo_url = result.secure_url;
      public_id = result.public_id;
    }
    if (cvFile) {
      if (existing_cv_public_id) {
        await cloudinary.uploader.destroy(existing_cv_public_id, { resource_type: 'raw' }).catch(e => console.error("Erreur suppression ancien CV Cloudinary:", e));
      }
      const result = await cloudinary.uploader.upload(cvFile.path, {
        folder: 'aifasa_members_cvs',
        resource_type: 'raw'
      });
      cv_url = result.secure_url;
      cv_public_id = result.public_id;
    }

    const member = await Member.update(memberId, {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url,
      public_id,
      cv_url,
      cv_public_id,
      is_new_member: is_new_member === 'true',
      last_annual_inscription_date: last_annual_inscription_date || null,
      has_paid_adhesion: has_paid_adhesion === 'true',
      social_contribution_status: social_contribution_status ? JSON.parse(social_contribution_status) : {},
      tontine_status: tontine_status ? JSON.parse(tontine_status) : {},
      ag_absence_count: parseInt(ag_absence_count, 10) || 0
    });

    if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
    res.json(member);

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de la mise à jour du membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du membre', details: error.message });
  } finally {
    const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;
    const cvFile = req.files.cv ? req.files.cv[0] : null;
    if (profilePictureFile) {
      await fs.unlink(profilePictureFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
    if (cvFile) {
      await fs.unlink(cvFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour supprimer un membre (admin seulement)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    const memberId = req.params.id;
    const member = await Member.findByPk(memberId); // Utilisation de findByPk pour récupérer le membre

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    // Supprimer les fichiers de Cloudinary si les IDs publics existent
    if (member.public_id) {
      await cloudinary.uploader.destroy(member.public_id);
    }
    if (member.cv_public_id) {
      await cloudinary.uploader.destroy(member.cv_public_id, { resource_type: 'raw' });
    }

    await member.destroy(); // Utilisation de la méthode destroy pour supprimer le membre
    res.status(204).send();

  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du membre', details: error.message });
  }
});

module.exports = router;
