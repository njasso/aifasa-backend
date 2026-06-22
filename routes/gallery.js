// routes/gallery.js
const express = require('express');
const router = express.Router();
const GalleryMedia = require('../models/GalleryMedia');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises;

// Configuration Multer pour le stockage temporaire
const upload = multer({ dest: 'uploads/' });

// ============ ROUTES PUBLIQUES ============

// GET - Récupérer tous les médias de la galerie (public)
router.get('/', async (req, res) => {
  try {
    console.log('📝 GET /api/gallery');
    const media = await GalleryMedia.findAll();
    console.log(`✅ ${media.length} média(s) trouvé(s)`);
    res.json(media);
  } catch (error) {
    console.error('❌ Erreur GET gallery:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET - Récupérer un média par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const media = await GalleryMedia.findById(req.params.id);
    if (!media) {
      return res.status(404).json({ error: 'Média non trouvé' });
    }
    res.json(media);
  } catch (error) {
    console.error('❌ Erreur GET media:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES ADMIN ============

// POST - Ajouter un nouveau média (admin uniquement)
router.post(
  '/',
  authenticateToken,
  isAdmin,
  upload.single('file'),
  async (req, res) => {
    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier média n\'a été fourni.' });
    }

    try {
      const { title, category } = req.body;

      // Validation
      if (!title || title.trim() === '') {
        await fs.unlink(req.file.path).catch(e => console.error("Erreur suppression temp:", e));
        return res.status(400).json({ error: 'Le titre est requis.' });
      }

      console.log('📝 Ajout média:', { title, category, file: req.file.originalname });

      // Upload vers Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'aifasa_gallery',
        resource_type: 'auto'
      });

      // Créer l'entrée en base de données
      const media = await GalleryMedia.create({
        title: title.trim(),
        category: category || '',
        image_url: result.secure_url,  // ✅ image_url (pas file_url)
        public_id: result.public_id
      });

      console.log(`✅ Média créé ID: ${media.id}`);
      res.status(201).json(media);
    } catch (error) {
      console.error('❌ Erreur POST gallery:', error.message);
      if (req.file) {
        await fs.unlink(req.file.path).catch(e => console.error("Erreur suppression temp:", e));
      }
      res.status(500).json({ error: 'Erreur serveur', details: error.message });
    } finally {
      if (req.file) {
        await fs.unlink(req.file.path).catch(e => console.error("Erreur suppression temp:", e));
      }
    }
  }
);

// DELETE - Supprimer un média (admin uniquement)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id, 10);

    if (isNaN(mediaId)) {
      return res.status(400).json({ error: 'ID de média invalide.' });
    }

    console.log(`📝 Suppression média ID: ${mediaId}`);

    // Récupérer le média
    const mediaToDelete = await GalleryMedia.findById(mediaId);

    if (!mediaToDelete) {
      return res.status(404).json({ error: 'Média non trouvé.' });
    }

    // Supprimer de la base de données
    await GalleryMedia.delete(mediaId);

    // Supprimer de Cloudinary si public_id existe
    if (mediaToDelete.public_id) {
      await cloudinary.uploader.destroy(mediaToDelete.public_id);
      console.log(`🗑️ Supprimé de Cloudinary: ${mediaToDelete.public_id}`);
    }

    console.log(`✅ Média supprimé ID: ${mediaId}`);
    res.status(200).json({ 
      message: 'Média supprimé avec succès', 
      deletedMedia: mediaToDelete 
    });
  } catch (error) {
    console.error('❌ Erreur DELETE gallery:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;