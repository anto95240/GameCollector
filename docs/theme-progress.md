# Suivi de Progression des Thèmes — Animations

> Tableau de bord opérationnel pour le suivi du chantier d'animation des thèmes.
> Source de vérité : `src/config/themeRegistry.ts` (266 thèmes) et plan de lots (`docs/theme/avancement.md`).

## Légende des colonnes

- **ID** : Identifiant unique normalisé du thème dans `themeRegistry.ts`.
- **Nom** : Libellé public du thème.
- **Catégorie** : Catégorie d'appartenance dans le registre.
- **Famille** : Regroupement macro-famille (6 familles canoniques).
- **Intensité** : Niveau d'immersion cible selon le plan de lots (1 = subtil, 2 = scène complète, 3 = immersion maximale).
- **Fiche validée** : Fiche de direction artistique rédigée et validée.
- **Implémenté** : Animation développée et intégrée dans le moteur.
- **Validé par moi** : Validation visuelle finale après test des 3 captures.
- **FPS** : Mesure de performance observée (cible 60 FPS desktop / 30 FPS mobile).
- **Notes** : Informations particulières (seuls `neon_night` et `aurora` sont annotés "ancien système").

| ID | Nom | Catégorie | Famille | Intensité | Fiche validée | Implémenté | Validé par moi | FPS | Notes |
|---|---|---|---|:---:|:---:|:---:|:---:|:---:|---|
| `neon_night` | Neon Night | Thèmes Classiques | Basiques & Saisons | **1** | Non | Ancien système | Non | - | Ancien système |
| `arctic_day` | Arctic Day | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `emerald_city` | Emerald City | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `coral_reef` | Coral Reef | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `ember` | Ember | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `arctic_neon` | Arctic Neon | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `gold_rush` | Gold Rush | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `midnight_ocean` | Midnight Ocean | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `ocean_deep` | Ocean Deep | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `lava` | Lava | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `forest_dark` | Forest Dark | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `parchment` | Parchment | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `ice_cave` | Ice Cave | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `aurora` | Aurora | Thèmes Classiques | Basiques & Saisons | **1** | Non | Ancien système | Non | - | Ancien système |
| `desert_night` | Desert Night | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `vapor` | Vapor | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `champagne` | Champagne | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `inferno` | Inferno | Thèmes Classiques | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `halloween` | Halloween | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **3** | Non | Non | Non | - | - |
| `christmas` | Christmas | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **3** | Non | Non | Non | - | - |
| `spring` | Spring | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `easter` | Easter | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `summer` | Summer | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `winter` | Winter | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `autumn` | Autumn | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `chandeleur` | Chandeleur | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `epiphanie` | Épiphanie | Thèmes Saisonniers & événnementiels | Basiques & Saisons | **1** | Non | Non | Non | - | - |
| `retro_pixel` | Retro Pixel | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `ps2_era` | PS2 Era | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `game_boy` | Game Boy | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `retro_arcade` | Retro Arcade | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `nes_classic` | 8-Bit Era | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `snes_classic` | 16-Bit Era | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `crt_scanline` | CRT Scanline | Thèmes Gaming & Rétro | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `star_road` | Star Road | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `mushroom_kingdom` | Mushroom Kingdom | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `bowser_castle` | Bowser Castle | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `kong_island` | Kong Island | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `luigis_mansion` | Luigi's Mansion | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `yoshis_island` | Yoshi's Island | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `kanto` | Kanto | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `elite_four` | Elite Four | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `master_ball` | Master Ball | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `green_hill` | Green Hill Zone | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `speed_of_sound` | Speed of Sound | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `angel_island` | Angel Island | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `space_colony` | Space Colony ARK | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `los_santos` | Los Santos | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `vice_city` | Vice City | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `liberty_city` | Liberty City | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `wumpa_islands` | Wumpa Islands | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `dragon_realms` | Dragon Realms | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `glade_of_dreams` | Glade of Dreams | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `pac_maze` | Pac-Maze | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `overworld` | Overworld | Thèmes Jeux Vidéo | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `whip_hat` | Whip & Hat | Thèmes Archéologie & Exploration | Gaming & Rétro | **3** | Non | Non | Non | - | - |
| `temple_of_doom` | Temple of Doom | Thèmes Archéologie & Exploration | Gaming & Rétro | **3** | Non | Non | Non | - | - |
| `holy_grail` | Holy Grail | Thèmes Archéologie & Exploration | Gaming & Rétro | **3** | Non | Non | Non | - | - |
| `sic_parvis_magna` | Sic Parvis Magna | Thèmes Archéologie & Exploration | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `drakes_fortune` | Drake's Fortune | Thèmes Archéologie & Exploration | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `tomb_raider` | Tomb Raider | Thèmes Archéologie & Exploration | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `croft_manor` | Croft Manor | Thèmes Archéologie & Exploration | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `the_survivor` | The Survivor | Thèmes Archéologie & Exploration | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `cozy_farm` | Cozy Farm | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `tycoon` | Tycoon | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `aquarium` | Aquarium | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `safari_zoo` | Safari Zoo | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `city_builder` | City Builder | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **1** | Non | Non | Non | - | - |
| `jurassic` | Jurassic | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `dino_dna` | Dino DNA | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `isla_nublar` | Isla Nublar | Thèmes Gestion, Nature & Animaux | Gaming & Rétro | **2** | Non | Non | Non | - | - |
| `egypte_antique` | Égypte Antique | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `viking_norse` | Norse & Vikings | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `tundra` | Tundra | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `andalousie` | Andalousie | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `silk_road` | Route de la Soie | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `hellas` | Grèce Antique | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `middle_kingdom` | Empire du Milieu | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `new_world` | Monde Nouveau | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `terra_incognita` | Terra Incognita | Thèmes Géographiques & Culturels | Monde Réel | **1** | Non | Non | Non | - | - |
| `medieval_kingdom` | Medieval Kingdom | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `roman_empire` | Roman Empire | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `age_of_sail` | Age of Sail | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `aztec` | Aztec | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `taverne` | La Taverne | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `elven_forest` | Elven Forest | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `deep_sea` | Deep Sea | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `dungeon_crawler` | Dungeon Crawler | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `mage_tower` | Mage Tower | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `hero_journey` | Hero's Journey | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `dragon_lair` | Dragon's Lair | Thèmes Historiques & Fantasy | Monde Réel | **2** | Non | Non | Non | - | - |
| `mythic_realm` | Mythic Realm | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `epic_saga` | Epic Saga | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `divine_realm` | Divine Realm | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `pantheon` | Pantheon | Thèmes Historiques & Fantasy | Monde Réel | **1** | Non | Non | Non | - | - |
| `nebula` | Nebula | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `black_hole` | Black Hole | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `quantum` | Quantum | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `mars_colony` | Mars Colony | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `stargate` | Stargate | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `deep_space` | Deep Space | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `event_horizon` | Event Horizon | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `cosmic_void` | Cosmic Void | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `galactic_core` | Galactic Core | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `dark_matter` | Dark Matter | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `great_attractor` | The Great Attractor | Thèmes Espace | Monde Réel | **2** | Non | Non | Non | - | - |
| `ici_c_est_paris` | Ici c'est Paris | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `citizens` | Citizens | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `red_devils` | Red Devils | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `the_reds` | The Reds | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `gunners` | Gunners | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `los_merengues` | Los Merengues | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `blaugrana` | Blaugrana | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `colchoneros` | Colchoneros | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `les_bavarois` | Les Bavarois | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `bianconeri` | Bianconeri | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `rossoneri` | Rossoneri | Thèmes Clubs de Sport | Monde Réel | **1** | Non | Non | Non | - | - |
| `wild_gallop` | Wild Gallop | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `bavarian_motorsport` | Bavarian Motorsport | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `quattro` | Quattro | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `silver_arrow` | Silver Arrow | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `shark_bite` | Shark Bite | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `carrera` | Carrera | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `scuderia_pride` | Scuderia Pride | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `raging_bull` | Raging Bull | Véhicules & Course | Monde Réel | **1** | Non | Non | Non | - | - |
| `db_series` | DB Series | Véhicules & Course | Monde Réel | **2** | Non | Non | Non | - | - |
| `crewe_luxury` | Crewe Luxury | Véhicules & Course | Monde Réel | **2** | Non | Non | Non | - | - |
| `french_blue` | French Blue | Véhicules & Course | Monde Réel | **2** | Non | Non | Non | - | - |
| `phantom_luxury` | Phantom Luxury | Véhicules & Course | Monde Réel | **2** | Non | Non | Non | - | - |
| `street_racing` | Toretto Family | Véhicules & Course | Monde Réel | **2** | Non | Non | Non | - | - |
| `eruption` | Eruption | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `tsunami` | Tsunami | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `twister` | Twister | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `whiteout` | Whiteout | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `meteor_strike` | Meteor Strike | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `sinkhole` | Sinkhole | Thèmes Catastrophes Naturelles | Monde Réel | **3** | Non | Non | Non | - | - |
| `infinity` | The Infinity Gauntlet | Univers Marvel | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `web_slinger` | Web-Slinger | Univers Marvel | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `stark_tech` | Stark Tech | Univers Marvel | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `first_avenger` | First Avenger | Univers Marvel | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `god_of_thunder` | God of Thunder | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `gamma_smash` | Gamma Smash | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `red_room` | Red Room | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `weapon_x` | Weapon X | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `wakanda_forever` | The Multiverse | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `sorcerer_supreme` | Sorcerer Supreme | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `symbiote` | The One Above All | Univers Marvel | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `multiverse` | Multiverse | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `the_dark_knight` | The Dark Knight | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `man_of_steel` | Man of Steel | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `speed_force` | Speed Force | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `clown_prince` | Clown Prince | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `arkham_city` | Arkham City | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `league_of_assassins` | League of Assassins | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `krypton_falls` | Anti-Monitor | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `the_mys_terious_dc` | The Presence | Thèmes DC | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `galaxy_far_away` | A Galaxy Far, Far Away | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `jedi_order` | The Jedi Order | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `sith_empire` | Sith Empire | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `hutt_cartel` | Hutt Cartel | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `droid_rebellion` | Droid Rebellion | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `galactic_empire` | Force Ghost | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `the_mys_terious_sw` | The Whills | Galaxie Star Wars | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `hogwarts` | Hogwarts | Thèmes Harry Potter | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `diagon_alley` | Chemin de Traverse | Thèmes Harry Potter | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `deathly_hallows` | Les Reliques de la Mort | Thèmes Harry Potter | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `the_mys_terious_hp` | L'Ordre du phoenix | Thèmes Harry Potter | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `andy_s_room` | Andy's Room | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `motunui` | Motunui | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `scare_floor` | Scare Floor | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `route_66` | Route 66 | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `arendelle` | Arendelle | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `eac` | East Australian Current | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `agrabah` | Agrabah | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `pride_rock` | Pride Rock | Thèmes Disney & Pixar | Super-Héros & Animation | **3** | Non | Non | Non | - | - |
| `headquarters` | Quartier Général | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `enchanted_rose` | Enchanted Rose | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `dragon_warrior` | Dragon Warrior | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `paradise_falls` | Paradise Falls | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `gusteau_s` | Gusteau's | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `axiom` | Axiom | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `olympus` | Mount Olympus | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `neverland` | Neverland | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `bella_notte` | Bella Notte | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `once_upon_a_dream` | Once Upon a Dream | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `luxo` | Luxo Jr. | Thèmes Disney & Pixar | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `berk` | Berk | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `mystery_machine` | Mystery Machine | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `street_football` | Foot 2 Rue | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `lasagna` | Lasagna | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `sarsaparilla` | Sarsaparilla | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `potion_magique` | Potion Magique | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `reporter` | Tintin | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `flux` | Flux | Thèmes Animation & Dessin Animé | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `hawkins_lab` | Hawkins Lab | Thèmes Films & Séries — Culte | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `nypd` | McClane's Law | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `maverick` | Maverick | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `lisan_al_gaib` | Lisan al Gaib | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `hellfire_club` | The Hellfire Club | Thèmes Films & Séries — Culte | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `yippee_ki_yay` | Yippee-Ki-Yay | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `mach_10` | Mach 10 | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `shai_hulud` | Shai-Hulud | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `upside_down` | Upside Down | Thèmes Films & Séries — Culte | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `nakatomi` | Nakatomi Plaza | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `danger_zone` | Danger Zone | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `arrakis` | Arrakis | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `delorean` | DeLorean DMC-12 | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `gargantua` | Gargantua | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `unsinkable` | Unsinkable | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `phone_home` | E.T. Phone Home | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `kevin` | Kevin! | Thèmes Films & Séries — Culte | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `red_pill` | Red Pill | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `baker_street` | Baker Street | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `the_couch` | The Couch | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `winter_is_coming` | Winter Is Coming | Thèmes Films & Séries — Divers | Cinéma & Séries | **1** | Non | Non | Non | - | - |
| `tardis` | TARDIS | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `walkers` | Walkers | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `heisenberg` | Heisenberg | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `starfleet` | Starfleet | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `by_order_of` | By Order Of | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `in_the_jungle` | In The Jungle | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `replicant` | Replicant | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `judgment_day` | Judgment Day | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `proton_pack` | Proton Pack | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `gentleman_burglar` | Gentleman Burglar | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `sic_mundus` | Sic Mundus | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `slappy` | Slappy | Thèmes Films & Séries — Divers | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `007_classic` | 007 | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `shadow_agent` | Shadow Agent | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `spectre` | Spectre | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `imf` | IMF Protocol | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `kingsman` | Kingsman | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `splinter` | Splinter | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `syndicate` | The Syndicate | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `echelon` | Echelon | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `ghost_protocol` | Ghost Protocol | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `black_ops` | Black Ops | Thèmes Espionnage & Infiltration | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `i_want_to_believe` | I Want to Believe | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `xenomorph` | Xenomorph | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `mothership` | Mothership | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `roswell` | Roswell | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `area_51` | Area 51 | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `third_kind` | Third Kind | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `the_invasion` | The Invasion | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `men_in_black` | Men in Black | Thèmes Extraterrestres | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `middle_earth` | Middle-Earth | Thèmes Univers & Littérature | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `narnia` | Narnia | Thèmes Univers & Littérature | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `westeros` | Westeros | Thèmes Univers & Littérature | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `discworld` | Discworld | Thèmes Univers & Littérature | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `wonderland` | Wonderland | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `camelot` | Camelot | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `valhalla` | Valhalla | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `spice_melange` | Spice Melange | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `order_of_merlin` | Order of Merlin | Thèmes Univers & Littérature | Cinéma & Séries | **3** | Non | Non | Non | - | - |
| `cyber_sprawl` | Cyber Sprawl | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `cthulhu_mythos` | Cthulhu Mythos | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `foundation` | Foundation | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `fahrenheit` | Fahrenheit | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `brave_new_world` | Brave New World | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `solaris` | Solaris | Thèmes Univers & Littérature | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `autobots` | Autobots | Thèmes Transformers | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `decepticons` | Decepticons | Thèmes Transformers | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `cybertron` | Cybertron | Thèmes Transformers | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `the_mys_terious_tf` | AllSpark | Thèmes Transformers | Super-Héros & Animation | **2** | Non | Non | Non | - | - |
| `glade` | Glade | Thèmes Dystopie | Cinéma & Séries | **2** | Non | Non | Non | - | - |
| `panem` | Panem | Thèmes Dystopie | Cinéma & Séries | **2** | Non | Non | Non | - | - |
