// config/db.js
require('dotenv').config();
const { Pool } = require('pg');

// Configuration de la base de données
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true,
  },
  max: 10,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
  keepAlive: false,
});

// Gestion des erreurs du pool
pool.on('error', (err) => {
  console.error('❌ Erreur pool PostgreSQL:', err.message);
});

// Fonction de test de connexion
const testDbConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Connecté à PostgreSQL (NeonDB)');
    console.log('🕐 Heure serveur:', result.rows[0].now);
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Erreur de connexion PostgreSQL:', err.message);
    if (client) client.release();
    return false;
  }
};

module.exports = { pool, testDbConnection };