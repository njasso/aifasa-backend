// server.js - COMPLET À JOUR (routes events, forum, jobs ajoutées)
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

app.set('trust proxy', 1);
// ✅ Helmet pour sécuriser les en-têtes HTTP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://aifasa-backend.onrender.com', 'https://*.onrender.com', 'https://api.aifasa17.org'],
      mediaSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"], // ← Remplace X-Frame-Options
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: 'deny' }, // ← X-Frame-Options: DENY
  xssFilter: true,                // ← X-XSS-Protection
  noSniff: true,                  // ← X-Content-Type-Options
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // ← Referrer-Policy
  permissionsPolicy: {            // ← Permissions-Policy
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
      payment: []
    }
  }
}));

// ✅ Rate Limiting pour prévenir le brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite de 100 requêtes par IP
  message: { error: 'Trop de tentatives, veuillez réessayer dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth', authLimiter);

// ✅ Configuration CORS CORRIGÉE
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

// Ajouter les origines connues
const knownOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'https://harmonious-boba-e7278d.netlify.app',
  'https://aifasa-frontend.netlify.app',
  'https://aifasa17.org',        // ← AJOUTÉ
  'https://www.aifasa17.org',    // ← AJOUTÉ
];

const allOrigins = [...new Set([...knownOrigins, ...allowedOrigins])];

const corsOptions = {
  origin: function (origin, callback) {
    // Permettre les requêtes sans origin (server-to-server, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }

    // ✅ CORRIGÉ : la liste blanche est désormais réellement appliquée.
    // Toute origine non listée est rejetée (au lieu d'être autorisée "temporairement").
    if (allOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`⛔ CORS: Origine refusée: ${origin}`);
    return callback(new Error('Origine non autorisée par la politique CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 heures de cache pour les requêtes preflight
};

app.use(cors(corsOptions));

// Gérer explicitement les requêtes OPTIONS
app.options('*', cors(corsOptions));

// Middleware pour les headers CORS supplémentaires (cohérent avec corsOptions ci-dessus)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ✅ Gestion explicite des erreurs CORS (origine refusée)
app.use((err, req, res, next) => {
  if (err && err.message === 'Origine non autorisée par la politique CORS') {
    return res.status(403).json({ error: 'Origine non autorisée.' });
  }
  next(err);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Middleware de logging filtré
const isDevelopment = process.env.NODE_ENV === 'development';
app.use((req, res, next) => {
  if (isDevelopment) {
    console.log(`📝 ${req.method} ${req.url}`);
    if (req.method === 'POST' || req.method === 'PUT') {
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
const eventRoutes = require('./routes/events');         // ← AJOUTÉ
const forumRoutes = require('./routes/forum');           // ← AJOUTÉ
const jobRoutes = require('./routes/jobs');              // ← AJOUTÉ

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/publications', publicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/events', eventRoutes);                    // ← AJOUTÉ
app.use('/api/forum', forumRoutes);                     // ← AJOUTÉ
app.use('/api/jobs', jobRoutes);                        // ← AJOUTÉ

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
  console.log(`🌐 CORS autorisé pour : ${allOrigins.join(', ')}`);
  console.log(`🛡️  Sécurité: Helmet activé (CSP, X-Frame-Options, XSS, noSniff, Referrer, Permissions)`);
  console.log(`📡 Routes: auth, documents, members, treasury, projects, gallery, publications, dashboard, admin/users, events, forum, jobs`);
  console.log(`=========================================\n`);
  
  await testDbConnection();
});

module.exports = { app };