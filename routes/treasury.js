// routes/treasury.js
const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Member = require('../models/Member');
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============ ROUTES PUBLIQUES (Lecture) ============

// GET - Récupérer toutes les transactions
router.get('/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    console.error('❌ Erreur GET transactions:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Récupérer le résumé des transactions
router.get('/summary', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  try {
    const summary = await Transaction.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('❌ Erreur GET summary:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ NOUVEAU: Récupérer les caisses disponibles
router.get('/caisses', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  try {
    const caisses = await Transaction.getAvailableCaisses();
    res.json(caisses);
  } catch (error) {
    console.error('❌ Erreur GET caisses:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ NOUVEAU: Générer un bilan comptable
router.get('/balance-sheet', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];
    
    const balanceSheet = await Transaction.getBalanceSheet(start, end);
    res.json({ startDate: start, endDate: end, ...balanceSheet });
  } catch (error) {
    console.error('❌ Erreur GET balance-sheet:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET - Récupérer le statut financier d'un membre
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

    const currentYear = 2026;

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
      if (inscriptionYear === currentYear) {
        memberFinancialStatus.inscriptionStatus = 'À jour pour l\'année en cours';
      } else {
        memberFinancialStatus.inscriptionStatus = `Non à jour (dernière inscription: ${inscriptionYear})`;
      }
    } else {
      memberFinancialStatus.inscriptionStatus = 'Statut d\'inscription non enregistré';
    }

    const alerts = [];
    if (memberFinancialStatus.socialContributionPaid < 25000) {
      alerts.push(`Cotisation sociale incomplète (${memberFinancialStatus.socialContributionPaid}/25000 FCFA)`);
    }
    if (!memberFinancialStatus.adhesionPaid) {
      alerts.push('Droit d\'adhésion non payé');
    }
    if (memberFinancialStatus.tontineUnpaidMonths.length > 0) {
      alerts.push(`Tontine impayée pour ${memberFinancialStatus.tontineUnpaidMonths.length} mois`);
    }
    if (memberFinancialStatus.agAbsenceCount > 0) {
      alerts.push(`${memberFinancialStatus.agAbsenceCount} absence(s) à l'Assemblée Générale`);
    }

    memberFinancialStatus.alerts = alerts;
    res.json(memberFinancialStatus);
  } catch (error) {
    console.error('❌ Erreur GET member-status:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES ADMIN/TRESORIER (Écriture) ============

// ✅ POST - Créer une transaction (avec support budget)
router.post('/transactions', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit.' });
  }

  const { member_id, type, amount, caisse, date, details, is_budget } = req.body;

  if (!type || !amount || !caisse) {
    return res.status(400).json({ error: 'Type, montant et caisse sont requis.' });
  }

  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Ajout transaction:', { member_id, type, amount, caisse, is_budget });

    // Créer la transaction
    const transactionResult = await client.query(
      `INSERT INTO transactions (member_id, type, amount, caisse, date, details, is_budget, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        member_id || null, 
        type, 
        parseFloat(amount), 
        caisse, 
        date || new Date().toISOString().split('T')[0], 
        details || null,
        is_budget || false
      ]
    );
    
    const transaction = transactionResult.rows[0];

    // ✅ Mettre à jour le statut du membre si c'est une transaction membre (non budget)
    if (member_id && !is_budget) {
      const member = await Member.findById(member_id);
      if (member) {
        const updateData = {};
        
        if (type === 'cotisation_sociale') {
          const currentYear = 2026;
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
          updateData.last_annual_inscription_date = new Date().toISOString().split('T')[0];
        }

        if (Object.keys(updateData).length > 0) {
          await client.query(
            `UPDATE members SET ${Object.keys(updateData).map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${Object.keys(updateData).length + 1}`,
            [...Object.values(updateData), member_id]
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Transaction créée ID: ${transaction.id}`);
    res.status(201).json(transaction);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur POST transaction:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

// ✅ DELETE - Supprimer une transaction
router.delete('/transactions/:id', authenticateToken, async (req, res) => {
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

    // Inverser les effets sur le membre si ce n'est pas un budget
    if (transaction.member_id && !transaction.is_budget) {
      const member = await Member.findById(transaction.member_id);
      if (member) {
        const updateData = {};
        
        if (transaction.type === 'cotisation_sociale') {
          const currentYear = 2026;
          const socialStatus = member.social_contribution_status || {};
          if (socialStatus[currentYear]) {
            socialStatus[currentYear].total_paid = Math.max(0, (socialStatus[currentYear].total_paid || 0) - parseFloat(transaction.amount));
            if (socialStatus[currentYear].total_paid === 0) {
              delete socialStatus[currentYear];
            }
          }
          updateData.social_contribution_status = socialStatus;
        } else if (transaction.type === 'droit_adhesion') {
          updateData.has_paid_adhesion = false;
        } else if (transaction.type === 'tontine') {
          const tontineStatus = member.tontine_status || {};
          const sharesToRemove = transaction.details?.tontineShares ? parseInt(transaction.details.tontineShares) : 1;
          tontineStatus.current_shares = Math.max(0, (tontineStatus.current_shares || 0) - sharesToRemove);
          updateData.tontine_status = tontineStatus;
        } else if (transaction.type === 'inscription_nouveau' || transaction.type === 'inscription_ancien') {
          updateData.is_new_member = true;
          updateData.last_annual_inscription_date = null;
        }

        if (Object.keys(updateData).length > 0) {
          await client.query(
            `UPDATE members SET ${Object.keys(updateData).map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
             WHERE id = $${Object.keys(updateData).length + 1}`,
            [...Object.values(updateData), transaction.member_id]
          );
        }
      }
    }

    await client.query('DELETE FROM transactions WHERE id = $1', [transactionId]);
    await client.query('COMMIT');
    console.log(`✅ Transaction supprimée ID: ${transactionId}`);
    res.status(204).send();
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur DELETE transaction:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  } finally {
    client.release();
  }
});

module.exports = router;