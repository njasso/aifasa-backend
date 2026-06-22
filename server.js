// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { testDbConnection } = require('./config/db');

// ✅ Vérification JWT_SECRET obligatoire
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET est requis dans le fichier .env');
  process.exit(1);
}

const app = express();

// ✅ Helmet pour sécuriser les en-têtes HTTP
app.use(helmet());

// ✅ Rate Limiting pour prévenir le brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes par IP
  message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ✅ Configuration CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'https://aifasa17plan-backend.onrender.com'
  ];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Middleware de logging filtré
const isDevelopment = process.env.NODE_ENV === 'development';
app.use((req, res, next) => {
  if (isDevelopment) {
    console.log(`📝 ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
      // ✅ Masquer les données sensibles dans les logs
      const safeBody = { ...req.body };
      if (safeBody.password) safeBody.password = '***';
      console.log('📦 Body:', safeBody);
    }
  }
  next();
});

// ==================== ROUTES ====================
const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const memberRoutes = require('./routes/members');
const treasuryRoutes = require('./routes/treasury');
const projectRoutes = require('./routes/projects');
const galleryRoutes = require('./routes/gallery');
const publicationRoutes = require('./routes/publications');
const dashboardRoutes = require('./routes/dashboard');
const adminUserRoutes = require('./routes/admin/users');

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', adminUserRoutes);

// ==================== ROUTES DE TEST ====================
app.get('/api/test', (req, res) => {
  res.json({
    message: '✅ API fonctionne !',
    timestamp: new Date().toISOString(),
    status: 'online'
  });
});

app.get('/api/test-db', async (req, res) => {
  try {
    const { pool } = require('./config/db');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({
      message: '✅ Base de données accessible',
      time: result.rows[0].now,
      status: 'connected'
    });
  } catch (error) {
    res.status(500).json({
      message: '❌ Base de données inaccessible',
      error: isDevelopment ? error.message : undefined,
      status: 'disconnected'
    });
  }
});

// ==================== GESTION DES ERREURS ====================
app.use((req, res) => {
  res.status(404).json({
    message: 'Route non trouvée',
    url: req.url,
    method: req.method
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Erreur globale:', err.stack);
  res.status(500).json({
    message: 'Erreur serveur interne',
    error: isDevelopment ? err.message : undefined
  });
});

// ==================== DÉMARRAGE ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`\n🚀 =========================================`);
  console.log(`✅ Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🌐 CORS autorisé pour : ${allowedOrigins.join(', ')}`);
  console.log(`=========================================\n`);
  
  await testDbConnection();
});

module.exports = { app };