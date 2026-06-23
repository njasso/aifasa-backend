// routes/treasury.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ================================================================
// ROUTES RACINE (utilisées par le frontend)
// ================================================================

// ✅ GET /api/treasury - Récupérer toutes les transactions
router.get('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    console.error('❌ Erreur GET /:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/treasury - Créer une transaction
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const { member_id, type, amount, caisse, date, details, is_budget, payment_method, description, note } = req.body;

  if (!type || !amount || !caisse) {
    return res.status(400).json({ error: 'Type, montant et caisse sont requis.' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Ajout transaction:', { member_id, type, amount, caisse, is_budget });

    const transactionResult = await client.query(
      `INSERT INTO transactions (member_id, type, amount, caisse, date, details, is_budget, payment_method, description, note, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        member_id || null, 
        type, 
        parseFloat(amount), 
        caisse, 
        date || new Date().toISOString().split('T')[0], 
        details || null,
        is_budget || false,
        payment_method || null,
        description || note || null,
        note || description || null
      ]
    );
    
    const transaction = transactionResult.rows[0];

    if (member_id && !is_budget) {
      const member = await Member.findById(member_id);
      if (member) {
        const updateData = {};
        
        if (type === 'cotisation_sociale') {
          const currentYear = new Date().getFullYear();
          const socialStatus = member.social_contribution_status || {};
          if (!socialStatus[currentYear]) {
            socialStatus[currentYear] = { total_paid: 0 };
          }
          socialStatus[currentYear].total_paid = (socialStatus[currentYear].total_paid || 0) + parseFloat(amount);
          updateData.social_contribution_status = socialStatus;
        } else if (type === 'droit_adhesion') {
          updateData.has_paid_adhesion = true;
        } else if (type === 'tontine') {
          const tontineStatus = member.tontine_status || {};
          const shares = details?.tontineShares ? parseInt(details.tontineShares) : 1;
          tontineStatus.current_shares = (tontineStatus.current_shares || 0) + shares;
          updateData.tontine_status = tontineStatus;
        } else if (type === 'inscription_nouveau' || type === 'inscription_ancien') {
          updateData.is_new_member = false;
          updateData.last_annual_inscription_date = date || new Date().toISOString().split('T')[0];
        }

        if (Object.keys(updateData).length > 0) {
          const keys = Object.keys(updateData);
          const values = Object.values(updateData);
          const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
          
          await client.query(
            `UPDATE members SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1}`,
            [...values, member_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Transaction créée ID: ${transaction.id}`);
    res.status(201).json(transaction);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur POST /:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ✅ DELETE /api/treasury/:id - Supprimer une transaction
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const transactionId = req.params.id;
    console.log(`📝 Suppression transaction ID: ${transactionId}`);

    const transactionResult = await client.query(
      'SELECT * FROM transactions WHERE id = $1',
      [transactionId]
    );
    
    const transaction = transactionResult.rows[0];
    if (!transaction) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }

    await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
    await client.query('COMMIT');
    console.log(`✅ Transaction supprimée ID: ${transactionId}`);
    res.status(204).send();
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur DELETE /:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ================================================================
// ROUTES SPÉCIFIQUES
// ================================================================

// ✅ GET /api/treasury/summary - Résumé des caisses
router.get('/summary', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const summary = await Transaction.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('❌ Erreur GET /summary:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/transactions - Alias
router.get('/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    console.error('❌ Erreur GET /transactions:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/member/:memberId/status
router.get('/member/:memberId/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const memberId = req.params.memberId;
    const member = await Member.findById(memberId);
    
    if (!member) return res.status(404).json({ error: 'Membre non trouvé.' });

    const currentYear = new Date().getFullYear();
    const result = await pool.query('SELECT * FROM transactions WHERE member_id = $1 ORDER BY date DESC', [memberId]);
    const transactions = result.rows;

    const socialPaid = transactions
      .filter(t => t.type === 'cotisation_sociale' && new Date(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const adhesionPaid = transactions.some(t => t.type === 'droit_adhesion');
    const tontineShares = transactions.filter(t => t.type === 'tontine').reduce((sum, t) => sum + (parseInt(t.details?.tontineShares) || 1), 0);
    const agAbsenceCount = transactions.filter(t => t.type === 'absence_ag').length;

    const alerts = [];
    if (socialPaid < 50000) alerts.push(`Cotisation sociale : ${socialPaid}/50000 FCFA`);
    if (!adhesionPaid) alerts.push("Droit d'adhésion non payé");

    res.json({ socialContributionPaid: socialPaid, adhesionPaid, tontineShares, agAbsenceCount, alerts });
  } catch (error) {
    console.error('❌ Erreur GET /member/:id/status:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/member-status/:memberId - Alias
router.get('/member-status/:memberId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const memberId = req.params.memberId;
    const member = await Member.findById(memberId);
    if (!member) return res.status(404).json({ error: 'Membre non trouvé.' });

    const currentYear = new Date().getFullYear();
    const status = {
      inscriptionStatus: member.is_new_member ? 'Nouveau membre' : 'Inscrit',
      lastAnnualInscriptionDate: member.last_annual_inscription_date,
      socialContributionPaid: member.social_contribution_status?.[currentYear]?.total_paid || 0,
      adhesionPaid: member.has_paid_adhesion || false,
      tontineShares: member.tontine_status?.current_shares || 0,
      agAbsenceCount: member.ag_absence_count || 0,
      alerts: []
    };
    res.json(status);
  } catch (error) {
    console.error('❌ Erreur GET /member-status/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// SANCTIONS
// ================================================================

// ✅ GET /api/treasury/sanctions
router.get('/sanctions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const result = await pool.query(
      `SELECT s.*, m.first_name, m.last_name FROM sanctions s 
       LEFT JOIN members m ON s.member_id = m.id 
       ORDER BY s.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ GET /sanctions:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/treasury/sanctions
router.post('/sanctions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const { member_id, type, description, initial_amount, sanction_date } = req.body;
    const result = await pool.query(
      `INSERT INTO sanctions (member_id, type, description, initial_amount, sanction_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [member_id, type, description, parseFloat(initial_amount), sanction_date]
    );
    const member = await pool.query('SELECT first_name, last_name FROM members WHERE id = $1', [member_id]);
    res.status(201).json({ ...result.rows[0], first_name: member.rows[0]?.first_name, last_name: member.rows[0]?.last_name });
  } catch (error) {
    console.error('❌ POST /sanctions:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/treasury/sanctions/:id/recover
router.post('/sanctions/:id/recover', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const { id } = req.params;
    const { recovered_amount, payment_method } = req.body;
    const current = await pool.query('SELECT * FROM sanctions WHERE id = $1', [id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'Sanction non trouvée' });
    
    const newRecovered = parseFloat(current.rows[0].recovered_amount) + parseFloat(recovered_amount);
    const newStatus = newRecovered >= parseFloat(current.rows[0].initial_amount) ? 'recovered' : 'partial';
    
    const result = await pool.query(
      `UPDATE sanctions SET recovered_amount = $1, status = $2, payment_method = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *`,
      [newRecovered, newStatus, payment_method, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ POST /sanctions/recover:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ================================================================
// CASH OPERATIONS
// ================================================================

// ✅ GET /api/treasury/cash-operations
router.get('/cash-operations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const result = await pool.query('SELECT * FROM cash_operations ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ GET /cash-operations:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/treasury/cash-operations
router.post('/cash-operations', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const { direction, type, amount, account, payment_method, description, reference_event, op_date } = req.body;
    const result = await pool.query(
      `INSERT INTO cash_operations (direction, type, amount, account, payment_method, description, reference_event, op_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [direction, type, parseFloat(amount), account, payment_method, description, reference_event, op_date]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('❌ POST /cash-operations:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ DELETE /api/treasury/cash-operations/:id
router.delete('/cash-operations/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    await pool.query('DELETE FROM cash_operations WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (error) {
    console.error('❌ DELETE /cash-operations:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;