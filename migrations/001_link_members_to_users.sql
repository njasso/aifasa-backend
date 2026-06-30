-- migrations/001_link_members_to_users.sql
-- Ajoute le lien entre un compte de connexion (table `users`) et sa fiche
-- annuaire (table `members`), nécessaire pour permettre à un membre de
-- consulter/modifier sa propre fiche et de changer son mot de passe.
--
-- À exécuter une fois sur la base existante, par exemple :
--   psql -U <user> -d <db> -f migrations/001_link_members_to_users.sql

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_members_user_id ON members(user_id);

-- Note : cette colonne est nullable. Tant qu'un membre n'est pas relié à un
-- compte (via le champ "Email du compte lié" dans le formulaire admin de
-- l'annuaire), il ne pourra pas utiliser "Mon Profil" en libre-service —
-- l'admin devra faire ce lien manuellement pour les membres existants.
