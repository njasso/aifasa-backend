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

    // Mettre à jour le statut du membre si ce n'est pas un budget
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

// ✅ GET /api/treasury/transactions - Récupérer toutes les transactions (alias)
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

// ✅ GET /api/treasury/member/:memberId/status - Statut financier d'un membre
router.get('/member/:memberId/status', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const memberId = req.params.memberId;
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    const currentYear = new Date().getFullYear();
    
    // Récupérer les transactions du membre
    const result = await pool.query(
      'SELECT * FROM transactions WHERE member_id = $1 ORDER BY date DESC',
      [memberId]
    );
    const transactions = result.rows;

    const socialPaid = transactions
      .filter(t => t.type === 'cotisation_sociale' && new Date(t.date).getFullYear() === currentYear)
      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
    
    const adhesionPaid = transactions.some(t => t.type === 'droit_adhesion');
    
    const tontineShares = transactions
      .filter(t => t.type === 'tontine')
      .reduce((sum, t) => sum + (parseInt(t.details?.tontineShares) || 1), 0);
    
    const agAbsenceCount = transactions.filter(t => t.type === 'absence_ag').length;

    const alerts = [];
    if (socialPaid < 50000) alerts.push(`Cotisation sociale : ${socialPaid}/50000 FCFA`);
    if (!adhesionPaid) alerts.push("Droit d'adhésion non payé");

    res.json({
      socialContributionPaid: socialPaid,
      adhesionPaid,
      tontineShares,
      agAbsenceCount,
      alerts
    });
  } catch (error) {
    console.error('❌ Erreur GET /member/:id/status:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/member-status/:memberId - Statut détaillé (alias)
router.get('/member-status/:memberId', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const memberId = req.params.memberId;
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    const currentYear = new Date().getFullYear();

    const memberFinancialStatus = {
      inscriptionStatus: 'Inconnu',
      lastAnnualInscriptionDate: member.last_annual_inscription_date,
      socialContributionPaid: member.social_contribution_status?.[currentYear]?.total_paid || 0,
      adhesionPaid: member.has_paid_adhesion || false,
      tontineShares: member.tontine_status?.current_shares || 0,
      tontineUnpaidMonths: member.tontine_status?.unpaid_months || [],
      agAbsenceCount: member.ag_absence_count || 0,
    };

    if (member.is_new_member) {
      memberFinancialStatus.inscriptionStatus = 'Nouveau membre (non inscrit annuellement)';
    } else if (member.last_annual_inscription_date) {
      const inscriptionYear = new Date(member.last_annual_inscription_date).getFullYear();
      memberFinancialStatus.inscriptionStatus = inscriptionYear === currentYear 
        ? "À jour pour l'année en cours" 
        : `Non à jour (dernière inscription: ${inscriptionYear})`;
    }

    const alerts = [];
    if (memberFinancialStatus.socialContributionPaid < 25000) {
      alerts.push(`Cotisation sociale incomplète (${memberFinancialStatus.socialContributionPaid}/25000 FCFA)`);
    }
    if (!memberFinancialStatus.adhesionPaid) alerts.push("Droit d'adhésion non payé");
    if (memberFinancialStatus.agAbsenceCount > 0) alerts.push(`${memberFinancialStatus.agAbsenceCount} absence(s) AG`);

    memberFinancialStatus.alerts = alerts;
    res.json(memberFinancialStatus);
  } catch (error) {
    console.error('❌ Erreur GET /member-status/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/caisses - Caisses disponibles
router.get('/caisses', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const result = await pool.query(
      `SELECT DISTINCT caisse FROM transactions WHERE caisse IS NOT NULL ORDER BY caisse`
    );
    res.json(result.rows.map(r => r.caisse));
  } catch (error) {
    console.error('❌ Erreur GET /caisses:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ GET /api/treasury/balance-sheet - Bilan comptable
router.get('/balance-sheet', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT caisse, type, SUM(amount) as total 
       FROM transactions 
       WHERE date BETWEEN $1 AND $2 
       GROUP BY caisse, type 
       ORDER BY caisse, type`,
      [start, end]
    );
    
    res.json({ startDate: start, endDate: end, rows: result.rows });
  } catch (error) {
    console.error('❌ Erreur GET /balance-sheet:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ POST /api/treasury/transactions - Créer transaction (alias)
router.post('/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const { member_id, type, amount, caisse, date, details, is_budget, payment_method, description } = req.body;

  if (!type || !amount || !caisse) {
    return res.status(400).json({ error: 'Type, montant et caisse sont requis.' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const transactionResult = await client.query(
      `INSERT INTO transactions (member_id, type, amount, caisse, date, details, is_budget, payment_method, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
       RETURNING *`,
      [member_id || null, type, parseFloat(amount), caisse, date || new Date().toISOString().split('T')[0], details || null, is_budget || false, payment_method || null, description || null]
    );
    
    const transaction = transactionResult.rows[0];

    if (member_id && !is_budget) {
      const member = await Member.findById(member_id);
      if (member) {
        const updateData = {};
        
        if (type === 'cotisation_sociale') {
          const currentYear = new Date().getFullYear();
          const socialStatus = member.social_contribution_status || {};
          if (!socialStatus[currentYear]) socialStatus[currentYear] = { total_paid: 0 };
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
    res.status(201).json(transaction);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur POST /transactions:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ✅ DELETE /api/treasury/transactions/:id - Supprimer transaction (alias)
router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }
  try {
    const result = await pool.query('DELETE FROM transactions WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Transaction non trouvée' });
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erreur DELETE /transactions/:id:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;