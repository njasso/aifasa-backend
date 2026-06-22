// routes/dashboard.js
const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============ STATISTIQUES GÉNÉRALES (Optimisé avec Promise.all) ============
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdminOrTreasurer = req.user.role === 'admin' || req.user.role === 'treasurer';
    const isMemberOrAdmin = req.user.role === 'member' || req.user.role === 'admin';
    
    // ✅ Parallélisation de toutes les requêtes indépendantes
    const [
      membersResult,
      docsResult,
      projectsResult,
      galleryResult,
      pubResult,
      transResult,
      contribResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM members'),
      pool.query('SELECT COUNT(*) FROM documents'),
      pool.query('SELECT COUNT(*) FROM projects'),
      pool.query('SELECT COUNT(*) FROM gallery_images'),
      pool.query("SELECT COUNT(*) FROM publications WHERE status = 'published'"),
      isAdminOrTreasurer 
        ? pool.query('SELECT COUNT(*) FROM transactions')
        : Promise.resolve({ rows: [{ count: '0' }] }),
      isMemberOrAdmin
        ? pool.query(
            'SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE member_id = $1 AND type IN ($2, $3)',
            [userId, 'cotisation_sociale', 'inscription_ancien']
          )
        : Promise.resolve({ rows: [{ coalesce: '0' }] })
    ]);

    const stats = {
      members: parseInt(membersResult.rows[0].count),
      documents: parseInt(docsResult.rows[0].count),
      projects: parseInt(projectsResult.rows[0].count),
      gallery: parseInt(galleryResult.rows[0].count),
      publications: parseInt(pubResult.rows[0].count),
      transactions: parseInt(transResult.rows[0].count),
      myContributions: parseInt(contribResult.rows[0].coalesce) || 0
    };

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur GET /dashboard/stats:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ACTIVITÉ RÉCENTE (Optimisé avec Promise.all) ============
router.get('/activity', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const isAdminOrTreasurer = req.user.role === 'admin' || req.user.role === 'treasurer';
    
    // ✅ Parallélisation de toutes les requêtes
    const [
      membersResult,
      docsResult,
      projectsResult,
      pubResult,
      galleryResult,
      transResult
    ] = await Promise.all([
      pool.query(
        `SELECT id, first_name, last_name, created_at 
         FROM members 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT id, title, created_at 
         FROM documents 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT id, name, created_at 
         FROM projects 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT id, title, created_at 
         FROM publications 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      ),
      pool.query(
        `SELECT id, title, created_at 
         FROM gallery_images 
         ORDER BY created_at DESC 
         LIMIT $1`,
        [limit]
      ),
      isAdminOrTreasurer
        ? pool.query(
            `SELECT t.id, t.type, t.amount, t.created_at, 
                    m.first_name, m.last_name
             FROM transactions t
             LEFT JOIN members m ON t.member_id = m.id
             ORDER BY t.created_at DESC 
             LIMIT $1`,
            [limit]
          )
        : Promise.resolve({ rows: [] })
    ]);

    const activities = [];

    // Traiter les membres
    membersResult.rows.forEach(row => {
      const name = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Membre';
      activities.push({
        id: `member_${row.id}`,
        action: `Nouveau membre: ${name}`,
        user: name,
        time: new Date(row.created_at).toLocaleDateString('fr-FR'),
        type: 'member'
      });
    });

    // Traiter les documents
    docsResult.rows.forEach(row => {
      activities.push({
        id: `doc_${row.id}`,
        action: `Document ajouté: ${row.title}`,
        user: 'Administrateur',
        time: new Date(row.created_at).toLocaleDateString('fr-FR'),
        type: 'document'
      });
    });

    // Traiter les projets
    projectsResult.rows.forEach(row => {
      activities.push({
        id: `project_${row.id}`,
        action: `Nouveau projet: ${row.name}`,
        user: 'Administrateur',
        time: new Date(row.created_at).toLocaleDateString('fr-FR'),
        type: 'project'
      });
    });

    // Traiter les publications
    pubResult.rows.forEach(row => {
      activities.push({
        id: `pub_${row.id}`,
        action: `Nouvelle publication: ${row.title}`,
        user: 'Administrateur',
        time: new Date(row.created_at).toLocaleDateString('fr-FR'),
        type: 'publication'
      });
    });

    // Traiter la galerie
    galleryResult.rows.forEach(row => {
      activities.push({
        id: `gallery_${row.id}`,
        action: `Nouvelle image: ${row.title}`,
        user: 'Administrateur',
        time: new Date(row.created_at).toLocaleDateString('fr-FR'),
        type: 'gallery'
      });
    });

    // Traiter les transactions (si admin/trésorier)
    if (isAdminOrTreasurer) {
      transResult.rows.forEach(row => {
        const memberName = row.first_name && row.last_name 
          ? `${row.first_name} ${row.last_name}` 
          : 'Membre inconnu';
        activities.push({
          id: `trans_${row.id}`,
          action: `Transaction de ${parseFloat(row.amount).toLocaleString()} FCFA - ${row.type}`,
          user: memberName,
          time: new Date(row.created_at).toLocaleDateString('fr-FR'),
          type: 'transaction'
        });
      });
    }

    // ✅ Trier par date et limiter
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, limit);

    res.json(limitedActivities);
  } catch (error) {
    console.error('❌ Erreur GET /dashboard/activity:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ STATISTIQUES ADMIN (Optimisé avec Promise.all) ============
router.get('/admin/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    // ✅ Parallélisation de toutes les requêtes
    const [
      usersResult,
      docsResult,
      projectsResult,
      transResult,
      galleryResult,
      pubResult,
      financeResult
    ] = await Promise.all([
      pool.query(`SELECT role, COUNT(*) as count FROM users GROUP BY role`),
      pool.query(`SELECT type, COUNT(*) as count FROM documents GROUP BY type`),
      pool.query(`SELECT project_type, COUNT(*) as count FROM projects GROUP BY project_type`),
      pool.query(`SELECT type, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM transactions GROUP BY type`),
      pool.query(`SELECT COUNT(*) FROM gallery_images`),
      pool.query(`SELECT status, COUNT(*) as count FROM publications GROUP BY status`),
      pool.query(`
        SELECT 
          COALESCE(SUM(CASE WHEN caisse = 'budget_association' THEN amount ELSE 0 END), 0) as budget,
          COALESCE(SUM(CASE WHEN caisse = 'compte_cotisation_sociale' THEN amount ELSE 0 END), 0) as social,
          COALESCE(SUM(CASE WHEN caisse = 'tontine_account' THEN amount ELSE 0 END), 0) as tontine
        FROM transactions
      `)
    ]);

    const stats = {
      users: { total: 0, admins: 0, members: 0, treasurers: 0 },
      documents: { total: 0, byType: {} },
      projects: { total: 0, byType: {} },
      transactions: { total: 0, totalAmount: 0, byType: {} },
      gallery: { total: 0 },
      publications: { total: 0, byStatus: {} },
      finances: {
        associationBudget: 0,
        socialContributionAccount: 0,
        tontineAccount: 0
      }
    };

    // Traiter les utilisateurs
    usersResult.rows.forEach(row => {
      stats.users.total += parseInt(row.count);
      if (row.role === 'admin') stats.users.admins = parseInt(row.count);
      else if (row.role === 'treasurer') stats.users.treasurers = parseInt(row.count);
      else stats.users.members += parseInt(row.count);
    });

    // Traiter les documents
    docsResult.rows.forEach(row => {
      stats.documents.total += parseInt(row.count);
      stats.documents.byType[row.type] = parseInt(row.count);
    });

    // Traiter les projets
    projectsResult.rows.forEach(row => {
      stats.projects.total += parseInt(row.count);
      stats.projects.byType[row.project_type] = parseInt(row.count);
    });

    // Traiter les transactions
    transResult.rows.forEach(row => {
      stats.transactions.total += parseInt(row.count);
      stats.transactions.totalAmount += parseFloat(row.total) || 0;
      stats.transactions.byType[row.type] = {
        count: parseInt(row.count),
        amount: parseFloat(row.total) || 0
      };
    });

    stats.gallery.total = parseInt(galleryResult.rows[0].count);

    // Traiter les publications
    pubResult.rows.forEach(row => {
      stats.publications.total += parseInt(row.count);
      stats.publications.byStatus[row.status] = parseInt(row.count);
    });

    // Traiter les finances
    if (financeResult.rows[0]) {
      stats.finances.associationBudget = parseFloat(financeResult.rows[0].budget) || 0;
      stats.finances.socialContributionAccount = parseFloat(financeResult.rows[0].social) || 0;
      stats.finances.tontineAccount = parseFloat(financeResult.rows[0].tontine) || 0;
    }

    res.json(stats);
  } catch (error) {
    console.error('❌ Erreur GET /dashboard/admin/stats:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;