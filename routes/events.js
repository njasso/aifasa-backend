// routes/events.js
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET - Tous les événements (public)
router.get('/', async (req, res) => {
  try {
    const events = await Event.findAll();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Un événement
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Événement non trouvé' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer (admin)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Modifier (admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const event = await Event.update(req.params.id, req.body);
    res.json(event);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Supprimer (admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await Event.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;