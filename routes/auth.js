// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const router = express.Router();

// ✅ Vérification JWT_SECRET
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined');
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis' });
  }

  try {
    console.log('🔐 Tentative de login:', email);
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      console.log(`Utilisateur ${email} non trouvé`);
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // ✅ Vérification bcrypt uniquement - pas de fallback en clair
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log(`Mot de passe incorrect pour ${email}`);
      return res.status(401).json({ error: 'Identifiants incorrects' });
    }

    // ✅ Utiliser JWT_SECRET obligatoire
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role || 'member'
      }, 
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role || 'member'
      }
    });
  } catch (error) {
    console.error('❌ Erreur login:', error.message);
    res.status(500).json({ 
      error: 'Erreur serveur'
    });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    console.log('Aucun token fourni');
    return res.status(401).json({ error: 'Non autorisé' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('🔍 Token décodé:', decoded);
    
    const result = await pool.query(
      'SELECT id, email, role FROM users WHERE id = $1', 
      [decoded.id]
    );
    const user = result.rows[0];

    if (!user) {
      console.log(`Utilisateur ID ${decoded.id} non trouvé`);
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role || 'member'
    });
  } catch (error) {
    console.error('❌ Erreur /me:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    res.status(401).json({ 
      error: 'Token invalide'
    });
  }
});

// POST /api/auth/change-password — le membre connecté change SON propre mot de passe
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Non autorisé' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Mot de passe actuel et nouveau mot de passe requis' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
  }

  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Mot de passe actuel incorrect' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, user.id]);

    console.log(`🔑 Mot de passe changé avec succès pour l'utilisateur ${user.id}`);
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    console.error('❌ Erreur change-password:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;