# Architecture du Projet - Game Collector

Bienvenue dans la documentation architecturale de Game Collector ! Ce document a pour but d'aider tout nouveau développeur à comprendre comment le projet est structuré, quels sont les patterns utilisés et comment naviguer dans le code.

## 1. Structure Globale

Le projet suit une architecture modulaire basée sur les principes de "Feature-Sliced Design" (bien que simplifiée) pour séparer clairement la logique métier, la logique d'interface et les appels API.

```
src/
├── components/    # Composants React réutilisables (UI pure)
│   ├── common/    # Composants génériques (Boutons, Inputs, ErrorBoundary)
│   └── main/      # Layouts et conteneurs principaux de l'app
├── config/        # Fichiers de configuration (Router, Axios, i18n)
├── context/       # React Contexts (Global state: Auth, Theme, Filters)
├── hooks/         # Custom Hooks (Séparation totale UI / Métier / API)
├── screens/       # Pages principales de l'application (Views)
├── services/      # Logique hors-React (Services purs, LocalStorage)
└── utils/         # Fonctions utilitaires pures (Formatage, Maths)
```

## 2. Patterns Utilisés

### 2.1 Séparation des Responsabilités (Hooks Architecture)

Pour éviter les composants dits "Spaghetti" (où l'UI et la logique de récupération de données sont mélangées), nous utilisons massivement les Custom Hooks répartis en trois couches :

- **Hooks d'API (`hooks/api/`)** : S'occupent uniquement des requêtes HTTP avec Axios. Ils gèrent le loading, l'erreur et le formatage brut des réponses.
- **Hooks de Domaine (`hooks/domains/`)** : Gèrent la logique métier spécifique à une entité (ex: `useGameDetail`, `useAuth`). Ils consomment les hooks d'API et le Context, puis appliquent les règles métier.
- **Hooks d'UI (`hooks/ui/`)** : Gèrent les comportements purement visuels (ex: `useCarousel`, `useKeyboardShortcuts`, `useScrollSpy`).

> **Pourquoi ?** Un composant dans `screens/` ne doit jamais faire d'appel Axios direct. Il doit appeler un hook de domaine (`const { game, isLoading } = useGameDetail(id)`), ce qui rend les composants très faciles à lire et à tester.

### 2.2 Global State Management (Context API)

Nous utilisons l'API Context de React pour les états globaux qui changent peu ou qui doivent être accessibles partout.

- `AuthContext` : Garde l'utilisateur et son token.
- `ThemeProvider` : Gère le dark/light mode.
- `ToastContext` : Gère l'affichage des notifications temporaires.

### 2.3 Lazy Loading et Route Based Code-Splitting

Le routeur (`src/config/router.tsx`) utilise `React.lazy` pour charger les pages uniquement lorsqu'elles sont visitées. Cela réduit considérablement le poids du bundle initial (First Load).

### 2.4 Error Boundaries

Les erreurs inattendues de rendu (Render Exceptions) sont capturées par `ErrorBoundary`. Cela empêche l'écran blanc de la mort de React et affiche le composant de secours `ErrorFallback`.

## 3. Conventions de Code et Bonnes Pratiques

- **JSDoc** : Les fonctions métier complexes et les hooks doivent inclure une documentation JSDoc décrivant les paramètres d'entrée et de sortie.
- **Dénomination** :
  - Composants : `PascalCase` (ex: `GameCard.jsx`)
  - Hooks : `camelCase` préfixé par `use` (ex: `useApiGame.jsx`)
  - Utilitaires : `camelCase` (ex: `formatDate.js`)
- **Import Aliases** : Utilisez le préfixe `@/` pour pointer vers le dossier `src/` (configuré dans Vite). Cela évite les imports relatifs compliqués comme `../../../components/`.

## 4. Gestion de la Logique Complexe

Lorsque vous travaillez sur des algorithmes de filtrage (ex: `useGameFiltering`) ou des grilles virtuelles, privilégiez des fonctions pures et documentez le "Pourquoi" (le cas d'usage) plutôt que le "Comment" (ce que fait le code ligne par ligne).

---

_Ce document évoluera avec le projet, gardez-le à jour lors d'ajouts architecturaux majeurs (ex: passage à Redux/Zustand si nécessaire, ou migration TypeScript complète)._
