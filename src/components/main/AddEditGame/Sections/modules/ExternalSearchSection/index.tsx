import { faSearch, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useState } from 'react'

import { ExternalGameSearchResult, searchExternalGames } from '@/services/externalApiService'

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
    setQuery('')
    onGameSelected(game)
  }

  return (
    <div className="form-section bg-[#1e1e24] p-4 rounded-xl mb-4 relative z-50">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <FontAwesomeIcon icon={faSearch} className="text-purple-400" />
        Rechercher dans la base IGDB
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
        * Les métadonnées importées (genres, couverture, date) proviennent de la base de données
        universelle IGDB (Twitch).
      </p>
    </div>
  )
}
