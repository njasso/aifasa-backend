const express = require('express');
const router = express.Router();
// Importation du modèle personnalisé
const GalleryMedia = require('../models/GalleryMedia');
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises;

// Configure Multer for file uploads (temporary storage)
const upload = multer({ dest: 'uploads/' });

// GET all gallery media
// Route: GET /api/gallery
router.get('/', async (req, res) => {
  try {
    const media = await GalleryMedia.findAll();
    res.json(media);
  } catch (error) {
    console.error('Error fetching gallery media:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des médias de la galerie', details: error.message });
  }
});

// POST a new gallery media (admin only, with file upload)
// Route: POST /api/gallery
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  // Check if the user has admin role
  if (req.user.role !== 'admin') {
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp (403):", e));
    }
    return res.status(403).json({ error: 'Accès interdit. Seuls les administrateurs peuvent ajouter des médias.' });
  }

  // Ensure a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier média n\'a été fourni.' });
  }

  try {
    const { title, category } = req.body;

    // Determine resource type for Cloudinary based on file MIME type
    const resourceType = req.file.mimetype.startsWith('video') ? 'video' : 'image';

    // Upload the file to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'aifasa_gallery', // Specific folder for the gallery
      resource_type: resourceType // Dynamic resource type
    });

    // Create a new entry in your database
    const media = await GalleryMedia.create({
      title,
      category,
      file_url: result.secure_url, // Store the Cloudinary URL
      file_type: req.file.mimetype, // Store the file MIME type (e.g., 'image/jpeg', 'video/mp4')
      public_id: result.public_id, // Store the public_id for future deletion from Cloudinary
    });

    res.status(201).json(media); // Respond with the created media and 201 status
  } catch (error) {
    console.error('Error during media upload and creation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload ou de l\'enregistrement du média.', details: error.message });
  } finally {
    // Delete the temporary file from Multer
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// DELETE a gallery media by ID (admin only)
// Route: DELETE /api/gallery/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  // Check if the user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Seuls les administrateurs peuvent supprimer des médias.' });
  }

  try {
    const mediaId = parseInt(req.params.id, 10);

    if (isNaN(mediaId)) {
      return res.status(400).json({ error: 'ID de média invalide.' });
    }

    // First, retrieve the media from the database using your custom method
    const mediaToDelete = await GalleryMedia.findById(mediaId);

    if (!mediaToDelete) {
      return res.status(404).json({ error: 'Média non trouvé dans la base de données.' });
    }

    // Attempt to delete the media from the database using your custom method
    await GalleryMedia.delete(mediaId);

    // If successfully deleted from DB, attempt to delete from Cloudinary
    if (mediaToDelete.public_id) {
      // Determine resource type for Cloudinary deletion
      const resourceType = mediaToDelete.file_type && mediaToDelete.file_type.startsWith('video') ? 'video' : 'image';
      await cloudinary.uploader.destroy(mediaToDelete.public_id, { resource_type: resourceType });
    }

    res.status(200).json({ message: 'Média supprimé avec succès', deletedMedia: mediaToDelete });
  } catch (error) {
    console.error('Error deleting gallery media:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du média.', details: error.message });
  }
});

module.exports = router;
