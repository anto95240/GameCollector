# Architecture du Moteur d'Animation des Thèmes (`theme-engine`)

> Date de conception : Octobre 2026  
> Statut : Document de référence architectural (Refonte intégrale des animations)  
> Périmètre : 276 thèmes de l'application GameCollector  
> Objectif : Rendu réaliste, organique et immersif, 60 FPS garanti sur PC milieu de gamme, 30 FPS minimum sur mobile.

---

## 1. Comparatif Technologique

L'audit préalable a démontré que le système précédent souffrait d'allocations massives par frame sur le CPU (Canvas 2D), d'une absence de prise en compte du ratio haute densité (`devicePixelRatio`), et d'une incapacité technique à reproduire des phénomènes organiques complexes (aurores boréales, brumes volumétriques, caustiques, distorsions) sans faire chuter le framerate.

Voici la comparaison détaillée des trois approches envisagées pour propulser les 276 thèmes du registre :

| Critère d'évaluation | (A) Canvas 2D Amélioré | (B) PixiJS / WebGL 2D | (C) Three.js / WebGL Contrôlé (Retenu) |
|---|---|---|---|
| **Réalisme atteignable** | **Faible à Moyen**<br>Pas d'accès aux fragment shaders natifs GPU. Les dégradés, bruits de Simplex et calculs trigonométriques tournent sur le CPU, saturant le fil d'exécution principal (`fillRect` avec gradients). Effets de lumière et de profondeur limités à de la 2D plate. | **Moyen à Bon**<br>Excellent pour le batching de sprites 2D et les filtres 2D (blur, displacement). Cependant, simuler la profondeur 2.5D et la perspective nécessite des projections manuelles complexes. Effets volumétriques 3D difficiles à composer proprement. | **Maximal (Cinématique)**<br>Exécution directe des calculs d'éclairage et de bruit procédural sur le GPU via fragment shaders (GLSL). Vraie caméra perspective 3D offrant une parallaxe naturelle avec décalage de profondeur ($z$-depth). Instancing matériel pour des milliers de particules sans coût CPU. |
| **Performance Mobile & Batterie** | **Problématique**<br>Le dessin CPU consomme énormément de batterie sur les écrans haute résolution (Retina/OLED à DPR 2-3). Pour tenir 30 FPS, il faut soit réduire drastiquement les éléments, soit flouter un canvas basse résolution étiré. | **Très Bonne**<br>Moteur WebGL 2D léger et rapide sur GPU. Excellente gestion du mobile pour le rendu 2D pur, mais la charge GPU grimpe vite dès que l'on empile plusieurs passes de filtres de convolution. | **Excellente & Optimisable (Smart Scaling)**<br>1 seul draw call par couche grâce à `InstancedMesh`. Shaders en précision `mediump`. Le CPU est totalement libéré (zéro allocation en boucle RAF). Cap de DPR adaptatif (bridé à 1.0 sur mobile, 1.5 sur desktop, 30 FPS cap sur mobile). |
| **Poids du Bundle & Dépendances** | **0 Ko**<br>API native du navigateur, aucune dépendance externe requise. | **~450 Ko minifié (~110-130 Ko gzip)**<br>Nouvelle dépendance externe lourde à importer, doublon potentiel avec les outils 3D déjà prévus. | **0 Ko de dépendance supplémentaire !**<br>`three` (v0.186), `@react-three/fiber` (v9.7) et `@react-three/drei` (v10.7) sont **DÉJÀ installés** dans `package.json`. Isolé dans un chunk dynamique dédié via Vite (`React.lazy`), l'impact sur le FCP initial est nul. |
| **Effort de configuration pour 276 thèmes** | **Très Élevé**<br>Chaque effet cinématique exige du code mathématique sur mesure en JS pour contourner les lenteurs du Canvas 2D. Risque majeur de fragmentation et de dette technique. | **Moyen**<br>Nécessite la mise en place d'un pipeline d'assets 2D ou de textures matricielles. La configuration déclarative des briques reste plus fastidieuse pour les effets volumétriques. | **Optimal (Architecture par Briques)**<br>Les thèmes ne contiennent **aucun code impératif**. Ce sont de pures structures de données déclarant l'assemblage de briques réutilisables (shaders de fond, particules instanciées, plans de parallaxe). Les briques mutualisent 100 % de la logique GPU. |
| **Maintenance & Pérennité** | **Moyenne**<br>Code "artisanal" à maintenir sur le long terme, gestion manuelle de la boucle RAF, du redimensionnement et des mémoires tampons. | **Risquée**<br>Ajoute un framework graphique supplémentaire dans une application qui possède déjà Three.js. Multiplication des contextes graphiques et dispersion des compétences de l'équipe. | **Élevée**<br>Three.js Vanilla encapsulé dans un hôte React : cycle de vie stable, contexte WebGL maintenu à 100%, libération directe des mémoires VRAM (`dispose()`), typage TypeScript strict de bout en bout. |

---

## 2. Recommandation & Justification

### Option Retenue : **Three.js Vanilla contrôlé dans un Hôte React Dédié (`ThemeEngineHost`)**

### Pourquoi Three.js Vanilla dans un Canvas Unique plutôt que R3F Declaratif JSX ?
1. **Pérennité du contexte WebGL (Règle d'or)** : Le contexte WebGL doit rester monté en permanence. Dans R3F (`<Canvas>`), les commutations d'arbres JSX peuvent déclencher des remontages partiels ou des recréations d'objets WebGL lors des mises à jour d'état React.
2. **Contrôle mémoire au micron près** : Avec une classe de runtime impérative (`ThemeEngine`), le nettoyage mémoire est direct et instantané lors du changement de thème (`mesh.geometry.dispose()`, `material.dispose()`, `texture.dispose()`).
3. **Zéro surcoût de réconciliation (React 19)** : La boucle d'animation tourne à 60 FPS directement sur l'API Three.js native sans traverser l'ordonnanceur de Fiber. React n'intervient que pour déclarer le changement d'ID de thème ou le mode Welcome.
4. **Shaders GPU & Instancing natif** : Les calculs de turbulence (bruits de Simplex) tournent sur le GPU. Une seule passe `InstancedMesh` gère des centaines de particules en 1 draw call sans GC pause.

---

## 3. Architecture Technique Détaillée

### 3.1 Arborescence cible : `src/theme-engine/`

```
src/theme-engine/
├── index.ts                         # Point d'entrée public (export de ThemeEngineHost, useThemeEngine)
├── types.ts                         # Schémas TypeScript complets (ThemeEngineConfig, BrickConfig, etc.)
├── ThemeEngineHost.tsx              # Composant hôte persistant en Portal body (garde le Canvas WebGL unique)
├── components/
│   ├── ContentShield.tsx            # Voile dynamique avec régulateur automatique de contraste WCAG AA
│   ├── WelcomeOverlay.tsx           # Overlay d'introduction cinématique (Welcome Thème synchronisé)
│   └── FallbackStatic.tsx           # Rendu de secours CSS / Canvas 2D minimal si WebGL indisponible
├── runtime/
│   ├── ThemeEngine.ts               # Moteur central Three.js Vanilla (WebGLRenderer, Scène, Caméra)
│   ├── QualityController.ts         # Gestionnaire adaptatif des paliers FPS (High / Medium / Low)
│   ├── InteractionManager.ts        # Traitement amorti (lerp) souris, gyroscope mobile et scroll
│   ├── TimeManager.ts               # Horloge universelle, coupure stricte RAF si onglet masqué
│   ├── ResourcePool.ts              # Cache et libération contrôlée (dispose) des géométries/matériaux
│   ├── ShaderCache.ts               # Répertoire partagé des fragments shaders compilés
│   └── WcagLuminance.ts             # Algorithme mathématique de contraste et régulation d'opacité
├── rare-events/
│   ├── RareEventManager.ts         # Moteur probabiliste d'événements rares (éclairs, météores, rafales)
│   └── types.ts                     # Interfaces des déclencheurs
├── bricks/                          # Registre modulaire des briques d'ambiance (Plugins)
│   ├── registry.ts                  # BrickRegistry (enregistrement, lookup et typage)
│   ├── base/
│   │   ├── BaseBrick.ts             # Classe de base pour toutes les briques Three.js
│   │   └── types.ts                 # Interfaces IBrickDefinition et IBrickInstance
│   ├── background/
│   │   ├── GradientSkyBrick.ts      # Ciel dégradé dynamique avec variation lumineuse
│   │   ├── StarfieldBrick.ts        # Champ stellaire avec scintillement GLSL procédural
│   │   └── HorizonMeshBrick.ts      # Silhouette lointaine / relief atmosphérique
│   ├── intermediate/
│   │   ├── ParallaxPlaneBrick.ts    # Plans de décor 2.5D décalés en profondeur
│   │   └── FloatingSilhouettes.ts   # Éléments dérivants (nuages, brumes basses)
│   ├── particles/
│   │   ├── InstancedParticlesBrick.ts # Braises, neige, bulles, poussières, pétales
│   │   ├── ConnectedConstellationBrick.ts # Réseau cybernétique optimisé (BufferGeometry)
│   │   └── StreamRibbonBrick.ts     # Rubans / filaments lumineux sinusoïdaux
│   ├── atmosphere/
│   │   ├── VolumetricFogBrick.ts    # Nappe de brume volumétrique (Simplex noise GLSL)
│   │   ├── AuroraCurtainBrick.ts    # Rideau d'aurore boréale ondulant (1 draw call, shader optimisé)
│   │   └── GodRaysBrick.ts          # Faisceaux et cônes de lumière volumétriques
│   └── overlay/
│       ├── VignetteGrainBrick.ts    # Grain de film cinématographique et vignettage doux
│       └── ScanlineHoloBrick.ts     # Lignes de balayage CRT ou grille holographique
└── configs/                         # Configurations déclaratives des 276 thèmes
    ├── index.ts                     # Loader dynamique (code-splitting par familles)
    ├── families/
    │   ├── classics.ts              # Thèmes basiques (Intensité 1 : neon_night, arctic_day...)
    │   ├── seasons.ts               # Thèmes saisonniers (halloween, christmas, spring...)
    │   ├── gaming.ts                # Univers de jeux vidéo (mario, sonic, zelda, pokemon...)
    │   ├── cinema.ts                # Films et séries (star_wars, indiana_jones, matrix...)
    │   ├── heroes.ts                # Super-héros et animation (batman, iron_man, pixar...)
    │   ├── universes.ts             # Univers fantastiques (Intensité 3 : harry_potter, lotr...)
    │   └── realworld.ts             # Monde réel (sport, automobile, cosmos)
    └── defaults.ts                  # Thème par défaut sécurisé (fallback garanti)
```

---

### 3.2 Schéma TypeScript de Configuration d'un Thème

Le schéma intègre l'**intensité intrinsèque**, le **profil Welcome Thème**, et le **régulateur automatique de contraste** :

```typescript
/**
 * src/theme-engine/types.ts
 */

export type ThemeFamily =
  | 'classics'
  | 'seasons'
  | 'gaming'
  | 'cinema'
  | 'heroes'
  | 'universes'
  | 'realworld'

/**
 * Intensité intrinsèque du thème (degré de réalisme et d'immersion) :
 * 1 = Ambiance subtile (thèmes classiques, minimalistes)
 * 2 = Scène complète (thèmes équilibrés avec élément signature actif)
 * 3 = Immersion cinématique maximale (univers riches type Harry Potter, Cyberpunk, Star Wars)
 */
export type AnimationIntensity = 1 | 2 | 3

export type LayerCategory =
  | 'background'      // Couche 1 : Fond, ciel, dégradé profond
  | 'intermediate'    // Couche 2 : Décors intermédiaires avec parallaxe
  | 'particles'       // Couche 3 : Éléments mobiles (particules, braises, gouttes)
  | 'atmosphere'      // Couche 4 : Lumière, brume volumétrique, aurore, rayons
  | 'overlay'         // Couche 5 : Grain cinéma, vignettage, bloom subtil

export interface BrickConfig<TProps = Record<string, unknown>> {
  id: string                          // Identifiant unique dans la scène
  brickType: string                   // Référence au catalogue de briques (ex: 'instanced_particles')
  enabled?: boolean
  renderOrder?: number                // Ordre de rendu dans la couche
  props: TProps                       // Propriétés spécifiques de la brique
}

export interface RareEventTrigger {
  id: string
  type: 'lightning' | 'shooting_star' | 'wind_gust' | 'light_flicker' | 'aurora_surge'
  minIntervalSeconds: number          // Temps minimum entre deux occurrences
  maxIntervalSeconds: number          // Temps maximum
  probability: number                 // 0 à 1 (chance par cycle d'évaluation)
  durationSeconds: number             // Durée de l'effet
  params: Record<string, unknown>      // Couleurs, intensités, cible de l'événement
}

export interface InteractionProfile {
  mouseParallaxStrength: number       // Facteur d'influence de la souris (ex: 0.15)
  scrollDepthFactor: number           // Facteur d'influence du défilement de page
  gyroscopeEnabled: boolean           // Réactivité à l'inclinaison mobile
  targetBrickId?: string              // Brique réagissant directement au pointeur
}

export interface ContentShieldConfig {
  autoRegulateWcag: boolean           // Si true, calcule automatiquement l'opacité selon le fond
  minContrastRatio?: number           // Ratio WCAG cible (4.5 par défaut pour AA)
  blurRadiusPx?: number               // Flou d'arrière-plan optionnel (backdrop-filter)
  tintColor?: string                  // Couleur d'atténuation optionnelle
}

export interface WelcomeIntroConfig {
  enabled: boolean
  titlePrefix?: string                // Ex: "Bienvenue à"
  titleDisplay: string                // Ex: "Poudlard" ou "Néo-Tokyo"
  googleFont?: {
    family: string
    url?: string
  }
  introAnimation: 'surge_particles' | 'aurora_sweep' | 'light_pulse' | 'shockwave' | 'scan_glitch'
  durationSeconds: number             // Typiquement 3.5 à 4 secondes
}

export interface ThemeSignatureElement {
  title: string                       // Ex: "Bougies flottantes de la Grande Salle", "Braises d'obsidienne"
  brickId: string                     // Brique associée
  description: string                 // Synthèse artistique
}

export interface ThemeEngineConfig {
  id: string                          // ID canonique issu de themeRegistry (ex: 'harry_potter', 'neon_night')
  family: ThemeFamily
  intrinsicIntensity: AnimationIntensity // Niveau 1, 2 ou 3 défini par la DA
  palette: {
    primary: string                   // Couleur dominante principale
    secondary: string                 // Teinte secondaire
    accent: string                    // Accent signature / reflets
    ambientLight: string              // Teinte de la lumière ambiante
    fogColor?: string                 // Teinte de brume / diffusion
  }
  signature: ThemeSignatureElement    // Élément signature unique (règle qualité)
  layers: {
    category: LayerCategory
    bricks: BrickConfig[]
  }[]
  rareEvents?: RareEventTrigger[]     // Événements rares et asynchrones
  interaction: InteractionProfile     // Profil d'interactivité
  contentShield: ContentShieldConfig  // Régulateur d'accessibilité WCAG AA
  welcomeIntro?: WelcomeIntroConfig   // Animation d'introduction à l'activation du thème
}
```

---

### 3.3 Système de Briques (Catalogue de Plugins)

Chaque brique est un plugin indépendant implémentant l'interface `IBrickInstance` :

```typescript
export interface IBrickInstance {
  init: (scene: THREE.Scene, camera: THREE.Camera) => void
  update: (delta: number, time: number, interaction: InteractionState, quality: QualityLevel) => void
  triggerEvent?: (event: RareEventTrigger) => void
  triggerIntro?: (introType: string, progress: number) => void
  dispose: () => void
}
```

* **Mutualisation totale** : Pour les 276 thèmes, seules **12 à 15 briques canoniques** sont nécessaires.
* **Exemple concret** : La brique `InstancedParticlesBrick` anime des braises volcaniques pour `lava`, des lucioles pour `enchanted_forest`, des flocons pour `winter`, des bulles pour `abyss`, ou des étincelles de magie pour `harry_potter`, simplement en changeant ses `props` (couleurs, vitesse $Y$, turbulence de bruit, forme de la particule).

---

### 3.4 Smart Scaling Mobile (Performance & Batterie)

Pour respecter la décision d'offrir la **meilleure expérience possible sans vider la batterie**, le moteur applique le **Smart Scaling Adaptatif** :

1. **Immersion préservée** : Même si un thème est en **Intensité 3** (comme *Harry Potter*), tous les calques et l'élément signature restent actifs sur mobile.
2. **Mesures d'optimisation automatique sur terminal mobile** :
   - **Plafond RAF à 30 FPS** : La boucle de rendu s'aligne sur un pas de temps de 33 ms, réduisant la consommation énergétique du GPU de 50 %.
   - **DPR forcé à 1.0** : Sur écran mobile Retina/OLED (DPR 2 à 3), calculer en résolution native est inutilement lourd pour un fond d'ambiance. Le ratio est bridé à 1.0.
   - **Volume de particules divisé par 3** : Géré automatiquement par le `QualityController` sans modifier la configuration du thème.
   - **Précision Shaders allégée** : Compilation GLSL avec `precision mediump float;` et réduction des octaves de bruit Simplex de 3 à 1.
3. **Rétrogradation dynamique** : Si le framerate mesuré sur mobile descend en dessous de 25 FPS pendant plus de 2 secondes, le moteur réduit encore d'un cran la densité ou désactive l'overlay de grain/bloom.

---

### 3.5 Régulateur Automatique de Contraste WCAG AA (`ContentShield`)

Conformément à l'exigence d'un **régulateur automatique**, `ContentShield` ne dépend pas de valeurs d'opacité arbitraires :

1. **Calcul de la Luminance Relative ($L$)** :
   Le module `WcagLuminance.ts` applique la formule normalisée WCAG 2.1 :
   $$L = 0.2126 \cdot R + 0.7152 \cdot G + 0.0722 \cdot B$$
   (après linéarisation gamma $sRGB$).
2. **Calcul du Ratio de Contraste Cible ($CR \ge 4.5:1$)** :
   Le régulateur calcule le contraste entre le texte principal (`--text-primary`) et la couleur résultante du fond sous-jacent.
3. **Ajustement Dynamique de l'Opacité** :
   - Si le fond ou les particules actives sont trop clairs ou trop saturés, le voile augmente automatiquement son opacité (par exemple de $0.20$ à $0.45$) avec la teinte sombre `--bg-app`.
   - Si le fond est déjà très sombre et respecte nativement le ratio $4.5:1$, l'opacité reste au minimum ($0.15$ à $0.20$) pour laisser transparaître toute la finesse de l'animation.
   - **Résultat** : Lisibilité garantie à 100 % sur les 276 thèmes sans aucun travail manuel de réglage d'opacité.

---

### 3.6 Unification des Séquences "Welcome Thème" (Intro Splash)

L'ancien écran `AdminThemeWelcome` utilisait des classes CSS isolées et des animations DOM séparées. L'architecture unifie l'écran de bienvenue et le moteur d'animation :

1. **Composant `WelcomeOverlay` synchronisé** :
   - Lorsqu'un utilisateur équipe un thème ou lance l'animation de bienvenue, le composant `WelcomeOverlay` se superpose au canvas WebGL persistant.
   - Il déclenche `engine.triggerIntroSequence(themeConfig.welcomeIntro)`.
2. **Comportement pendant l'Intro (3.5 à 4 secondes)** :
   - **Phase 1 ($t = 0\text{s} \to 1\text{s}$)** : Montée en puissance : apparition en fondu flou du titre avec sa typographie personnalisée (chargée dynamiquement via Google Fonts), flash ou surge d'énergie sur les briques (ex: accélération des particules, rideau de lumière intense).
   - **Phase 2 ($t = 1\text{s} \to 2.5\text{s}$)** : Apogée : affichage éclatant de l'élément signature au maximum de son intensité.
   - **Phase 3 ($t = 2.5\text{s} \to 3.5\text{s}$)** : Décélération douce et fondu enchaîné (cross-fade) direct vers l'ambiance continue standard du thème.
3. **Avantage décisif** : Aucun rechargement de page, aucune coupure visuelle, le même canvas WebGL assure à la fois l'explosion visuelle de l'intro et l'ambiance de fond pérenne.

---

### 3.7 Libération des Ressources (Disposal & Contexte Persistant)

* **Le Canvas WebGL ne se démonte jamais** : `ThemeEngineHost` reste monté à la racine de l'application via un React Portal vers `document.body`.
* **Changement de thème** :
  1. `engine.transitionTo(newThemeId)` : démarre un fondu croisé d'opacité (400 ms).
  2. Parcours récursif des objets du thème sortant : appel de `geometry.dispose()`, `material.dispose()`, `texture.dispose()`.
  3. Réutilisation des briques compatibles déjà en mémoire sans recréation.
  4. Réveil des briques entrantes avec leurs nouvelles propriétés.
* **Coupure RAF stricte** : Si `document.hidden === true` (onglet masqué), `requestAnimationFrame` est immédiatement stoppé. Zéro consommation CPU/GPU en arrière-plan.

---

### 3.8 Banc d'Essai & Règle des 3 Captures (`ThemePreview`)

L'écran [ThemePreview](file:///c:/ANTOINE/GITHUB/GameCollector/src/screens/ThemePreview/index.tsx) devient le laboratoire de validation pour les 276 thèmes :
* **Télémétrie en direct** : FPS instantané/min/max, temps de frame (ms), nombre de particules actives, nombre de draw calls.
* **Sélecteur d'intensité interactive** (permet de forcer 1, 2 ou 3 pour tester le rendu).
* **Bouton "Tester Séquence Welcome"** (déclenche l'intro de 4 secondes pour la valider).
* **Bouton "Audit 3 Captures"** :
  - Déclenche un enregistrement automatique à $t = 2\text{s}$, $t = 10\text{s}$ et $t = 30\text{s}$.
  - Affiche les 3 captures d'écran côte à côte avec la palette et la signature pour détecter les boucles répétitives ou le manque de profondeur organique.

---

## 4. Budget de Performance par Intensité

| Métrique de Performance | Intensité 1 (Subtile / Classique) | Intensité 2 (Scène Complète) | Intensité 3 (Cinématique / Univers) |
|---|---|---|---|
| **Exemples de Thèmes** | `neon_night`, `arctic_day`, `minimal` | `minecraft`, `mario`, `retro_arcade` | `harry_potter`, `cyberpunk`, `star_wars`, `abyss` |
| **Couches Actives** | 3 couches | 4 à 5 couches | 5 couches et plus |
| **Frame-Time Cible (Desktop)** | $\le 8\text{ ms}$ (60 FPS très large) | $\le 12\text{ ms}$ (60 FPS fluide) | $\le 14\text{ ms}$ (60 FPS constant) |
| **Frame-Time Cible (Mobile)** | $\le 14\text{ ms}$ ($\ge 45\text{ FPS}$) | $\le 22\text{ ms}$ ($\ge 35\text{ FPS}$) | $\le 28\text{ ms}$ ($\ge 30\text{ FPS}$ garanti) |
| **Particules Desktop** | 30 à 60 | 120 à 250 | 400 à 800 |
| **Particules Mobile (Smart Scaling)** | 15 à 25 | 40 à 80 | 120 à 200 |
| **Draw Calls Maximum** | $\le 2$ | $\le 4$ | $\le 6$ |
| **DPR Plafond** | 1.0 (Mobile) / 1.25 (Desktop) | 1.0 (Mobile) / 1.5 (Desktop) | 1.0 (Mobile) / 1.5 (Desktop) |
| **Complexité GLSL** | Dégradé radial simple, 0 bruit. | 1 octave Simplex noise, reflets. | 3 octaves Simplex, distorsions, brume volumétrique. |
| **Événements Rares** | Aucun | 1 événement rare (30-60s) | 2 événements rares asynchrones |

---

## 5. Plan de Déploiement en 5 Phases

```
Phase 1 : Socle Moteur & Runtime Three.js Vanilla (ThemeEngineHost, WebGL persistant, QualityController, WcagLuminance)
   │
   ▼
Phase 2 : Catalogue des 12 Briques Fondamentales (docs/bricks.md, shaders GLSL, instancing)
   │
   ▼
Phase 3 : Banc d'Essai ThemePreview & WelcomeOverlay (Télémétrie, simulation mobile, 3 captures auto)
   │
   ▼
Phase 4 : Industrialisation & Configuration des 276 Thèmes par Lots
   │      ├─ Lot 1 : Classiques & Saisons (27 thèmes — Intensités 1 et 2)
   │      ├─ Lot 2 : Gaming & Rétro (16 thèmes — Intensités 2 et 3)
   │      ├─ Lot 3 : Cinéma & Séries (44 thèmes — Intensités 2 et 3)
   │      ├─ Lot 4 : Super-Héros & Animation (31 thèmes — Intensités 2 et 3)
   │      ├─ Lot 5 : Univers Immersifs & Fantastique (20 thèmes — Intensité 3 : Harry Potter, LotR...)
   │      └─ Lot 6 : Monde Réel, Sport & Automobile (138 thèmes restants)
   │
   ▼
Phase 5 : Tests de Charge Mobile Réels, Validation Qualité & Dépréciation de l'Ancien Code
```

---

## 6. Décisions Stratégiques Validées (Synthèse des Arbitrages)

Les 5 questions stratégiques sont formellement tranchées comme suit :

1. **Moteur d'exécution Three.js** : **Three.js Vanilla encapsulé dans un hôte React (`ThemeEngineHost`)**. Contrôle impératif direct sur la libération mémoire (`dispose()`), zéro re-render React dans la boucle RAF, maintien absolu du contexte WebGL unique.
2. **Modèle d'intensité** : **Intensité intrinsèque par thème**. Chaque univers porte son propre niveau de réalisme (ex: Classiques en 1, Univers denses comme *Harry Potter* en 3). Un réglage utilisateur optionnel "Mode Éco" permettra de plafonner globalement si souhaité.
3. **Stratégie mobile** : **Smart Scaling adaptatif**. Tous les calques et l'identité des thèmes sont conservés (même en Intensité 3), mais le moteur bride automatiquement le framerate à 30 FPS, le DPR à 1.0, divise les particules par 3 et allège les shaders.
4. **Animations d'Introduction ("Welcome Thème")** : **Moteur unifié**. Le runtime intègre nativement une séquence d'intro cinématique de 3.5 à 4 secondes (titre stylisé, sur-amplification signature, fondu croisé vers l'ambiance continue) remplaçant l'ancien système CSS fragmenté.
5. **Protection de la lisibilité (`ContentShield`)** : **Régulateur automatique WCAG AA**. Calcul mathématique en temps réel de la luminance relative ($L$) du fond pour ajuster précisément l'opacité minimale garantissant le ratio de contraste de 4.5:1 sur les textes.
