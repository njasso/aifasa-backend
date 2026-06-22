// models/Document.js
const { pool } = require('../config/db'); // ✅ CORRIGÉ

const Document = {
  async create({ title, type, file_url, public_id }) {
    const query = `
      INSERT INTO documents (title, type, file_url, public_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, type, file_url, public_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT * FROM documents ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM documents WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, { title, type, file_url, public_id }) {
    const query = `
      UPDATE documents 
      SET title = $1, type = $2, file_url = $3, public_id = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *;
    `;
    const values = [title, type, file_url, public_id, id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM documents WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = Document;