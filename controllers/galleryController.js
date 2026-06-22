const GalleryImage = require('../models/GalleryImage');
const cloudinary = require('../config/cloudinary');

const galleryController = {
  async getAll(req, res) {
    try {
      const images = await GalleryImage.findAll();
      res.json(images);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async create(req, res) {
    try {
      const { title, category } = req.body;
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'gallery',
      });
      const image = await GalleryImage.create({
        title,
        category,
        image_url: result.secure_url,
      });
      res.json(image);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
  },

  async delete(req, res) {
    try {
      const image = await GalleryImage.delete(req.params.id);
      if (!image) return res.status(404).json({ error: 'Image non trouvée' });
      res.json(image);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = galleryController;