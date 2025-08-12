const pool = require('../config/db');

const GalleryMedia = {
  /**
   * Crée un nouveau média dans la base de données.
   * @param {object} mediaData - Les données du média à créer.
   * @param {string} mediaData.title - Le titre du média.
   * @param {string} mediaData.category - La catégorie du média.
   * @param {string} mediaData.file_url - L'URL du fichier sur Cloudinary.
   * @param {string} mediaData.file_type - Le type MIME du fichier (ex: 'image/jpeg', 'video/mp4').
   * @param {string} mediaData.public_id - L'ID public du fichier sur Cloudinary.
   * @returns {Promise<object>} Le média nouvellement créé.
   */
  async create({ title, category, file_url, file_type, public_id }) {
    const query = `
      INSERT INTO gallery_media (title, category, file_url, file_type, public_id, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [title, category, file_url, file_type, public_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Récupère tous les médias de la base de données.
   * @returns {Promise<Array>} Un tableau de tous les médias, triés par date de création décroissante.
   */
  async findAll() {
    const query = 'SELECT * FROM gallery_media ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Trouve un média par son identifiant.
   * @param {number} id - L'ID du média.
   * @returns {Promise<object|null>} Le média trouvé ou null s'il n'existe pas.
   */
  async findById(id) {
    const query = 'SELECT * FROM gallery_media WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  /**
   * Supprime un média par son identifiant.
   * @param {number} id - L'ID du média à supprimer.
   * @returns {Promise<object|null>} Le média supprimé ou null s'il n'a pas été trouvé.
   */
  async delete(id) {
    const query = 'DELETE FROM gallery_media WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = GalleryMedia;
