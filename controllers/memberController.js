const Member = require('../models/Member');
// Le module 'cloudinary' n'est plus nécessaire car l'upload est géré côté client.
// const cloudinary = require('../config/cloudinary');

const memberController = {
  // Récupérer tous les membres
  async getAll(req, res) {
    try {
      const members = await Member.findAll();
      res.json(members);
    } catch (error) {
      // Afficher l'erreur en console pour le débogage et envoyer une réponse générique.
      console.error('Erreur lors de la récupération des membres:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Créer un nouveau membre avec les URLs de photo et de CV
  async create(req, res) {
    try {
      // Le front-end envoie maintenant les URLs Cloudinary directement dans le corps de la requête.
      const { name, email, phone, profession, photo_url, cv_url } = req.body;

      // Création du membre avec les URLs reçues.
      const member = await Member.create({
        name,
        email,
        phone,
        profession,
        photo_url,
        cv_url,
      });

      res.status(201).json(member);
    } catch (error) {
      console.error('Erreur lors de la création du membre:', error);
      res.status(500).json({ error: 'Erreur lors de la création du membre' });
    }
  },

  // Mettre à jour un membre existant avec photo et/ou CV
  async update(req, res) {
    try {
      const { name, email, phone, profession, photo_url, cv_url } = req.body;
      const memberId = req.params.id;

      // La logique de mise à jour côté front-end s'assure que les URLs existantes sont envoyées
      // si un fichier n'est pas mis à jour. Nous pouvons donc utiliser directement les
      // valeurs du corps de la requête.

      const updatedMember = await Member.update(memberId, {
        name,
        email,
        phone,
        profession,
        photo_url,
        cv_url,
      });

      if (!updatedMember) return res.status(404).json({ error: 'Membre non trouvé' });
      res.json(updatedMember);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du membre:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Supprimer un membre
  async delete(req, res) {
    try {
      const member = await Member.delete(req.params.id);
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
      res.json(member);
    } catch (error) {
      console.error('Erreur lors de la suppression du membre:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = memberController;
