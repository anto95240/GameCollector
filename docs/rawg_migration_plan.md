# Migration vers RAWG API (Quand l'inscription fonctionnera)

Ce plan est conçu pour te guider (ou me guider) très facilement pour passer de l'API Steam (actuelle) à l'API **RAWG**, une fois que tu auras réussi à créer ton compte et obtenir ta clé API.

## Pourquoi migrer vers RAWG ?
- **Jeux Consoles :** Tu pourras importer des jeux exclusifs PlayStation, Nintendo, Xbox (ce qui est impossible avec Steam).
- **Stabilité :** Plus besoin d'utiliser un Proxy CORS public (qui peut tomber en panne). RAWG est conçu pour les requêtes web front-end.
- **Qualité :** Les jaquettes (covers) sont souvent de bien meilleure qualité et sans logo dessus.

---

## Ce qu'il faudra faire

L'architecture actuelle a été pensée de manière "abstraite". Cela signifie que la barre de recherche (`ExternalSearchSection`) et la logique de remplissage du formulaire (`useAddEditGame`) **n'auront pas besoin d'être modifiées du tout**. 

Il y aura seulement **2 étapes simples** :

### 1. Ajouter la clé API dans tes variables d'environnement
Dans ton fichier `.env.local` (à la racine de ton projet), il faudra ajouter la clé que RAWG t'aura fournie :
```env
VITE_RAWG_API_KEY=ta_cle_api_ici
```

### 2. Mettre à jour le fichier `src/services/externalApiService.ts`
C'est le seul fichier de code qui gère la communication externe. Il faudra simplement remplacer les requêtes Steam par les requêtes RAWG. Voici à quoi ressemblera le nouveau code :

#### A. Remplacer la recherche (`searchExternalGames`)
```typescript
export const searchExternalGames = async (query: string): Promise<ExternalGameSearchResult[]> => {
  const RAWG_KEY = import.meta.env.VITE_RAWG_API_KEY
  const response = await fetch(`https://api.rawg.io/api/games?search=${query}&key=${RAWG_KEY}&page_size=5`)
  const data = await response.json()
  
  return data.results.map((item: any) => ({
    id: item.id.toString(),
    name: item.name,
    coverUrl: item.background_image,
    releaseYear: item.released ? parseInt(item.released.substring(0, 4)) : undefined
  }))
}
```

#### B. Remplacer les détails (`getExternalGameDetails`)
```typescript
export const getExternalGameDetails = async (gameId: string): Promise<ExternalGameDetails | null> => {
  const RAWG_KEY = import.meta.env.VITE_RAWG_API_KEY
  const response = await fetch(`https://api.rawg.io/api/games/${gameId}?key=${RAWG_KEY}`)
  const gameInfo = await response.json()
  
  // RAWG donne tout directement (développeurs, genres, plateformes)
  const releaseYear = gameInfo.released ? parseInt(gameInfo.released.substring(0, 4)) : undefined
  const isComingSoon = gameInfo.tba || (releaseYear && releaseYear > new Date().getFullYear())

  return {
    id: gameId,
    name: gameInfo.name,
    description: gameInfo.description_raw,
    coverUrl: gameInfo.background_image,
    releaseYear,
    isComingSoon,
    developers: gameInfo.developers?.map((d: any) => d.name) || [],
    genres: gameInfo.genres?.map((g: any) => g.name) || [],
    platforms: gameInfo.platforms?.map((p: any) => p.platform.name) || []
  }
}
```

---

## Comment procéder le jour J ?
Quand tu auras ta clé API, il te suffira de me la donner dans le chat, ou de la mettre toi-même dans le `.env.local` et de me dire : 
> *"J'ai ma clé RAWG, applique le plan de migration pour passer de Steam à RAWG."*

Je ferai le changement en 30 secondes chrono, car tout le reste du système (conversion de l'image, création silencieuse, dictionnaire de normalisation) est déjà conçu pour s'adapter !
