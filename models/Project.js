// models/Project.js
const { pool } = require('../config/db');

const Project = {
  async create({
    name,
    projectType,
    description,
    expectedProduction,
    budget,
    investmentDetails,
    financialResults,
    projectResponsibles,
    followUps,
    status = 'actif',
    startDate = null
  }) {
    const query = `
      INSERT INTO projects (
        name, project_type, description, expected_production, budget,
        investment_details, financial_results, project_responsibles, follow_ups,
        status, start_date, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [
      name,
      projectType,
      description,
      expectedProduction || [],
      parseFloat(budget) || 0,
      investmentDetails || {},
      financialResults || [],
      projectResponsibles || [],
      followUps || [],
      status,
      startDate
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async findAll() {
    const query = 'SELECT * FROM projects ORDER BY created_at DESC;';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM projects WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async update(id, {
    name,
    projectType,
    description,
    expectedProduction,
    budget,
    investmentDetails,
    financialResults,
    projectResponsibles,
    followUps,
    status,
    startDate
  }) {
    const query = `
      UPDATE projects
      SET
        name = $1,
        project_type = $2,
        description = $3,
        expected_production = $4,
        budget = $5,
        investment_details = $6,
        financial_results = $7,
        project_responsibles = $8,
        follow_ups = $9,
        status = $10,
        start_date = $11,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $12
      RETURNING *;
    `;
    const values = [
      name,
      projectType,
      description,
      expectedProduction || [],
      parseFloat(budget) || 0,
      investmentDetails || {},
      financialResults || [],
      projectResponsibles || [],
      followUps || [],
      status || 'actif',
      startDate || null,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM projects WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Méthodes supplémentaires utiles
  async findByType(projectType) {
    const query = 'SELECT * FROM projects WHERE project_type = $1 ORDER BY created_at DESC;';
    const result = await pool.query(query, [projectType]);
    return result.rows;
  },

  async findByStatus(status) {
    const query = 'SELECT * FROM projects WHERE status = $1 ORDER BY created_at DESC;';
    const result = await pool.query(query, [status]);
    return result.rows;
  },

  async getStats() {
    const query = `
      SELECT 
        COUNT(*) as total,
        SUM(budget) as total_budget,
        AVG(budget) as avg_budget,
        COUNT(CASE WHEN status = 'actif' THEN 1 END) as actif_count,
        COUNT(CASE WHEN status = 'en_cours' THEN 1 END) as en_cours_count,
        COUNT(CASE WHEN status = 'suspendu' THEN 1 END) as suspendu_count,
        COUNT(CASE WHEN status = 'terminé' THEN 1 END) as termine_count
      FROM projects;
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
};

module.exports = Project;