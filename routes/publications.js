// routes/publications.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');

// Configuration multer
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// GET - Récupérer toutes les publications
router.get('/', async (req, res) => {
  try {
    console.log('📝 GET /api/publications');
    const result = await pool.query(`
      SELECT * FROM publications 
      ORDER BY created_at DESC
    `);
    console.log(`✅ ${result.rows.length} publication(s) trouvée(s)`);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur GET publications:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET - Récupérer une publication par ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM publications WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur GET publication:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer une publication
router.post('/', authenticateToken, isAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content, category, type, status, externalLinks } = req.body;
    
    console.log('📝 POST /api/publications - Création:', { 
      title, 
      category, 
      type,
      userId: req.user?.id,
      userRole: req.user?.role
    });

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }

    // ✅ Upload image vers Cloudinary
    let imageUrl = null;
    if (req.files?.image && req.files.image.length > 0) {
      try {
        const file = req.files.image[0];
        console.log('📸 Upload image:', file.originalname, `${file.size} bytes`);
        
        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { 
            folder: 'aifasa17/publications',
            resource_type: 'auto'
          }
        );
        imageUrl = result.secure_url;
        console.log('✅ Image uploadée avec succès:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Erreur upload image:', uploadError.message);
        console.error('Stack:', uploadError.stack);
        return res.status(500).json({ 
          error: 'Erreur lors de l\'upload de l\'image', 
          details: uploadError.message 
        });
      }
    } else {
      console.log('ℹ️ Aucune image fournie');
    }

    // ✅ Upload documents vers Cloudinary
    const documents = [];
    if (req.files?.documents && req.files.documents.length > 0) {
      for (const file of req.files.documents) {
        try {
          console.log('📄 Upload document:', file.originalname, `${file.size} bytes`);
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { 
              folder: 'aifasa17/documents',
              resource_type: 'auto'
            }
          );
          documents.push({
            name: file.originalname,
            url: result.secure_url
          });
          console.log('✅ Document uploadé:', file.originalname);
        } catch (uploadError) {
          console.error('❌ Erreur upload document:', uploadError.message);
        }
      }
    }

    // Parser les liens externes
    let parsedLinks = [];
    if (externalLinks) {
      try {
        parsedLinks = JSON.parse(externalLinks);
      } catch (e) {
        parsedLinks = [];
      }
    }

    // ✅ Insertion en base de données
    const result = await pool.query(`
      INSERT INTO publications 
      (title, content, category, type, status, image_url, documents, external_links, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      RETURNING *
    `, [
      title, 
      content || '', 
      category || '', 
      type || 'article', 
      status || 'published',
      imageUrl, 
      JSON.stringify(documents),
      JSON.stringify(parsedLinks),
      req.user.id
    ]);

    console.log(`✅ Publication créée avec ID: ${result.rows[0].id}`);
    console.log(`📸 Image URL: ${imageUrl || 'aucune'}`);
    console.log(`📄 Documents: ${documents.length}`);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur POST publication:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// PUT - Mettre à jour une publication
router.put('/:id', authenticateToken, isAdmin, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'documents', maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content, category, type, status, externalLinks } = req.body;
    const pubId = req.params.id;

    console.log(`📝 PUT /api/publications/${pubId}`);

    // Récupérer la publication existante
    const existing = await pool.query(
      'SELECT * FROM publications WHERE id = $1',
      [pubId]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    let imageUrl = existing.rows[0].image_url;
    
    // ✅ Upload nouvelle image si fournie
    if (req.files?.image && req.files.image.length > 0) {
      try {
        const file = req.files.image[0];
        console.log('📸 Upload nouvelle image:', file.originalname);
        
        // Supprimer l'ancienne image si elle existe
        if (existing.rows[0].image_url) {
          const publicId = existing.rows[0].image_url.split('/').pop().split('.')[0];
          if (publicId) {
            try {
              await cloudinary.uploader.destroy(`aifasa17/publications/${publicId}`);
              console.log('🗑️ Ancienne image supprimée');
            } catch (e) {
              console.warn('⚠️ Impossible de supprimer l\'ancienne image:', e.message);
            }
          }
        }

        const result = await cloudinary.uploader.upload(
          `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
          { 
            folder: 'aifasa17/publications',
            resource_type: 'auto'
          }
        );
        imageUrl = result.secure_url;
        console.log('✅ Nouvelle image uploadée:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Erreur upload image:', uploadError.message);
        return res.status(500).json({ 
          error: 'Erreur lors de l\'upload de l\'image', 
          details: uploadError.message 
        });
      }
    }

    // Upload nouveaux documents
    let documents = existing.rows[0].documents || [];
    if (req.files?.documents && req.files.documents.length > 0) {
      for (const file of req.files.documents) {
        try {
          console.log('📄 Upload document:', file.originalname);
          const result = await cloudinary.uploader.upload(
            `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
            { 
              folder: 'aifasa17/documents',
              resource_type: 'auto'
            }
          );
          documents.push({
            name: file.originalname,
            url: result.secure_url
          });
          console.log('✅ Document uploadé:', file.originalname);
        } catch (uploadError) {
          console.error('❌ Erreur upload document:', uploadError.message);
        }
      }
    }

    let parsedLinks = [];
    if (externalLinks) {
      try {
        parsedLinks = JSON.parse(externalLinks);
      } catch (e) {
        parsedLinks = [];
      }
    }

    const result = await pool.query(`
      UPDATE publications 
      SET title = $1, content = $2, category = $3, type = $4, 
          status = $5, image_url = $6, documents = $7, 
          external_links = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      title, 
      content || '', 
      category || '', 
      type || 'article', 
      status || 'published',
      imageUrl, 
      JSON.stringify(documents),
      JSON.stringify(parsedLinks),
      pubId
    ]);

    console.log(`✅ Publication mise à jour ID: ${pubId}`);
    console.log(`📸 Image URL: ${imageUrl || 'aucune'}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur PUT publication:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// DELETE - Supprimer une publication
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const pubId = req.params.id;
    console.log(`📝 DELETE /api/publications/${pubId}`);
    
    // Récupérer la publication pour supprimer les fichiers Cloudinary
    const existing = await pool.query(
      'SELECT * FROM publications WHERE id = $1',
      [pubId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Publication non trouvée' });
    }

    // Supprimer l'image de Cloudinary
    if (existing.rows[0].image_url) {
      try {
        const publicId = existing.rows[0].image_url.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(`aifasa17/publications/${publicId}`);
        console.log('🗑️ Image supprimée de Cloudinary');
      } catch (e) {
        console.warn('⚠️ Impossible de supprimer l\'image:', e.message);
      }
    }

    const result = await pool.query(
      'DELETE FROM publications WHERE id = $1 RETURNING *',
      [pubId]
    );
    
    console.log(`✅ Publication supprimée ID: ${pubId}`);
    res.json({ message: 'Publication supprimée avec succès' });
  } catch (error) {
    console.error('❌ Erreur DELETE publication:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;