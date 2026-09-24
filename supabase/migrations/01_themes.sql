-- 01_themes.sql
-- Migration pour ajouter le système de thèmes et adapter les trophées

-- 1. Ajout de colonnes de métadonnées à la table achievements existante
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'action', -- 'action', 'collection', 'event', 'secret'
ADD COLUMN IF NOT EXISTS is_implemented BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_theme_unlocker BOOLEAN DEFAULT false;

-- 2. Création de la table source de vérité des thèmes
CREATE TABLE IF NOT EXISTS themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_name VARCHAR NOT NULL UNIQUE,
  display_name VARCHAR NOT NULL,
  
  -- Type de déblocage : 'default' (de base), 'achievement' (lié à un trophée existant), 'collection' (lié au nombre de jeux d'un genre), 'date' (événement saisonnier)
  unlock_type VARCHAR DEFAULT 'achievement', 
  
  -- Conditions spécifiques selon le type
  required_achievement_id_name VARCHAR, -- l'id_name textuel du trophée, pour faciliter le matching sans faire de jointure complexe à l'insertion
  required_item_count INTEGER,          -- ex: 10
  required_genre VARCHAR,               -- ex: 'RPG'
  
  -- Périodes temporelles pour les thèmes 'date'
  date_start VARCHAR, 
  date_end VARCHAR,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Table de jointure pour débloquer les thèmes par utilisateur
CREATE TABLE IF NOT EXISTS user_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  is_equipped BOOLEAN DEFAULT false,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, theme_id)
);

-- Sécurité RLS pour user_themes
ALTER TABLE user_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocked themes"
  ON user_themes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own themes"
  ON user_themes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own themes"
  ON user_themes FOR UPDATE
  USING (auth.uid() = user_id);

-- themes et achievements sont des tables en lecture seule pour le front
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Themes are viewable by everyone" ON themes FOR SELECT USING (true);
