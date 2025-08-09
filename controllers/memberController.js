const Member = require('../models/Member');
const cloudinary = require('../config/cloudinary');

const memberController = {
  // Récupérer tous les membres
  async getAll(req, res) {
    try {
      const members = await Member.findAll();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  // Créer un nouveau membre avec photo et CV
  async create(req, res) {
    try {
      // Récupération des données du corps de la requête
      const { name, email, phone, profession } = req.body;

      // Utilisation de req.files pour gérer plusieurs fichiers
      // On vérifie si les fichiers existent avant de les uploader
      let photo_url = null;
      let cv_url = null;

      // Upload de la photo de profil si elle existe
      if (req.files && req.files.photo) {
        const result = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: 'members',
        });
        photo_url = result.secure_url;
      }

      // Upload du CV si il existe
      if (req.files && req.files.cv) {
        const result = await cloudinary.uploader.upload(req.files.cv[0].path, {
          folder: 'cvs',
        });
        cv_url = result.secure_url;
      }

      // Création du membre avec les URLs de la photo et du CV
      const member = await Member.create({
        name,
        email,
        phone,
        profession,
        photo_url, // Sauvegarde de l'URL de la photo
        cv_url,     // Sauvegarde de l'URL du CV
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
      const { name, email, phone, profession } = req.body;
      const memberId = req.params.id;

      // On récupère les URLs existantes pour éviter de les effacer si les fichiers ne sont pas mis à jour
      const existingMember = await Member.findById(memberId);
      let photo_url = existingMember.photo_url;
      let cv_url = existingMember.cv_url;

      // Upload de la nouvelle photo de profil si elle est fournie
      if (req.files && req.files.photo) {
        const result = await cloudinary.uploader.upload(req.files.photo[0].path, {
          folder: 'members',
        });
        photo_url = result.secure_url;
      }
      
      // Upload du nouveau CV si il est fourni
      if (req.files && req.files.cv) {
        const result = await cloudinary.uploader.upload(req.files.cv[0].path, {
          folder: 'cvs',
        });
        cv_url = result.secure_url;
      }

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
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },
};

module.exports = memberController;
