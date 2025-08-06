const express = require('express');
const router = express.Router();
const Project = require('../models/Project'); // Assurez-vous que ce chemin est correct
const authenticateToken = require('../middleware/auth'); // Assurez-vous que ce chemin est correct

// Route pour récupérer tous les projets
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (error) {
    console.error('Erreur lors de la récupération des projets:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des projets', details: error.message });
  }
});

// Route pour ajouter un nouveau projet (admin seulement)
router.post('/', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    // Récupération de tous les champs du corps de la requête
    // Ces noms de champs doivent correspondre à ceux envoyés par le frontend
    const {
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles, // Nouveau: Responsables du projet (ajouté)
      followUps
    } = req.body;

    // Création du projet en base de données
    const newProject = await Project.create({
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles, // Passage de la nouvelle colonne
      followUps
    });

    console.log('Projet créé en base de données:', newProject);
    res.status(201).json(newProject); // 201 Created pour une création réussie

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de l\'ajout du projet:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de l\'ajout du projet', details: error.message });
  }
});

// Route pour mettre à jour un projet (admin seulement)
router.put('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    const projectId = req.params.id;
    // Récupération de tous les champs du corps de la requête
    // Ces noms de champs doivent correspondre à ceux envoyés par le frontend
    const {
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles, // Nouveau: Responsables du projet (ajouté)
      followUps
    } = req.body;

    // Mise à jour du projet en base de données
    const updatedProject = await Project.update(projectId, {
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles, // Passage de la nouvelle colonne
      followUps
    });

    if (!updatedProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    console.log('Projet mis à jour en base de données:', updatedProject);
    res.json(updatedProject);

  } catch (error) {
    console.error('ERREUR DÉTAILLÉE lors de la mise à jour du projet:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la mise à jour du projet', details: error.message });
  }
});

// Route pour supprimer un projet (admin seulement)
router.delete('/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accès interdit' });
  }

  try {
    const deletedProject = await Project.delete(req.params.id);

    if (!deletedProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    console.log('Projet supprimé de la base de données:', req.params.id);
    res.status(204).send(); // 204 No Content pour une suppression réussie sans retour de contenu

  } catch (error) {
    console.error('Erreur lors de la suppression du projet:', error.message);
    console.error('Stack Trace:', error.stack);
    res.status(500).json({ error: 'Erreur serveur lors de la suppression du projet', details: error.message });
  }
});

module.exports = router;
