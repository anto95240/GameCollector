import './SandboxThemes.css'

import { faCheckCircle, faPlus, faSearch, faSpinner, faTrash, faUnlock } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect,useState } from 'react'

import { THEME_RULES } from '@/config/themeRules'
import {
  ExternalGameDetails,
  ExternalGameSearchResult,
  getExternalGameDetails,
  searchExternalGames,
} from '@/services/externalApiService'

export default function SandboxThemes() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ExternalGameSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  
  const [simulatedLibrary, setSimulatedLibrary] = useState<ExternalGameDetails[]>(() => {
    const saved = localStorage.getItem('sandboxLibrary')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('sandboxLibrary', JSON.stringify(simulatedLibrary))
  }, [simulatedLibrary])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await searchExternalGames(searchQuery)
      setSearchResults(results || [])
    } catch (error) {
      console.error(error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddGame = async (gameId: string) => {
    // Éviter les doublons
    if (simulatedLibrary.some(g => g.id === gameId)) return
    
    setIsAdding(true)
    try {
      const details = await getExternalGameDetails(gameId)
      if (details) {
        setSimulatedLibrary(prev => [...prev, details])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveGame = (gameId: string) => {
    setSimulatedLibrary(prev => prev.filter(g => g.id !== gameId))
  }

  return (
    <div className="sandbox-container">
      <header className="sandbox-header">
        <h1>🧪 Sandbox Thèmes</h1>
        <p>Banc d'essai pour simuler l'algorithme de déblocage des thèmes Films & Séries via IGDB.</p>
      </header>

      <div className="sandbox-grid">
        {/* Colonne de Gauche : Recherche & Bibliothèque */}
        <div className="sandbox-column">
          <h2>🔍 Ajouter un jeu (IGDB)</h2>
          <form onSubmit={handleSearch} className="sandbox-search-form">
            <input 
              type="text" 
              placeholder="Rechercher un jeu (ex: Cyberpunk 2077)..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="sandbox-input"
            />
            <button type="submit" disabled={isSearching} className="sandbox-btn">
              {isSearching ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSearch} />}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="sandbox-search-results">
              {searchResults.slice(0, 5).map(result => (
                <div key={result.id} className="sandbox-search-item">
                  <div className="sandbox-search-item-info">
                    {result.coverUrl && <img src={result.coverUrl} alt="cover" className="sandbox-cover" />}
                    <span>{result.name} {result.releaseYear ? `(${result.releaseYear})` : ''}</span>
                  </div>
                  <button 
                    onClick={() => handleAddGame(result.id)}
                    disabled={isAdding || simulatedLibrary.some(g => g.id === result.id)}
                    className="sandbox-btn-add"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '2rem' }}>📚 Bibliothèque Virtuelle ({simulatedLibrary.length})</h2>
          <div className="sandbox-library">
            {simulatedLibrary.length === 0 ? (
              <p className="sandbox-empty">Aucun jeu ajouté pour l'instant.</p>
            ) : (
              simulatedLibrary.map(game => {
                const contributions = THEME_RULES.filter(r => {
                  try { return r.evaluate([game]) > 0 }
                  catch { return false }
                }).map(r => r.name)

                return (
                <div key={game.id} className="sandbox-library-item">
                  <div className="sandbox-library-item-content">
                    <span className="sandbox-game-title">{game.name}</span>
                    <span className="sandbox-game-meta">
                      <strong>Genres:</strong> {game.genres?.join(', ') || 'N/A'} <br/>
                      <strong>Tags:</strong> {game.tags?.join(', ') || 'N/A'}
                    </span>
                    {contributions.length > 0 && (
                      <div className="sandbox-game-contributions">
                        <FontAwesomeIcon icon={faUnlock} className="sandbox-unlock-icon" /> 
                        Contribue à : <strong>{contributions.join(', ')}</strong>
                      </div>
                    )}
                  </div>
                  <button onClick={() => handleRemoveGame(game.id)} className="sandbox-btn-remove">
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              )})
            )}
          </div>
        </div>

        {/* Colonne de Droite : Progression des Thèmes */}
        <div className="sandbox-column">
          <h2>🏆 Progression des Thèmes</h2>
          <div className="sandbox-themes-list">
            {THEME_RULES.map(rule => {
              const currentVal = rule.evaluate(simulatedLibrary)
              const displayVal = Math.min(currentVal, rule.max)
              const percent = (displayVal / rule.max) * 100
              const isUnlocked = displayVal >= rule.max

              return (
                <div key={rule.id} className={`sandbox-theme-item ${isUnlocked ? 'unlocked' : ''}`}>
                  <div className="sandbox-theme-header">
                    <div className="sandbox-theme-title-box">
                      <span className="sandbox-theme-name">{rule.name}</span>
                      <span className="sandbox-theme-condition">{rule.condition}</span>
                    </div>
                    <span>
                      {isUnlocked ? <FontAwesomeIcon icon={faCheckCircle} className="sandbox-unlocked-icon" /> : `${displayVal} / ${rule.max}`}
                    </span>
                  </div>
                  <div className="sandbox-progress-bar-bg">
                    <div className="sandbox-progress-bar-fill" style={{ width: `${percent}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
