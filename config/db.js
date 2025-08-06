const { Pool } = require('pg');
require('dotenv').config(); // Load environment variables from .env file

// --- Debugging Line (REMOVE AFTER FIXING) ---
console.log('DATABASE_URL from .env:', process.env.DATABASE_URL);
// ---------------------------------------------

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Conditional SSL configuration for production environments
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Attempt to connect to the database and log the outcome
pool.connect((err) => {
  if (err) {
    console.error('Erreur de connexion PostgreSQL:', err.message, err.stack);
  } else {
    console.log('Connecté à PostgreSQL');
  }
});

module.exports = pool;