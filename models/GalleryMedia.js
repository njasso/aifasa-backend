// models/GalleryMedia.js
const { pool } = require('../config/db');

const GalleryMedia = {
  async create({ title, category, image_url, public_id }) {
    const query = `
      INSERT INTO gallery_images (title, category, image_url, public_id, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [title, category, image_url, public_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT * FROM gallery_images ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM gallery_images WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM gallery_images WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = GalleryMedia;