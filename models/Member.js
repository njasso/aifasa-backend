const pool = require('../config/db');

const Member = {
  // Méthode pour créer un nouveau membre
  async create({
    firstName,
    lastName,
    sex,
    location,
    address,
    contact,
    profession,
    employmentStructure,
    companyOrProject,
    activities,
    role,
    photo_url,
    public_id,
    cv_url,
    cv_public_id,
    is_new_member = true,
    last_annual_inscription_date = null,
    has_paid_adhesion = false,
    social_contribution_status = {},
    tontine_status = {},
    ag_absence_count = 0
  }) {
    const query = `
      INSERT INTO members (
        first_name, last_name, sex, location, address, contact,
        profession, employment_structure, company_or_project, activities, role,
        photo_url, public_id, cv_url, cv_public_id, created_at,
        is_new_member, last_annual_inscription_date, has_paid_adhesion,
        social_contribution_status, tontine_status, ag_absence_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP,
                $16, $17, $18, $19, $20, $21)
      RETURNING *;
    `;
    const values = [
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url, public_id, cv_url, cv_public_id,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Méthode pour trouver tous les membres
  async findAll() {
    const query = 'SELECT * FROM members ORDER BY last_name, first_name;';
    const result = await pool.query(query);
    return result.rows;
  },

  // Méthode pour trouver un membre par son ID
  async findById(id) {
    const query = 'SELECT * FROM members WHERE id = $1;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  // Méthode pour mettre à jour un membre
  async update(id, {
    firstName,
    lastName,
    sex,
    location,
    address,
    contact,
    profession,
    employmentStructure,
    companyOrProject,
    activities,
    role,
    photo_url,
    public_id,
    cv_url,
    cv_public_id,
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
        sex = COALESCE($3, sex),
        location = COALESCE($4, location),
        address = COALESCE($5, address),
        contact = COALESCE($6, contact),
        profession = COALESCE($7, profession),
        employment_structure = COALESCE($8, employment_structure),
        company_or_project = COALESCE($9, company_or_project),
        activities = COALESCE($10, activities),
        role = COALESCE($11, role),
        photo_url = COALESCE($12, photo_url),
        public_id = COALESCE($13, public_id),
        cv_url = COALESCE($14, cv_url),
        cv_public_id = COALESCE($15, cv_public_id),
        is_new_member = COALESCE($16, is_new_member),
        last_annual_inscription_date = COALESCE($17, last_annual_inscription_date),
        has_paid_adhesion = COALESCE($18, has_paid_adhesion),
        social_contribution_status = COALESCE($19, social_contribution_status),
        tontine_status = COALESCE($20, tontine_status),
        ag_absence_count = COALESCE($21, ag_absence_count),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *;
    `;
    const values = [
      firstName, lastName, sex, location, address, contact,
      profession, employmentStructure, companyOrProject, activities, role,
      photo_url, public_id, cv_url, cv_public_id,
      is_new_member, last_annual_inscription_date, has_paid_adhesion,
      social_contribution_status, tontine_status, ag_absence_count,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  // Méthode pour supprimer un membre
  async delete(id) {
    const query = 'DELETE FROM members WHERE id = $1 RETURNING *;';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },
};

module.exports = Member;
