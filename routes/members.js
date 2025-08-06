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
// Le champ attendu est 'profilePicture' pour correspondre au frontend
router.post('/', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  if (req.user.role !== 'admin') {
    if (req.file) await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  // Vérification si un fichier a été fourni (optionnel pour le profil)
  // et si Multer l'a traité
  if (req.file && !req.file.path) {
    console.error('Erreur: Fichier fourni mais Multer n\'a pas pu le traiter correctement.');
    return res.status(400).json({ error: 'Erreur de traitement du fichier par le serveur.' });
  }

  try {
    // Récupération des champs du corps de la requête
    // Notez que les noms des champs ici doivent correspondre à ceux de votre frontend formData
    const {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role
    } = req.body;

    let photo_url = null;
    let public_id = null;

    // Si un fichier a été uploadé, le traiter avec Cloudinary
    if (req.file) {
      console.log('Fichier de profil reçu par Multer:', req.file);
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'aifasa_members_profiles', // Dossier spécifique pour les photos de profil
        resource_type: 'image' // S'assurer que c'est traité comme une image
      });
      console.log('Résultat de l\'upload Cloudinary pour le profil:', result);
      photo_url = result.secure_url;
      public_id = result.public_id; // Stocker le public_id pour la suppression future
    }

    // Création du membre en base de données
    // Assurez-vous que votre modèle Member.create accepte tous ces champs
    const member = await Member.create({
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url, // Nom de la colonne dans la base de données
      public_id // Nom de la colonne dans la base de données
    });
    console.log('Membre créé en base de données:', member);

    res.status(201).json(member); // 201 Created pour une création réussie

  } catch (error) {
    // --- LOG DÉTAILLÉ EN CAS D'ERREUR ---
    console.error('ERREUR DÉTAILLÉE lors de l\'ajout du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    // ------------------------------------
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du membre', details: error.message });
  } finally {
    // Supprimer le fichier temporaire de Multer
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour mettre à jour un membre (admin seulement, avec gestion de la photo)
// Le champ attendu est 'profilePicture' pour correspondre au frontend
router.put('/:id', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  if (req.user.role !== 'admin') {
    if (req.file) await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  if (req.file && !req.file.path) {
    console.error('Erreur: Fichier fourni mais Multer n\'a pas pu le traiter correctement.');
    return res.status(400).json({ error: 'Erreur de traitement du fichier par le serveur.' });
  }

  try {
    const memberId = req.params.id;
    // Récupération des champs du corps de la requête
    const {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      // photo_url et public_id peuvent être envoyés si pas de nouvelle photo
      photo_url: existing_photo_url, public_id: existing_public_id
    } = req.body;

    let photo_url = existing_photo_url; // Conserver l'ancienne URL par défaut
    let public_id = existing_public_id; // Conserver l'ancien public_id par défaut

    // Si un nouveau fichier est uploadé, le traiter avec Cloudinary
    if (req.file) {
      // Si une ancienne photo existait, la supprimer de Cloudinary
      if (existing_public_id) {
        await cloudinary.uploader.destroy(existing_public_id).catch(e => console.error("Erreur suppression ancienne photo Cloudinary:", e));
      }
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'aifasa_members_profiles',
        resource_type: 'image'
      });
      photo_url = result.secure_url;
      public_id = result.public_id;
    }

    // Mise à jour du membre en base de données
    // Assurez-vous que votre modèle Member.update accepte tous ces champs
    const member = await Member.update(memberId, {
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url,
      public_id
    });

    if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
    console.log('Membre mis à jour en base de données:', member);
    res.json(member);

  } catch (error) {
    // --- LOG DÉTAILLÉ EN CAS D'ERREUR ---
    console.error('ERREUR DÉTAILLÉE lors de la mise à jour du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    // ------------------------------------
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du membre', details: error.message });
  } finally {
    // Supprimer le fichier temporaire de Multer
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour supprimer un membre (admin seulement)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès interdit' });

  try {
    const memberId = req.params.id;
    // Récupérer le membre pour obtenir son public_id avant de le supprimer de la BD
    const member = await Member.findById(memberId);

    if (!member) return res.status(404).json({ error: 'Membre non trouvé' });

    // Si le membre a un public_id, essayez de supprimer la photo de Cloudinary
    if (member.public_id) {
      console.log('Tentative de suppression de Cloudinary pour public_id:', member.public_id);
      await cloudinary.uploader.destroy(member.public_id);
      console.log('Photo supprimée de Cloudinary:', member.public_id);
    }

    // Supprimer le membre de la base de données
    await Member.delete(memberId);
    console.log('Membre supprimé de la base de données:', memberId);

    res.status(204).send(); // 204 No Content pour une suppression réussie sans retour de contenu

  } catch (error) {
    console.error('Erreur lors de la suppression du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du membre', details: error.message });
  }
});

module.exports = router;