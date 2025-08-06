const express = require('express');
const router = express.Router();
const GalleryImage = require('../models/GalleryImage'); // Assuming this is your model
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises; // Pour supprimer le fichier temporaire de Multer

// Configure Multer for file uploads (temporary storage)
const upload = multer({ dest: 'uploads/' });

// GET all gallery images
// Route: GET /api/gallery
router.get('/', async (req, res) => {
  try {
    console.log('Attempting to fetch gallery images...'); // Log start of operation
    const images = await GalleryImage.findAll(); // Attempt to find all images
    console.log('Successfully fetched gallery images. Number of images:', images.length); // Log success
    res.json(images); // Send images as JSON response
  } catch (error) {
    // Crucial: Log the full error object to the server console
    console.error('Error fetching gallery images:', error);
    // Send a more specific error message to the client
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des images de la galerie', details: error.message });
  }
});

// POST a new gallery image (admin only, with file upload)
// Route: POST /api/gallery
router.post('/', authenticateToken, upload.single('image'), async (req, res) => {
  // Check if the user has admin role
  if (req.user.role !== 'admin') {
    console.warn(`Tentative d'accès non autorisé à /api/gallery par l'utilisateur: ${req.user ? req.user.id : 'Non authentifié'} (Rôle: ${req.user ? req.user.role : 'N/A'})`);
    // Clean up temp file if unauthorized
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp (403):", e));
    }
    return res.status(403).json({ error: 'Accès interdit. Seuls les administrateurs peuvent ajouter des images.' });
  }

  // Ensure a file was uploaded
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier image n\'a été fourni.' });
  }

  try {
    const { title, category } = req.body;

    // Upload the image to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'aifasa_gallery', // Dossier spécifique pour la galerie
      resource_type: 'image' // S'assurer que c'est traité comme une image
    });

    // Create a new entry in your database for the image
    // Ensure your GalleryImage model accepts 'public_id'
    const image = await GalleryImage.create({
      title,
      category,
      image_url: result.secure_url, // Store the Cloudinary URL
      public_id: result.public_id, // Store the public_id for future deletion from Cloudinary
    });

    res.status(201).json(image); // Respond with the created image and 201 status
  } catch (error) {
    console.error('Error during image upload and creation:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload ou de l\'enregistrement de l\'image.', details: error.message });
  } finally {
    // Supprimer le fichier temporaire de Multer
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// DELETE a gallery image by ID (admin only)
// Route: DELETE /api/gallery/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  // Check if the user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Seuls les administrateurs peuvent supprimer des images.' });
  }

  try {
    // Convertir l'ID en entier pour s'assurer qu'il est du bon type pour la DB
    const imageId = parseInt(req.params.id, 10);

    // Vérifier si l'ID est un nombre valide
    if (isNaN(imageId)) {
      return res.status(400).json({ error: 'ID d\'image invalide.' });
    }

    // First, retrieve the image from the database to get its public_id
    const imageToDelete = await GalleryImage.findById(imageId);

    if (!imageToDelete) {
      return res.status(404).json({ error: 'Image non trouvée dans la base de données.' });
    }

    // Attempt to delete the image from the database
    const deletedImage = await GalleryImage.delete(imageId);

    // If successfully deleted from DB, attempt to delete from Cloudinary
    if (deletedImage && deletedImage.public_id) {
      console.log('Attempting to delete image from Cloudinary with public_id:', deletedImage.public_id);
      await cloudinary.uploader.destroy(deletedImage.public_id);
      console.log('Image deleted from Cloudinary:', deletedImage.public_id);
    } else if (deletedImage && !deletedImage.public_id) {
      console.warn('Image deleted from DB but no public_id found for Cloudinary deletion.');
    }

    res.status(200).json({ message: 'Image supprimée avec succès', deletedImage });
  } catch (error) {
    console.error('Error deleting gallery image:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de l\'image.', details: error.message });
  }
});

module.exports = router;
