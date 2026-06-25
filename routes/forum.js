// routes/forum.js
const express = require('express');
const router = express.Router();
const ForumTopic = require('../models/ForumTopic');
const ForumReply = require('../models/ForumReply');
const { authenticateToken } = require('../middleware/auth');

// GET - Tous les topics
router.get('/topics', authenticateToken, async (req, res) => {
  try {
    const topics = await ForumTopic.findAll();
    res.json(topics);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Topics par catégorie
router.get('/topics/category/:categoryId', authenticateToken, async (req, res) => {
  try {
    const topics = await ForumTopic.findByCategory(req.params.categoryId);
    res.json(topics);
  } catch (error) {
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
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer un topic
router.post('/topics', authenticateToken, async (req, res) => {
  try {
    const topic = await ForumTopic.create({ ...req.body, author_id: req.user.id, author_name: req.user.name || req.user.email });
    res.status(201).json(topic);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Réponses d'un topic
router.get('/topics/:id/replies', authenticateToken, async (req, res) => {
  try {
    const replies = await ForumReply.findByTopic(req.params.id);
    res.json(replies);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer une réponse
router.post('/topics/:id/replies', authenticateToken, async (req, res) => {
  try {
    const reply = await ForumReply.create({ ...req.body, topic_id: req.params.id, author_id: req.user.id, author_name: req.user.name || req.user.email });
    await ForumTopic.updateReplyCount(req.params.id);
    res.status(201).json(reply);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;