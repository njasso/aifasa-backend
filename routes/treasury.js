const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Member = require('../models/Member'); // Importation du modèle Member
const authenticateToken = require('../middleware/auth');

router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.findAll();
    res.json(transactions);
  } catch (error) {
    console.error('Erreur lors de la récupération des transactions:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des transactions', details: error.message });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const summary = await Transaction.getSummary();
    res.json(summary);
  } catch (error) {
    console.error('Erreur lors de la récupération du résumé:', error.message);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du résumé', details: error.message });
  }
});

router.post('/transactions', authenticateToken, async (req, res) => {
  // L'accès est autorisé pour les trésoriers et les administrateurs
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Seuls les trésoriers et administrateurs peuvent ajouter des transactions.' });
  }

  try {
    const { member_id, type, amount, caisse, date, details } = req.body;

    // TODO: Ici, vous devrez implémenter la logique métier complexe pour la création de transactions:
    // - Vérifier le type de transaction (inscription nouveau/ancien, cotisation, tontine, etc.)
    // - Appliquer les montants fixes et les règles (ex: 5000/2500 pour inscription)
    // - Vérifier les soldes des caisses avant les retraits
    // - Mettre à jour les soldes des caisses après la transaction
    // - Gérer les déductions automatiques (ex: tontine non payée sur cotisation sociale)
    // - Mettre à jour le statut du membre (dernière cotisation, etc.) dans la table 'members'
    //   -> Cela impliquera des appels à Member.update pour les champs is_new_member, last_annual_inscription_date,
    //      has_paid_adhesion, social_contribution_status, tontine_status, ag_absence_count.

    const transaction = await Transaction.create({
      member_id,
      type,
      amount,
      caisse,
      date,
      details: details ? JSON.parse(details) : null, // Parse 'details' si c'est une chaîne JSON
    });

    res.status(201).json(transaction); // 201 Created pour une création réussie
  } catch (error) {
    console.error('Erreur lors de l\'ajout de la transaction:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout de la transaction', details: error.message });
  }
});

router.delete('/transactions/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Seuls les trésoriers et administrateurs peuvent supprimer des transactions.' });
  }
  try {
    const deletedTransaction = await Transaction.delete(req.params.id);
    if (!deletedTransaction) {
      return res.status(404).json({ error: 'Transaction non trouvée' });
    }
    // TODO: Après la suppression, vous devrez mettre à jour les soldes des caisses
    // et potentiellement le statut financier du membre si la transaction supprimée avait un impact direct.
    // -> Cela impliquera des appels à Member.update pour les champs impactés.
    res.status(204).send(); // 204 No Content pour une suppression réussie sans retour de contenu
  } catch (error) {
    console.error('Erreur lors de la suppression de la transaction:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression de la transaction', details: error.message });
  }
});

// Nouvelle route pour obtenir le statut financier détaillé d'un membre
router.get('/member-status/:memberId', authenticateToken, async (req, res) => {
  // L'accès peut être restreint aux trésoriers et administrateurs
  if (req.user.role !== 'treasurer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit. Seuls les trésoriers et administrateurs peuvent consulter le statut financier des membres.' });
  }

  try {
    const memberId = req.params.memberId;
    const member = await Member.findById(memberId); // Récupérer les informations du membre

    if (!member) {
      return res.status(404).json({ error: 'Membre non trouvé.' });
    }

    const currentYear = new Date().getFullYear();

    // Initialiser le statut financier du membre avec les données de la table 'members'
    // et des valeurs par défaut si les champs JSONB sont null ou vides.
    const memberFinancialStatus = {
      inscriptionStatus: 'Inconnu', // Sera déterminé ci-dessous
      lastAnnualInscriptionDate: member.last_annual_inscription_date,
      socialContributionPaid: member.social_contribution_status?.[currentYear]?.total_paid || 0,
      adhesionPaid: member.has_paid_adhesion || false,
      tontineShares: member.tontine_status?.current_shares || 0,
      tontineUnpaidMonths: member.tontine_status?.unpaid_months || [],
      agAbsenceCount: member.ag_absence_count || 0,
      // Vous pouvez ajouter d'autres champs ici si nécessaire
    };

    // Logique pour déterminer le statut d'inscription
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

    // TODO: Ajoutez ici des alertes ou des vérifications supplémentaires basées sur les données du membre.
    // Ces alertes seront renvoyées au frontend pour affichage.
    // Exemple de vérification pour la cotisation sociale:
    // if (memberFinancialStatus.socialContributionPaid < 50000) {
    //   // Vous pouvez ajouter un tableau d'alertes à l'objet memberFinancialStatus
    //   // ou le gérer directement côté frontend comme nous l'avons fait.
    // }

    res.json(memberFinancialStatus);
  } catch (error) {
    console.error('Erreur lors de la récupération du statut financier du membre:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération du statut financier du membre', details: error.message });
  }
});

module.exports = router;
