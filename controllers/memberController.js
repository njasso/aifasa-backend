const Member = require('../models/Member');
const cloudinary = require('../config/cloudinary');

const memberController = {
  async getAll(req, res) {
    try {
      const members = await Member.findAll();
      res.json(members);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

  async create(req, res) {
    try {
      const { name, email, phone, profession } = req.body;
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'members',
      });
      const member = await Member.create({
        name,
        email,
        phone,
        photo_url: result.secure_url,
        profession,
      });
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
  },

  async update(req, res) {
    try {
      const { name, email, phone, profession } = req.body;
      let photo_url = req.body.photo_url;
      if (req.file) {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'members',
        });
        photo_url = result.secure_url;
      }
      const member = await Member.update(req.params.id, {
        name,
        email,
        phone,
        photo_url,
        profession,
      });
      if (!member) return res.status(404).json({ error: 'Membre non trouvé' });
      res.json(member);
    } catch (error) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  },

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