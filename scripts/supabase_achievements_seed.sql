-- Fichier à exécuter dans l'éditeur SQL de Supabase
-- pour insérer les nouveaux trophées liés aux fonctionnalités UI et Raccourcis

INSERT INTO achievements (id_name, title, description, icon, rarity, is_hidden, tags) VALUES
('shortcut_novice', 'Touche-à-tout', 'Utilisez les raccourcis clavier 10 fois', '⌨️', 'bronze', false, ARRAY['interaction','raccourci']),
('shortcut_pro', 'Pianiste', 'Utilisez les raccourcis clavier 50 fois', '🎹', 'argent', false, ARRAY['interaction','raccourci']),
('shortcut_master', 'Maître des Clés', 'Utilisez les raccourcis clavier 100 fois', '🚀', 'or', false, ARRAY['interaction','raccourci']),
('theme_customizer', 'Artiste Peintre', 'Personnalisez le thème de l''application', '🎨', 'bronze', false, ARRAY['personnalisation','theme']),
('dashboard_architect', 'Architecte', 'Personnalisez la disposition du Dashboard', '🏗️', 'bronze', false, ARRAY['personnalisation','dashboard']),
('filter_saver', 'Bibliothécaire', 'Sauvegardez un filtre de recherche', '🔖', 'bronze', false, ARRAY['fonctionnalite','filtre']),
('wishlist_curator', 'Liste d''Envies', 'Ajoutez 10 jeux à votre Wishlist', '⭐', 'argent', false, ARRAY['fonctionnalite','wishlist']),
('custom_stats', 'Analyste', 'Activez ou modifiez une métrique personnalisée', '📊', 'argent', false, ARRAY['fonctionnalite','statistiques'])
ON CONFLICT (id_name) DO NOTHING;
