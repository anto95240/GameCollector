# Audit du Système d'Animation de Thèmes

> Date de réalisation : Octobre 2026  
> Statut : Lecture seule — aucune modification du code source effectuée.

---

## Synthèse exécutive (Résumé en 10 lignes)

1. **Architecture globale saine** : Le découpage orchestrateur ([ThemeAnimationLayer.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/ThemeAnimationLayer.tsx) via React Portal vers `body`) et calques spécialisés ([CanvasLayer](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/layers/CanvasLayer.tsx), [CssLayer](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/layers/CssLayer.tsx)) isole efficacement le rendu visuel sans bloquer l'UI.
2. **Cycle de vie fonctionnel** : L'intégration avec `useTheme()`, le respect de `prefers-reduced-motion` et la détection d'onglet masqué (`visibilitychange`) sont en place et respectent les règles de hooks React.
3. **Pression mémoire critique (GC)** : La boucle `CanvasLayer` instancie des milliers d'objets `CanvasGradient` et chaînes `rgba()` par seconde pour l'aurore, provoquant des micro-saccades régulières du Garbage Collector.
4. **Boucle RAF non interrompue** : Le `requestAnimationFrame` continue de boucler à 60 Hz en arrière-plan même lorsque l'animation est en pause ou l'onglet masqué (le code fait un `return` après avoir déjà planifié le RAF suivant).
5. **Absence de devicePixelRatio** : Le canvas ignore le ratio haute densité d'écran (DPR 2-3), provoquant un flou d'étirement CSS sur écrans Retina et mobiles.
6. **Redimensionnement incomplet** : L'écouteur `resize` met à jour les dimensions du canvas mais ne repositionne ni les particules ni les hauteurs de référence des arcs calculées au montage.
7. **Transitions abruptes** : Le changement de thème détruit et recrée brutalement l'animation sans fondu enchaîné (cross-fade), créant une coupure visuelle sèche.
8. **Catalogue sous-exploité** : Seuls 2 thèmes (`neon_night`, `aurora`) sont configurés sur les 276 du registre (266 identifiés initialement avant correction des guillemets doubles), laissant l'immense majorité du catalogue sans ambiance animée.
9. **Banc d'essai à faire évoluer** : `ThemePreview` supporte déjà `overridePreset`, mais il manque la télémétrie FPS, le sélecteur d'intensité (1-3) et la capture automatique à 3 moments.
10. **Conformité aux règles qualité** : L'architecture actuelle doit être étendue vers le modèle 4-5 couches (profondeur, parallaxe souris, événements rares, atmosphère) pour garantir une véritable immersion.

---

## 1. Analyse détaillée de CanvasLayer.tsx

Le fichier [src/theme-animations/layers/CanvasLayer.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/layers/CanvasLayer.tsx) implémente le moteur de rendu 2D pour les particules, les étoiles, la pluie et les arcs d'aurores boréales.

### 1.1 Gestion de la boucle d'animation
* **Orchestration** : La fonction `loop` est planifiée via `requestAnimationFrame(loop)` au sein d'un `useEffect` dépendant de la référence `[configs]`.
* **Problème de mise en pause** :
  ```ts
  const loop = () => {
    animRef.current = requestAnimationFrame(loop)
    if (pausedRef.current || document.hidden) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // ...
  ```
  La planification du prochain cycle RAF intervient **avant** l'évaluation de la pause. Ainsi, lorsque l'onglet est masqué (`document.hidden`) ou lorsque l'animation est en pause (`pausedRef.current`), la fonction continue d'être appelée 60 fois par seconde pour effectuer un `return` immédiat. La planification devrait être interrompue et relancée via l'écouteur `visibilitychange` ou lors du déblocage de la pause.

### 1.2 Facteur de performance (`getPerf`)
* **Implémentation** :
  ```ts
  function getPerf(): number {
    return window.innerWidth < 768 ||
      (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 2)
      ? 0.4
      : 1
  }
  ```
* **Impact** :
  * Réduit le volume d'entités instanciées : `Math.floor(pCfg.maxParticles * perf)`, `Math.floor(sCfg.count * perf)`, `Math.floor(rCfg.count * perf)`.
  * Pour l'aurore boréale : augmente le pas d'échantillonnage horizontal `STEP = perf < 1 ? 4 : 2`, divisant par deux le nombre de colonnes de calcul.
* **Limites** :
  * Évalué une seule fois à l'initialisation du composant (`const perf = getPerf()`).
  * Non réactif aux changements de dimensions de fenêtre après chargement.
  * Pas d'asservissement dynamique au framerate réel (si le GPU sature à 25 FPS, le facteur reste à 1).

### 1.3 Redimensionnement (`resize`)
* **Comportement** : L'écouteur `window.addEventListener('resize', resize)` assigne `canvas.width = window.innerWidth` et `canvas.height = window.innerHeight`.
* **Faiblesses** :
  * Les particules actives conservent leurs coordonnées absolues : les éléments situés au-delà des nouvelles dimensions se retrouvent hors écran ou sont réinjectés de manière asymétrique.
  * Pour les arcs d'aurores boréales, `maxH = canvas.height * aCfg.heightRatio`, ainsi que les lignes de référence `refY` (`maxH * 0.72`, etc.) et les hauteurs maximales de rayons `maxRayH`, sont calculées **une seule fois à l'initialisation** (lignes 208-263). En cas de redimensionnement de la fenêtre, l'aurore ne s'adapte pas en hauteur.
  * Absence de debounce / throttle sur l'événement `resize`.

### 1.4 Nettoyage (cleanup)
* Le cleanup du `useEffect` appelle `cancelAnimationFrame(animRef.current)` et retire l'écouteur d'événement `resize`.
* **Faiblesses** :
  * Aucun effacement explicite du canvas (`ctx.clearRect`) au démontage.
  * Toute modification de la prop `configs` recrée l'ensemble des tableaux (`particles`, `stars`, `arcs`) sans transition, provoquant une coupure nette.

### 1.5 Gestion du `devicePixelRatio` (DPR)
* **Constat** : Le `devicePixelRatio` n'est pas pris en compte. Les dimensions du buffer correspondent aux pixels CSS logiques (`window.innerWidth` / `innerHeight`).
* **Conséquences** :
  * Sur les écrans haute densité (DPR 2 ou 3 : Retina, smartphones récents, 4K), l'image est étirée par le CSS (`width: 100%, height: 100%`), entraînant un flou sur les tracés fins (étoiles de 0.5px, rayons d'aurore, connexions de particules).
  * Si la prise en compte du DPR augmente le fillrate, son absence totale dégrade le rendu visuel sur les terminaux cibles.

### 1.6 Points faibles : Allocations et coût par frame
1. **Allocations massives dans la boucle de rendu (Pression GC)** :
   * Pour l'aurore boréale (v7), le rideau est découpé en colonnes verticales de largeur `STEP` (2 à 4 px). Sur un écran 1920x1080 avec `STEP = 2` et 3 arcs, la boucle effectue 2 880 itérations par frame.
   * À chaque itération :
     * Création de deux dégradés via `ctx.createLinearGradient()` (~5 760 objets de dégradé par frame, soit plus de 340 000 objets créés par seconde).
     * 8 appels à `addColorStop()` utilisant des template strings interpolées (`rgba(...)`), générant des dizaines de milliers de chaînes de caractères par seconde.
     * Appels constants à `hexToRgb()`, `lerpColor()` et `roleConfig[arc.role].A.map(...)` réallouant des tableaux `[r, g, b]`.
   * Cette profusion d'objets éphémères déclenche des collectes de mémoire récurrentes (GC pauses) qui dégradent la fluidité à 60 FPS.
2. **Coût de dessin Canvas 2D (Fillrate)** :
   * Dessiner des milliers de tranches verticales via `ctx.fillRect` avec dégradés en mode `globalCompositeOperation = 'lighter'` est très coûteux en Canvas 2D CPU. Ce type d'effet trigonométrique relève typiquement d'un fragment shader WebGL.
3. **Complexité quadratique des particules connectées** :
   * Pour `neon_night`, l'algorithme de connexion parcourt toutes les paires de particules ($O(N^2)$) avec calcul de distance euclidienne (`Math.sqrt`), générant un surcoût dès que le nombre de particules augmente.

---

## 2. Montage et Orchestration de ThemeAnimationLayer

### 2.1 Point de montage
* **Racine applicative** : [ThemeAnimationLayer](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/ThemeAnimationLayer.tsx) est monté dans [src/App.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/App.tsx#L38) sous `<div id="app-container">`.
* **Portail DOM** : Le composant utilise `createPortal(layerContent, document.body)`.
  * *Raison d'être* : `#app-container` possède `overflow: hidden`, ce qui tronquerait ou masquerait les conteneurs en `position: fixed`. Le portail injecte directement les calques dans `document.body` avec `position: fixed`, `inset: 0`, `zIndex: 0` et `pointerEvents: 'none'`, garantissant un affichage d'arrière-plan sans interférence avec l'interface.

### 2.2 Connexion avec le ThemeContext
* Consomme `useTheme()` : `activePreset` et `isPreviewMode`.
* Si aucune prop `overridePreset` n'est fournie, le preset actif global est utilisé.
* **Garde-fou** : Si `isGlobalMode && isPreviewMode` est vrai, l'instance d'[App.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/App.tsx) retourne `null`, évitant les collisions avec les écrans de prévisualisation.

### 2.3 Coût d'un changement de thème
* Dans [ThemeContext.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/context/ThemeContext.tsx) :
  1. `document.documentElement.setAttribute('data-preset', themeId)` applique immédiatement les variables CSS.
  2. `startTransition(() => setActivePreset(themeId))` planifie la mise à jour React en priorité basse.
* Dans [ThemeAnimationLayer.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/theme-animations/ThemeAnimationLayer.tsx) :
  1. `config` est recalculé via `useMemo`.
  2. Les listes `canvasConfigs`, `fogConfigs`, `glowConfigs` et `scanlineConfigs` sont filtrées.
  3. Si la configuration canvas change, le hook `useEffect([configs])` de `CanvasLayer` détruit l'ancienne boucle RAF, vide les entités et réinstancie l'état du nouveau thème.
  4. S'il n'y a pas d'animation canvas pour le nouveau thème, le composant `CanvasLayer` est démonté.
  5. Pour `CssLayer`, les éléments DOM et leurs `@keyframes` sont mis à jour.
* **Bilan** : Le coût CPU est bien maîtrisé grâce à `startTransition` et aux `useMemo`. En revanche, sur le plan visuel, la transition est abrupte (absence de fondu croisé).

---

## 3. Utilisation de `overridePreset` et Évolution vers un Banc d'Essai

### 3.1 État des lieux
* **[ThemePreview/index.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/screens/ThemePreview/index.tsx)** :
  * Déclenche `setIsPreviewMode(true)` au montage pour masquer l'instance globale d'[App.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/App.tsx).
  * Monte sa propre instance : `<ThemeAnimationLayer overridePreset={localPreset} />`.
  * Permet de tester l'impact visuel de chaque thème au clic sans altérer la préférence utilisateur stockée en base.
* **[SandboxThemes/index.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/screens/SandboxThemes/index.tsx)** :
  * N'utilise **ni `overridePreset` ni `ThemeAnimationLayer`**.
  * Ce bac à sable est dédié à la simulation de l'algorithme de déblocage (recherche IGDB, parseur CSV, calcul des conditions de déblocage).

### 3.2 Spécifications pour un banc d'essai complet (FPS, Qualité, Capture)
Pour aligner l'outil avec les exigences du document de règles (`.agents/rules/themes-animations.md`), le banc d'essai doit intégrer :
1. **Intégration d'un sélecteur universel** : Permettre de sélectionner n'importe quel thème du registre et monter `<ThemeAnimationLayer overridePreset={themeId} />`.
2. **Télémétrie de performance en temps réel** :
   * Compteur de FPS instantané, moyen et minimum.
   * Frame time en millisecondes et détection des drops sous 60 FPS (desktop) / 30 FPS (mobile).
   * Compteur d'entités actives (particules, gouttes, arcs).
3. **Simulateur de configurations matérielles** :
   * Sélecteur d'intensité (1 = subtil, 2 = scène complète, 3 = immersion maximale).
   * Bascule de ratio DPR (1x, 2x, 3x).
   * Simulation de CPU restreint (`getPerf` forcé à 0.4).
   * Toggle pour tester le mode `prefers-reduced-motion`.
4. **Contrôles temporels et d'interaction** :
   * Boutons Play / Pause / Avance pas-à-pas / Vitesse ralentie (0.25x, 0.5x, 1x, 2x).
   * Test de la réaction au curseur (parallaxe) et au scroll.
5. **Outil de validation et capture automatique (Règle des 3 captures)** :
   * Export PNG haute résolution à $t = 2\text{s}$, $10\text{s}$ et $30\text{s}$.
   * Comparaison visuelle côte à côte avec la fiche de direction artistique pour détecter les boucles cycliques et les artefacts.
6. **Débogueur de couches (Layer Isolation)** :
   * Possibilité d'activer/masquer individuellement chaque calque : fond/décor, plan intermédiaire, particules, brume/lueur, contentShield WCAG.

---

## 4. Exploitation de `themeWelcomeData.ts` et du champ `universe`

### 4.1 Contenu de `themeWelcomeData.ts`
* Données issues de `theme_ideas.md` destinées à l'écran de bienvenue / découverte.
* Propriétés de `ThemeWelcomeData` : `title`, `fontFamily`, `googleFontUrl`, `animationFamily`, `rawAnimationInfo`.
* **Particularité notable** : Le champ `fontFamily` contient textuellement la description de **l'élément signature** prévu pour chaque thème (ex. : *"Rayons de lumière verte"*, *"Braises qui remontent"*, *"Bioluminescence ondulante"*, *"Bulles qui montent"*, *"Lave qui coule"*, *"Feuilles qui tombent doucement"*, *"Cristaux de glace"*).
* `animationFamily` classe le vecteur d'animation (`particles-up`, `scanline`, `pulse`, etc.).

### 4.2 Contenu du champ `universe` dans `themeRegistry.ts`
* Identifie la franchise ou l'univers d'inspiration pour la majorité des thèmes (ex. : `mario-universe`, `pokemon`, `sonic`, `gta`, `minecraft`, `indiana-jones`, `uncharted`, `tomb-raider`).
* Utilisé pour le filtrage thématique dans la galerie.

### 4.3 Définition de l'identité visuelle
Ces deux sources permettent de construire rigoureusement la direction artistique de chaque thème :
* **`universe`** fournit l'ancrage thématique et stylistique, permettant d'évoquer l'univers sans enfreindre les droits d'auteur (conforme aux règles).
* **`themeWelcomeData`** décrit l'élément signature unique et le comportement cinétique de base.
* **`themeRegistry.ts`** fournit la palette de couleurs officielle (`colors: [string, string]`).

---

## 5. Matrice : Réutilisable vs À Étendre

| Composant / Module | Statut | Ce qui est réutilisable tel quel | Ce qui doit être étendu / corrigé |
|---|:---:|---|---|
| **ThemeAnimationLayer** | À étendre | Architecture en Portal vers `body`, intégration `useTheme`, détection `prefers-reduced-motion` et `visibilitychange`. | Ajouter un système de transition douce (cross-fade / fondu enchaîné) lors du changement de preset. |
| **CanvasLayer** | À corriger | Structure globale de boucle Canvas, gestion des particules simples et étoiles de base. | Éliminer les allocations par frame dans l'aurore ; stopper le RAF en pause ; gérer le DPR ; adapter les dimensions au resize. |
| **CssLayer** | Réutilisable | Injection unique de keyframes, gestion de pause via `animationPlayState`, calques de brume et lueurs. | Ajouter des variations organiques (bruit/dérives aléatoires) pour éviter les boucles visuelles répétitives. |
| **themeAnimationConfig** | À étendre | Typage TypeScript des calques (`particles`, `stars`, `rain`, `fog`, `glow`, `scanlines`, `contentShield`). | Passer de 2 thèmes configurés à l'ensemble du registre ; ajouter les types de calques manquants (parallaxe, shaders). |
| **ThemePreview** | À étendre | Utilisation propre de `overridePreset` et isolation du mode preview. | Intégrer les outils de banc d'essai (FPS, capture 3 moments, contrôle d'intensité 1-3). |
| **SandboxThemes** | À réaligner | Moteur de simulation de bibliothèque et règles de déblocage. | Connecter l'animation de fond via `overridePreset` pour tester les thèmes débloqués. |
| **themeWelcomeData** | À écarter | Seules les idées d'animations textuelles de `docs/theme_ideas.md` sont à conserver. | Fichier mal généré (178 thèmes, colonnes décalées, polices Google 400). Utiliser directement `docs/theme_ideas.md`. |
| **SeasonalDecorations** | À migrer | Concept de décorations saisonnières d'ambiance. | À supprimer d'`App.tsx` et intégrer sous forme de calques dans le moteur unifié `ThemeAnimationLayer`. |

---

## 6. Corrections et ajouts

### 6.1 Rectification du volume du registre : 276 thèmes réels (et non 266)
* **Origine de l'écart** : Une extraction basée sur des expressions régulières ou guillemets simples ignorait les thèmes dont le nom utilise des guillemets doubles pour entourer une apostrophe (ex. : `name: "Luigi's Mansion"`, `name: "Yoshi's Island"`, `name: "Drake's Fortune"`, `name: "Andy's Room"`, `name: "Gusteau's"`, `name: "McClane's Law"`, `name: "Hero's Journey"`, `name: "Dragon's Lair"`, etc.).
* **Comptage canonique** : L'évaluation TypeScript native via `THEME_REGISTRY.flatMap(c => c.themes)` confirme un total strict de **276 thèmes uniques** répartis dans les 25 catégories du registre.

### 6.2 Analyse de SeasonalDecorations (Système d'animation parallèle)
* **Emplacement et intégration** : [src/components/secondary/SeasonalDecorations/index.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/components/secondary/SeasonalDecorations/index.tsx), monté directement à la racine dans [src/App.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/App.tsx#L47) au sein de `#app-container`.
* **Fonctionnement** :
  * Consomme `useTheme().activePreset`.
  * Déclare 9 thèmes saisonniers ciblés : `halloween`, `christmas`, `spring`, `easter`, `summer`, `winter`, `autumn`, `chandeleur`, `epiphanie`.
  * Injecte des icônes SVG FontAwesome animées par CSS :
    * `halloween` : araignées statiques en coins supérieurs (`faSpider`) + 10 fantômes flottants (`faGhost`) avec variables CSS aléatoires injectées en inline (`--random-x`, `--random-delay`, `--random-duration`, `--random-size`).
    * `christmas` et `winter` : sapin et cadeau en coins inférieurs (`faTree`, `faGift`) + 20 flocons de neige tombants (`faSnowflake`).
    * Les 6 autres thèmes (`spring`, `easter`, `summer`, `autumn`, `chandeleur`, `epiphanie`) montent le conteneur mais ne génèrent aucune particule/décoration active (conteneur vide).
* **Ce qu'il faut migrer** :
  1. *Architecture dupliquée* : Constitue un second système d'animation en vase clos, totalement dissocié de `ThemeAnimationLayer` et contournant `themeAnimationConfig.ts`.
  2. *Incohérence avec `ThemePreview` / `overridePreset`* : Ne réagissant qu'à `activePreset`, il n'affiche aucune décoration lors de la prévisualisation d'un thème saisonnier dans l'écran de preview ou la galerie.
  3. *Absence de gardes-fous* : N'écoute pas `prefers-reduced-motion` et continue de faire tourner ses animations CSS en continu même lorsque l'onglet est masqué (`document.hidden`).
  4. *Lourdeur DOM* : Multiplie les nœuds SVG complexes dans l'arbre React applicatif au lieu d'utiliser des calques Canvas/WebGL optimisés.
  5. *Action requise* : Déprécier et retirer `SeasonalDecorations` d'[App.tsx](file:///c:/ANTOINE/GITHUB/GameCollector/src/App.tsx). Reconvertir ces comportements sous forme de calques standardisés (`particles`, `decorations`, `atmosphere`) intégrés dans le moteur unifié de thèmes.

### 6.3 Diagnostic de themeWelcomeData.ts et Recommandation docs/theme_ideas.md
* **Génération défaillante et décalage de colonnes** :
  * Le fichier [src/config/themeWelcomeData.ts](file:///c:/ANTOINE/GITHUB/GameCollector/src/config/themeWelcomeData.ts) a été généré via un script automatique présentant un décalage de colonnes à partir du tableau markdown d'origine :
    * Le champ `fontFamily` contient textuellement la description de l'animation d'origine (ex. : *"Rayons de lumière verte"*, *"Braises qui remontent"*, *"Bioluminescence ondulante"*, *"Cristaux de glace qui apparaissent"*).
    * Le champ `googleFontUrl` a été généré à partir de ce texte (ex. : `https://fonts.googleapis.com/css2?family=Rayons+de+lumière+verte&display=swap`), déclenchant des erreurs HTTP 400 dans la console lorsque [AdminThemeWelcome](file:///c:/ANTOINE/GITHUB/GameCollector/src/screens/AdminThemeWelcome/index.tsx) tente d'injecter la feuille de style dans `<head>`.
    * Le champ `rawAnimationInfo` a capturé les conditions de déblocage : **34 entrées** y affichent la mention `"Trophée \`...\`"` au lieu de métadonnées d'animation.
* **Couverture incomplète** : Seuls **178 thèmes** sont décrits dans `themeWelcomeData.ts`, contre 276 dans le registre.
* **Recommandation ferme** :
  * Écarter `themeWelcomeData.ts` pour la conception du nouveau moteur d'ambiance.
  * Se référer directement au document source [docs/theme_ideas.md](file:///c:/ANTOINE/GITHUB/GameCollector/docs/theme_ideas.md), qui constitue la véritable référence artistique et conceptuelle pour l'élaboration des fiches de direction artistique.

### 6.4 Contraintes pour le nouveau moteur d'animations
1. **Environnement technique existant** :
   * **Bundler & Framework** : Vite 8 (`vite: ^8.0.16`), React 19 (`react: ^19.2.1`), TypeScript 5.9.
   * **Écosystème 3D / WebGL déjà en place** : `three: ^0.186.0`, `@types/three: ^0.186.0`, `@react-three/fiber: ^9.7.0` (R3F) et `@react-three/drei: ^10.7.8` sont déjà installés dans le projet (`package.json`).
2. **Poids du bundle et code-splitting (Vite)** :
   * Le bundle de production actuel est découpé en plusieurs chunks (`vendor-core`: ~446 KB, `vendor-charts`: ~361 KB, `vendor-react`: ~178 KB, `index.css`: ~442 KB).
   * L'empreinte de Three.js (> 600 KB minifié) et R3F impose que le moteur d'animation 3D/shaders soit **chargé de manière différée (lazy loading via `React.lazy()` / import dynamique)** afin de ne pas impacter le temps de chargement initial (FCP) pour les utilisateurs affichant un thème statique ou 2D simple.
3. **Contexte WebGL unique et persistant (Règle Qualité)** :
   * Le contexte WebGL (canvas R3F) doit être initialisé une seule fois et maintenu monté pour toute l'application. Changer de thème doit uniquement consister en une permutation de configuration déclarative (géométries, matériaux, shaders légers, uniformes temporelles), sans recréation du canvas ni réinitialisation du contexte graphique.
4. **Compatibilité mobile et gestion des performances** :
   * Maintenir 60 FPS sur PC milieu de gamme et 30 FPS minimum garanti sur mobile.
   * Réduction drastique du nombre de particules et désactivation automatique des passes gourmandes (post-processing lourd, bloom, flous de profondeur) si `window.innerWidth < 768` ou `navigator.hardwareConcurrency <= 2`.
   * Respect absolu de `prefers-reduced-motion` (version statique ou ralentie) et coupure totale de la boucle de rendu lorsque l'onglet est masqué (`document.hidden`).
5. **Intégration avec ThemeContext et contentShield** :
   * Écoute réactive de `activePreset` et de la prop `overridePreset` (indispensable pour `ThemePreview` et le futur banc d'essai).
   * Respect du mode `isPreviewMode` pour éviter les doublons de layers.
   * Préservation du voile de protection lisibilité `contentShield` (calque d'atténuation placé à un z-index intermédiaire entre l'animation et l'interface utilisateur) pour garantir la conformité aux contrastes WCAG AA.
