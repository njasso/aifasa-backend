const express = require('express');
const router = express.Router();
const Member = require('../models/Member');
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises;

// Configuration de Multer pour le stockage temporaire
const upload = multer({ dest: 'uploads/' });

/**
 * Nettoie les fichiers temporaires après l'upload, qu'il y ait une erreur ou non.
 * @param {Array<object>} files - Les fichiers à supprimer.
 */
const cleanUpTempFiles = async (files) => {
  if (files) {
    const filesToClean = [
      ...(files.profilePicture || []),
      ...(files.cv || [])
    ];
    await Promise.all(filesToClean.map(file => fs.unlink(file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e))));
  }
};

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

// Route pour ajouter un nouveau membre
router.post(
  '/',
  authenticateToken,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ]),
  async (req, res) => {
    // Nettoyer les fichiers temporaires en cas d'accès interdit
    if (req.user.role !== 'admin') {
      await cleanUpTempFiles(req.files);
      return res.status(403).json({ error: 'Accès interdit' });
    }

    const {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count
    } = req.body;

    const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;
    const cvFile = req.files.cv ? req.files.cv[0] : null;

    let photo_url = null;
    let public_id = null;
    let cv_url = null;
    let cv_public_id = null;

    try {
      // Validation du fichier CV
      if (cvFile && cvFile.mimetype !== 'application/pdf') {
        throw new Error('Le CV doit être un fichier PDF.');
      }

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
          resource_type: 'raw',
          // Ajoute l'extension .pdf au public_id pour une meilleure gestion
          public_id: `${cvFile.filename}.pdf`
        });
        cv_url = result.secure_url;
        cv_public_id = result.public_id;
      }

      const member = await Member.create({
        firstName, lastName, sex, location, address, contact,
        profession, employmentStructure, companyOrProject, activities, role,
        photo_url, public_id, cv_url, cv_public_id,
        is_new_member: is_new_member === 'true',
        last_annual_inscription_date: last_annual_inscription_date || null,
        has_paid_adhesion: has_paid_adhesion === 'true',
        social_contribution_status: social_contribution_status ? JSON.parse(social_contribution_status) : {},
        tontine_status: tontine_status ? JSON.parse(tontine_status) : {},
        ag_absence_count: parseInt(ag_absence_count, 10) || 0
      });

      res.status(201).json(member);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du membre:', error.message);
      res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du membre', details: error.message });
    } finally {
      await cleanUpTempFiles(req.files);
    }
  }
);

// Route pour mettre à jour un membre
router.put(
  '/:id',
  authenticateToken,
  upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'cv', maxCount: 1 }
  ]),
  async (req, res) => {
    // Nettoyer les fichiers temporaires en cas d'accès interdit
    if (req.user.role !== 'admin') {
      await cleanUpTempFiles(req.files);
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

      // Validation du fichier CV
      if (cvFile && cvFile.mimetype !== 'application/pdf') {
        throw new Error('Le CV doit être un fichier PDF.');
      }

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
          resource_type: 'raw',
          // Ajoute l'extension .pdf au public_id pour une meilleure gestion
          public_id: `${cvFile.filename}.pdf`
        });
        cv_url = result.secure_url;
        cv_public_id = result.public_id;
      }

      const member = await Member.update(memberId, {
        firstName, lastName, sex, location, address, contact,
        profession, employmentStructure, companyOrProject, activities, role,
        photo_url, public_id, cv_url, cv_public_id,
        is_new_member: is_new_member === 'true',
        last_annual_inscription_date: last_annual_inscription_date || null,
        has_paid_adhesion: has_paid_adhesion === 'true',
        social_contribution_status: social_contribution_status ? JSON.parse(social_contribution_status) : {},
        tontine_status: tontine_status ? JSON.parse(tontine_status) : {},
        ag_absence_count: parseInt(ag_absence_count, 10) || 0
      });

      if (!member) {
        return res.status(404).json({ error: 'Membre non trouvé' });
      }

      res.json(member);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du membre:', error.message);
      res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du membre', details: error.message });
    } finally {
      await cleanUpTempFiles(req.files);
    }
  }
);

// Route pour supprimer un membre
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    const memberId = req.params.id;
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé' });
    }

    if (member.public_id) {
      await cloudinary.uploader.destroy(member.public_id);
    }

    if (member.cv_public_id) {
      await cloudinary.uploader.destroy(member.cv_public_id, { resource_type: 'raw' });
    }

    await Member.delete(memberId);
    res.status(204).send();
  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du membre', details: error.message });
  }
});

module.exports = router;
