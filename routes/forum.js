// routes/forum.js - COMPLET À JOUR
const express = require('express');
const router = express.Router();
const ForumTopic = require('../models/ForumTopic');
const ForumReply = require('../models/ForumReply');
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ========== TOPICS ==========

// GET - Tous les topics
router.get('/topics', authenticateToken, async (req, res) => {
  try {
    const topics = await ForumTopic.findAll();
    res.json(topics);
  } catch (error) {
    console.error('❌ GET /topics:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Topics par catégorie
router.get('/topics/category/:categoryId', authenticateToken, async (req, res) => {
  try {
    const topics = await ForumTopic.findByCategory(req.params.categoryId);
    res.json(topics);
  } catch (error) {
    console.error('❌ GET /topics/category:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Un topic
router.get('/topics/:id', authenticateToken, async (req, res) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic non trouvé' });
    await ForumTopic.incrementViews(req.params.id);
    res.json(topic);
  } catch (error) {
    console.error('❌ GET /topics/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer un topic
router.post('/topics', authenticateToken, async (req, res) => {
  try {
    const topic = await ForumTopic.create({ 
      ...req.body, 
      author_id: req.user.id, 
      author_name: req.user.name || req.user.email 
    });
    res.status(201).json(topic);
  } catch (error) {
    console.error('❌ POST /topics:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Liker un topic
router.post('/topics/:id/like', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE forum_topics SET likes = COALESCE(likes, 0) + 1 WHERE id = $1', [req.params.id]);
    const topic = await ForumTopic.findById(req.params.id);
    res.json({ likes: topic?.likes || 1 });
  } catch (error) {
    console.error('❌ POST /topics/like:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Supprimer un topic (admin)
router.delete('/topics/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const topic = await ForumTopic.findById(req.params.id);
    if (!topic) return res.status(404).json({ error: 'Topic non trouvé' });
    
    await pool.query('DELETE FROM forum_topics WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('❌ DELETE /topics:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ========== REPLIES ==========

// GET - Réponses d'un topic
router.get('/topics/:id/replies', authenticateToken, async (req, res) => {
  try {
    const replies = await ForumReply.findByTopic(req.params.id);
    res.json(replies);
  } catch (error) {
    console.error('❌ GET /replies:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer une réponse
router.post('/topics/:id/replies', authenticateToken, async (req, res) => {
  try {
    const reply = await ForumReply.create({ 
      ...req.body, 
      topic_id: req.params.id, 
      author_id: req.user.id, 
      author_name: req.user.name || req.user.email 
    });
    await ForumTopic.updateReplyCount(req.params.id);
    res.status(201).json(reply);
  } catch (error) {
    console.error('❌ POST /replies:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Liker une réponse
router.post('/replies/:id/like', authenticateToken, async (req, res) => {
  try {
    await ForumReply.like(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ POST /replies/like:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Supprimer une réponse (admin)
router.delete('/replies/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM forum_replies WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Réponse non trouvée' });
    
    const reply = result.rows[0];
    await pool.query('DELETE FROM forum_replies WHERE id = $1', [req.params.id]);
    await ForumTopic.updateReplyCount(reply.topic_id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ DELETE /replies:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;