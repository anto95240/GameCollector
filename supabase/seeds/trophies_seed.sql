-- Seed pour les Trophées (achievements) de GameCollector

INSERT INTO achievements (id_name, title, description, icon, category, rarity, is_implemented, is_theme_unlocker)
VALUES
  -- 1. Action Trophies (Déjà implémentés ou basiques)
  ('spider_web', 'Spider-Sense', 'Faire 10 clics très rapides n''importe où.', '🕸️', 'action', 'bronze', true, true),
  ('appel_maison', 'Appel Maison', 'Cliquer sur le logo de l''application depuis le Dashboard.', '👽', 'action', 'bronze', true, true),
  ('agent_secret', 'Agent Secret', 'Se connecter à l''application depuis un mobile.', '🕶️', 'action', 'or', true, true),
  ('rage_quit', 'Rage Quit', 'Supprimer un jeu de sa collection.', '💥', 'action', 'bronze', true, true),
  
  -- 2. Collection Trophies (Liés au contenu)
  ('cozy_farmer', 'Cozy Farmer', 'Ajouter 5 jeux de simulation de ferme/cozy.', '🧑‍🌾', 'collection', 'argent', false, true),
  ('tycoon_master', 'Tycoon Master', 'Ajouter 5 jeux de gestion/tycoon.', '💼', 'collection', 'argent', false, true),
  ('zookeeper', 'Zookeeper', 'Ajouter 5 jeux avec des animaux/zoos.', '🦁', 'collection', 'bronze', false, true),
  ('city_mayor', 'Maire de la Ville', 'Ajouter 5 jeux de city-builder.', '🏙️', 'collection', 'argent', false, true),
  ('mon_precieux', 'Mon Précieux', 'Ajouter un jeu valant plus de 100€ (ou édition collector).', '💍', 'collection', 'or', false, true),
  ('coup_de_foudre', 'Coup de Foudre', 'Mettre la note de 20/20 à 5 jeux différents.', '⚡', 'collection', 'argent', true, true),
  ('critique_art', 'Critique d''Art', 'Écrire 10 critiques détaillées (commentaires).', '🎨', 'collection', 'argent', true, true),
  ('data_analyst', 'Data Analyst', 'Créer 3 filtres sauvegardés différents.', '📊', 'collection', 'argent', true, true),
  ('impact_massif', 'Impact Massif', 'Ajouter 10 jeux en une seule journée.', '☄️', 'collection', 'argent', false, true),
  ('long_journey', 'Long Voyage', 'Accumuler plus de 1000 heures de jeu au total.', '🗺️', 'collection', 'or', false, true),
  ('tag_master', 'Maître des Tags', 'Créer et assigner 10 tags personnalisés.', '🏷️', 'collection', 'bronze', false, true),
  ('import_export', 'Import/Export', 'Importer une liste de jeux depuis un CSV.', '📦', 'action', 'argent', false, true),
  ('multi_device', 'Multi-Device', 'Se connecter depuis 3 appareils différents.', '📱', 'action', 'or', false, true),
  
  -- 3. Event Trophies (Saisonniers, etc.)
  ('season_spring', 'Bourgeon', 'Ouvrir l''application au Printemps.', '🌱', 'event', 'bronze', true, true),
  ('season_summer', 'Canicule', 'Ouvrir l''application en Été.', '☀️', 'event', 'bronze', true, true),
  ('season_autumn', 'Chute des feuilles', 'Ouvrir l''application en Automne.', '🍂', 'event', 'bronze', true, true),
  ('season_winter', 'Flocon givré', 'Ouvrir l''application en Hiver.', '❄️', 'event', 'bronze', true, true),
  ('event_halloween', 'Des bonbons ou un sort', 'Se connecter en Octobre/Novembre.', '🎃', 'event', 'argent', true, true),
  ('event_christmas', 'Père Noël', 'Se connecter en Décembre/Janvier.', '🎄', 'event', 'argent', true, true),
  ('event_easter', 'Chasse aux oeufs', 'Se connecter à Pâques.', '🐰', 'event', 'argent', true, true),
  ('event_epiphanie', 'La Fève', 'Se connecter à l''Epiphanie.', '👑', 'event', 'argent', true, true),
  ('event_chandeleur', 'Maître Crêpier', 'Se connecter à la Chandeleur.', '🥞', 'event', 'argent', true, true)
ON CONFLICT (id_name) DO UPDATE SET 
  category = EXCLUDED.category,
  is_implemented = EXCLUDED.is_implemented,
  is_theme_unlocker = EXCLUDED.is_theme_unlocker;
