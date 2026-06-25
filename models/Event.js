// models/Event.js
const { pool } = require('../config/db');

class Event {
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM events ORDER BY event_date DESC'
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { title, type, event_date, time, location, description, image_url, participants, status } = data;
    const result = await pool.query(
      `INSERT INTO events (title, type, event_date, time, location, description, image_url, participants, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, type, event_date, time, location, description, image_url, participants || 0, status || 'upcoming']
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const result = await pool.query(
      `UPDATE events SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  static async delete(id) {
    await pool.query('DELETE FROM events WHERE id = $1', [id]);
  }
}

module.exports = Event;