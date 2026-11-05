-- 02_achievements_icon.sql
-- Ajout de la colonne optionnelle icon à la table achievements si elle n'existe pas déjà
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS icon VARCHAR DEFAULT '🏆';

