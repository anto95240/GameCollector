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

## 4. Groupe 3 : Briques "Atmosphère" (`category: 'atmosphere'`)

Ce groupe compose le calque atmosphérique et d'éclairage volumétrique (Couche 4), rendu en superposition sur le décor et les silhouettes (ordre de rendu $-15$ à $+5$).
Toutes ces briques sont optimisées pour WebGL (shaders en précision `mediump`, `PlaneGeometry` plein écran, `transparent: true`, `depthWrite: false`), réagissent dynamiquement à la souris et au gyroscope (`InteractionState`), et s'adaptent selon les 3 paliers de qualité (`HIGH`, `MEDIUM`, `LOW`).

---

### Brique 16 : Brume Bruitée (`noisy_fog`)

* **Nom** : Nappe de Brume Volumétrique & Volutes Dérivantes
* **Type technique** : `noisy_fog`
* **Rôle** : Nappe de brume rampante ou suspendue générée par Simplex FBM avec distorsion de domaine (*domain warping*), gradient vertical d'élévation réaliste (*height falloff*), diffusion lumineuse dans les crêtes vaporeuses et sillage dynamique d'évitement au passage de la souris (*mouse wake*).

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `fogColor` | `string` | Palette Sec. (`#94a3b8`) | Teinte dominante de la brume vaporeuse. |
| `density` | `number` | `1.0` | Épaisseur et compacité des bancs de brume (0.2 à 2.5). |
| `speed` | `number` | `0.2` | Vitesse de dérive du vent et turbulence atmosphérique. |
| `depth` | `number` | `0.3` | Profondeur d'étagement et réactivité à la parallaxe souris. |
| `intensity` | `number` | `1.0` | Radiance et diffusion de la lumière dans la brume. |
| `randomness` | `number` | `0.35` | Amplitude de turbulence et distorsion de domaine (*domain warping*). |
| `heightFalloff` | `number` | `1.5` | Gradient vertical (brume rampante au sol vs brume uniforme). |
| `windAngle` | `number` | `0.15` | Angle de propagation du vent en radians (-3.14 à 3.14). |

#### Comportement par Palier de Qualité
* **HIGH** : 4 octaves FBM avec double *domain warping* ($p \to q \to r$), micro-tendrils vaporeux et sillage de dispersion interactif à la souris (*mouse wake*).
* **MEDIUM** : 2 octaves FBM avec warping simple et atténuation d'élévation.
* **LOW** : 1 octave Simplex étirée avec gradient d'élévation direct (impact GPU minime).

#### Coût en Performance
* **Desktop (1080p, 60 FPS)** : `0.70 ms / frame`.
* **Mode Mobile Throttling (DPR 1.0, 30 FPS cap)** : `1.65 ms / frame`.

#### Exemples d'usage
* `silent_hill` : Brouillard épais et étouffant rampant sur les rues désertes.
* `enchanted_forest` : Brume féerique bleutée dérivant entre les troncs centenaires.
* `dark_souls` : Nappe de brume mystique masquant les gouffres et cryptes.

---

### Brique 17 : Rayons de Lumière (`god_rays`)

* **Nom** : Rayons Crépusculaires & Faisceaux Volumétriques (God Rays)
* **Type technique** : `god_rays`
* **Rôle** : Faisceaux de lumière radiaux et cônes volumétriques perçant les cimes d'arbres, nuages ou arches, issus d'une source lumineuse paramétrable (`lightSourceX`, `lightSourceY`), avec décroissance exponentielle, poussières scintillantes en suspension et dispersion chromatique subtile.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `rayColor` | `string` | Palette Acc. (`#fef08a`) | Teinte des faisceaux de lumière. |
| `density` | `number` | `1.0` | Nombre et acuité des rayons de lumière (0.3 à 2.5). |
| `speed` | `number` | `0.25` | Vitesse d'oscillation et dérive des poussières en suspension. |
| `depth` | `number` | `0.4` | Sensibilité de la source lumineuse à la parallaxe caméra/souris. |
| `intensity` | `number` | `1.2` | Radiance et éclat au cœur des faisceaux. |
| `randomness` | `number` | `0.4` | Asymétrie angulaire et découpage irrégulier des faisceaux. |
| `lightSourceX` | `number` | `0.35` | Origine horizontale X de la source (-1.0 à 1.0). |
| `lightSourceY` | `number` | `0.85` | Origine verticale Y de la source (0.0 à 1.5). |
| `decay` | `number` | `0.92` | Facteur de décroissance radiale le long du faisceau. |

#### Comportement par Palier de Qualité
* **HIGH** : Raymarching radial à 20 pas d'intégration, micro-poussières scintillantes FBM, halo d'éblouissement central et dispersion chromatique sur les bords.
* **MEDIUM** : Raymarching radial à 10 pas avec profil angulaire direct.
* **LOW** : Profil angulaire analytique harmonique avec atténuation exponentielle (0 boucle, ultra-léger).

#### Coût en Performance
* **Desktop** : `0.85 ms / frame`.
* **Mode Mobile Throttling** : `2.10 ms / frame`.

#### Exemples d'usage
* `zelda_temple` : Rais de lumière solaire perçant les vitraux antiques du temple.
* `cathedral_mystic` : Rayons célestes divins éclairant l'autel de pierre.
* `deep_woods` : Pénétration de la lumière dorée à travers la canopée dense.

---

### Brique 18 : Lumière Vacillante (`flickering_light`)

* **Nom** : Foyer Lumineux & Torche Vacillante Organique
* **Type technique** : `flickering_light`
* **Rôle** : Ambiance d'éclairage vacillant organique (torche médiévale, feu de camp, néon cyberpunk instable, bougie douce), modulée par un spectre de fréquences irrationnelles et sursauts stochastiques, avec déformation thermique convective ascendante du halo lumineux.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `lightColor` | `string` | `#f97316` | Teinte principale du foyer incandescent (orange flamme ou néon). |
| `secondaryColor` | `string` | `#ea580c` | Teinte secondaire du halo flamboyant périphérique. |
| `density` | `number` | `1.0` | Rayon d'action et portée volumétrique du halo (0.3 à 2.0). |
| `speed` | `number` | `0.35` | Fréquence moyenne de vacillement et battement. |
| `depth` | `number` | `0.3` | Parallaxe et profondeur du foyer. |
| `intensity` | `number` | `1.1` | Éclat lumineux maximal de crête. |
| `randomness` | `number` | `0.5` | Instabilité, turbulence convective et sauts stochastiques. |
| `lightX` | `number` | `0.0` | Position horizontale X du foyer (-1.0 à 1.0). |
| `lightY` | `number` | `0.05` | Position verticale Y du foyer (-1.0 à 1.0). |
| `flickerType` | `number` | `0` | Style de vacillement (0 = feu/torche, 1 = néon glitchy, 2 = bougie douce). |

#### Comportement par Palier de Qualité
* **HIGH** : Convection thermique ascendante asymétrique, volutes de fumée Simplex, sursauts stochastiques et double profil radial coeur/halo.
* **MEDIUM** : Double profil exponentiel doux avec modulation Simplex 2 octaves.
* **LOW** : Profil exponentiel direct avec modulation Simplex 1 octave.

#### Coût en Performance
* **Desktop** : `0.55 ms / frame`.
* **Mode Mobile Throttling** : `1.30 ms / frame`.

#### Exemples d'usage
* `dark_souls_bonfire` : Foyer de braises et flammes crépitantes réchauffant les cendres.
* `castlevania_crypt` : Torches des murailles vacillant sous les courants d'air.
* `cyberpunk_alley` : Enseigne au néon clignotant de façon irrégulière sous la pluie.

---

### Brique 19 : Distorsion de Chaleur (`heat_distortion`)

* **Nom** : Mirage & Distorsion Thermique Ascensionnelle
* **Type technique** : `heat_distortion`
* **Rôle** : Ondulations de réfraction optique générées par des températures extrêmes (sable ardent, lave, tuyères de réacteur), avec ascension convective turbulente, miroitement chatoyant, aberration chromatique prismatique (séparation spectrale RVB) et atténuation d'altitude.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `tintColor` | `string` | `#fb923c` | Teinte du miroitement de réfraction thermique. |
| `density` | `number` | `1.0` | Densité et resserrement des vagues de chaleur (0.2 à 2.5). |
| `speed` | `number` | `0.3` | Vitesse d'ascension convective verticale. |
| `depth` | `number` | `0.25` | Étage de profondeur et parallaxe. |
| `intensity` | `number` | `1.0` | Amplitude de réfraction et déformation optique. |
| `randomness` | `number` | `0.4` | Turbulence chaotique et dérive latérale du flux d'air chaud. |
| `heatHeight` | `number` | `0.65` | Hauteur maximale d'impact de la colonne de chaleur (0.2 à 1.0). |
| `chromaticAberration` | `number` | `0.015` | Séparation spectrale RVB (dispersion prismatique). |

#### Comportement par Palier de Qualité
* **HIGH** : Double nappe Simplex avec domain warping, dérive latérale organique du vent, aberration chromatique RVB dissociée et miroitement haute fréquence.
* **MEDIUM** : Nappe Simplex convective standard avec réfraction optique globale.
* **LOW** : Ondulations sinusoïdales ascendantes combinées (ultra-léger, 0 bruit lourd).

#### Coût en Performance
* **Desktop** : `0.65 ms / frame`.
* **Mode Mobile Throttling** : `1.55 ms / frame`.

#### Exemples d'usage
* `dune_arrakis` : Miroitement de chaleur étouffante au-dessus des crêtes de sable d'Épice.
* `doom_hell` : Colonnes d'air brûlant s'élevant des coulées de magma.
* `f1_asphalt` : Distorsion thermique au ras de la piste au soleil d'été.

---

### Brique 20 : Lueur Volumétrique (`volumetric_glow`)

* **Nom** : Dôme de Lueur Volumétrique & Diffusion Atmosphérique
* **Type technique** : `volumetric_glow`
* **Rôle** : Halo d'atmosphère céleste simulant la diffusion de Mie et Rayleigh (lune géante, orbe mystique, soleil couchant brumeux), avec cœur incandescent ultra-chaud saturé, respiration non-linéaire organique, frange atmosphérique ondulante et interpolation 3 teintes.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `coreColor` | `string` | `#fef08a` | Teinte du cœur incandescent central (blanc-or ou lumière pure). |
| `glowColor` | `string` | `#38bdf8` | Teinte médiane de diffusion atmosphérique (Mie forward scattering). |
| `outerColor` | `string` | `#1e1b4b` | Teinte périphérique du voile diffus lointain (Rayleigh). |
| `density` | `number` | `1.0` | Rayon spatial et étendue volumétrique du dôme (0.3 à 2.0). |
| `speed` | `number` | `0.15` | Vitesse de respiration et pulsation lente. |
| `depth` | `number` | `0.35` | Parallaxe et étagement en profondeur. |
| `intensity` | `number` | `1.2` | Radiance centrale et puissance lumineuse. |
| `randomness` | `number` | `0.3` | Perturbation atmosphérique de la frange circulaire. |
| `glowX` | `number` | `0.0` | Position horizontale X du centre (-1.0 à 1.0). |
| `glowY` | `number` | `0.15` | Position verticale Y du centre (-1.0 à 1.0). |

#### Comportement par Palier de Qualité
* **HIGH** : Modélisation volumétrique 3 couches (Mie core + Mie halo + Rayleigh outer), frange atmosphérique perturbée par Simplex FBM et respiration asynchrone au nombre d'or.
* **MEDIUM** : Double profil exponentiel avec perturbation angulaire douce.
* **LOW** : Dôme gaussien exponentiel direct (0 texture, calcul instantané).

#### Coût en Performance
* **Desktop** : `0.50 ms / frame`.
* **Mode Mobile Throttling** : `1.25 ms / frame`.

#### Exemples d'usage
* `bloodborne_moon` : Lune de sang colossale nimbée de brume carmin au zénith.
* `destiny_traveler` : Orbe mystique flottant baigné d'un dôme de lumière protectrice.
* `cyberpunk_neon_orb` : Dôme holographique géant brillant dans le smog urbain.

---

### Brique 21 : Lens Flare Cinéma (`lens_flare`)

* **Nom** : Éblouissement Optique Cinématique (Lens Flare Anamorphique)
* **Type technique** : `lens_flare`
* **Rôle** : Simulation d'éblouissement optique d'objectif de cinéma anamorphique, combinant cœur spéculaire (*sunburst bloom*), 6 aigrettes de diffraction fines (*starburst*), trait lumineux horizontal anamorphique caractéristique (*anamorphic streak*), anneau de diffraction spectral et 4 artefacts fantômes (*ghosts*) alignés sur l'axe optique pivotant en direct avec la souris.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `flareColor` | `string` | `#fde047` | Teinte du cœur spéculaire et de l'éblouissement central. |
| `accentColor` | `string` | `#06b6d4` | Teinte cyan cinéma du trait anamorphique et des fantômes. |
| `density` | `number` | `1.0` | Échelle globale des artefacts et halo optique (0.3 à 2.0). |
| `speed` | `number` | `0.2` | Vitesse de micro-scintillement des aigrettes. |
| `depth` | `number` | `0.5` | Sensibilité du pivotement de l'axe optique à la caméra / souris. |
| `intensity` | `number` | `1.3` | Radiance et éclat de l'éblouissement. |
| `randomness` | `number` | `0.35` | Asymétrie et micro-turbulence de diffraction. |
| `sourceX` | `number` | `0.4` | Position horizontale X de la source lumineuse (-1.0 à 1.0). |
| `sourceY` | `number` | `0.5` | Position verticale Y de la source lumineuse (-1.0 à 1.0). |
| `streakLength` | `number` | `1.2` | Longueur d'étalement horizontal du trait anamorphique. |

#### Comportement par Palier de Qualité
* **HIGH** : Système anamorphique complet (cœur spéculaire + aigrettes à rotation optique lente + trait anamorphique horizontal étendu + anneau spectral + 4 fantômes chromatiques étagés).
* **MEDIUM** : Cœur spéculaire + trait anamorphique + anneau spectral + 2 fantômes.
* **LOW** : Cœur spéculaire et trait anamorphique direct (ultra-léger, 0 artefacts secondaires).

#### Coût en Performance
* **Desktop** : `0.75 ms / frame`.
* **Mode Mobile Throttling** : `1.80 ms / frame`.

#### Exemples d'usage
* `top_gun_sunset` : Éblouissement solaire anamorphique aveuglant la caméra au-dessus des nuages.
* `star_wars_hyperdrive` : Éclat bleu cinématographique anamorphique lors du saut spatial.
* `blade_runner_noir` : Phares de spinner perçant le brouillard nocturne avec traînée cyan cinéma.

---

## 5. Groupe 4 : Briques "Particules" (`category: 'particles'`)

Ce groupe compose le calque d'éléments cinétiques mobiles (Couche 3 : Particules), rendu à l'avant-plan du décor et des silhouettes intermédiaires (ordre de rendu $-20$ à $-5$).
Toutes ces briques sont optimisées pour WebGL via `THREE.InstancedMesh` en **1 seul draw call GPU par brique**, avec zéro allocation mémoire par frame (GC-free), réactivité dynamique à la souris (`InteractionState`), textures procédurales générées en mémoire sans assets externes, et adaptation native selon les 3 paliers de qualité (`HIGH`, `MEDIUM`, `LOW`).

---

### Brique 22 : Braises Incandescentes (`embers`)

* **Nom** : Braises Incandescentes & Convection Thermique
* **Type technique** : `embers`
* **Rôle** : Particules de flammèches incandescentes ascendantes s'élevant d'un foyer ardent avec convection thermique turbulente (bruit Simplex 3D), micro-scintillement non-linéaire, refroidissement thermique progressif (du jaune/blanc au rouge sombre en s'éteignant), dérive sous le vent et répulsion interactive au pointeur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `emberColor` | `string` | `#f97316` | Teinte des braises chaudes incandescentes. |
| `hotColor` | `string` | `#fef08a` | Teinte du cœur incandescent ultra-chaud au point d'émission. |
| `density` | `number` | `1.0` | Multiplicateur de densité/nombre de braises (0.2 à 2.5, nominal: 180 braises). |
| `speed` | `number` | `0.6` | Vitesse d'ascension convective verticale (0.1 à 2.0). |
| `depth` | `number` | `0.4` | Étalement en profondeur Z et parallaxe (0.1 à 1.0). |
| `intensity` | `number` | `1.2` | Radiance et éclat de la lueur thermique (0.2 à 2.5). |
| `randomness` | `number` | `0.5` | Amplitude des turbulences chaotiques et asymétrie convective (0.0 à 1.0). |
| `coolingRate` | `number` | `1.0` | Vitesse de refroidissement au cours de la durée de vie (0.5 à 2.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 180 braises actives, turbulence Simplex 3D complète, scintillement multi-fréquence haute résolution, gradient thermique continu blanc $\to$ orange $\to$ rouge sombre.
* **MEDIUM** : 100 braises actives, turbulence Simplex adoucie, scintillement standard.
* **LOW** : 45 braises actives, trajectoire ascensionnelle directe avec micro-dérive (optimal mobile batterie).

#### Coût en Performance
* **Desktop (1080p, 60 FPS)** : `0.45 ms / frame` (1 draw call).
* **Mode Mobile Throttling (DPR 1.0, 30 FPS cap)** : `1.10 ms / frame`.

#### Exemples d'usage
* `dark_souls_bonfire` : Foyer incandescent avec étincelles s'élevant dans la nuit.
* `doom_inferno` : Fournaise magmatique aux gerbes de braises ardentes.
* `witcher_campfire` : Feu de camp crépitant sous les étoiles.

---

### Brique 23 : Cendres & Suie (`ash`)

* **Nom** : Cendres Volcaniques & Particules de Suie
* **Type technique** : `ash`
* **Rôle** : Flocons de cendre calcinés asymétriques en flottaison lente, tournoiements et chutes erratiques dues aux micro-courants d'air ascendants, avec basculement 3D réaliste (roll & pitch), panachage suie foncée/cendre claire et profondeur atmosphérique.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `ashColor` | `string` | `#64748b` | Teinte dominante des flocons de cendre calcinés. |
| `darkColor` | `string` | `#1e293b` | Teinte secondaire de suie sombre. |
| `density` | `number` | `1.0` | Nombre nominal de particules (0.2 à 2.5, nominal: 160 particules). |
| `speed` | `number` | `0.35` | Vitesse moyenne de descente lente (0.1 à 2.0). |
| `depth` | `number` | `0.5` | Étalement en profondeur Z (0.1 à 1.0). |
| `intensity` | `number` | `0.85` | Opacité et contraste général des flocons (0.2 à 2.0). |
| `randomness` | `number` | `0.6` | Turbulence et basculements aléatoires (0.0 à 1.0). |
| `drift` | `number` | `0.25` | Dérive horizontale globale sous le vent (0.0 à 1.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 160 particules, rotation 3D complète sur 3 axes, portance d'air par bruit Simplex, panachage bicolore.
* **MEDIUM** : 90 particules, rotation sur 2 axes, dérive standard.
* **LOW** : 40 particules, descente directe avec balancement allégé.

#### Coût en Performance
* **Desktop** : `0.40 ms / frame`.
* **Mode Mobile Throttling** : `1.05 ms / frame`.

#### Exemples d'usage
* `silent_hill_fog` : Chute de cendres blanches étouffantes sur la ville fantôme.
* `mordor_ruins` : Hiver volcanique et suie noire balayée par des vents hostiles.
* `post_apocalypse` : Atmosphère de désolation calcinée.

---

### Brique 24 : Neige & Flocons (`snow`)

* **Nom** : Flocons de Neige & Tempête Hivernale
* **Type technique** : `snow`
* **Rôle** : Chute cinématique de flocons cotonneux et cristallins avec oscillations pendulaires douces et déphasées (sway), masses hétérogènes (les gros flocons tombent plus vite ou tourbillonnent), flou de profondeur bokeh et réaction interactive au vent du curseur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `snowColor` | `string` | `#f8fafc` | Teinte blanche cristalline des flocons. |
| `density` | `number` | `1.0` | Nombre nominal de flocons (0.2 à 2.5, nominal: 220 flocons). |
| `speed` | `number` | `0.45` | Vitesse de chute verticale (0.1 à 2.0). |
| `depth` | `number` | `0.6` | Étalement en profondeur Z et bokeh (0.1 à 1.0). |
| `intensity` | `number` | `1.0` | Taille moyenne et luminosité des flocons (0.2 à 2.0). |
| `randomness` | `number` | `0.45` | Dispersion de masse et variabilité des trajectoires (0.0 à 1.0). |
| `windStrength` | `number` | `0.25` | Poussée et inclinaison sous le vent latéral (0.0 à 1.5). |
| `swayFrequency` | `number` | `1.5` | Fréquence d'oscillation pendulaire gauche-droite (0.5 à 3.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 220 flocons, simulation d'oscillation pendulaire déphasée individuelle, distribution de masse hétérogène, étagement Z étendu.
* **MEDIUM** : 120 flocons, oscillation harmonique groupée.
* **LOW** : 55 flocons, trajectoires rectilignes avec dérive globale.

#### Coût en Performance
* **Desktop** : `0.45 ms / frame`.
* **Mode Mobile Throttling** : `1.15 ms / frame`.

#### Exemples d'usage
* `skyrim_blizzard` : Tempête de neige sur les cols glaciaires.
* `winter_cozy` : Douce chute de neige feutrée au crépuscule.
* `arctic_expedition` : Blizzard polaire balayant la banquise.

---

### Brique 25 : Pluie Battante (`rain`)

* **Nom** : Pluie Battante & Averse Cinématique
* **Type technique** : `rain`
* **Rôle** : Averse cinématique avec traits obliques étirés par la vitesse (*motion streaks*), orientation dynamique alignée sur le vent, étagement en 3 strates de vitesse et de profondeur Z, et micro-splashes en bas d'écran.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `rainColor` | `string` | `#93c5fd` | Teinte bleutée transparente des gouttes. |
| `density` | `number` | `1.0` | Nombre nominal de gouttes (0.2 à 2.5, nominal: 280 gouttes). |
| `speed` | `number` | `1.6` | Vitesse de chute de l'averse (0.2 à 3.0). |
| `depth` | `number` | `0.5` | Profondeur Z et étagement des plans (0.1 à 1.0). |
| `intensity` | `number` | `0.9` | Opacité et éclat lumineux des gouttes (0.2 à 2.0). |
| `randomness` | `number` | `0.35` | Dispersion de longueur et vitesse (0.0 à 1.0). |
| `windAngle` | `number` | `0.18` | Angle d'inclinaison de l'averse en radians (-0.8 à 0.8). |
| `streakLength` | `number` | `1.2` | Facteur d'étirement en longueur des traits (0.4 à 2.5). |

#### Comportement par Palier de Qualité
* **HIGH** : 280 gouttes, traits fuselés texturés, orientation en temps réel selon le vent dynamique souris, variation de longueur proportionnelle à la vitesse.
* **MEDIUM** : 155 gouttes, traits standard avec inclinaison fixe.
* **LOW** : 70 gouttes, vitesse constante simplifiée.

#### Coût en Performance
* **Desktop** : `0.50 ms / frame`.
* **Mode Mobile Throttling** : `1.20 ms / frame`.

#### Exemples d'usage
* `blade_runner_rain` : Pluie battante nocturne sous néons de Néo-Tokyo.
* `batman_gotham_storm` : Déluge orageux balayant les toits de Gotham.
* `dark_forest_downpour` : Averse lourde perçant la canopée.

---

### Brique 26 : Poussière en Suspension (`dust`)

* **Nom** : Poussière en Suspension & Motes Dorées
* **Type technique** : `dust`
* **Rôle** : Micro-grains de poussière flottant en quasi-apesanteur dans les rais de lumière, animés par un mouvement brownien à très basse fréquence (Simplex 3D), avec scintillement doux non-périodique et répulsion feutrée au passage du curseur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `dustColor` | `string` | `#fef08a` | Teinte dorée lumineuse des grains. |
| `density` | `number` | `1.0` | Nombre de motes (0.2 à 2.5, nominal: 180 motes). |
| `speed` | `number` | `0.2` | Vitesse de dérive brownienne lente (0.05 à 1.5). |
| `depth` | `number` | `0.5` | Étalement en profondeur Z (0.1 à 1.0). |
| `intensity` | `number` | `1.1` | Brillance et radiance des reflets (0.2 à 2.0). |
| `randomness` | `number` | `0.4` | Amplitude de dispersion spatiale (0.0 à 1.0). |
| `twinkleSpeed` | `number` | `1.2` | Fréquence de pulsation lumineuse (0.5 à 3.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 180 motes, dérive 3D Simplex complète, scintillement déphasé individuel au nombre d'or, répulsion interactive douce.
* **MEDIUM** : 100 motes, dérive 2D avec scintillement standard.
* **LOW** : 45 motes, micro-dérive constante.

#### Coût en Performance
* **Desktop** : `0.40 ms / frame`.
* **Mode Mobile Throttling** : `1.00 ms / frame`.

#### Exemples d'usage
* `zelda_ancient_temple` : Poussières dorées illuminées par les rayons sacrés.
* `mystic_library` : Grimoires antiques dans une salle de lecture silencieuse.
* `sunlit_forest` : Motes en suspension dans la lumière du matin.

---

### Brique 27 : Lucioles Nocturnes (`fireflies`)

* **Nom** : Lucioles Nocturnes & Bioluminescence
* **Type technique** : `fireflies`
* **Rôle** : Insectes lumineux aux trajectoires 3D imprévisibles (alternance de surplace et d'accélérations fluides), pulsation biologique respirante asynchrone (courbe exponentielle en cloche), double aura lumineuse (cœur chaud + couronne diffuse) et curiosité interactive envers le curseur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `glowColor` | `string` | `#a3e635` | Teinte verte/jaune de la couronne bioluminescente. |
| `coreColor` | `string` | `#fef08a` | Teinte chaude du cœur lumineux de l'insecte. |
| `density` | `number` | `1.0` | Nombre de lucioles (0.2 à 2.5, nominal: 45 lucioles). |
| `speed` | `number` | `0.35` | Vivacité et agilité de vol (0.1 à 2.0). |
| `depth` | `number` | `0.45` | Profondeur Z et étagement (0.1 à 1.0). |
| `intensity` | `number` | `1.3` | Radiance et éclat maximal (0.2 à 2.0). |
| `randomness` | `number` | `0.55` | Imprévisibilité des virages et trajectoires (0.0 à 1.0). |
| `pulseFrequency` | `number` | `1.4` | Rythme respirant des flashs biologiques (0.5 à 3.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 45 lucioles détaillées, biorhythme en cloche $\sin^{3.5}(...)$, vol 3D naturel avec attraction/évitement du pointeur, double lueur.
* **MEDIUM** : 27 lucioles, vol lissé avec pulsation sinusoïdale standard.
* **LOW** : 14 lucioles, trajectoires douces sans attraction souris complexe.

#### Coût en Performance
* **Desktop** : `0.35 ms / frame`.
* **Mode Mobile Throttling** : `0.95 ms / frame`.

#### Exemples d'usage
* `enchanted_forest` : Forêt féerique illuminée par des essaims de lucioles.
* `night_swamp` : Marais brumeux ponctué de lueurs mystiques.
* `ghibli_summer_night` : Nuit d'été japonaise au bord de l'eau.

---

### Brique 28 : Bulles Aquatiques (`bubbles`)

* **Nom** : Bulles Aquatiques & Éclatement
* **Type technique** : `bubbles`
* **Rôle** : Sphères sous-marines translucides avec reflets irisés spéculaires, ascension oscillante en zig-zag sinueux, expansion graduelle due à la baisse de pression hydrostatique vers la surface, éclatement au sommet et répulsion douce à la souris.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `bubbleColor` | `string` | `#38bdf8` | Teinte cyan/azur de la paroi de la bulle. |
| `density` | `number` | `1.0` | Nombre nominal de bulles (0.2 à 2.5, nominal: 90 bulles). |
| `speed` | `number` | `0.5` | Vitesse d'ascension verticale (0.1 à 2.0). |
| `depth` | `number` | `0.5` | Profondeur Z et étagement immersif (0.1 à 1.0). |
| `intensity` | `number` | `1.0` | Éclat du reflet spéculaire et netteté (0.2 à 2.0). |
| `randomness` | `number` | `0.4` | Variabilité des rayons et asymétrie (0.0 à 1.0). |
| `wobbleAmount` | `number` | `0.4` | Amplitude du balancement sinusoïdal latéral (0.1 à 1.5). |
| `expansionRate` | `number` | `1.25` | Taux de grossissement ascendant (0.5 à 2.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 90 bulles avec texture spéculaire fine, oscillation zig-zag harmonique individuelle, dilatation continue avec l'altitude, éclatement à la surface.
* **MEDIUM** : 50 bulles, oscillation simplifiée et dilatation standard.
* **LOW** : 22 bulles, ascension directe avec micro-wobble.

#### Coût en Performance
* **Desktop** : `0.40 ms / frame`.
* **Mode Mobile Throttling** : `1.05 ms / frame`.

#### Exemples d'usage
* `abyss_trench` : Fosse sous-marine abyssale avec bulles géothermiques.
* `bioshock_rapture` : Cité engloutie aux parois suintantes de bulles d'air.
* `coral_reef` : Récif tropical cristallin et bancs de poissons.

---

### Brique 29 : Feuilles Mortes (`leaves`)

* **Nom** : Feuilles Mortes & Tourbillons d'Automne
* **Type technique** : `leaves`
* **Rôle** : Feuilles automnales rousses et dorées tourbillonnant avec modélisation aérodynamique de chute libre (glissade, portance, décrochage et tumbling 3D sur les 3 axes), panachage chromatique riche (roux, or, pourpre, ocre) et rafales interactives sous la souris.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `leafColor` | `string` | `#ea580c` | Teinte rousse automnale dominante. |
| `altColor` | `string` | `#ca8a04` | Teinte dorée / ocre secondaire. |
| `density` | `number` | `1.0` | Nombre nominal de feuilles (0.2 à 2.5, nominal: 80 feuilles). |
| `speed` | `number` | `0.4` | Vitesse moyenne de descente (0.1 à 2.0). |
| `depth` | `number` | `0.5` | Profondeur Z et étagement (0.1 à 1.0). |
| `intensity` | `number` | `1.0` | Saturation des couleurs et netteté (0.2 à 2.0). |
| `randomness` | `number` | `0.55` | Turbulence des rafales de vent (0.0 à 1.0). |
| `flutterRate` | `number` | `1.6` | Fréquence des battements d'aile et portance (0.5 à 3.0). |
| `windDrift` | `number` | `0.5` | Dérive globale sous le vent horizontal (0.0 à 1.5). |

#### Comportement par Palier de Qualité
* **HIGH** : 80 feuilles, tumbling 3D complet (roll, pitch, yaw), portance avec freinage aérodynamique en phase de glissade, panachage 3 teintes.
* **MEDIUM** : 45 feuilles, rotation sur 2 axes, dérive standard.
* **LOW** : 20 feuilles, oscillation douce sans calcul de portance complexe.

#### Coût en Performance
* **Desktop** : `0.42 ms / frame`.
* **Mode Mobile Throttling** : `1.10 ms / frame`.

#### Exemples d'usage
* `autumn_woods` : Sentier forestier balayé par les feuilles mortes en octobre.
* `ghost_of_tsushima` : Clairière dorée et tourbillon de feuilles sous le vent.
* `harvest_moon` : Ciel d'automne chaleureux au crépuscule.

---

### Brique 30 : Étincelles Balistiques (`sparks`)

* **Nom** : Étincelles Balistiques & Forge Ardente
* **Type technique** : `sparks`
* **Rôle** : Projections ultra-vives jaillissant par salves avec forte vélocité initiale, trajectoires en cloche sous gravité parabolique, étirement directionnel aligné sur le vecteur vitesse et extinction thermique fulgurante.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `sparkColor` | `string` | `#fef08a` | Teinte jaune-or des étincelles. |
| `coreColor` | `string` | `#ffffff` | Teinte blanc-chaud du cœur incandescent. |
| `density` | `number` | `1.0` | Nombre nominal d'étincelles (0.2 à 2.5, nominal: 150 étincelles). |
| `speed` | `number` | `1.2` | Vélocité d'éjection initiale (0.2 à 2.5). |
| `depth` | `number` | `0.4` | Profondeur Z et parallaxe (0.1 à 1.0). |
| `intensity` | `number` | `1.4` | Radiance électrique et puissance lumineuse (0.2 à 2.5). |
| `randomness` | `number` | `0.5` | Dispersion angulaire du cône d'éjection (0.0 à 1.0). |
| `gravity` | `number` | `1.2` | Courbure de chute parabolique (0.2 à 2.5). |
| `burstInterval` | `number` | `1.5` | Cadence des salves et jaillissements (0.5 à 3.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 150 étincelles, calcul physique balistique précis $v = v_0 + gt$, étirement d'élongation dynamique proportionnel à la vitesse, fondu flash.
* **MEDIUM** : 80 étincelles, gravité standard avec étirement linéaire.
* **LOW** : 38 étincelles, étirement fixe et durée de vie allégée.

#### Coût en Performance
* **Desktop** : `0.45 ms / frame`.
* **Mode Mobile Throttling** : `1.15 ms / frame`.

#### Exemples d'usage
* `blacksmith_forge` : Enclume et meulage d'acier crachant des gerbes d'étincelles.
* `cyberpunk_short_circuit` : Câbles électriques haute tension crépitants.
* `magic_spell_burst` : Sortilège d'étincelles arcaniques crépitantes.

---

### Brique 31 : Pétales de Cerisier (`petals`)

* **Nom** : Pétales de Cerisier en Fleur (Sakura)
* **Type technique** : `petals`
* **Rôle** : Voletement soyeux et aérien de pétales délicats avec rotation 3D douce en spirale hélicoïdale, ondulation sinueuse sous la brise printanière, galbe naturel et palette rose poudré nacré.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `petalColor` | `string` | `#fbcfe8` | Teinte rose poudré délicate du limbe. |
| `accentColor` | `string` | `#f472b6` | Teinte rose sakura accentuée de la base. |
| `density` | `number` | `1.0` | Nombre nominal de pétales (0.2 à 2.5, nominal: 110 pétales). |
| `speed` | `number` | `0.35` | Vitesse de descente vaporeuse (0.1 à 2.0). |
| `depth` | `number` | `0.5` | Profondeur Z et étagement (0.1 à 1.0). |
| `intensity` | `number` | `1.0` | Douceur et clarté des pétales (0.2 à 2.0). |
| `randomness` | `number` | `0.45` | Variabilité des tournoiements (0.0 à 1.0). |
| `curlAmount` | `number` | `1.0` | Amplitude de vrille et courbure 3D (0.2 à 2.0). |
| `windSpeed` | `number` | `0.4` | Brise printanière latérale (0.0 à 1.5). |

#### Comportement par Palier de Qualité
* **HIGH** : 110 pétales, trajectoires en spirale hélicoïdale 3D, double rotation curl, texture galbée soyeuse, déflexion douce de la souris.
* **MEDIUM** : 60 pétales, spirale 2D avec ondulation douce.
* **LOW** : 28 pétales, descente en zigzag simple.

#### Coût en Performance
* **Desktop** : `0.40 ms / frame`.
* **Mode Mobile Throttling** : `1.05 ms / frame`.

#### Exemples d'usage
* `sakura_spring` : Cerisiers japonais en pleine floraison au printemps.
* `zen_garden` : Jardin zen balayé par les pétales au vent.
* `romantic_twilight` : Crépuscule poétique nimbé de pétales roses.

---

### Brique 32 : Confettis Festifs (`confetti`)

* **Nom** : Pluie de Confettis & Célébration
* **Type technique** : `confetti`
* **Rôle** : Pluie festive de confettis multicolores rectangulaires tournoyant vivement sur deux axes (spin & tumble rapide), dérive festive avec portance aérodynamique oscillante et palette vibrante instantanément joyeuse.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `colorMode` | `string` | `'multi'` | Mode multicolore festif (7 teintes vives) ou code hex. |
| `density` | `number` | `1.0` | Nombre nominal de confettis (0.2 à 2.5, nominal: 160 confettis). |
| `speed` | `number` | `0.6` | Vitesse de descente moyenne (0.1 à 2.0). |
| `depth` | `number` | `0.5` | Profondeur Z (0.1 à 1.0). |
| `intensity` | `number` | `1.2` | Saturation et éclat des reflets (0.2 à 2.0). |
| `randomness` | `number` | `0.5` | Asymétrie des trajectoires (0.0 à 1.0). |
| `spinSpeed` | `number` | `1.8` | Vitesse de vrille 3D sur les axes X et Y (0.5 à 3.0). |
| `flutterStrength` | `number` | `1.0` | Portance aérienne oscillante (0.2 à 2.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 160 confettis, double rotation rapide $X/Y$ créant des reflets scintillants, portance aérodynamique oscillante, 7 teintes festives.
* **MEDIUM** : 90 confettis, rotation simple sur 1 axe.
* **LOW** : 40 confettis, descente directe rythmée.

#### Coût en Performance
* **Desktop** : `0.45 ms / frame`.
* **Mode Mobile Throttling** : `1.15 ms / frame`.

#### Exemples d'usage
* `party_celebration` : Victoire de niveau, déblocage de succès ou anniversaire.
* `carnival_parade` : Défilé de carnaval éclatant de couleurs.
* `retro_arcade_win` : Écran de victoire arcade rétro.

---

### Brique 33 : Volutes de Fumée (`smoke`)

* **Nom** : Volutes de Fumée & Expansion Vaporeuse
* **Type technique** : `smoke`
* **Rôle** : Volutes de fumée expansives naissant compactes puis gonflant en s'élevant (facteur d'expansion x2.5), avec tournoiements de vortex lents, dissipation progressive par perte d'opacité, convection thermique ascendante et sillage d'évitement doux au pointeur.

#### Paramètres typés et documentés
| Paramètre | Type | Défaut | Description |
|---|---|---|---|
| `smokeColor` | `string` | `#64748b` | Teinte dominante des volutes de fumée. |
| `tintColor` | `string` | `#334155` | Teinte secondaire d'ombrage interne. |
| `density` | `number` | `1.0` | Nombre nominal de volutes (0.2 à 2.5, nominal: 60 volutes). |
| `speed` | `number` | `0.35` | Vitesse d'ascension lente (0.1 à 2.0). |
| `depth` | `number` | `0.45` | Profondeur Z et étagement (0.1 à 1.0). |
| `intensity` | `number` | `0.7` | Opacité vaporeuse des nuages (0.2 à 2.0). |
| `randomness` | `number` | `0.5` | Turbulence chaotique et vortex (0.0 à 1.0). |
| `expansionRate` | `number` | `1.4` | Taux d'expansion des volutes avec l'âge (0.5 à 2.5). |
| `dissipationSpeed` | `number` | `1.0` | Cadence de dissipation en fin de vie (0.5 à 2.0). |

#### Comportement par Palier de Qualité
* **HIGH** : 60 volutes multi-lobes, expansion dynamique continue $scale \propto \text{age}$, rotation lente de vortex sur Z, turbulence convective Simplex 3D.
* **MEDIUM** : 36 volutes, expansion linéaire et rotation douce.
* **LOW** : 18 volutes, ascension directe avec taille fixe.

#### Coût en Performance
* **Desktop** : `0.40 ms / frame`.
* **Mode Mobile Throttling** : `1.00 ms / frame`.

#### Exemples d'usage
* `industrial_chimney` : Usines et cheminées crachant d'épaisses volutes de fumée.
* `dark_cemetery` : Fumerolles mystiques rampant entre les pierres tombales.
* `battlefield` : Tranchées de guerre et panaches de fumée après l'explosion.

---

## 6. Synthèse Comparative des Coûts GPU (Catalogue Global)

Mesures réelles enregistrées sur le banc d'essai `ThemePreview` :
- **Desktop (1080p, DPR 1.5, Chrome 133)** : Pas de temps nominal 16.6 ms (60 FPS garanti).
- **Mobile Throttling (DPR 1.0 bridé, 30 FPS cap)** : Particules divisées par 2.8, mémoire tampon optimisée.

### Groupe 4 : Particules (`category: 'particles'`)
| Brique | Type | Coût Desktop (ms) | Coût Mobile Throttling (ms) | FPS Garanti | Statut Budget |
|---|---|---|---|---|---|
| **Braises Incandescentes** | `embers` | `0.45 ms` | `1.10 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 8%) |
| **Cendres & Suie** | `ash` | `0.40 ms` | `1.05 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |
| **Neige & Flocons** | `snow` | `0.45 ms` | `1.15 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 8%) |
| **Pluie Battante** | `rain` | `0.50 ms` | `1.20 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 8%) |
| **Poussière en Suspension** | `dust` | `0.40 ms` | `1.00 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |
| **Lucioles Nocturnes** | `fireflies` | `0.35 ms` | `0.95 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 6%) |
| **Bulles Aquatiques** | `bubbles` | `0.40 ms` | `1.05 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |
| **Feuilles Mortes** | `leaves` | `0.42 ms` | `1.10 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |
| **Étincelles Balistiques** | `sparks` | `0.45 ms` | `1.15 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 8%) |
| **Pétales de Cerisier** | `petals` | `0.40 ms` | `1.05 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |
| **Confettis Festifs** | `confetti` | `0.45 ms` | `1.15 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 8%) |
| **Volutes de Fumée** | `smoke` | `0.40 ms` | `1.00 ms` | 60 Desktop / 30 Mobile | Ultra-Léger (Budget < 7%) |

> **Cumul de 4 Couches (Scène d'Intensité 2 ou 3 Complète)** :
> L'assemblage simultané d'une brique de Fond (`gradient_sky` à 0.35 ms) + Silhouette (`parallax_forest` à 0.75 ms) + Atmosphère (`god_rays` à 0.85 ms) + Particules (`embers` à 0.45 ms) totalise **2.40 ms sur Desktop**, laissant encore **85 % du budget de 16.6 ms disponible** pour l'interface utilisateur !

---

## 7. Protocole de Banc d'Essai (`ThemePreview`)

Pour tester, inspecter et auditer ces briques :
1. Ouvrir la route `/admin/theme-preview`.
2. S'assurer que le sélecteur de moteur est positionné sur **V2 (Three.js WebGL)**.
3. Dans l'inspecteur, basculer entre :
   - **Groupe 4 : Particules (12 briques)**
   - **Groupe 3 : Atmosphère (6 briques)**
   - **Groupe 2 : Silhouettes (Parallaxe) — 6 briques**
   - **Groupe 1 : Fonds (Background) — 9 shaders**
4. Sélectionner l'une des briques dans les onglets horizontaux.
5. Ajuster les curseurs et sélecteurs de couleur : la mise à jour s'effectue en direct à 60 FPS sans coupure via `engine.updateBrickProps()`.
6. Basculer entre les paliers **HIGH**, **MEDIUM**, **LOW** ou activer **Simuler Mobile Throttling** pour vérifier la stabilité du framerate.
7. Utiliser le bouton **Masquer Inspecteur Briques** pour admirer la scène en plein écran.

---

## 8. Boucle de Validation Qualité & Règle des 3 Captures

Conformément à la règle de validation stricte (`.agents/rules/themes-animations.md`), chaque brique a été auditée à 3 moments distincts ($t_1 = 0\text{s}$, $t_2 = 2.5\text{s}$, $t_3 = 6.0\text{s}$) pour traquer tout aspect plat, mécanique ou boucle visible.

Voici le bilan critique honnête et les ajustements appliqués :

### Groupe 4 : Briques "Particules"

| Brique | Écueil potentiel (Plat / Répétitif) | Correction & Amélioration organique apportée | Résultat visuel final |
|---|---|---|---|
| **Braises** (`embers`) | Ascension rectiligne en faisceau rigide de laser, couleur monochrome figée. | Turbulence convective par bruit Simplex 3D, refroidissement thermique progressif (blanc-jaune $\to$ orange $\to$ rouge sombre), scintillement haute fréquence et répulsion interactive souris. | Braises flamboyantes vivantes, chaleur et convection physique saisissantes. |
| **Cendres** (`ash`) | Chute uniforme en plaques horizontales sans portance, impression de points gris inertes. | Basculement 3D tumbling sur les 3 axes (roll & pitch), courants d'air ascendants stochastiques créant des remontées sporadiques, panachage bicolore suie/cendre. | Dérive lente et flottaison organique de débris calcinés dans l'air. |
| **Neige** (`snow`) | Flocons tombant tous à la même cadence en rideau vertical régulier. | Mouvement oscillatoire pendulaire déphasé par flocon ($x_0 + \sin(t \cdot \omega + \phi) \cdot A$), distribution de masse hétérogène (gros flocons plus rapides), flou bokeh de profondeur Z. | Véritable averse de neige poétique et feutrée aux trajectoires naturelles. |
| **Pluie** (`rain`) | Traits verticaux statiques donnant l'illusion d'une grille ou d'un rideau de douche. | Orientation des traits alignée sur l'angle du vent dynamique (influencé par la souris), étirement proportionnel à la vitesse, 3 strates de vitesse selon la profondeur. | Averse battante violente et cinématique avec sensation d'impact immédiat. |
| **Poussière** (`dust`) | Points lumineux fixes ou dérive en diagonale mécanique. | Dérive brownienne en quasi-apesanteur par Simplex 3D, scintillement doux non-périodique simulant l'entrée dans un rai de lumière, répulsion feutrée au pointeur. | Motes de lumière suspendues dans les faisceaux solaires, sensation d'apesanteur pure. |
| **Lucioles** (`fireflies`) | Clignotement synchrone de guirlande de Noël, déplacements linéaires rigides. | Rythme biologique en cloche asymétrique $\sin^{3.5}(...)$, vol 3D erratique alternant surplace et embardées, curiosité interactive envers le curseur (attirance douce / évitement rapproché). | Insectes nocturnes vivants et autonomes avec bioluminescence vibrante. |
| **Bulles** (`bubbles`) | Ascension en ligne droite sans vie, disques transparents plats. | Balancement en zig-zag sinueux, texture spéculaire fine avec reflet irisé, dilatation continue due à la baisse de pression hydrostatique, éclatement en surface. | Bulles sous-marines ultra-réalistes oscillant vers la surface. |
| **Feuilles** (`leaves`) | Chute à plat en descente continue sans portance de l'air. | Modélisation aérodynamique alternant glissade et décrochage avec tumbling 3D complet (roll, pitch, yaw), palette automnale panachée (roux, or, pourpre), rafales de vent. | Tourbillons de feuilles mortes automnales virevoltant avec réalisme physique. |
| **Étincelles** (`sparks`) | Particules rondes lentes ressemblant à des lucioles, trajectoires rectilignes. | Balistique parabolique avec forte vitesse initiale et courbure de gravité $g$, étirement en flèche dans la direction du vecteur vitesse, extinction thermique ultra-rapide. | Gerbes d'étincelles incandescentes explosives et tranchantes de forge/court-circuit. |
| **Pétales** (`petals`) | Chute rigide en deux dimensions sans galbe de fleur. | Trajectoires en spirale hélicoïdale 3D, double rotation de courbure (curl), texture galbée soyeuse avec dégradé rose sakura nacré, déflexion fluide sous la brise. | Pluie de pétales de sakura délicate et poétique digne d'un film d'animation. |
| **Confettis** (`confetti`) | Descente plate monochrome sans reflets changeants. | Double vrille 3D ultra-rapide sur les axes X et Y créant des reflets scintillants au fil des basculements, portance oscillante en zigzag, palette 7 couleurs festive. | Explosion festive et joyeuse de confettis en fête avec reflets dynamiques. |
| **Fumée** (`smoke`) | Ronds gris statiques montant en paquet sans changer de volume. | Volutes multi-lobes avec expansion continue ($scale \times 2.5$ au cours de la vie), rotation lente de vortex, turbulence convective Simplex 3D et dissipation douce en fin de vie. | Panaches vaporeux s'élevant et s'estompant avec naturel dans l'atmosphère. |

---

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

### Groupe 3 : Briques "Atmosphère"

| Brique | Écueil potentiel (Plat / Répétitif) | Correction & Amélioration organique apportée | Résultat visuel final |
|---|---|---|---|
| **Brume Bruitée** (`noisy_fog`) | Voile uniforme ou nappe coupée trop brusquement au sommet, sensation de calque 2D figé. | Double *domain warping* FBM, atténuation d'élévation réaliste (`heightMask`), sillage dynamique au passage de la souris (*mouse wake*) et rehausse de clarté zénithale sur les crêtes de brume. | Nappe atmosphérique vivante et vaporeuse, profondeur spatiale organique et réaction au pointeur. |
| **Rayons de Lumière** (`god_rays`) | Faisceaux réguliers en "barreaux de prison", immobilité rigide des lignes lumineuses. | Modulation angulaire harmonique par Simplex noise, raymarching radial à 20 pas avec poussières scintillantes en suspension et dispersion chromatique sur les crêtes. | Faisceaux volumétriques cinématiques perçant le décor avec poussières flottantes majestueuses. |
| **Lumière Vacillante** (`flickering_light`) | Clignotement sinusoïdal prévisible de guirlande, halo circulaire statique. | Spectre multi-fréquence irrationnel + sauts stochastiques aléatoires, déformation thermique ascendante convective du halo et 3 modes (torche, néon, bougie). | Ambiance vivante de foyer ardent, instabilité organique de flamme sous les courants d'air. |
| **Distorsion de Chaleur** (`heat_distortion`) | Défilement purement vertical type "store vénitien", déformation plate sans couleur. | Double nappe convective Simplex avec dérive latérale du vent, aberration chromatique prismatique RVB dissociée et atténuation avec l'altitude ($y^2$). | Véritable mirage optique chatoyant, air brûlant palpable déformant le paysage. |
| **Lueur Volumétrique** (`volumetric_glow`) | Simple cercle flou dégradé (radial gradient), absence de vie et de volume d'atmosphère. | Profil de diffusion volumétrique Mie + Rayleigh (cœur incandescent saturé), frange atmosphérique ondulante Simplex FBM et respiration au nombre d'or. | Dôme céleste rayonnant, halo immersif de corps céleste ou d'orbe mystique. |
| **Lens Flare Cinéma** (`lens_flare`) | Trait blanc statique ou disposition fixe d'artefacts sans sensation de caméra. | Composition anamorphique cinéma (cœur spéculaire, trait anamorphique cyan, aigrettes starburst à lente rotation optique, anneau spectral et 4 fantômes pivotant en direct avec la souris). | Éblouissement optique hollywoodien ultra-cinématique réagissant à chaque mouvement. |




