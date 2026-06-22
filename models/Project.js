// models/Project.js
const { pool } = require('../config/db'); // ✅ CORRIGÉ

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
    followUps
  }) {
    const query = `
      INSERT INTO projects (
        name, project_type, description, expected_production, budget,
        investment_details, financial_results, project_responsibles, follow_ups, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *;
    `;
    const values = [
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles,
      followUps
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
    followUps
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *;
    `;
    const values = [
      name,
      projectType,
      description,
      expectedProduction,
      budget,
      investmentDetails,
      financialResults,
      projectResponsibles,
      followUps,
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
};

module.exports = Project;