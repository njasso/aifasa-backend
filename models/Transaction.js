// models/Transaction.js
const { pool } = require('../config/db');

const Transaction = {
  async create({ member_id, type, amount, caisse, date, details, is_budget = false }) {
    const query = `
      INSERT INTO transactions (member_id, type, amount, caisse, date, details, is_budget, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [member_id, type, amount, caisse, date, details, is_budget];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT * FROM transactions ORDER BY date DESC, created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM transactions WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async getSummary() {
    const query = `
      SELECT caisse, 
             SUM(CASE WHEN is_budget = true THEN amount ELSE 0 END) as budget_total,
             SUM(CASE WHEN is_budget = false THEN amount ELSE 0 END) as member_total,
             SUM(amount) as total
      FROM transactions
      GROUP BY caisse;
    `;
    const result = await pool.query(query);

    let balance = {
      associationBudget: 0,
      socialContributionAccount: 0,
      tontineAccount: 0,
    };

    result.rows.forEach(row => {
      if (row.caisse === 'budget_association') {
        balance.associationBudget = parseFloat(row.total) || 0;
      } else if (row.caisse === 'compte_cotisation_sociale') {
        balance.socialContributionAccount = parseFloat(row.total) || 0;
      } else if (row.caisse === 'tontine_account') {
        balance.tontineAccount = parseFloat(row.total) || 0;
      }
    });

    return { balance, correlations: {} };
  },

  // ✅ NOUVEAU: Récupérer toutes les caisses disponibles
  async getAvailableCaisses() {
    const query = `
      SELECT DISTINCT caisse FROM transactions 
      UNION ALL 
      SELECT 'budget_association' WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE caisse = 'budget_association')
      UNION ALL 
      SELECT 'compte_cotisation_sociale' WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE caisse = 'compte_cotisation_sociale')
      UNION ALL 
      SELECT 'tontine_account' WHERE NOT EXISTS (SELECT 1 FROM transactions WHERE caisse = 'tontine_account')
    `;
    const result = await pool.query(query);
    return result.rows.map(r => r.caisse);
  },

  // ✅ NOUVEAU: Générer un bilan comptable
  async getBalanceSheet(startDate, endDate) {
    const query = `
      SELECT 
        COALESCE(SUM(CASE WHEN is_budget = true AND amount > 0 THEN amount ELSE 0 END), 0) as total_budget_entries,
        COALESCE(SUM(CASE WHEN is_budget = false AND amount > 0 THEN amount ELSE 0 END), 0) as total_member_entries,
        COALESCE(SUM(CASE WHEN type = 'retrait_social' OR type = 'autre_depense' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN type = 'cotisation_sociale' THEN amount ELSE 0 END), 0) as total_social_fund,
        COALESCE(SUM(CASE WHEN type = 'inscription_nouveau' OR type = 'inscription_ancien' THEN amount ELSE 0 END), 0) as total_inscriptions,
        COALESCE(SUM(CASE WHEN type = 'droit_adhesion' THEN amount ELSE 0 END), 0) as total_adhesion,
        COALESCE(SUM(CASE WHEN type = 'discipline' OR type = 'absence_ag' THEN amount ELSE 0 END), 0) as total_sanctions,
        COUNT(*) as total_transactions,
        COUNT(CASE WHEN is_budget = true THEN 1 END) as budget_transactions,
        COUNT(CASE WHEN is_budget = false THEN 1 END) as member_transactions
      FROM transactions
      WHERE date >= $1 AND date <= $2
    `;
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM transactions WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = Transaction;