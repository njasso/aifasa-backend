const Transaction = require('../models/Transaction');

const treasuryController = {
  async getAll(req, res) {
    try {
      const transactions = await Transaction.findAll();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async getSummary(req, res) {
    try {
      const summary = await Transaction.getSummary();
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async create(req, res) {
    try {
      const { member_id, type, amount, caisse, date } = req.body;
      const transaction = await Transaction.create({
        member_id,
        type,
        amount,
        caisse,
        date,
      });
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = treasuryController;