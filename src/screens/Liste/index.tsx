import './Liste.css'

import {
    faChevronLeft,
    faChevronRight,
    faClock,
    faGamepad,
    faGrip,
    faHeart,
    faTableCells,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import GameCard from '@/components/common/GameCard'
import VirtualGameGrid from '@/components/common/VirtualGameGrid'
import DeleteModal from '@/components/secondary/Liste/DeleteModal'
import FilterPanel from '@/components/secondary/Liste/Filtre/FilterPanel'
import ListeHeader from '@/components/secondary/Liste/ListeHeader'
import Pagination from '@/components/secondary/Liste/Pagination'
import { useAuth } from '@/context/AuthContext'
import { useApiFilters } from '@/hooks/api/useApiFilters'
import { useGameFiltering } from '@/hooks/domains/games/useGameFiltering'
import { useGamesList } from '@/hooks/domains/games/useGamesList'
import { useActiveOnScroll } from '@/hooks/ui/useActiveOnScroll'
import { useCarousel } from '@/hooks/ui/useCarousel'
import { useFuzzySearch } from '@/hooks/ui/useFuzzySearch'
import { useSearchBar } from '@/hooks/ui/useSearchBar'
import { useSearchBarShortcuts } from '@/hooks/ui/useSearchBarShortcuts'
import useVirtualGridDimensions from '@/hooks/ui/useVirtualGridDimensions'

const ListePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const searchInputRef = useRef(null)
  const { user } = useAuth()
  const { searchTerm, setSearchTerm, debouncedTerm } = useSearchBar('')
  useSearchBarShortcuts(searchInputRef)
  const { getUserFilters, saveUserFilter, deleteUserFilter, setActiveUserFilter } = useApiFilters()

  const { games, metadata, isLoading, toggleFavorite, toggleSoon, removeGame } =
    useGamesList(debouncedTerm)
  const fuzzySearchKeys = useMemo(() => ['name', 'genre', 'platform', 'status', 'year'], [])
  const { setQuery, results: fuzzyGames } = useFuzzySearch(games, fuzzySearchKeys)

  useEffect(() => {
    if (!import.meta.env.DEV) return

    console.debug('[liste-search] state', {
      searchTerm,
      debouncedTerm,
      totalGames: games.length,
      fuzzyGames: fuzzyGames.length,
    })
  }, [searchTerm, debouncedTerm, games.length, fuzzyGames.length])

  const {
    selectedFilters,
    handleSelectFilter,
    removeFilter,
    clearAllFilters,
    page,
    setPage,
    filteredGames,
    setSelectedFilters,
  } = useGameFiltering(fuzzyGames)

  useEffect(() => {
    setQuery(debouncedTerm)
    setPage(1)
  }, [debouncedTerm, setQuery, setPage])

  const { scrollRef, scroll } = useCarousel()
  const [activeTab, setActiveTab] = useState('all')
  const [viewMode, setViewMode] = useState('carousel') // "carousel" | "grid"
  const [activeMenuIndex, setActiveMenuIndex] = useState<any>(null)
  const [gameToDelete, setGameToDelete] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<any>(null)
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  // Virtual grid dimensions (only measured when grid view is active)
  const {
    ref: gridContainerRef,
    width: gridW,
    height: gridH,
    colCount,
  } = useVirtualGridDimensions(220)

  // --- filter metadata (genres, platforms, years, ratings, statuses)
  const filterData = useMemo(() => {
    if (!games) return []

    const genres = Array.from(new Set(games.map((g: any) => g.genre).filter(Boolean))).sort()
    const platforms = Array.from(new Set(games.map((g: any) => g.platform).filter(Boolean))).sort()
    const years = Array.from(
      new Set(games.map((g: any) => Number(g.year)).filter((y: any) => !Number.isNaN(y)))
    )
      .sort((a: any, b: any) => b - a)
      .map(String)
    const ratings = Array.from(
      new Set(games.map((g: any) => g.rating).filter((r: any) => r !== undefined && r !== null))
    )
      .sort((a: any, b: any) => b - a)
      .map(String)
    const statuses = Array.from(new Set(games.map((g: any) => g.status).filter(Boolean))).sort()

    const minYear = Math.min(...years.map(Number), 1900)
    const maxYear = Math.max(...years.map(Number), new Date().getFullYear())
    const minRating = Math.min(...ratings.map(Number), 0)
    const maxRating = Math.max(...ratings.map(Number), 10)

    return [
      { id: 'genre', label: 'Genre', options: genres },
      { id: 'platform', label: 'Plateforme', options: platforms },
      { id: 'year', label: 'Année', options: years },
      { id: 'year_range', label: "Intervalle d'années", type: 'range', min: minYear, max: maxYear },
      { id: 'rating', label: 'Note', options: ratings },
      {
        id: 'rating_range',
        label: 'Plage de notes',
        type: 'range',
        min: minRating,
        max: maxRating,
      },
      { id: 'status', label: 'Statut', options: statuses },
      { id: 'favorite', label: 'Favoris', options: ['Nos favoris', 'Non favoris'] },
      { id: 'soon', label: 'Prochainement', options: ['Prochainement', 'Pas prochainement'] },
      { id: 'sort', label: 'Trier par', type: 'sort', options: ['Nom', 'Année', 'Note'] },
    ]
  }, [games])

  // Saved filters (localStorage + placeholder for DB)
  const SAVED_KEY = 'savedFilters'
  const [savedFilters, setSavedFilters] = useState(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      return raw ? JSON.parse(raw) : []
    } catch (e: any) {
      return []
    }
  })

  const persistSaved = (items: any) => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(items))
    } catch (e: any) {
      // ignore
    }
  }

  useEffect(() => {
    const loadSavedFilters = async () => {
      if (!user) return

      try {
        const serverFilters = await getUserFilters()
        if (Array.isArray(serverFilters)) {
          const normalized = serverFilters.map((filter: any) => ({ ...filter, source: 'server' }))
          setSavedFilters(normalized)
          persistSaved(normalized)
        }
      } catch (error: any) {
        // fallback to localStorage already loaded
      }
    }

    loadSavedFilters()
  }, [user, getUserFilters])

  const normalizeSavedFilter = (entry: any) => ({
    id: entry.id || entry._id,
    name: entry.name,
    description: entry.description || '',
    filters: entry.filters || [],
    source: entry.source || 'local',
    isActive: Boolean(entry.isActive),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  })

  const handleSaveCurrentFilters = (name: string) => {
    const baseEntry = normalizeSavedFilter({
      id: String(Date.now()),
      name: name || `Filtre ${new Date().toLocaleString()}`,
      filters: selectedFilters,
      source: user ? 'server' : 'local',
    })

    const next = [baseEntry, ...savedFilters.filter((filter: any) => filter.id !== baseEntry.id)]

    const sync = async () => {
      if (!user) {
        setSavedFilters(next)
        persistSaved(next)
        return
      }

      const savedOnServer = await saveUserFilter({
        name: baseEntry.name,
        selectedFilters,
        description: JSON.stringify({ selectedFilters }),
        isActive: false,
      })

      const merged = normalizeSavedFilter({
        ...baseEntry,
        ...savedOnServer,
        source: 'server',
      })

      const updated = [merged, ...savedFilters.filter((filter: any) => filter.id !== merged.id)]
      setSavedFilters(updated)
      persistSaved(updated)
    }

    sync().catch(() => {
      setSavedFilters(next)
      persistSaved(next)
    })
  }

  const handleApplySaved = (entry: any) => {
    if (!entry || !entry.filters) return
    setSelectedFilters(entry.filters || [])
    setPage(1)

    if (user && entry.source === 'server' && entry.id) {
      setActiveUserFilter(entry.id).catch(() => {})
    }
  }

  const handleDeleteSaved = (id: string) => {
    const target = savedFilters.find((s: any) => s.id === id)
    const next = savedFilters.filter((s: any) => s.id !== id)
    setSavedFilters(next)
    persistSaved(next)

    if (user && target?.source === 'server') {
      deleteUserFilter(id).catch(() => {})
    }
  }

  // Filtrage par onglet basé sur les données MongoDB (isSoon / isFavorite)[cite: 3, 5]
  const tabFilteredGames = useMemo(() => {
    if (activeTab === 'favorites') {
      return filteredGames.filter((game: any) => game.isFavorite === true)
    }
    if (activeTab === 'wishlist') {
      return filteredGames.filter((game: any) => game.isSoon === true)
    }
    return filteredGames
  }, [filteredGames, activeTab])

  // Apply sorting if a sort filter is present
  const sortedGames = useMemo(() => {
    if (!tabFilteredGames) return []
    const sortTag = selectedFilters.find((s: string) => {
      const key = s.split(':')[0] || ''
      return key.toLowerCase().includes('trier') || key.toLowerCase().includes('sort')
    })

    if (!sortTag) return tabFilteredGames

    const sortValue = sortTag.split(': ')[1] || ''
    const [sortFieldRaw, sortOrderRaw = 'asc'] = sortValue.split('|')
    const sortField = sortFieldRaw || 'Nom'
    const sortOrder = sortOrderRaw || 'asc'
    const direction = sortOrder === 'desc' ? -1 : 1
    const copy = [...tabFilteredGames]
    switch (sortField) {
      case 'Nom':
        copy.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')) * direction)
        break
      case 'Année':
        copy.sort((a: any, b: any) => (Number(a.year || 0) - Number(b.year || 0)) * direction)
        break
      case 'Note':
        copy.sort((a: any, b: any) => (Number(a.rating || 0) - Number(b.rating || 0)) * direction)
        break
      default:
        break
    }
    return copy
  }, [tabFilteredGames, selectedFilters])

  const pageSize = 8
  const totalPages = Math.ceil(sortedGames.length / pageSize) || 1
  const paginatedGames = sortedGames.slice((page - 1) * pageSize, page * pageSize)

  const activeId = useActiveOnScroll(scrollRef, '.observer-item', paginatedGames)

  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setPage(1)
  }, [])

  const handleToggleMenu = useCallback((i: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveMenuIndex((prevIndex: any) => (prevIndex === i ? null : i))
  }, [])

  const handleDeleteRequest = useCallback((game: any) => {
    setActiveMenuIndex(null)
    setGameToDelete(game)
  }, [])

  const handleToggleFavorite = useCallback(
    (g: any) => {
      setActiveMenuIndex(null)
      toggleFavorite(g)
    },
    [toggleFavorite]
  )

  const handleScrollLeft = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      scroll('left')
    },
    [scroll]
  )

  const handleScrollRight = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      scroll('right')
    },
    [scroll]
  )

  const handleAddGame = useCallback(() => {
    navigate('/game/add-edit-game')
  }, [navigate])

  const handlePagePrev = useCallback(() => {
    setPage((p: any) => Math.max(1, p - 1))
  }, [])

  const handlePageNext = useCallback(() => {
    setPage((p: any) => Math.min(totalPages, p + 1))
  }, [totalPages])

  const handlePageFirst = useCallback(() => {
    setPage(1)
  }, [])

  const handlePageLast = useCallback(() => {
    setPage(totalPages)
  }, [totalPages])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: 0, behavior: 'instant' })
    }
  }, [page, activeTab, selectedFilters])

  const confirmDelete = () => {
    if (!gameToDelete) return
    const id = gameToDelete.id
    setDeletingId(id)
    setGameToDelete(null)
    setTimeout(async () => {
      await removeGame(id)
      setDeletingId(null)
    }, 700)
  }

  return (
    <div
      className="liste-page-container w-full flex flex-col"
      onClick={() => setActiveMenuIndex(null)}
    >
      <ListeHeader
        ref={searchInputRef}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onToggleFilter={() => setIsFilterOpen(!isFilterOpen)}
        t={t}
        onClick={() => navigate('/game/add-edit-game')}
        totalGames={tabFilteredGames.length}
      />

      {/* Onglets + Toggle de vue */}
      <div className="list-tabs-row">
        <div className="list-tabs-navigation">
          <button
            className={`tab-link ${activeTab === 'all' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('all')}
          >
            <FontAwesomeIcon icon={faGamepad} className="tab-icon" />
            <span className="tab-text">Tous</span>
          </button>
          <button
            className={`tab-link ${activeTab === 'favorites' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('favorites')}
          >
            <FontAwesomeIcon icon={faHeart} className="tab-icon" />
            <span className="tab-text">Favoris</span>
          </button>
          <button
            className={`tab-link ${activeTab === 'wishlist' ? 'is-active' : ''}`}
            onClick={() => handleTabChange('wishlist')}
          >
            <FontAwesomeIcon icon={faClock} className="tab-icon" />
            <span className="tab-text">Wishlist</span>
          </button>
        </div>

        {/* Toggle Carousel / Grille virtuelle */}
        <div
          className="view-mode-toggle"
          title={
            viewMode === 'carousel' ? 'Passer en vue grille (rapide)' : 'Passer en vue carousel'
          }
        >
          <button
            id="view-toggle-carousel"
            className={`view-toggle-btn ${viewMode === 'carousel' ? 'active' : ''}`}
            onClick={() => setViewMode('carousel')}
            aria-label="Vue carousel"
          >
            <FontAwesomeIcon icon={faGrip} />
          </button>
          <button
            id="view-toggle-grid"
            className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
            aria-label="Vue grille virtuelle"
          >
            <FontAwesomeIcon icon={faTableCells} />
          </button>
        </div>
      </div>

      <div className="main-stage">
        {isLoading && games.length === 0 ? (
          <p className="loading-text text-center w-full mt-12">Chargement...</p>
        ) : viewMode === 'grid' ? (
          /* ── VUE GRILLE VIRTUELLE (react-window) ── */
          <div ref={gridContainerRef} className="vgrid-stage">
            {sortedGames.length > 0 ? (
              <VirtualGameGrid
                games={sortedGames}
                colCount={colCount}
                containerW={gridW}
                containerH={gridH}
                itemHeight={260}
                activeTab={activeTab}
                activeMenuIndex={activeMenuIndex}
                onToggleMenu={handleToggleMenu}
                onDeleteRequest={handleDeleteRequest}
                onToggleFavorite={handleToggleFavorite}
                onAddGame={handleAddGame}
                t={t}
                deletingId={deletingId}
              />
            ) : (
              <p className="no-result-text m-auto">Aucun jeu trouvé</p>
            )}
          </div>
        ) : (
          /* ── VUE CAROUSEL (existante) ── */
          <div className="list-carousel mx-auto tab-content-anim" key={activeTab}>
            <button className="list-arrow arrow-left" onClick={handleScrollLeft}>
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <div className="cards-wrapper mx-auto" ref={scrollRef}>
              {paginatedGames.length > 0 ? (
                <>
                  {paginatedGames.map((game: any, index: number) => (
                    <div
                      key={`${activeTab}-${game.id}`}
                      data-id={String(game.id)}
                      className={`console-entry-anim observer-item ${deletingId === game.id ? 'deleting' : ''}`}
                    >
                      <GameCard
                        game={game}
                        index={index}
                        variant="list"
                        isActive={activeId === String(game.id)}
                        activeMenuIndex={activeMenuIndex}
                        onToggleMenu={handleToggleMenu}
                        onDeleteRequest={handleDeleteRequest}
                        onToggleFavorite={handleToggleFavorite}
                        t={t}
                      />
                    </div>
                  ))}
                  <div className="shrink-0 observer-item">
                    <GameCard variant="add" t={t} onClick={handleAddGame} />
                  </div>
                </>
              ) : (
                <p className="no-result-text m-auto">Aucun jeu trouvé</p>
              )}
            </div>
            <button className="list-arrow arrow-right" onClick={handleScrollRight}>
              <FontAwesomeIcon icon={faChevronRight} />
            </button>
          </div>
        )}
      </div>

      {/* Pagination uniquement en mode carousel */}
      {viewMode === 'carousel' && totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPrev={handlePagePrev}
          onNext={handlePageNext}
          onFirst={handlePageFirst}
          onLast={handlePageLast}
        />
      )}
      <FilterPanel
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        selectedFilters={selectedFilters}
        onRemoveFilter={removeFilter}
        onClearAll={clearAllFilters}
        filterData={filterData}
        onSelectFilter={handleSelectFilter}
        games={games}
        resultCount={sortedGames.length}
        savedFilters={savedFilters}
        onSaveCurrentFilters={handleSaveCurrentFilters}
        onApplySaved={handleApplySaved}
        onDeleteSaved={handleDeleteSaved}
      />
      <DeleteModal
        game={gameToDelete}
        onClose={() => setGameToDelete(null)}
        onConfirm={confirmDelete}
        t={t}
      />
    </div>
  )
}

export default ListePage
