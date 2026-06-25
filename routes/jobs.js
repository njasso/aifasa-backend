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

// PUT - Modifier une offre (admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, type, organization, location, description, contact_email, deadline } = req.body;
    const result = await pool.query(
      `UPDATE jobs SET title=$1, type=$2, organization=$3, location=$4, description=$5, contact_email=$6, deadline=$7 
       WHERE id=$8 RETURNING *`,
      [title, type, organization, location, description, contact_email, deadline, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Offre non trouvée' });
    res.json(result.rows[0]);
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