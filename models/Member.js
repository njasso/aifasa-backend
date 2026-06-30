// models/Member.js
const { pool } = require('../config/db');

const Member = {
  // ✅ CREATE - Mapper les champs vers snake_case
  async create({
    first_name,           // ✅ reçu du backend
    last_name,            // ✅ reçu du backend
    phone_number,
    sex,
    location,
    address,
    contact,
    profession,
    employment_structure,
    company_or_project,
    activities,
    role,
    photo_url,
    public_id,
    cv_url,
    cv_public_id,
    user_id = null,
    is_new_member = true,
    last_annual_inscription_date = null,
    has_paid_adhesion = false,
    social_contribution_status = {},
    tontine_status = {},
    ag_absence_count = 0
  }) {
    const query = `
      INSERT INTO members (
        first_name, last_name, phone_number, sex, location, address, contact,
        profession, employment_structure, company_or_project, activities, role,
        photo_url, public_id, cv_url, cv_public_id, user_id, created_at,
        is_new_member, last_annual_inscription_date, has_paid_adhesion,
        social_contribution_status, tontine_status, ag_absence_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP,
                $18, $19, $20, $21, $22, $23)
      RETURNING *;
    `;
    const values = [
      first_name, last_name, phone_number, sex, location, address, contact,
      profession, employment_structure, company_or_project, activities, role,
      photo_url, public_id, cv_url, cv_public_id, user_id,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // ✅ FIND BY USER_ID (compte de connexion lié) - pour l'espace "Mon Profil"
  async findByUserId(userId) {
    const query = 'SELECT * FROM members WHERE user_id = $1;';
    const result = await pool.query(query, [userId]);
    return result.rows[0];
  },

  // ✅ FIND ALL
  async findAll() {
    const query = 'SELECT * FROM members ORDER BY last_name, first_name;';
    const result = await pool.query(query);
    return result.rows;
  },

  // ✅ FIND BY ID
  async findById(id) {
    const query = 'SELECT * FROM members WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // ✅ Récupère l'email du compte de connexion lié (admin uniquement, jamais exposé publiquement)
  async getLinkedAccountEmail(memberId) {
    const query = `
      SELECT u.email
      FROM members m
      JOIN users u ON u.id = m.user_id
      WHERE m.id = $1;
    `;
    const result = await pool.query(query, [memberId]);
    return result.rows[0]?.email || null;
  },

  // ✅ UPDATE - Mapper les champs vers snake_case
  async update(id, {
    first_name,
    last_name,
    phone_number,
    sex,
    location,
    address,
    contact,
    profession,
    employment_structure,
    company_or_project,
    activities,
    role,
    photo_url,
    public_id,
    cv_url,
    cv_public_id,
    user_id,
    is_new_member,
    last_annual_inscription_date,
    has_paid_adhesion,
    social_contribution_status,
    tontine_status,
    ag_absence_count
  }) {
    const query = `
      UPDATE members
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone_number = COALESCE($3, phone_number),
        sex = COALESCE($4, sex),
        location = COALESCE($5, location),
        address = COALESCE($6, address),
        contact = COALESCE($7, contact),
        profession = COALESCE($8, profession),
        employment_structure = COALESCE($9, employment_structure),
        company_or_project = COALESCE($10, company_or_project),
        activities = COALESCE($11, activities),
        role = COALESCE($12, role),
        photo_url = COALESCE($13, photo_url),
        public_id = COALESCE($14, public_id),
        cv_url = COALESCE($15, cv_url),
        cv_public_id = COALESCE($16, cv_public_id),
        user_id = COALESCE($17, user_id),
        is_new_member = COALESCE($18, is_new_member),
        last_annual_inscription_date = COALESCE($19, last_annual_inscription_date),
        has_paid_adhesion = COALESCE($20, has_paid_adhesion),
        social_contribution_status = COALESCE($21, social_contribution_status),
        tontine_status = COALESCE($22, tontine_status),
        ag_absence_count = COALESCE($23, ag_absence_count),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $24
      RETURNING *;
    `;
    const values = [
      first_name, last_name, phone_number, sex, location, address, contact,
      profession, employment_structure, company_or_project, activities, role,
      photo_url, public_id, cv_url, cv_public_id, user_id,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // ✅ DELETE
  async delete(id) {
    const query = 'DELETE FROM members WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

module.exports = Member;