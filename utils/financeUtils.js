const pool = require('../config/db');

const financeUtils = {
  async calculateCaisseCorrelation() {
    try {
      const query = `
        SELECT t1.caisse as caisse1, t2.caisse as caisse2, SUM(t1.amount * t2.amount) as correlation
        FROM transactions t1
        JOIN transactions t2 ON t1.date = t2.date AND t1.caisse < t2.caisse
        GROUP BY t1.caisse, t2.caisse;
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error('Erreur lors du calcul de corrélation');
    }
  },

  async calculateTotalByCaisse() {
    try {
      const query = `
        SELECT caisse, SUM(amount) as total
        FROM transactions
        GROUP BY caisse;
      `;
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new Error('Erreur lors du calcul des totaux');
    }
  },
};

module.exports = financeUtils;