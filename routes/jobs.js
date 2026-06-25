// routes/jobs.js - COMPLET AVEC LOGS
const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET - Toutes les offres (public)
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.findAll();
    res.json(jobs);
  } catch (error) {
    console.error('❌ GET jobs:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Une offre
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Non trouvé' });
    res.json(job);
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
    console.error('❌ POST job:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT - Modifier une offre (admin)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  console.log('📝 PUT /jobs/:id - ID:', req.params.id);
  console.log('📝 Body:', JSON.stringify(req.body));
  
  try {
    const id = req.params.id;
    const { title, type, organization, location, description, contact_email, deadline } = req.body;

    const result = await pool.query(
      `UPDATE jobs SET title=$1, type=$2, organization=$3, location=$4, description=$5, contact_email=$6, deadline=$7 
       WHERE id=$8 RETURNING *`,
      [title, type, organization, location, description, contact_email, deadline, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Offre non trouvée' });
    }

    console.log('✅ PUT réussi:', result.rows[0].id);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ PUT job ERROR:', error.message);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// DELETE - Désactiver une offre (admin)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await Job.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('❌ DELETE job:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;