import './SandboxThemes.css'

import {
  faCheckCircle,
  faChevronDown,
  faChevronRight,
  faPlus,
  faSearch,
  faSpinner,
  faTrash,
  faUnlock,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Papa from 'papaparse'
import React, { useEffect, useRef,useState } from 'react'
import { Link } from 'react-router'

import { THEME_REGISTRY } from '@/config/themeRegistry'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showImportModal, setShowImportModal] = useState(false)
  const [unlockedThemesModal, setUnlockedThemesModal] = useState<any[]>([])

  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([])

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    )
  }

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
    if (simulatedLibrary.some((g) => g.id === gameId)) return

    setIsAdding(true)
    try {
      const details = await getExternalGameDetails(gameId)
      if (details) {
        setSimulatedLibrary((prev) => [...prev, details])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveGame = (gameId: string) => {
    setSimulatedLibrary((prev) => prev.filter((g) => g.id !== gameId))
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ''), // Strip BOM and spaces
      complete: (results) => {
        console.debug('CSV Parsé:', results)
        if (!results.data || results.data.length === 0) {
          alert('Le fichier CSV semble vide ou mal formaté.')
          return
        }

        const parsedGames = results.data.map((row: any, index: number) => {
          // Some CSVs might use "nom", "title", "name", etc.
          const gameName =
            row.name || row.title || row.nom || row.Name || row.Title || `Jeu inconnu ${index}`
          return {
            id: `csv-${index}-${Date.now()}`,
            name: gameName,
            genres: row.genre
              ? String(row.genre)
                  .split(',')
                  .map((s) => s.trim())
              : [],
            tags: row.tags
              ? String(row.tags)
                  .split(',')
                  .map((s) => s.trim())
              : [],
          } as ExternalGameDetails
        })

        console.debug('Jeux simulés générés:', parsedGames)

        // Combiner avec la bibliothèque existante au lieu de l'écraser ?
        // Pour l'instant, on va remplacer, mais on calcule ce qui est débloqué.
        const newLibrary = parsedGames

        const unlocked: any[] = []
        THEME_REGISTRY.forEach((cat) => {
          cat.themes.forEach((theme) => {
            const val = theme.rule.evaluate(newLibrary)
            if (val >= theme.rule.max) {
              unlocked.push(theme)
            }
          })
        })

        setSimulatedLibrary(newLibrary)
        setUnlockedThemesModal(unlocked)
        setShowImportModal(true)
      },
      error: (error) => {
        console.error('Erreur PapaParse:', error)
        alert('Erreur lors de la lecture du fichier CSV: ' + error.message)
      },
    })

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="sandbox-container">
      {/* --- MODAL D'IMPORT --- */}
      {showImportModal && (
        <div
          className="sandbox-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            className="sandbox-modal-content"
            style={{
              backgroundColor: '#0f172a',
              padding: '2.5rem',
              borderRadius: '16px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '2px solid var(--brand-glow)',
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(139, 92, 246, 0.3)',
            }}
          >
            <h2
              style={{
                color: 'var(--brand-glow)',
                marginBottom: '1rem',
                fontSize: '2.5rem',
                textTransform: 'uppercase',
                letterSpacing: '2px',
              }}
            >
              🎉 Import Réussi ! 🎉
            </h2>
            <p style={{ marginBottom: '2rem', fontSize: '1.2rem', color: '#cbd5e1' }}>
              Votre collection a été analysée et vous a permis de débloquer{' '}
              <strong style={{ color: '#facc15', fontSize: '1.5rem' }}>
                {unlockedThemesModal.length}
              </strong>{' '}
              thèmes !
            </p>

            {unlockedThemesModal.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  justifyContent: 'center',
                  marginBottom: '3rem',
                }}
              >
                {unlockedThemesModal.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
                      borderRadius: '12px',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.1rem',
                      textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      transform: 'translateY(0)',
                      transition: 'transform 0.2s',
                    }}
                  >
                    {t.name}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginBottom: '3rem', fontStyle: 'italic', color: '#94a3b8' }}>
                Aucun nouveau thème débloqué pour le moment. Ajoutez d'autres jeux !
              </p>
            )}

            <button
              className="sandbox-btn"
              onClick={() => setShowImportModal(false)}
              style={{ fontSize: '1.2rem', padding: '1rem 3rem', borderRadius: '50px' }}
            >
              Incroyable !
            </button>
          </div>
        </div>
      )}

      <header className="sandbox-header">
        <Link to="/admin" className="admin-back-link">
          ← Retour à l'administration
        </Link>
        <h1>🧪 Sandbox Thèmes</h1>
        <p>
          Banc d'essai pour simuler l'algorithme de déblocage des thèmes Films & Séries via IGDB.
        </p>
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
              {isSearching ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faSearch} />
              )}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="sandbox-search-results">
              {searchResults.slice(0, 5).map((result) => (
                <div key={result.id} className="sandbox-search-item">
                  <div className="sandbox-search-item-info">
                    {result.coverUrl && (
                      <img src={result.coverUrl} alt="cover" className="sandbox-cover" />
                    )}
                    <span>
                      {result.name} {result.releaseYear ? `(${result.releaseYear})` : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAddGame(result.id)}
                    disabled={isAdding || simulatedLibrary.some((g) => g.id === result.id)}
                    className="sandbox-btn-add"
                  >
                    <FontAwesomeIcon icon={faPlus} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <h2 style={{ marginTop: '2rem' }}>📥 Importer un fichier (CSV)</h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              marginBottom: '1rem',
            }}
          >
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleCsvUpload}
            />
            <button
              className="sandbox-btn"
              onClick={() => fileInputRef.current?.click()}
              style={{ width: 'fit-content' }}
            >
              Téléverser un CSV
            </button>
          </div>

          <h2 style={{ marginTop: '2rem' }}>
            📚 Bibliothèque Virtuelle ({simulatedLibrary.length})
          </h2>
          <div className="sandbox-library">
            {simulatedLibrary.length === 0 ? (
              <p className="sandbox-empty">Aucun jeu ajouté pour l'instant.</p>
            ) : (
              simulatedLibrary.map((game) => {
                const contributions = THEME_RULES.filter((r) => {
                  try {
                    return r.evaluate([game]) > 0
                  } catch {
                    return false
                  }
                }).map((r) => r.name)

                return (
                  <div key={game.id} className="sandbox-library-item">
                    <div className="sandbox-library-item-content">
                      <span className="sandbox-game-title">{game.name}</span>
                      <span className="sandbox-game-meta">
                        <strong>Genres:</strong> {game.genres?.join(', ') || 'N/A'} <br />
                        <strong>Tags:</strong> {game.tags?.join(', ') || 'N/A'}
                      </span>
                      {contributions.length > 0 && (
                        <div className="sandbox-game-contributions">
                          <FontAwesomeIcon icon={faUnlock} className="sandbox-unlock-icon" />
                          Contribue à : <strong>{contributions.join(', ')}</strong>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveGame(game.id)}
                      className="sandbox-btn-remove"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Colonne de Droite : Progression des Thèmes */}
        <div className="sandbox-column">
          <h2>🏆 Progression des Thèmes</h2>
          <div className="sandbox-themes-list">
            {THEME_REGISTRY.map((category) => {
              const isCollapsed = collapsedCategories.includes(category.id)

              return (
                <div
                  key={category.id}
                  className="sandbox-category-group"
                  style={{ marginBottom: '2rem' }}
                >
                  <h3
                    onClick={() => toggleCategory(category.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.2)',
                      paddingBottom: '0.5rem',
                      marginBottom: '1rem',
                      color: 'var(--brand-glow)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      userSelect: 'none',
                    }}
                  >
                    <span>{category.title}</span>
                    <FontAwesomeIcon
                      icon={isCollapsed ? faChevronRight : faChevronDown}
                      style={{ fontSize: '0.8em', opacity: 0.7 }}
                    />
                  </h3>

                  {!isCollapsed && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {category.themes.map((theme) => {
                        const currentVal = theme.rule.evaluate(simulatedLibrary)
                        const displayVal = Math.min(currentVal, theme.rule.max)
                        const percent = (displayVal / theme.rule.max) * 100
                        const isUnlocked = displayVal >= theme.rule.max

                        return (
                          <div
                            key={theme.id}
                            className={`sandbox-theme-item ${isUnlocked ? 'unlocked' : ''}`}
                          >
                            <div className="sandbox-theme-header">
                              <div className="sandbox-theme-title-box">
                                <span className="sandbox-theme-name">{theme.name}</span>
                                <span className="sandbox-theme-condition">
                                  {theme.rule.condition}
                                </span>
                              </div>
                              <span>
                                {isUnlocked ? (
                                  <FontAwesomeIcon
                                    icon={faCheckCircle}
                                    className="sandbox-unlocked-icon"
                                  />
                                ) : (
                                  `${displayVal} / ${theme.rule.max}`
                                )}
                              </span>
                            </div>
                            <div className="sandbox-progress-bar-bg">
                              <div
                                className="sandbox-progress-bar-fill"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
