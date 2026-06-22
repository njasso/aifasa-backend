// middleware/auth.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Accès non autorisé' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });
    req.user = user;
    next();
  });
};

// ✅ Ajouter le middleware isAdmin
const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Utilisateur non authentifié' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès refusé - Droits admin requis' });
  }

  next();
};

module.exports = {
  authenticateToken,
  isAdmin
};