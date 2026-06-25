// models/ForumTopic.js
const { pool } = require('../config/db');

class ForumTopic {
  static async findAll() {
    const result = await pool.query(
      'SELECT * FROM forum_topics ORDER BY pinned DESC, last_reply DESC'
    );
    return result.rows;
  }

  static async findByCategory(categoryId) {
    const result = await pool.query(
      'SELECT * FROM forum_topics WHERE category_id = $1 ORDER BY pinned DESC, last_reply DESC',
      [categoryId]
    );
    return result.rows;
  }

  static async findById(id) {
    const result = await pool.query('SELECT * FROM forum_topics WHERE id = $1', [id]);
    return result.rows[0];
  }

  static async create(data) {
    const { category_id, title, content, author_id, author_name } = data;
    const result = await pool.query(
      `INSERT INTO forum_topics (category_id, title, content, author_id, author_name) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [category_id, title, content, author_id, author_name]
    );
    return result.rows[0];
  }

  static async incrementViews(id) {
    await pool.query('UPDATE forum_topics SET views = views + 1 WHERE id = $1', [id]);
  }

  static async updateReplyCount(id) {
    await pool.query(
      `UPDATE forum_topics SET replies = (SELECT COUNT(*) FROM forum_replies WHERE topic_id = $1), 
       last_reply = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }
}

module.exports = ForumTopic;