const express = require('express');
const router = express.Router();
const Document = require('../models/Document');
const authenticateToken = require('../middleware/auth');
const cloudinary = require('../config/cloudinary'); // Assurez-vous que ce chemin est correct
const multer = require('multer');
const fs = require('fs').promises; // Importation pour supprimer le fichier temporaire

// Configuration de Multer pour le stockage temporaire
const upload = multer({ dest: 'uploads/' });

// Route pour récupérer tous les documents
router.get('/', async (req, res) => {
  try {
    const documents = await Document.findAll();
    res.json(documents);
  } catch (error) {
    console.error('Erreur lors de la récupération des documents:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des documents', details: error.message });
  }
});

// Route pour ajouter un nouveau document (admin seulement, avec upload de fichier)
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  // Vérification du rôle de l'utilisateur
  if (req.user.role !== 'admin') {
    console.log('Tentative d\'ajout de document sans rôle admin par:', req.user?.email);
    // Supprimer le fichier temporaire si l'utilisateur n'est pas autorisé
    if (req.file) await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
    return res.status(403).json({ error: 'Accès interdit' });
  }

  // Vérification si un fichier a été fourni et traité par Multer
  if (!req.file) {
      console.error('Erreur: Aucun fichier n\'a été fourni ou Multer n\'a pas pu le traiter.');
      return res.status(400).json({ error: 'Aucun fichier fourni ou erreur de traitement par le serveur.' });
  }

  try {
    const { title, type } = req.body;
    
    // Validation simple des champs textuels
    if (!title || !type) {
        // Supprimer le fichier temporaire avant de renvoyer l'erreur
        await fs.unlink(req.file.path).catch(e => console.error("Erreur de suppression du fichier temp:", e));
        return res.status(400).json({ error: 'Le titre et le type du document sont requis.' });
    }

    console.log('Données reçues pour le document:', { title, type, filePath: req.file.path, originalname: req.file.originalname });

    // Upload du fichier vers Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'aifasa_documents', // Nom de dossier spécifique pour vos documents sur Cloudinary
      resource_type: 'auto' // Détecte automatiquement le type de ressource (image, video, raw)
    });
    console.log('Résultat de l\'upload Cloudinary:', result);

    // Création du document en base de données
    const document = await Document.create({
      title,
      type,
      file_url: result.secure_url,
      public_id: result.public_id, // Stocke le public_id pour la suppression future
    });
    console.log('Document créé en base de données:', document);

    res.status(201).json(document); // Statut 201 (Created) pour une création réussie

  } catch (error) {
    // --- C'EST LE LOG CRUCIAL POUR LE DÉBOGAGE ---
    console.error('ERREUR DÉTAILLÉE lors de l\'ajout du document:', error.message);
    console.error('Stack Trace:', error.stack);
    // --------------------------------------------------
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du document', details: error.message });
  } finally {
    // Supprimer le fichier temporaire de Multer après l'upload, qu'il y ait eu erreur ou non
    if (req.file) {
      await fs.unlink(req.file.path).catch(e => console.error("Erreur lors de la suppression du fichier temporaire:", e));
    }
  }
});

// Route pour supprimer un document (admin seulement)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Accès interdit' });

  try {
    const documentId = req.params.id;
    // Récupérer le document pour obtenir son public_id avant de le supprimer de la BD
    const document = await Document.findById(documentId); 

    if (!document) return res.status(404).json({ error: 'Document non trouvé' });

    // Si le document a un public_id, essayez de le supprimer de Cloudinary
    if (document.public_id) {
      console.log('Tentative de suppression de Cloudinary pour public_id:', document.public_id);
      await cloudinary.uploader.destroy(document.public_id);
      console.log('Fichier supprimé de Cloudinary:', document.public_id);
    }

    // Supprimer le document de la base de données
    await Document.delete(documentId); 
    console.log('Document supprimé de la base de données:', documentId);

    res.status(204).send(); // Statut 204 (No Content) pour une suppression réussie sans retour de contenu

  } catch (error) {
    console.error('Erreur lors de la suppression du document:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression', details: error.message });
  }
});

module.exports = router;