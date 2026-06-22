// routes/documents.js
const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const { authenticateToken, isAdmin } = require('../middleware/auth'); // ✅ CORRIGÉ
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const fs = require('fs').promises;

// Configuration de Multer pour le stockage temporaire
const upload = multer({ dest: 'uploads/' });

// Route pour récupérer tous les documents (public)
router.get('/', async (req, res) => {
  try {
    const documents = await Document.findAll();
    res.json(documents);
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// Route pour ajouter un nouveau document (admin seulement)
router.post('/', authenticateToken, isAdmin, upload.single('file'), async (req, res) => {
  try {
    // Vérification si un fichier a été fourni
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni.' });
    }

    const { title, type } = req.body;
    
    if (!title || !type) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression:", e));
      return res.status(400).json({ error: 'Le titre et le type sont requis.' });
    }

    console.log('📝 Ajout document:', { title, type, file: req.file.originalname });

    // Upload vers Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'aifasa_documents',
      resource_type: 'auto'
    });

    // Création en base de données
    const document = await Document.create({
      title,
      type,
      file_url: result.secure_url,
      public_id: result.public_id,
    });

    console.log('✅ Document créé:', document.id);
    res.status(201).json(document);

  } catch (error) {
    console.error('❌ Erreur POST document:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  } finally {
    // Supprimer le fichier temporaire
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur suppression temp:", e));
    }
  }
});

// Route pour supprimer un document (admin seulement)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const documentId = req.params.id;
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    // Supprimer de Cloudinary si public_id existe
    if (document.public_id) {
      await cloudinary.uploader.destroy(document.public_id);
      console.log('🗑️ Supprimé de Cloudinary:', document.public_id);
    }

    // Supprimer de la base de données
    await Document.delete(documentId);
    console.log('🗑️ Document supprimé:', documentId);

    res.status(204).send();

  } catch (error) {
    console.error('❌ Erreur DELETE document:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;