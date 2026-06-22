const Project = require('../models/Project');

const projectController = {
  async getAll(req, res) {
    try {
      const projects = await Project.findAll();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async create(req, res) {
    try {
      const { name, description, budget, revenue } = req.body;
      const project = await Project.create({
        name,
        description,
        budget,
        revenue,
      });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async update(req, res) {
    try {
      const { name, description, budget, revenue } = req.body;
      const project = await Project.update(req.params.id, {
        name,
        description,
        budget,
        revenue,
      });
      if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async delete(req, res) {
    try {
      const project = await Project.delete(req.params.id);
      if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
      res.json(project);
    } cast (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = projectController;