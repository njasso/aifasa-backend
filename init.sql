CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('member', 'treasurer', 'admin'))
);

CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  file_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  profession VARCHAR(255),
  photo_url VARCHAR(255)
);

CREATE TABLE treasury (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  type VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  caisse VARCHAR(100) NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(10, 2),
  revenue DECIMAL(10, 2)
);

CREATE TABLE gallery (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  image_url VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insérer un utilisateur admin pour tester
INSERT INTO users (email, password, role) VALUES ('admin@association.com', 'admin123', 'admin');