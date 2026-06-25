// routes/jobs.js
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET - Toutes les offres (public)
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST - Créer une offre (membres connectés)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const job = await Job.create(req.body);
    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE - Désactiver une offre (admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await Job.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;