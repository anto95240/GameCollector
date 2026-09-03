# Comparatif des APIs de Jeux Vidéo : RAWG vs IGDB

Ce document compare les deux plus grandes bases de données de jeux vidéo accessibles par API, afin de vous aider à choisir la meilleure solution pour le projet **GameCollector**.

---

## 1. Vue d'ensemble

| Caractéristique | RAWG Video Games Database | IGDB (Internet Game Database - par Twitch) |
| :--- | :--- | :--- |
| **Créateur** | RAWG Inc. | Twitch (Amazon) |
| **Taille de la base** | ~800,000+ jeux | ~350,000+ jeux (mais plus qualitatifs/détaillés) |
| **Stabilité des serveurs** | Moyenne (erreurs 500 ou lenteurs fréquentes récemment) | Excellente (Hébergé sur l'infrastructure AWS/Twitch) |
| **Prix** | Gratuit (jusqu'à 20 000 requêtes/mois) | 100% Gratuit (limite très haute d'environ 4 requêtes/sec) |
| **Système de Recommandation**| Basique (jeux similaires selon les développeurs/genres) | **Excellent** (champ natif `similar_games`, tags extrêmement précis) |
| **Types de données** | Titres, images, genres, plateformes, metacritic | Titres, images HD, thèmes, points de vue, moteurs 3D, franchises, jeux similaires |

---

## 2. Procédure pour obtenir la clé API (Authentification)

### 🟢 RAWG : La méthode ultra-simple (Clé Statique)

RAWG utilise une simple clé d'API statique que vous passez dans l'URL.

**Étapes :**
1. Allez sur le site de [RAWG API](https://rawg.io/apidocs).
2. Créez un compte utilisateur gratuit (ou connectez-vous avec GitHub/Google).
3. En haut à droite, cliquez sur votre profil puis allez dans **Settings** (Paramètres).
4. Dans le menu de gauche, cliquez sur **API keys**.
5. Cliquez sur le bouton "Get an API key".
6. Remplissez une URL (même factice comme `https://mon-app.com`) et une courte description.
7. Votre clé est générée (ex: `1234567890abcdef1234567890abcdef`).

**Comment l'utiliser :**
Il suffit d'ajouter `?key=VOTRE_CLE` à la fin de vos requêtes.
*Exemple :* `https://api.rawg.io/api/games?key=1234567890abcdef&search=mario`

⚠️ *Problème : Si cette clé est utilisée côté client (ex: React), tout le monde peut la voir et l'utiliser.*

---

### 🔵 IGDB : La méthode professionnelle (OAuth2 via Twitch)

IGDB utilise le système d'authentification de Twitch. C'est plus sécurisé, mais nécessite une étape supplémentaire (la génération d'un jeton temporaire).

**Étapes :**
1. **Activer l'A2F :** Assurez-vous d'avoir un compte Twitch avec l'Authentification à 2 Facteurs (A2F) activée.
2. **Créer l'application :** Allez sur la [Twitch Developer Console](https://dev.twitch.tv/console).
3. Connectez-vous avec votre compte Twitch.
4. Dans le menu, cliquez sur **Applications** puis sur **Register Your Application**.
5. Remplissez le formulaire :
   - *Name* : `GameCollectorApp` (ou autre)
   - *OAuth Redirect URLs* : `http://localhost` (peu importe pour notre usage serveur)
   - *Category* : `Application Integration`
6. Cliquez sur **Create**.
7. Cliquez sur **Manage** à côté de votre nouvelle application.
8. Vous verrez ici votre **Client ID**. Cliquez sur **New Secret** pour générer votre **Client Secret**. (⚠️ Copiez-le bien, il ne s'affichera qu'une fois).

**Comment l'utiliser :**
Vous devez d'abord faire une requête POST à Twitch avec votre ID et votre Secret pour obtenir un `Access Token`, puis utiliser ce token pour interroger IGDB. C'est ici que Supabase intervient.

---

## 3. Intégration avec Supabase (Architecture recommandée)

Puisque **GameCollector** utilise Supabase et n'a pas de serveur back-end dédié, voici comment gérer les APIs.

### Si vous utilisez RAWG :
Vous pouvez appeler l'API directement depuis votre code Front-end (React/Vue/Svelte), mais votre clé sera visible dans le code source de l'application.

### Si vous utilisez IGDB (Recommandé) :
Vous devez utiliser les **Supabase Edge Functions**.

1. Vous stockez le `Client ID` et `Client Secret` de Twitch dans les "Secrets" de Supabase (totalement invisibles pour les utilisateurs).
2. Vous créez une Edge Function (ex: `fetch-igdb-games`).
3. Quand votre site web a besoin de chercher un jeu, il appelle cette fonction Supabase.
4. La fonction Supabase s'occupe de demander l'autorisation à Twitch, interroge IGDB, récupère les données, et les renvoie à votre site web de façon sécurisée.

---

## 4. Bilan et Verdict pour GameCollector

* **Choisissez RAWG si :** Vous voulez coder la fonctionnalité dans les 10 prochaines minutes, sans vous soucier de l'architecture serveur ou de la sécurité de la clé. Mais attention aux pannes de leurs serveurs.
* **Choisissez IGDB si :** Vous voulez un système robuste, professionnel, et surtout **pour préparer le terrain de votre futur système de recommandations**. C'est le standard de l'industrie aujourd'hui. L'utilisation des *Edge Functions* de Supabase rendra votre application très propre et sécurisée.
