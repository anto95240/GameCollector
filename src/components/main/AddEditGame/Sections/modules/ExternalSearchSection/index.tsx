import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'

import {
  ExternalGameSearchResult,
  getExternalGameDetails,
  searchExternalGames,
} from '@/services/externalApiService'

interface ExternalSearchSectionProps {
  t: (key: string) => string
  onGameSelected: (gameDetails: any) => void
}

export const ExternalSearchSection = ({ t: _t, onGameSelected }: ExternalSearchSectionProps) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExternalGameSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.length >= 3) {
        setIsSearching(true)
        const res = await searchExternalGames(query)
        setResults(res)
        setIsSearching(false)
        setShowDropdown(true)
      } else {
        setResults([])
      }
    }, 200)

    return () => clearTimeout(delayDebounceFn)
  }, [query])

  const handleSelect = async (game: ExternalGameSearchResult) => {
    setShowDropdown(false)
    setIsSearching(true)
    let details = await getExternalGameDetails(game.id)
    setIsSearching(false)

    // Fallback : Si Steam refuse la connexion pour les détails (rate limit fréquent)
    if (!details) {
      details = {
        id: game.id,
        name: game.name,
        coverUrl: game.coverUrl,
        releaseYear: game.releaseYear,
        description: '',
        developers: [],
        genres: [],
        platforms: [],
        tags: [],
        isComingSoon: false,
      }

      // Essayer de récupérer le développeur, genres et tags via SteamSpy
      try {
        const spyResponse = await fetch(`/api/steamspy/api.php?request=appdetails&appid=${game.id}`)
        const spyData = await spyResponse.json()
        if (spyData) {
          if (spyData.genre) {
            let spyGenres = spyData.genre.split(',').map((g: string) => g.trim())
            // Réorganiser les genres pour privilégier RPG/Simulation devant Action
            const preferredGenres = ['RPG', 'Simulation', 'Adventure', 'Aventure']
            spyGenres = spyGenres.sort((a: string, b: string) => {
              const aPref = preferredGenres.some((p) => a.toLowerCase().includes(p.toLowerCase()))
                ? 1
                : 0
              const bPref = preferredGenres.some((p) => b.toLowerCase().includes(p.toLowerCase()))
                ? 1
                : 0
              return bPref - aPref
            })
            details.genres = spyGenres
          }
          if (spyData.developer) {
            details.developers = [spyData.developer]
          }
          if (spyData.tags) {
            const tagTranslations: Record<string, string> = {
              'Story Rich': 'Histoire riche',
              'Great Soundtrack': 'Excellente bande-son',
              'First-Person': 'Première personne',
              'Third Person': 'Troisième personne',
              'Sci-fi': 'Science-fiction',
              'Turn-Based': 'Tour par tour',
              'Local Multiplayer': 'Multijoueur local',
              'Local Co-Op': 'Coopération locale',
              'Online Co-Op': 'Coopération en ligne',
              'Family Friendly': 'Familial',
              Management: 'Gestion',
              Building: 'Construction',
              'Base Building': 'Construction de base',
              'Character Customization': 'Personnalisation',
              'Football (Soccer)': 'Football',
              'Life Sim': 'Simulation de vie',
              'Farming Sim': 'Simulation agricole',
              Cute: 'Mignon',
              Funny: 'Drôle',
              Difficult: 'Difficile',
              Stealth: 'Infiltration',
              'Card Game': 'Jeu de cartes',
              'Board Game': 'Jeu de plateau',
              Action: 'Action',
              Adventure: 'Aventure',
              Sports: 'Sport',
              Racing: 'Course',
              Fighting: 'Combat',
              Puzzle: 'Réflexion',
            }

            details.tags = Object.keys(spyData.tags)
              .slice(0, 10)
              .map((tag: string) => tagTranslations[tag] || tag)
          }
        }
      } catch (e) {
        // Silencieux si le secours échoue
      }
    }

    onGameSelected(details)
    setQuery('')
  }

  return (
    <div className="form-section bg-[#1e1e24] p-4 rounded-xl mb-4 relative z-50">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faSearch} className="text-purple-400" />
        Importer depuis Steam DB
      </h2>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <FontAwesomeIcon icon={faSpinner} className="text-gray-400 animate-spin" />
          ) : (
            <FontAwesomeIcon icon={faSearch} className="text-gray-400" />
          )}
        </div>
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-[#2a2a35] border border-[#3f3f4e] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
          placeholder="Rechercher un jeu pour pré-remplir les informations..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true)
          }}
        />

        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-[#1e1e24] border border-[#3f3f4e] rounded-xl shadow-2xl max-h-80 overflow-y-auto">
            {results.map((game) => (
              <div
                key={game.id}
                className="flex items-center gap-4 p-3 hover:bg-[#2a2a35] cursor-pointer transition-colors border-b border-[#2a2a35] last:border-b-0"
                onClick={() => handleSelect(game)}
              >
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={game.name}
                    className="w-12 h-16 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-12 h-16 bg-gray-700 rounded-md flex items-center justify-center">
                    <span className="text-xs text-gray-400">N/A</span>
                  </div>
                )}
                <div>
                  <h4 className="text-white font-medium">{game.name}</h4>
                  {game.releaseYear && <p className="text-sm text-gray-400">{game.releaseYear}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-gray-500 mt-2 italic">
        * Les métadonnées importées (genres, couverture, date) proviennent de Steam et correspondent
        aux versions PC des jeux.
      </p>
    </div>
  )
}
