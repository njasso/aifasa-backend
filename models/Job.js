// models/Job.js - COMPLET
const { pool } = require('../config/db');

class Job {
  static async findAll() {
    const result = await pool.query(
      "SELECT * FROM jobs WHERE status = 'active' ORDER BY created_at DESC"
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

  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 0;

    if (data.title !== undefined) { paramCount++; fields.push(`title=$${paramCount}`); values.push(data.title); }
    if (data.type !== undefined) { paramCount++; fields.push(`type=$${paramCount}`); values.push(data.type); }
    if (data.organization !== undefined) { paramCount++; fields.push(`organization=$${paramCount}`); values.push(data.organization); }
    if (data.location !== undefined) { paramCount++; fields.push(`location=$${paramCount}`); values.push(data.location); }
    if (data.description !== undefined) { paramCount++; fields.push(`description=$${paramCount}`); values.push(data.description); }
    if (data.contact_email !== undefined) { paramCount++; fields.push(`contact_email=$${paramCount}`); values.push(data.contact_email); }
    if (data.deadline !== undefined) { paramCount++; fields.push(`deadline=$${paramCount}`); values.push(data.deadline); }

    if (fields.length === 0) return null;

    paramCount++;
    values.push(id);

    const result = await pool.query(
      `UPDATE jobs SET ${fields.join(', ')} WHERE id=$${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query("UPDATE jobs SET status = 'inactive' WHERE id = $1", [id]);
  }
}

module.exports = Job;