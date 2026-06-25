// models/ForumReply.js
const { pool } = require('../config/db');

class ForumReply {
  static async findByTopic(topicId) {
    const result = await pool.query(
      'SELECT * FROM forum_replies WHERE topic_id = $1 ORDER BY created_at ASC',
      [topicId]
    );
    return result.rows;
  }

  static async create(data) {
    const { topic_id, content, author_id, author_name } = data;
    const result = await pool.query(
      `INSERT INTO forum_replies (topic_id, content, author_id, author_name) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [topic_id, content, author_id, author_name]
    );
    return result.rows[0];
  }

  static async like(id) {
    await pool.query('UPDATE forum_replies SET likes = likes + 1 WHERE id = $1', [id]);
  }
}

module.exports = ForumReply;