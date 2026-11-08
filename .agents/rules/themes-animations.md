---
trigger: always_on
---

# Règles qualité — animations de thèmes

OBJECTIF : chaque thème doit donner l'impression d'une scène vivante, réaliste et immersive, jamais d'un simple fond décoratif.

STRUCTURE OBLIGATOIRE
- Minimum 4 couches par thème : (1) fond/décor, (2) plans intermédiaires avec parallaxe, (3) particules ou éléments mobiles, (4) lumière/brume/atmosphère, (5) overlay (grain, vignettage, bloom léger).
- Chaque thème a UN élément signature : la chose la plus reconnaissable de l'univers, animée avec soin.
- Les thèmes sont des CONFIGS du moteur partagé (src/theme-engine), jamais du code dupliqué par thème.

RÉALISME
- Aucun mouvement linéaire : easings irréguliers, bruit de Perlin/simplex pour les mouvements organiques.
- Aléatoire sur taille, vitesse, opacité, durée de vie, trajectoire. Pas de boucle visible : durées différentes selon les éléments.
- Profondeur : plus un élément est loin, plus il est petit, flou, lent et peu contrasté.
- Lumière cohérente : une source principale, ombres et reflets dans la même direction.
- Événements rares et irréguliers (éclair, étoile filante, rafale, clin de lumière) plutôt qu'un mouvement permanent uniforme.

INTERACTION
- La souris (ou l'inclinaison sur mobile) déplace la parallaxe et influence au moins un élément.
- Le scroll modifie légèrement l'ambiance (profondeur, intensité), sans casser la lisibilité.

INTENSITÉ (1 à 3)
- 1 = ambiance subtile : 3 couches, peu de particules, mouvements lents.
- 2 = scène complète : 4-5 couches, élément signature, 1 événement rare.
- 3 = immersion maximale : 5+ couches, shaders, plusieurs événements rares, réaction forte à la souris, éventuellement une courte intro à l'activation du thème.

CONTRAINTES
- 60 fps sur un PC milieu de gamme, 30 fps minimum sur mobile. Limite de particules par intensité et réduction automatique sur mobile.
- Respecter prefers-reduced-motion (version statique ou très lente).
- Le contenu de l'interface doit rester lisible : contraste suffisant, overlay sombre/clair si besoin.
- Mettre en pause l'animation quand l'onglet n'est pas visible.
- Pas de droits d'auteur copiés : évoquer l'univers par l'ambiance, les formes et les couleurs, sans reproduire de personnages, logos ou affiches protégés.

TECHNIQUE
- Un seul contexte WebGL pour toute l'application, gardé monté : changer de thème = changer de configuration, jamais recréer le moteur.
- Tout est assemblé à partir des briques du catalogue docs/bricks.md. Un thème n'a pas de code spécifique sauf cas exceptionnel justifié.
- Les ressources (textures, géométries, shaders) sont libérées à chaque changement de thème.
- Une version de repli (canvas 2D ou fond statique) existe si WebGL est indisponible ou si le contexte est perdu.

EMPILEMENT (interface au-dessus de l'animation)
- Le moteur est TOUJOURS derrière l'interface. Le conteneur de l'application (#app-container) a un z-index strictement supérieur à celui de la couche d'animation, et la couche est en pointer-events: none.
- Tout texte, bouton, carte, menu, toast et modale reste au-dessus de l'animation et cliquable, sur chaque thème et dans ThemePreview.
- Le voile contentShield se place entre l'animation et l'interface, jamais au-dessus de l'interface.

VALIDATION
- Avant de dire qu'un thème est terminé : lancer la page, faire des captures à 3 moments différents, les comparer à la fiche de direction artistique, lister ce qui paraît plat ou répétitif, corriger, refaire une capture.

SECTION À AJOUTER À LA FIN DU FICHIER DE RÈGLES (CONFIGS DE THÈMES)
- Un thème est une config TypeScript de type ThemeEngineConfig dans src/theme-engine/configs/<id>.ts, enregistrée avec un import dynamique dans src/theme-engine/configs/index.ts. Jamais de code spécifique à un thème en dehors de sa config.
- N'utilise que les brickType existants (catalogue ci-dessous). N'invente pas de brique ; signale-la.
background : gradient_sky, fbm_clouds, nebula, multilayer_starfield, aurora, water_caustics, waves, lava_flow, dunes
intermediate (parallaxe) : parallax_forest, parallax_mountains, parallax_city, parallax_castle, parallax_fleet, parallax_plane, parallax_pixel_tiles
atmosphere : noisy_fog, god_rays, flickering_light, heat_distortion, volumetric_glow, lens_flare
particles : instanced_particles, embers, ash, snow, rain, dust, fireflies, bubbles, leaves, sparks, petals, confetti, smoke
events : lightning, shooting_star, wind_gust, shockwave, glitch, screen_shake
overlay : film_grain, vignette, crt_scanlines, halftone, pixelation, chromatic_aberration, post_processing_overlay
special : neon_grid, code_rain, hex_grid, line_constellation
- Ne modifie pas le type ThemeFamily (catalogue). Table catégorie → family : classiques→classics ; saisonniers→seasons ; gaming_retro, jeux_video, archeologie, gestion_nature→gaming ; geographiques, historiques_fantasy, espace_futurisme, clubs_sport, automobile, catastrophes→realworld ; marvel, dc, star_wars, harry_potter, disney_pixar, animation, transformers→heroes ; films_series_culte, films_series_divers, espionnage, extraterrestres, dystopie→cinema ; univers_litterature→universes.
- Les 11 familles d'animation (Éléments & catastrophes, Espace & cosmos, Magie & fantasy, Néon & cyber, Rétro & pixel, Aventure & histoire, Urbain & action, Super-héros & comics, Animation & cartoon, Horreur & mystère, Cosy & gestion) sont un concept distinct, géré par des presets dans src/theme-engine/presets/.
- Honnêteté : ne jamais affirmer avoir vu une capture ou mesuré un FPS sans l'avoir réellement obtenu ; sinon écrire « non vérifié » et lister ce que l'utilisateur doit contrôler.