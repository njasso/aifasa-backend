const pool = require('../config/db');

const Transaction = {
  async create({ member_id, type, amount, caisse, date, details }) { // Ajout de 'details'
    const query = `
      INSERT INTO transactions (member_id, type, amount, caisse, date, details, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [member_id, type, amount, caisse, date, details]; // Passage de 'details'
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT * FROM transactions ORDER BY date DESC, created_at DESC;'; // Ajout d'un tri par défaut
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM transactions WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async getSummary() {
    // Cette fonction devra être plus complexe côté backend pour calculer les soldes
    // des différentes caisses et les corrélations comme demandé.
    // Pour l'instant, elle regroupe par caisse.
    const query = `
      SELECT caisse, SUM(amount) as total
      FROM transactions
      GROUP BY caisse;
    `;
    const result = await pool.query(query);

    // Initialiser les soldes avec 0
    let balance = {
      associationBudget: 0,
      socialContributionAccount: 0,
      tontineAccount: 0,
    };

    // Mapper les résultats de la base de données aux clés du résumé
    result.rows.forEach(row => {
      if (row.caisse === 'budget_association') {
        balance.associationBudget = parseFloat(row.total) || 0;
      } else if (row.caisse === 'compte_cotisation_sociale') {
        balance.socialContributionAccount = parseFloat(row.total) || 0;
      } else if (row.caisse === 'tontine_account') {
        balance.tontineAccount = parseFloat(row.total) || 0;
      }
    });

    // Retourner un objet avec le solde structuré et un placeholder pour les corrélations
    return { balance, correlations: {} };
  },

  // Vous aurez probablement besoin d'une méthode 'update' pour les transactions futures
  // si vous implémentez l'édition ou la correction de transactions.
  /*
  async update(id, { member_id, type, amount, caisse, date, details }) {
    const query = `
      UPDATE transactions
      SET
        member_id = $1,
        type = $2,
        amount = $3,
        caisse = $4,
        date = $5,
        details = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *;
    `;
    const values = [member_id, type, amount, caisse, date, details, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },
  */

  async delete(id) {
    const query = 'DELETE FROM transactions WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = Transaction;
