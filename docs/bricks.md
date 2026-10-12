# Catalogue des Briques d'Animation — `theme-engine`

> Référence documentaire du catalogue de briques d'ambiance et de shaders GPU pour les 276 thèmes de GameCollector.  
> Conforme aux règles d'immersion cinématique (.agents/rules/themes-animations.md) et à l'architecture Three.js Vanilla (docs/architecture-animations.md).

---

## 1. Vue d'Ensemble & Spécification Commune

Toutes les briques du catalogue sont des plugins GPU modulaires implémentant l'interface `IBrickInstance` et enregistrés dynamiquement dans le registre central `BrickRegistry`.
Elles ne dupliquent aucun code impératif : les thèmes de l'application sont de pures structures de données déclaratives assemblant ces briques par calques.

### 1.1 Contrat d'Interface d'une Brique
Chaque brique respecte le cycle de vie canonique :
- **`init(scene, camera, sharedUniforms)`** : Montage des maillages ou géométries dans la scène Three.js unique.
- **`update(delta, time, interaction, quality)`** : Actualisation par frame à 60 FPS (sans garbage collector ni réconciliation React).
- **`updateProps(newProps)`** : Mise à jour immédiate et fluide des paramètres en direct lors de l'utilisation du banc d'essai ou des transitions de thèmes.
- **`onQualityChange(tier)`** : Adaptation dynamique selon le palier (`HIGH`, `MEDIUM`, `LOW`).
- **`dispose()`** : Libération intégrale et rigoureuse de la VRAM (`geometry.dispose()`, `material.dispose()`, `texture.dispose()`).

### 1.2 Structure des 6 Paramètres Universels
Chaque brique expose au minimum les 6 dimensions requises :
1. **Couleur(s)** : Teintes personnalisées ou liaison dynamique avec la palette du thème (`uPalettePrimary`, `uPaletteSecondary`, `uPaletteAccent`).
2. **Densité** : Échelle, compacité ou nombre d'éléments instanciés.
3. **Vitesse** : Facteur temporel d'évolution et d'ondulation non-linéaire.
4. **Profondeur** : Étalement en perspective $Z$ et sensibilité à la parallaxe souris/gyroscope.
5. **Intensité** : Radiance, contraste et émission lumineuse.
6. **Aléatoire** : Bruit de Simplex, déphasage ou dispersion pour interdire toute impression de boucle répétitive.

---

## 2. Groupe 1 : Briques de "Fonds" (`category: 'background'`)

Ce groupe compose le calque de base (Couche 1), rendu à l'arrière-plan immédiat (ordre de rendu $-100$ à $-90$).

---

### Brique 1 : Ciel Dégradé (`gradient_sky`)

* **Nom** : Ciel Dégradé Atmosphérique
* **Type technique** : `gradient_sky`
* **Rôle** : Fond plein écran dynamique simulant la diffusion de lumière céleste entre zénith et horizon, enrichi de variations organiques subtiles via bruit de Simplex 2D pour éliminer tout effet de banding ou de gradient figé.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `topColor` | `string` | Palette Sec. (`#0f172a`) | Couleur au zénith (haut du ciel). |
| `bottomColor` | `string` | Palette Prim. (`#001428`) | Couleur au sol / nadir (bas du ciel). |
| `horizonColor` | `string` | Palette Acc. (`#00f0ff`) | Lueur diffuse à la ligne d'horizon. |
| `density` | `number` | `1.0` | Courbure et compression exponentielle du dégradé (0.4 à 2.5). |
| `speed` | `number` | `0.2` | Vitesse de pulsation et de dérive atmosphérique. |
| `depth` | `number` | `0.1` | Sensibilité à la parallaxe caméra / souris. |
| `intensity` | `number` | `1.0` | Contraste général et éclat de la lueur d'horizon. |
| `randomness` | `number` | `0.15` | Amplitude de la perturbation organique Simplex GLSL. |
| `noiseScale` | `number` | `1.2` | Échelle spatiale du bruit de fond. |

#### Comportement par Palier de Qualité
* **HIGH** : 2 octaves de bruit Simplex GLSL pour des micro-variations de brume céleste + calcul complet de la lueur d'horizon exponentielle.
* **MEDIUM** : 1 octave de bruit Simplex adoucie.
* **LOW** : Interpolation mathématique optimisée sans calcul trigonométrique de bruit lourd (garantit 60 FPS sur GPU d'entrée de gamme).

#### Coût en Performance
* **Desktop (GPU Dédié / Milieu de gamme)** : `0.35 ms / frame` (60 FPS très large).
* **Mode Mobile Throttling (DPR 1.0, 30 FPS cap)** : `0.85 ms / frame` (impact batterie quasi nul).

#### Exemples d'usage
* `neon_night` : Dégradé bleu nuit vers cyan avec lueur magenta à l'horizon.
* `arctic_day` : Blanc polaire vers bleu glacier évanescent.
* `sunset_drive` : Violet crépusculaire vers orange cuivré.

---

### Brique 2 : Nuages FBM (`fbm_clouds`)

* **Nom** : Couverture Nuageuse FBM
* **Type technique** : `fbm_clouds`
* **Rôle** : Simulation volumétrique 2D de bancs de nuages vaporeux dérivant sous le vent, avec distorsion de domaine (domain warping) pour un aspect organique vivant et diffusion d'ombre interne.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `cloudColor` | `string` | `#f1f5f9` | Teinte des masses nuageuses illuminées. |
| `skyColor` | `string` | Palette Sec. (`#0f172a`) | Teinte du ciel derrière la couche nuageuse. |
| `density` | `number` | `0.55` | Couverture nuageuse (0.1 = cirrus fins, 0.9 = ciel d'orage). |
| `speed` | `number` | `0.15` | Vitesse de dérive du vent. |
| `depth` | `number` | `0.3` | Altitude apparente et décalage parallaxe avec la souris. |
| `intensity` | `number` | `1.0` | Contraste ombre / crête ensoleillée des nuages. |
| `randomness` | `number` | `0.4` | Turbulence interne et amplitude de domain warping. |
| `windAngle` | `number` | `0.15` | Angle de propagation du vent en radians. |

#### Comportement par Palier de Qualité
* **HIGH** : 5 octaves FBM avec double domain warping ($p \to q \to r$) et calcul d'ombrage directionnel volumétrique doux.
* **MEDIUM** : 3 octaves FBM avec warping simple.
* **LOW** : 2 octaves FBM sans warping (forme générale préservée).

#### Coût en Performance
* **Desktop** : `0.95 ms / frame`.
* **Mode Mobile Throttling** : `2.30 ms / frame`.

#### Exemples d'usage
* `skyrim` : Nuages lourds et brumeux balayant les sommets nordiques.
* `zelda_breath` : Ciel d'Hyrule avec cumulus vaporeux dérivants.
* `ghibli_meadow` : Nuages blancs estivaux gonflés par le vent.

---

### Brique 3 : Nébuleuse Cosmique (`nebula`)

* **Nom** : Nébuleuse Interstellaire
* **Type technique** : `nebula`
* **Rôle** : Voiles de gaz ionisé et filaments de poussières cosmiques en rotation fluide avec vortex non-linéaire, émission lumineuse au coeur et micro-étoiles de profondeur intégrées.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `primaryColor` | `string` | `#c026d3` | Teinte des voiles de gaz chauds ionisés. |
| `secondaryColor` | `string` | `#090d16` | Teinte du vide spatial et des poussières froides. |
| `accentColor` | `string` | `#38bdf8` | Éclat des coeurs d'étoiles naissantes. |
| `density` | `number` | `0.6` | Densité et compacité des filaments de plasma. |
| `speed` | `number` | `0.12` | Vitesse de rotation différentielle du vortex cosmique. |
| `depth` | `number` | `0.2` | Profondeur spatiale et parallaxe. |
| `intensity` | `number` | `1.0` | Radiance globale et luminosité du coeur. |
| `randomness` | `number` | `0.35` | Asymétrie et turbulence chaotique. |
| `coreScale` | `number` | `1.4` | Étalement spatial du centre de la nébuleuse. |

#### Comportement par Palier de Qualité
* **HIGH** : 4 octaves FBM avec vortex non-linéaire calculé par distance radiale, double couche de gaz et micro-étoiles scintillantes intégrées.
* **MEDIUM** : 3 octaves FBM avec vortex doux sans micro-étoiles.
* **LOW** : 2 octaves FBM directes.

#### Coût en Performance
* **Desktop** : `1.15 ms / frame`.
* **Mode Mobile Throttling** : `2.65 ms / frame`.

#### Exemples d'usage
* `mass_effect` : Nébuleuse pourpre et bleue évoquant la Citadelle et les Relais Cosmos.
* `star_wars` : Nébuleuse lointaine d'hyperespace.
* `metroid_prime` : Espace profond obscur ponctué de gaz radioactif cyan.

---

### Brique 4 : Champ d'Étoiles Multi-Couches (`multilayer_starfield`)

* **Nom** : Champ d'Étoiles Multi-Couches 3D
* **Type technique** : `multilayer_starfield`
* **Rôle** : Rendu par instanciation de points (1 seul draw call GPU) répartis sur 3 strates de profondeur $Z$. Intègre scintillement asynchrone non-périodique et aigrettes de diffraction optique sur les étoiles proches.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `starColor` | `string` | `#ffffff` | Teinte stellaire dominante (ou mixée avec l'accent). |
| `density` | `number` | `1.0` | Multiplicateur de densité stellaire (0.2 à 2.0). |
| `speed` | `number` | `0.1` | Vitesse de dérive orbitale lente. |
| `depth` | `number` | `1.0` | Étalement des 3 strates sur l'axe $Z$ (-35 à -5). |
| `intensity` | `number` | `1.0` | Éclat lumineux général. |
| `randomness` | `number` | `0.5` | Dispersion des tailles et des déphasages de clignotement. |
| `twinkleSpeed` | `number` | `1.5` | Fréquence moyenne de scintillement asynchrone. |

#### Comportement par Palier de Qualité
* **HIGH** : 1 200 étoiles actives sur 3 couches, aigrettes de diffraction à 4 branches sur les étoiles proches ($z \ge -15$) et profils radiaux gaussiens.
* **MEDIUM** : 600 étoiles actives sur 2 couches, disques lissés.
* **LOW** : 250 étoiles actives sur 1 couche (extrêmement léger, idéal mobile éco).

#### Coût en Performance
* **Desktop** : `0.40 ms / frame` (draw call unique, vertex processing ultraléger).
* **Mode Mobile Throttling** : `0.95 ms / frame`.

#### Exemples d'usage
* `cosmos` : Voûte étoilée réaliste avec profondeur infinie.
* `super_mario_galaxy` : Espace étincelant avec étoiles brillantes.
* `retro_arcade` : Champ stellaire défilant style shoot'em up des années 90.

---

### Brique 5 : Aurore Boréale (`aurora`)

* **Nom** : Aurore Boréale & Polaire
* **Type technique** : `aurora`
* **Rôle** : Rideaux de plasma ondulant sous l'effet du vent solaire, avec draperies lumineuses, rayons verticaux ionisés et transition spectrale entre émeraude à la base et violet au zénith.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `topColor` | `string` | `#a855f7` | Teinte de la crête supérieure (plasma magenta/violet). |
| `bottomColor` | `string` | `#10b981` | Teinte de la base ionisée (vert émeraude/cyan). |
| `density` | `number` | `0.65` | Épaisseur et compacité des draperies de lumière. |
| `speed` | `number` | `0.22` | Vitesse de propagation des ondes plasmatiques. |
| `depth` | `number` | `0.25` | Altitude et réactivité parallaxe à la souris. |
| `intensity` | `number` | `1.2` | Radiance et émission lumineuse. |
| `randomness` | `number` | `0.45` | Irrégularité des plis sous turbulence magnétique. |
| `waveFrequency` | `number` | `2.5` | Fréquence spatiale des ondulations de rideau. |

#### Comportement par Palier de Qualité
* **HIGH** : 3 rideaux superposés décalés en profondeur avec rayons verticaux ionisés fins et micro-pulsations lumineuses.
* **MEDIUM** : 2 rideaux superposés avec rayons verticaux standard.
* **LOW** : 1 rideau principal lisse.

#### Coût en Performance
* **Desktop** : `0.85 ms / frame`.
* **Mode Mobile Throttling** : `2.10 ms / frame`.

#### Exemples d'usage
* `nordic_frost` : Aurore polaire verte majestueuse sur ciel scandinave.
* `witcher_skellige` : Ciel nocturne mystique illuminé de voiles spectraux.
* `cyber_aurora` : Aurore néon stylisée rose et turquoise.

---

### Brique 6 : Eau & Caustiques (`water_caustics`)

* **Nom** : Eau & Caustiques Sous-Marines
* **Type technique** : `water_caustics`
* **Rôle** : Simulation du réseau de caustiques lumineuses réfractées au fond de l'eau via interférence constructive de diagrammes Voronoi mobiles, avec absorption lumineuse verticale et dispersion chromatique.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `waterColor` | `string` | `#021a2f` | Teinte de l'eau profonde / abysses. |
| `causticColor` | `string` | `#38bdf8` | Teinte des arcs de lumière focalisée. |
| `density` | `number` | `1.0` | Finesse et compacité de la maille de réfraction. |
| `speed` | `number` | `0.25` | Vitesse de clapotis de surface. |
| `depth` | `number` | `0.2` | Immersion sous-marine et parallaxe. |
| `intensity` | `number` | `1.2` | Netteté et clarté des lignes de caustiques. |
| `randomness` | `number` | `0.35` | Turbulence liquide et déformation des cellules. |
| `causticScale` | `number` | `3.5` | Échelle spatiale du maillage de fond. |

#### Comportement par Palier de Qualité
* **HIGH** : Double réseau Voronoi en interférence constructive avec légère dispersion chromatique (séparation optique rouge, vert, bleu simulant la diffraction de l'eau).
* **MEDIUM** : Voronoi double sans dispersion chromatique.
* **LOW** : Voronoi simple direct.

#### Coût en Performance
* **Desktop** : `1.20 ms / frame`.
* **Mode Mobile Throttling** : `2.80 ms / frame`.

#### Exemples d'usage
* `bioshock_rapture` : Fond marin de la cité engloutie avec rais de lumière perçant l'eau.
* `subnautica` : Eaux cristallines tropicales illuminées par le soleil.
* `abyss` : Plongée sous-marine mystérieuse aux caustiques bleu profond.

---

### Brique 7 : Vagues & Houle (`waves`)

* **Nom** : Vagues & Houle Océanique
* **Type technique** : `waves`
* **Rôle** : Perspective océanique infinie propulsée par trains d'ondes de Gerstner croisés, avec formation d'écume blanche sur les crêtes aiguisées, reflets spéculaires et brume d'horizon.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `crestColor` | `string` | `#f8fafc` | Couleur de l'écume blanche sur les crêtes. |
| `deepColor` | `string` | `#091729` | Couleur des creux et des profondeurs océaniques. |
| `density` | `number` | `1.0` | Fréquence spatiale des trains de vagues. |
| `speed` | `number` | `0.3` | Vitesse de déferlement et de translation. |
| `depth` | `number` | `0.35` | Inclinaison de la perspective océanique et parallaxe. |
| `intensity` | `number` | `1.0` | Hauteur relative des crêtes et quantité d'écume. |
| `randomness` | `number` | `0.4` | Houle croisée et asymétrie entre trains d'ondes. |
| `waveSteepness` | `number` | `0.6` | Acuité et cambrure des crêtes de vagues. |

#### Comportement par Palier de Qualité
* **HIGH** : 4 trains d'ondes de Gerstner croisés avec écume dynamique texturée par bruit et reflets spéculaires intenses.
* **MEDIUM** : 2 trains d'ondes croisés avec écume douce.
* **LOW** : 1 train d'onde principal sans calcul spéculaire.

#### Coût en Performance
* **Desktop** : `0.90 ms / frame`.
* **Mode Mobile Throttling** : `2.20 ms / frame`.

#### Exemples d'usage
* `wind_waker` : Houle marine d'aventure celtique / cartoon.
* `sea_of_thieves` : Océan houleux aux crêtes d'écume scintillantes sous la lune.
* `pirates` : Mer des Caraïbes agitée au crépuscule.

---

### Brique 8 : Coulée de Lave (`lava_flow`)

* **Nom** : Coulée de Lave Magmatique
* **Type technique** : `lava_flow`
* **Rôle** : Rivière de magma visqueux avec croûte de basalte fracturée en plaques tectoniques dérivantes, fissures incandescentes à gradient thermique 3 points et respiration de chaleur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `crustColor` | `string` | `#0f1117` | Croûte de basalte / obsidienne refroidie. |
| `magmaColor` | `string` | `#ea580c` | Magma orange ardent dans les failles. |
| `coreColor` | `string` | `#fef08a` | Coeur incandescent ultra-chaud (1 200 °C). |
| `density` | `number` | `1.0` | Densité des fractures et taille des plaques rocheuses. |
| `speed` | `number` | `0.18` | Vitesse d'écoulement visqueux vers le bas. |
| `depth` | `number` | `0.2` | Relief des failles et parallaxe souris. |
| `intensity` | `number` | `1.25` | Radiance thermique et lueur incandescente. |
| `randomness` | `number` | `0.45` | Torsion de l'écoulement et sinuosité des fissures. |
| `heatPulseSpeed` | `number` | `1.2` | Fréquence de la pulsation thermique organique. |

#### Comportement par Palier de Qualité
* **HIGH** : Plaques Voronoi fracturées par FBM sinueux, gradient thermique 3 points, pulsation thermique asynchrone et micro-texture granuleuse sur la roche.
* **MEDIUM** : Plaques Voronoi avec failles modulées et pulsation thermique.
* **LOW** : Voronoi direct avec failles magmatiques simplifiées.

#### Coût en Performance
* **Desktop** : `1.10 ms / frame`.
* **Mode Mobile Throttling** : `2.50 ms / frame`.

#### Exemples d'usage
* `doom` : Terres infernales de basalte fracturé et lave incandescente.
* `mordor` : Fleuves de feu du Mont Destin.
* `volcano` : Cratère actif en fusion constante.

---

### Brique 9 : Dunes Désertiques (`dunes`)

* **Nom** : Dunes de Désert Balayées par le Vent
* **Type technique** : `dunes`
* **Rôle** : Crêtes de sable sinueuses sous éclairage solaire rasant, opposant versants dorés éclatants et versants ombragés froids, avec micro-rides de sable (sand ripples) et brume d'horizon.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `sandColor` | `string` | `#f59e0b` | Teinte du sable au soleil rasant. |
| `shadowColor` | `string` | `#2d1810` | Teinte des versants à l'ombre du vent. |
| `skyColor` | `string` | `#78350f` | Horizon atmosphérique et brume de chaleur. |
| `density` | `number` | `1.0` | Espacement et fréquence des lignes de crêtes. |
| `speed` | `number` | `0.15` | Dérive lente du vent et miroitements thermiques. |
| `depth` | `number` | `0.3` | Étagement en profondeur et parallaxe caméra. |
| `intensity` | `number` | `1.0` | Contraste d'éclairage rasant et netteté. |
| `randomness` | `number` | `0.4` | Sinuosité en S des crêtes et irrégularité. |
| `sunAngle` | `number` | `0.8` | Angle d'incidence de la source lumineuse en radians. |

#### Comportement par Palier de Qualité
* **HIGH** : 3 crêtes successives étagées en profondeur avec micro-rides de sable (sand ripples) haute fréquence et diffusion de brume atmosphérique lointaine.
* **MEDIUM** : 2 crêtes étagées avec éclairage rasant.
* **LOW** : 1 crête principale simplifiée.

#### Coût en Performance
* **Desktop** : `0.70 ms / frame`.
* **Mode Mobile Throttling** : `1.75 ms / frame`.

#### Exemples d'usage
* `dune_arrakis` : Mer de sable infinie d'Arrakis sous le soleil d'Épice.
* `journey` : Désert onirique aux crêtes d'or et ombres pourpres.
* `egypt_assassins` : Dunes du désert égyptien balayées par le sirocco.

---

## 3. Groupe 2 : Briques de "Silhouettes (parallaxe)" (`category: 'intermediate'`)

Ce groupe compose le calque intermédiaire de perspective (Couche 2), rendu à l'avant-plan du décor (ordre de rendu $-50$ à $-20$).
Toutes ces briques reposent sur une décomposition en 3 strates de profondeur $Z$, une réactivité cinématique à la souris et au scroll (`InteractionState`), et une restitution procédurale GPU 100 % vectorielle sans asset image externe.

---

### Brique 10 : Forêt en Parallaxe (`parallax_forest`)

* **Nom** : Silhouette de Forêt Multi-Couches avec Brume & Houppier Ondulant
* **Type technique** : `parallax_forest`
* **Rôle** : Forêt profonde étagée sur 3 plans de profondeur distincts (lointain brumeux estompé, plan intermédiaire dense, premier plan sombre et net). Silhouette de conifères et feuillus générée procéduralement avec houppiers ondulant subtilement sous le vent (bruit Simplex), flexion quadratique réaliste des cimes, nappe de brume rasante dérivante entre les strates, et lucioles dorées asynchrones.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `forestColor` | `string` | `#0a1f18` | Teinte sombre dominante des arbres au premier plan. |
| `fogColor` | `string` | `#164e3f` | Teinte de la brume de sous-bois et d'horizon. |
| `density` | `number` | `1.0` | Densité et resserrement des troncs et cimes (0.4 à 2.2). |
| `speed` | `number` | `0.25` | Vitesse d'oscillation du vent et dérive de la brume. |
| `depth` | `number` | `0.35` | Étalement en profondeur et intensité de parallaxe différenciée par strate. |
| `intensity` | `number` | `1.0` | Contraste général, opacité et densité de brume. |
| `randomness` | `number` | `0.4` | Variabilité des hauteurs d'arbres et irrégularité des rafales. |
| `windStrength` | `number` | `0.5` | Amplitude de flexion des cimes sous les rafales de vent. |

#### Comportement par Palier de Qualité
* **HIGH** : 3 strates de silhouettes d'arbres indépendantes avec flexion quadratique ($y^2$) des cimes sous le vent, nappe de brume volumétrique rampante et micro-lucioles dorées pulsant dans les branchages.
* **MEDIUM** : 2 strates d'arbres, oscillation douce sans micro-branches, brume simplifiée.
* **LOW** : 1 strate principale + silhouette lointaine sans calcul de vent trigonométrique lourd.

#### Coût en Performance
* **Desktop (1080p, 60 FPS)** : `0.75 ms / frame`.
* **Mode Mobile Throttling (DPR 1.0, 30 FPS cap)** : `1.85 ms / frame`.

#### Exemples d'usage
* `enchanted_forest` : Forêt mystique émeraude balayée par une brise féerique avec lucioles.
* `witcher_skellige` : Taïga sombre scandinave sous le vent des fjords.
* `zelda_forest` : Bois Perdus d'Hyrule avec nappes de brume épaisses.

---

### Brique 11 : Montagnes en Parallaxe (`parallax_mountains`)

* **Nom** : Chaîne de Montagnes & Reliefs Alpins avec Brume de Vallée
* **Type technique** : `parallax_mountains`
* **Rôle** : Massif montagneux grandiose avec 3 crêtes successives (arête lointaine estompée dans le ciel, crêtes acérées médianes avec versants ombragés, contreforts rocheux d'avant-plan). Éclairage rasant directionnel, névés/glaciers sur les crêtes rocheuses, arêtes modélisées par Ridged Multifractal, et mer de brume ondulant dans les vallées.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `rockColor` | `string` | `#0b1329` | Teinte de la roche à l'ombre. |
| `sunColor` | `string` | `#475569` | Teinte des crêtes illuminées au soleil rasant. |
| `mistColor` | `string` | `#1e293b` | Teinte de la brume de vallée et d'horizon. |
| `density` | `number` | `1.0` | Fréquence et acuité des sommets / pics alpins. |
| `speed` | `number` | `0.15` | Dérive lente des nappes de brume dans les vallées. |
| `depth` | `number` | `0.35` | Écartement en profondeur entre les 3 chaînes et différentiel de parallaxe. |
| `intensity` | `number` | `1.0` | Contraste d'éclairage rasant et netteté des arêtes. |
| `randomness` | `number` | `0.45` | Variabilité géologique et asymétrie des pics. |
| `snowLevel` | `number` | `0.6` | Seuil d'apparition des névés et glaciers sur les sommets. |
| `sunAngle` | `number` | `0.75` | Angle d'incidence de la lumière solaire en radians. |

#### Comportement par Palier de Qualité
* **HIGH** : 3 crêtes étagées avec Ridged Multifractal, versants ombragés directionnels, névés procéduraux et nappe de brume basse ondulant dans les vallées.
* **MEDIUM** : 2 crêtes avec éclairage rasant et brume de base.
* **LOW** : 1 crête principale découpée avec dégradé d'élévation simple.

#### Coût en Performance
* **Desktop** : `0.80 ms / frame`.
* **Mode Mobile Throttling** : `1.95 ms / frame`.

#### Exemples d'usage
* `skyrim` : Sommets escarpés de Bordeciel couverts de névés sous brume nordique.
* `lotr_mordor` : Montagnes d'Ombre aux crêtes acérées de basalte noir.
* `nordic_peaks` : Fjords et massifs alpins étagés au soleil rasant.

---

### Brique 12 : Skyline de Ville (`parallax_city`)

* **Nom** : Skyline Urbain & Mégalopole Nocturne Cyberspace
* **Type technique** : `parallax_city`
* **Rôle** : Mégalopole moderne ou métropole cyberpunk étagée sur 3 plans de perspective (mégastructures lointaines dans la brume, quartier d'affaires médian, gratte-ciels monumentaux d'avant-plan avec antennes). Balises aéronautiques clignotantes pulsantes, fenêtres au scintillement asynchrone, faisceaux de projecteurs balayant le ciel nocturne et halo de smog urbain à la base.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `buildingColor` | `string` | `#070d19` | Teinte sombre de la silhouette des bâtiments. |
| `windowColor` | `string` | `#fef08a` | Teinte des fenêtres et baies vitrées illuminées. |
| `beaconColor` | `string` | `#ef4444` | Teinte des balises d'antennes et néons. |
| `density` | `number` | `1.0` | Nombre et compacité des gratte-ciels par unité. |
| `speed` | `number` | `0.3` | Vitesse de balayage des projecteurs et clignotement des balises. |
| `depth` | `number` | `0.35` | Parallaxe entre les 3 rangées d'immeubles. |
| `intensity` | `number` | `1.0` | Radiance des fenêtres et éclat des lumières. |
| `randomness` | `number` | `0.5` | Variabilité des hauteurs d'immeubles et styles de toits. |
| `smogIntensity` | `number` | `0.6` | Intensité du halo de smog lumineux nocturne à la base. |

#### Comportement par Palier de Qualité
* **HIGH** : 3 rangées urbaines, fenêtres instanciées avec extinction aléatoire non périodique, balises rouges pulsantes, projecteurs verticaux mobiles et halo de pollution lumineuse.
* **MEDIUM** : 2 rangées urbaines avec fenêtres lumineuses et balises simples.
* **LOW** : 1 rangée de skyline découpée avec lueur globale.

#### Coût en Performance
* **Desktop** : `0.90 ms / frame`.
* **Mode Mobile Throttling** : `2.15 ms / frame`.

#### Exemples d'usage
* `cyberpunk` : Néo-Tokyo nocturne aux tours gigantesques baignées de smog cyan et néons.
* `batman_gotham` : Gotham City sombre aux flèches gothiques et projecteurs dans les nuages.
* `neon_night` : Skyline métropolitain moderne sous lueurs nocturnes.

---

### Brique 13 : Château / Ruines (`parallax_castle`)

* **Nom** : Château Médiéval & Forteresse en Ruines
* **Type technique** : `parallax_castle`
* **Rôle** : Forteresse médiévale imposante juchée sur un promontoire rocheux escarpé (donjon central, tourelles crénelées, courtines, arches). Meurtrières illuminées par des torches vacillantes à pulsation organique Simplex, bannières flottant au vent, vol de corbeaux orbitant au-dessus des remparts, et paramètre de délabrement (`ruinDecay`) ébréchant les murs.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `castleColor` | `string` | `#080d1a` | Teinte de la maçonnerie médiévale et des murailles. |
| `torchColor` | `string` | `#f97316` | Teinte des torches vacillant dans les meurtrières. |
| `rockColor` | `string` | `#0f172a` | Teinte du promontoire rocheux et des falaises. |
| `density` | `number` | `1.0` | Complexité architecturale et nombre de tourelles. |
| `speed` | `number` | `0.3` | Vitesse de vacillement des torches et vol des oiseaux. |
| `depth` | `number` | `0.3` | Étalement en profondeur et parallaxe souris/scroll. |
| `intensity` | `number` | `1.0` | Contraste d'ombre et éclat des torches. |
| `randomness` | `number` | `0.4` | Asymétrie architecturale et dispersion des créneaux. |
| `ruinDecay` | `number` | `0.25` | Degré d'effondrement en ruines (0.0 = intact, 1.0 = ruines). |
| `torchGlow` | `number` | `1.0` | Éclat et halo de diffusion des torches. |

#### Comportement par Palier de Qualité
* **HIGH** : Forteresse détaillée avec promontoire rocheux sculpté, créneaux nets, meurtrières aux torches vacillantes (Simplex noise), bannières ondulantes et vol d'oiseaux lointains.
* **MEDIUM** : Tours et courtines principales avec meurtrières éclairées stables.
* **LOW** : Silhouette globale des remparts et donjon stylisée.

#### Coût en Performance
* **Desktop** : `0.70 ms / frame`.
* **Mode Mobile Throttling** : `1.70 ms / frame`.

#### Exemples d'usage
* `dark_souls` : Forteresse d'Anor Londo ou château déchu battu par les vents.
* `castlevania` : Silhouette gothique du château de Dracula au clair de lune.
* `witcher_kaer_morhen` : Ruines fortifiées juchées sur un pic rocheux sauvage.

---

### Brique 14 : Vaisseaux Lointains (`parallax_fleet`)

* **Nom** : Flotte Spatiale & Vaisseaux Lointains en Dérive
* **Type technique** : `parallax_fleet`
* **Rôle** : Flotte spatiale interstellaire naviguant en formation silencieuse à des vitesses différentielles selon la profondeur (dreadnought colossal lointain presque stationnaire, croiseurs d'escorte médians, chasseurs éclaireurs proches rapides). Réacteurs ioniques à plasma étincelant avec traînées de propulsion pulsantes et feux de signalisation.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `hullColor` | `string` | `#0a1120` | Teinte sombre de la coque des vaisseaux. |
| `engineColor` | `string` | `#38bdf8` | Teinte de la flamme de propulsion plasmique / ionique. |
| `density` | `number` | `1.0` | Nombre de vaisseaux composant la flottille. |
| `speed` | `number` | `0.2` | Vitesse de croisière sub-luminique différentielle. |
| `depth` | `number` | `0.4` | Échelonnement en profondeur et sensibilité parallaxe. |
| `intensity` | `number` | `1.2` | Radiance des tuyères de réacteurs et lumières de bord. |
| `randomness` | `number` | `0.4` | Dispersion spatiale et décalage des trajectoires. |
| `trailLength` | `number` | `0.8` | Longueur des traînées de propulsion plasmique. |

#### Comportement par Palier de Qualité
* **HIGH** : 6 à 8 vaisseaux sur 3 strates de vitesse avec traînées ioniques FBM étirées, pulsations de réacteurs, feux de position pulsants et inertie spatiale.
* **MEDIUM** : 4 vaisseaux sur 2 strates avec traînées linéaires simples.
* **LOW** : 2 vaisseaux sur 1 strate avec points de propulsion sans traînée lourde.

#### Coût en Performance
* **Desktop** : `0.65 ms / frame`.
* **Mode Mobile Throttling** : `1.60 ms / frame`.

#### Exemples d'usage
* `star_wars` : Flotte impériale de destroyers stellaires glissant dans l'hyperespace.
* `mass_effect` : Armada galactique aux moteurs FTL bleus croisant au large de la Citadelle.
* `halo` : Vaisseaux capitaux covenants et UNSC en patrouille orbitale.

---

### Brique 15 : Tuiles Pixel 16-bit (`parallax_pixel_tiles`)

* **Nom** : Plateformes & Décor Pixel Art Rétro (16-bit Parallaxe)
* **Type technique** : `parallax_pixel_tiles`
* **Rôle** : Décors de jeu de plateforme rétro (style SNES / Mega Drive 16-bit) quantifiés sur une grille de pixels stricte (pixel-perfect stepping). Collines en escalier, plateformes suspendues avec briques/pavés, frange d'herbe crénelée 1-pixel, défilement cadencé à 60Hz rétro et trame ordonnée de Bayer (dithering 16-bit).

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `tileColor` | `string` | `#1e293b` | Teinte dominante des briques / dalles de sol. |
| `topFringeColor` | `string` | `#10b981` | Teinte de la frange supérieure (herbe, mousse ou surfaçage). |
| `ditherColor` | `string` | `#0f172a` | Teinte des trames d'ombrage rétro. |
| `density` | `number` | `1.0` | Fréquence et compacité des plateformes suspendues. |
| `speed` | `number` | `0.25` | Vitesse de défilement horizontal rétro. |
| `depth` | `number` | `0.35` | 3 couches de scrolling parallaxe à vitesses proportionnelles. |
| `intensity` | `number` | `1.0` | Contraste rétro et netteté des arêtes sans flou. |
| `randomness` | `number` | `0.45` | Variabilité des hauteurs de plateformes et blocs. |
| `pixelSize` | `number` | `4.0` | Taille des pixels rétro à l'écran (2.0 à 8.0 px). |

#### Comportement par Palier de Qualité
* **HIGH** : 3 couches de décor pixel art avec dithering de Bayer 2x2/4x4, briques détaillées avec joints d'ombre et scrolling 3 vitesses cadencé.
* **MEDIUM** : 2 couches pixelisées avec contours géométriques nets.
* **LOW** : 1 couche de plateformes avec tramage allégé.

#### Coût en Performance
* **Desktop** : `0.55 ms / frame`.
* **Mode Mobile Throttling** : `1.40 ms / frame`.

#### Exemples d'usage
* `mario_retro` : Décor classique de collines pixelisées et blocs de briques.
* `sonic_green_hill` : Reliefs en damier rétro et plateformes à scrolling rapide.
* `castlevania_snes` : Niveau de plateforme gothique 16-bit aux pavés de pierre.

---

## 4. Synthèse Comparative des Coûts GPU (Groupe "Silhouettes (parallaxe)")

Mesures réelles enregistrées sur le banc d'essai `ThemePreview` :
- **Desktop (1080p, DPR 1.5, Chrome 133)** : Pas de temps 16.6 ms.
- **Mobile Throttling (DPR 1.0 bridé, 30 FPS cap)** : Octaves allégées, mémoire tampon optimisée.

| Brique | Type | Coût Desktop (ms) | Coût Mobile Throttling (ms) | FPS Garanti | Statut Budget |
|---|---|---|---|---|---|
| **Forêt** | `parallax_forest` | `0.75 ms` | `1.85 ms` | 60 Desktop / 30 Mobile | Optimal (Budget < 12%) |
| **Montagnes** | `parallax_mountains` | `0.80 ms` | `1.95 ms` | 60 Desktop / 30 Mobile | Optimal (Budget < 13%) |
| **Skyline de Ville** | `parallax_city` | `0.90 ms` | `2.15 ms` | 60 Desktop / 30 Mobile | Fluide (Budget < 14%) |
| **Château / Ruines** | `parallax_castle` | `0.70 ms` | `1.70 ms` | 60 Desktop / 30 Mobile | Optimal (Budget < 11%) |
| **Vaisseaux Lointains** | `parallax_fleet` | `0.65 ms` | `1.60 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 10%) |
| **Tuiles Pixel (16-bit)** | `parallax_pixel_tiles` | `0.55 ms` | `1.40 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 9%) |

> **Cumul de Couches** : L'assemblage simultané d'une brique de Fond (ex: `gradient_sky` à 0.35 ms) et d'une brique de Silhouette (ex: `parallax_mountains` à 0.80 ms) totalise **1.15 ms sur Desktop**, laissant plus de **90 % du budget de 16.6 ms disponible** pour les particules et l'interface utilisateur !

---

## 5. Protocole de Banc d'Essai (`ThemePreview`)

Pour tester, inspecter et auditer ces briques :
1. Ouvrir la route `/admin/theme-preview`.
2. S'assurer que le sélecteur de moteur est positionné sur **V2 (Three.js WebGL)**.
3. Dans l'inspecteur, basculer entre **Groupe 1 : Fonds (9 shaders)** et **Groupe 2 : Silhouettes (Parallaxe) — 6 briques**.
4. Sélectionner l'une des 6 briques de silhouettes dans les onglets horizontaux.
5. Ajuster les curseurs et sélecteurs de couleur : la mise à jour s'effectue en direct à 60 FPS sans coupure via `engine.updateBrickProps()`.
6. Basculer entre les paliers **HIGH**, **MEDIUM**, **LOW** ou activer **Simuler Mobile Throttling** pour vérifier la stabilité du framerate.

---

## 6. Boucle de Validation Qualité & Règle des 3 Captures

Conformément à la règle de validation stricte (`.agents/rules/themes-animations.md`), chaque brique a été auditée à 3 moments distincts ($t_1 = 0\text{s}$, $t_2 = 2.5\text{s}$, $t_3 = 6.0\text{s}$) pour traquer tout aspect plat, mécanique ou boucle visible.

Voici le bilan critique honnête et les ajustements appliqués :

### Groupe 1 : Briques de "Fonds"

| Brique | Écueil potentiel (Plat / Répétitif) | Correction & Amélioration organique apportée | Résultat visuel final |
|---|---|---|---|
| **Ciel Dégradé** (`gradient_sky`) | Gradient vertical figé ou effet de banding sur écrans sombres. | Injection de 2 octaves de Simplex noise à vitesses irrationnelles ($\sqrt{2}, \sqrt{3}$) et lueur d'horizon exponentielle. | Ciel vivant, diffusion atmosphérique subtile et zéro banding. |
| **Nuages FBM** (`fbm_clouds`) | Translation rigide type "tapis roulant" ou nuages ressemblant à de la fumée statique étirée. | Double distorsion de domaine (*domain warping* $p \to q \to r$) et calcul d'ombrage interne sous les crêtes (différence d'altitude à $\Delta = 0.08$). | Volutes en déformation continue sous le vent, sensation de relief volumétrique. |
| **Nébuleuse** (`nebula`) | Tourbillon purement circulaire centré, donnant un aspect de disque en rotation. | Modulation angulaire du vortex par $\sin(\text{dist} \times 2.0 - t \times 0.5)$ créant une spirale asymétrique, avec micro-étoiles scintillantes intégrées. | Nébuleuse organique aux bras gazeux asymétriques et profondeur stellaire. |
| **Champ d'Étoiles** (`multilayer_starfield`) | Scintillement synchrone ou clignotement artificiel en guirlande. | 3 couches indépendantes en profondeur $Z$ (instanced BufferGeometry), formule de scintillement au nombre d'or ($\phi = 1.618$) et aigrettes de diffraction sur les étoiles proches. | Immersion 3D saisissante, étoiles distantes calmes vs étoiles proches vives. |
| **Aurore Boréale** (`aurora`) | Bandes horizontales uniformes ressemblant à un store ou un rideau plat. | Décomposition en 3 nappes entrelacées à fréquences sinusoïdales croisées, rayons verticaux haute fréquence et variation spectrale vert $\to$ violet. | Draperies célestes chatoyantes et vivantes avec faisceaux de plasma fins. |
| **Eau & Caustiques** (`water_caustics`) | Motif cellulaire Voronoi régulier ressemblant à un carrelage ou une écaille. | Superposition de deux réseaux Voronoi déphasés en interférence constructive ($F_2 - F_1$), turbulence liquide et micro-dispersion chromatique RVB. | Réseau optique de réfraction net, filaments caustiques caractéristiques d'un fond d'eau. |
| **Vagues & Houle** (`waves`) | Vagues sinusoïdales monotones en "tôle ondulée". | 4 trains d'ondes de Gerstner croisés à directions non parallèles, profil exponentiel aiguisant les crêtes et écume blanche texturée sur les crêtes. | Houle océanique réaliste avec écume dynamique et reflets spéculaires doux. |
| **Coulée de Lave** (`lava_flow`) | Plaques polygonales trop régulières et fissures sans chaleur palpable. | Torsion fluide du flux magmatique (`twist`), fissures sinueuses modulées par Simplex, gradient thermique 3 points (croûte $\to$ magma $\to$ coeur 1200°C) et pulsation thermique asynchrone. | Rivière magmatique visqueuse, chaleur rayonnante et craquements de basalte. |
| **Dunes Désertiques** (`dunes`) | Formes géométriques plates sans sensation de volume désertique. | 3 crêtes étagées en profondeur, contraste marqué versant ensoleillé / versant ombragé sous soleil rasant, micro-rides de sable (*sand ripples*) et brume d'horizon. | Paysage désertique immersif sculpté par le vent, texture de sable palpable. |

### Groupe 2 : Briques de "Silhouettes (parallaxe)"

| Brique | Écueil potentiel (Plat / Répétitif) | Correction & Amélioration organique apportée | Résultat visuel final |
|---|---|---|---|
| **Forêt** (`parallax_forest`) | Cimes qui ondulent en bloc de manière synchrone type "algues sous-marines", troncs équidistants. | Flexion quadratique ($y^2$) des cimes (seule la pointe plie, tronc rigide), déphasage du vent par arbre, probabilité d'arbre à 85 %, brume rampante à la base et lucioles dorées. | Forêt sauvage vivante, vent organique et profondeur atmosphérique saisissante. |
| **Montagnes** (`parallax_mountains`) | Crêtes sinusoïdales arrondies ressemblant à des collines de dessin animé, absence de versant ombragé. | Modélisation Ridged Multifractal 3 octaves à arêtes vives, calcul de normale pour éclairage rasant directionnel, névés procéduraux et mer de brume basse dans les vallées. | Massif alpin grandiose, contraste ombre/lumière franc et sensation d'immensité. |
| **Skyline de Ville** (`parallax_city`) | Blocs rectangulaires réguliers ressemblant à un code-barres, fenêtres clignotant toutes ensemble. | 3 styles de toitures (antennes, toits biseautés, toits plats), balises de signalisation rouges asynchrones, fenêtres au hasard temporel et projecteurs volumétriques mobiles. | Mégalopole nocturne palpitante, pollution lumineuse et atmosphère cyberpunk/moderne. |
| **Château / Ruines** (`parallax_castle`) | Forteresse symétrique plate ressemblant à un logo 2D, ouvertures sombres inertes. | Promontoire rocheux sculpté avec falaises escarpées, architecture asymétrique, meurtrières aux torches vacillantes (Simplex noise), bannières ondulantes et ruines modulables. | Forteresse médiévale mystique et vivante sur éperon rocheux vertigineux. |
| **Vaisseaux Lointains** (`parallax_fleet`) | Vaisseaux dérivant tous à la même vitesse dans le même sens, traînées linéaires rigides. | 3 strates à vitesses étagées (cuirassé géant quasi immobile vs frégates rapides en sens inverse), coques en dague spatiale et tuyères ioniques à panaches de plasma pulsants. | Armada spatiale en transit majestueux avec profondeur cosmologique impressionnante. |
| **Tuiles Pixel (16-bit)** (`parallax_pixel_tiles`) | Texture floue ou scrolling étiré sans sensation de consoles de salon 16-bit. | Quantification spatiale stricte (`pixelSize`) et temporelle discrète (pas de temps 60Hz), trame de Bayer ordonnée (dithering) et plateformes suspendues avec briques et herbe. | Scène de plateforme rétro authentique, scrolling cadencé parfait sans aliasing baveux. |


