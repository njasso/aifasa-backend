// routes/projects.js
const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const { authenticateToken, isAdmin } = require('../middleware/auth'); // ✅ CORRIGÉ

// ============ ROUTES PUBLIQUES ============

// GET - Récupérer tous les projets (public)
router.get('/', async (req, res) => {
  try {
    const projects = await Project.findAll();
    res.json(projects);
  } catch (error) {
    console.error('❌ Erreur GET projects:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// GET - Récupérer un projet par ID (public)
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }
    res.json(project);
  } catch (error) {
    console.error('❌ Erreur GET project:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ============ ROUTES ADMIN ============

// POST - Créer un projet (admin uniquement)
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    const {
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles,
      followUps
    } = req.body;

    // Validation
    if (!name || !projectType || !description) {
      return res.status(400).json({ error: 'Les champs name, projectType et description sont requis.' });
    }

    console.log('📝 Création projet:', { name, projectType, budget });

    const newProject = await Project.create({
      name,
      projectType,
      description,
      expectedProduction: expectedProduction || [],
      budget: parseFloat(budget) || 0,
      investmentDetails: investmentDetails || {},
      financialResults: financialResults || [],
      projectResponsibles: projectResponsibles || [],
      followUps: followUps || []
    });

    console.log(`✅ Projet créé ID: ${newProject.id}`);
    res.status(201).json(newProject);
  } catch (error) {
    console.error('❌ Erreur POST project:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// PUT - Mettre à jour un projet (admin uniquement)
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    const {
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles,
      followUps
    } = req.body;

    console.log(`📝 Mise à jour projet ID ${projectId}:`, { name, projectType });

    // Vérifier si le projet existe
    const existingProject = await Project.findById(projectId);
    if (!existingProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const updatedProject = await Project.update(projectId, {
      name: name || existingProject.name,
      projectType: projectType || existingProject.projectType,
      description: description || existingProject.description,
      expectedProduction: expectedProduction || existingProject.expectedProduction,
      budget: parseFloat(budget) || existingProject.budget,
      investmentDetails: investmentDetails || existingProject.investmentDetails,
      financialResults: financialResults || existingProject.financialResults,
      projectResponsibles: projectResponsibles || existingProject.projectResponsibles,
      followUps: followUps || existingProject.followUps
    });

    console.log(`✅ Projet mis à jour ID: ${projectId}`);
    res.json(updatedProject);
  } catch (error) {
    console.error('❌ Erreur PUT project:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

// DELETE - Supprimer un projet (admin uniquement)
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log(`📝 Suppression projet ID: ${projectId}`);

    const deletedProject = await Project.delete(projectId);
    if (!deletedProject) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    console.log(`✅ Projet supprimé ID: ${projectId}`);
    res.status(204).send();
  } catch (error) {
    console.error('❌ Erreur DELETE project:', error.message);
    res.status(500).json({ error: 'Erreur serveur', details: error.message });
  }
});

module.exports = router;