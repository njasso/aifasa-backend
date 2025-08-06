const Document = require('../models/Document');
const cloudinary = require('../config/cloudinary');

const documentController = {
  async getAll(req, res) {
    try {
      const documents = await Document.findAll();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async create(req, res) {
    try {
      const { title, type } = req.body;
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'documents',
      });
      const document = await Document.create({
        title,
        type,
        file_url: result.secure_url,
      });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
  },

  async delete(req, res) {
    try {
      const document = await Document.delete(req.params.id);
      if (!document) return res.status(404).json({ error: 'Document non trouvé' });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = documentController;