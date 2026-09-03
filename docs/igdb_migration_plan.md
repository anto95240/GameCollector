# Plan de Migration vers IGDB (Guide Étape par Étape)

Ce document détaille exactement toutes les étapes pour passer à l'API IGDB. Le processus est divisé en deux parties : ce que **VOUS** devez faire manuellement (création des comptes/clés), et ce que **JE** (l'assistant) ferai dans le code.

---

## 🟢 PHASE 1 : Ce que VOUS devez faire (Actions Manuelles)

Ce sont les étapes de configuration que je ne peux pas faire à votre place car elles nécessitent vos accès personnels.

### Étape 1 : Activer l'Authentification à 2 facteurs (A2F) sur Twitch
Pour devenir développeur sur Twitch, votre compte doit être sécurisé.
1. Allez sur [Twitch.tv](https://www.twitch.tv/) et connectez-vous avec votre compte normal.
2. Allez dans **Paramètres** > **Sécurité et confidentialité**.
3. Assurez-vous que l'**Authentification à double facteur (A2F)** est activée.

### Étape 2 : Créer l'application sur la console développeur
1. Allez sur le [Portail Développeur Twitch](https://dev.twitch.tv/console).
2. Connectez-vous si on vous le demande.
3. Dans le menu à gauche, cliquez sur **Applications** (ou *Apps*).
4. Cliquez sur le bouton violet **Register Your Application** (Enregistrer votre application) en haut à droite.
5. Remplissez le formulaire :
   - **Name (Nom)** : `GameCollectorApp` (ou le nom que vous voulez, il doit être unique).
   - **OAuth Redirect URLs** : Entrez `http://localhost` puis cliquez sur le bouton "Add" (Ajouter).
   - **Category (Catégorie)** : Choisissez `Application Integration`.
   - **Client Type** : S'il y a ce choix, choisissez `Confidential` (sinon ignorez).
6. Cliquez sur **Create** (Créer) tout en bas.

### Étape 3 : Récupérer vos deux clés
1. De retour sur la liste de vos applications, cliquez sur le bouton **Manage** (Gérer) à côté de `GameCollectorApp`.
2. Descendez jusqu'à la section **Client ID** : copiez ce code et gardez-le sous la main.
3. Juste en dessous, cliquez sur le bouton **New Secret** (Nouveau Secret).
4. **ATTENTION :** Un code va apparaître, c'est le **Client Secret**. Copiez-le immédiatement car *il ne s'affichera plus jamais*.

### Étape 4 : Enregistrer les clés de manière sécurisée dans Supabase
Nous n'allons surtout pas mettre ces clés dans le code source de l'application. Nous allons les donner au serveur de Supabase.
1. Allez sur votre tableau de bord [Supabase](https://supabase.com/dashboard).
2. Ouvrez votre projet `GameCollector`.
3. Dans le menu de gauche, allez dans **Edge Functions** (l'icône d'éclair ou de parenthèses `{}`).
4. En haut de la page des fonctions, cliquez sur l'onglet **Secrets** (ou allez dans *Project Settings > Edge Functions*).
5. Ajoutez les deux clés récupérées à l'étape précédente :
   - Cliquez sur **Add new secret**.
   - Nom (Name) : `TWITCH_CLIENT_ID` | Valeur : *(Collez votre Client ID)*
   - Cliquez sur **Add new secret** à nouveau.
   - Nom (Name) : `TWITCH_CLIENT_SECRET` | Valeur : *(Collez votre Client Secret)*

### Étape 5 : Me donner le feu vert !
Une fois que vous avez terminé les 4 étapes ci-dessus, revenez me parler dans le chat et dites-moi :
> *"C'est bon, j'ai configuré l'application Twitch et ajouté les secrets dans Supabase. Tu peux commencer la Phase 2 !"*

---

## 🔵 PHASE 2 : Ce que JE vais faire (Le Code)

Dès que vous me donnerez le feu vert, je prendrai le relais pour faire tout le travail de programmation. Voici ce que je ferai étape par étape :

### 1. Initialiser les Edge Functions localement
- Je vais utiliser le terminal pour lancer `npx supabase init` (si ce n'est pas déjà fait).
- Je vais créer une nouvelle fonction avec `npx supabase functions new igdb-proxy`.

### 2. Coder l'Edge Function (`igdb-proxy`)
- J'écrirai le code TypeScript côté serveur dans le dossier `supabase/functions/igdb-proxy/index.ts`.
- Ce code va :
  1. Lire les clés stockées de manière sécurisée.
  2. Demander un Jeton (Token) à Twitch.
  3. Recevoir les requêtes de votre barre de recherche.
  4. Interroger l'API d'IGDB avec leur syntaxe spécifique.
  5. Renvoyer les données (titre, image HD, développeurs, genres) à votre application.

### 3. Modifier l'application (`externalApiService.ts`)
- Je vais modifier le fichier `src/services/externalApiService.ts`.
- Je supprimerai tout l'ancien code lié à Steam.
- Je le remplacerai par des appels simples à `supabase.functions.invoke('igdb-proxy', { ... })`.

### 4. Déployer la fonction
- Je vous demanderai de lier votre projet local à Supabase via une commande `npx supabase link` (je vous guiderai).
- Ensuite, je déploierai la fonction sur vos serveurs Supabase.
- Nous testerons ensemble la recherche pour vérifier que les jeux, les images et les informations s'affichent parfaitement !
