// routes/admin/users.js
const express = require('express');
const router = express.Router();
const { pool } = require('../../config/db');
const { authenticateToken, isAdmin } = require('../../middleware/auth');
const bcrypt = require('bcrypt');

// ============ ROUTES ADMIN UTILISATEURS ============

// GET - Récupérer tous les utilisateurs
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Erreur GET /admin/users:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET - Récupérer un utilisateur par ID
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, role, created_at FROM users WHERE id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur GET /admin/users/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST - Créer un utilisateur
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    // Vérifier si l'email existe déjà
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (email, password, role) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, role, created_at`,
      [email, hashedPassword, role || 'member']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur POST /admin/users:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PUT - Mettre à jour un utilisateur
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { email, role, password } = req.body;
    const userId = req.params.id;

    // Vérifier si l'utilisateur existe
    const existing = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Construction de la requête dynamique
    let query = 'UPDATE users SET ';
    const values = [];
    let paramCount = 1;

    if (email) {
      // Vérifier si le nouvel email est déjà utilisé par un autre utilisateur
      const emailCheck = await pool.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, userId]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      }
      query += `email = $${paramCount}, `;
      values.push(email);
      paramCount++;
    }

    if (role) {
      query += `role = $${paramCount}, `;
      values.push(role);
      paramCount++;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `password = $${paramCount}, `;
      values.push(hashedPassword);
      paramCount++;
    }

    // Enlever la dernière virgule
    query = query.slice(0, -2);
    query += ` WHERE id = $${paramCount} RETURNING id, email, role, created_at`;
    values.push(userId);

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erreur PUT /admin/users:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// DELETE - Supprimer un utilisateur
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Empêcher la suppression de son propre compte
    if (parseInt(userId) === req.user.id) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    const result = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      message: 'Utilisateur supprimé avec succès', 
      deleted: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Erreur DELETE /admin/users:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// POST - Réinitialiser le mot de passe
router.post('/:id/reset-password', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.params.id;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashedPassword, userId]
    );

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('❌ Erreur POST /admin/users/reset-password:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PATCH - Changer le rôle d'un utilisateur
router.patch('/:id/role', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['admin', 'treasurer', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Rôle invalide' });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role',
      [role, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({ 
      message: 'Rôle mis à jour avec succès', 
      user: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Erreur PATCH /admin/users/role:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;