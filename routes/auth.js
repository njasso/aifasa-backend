const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const router = express.Router();

// POST /api/auth/login - Handle user login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Input validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis' });
  }

  try {
    // Query the user by email
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    // Check if user exists and password matches
    if (!user) {
      console.log(`Utilisateur avec l'email ${email} non trouvé`);
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      console.log(`Mot de passe incorrect pour l'email ${email}`);
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error.message, error.stack);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET /api/auth/me - Get authenticated user info
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  // Check if token is provided
  if (!token) {
    console.log('Aucun token fourni dans la requête /me');
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Query user details
    const result = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];

    if (!user) {
      console.log(`Utilisateur avec l'ID ${decoded.id} non trouvé`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(user);
  } catch (error) {
    console.error('Erreur lors de la récupération des infos utilisateur:', error.message, error.stack);
    res.status(401).json({ error: 'Token invalide', details: error.message });
  }
});

module.exports = router;