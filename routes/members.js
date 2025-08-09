const express = require('express');
const router = express.Router();
const Member = require('../models/Member'); // Assurez-vous que ce chemin est correct
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary'); // Assurez-vous que ce chemin est correct
const multer = require('multer');
const fs = require('fs').promises; // Pour supprimer le fichier temporaire

// Configuration de Multer pour le stockage temporaire
// Vous pouvez aussi spécifier une destination plus spécifique si vous le souhaitez
const upload = multer({ dest: 'uploads/' });

// Définition de tous les champs attendus par Multer, y compris les champs de texte et les fichiers
// Cette configuration est mise à jour pour inclure tous les champs de votre modèle Member
const cpUpload = upload.fields([
  { name: 'profilePicture', maxCount: 1 },
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
  { name: 'photo_url' }, // Pour les requêtes PUT sans nouvelle photo
  { name: 'public_id' }, // Pour les requêtes PUT sans nouvelle photo
  // Champs de statut financier mis à jour
  { name: 'is_new_member' },
  { name: 'last_annual_inscription_date' },
  { name: 'has_paid_adhesion' },
  { name: 'social_contribution_status' },
  { name: 'tontine_status' },
  { name: 'ag_absence_count' }
  // Ajoutez d'autres champs si votre formulaire en envoie plus
]);

// Route pour récupérer tous les membres
router.get('/', async (req, res) => {
  try {
    const members = await Member.findAll();
    res.json(members);
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des membres', details: error.message });
  }
});

// Route pour ajouter un nouveau membre (admin seulement, avec upload de photo)
router.post('/', authenticateToken, cpUpload, async (req, res) => {
  // Logs pour le débogage. Vérifiez la console de votre backend pour voir les champs de formulaire reçus.
  console.log('Champs de texte reçus:', req.body);
  console.log('Fichiers reçus:', req.files);

  if (req.user.role !== 'admin') {
    if (req.files.profilePicture && req.files.profilePicture[0]) await fs.unlink(req.files.profilePicture[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;

  if (profilePictureFile && !profilePictureFile.path) {
    console.error('Erreur: Fichier fourni mais Multer n\'a pas pu le traiter correctement.');
    return res.status(400).json({ error: 'Erreur de traitement du fichier par le serveur.' });
  }

  try {
    // Récupération des champs du corps de la requête, y compris les nouveaux champs de statut financier
    const {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count
    } = req.body;

    let photo_url = null;
    let public_id = null;

    // Si un fichier a été uploadé, le traiter avec Cloudinary
    if (profilePictureFile) {
      console.log('Fichier de profil reçu par Multer:', profilePictureFile);
      const result = await cloudinary.uploader.upload(profilePictureFile.path, {
        folder: 'aifasa_members_profiles',
        resource_type: 'image'
      });
      console.log('Résultat de l\'upload Cloudinary pour le profil:', result);
      photo_url = result.secure_url;
      public_id = result.public_id;
    }

    // Création du membre en base de données avec tous les champs
    const member = await Member.create({
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url,
      public_id,
      is_new_member: is_new_member === 'true', // Multer renvoie des chaînes pour les booléens
      last_annual_inscription_date: last_annual_inscription_date || null,
      has_paid_adhesion: has_paid_adhesion === 'true', // Multer renvoie des chaînes
      social_contribution_status: JSON.parse(social_contribution_status || '{}'),
      tontine_status: JSON.parse(tontine_status || '{}'),
      ag_absence_count: parseInt(ag_absence_count, 10) || 0
    });
    console.log('Membre créé en base de données:', member);

    res.status(201).json(member);

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de l\'ajout du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du membre', details: error.message });
  } finally {
    if (profilePictureFile) {
      await fs.unlink(profilePictureFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour mettre à jour un membre (admin seulement, avec gestion de la photo)
router.put('/:id', authenticateToken, cpUpload, async (req, res) => {
  // Logs pour le débogage. Vérifiez la console de votre backend pour voir les champs de formulaire reçus.
  console.log('Champs de texte reçus:', req.body);
  console.log('Fichiers reçus:', req.files);

  if (req.user.role !== 'admin') {
    if (req.files.profilePicture && req.files.profilePicture[0]) await fs.unlink(req.files.profilePicture[0].path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  const profilePictureFile = req.files.profilePicture ? req.files.profilePicture[0] : null;

  if (profilePictureFile && !profilePictureFile.path) {
    console.error('Erreur: Fichier fourni mais Multer n\'a pas pu le traiter correctement.');
    return res.status(400).json({ error: 'Erreur de traitement du fichier par le serveur.' });
  }

  try {
    const memberId = req.params.id;
    // Récupération de tous les champs du corps de la requête, y compris les nouveaux
    const {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url: existing_photo_url, public_id: existing_public_id,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count
    } = req.body;

    let photo_url = existing_photo_url;
    let public_id = existing_public_id;

    // Si un nouveau fichier est uploadé, le traiter avec Cloudinary
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

    // Mise à jour du membre en base de données avec tous les champs
    const member = await Member.update(memberId, {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url,
      public_id,
      is_new_member: is_new_member === 'true',
      last_annual_inscription_date: last_annual_inscription_date || null,
      has_paid_adhesion: has_paid_adhesion === 'true',
      social_contribution_status: JSON.parse(social_contribution_status || '{}'),
      tontine_status: JSON.parse(tontine_status || '{}'),
      ag_absence_count: parseInt(ag_absence_count, 10) || 0
    });

    if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
    console.log('Membre mis à jour en base de données:', member);
    res.json(member);

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de la mise à jour du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du membre', details: error.message });
  } finally {
    if (profilePictureFile) {
      await fs.unlink(profilePictureFile.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour supprimer un membre (admin seulement)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès interdit' });

  try {
    const memberId = req.params.id;
    const member = await Member.findById(memberId);

    if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

    if (member.public_id) {
      console.log('Tentative de suppression de Cloudinary pour public_id:', member.public_id);
      await cloudinary.uploader.destroy(member.public_id);
      console.log('Photo supprimée de Cloudinary:', member.public_id);
    }

    await Member.delete(memberId);
    console.log('Membre supprimé de la base de données:', memberId);

    res.status(204).send();

  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du membre', details: error.message });
  }
});

module.exports = router;
