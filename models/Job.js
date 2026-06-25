// models/Job.js
const { pool } = require('../config/db');

class Job {
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE status = $1 ORDER BY created_at DESC',
      ['active']
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { title, type, organization, location, description, contact_email, deadline } = data;
    const result = await pool.query(
      `INSERT INTO jobs (title, type, organization, location, description, contact_email, deadline) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title, type, organization, location, description, contact_email, deadline]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('UPDATE jobs SET status = $1 WHERE id = $2', ['inactive', id]);
  }
}

module.exports = Job;