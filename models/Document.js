const pool = require('../config/db');

const Document = {
  // Méthode pour créer un nouveau document en base de données
  async create({ title, type, file_url, public_id }) { // <-- public_id ajouté ici
    const query = `
      INSERT INTO documents (title, type, file_url, public_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const values = [title, type, file_url, public_id]; // <-- public_id ajouté ici
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Méthode pour trouver tous les documents
  async findAll() {
    const query = 'SELECT * FROM documents ORDER BY created_at DESC;'; // Ajout d'un tri
    const result = await pool.query(query);
    return result.rows;
  },

  // Méthode pour trouver un document par son ID
  async findById(id) {
    const query = 'SELECT * FROM documents WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Méthode pour supprimer un document par son ID
  async delete(id) {
    const query = 'DELETE FROM documents WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0]; // Retourne le document supprimé
  },
};

module.exports = Document;