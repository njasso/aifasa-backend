# Backend - Plateforme de Gestion de l'Association

## Description
Ce dossier contient le backend de la plateforme de gestion pour l'association des ingénieurs agronomes, forestiers et halieutes. Il utilise Node.js avec Express.js, PostgreSQL pour la base de données, et Cloudinary pour le stockage des fichiers.

## Structure
- `config/` : Configurations pour la base de données et Cloudinary.
- `models/` : Modèles de données pour PostgreSQL.
- `routes/` : Routes API pour chaque fonctionnalité.
- `controllers/` : Logique métier pour chaque module.
- `middleware/` : Middlewares pour l'authentification et l'upload.
- `utils/` : Fonctions utilitaires (ex. : calculs financiers).

## Installation
1. Installez les dépendances :
   ```bash
   npm install
   ```
2. Configurez les variables d'environnement dans `.env` :
   - `DATABASE_URL` : URL de connexion à PostgreSQL.
   - `JWT_SECRET` : Clé secrète pour JWT.
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` : Credentials Cloudinary.
3. Créez la base de données PostgreSQL avec les tables nécessaires.
4. Lancez le serveur :
   ```bash
   npm start
   ```

## Endpoints
- `/api/documents` : Gestion des documents (statuts, règlements, etc.).
- `/api/members` : Gestion des profils des membres.
- `/api/treasury` : Gestion des transactions financières.
- `/api/projects` : Gestion des projets AGR.
- `/api/gallery` : Gestion de la galerie d'images.
- `/api/auth` : Authentification (login, utilisateur courant).

## Base de données
Créez les tables suivantes dans PostgreSQL :
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  file_url TEXT NOT NULL
);

CREATE TABLE members (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  photo_url TEXT,
  profession VARCHAR(255)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  member_id INTEGER REFERENCES members(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  caisse VARCHAR(50) NOT NULL,
  date DATE NOT NULL
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(10, 2),
  revenue DECIMAL(10, 2)
);

CREATE TABLE gallery_images (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  image_url TEXT NOT NULL
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL
);
```