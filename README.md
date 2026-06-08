# GameCollector

Application web dédié a la gestion et à la collection de tous vos jeux video.

Développé par Antoine RICHARD

## Les Fonctionnalités

- Thème clair/sombre
- Internationalisation (français / anglais)
- Responsive design (mobile / desktop)
- Statistiques avancé
- Page de profil (modification des infos, avatar, suppression)
- Recherche fuzzy
- Raccourci clavier
- Trophées
- Filtres avancés avec sauvegarde
- Favori et Wishlist

---

## Stack technique (Frontend)

- **Vite + React**
- **Axios**
- **Chart.js**
- **i18next** (traduction)

---

## Design & Maquette

La conception de l'interface a été réalisée en amont sur Figma.
[Consulter la maquette UI/UX de GameCollector](https://www.figma.com/design/4e0GAyg6KClMIK3eYRMy7U/GameCollector-web?node-id=1-278&t=RLsssnaq8F1oA1KK-1)

---

## Installation et Lancement

Ce dépôt concerne uniquement la partie **Frontend** de l'application.

## Prérequis

- [Node.js ≥ 18](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/try/download/community) (local ou [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))

---

### Étapes d'installation

**1. Cloner le projet**

```bash
git clone https://github.com/anto95240/GameCollector.git
```

**2.Installer les dépendances**

```bash
npm install
```

**3.Configurer les variables d'environnement**

Créer un fichier .env.local à la racine du projet et y ajouter l'URL de l'API (correspondant au port de votre backend) :

```bash
VITE_API_URL=http://localhost:5001
```

**4.Lancer le serveur de développement**
Lancer l'application (après s'etre assurer que le backend est lancé : [voir ici](https://github.com/zkerkeb-class/back-projet-final-anto95240/tree/main)) :

```bash
npm run dev
```

# Licence

Projet personnel open-source. Utilisation libre pour apprentissage et développement personnel uniquement.
