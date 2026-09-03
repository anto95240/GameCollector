# 🗺️ GameCollector — Roadmap & Backlog

> **Version actuelle : v3.0.11** — Ce document liste **uniquement ce qui reste à faire**. Il sert de source de vérité pour les développements futurs.

---

## 🧬 L'ADN de GameCollector (Rappel Design)
Avant d'implémenter toute nouvelle fonctionnalité, respecter ces principes :
- **Design Visuel :** Mode sombre, couleurs vibrantes, animations fluides, badges colorés.
- **Accessibilité :** Vocabulaire simple, clair et compréhensible pour tous.
- **Les 4 Piliers :** Statistiques · Trophées · Organisation (Filtres, Raccourcis) · Wishlist

---

## ✅ Ce qui est déjà en place (ne pas re-implémenter)
- ✅ Migration complète vers **Supabase**
- ✅ Raccourcis clavier personnalisables + aide intégrée
- ✅ Recherche fuzzy + filtres avancés sauvegardés
- ✅ Statistiques avancées (dashboard + page dédiée)
- ✅ Système de Trophées + animations de déblocage
- ✅ Wishlist & Favoris
- ✅ CSP + sanitisation HTML + validation stricte des formulaires
- ✅ Virtual scrolling + optimisation bundle + WebP
- ✅ Skeleton screens & loading states améliorés
- ✅ Système de toasts (file d'attente, actions, empilement)

---

## 🔴 Priorité 1 — À faire maintenant

### 1.1 · Dark Mode par défaut & Personnalisation du thème

> **Contexte actuel :** Le système de thème est déjà fonctionnel. Le CSS dans [`index.css`](../src/index.css) définit le **Dark Mode comme thème de base** (variables dans `:root`), et le Light Mode comme variante (`[data-theme='light']`). Cependant, [`ThemeContext.tsx`](../src/context/ThemeContext.tsx) initialise `isDark` à `false` si aucune valeur n'est trouvée dans le `localStorage` — ce qui force le Light Mode au premier lancement. La correction est **une seule ligne**.
>
> L'objectif secondaire est de donner à l'utilisateur un **contrôle total sur l'apparence du site**, tout en préservant l'ADN (structure, lisibilité, animations). L'utilisateur ne doit pas pouvoir "casser" le design, mais peut l'adapter entièrement à ses goûts.

---

#### ⚡ Étape 1 — Corriger le défaut du dark mode (5 min)

- [x] Dans [`ThemeContext.tsx`](../src/context/ThemeContext.tsx) **ligne 14**, changer :
  ```typescript
  // AVANT
  return item ? JSON.parse(item) : false
  // APRÈS
  return item ? JSON.parse(item) : true
  ```

---


### 1.2 · Traduction "des constantes" en anglais
- [x] Dans [`constant.ts`](../src/config/constants.ts)

---

### 1.3 · Focus dynamique (Page Add/Edit Game)
> Le formulaire est long. Quand l'utilisateur scroll vers une section, celle-ci doit se mettre en avant visuellement.
- [x] Utiliser `IntersectionObserver` pour détecter la section active au scroll
- [x] **Section active :** Opacité 100%, léger glow aux couleurs de la charte
- [x] **Sections inactives :** Opacité réduite (~40%), transition CSS douce (`0.3s ease-in-out`)

---

### 1.4 · ajout de tooltips pour les inputs du formulaire
nom: nom du jeu
description: description personnel du jeu
note: 
commentaire: notre avis sur le jeu
genre: 
plateforme: 
date de sortie:
temps de jeu:
developpeur: le studio qui a développé le jeu
trophé: le nombre de trophée débloqué du jeu
image: 
status: le status du jeu entre ("en cours, wishlist, etc)
tags: les tags du jeu
- [x] Dans [`AddEditGame.tsx`](../src/screens/AddEditGame/index.tsx) ajouter des tooltips pour les inputs du formulaire
- [x] ajout des traductions de ces tooltips dans [`en.json`](../src/config/translations/en.json) et [`fr.json`](../src/config/translations/fr.json)

---

### 1.5 · Probème pour le mobile
- [x] corrigé la bottomBar car elle bouge vers la droite quand j'appuie sur list et seul les liens vers accueil et liste sont accessible et quand 
- [x] sur mobile le logo ne fais pas exactement un rond, il est un peu écrasé pour ressemblé a une ellipse

---

### 1.6 · Page de Bienvenue (Landing Page / Onboarding)
> La toute première page visible en arrivant sur l'application, avant même la connexion. Une véritable page d'atterrissage immersive en plein écran.
- [x] Créer le composant de page pleine `WelcomePage.tsx` (routage à configurer sur la racine ou avant l'authentification).
- [x] **Héro Section / Titre :** `Bienvenue dans votre nouvelle Base de Données personnelle ! 👾`
- [x] **Présentation (3 blocs/sections fluides) :**
  1. 📚 **Collection infinie** — ajout, classement, filtres, fuzzy search
  2. 📊 **Statistiques** — graphiques et évolution de la ludothèque
  3. 🏆 **Chasseur de Trophées** — défis et succès uniques
- [x] **Appel à l'action (Bouton) :** `[ Commencer ma collection — Press Start ]` (Redirige vers la connexion/inscription)
- [x] Sauvegarder la version actuelle (`last_seen_version`) dans `localStorage` pour mémoriser la visite du nouvel utilisateur.

---

### 1.7 · Patch Notes automatisés (depuis les GitHub Releases)
> À chaque mise à jour : afficher les nouveautés en les récupérant directement depuis l'API GitHub.

**Logique (`useVersionCheck`) :**
- [x] Au chargement, lire `last_seen_version` dans localStorage
  - Si **NULL** → afficher l'Onboarding (1.3)
  - Si **égal** à la version du code → rien faire
  - Si **différent** → fetch API GitHub + afficher la modale Patch Notes + mettre à jour localStorage

**Récupération des données :**
- [x] Créer `useGithubReleases.ts` :
  ```typescript
  const fetchPatchNotes = async () => {
    const res = await fetch('https://api.github.com/repos/anto95240/GameCollector/releases');
    return await res.json(); // tag_name, name, body (Markdown)
  };
  ```

**Modale "Quoi de neuf" :**
- [x] Créer `PatchNotesModal.tsx` avec `react-markdown` pour le rendu du `body` GitHub
- [x] ~~Remplacer les puces classiques par des composants stylisés :~~ (Annulé par l'utilisateur)
- [x] **Convention de rédaction GitHub :** Utiliser `## Nouveautés` et `## Correctifs` comme en-têtes dans chaque release

---

### 1.8 · Notification de mise à jour en arrière-plan (PWA Toast)
> Quand un nouveau build est détecté, proposer à l'utilisateur de recharger sans le forcer.
- [x] Installer `vite-plugin-pwa` : `npm i -D vite-plugin-pwa`
- [x] Configurer `vite.config.ts` avec `registerType: 'prompt'`
- [x] Créer un composant toast réutilisant le système de toasts existant :
  - **Texte :** *"✨ Level Up ! Une nouvelle mise à jour est disponible."*
  - **Bouton :** `[ Installer ]`

---

### 1.9 · Ajout de Vercel Analytics
- [x] Installer Vercel Analytics : `npm i @vercel/analytics`
- [x] Ajouter le composant `<Analytics />` dans `main.tsx` ou `App.tsx`

---

### 1.10 · PWA & Installation Mobile
> Configurer l'application pour qu'elle puisse être installée comme une vraie application sur smartphone et avertir l'utilisateur de cette possibilité.
- [x] Créer et configurer le fichier `manifest.json` (nom, couleurs, mode standalone, etc.)
- [x] Générer et ajouter les icônes de l'application aux dimensions requises (PWA)
- [x] Ajouter les balises `<meta>` nécessaires (notamment pour la bonne intégration iOS)
- [x] Créer une notification/bannière pour signaler la possibilité d'installer l'app (utilisation de l'événement `beforeinstallprompt` pour proposer l'installation)

---

### 1.11 · Augmenté la duré des animations d'apparition des éléments pour les pages category & statistics
- [x] Dans [`category.css`](../src/screens/category/category.css) augmenter la durée des animations d'apparition des éléments
- [x] Dans [`statistics.css`](../src/screens/statistics/statistics.css) augmenter la durée des animations d'apparition des éléments

---

### 1.12 · Problème page category sur le mobile, les problème sont uniquement lié aux mobile, pas aux desktop
- [x] quand on selectionne une catégory, le btn de cette catégory disparait et réapparait quand on clique n'importe ou sur l'ecran
- [x] les animations sont beaucoup trop rapide sur mobile mais top sur desktop
- [x] les btn add, edit, delete ne sont pas du tout adapté pour le mobile, l'encadré ne fait pas un rond contrairement aux desktop qui est parfaitement rond 
- [x] quand on clique pour la première fois sur une category, la modal avec les catégory ne s'affiche pas, il faut recliquer pour que la modal s'affiche
- [x] quand j'arrive sur une page, la page a déjà scrollé vers le milieur de la page
- [x] il y a moyen de retité le toast de google traduction ?

---

##  Priorité 2

### 2.1 · Statistiques Personnalisables
> Chaque utilisateur configure son Dashboard et sa page Stats selon ses préférences.
- [x] Ajouter une table/colonne `user_settings` dans Supabase pour stocker les préférences de widgets
- [x] Créer un mode "Édition" sur le Dashboard (drag & drop ou checkboxes)
  - Librairie suggérée : `dnd-kit` (léger et compatible React)
- [x] Permettre à l'utilisateur d'afficher/masquer chaque graphique
- [x] Permettre la création de métriques custom (ex: "Jeux terminés cette année", "Temps moyen par genre")
- [x] Appliquer les mêmes options sur la page Statistiques

---

### 2.2 · Nouveaux Trophées
> Ajouter des trophées pour les nouvelles interactions et fonctionnalités et pertinants.
- [x] Trophée pour l'utilisation des raccourcis clavier (ex: 10, 50, 100 utilisations)
- [x] Trophée pour la personnalisation des statistiques
- [x] Trophée pour la personnalisation du thème
- [x] Trophée pour le nombre de jeux dans la Wishlist
- [x] Trophée pour la sauvegarde de filtres
- [x] Trophée pour la personnalisation du dashboard
- [x] Revoir et compléter le catalogue existant de trophées

---

### 2.3 · Stat personnalisé amélioré
> possibilité de changé l'ordre des éléments dans l'édition des stats pour permettre à l'utilisateur, d'adapter les statistiques à ses envies.
- [x] Implémentation du système de réorganisation par flèches de haut/bas pour les métriques personnalisées et secondaires.

### 2.4 · Système de personnalisation du thème

**Approche choisie : Thèmes prédéfinis + Personnalisation de la couleur d'accent**

> Ce système hybride est la meilleure option pour ce projet. Un éditeur de thème entièrement libre (choix de chaque couleur) est très complexe à maintenir et risque de produire des résultats illisibles. À l'inverse, des thèmes 100% figés ne donnent pas assez de liberté.
>
> La solution : **des thèmes prédéfinis soignés** (garantissant l'ADN du site) + **un color picker uniquement sur la couleur d'accent principale** (néon, bordures, boutons), ce qui donne une impression de liberté totale sans risquer de briser le design.

**Thèmes prédéfinis à créer :**

*(Note : Pas de déclinaison Dark/Light obligatoire pour chaque thème. Chaque thème possède sa propre identité visuelle unique).*

### Thèmes Classiques
| Nom | Ambiance | Couleur d'accent principale |
|---|---|---|
| 🌌 **Neon Night** *(Défaut)* | Sombre, Bleu Nuit, Néon Cyan | `#5af2ff` |
| ☀️ **Arctic Day** *(Light)* | Clair, Blanc Glacé, Accent Bleu Ciel | `#2c8fff` |
| 🐉 **Cyberpunk** | Sombre, Noir Profond, Accent Jaune Néon | `#fde047` |
| 🧛 **Dracula** | Sombre, Gris Anthracite, Accent Rouge Sang | `#ef4444` |
| 🌊 **Abyss** | Sombre, Bleu Océan, Accent Aqua | `#06b6d4` |
| 🏜️ **Dune** | Clair, Fond Sable, Accent Orange Brûlé | `#f97316` |
| 🔮 **Amethyst** | Sombre, Violet Profond, Accent Violet Brillant | `#8b5cf6` |

### Thèmes Saisonniers
| Nom | Ambiance | Couleur d'accent principale |
|---|---|---|
| 🎃 **Spooky (Halloween)** | Sombre, Noir, Accent Citrouille | `#f97316` |
| 🎄 **Festive (Noël)** | Sombre, Vert Sapin, Accent Or | `#eab308` |
| ❄️ **Frostbite (Hiver)** | Sombre, Bleu Glacial, Accent Blanc Neige | `#ffffff` |


**Ce que chaque thème surcharge dans `index.css` :**
- `--brand-primary` — couleur principale des boutons et bordures fortes
- `--brand-glow` — couleur du halo/néon
- `--text-primary` — titres et infos clés
- `--grad-btn-primary` — dégradé des boutons d'action
- `--grad-glow-border` — l'effet de bordure animée
- `--bg-app` & `--bg-card` — fonds de page et de carte

**Color Picker d'accent (liberté totale dans un cadre sûr) :**
- [x] En plus des presets, ajouter **un sélecteur de couleur d'accent personnalisé** (composant `<input type="color">` ou une roue HSL)
- [x] Le picker ne modifie que les 3 variables d'accent clés : `--brand-primary`, `--brand-glow`, et `--text-primary` — le reste du thème (fonds, typographie de base, etc.) reste intact pour préserver la lisibilité
- [x] Afficher un **aperçu en temps réel** dans la page Paramètres avant de valider

**Implémentation technique :**
- [x] Créer un `ThemePresetContext.tsx` (ou étendre `ThemeContext`) avec les états : `activePreset` (string) et `customAccentColor` (hex)
- [x] Sauvegarder dans `localStorage` : clé `theme-preset` (ex: `"ember"`) + clé `theme-accent` (ex: `"#ff6b35"`)
- [x] Appliquer via `document.body.setAttribute('data-preset', preset)` et en injectant les CSS vars custom via `document.documentElement.style.setProperty('--brand-primary', color)`
- [x] Créer une **page ou section Paramètres** (si elle n'existe pas encore) dans le menu utilisateur de la Navbar
- [x] Dans le composant [`ThemeToggle`](../src/components/secondary/Navbar/UserMenuParts/ThemeToggle/index.tsx) de la Navbar : ajouter un lien rapide "⚙️ Personnaliser" qui redirige vers la page Paramètres

---

### 2.5 · Intégration Steam DB
> Pré-remplir automatiquement les informations (nom, date de sortie, genre, plateforme, developpeur, cover) d'un jeu lors de son ajout et gardé la main pour des modifications.
- [x] Explorer Steam API pour récupérer : cover, genre, date de sortie, plateforme, tags, developpeur
- [x] Ajouter un champ de recherche "Importer depuis Steam" dans `AddEditGame`
- [x] Mapper les données Steam vers les champs du formulaire existant
- [x] Améliorer l'interface utilisateur pour faciliter la recherche et la sélection des jeux
- [x] Possibilité d'ajouté plateforme, genre depuis la page d'ajout de jeu, sans avoir à quitter la page (comme pour les tags).
- [x] si un jeu n'est pas encore sortie, le mettre dans la wishlist automatiquement.
- [x] si on a déjà un cover, ne pas le remplacer par un autre (du moins pas par défaut, laisser le choix à l'utilisateur) et ainsi mettre les informations (développeur, date de sortie, plateforme, éditeur, genre qui doivent être récupéré) liée au jeu automatiquement.

---

## 🔵 Priorité 3 — Plus tard (Backlog)

### 3.1 · Système d'Emails (SMTP)
> Emails transactionnels pour la gestion de compte et la communauté.
- [x] Configurer **Nodemailer** avec **Gmail** (Production) et **Mailtrap** (Développement), comme sur ToyVerse (gratuit et efficace)
- [x] n'avoir aucun problème quand on crée des compte de test, pour l'envoie de mail de confirmation.
- [x] Réinitialisation de mot de passe par email
- [x] Changement d'adresse email avec confirmation
- [x] Formulaire de signalement de bug / suggestion (envoi par email).

---

### 3.2 · Amélioration des thèmes
- [ ] Améliore les couleurs des thèmes si c'est possible.
- [x] amélioré les animations des thèmes notamment ceux du thèms "Ete" et "Hiver" si c'est possible.
- [ ] amélioré les polices pour une meilleures immersion si c'est possible.
- [ ] me donner et uniquement me donner d'autres idées de nouveaux thèmes que se soit classique, saisonnier ou d'autres type de thème. J'en veux au moins 50 idées de chaque type de thèmes avec les couleurs, polices et animations qui vont avec si c'est possible.
- [ ] dans le menu de la navbar c'est écrit "pilot" alors que ca doit être le nom de l'utilisateur,  dans le menu de la navbar, quand on clique sur son avatar, on voit "pilot" au lieu de son nom. Dans ce menu ajoute un accès direct à la page wishlist.
- [ ] je peux changer les mdp mais pas les mail, pour les mail ca va trop vite contrairement au mdp.
- [x] migration vers igdb (récupération des clé client et secret fait, reste à implementé dans le code, phase 1)
---

## 💡 Banque d'idées futures/roadmap futur

*Ces idées ne sont pas encore planifiées, mais méritent d'être gardées en tête.*

| Idée | Description courte |
|---|---|
| 📤 **Export de collection** | Exporter sa collection en CSV, JSON ou PDF stylisé (carte de visite du collectionneur) |
| 🔔 **Notifications in-app** | Centre de notifications pour les trophées débloqués, sorties de jeux wishlistés, mises à jour |
| 📅 **Calendrier de sorties** | Intégrer un calendrier des prochaines sorties liées aux jeux de la Wishlist |
| 🔍 **Recommandations** | Suggérer des jeux à ajouter basés sur les genres et plateformes déjà présents dans la collection |
| **GamePad** | utilisation de la manette pour naviguer et interagir avec l'application 
