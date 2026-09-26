import './AdminDsGames.css'

import {
  closestCorners,
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  faComment as faCommentRegular,
  faStar as faStarRegular,
} from '@fortawesome/free-regular-svg-icons'
import {
  faChevronDown,
  faChevronUp,
  faComment as faCommentSolid,
  faEdit,
  faFileExport,
  faGripLines,
  faPlus,
  faSearch,
  faSpinner,
  faStar as faStarSolid,
  faTimes,
  faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'

import dsGamesData from '@/data/ds_games.json'
import type { ExternalGameDetails } from '@/services/externalApiService'
import { getExternalGameDetails, searchExternalGames } from '@/services/externalApiService'

const DEFAULT_GENRES = [
  'Action',
  'Aventure',
  'RPG',
  'Plateforme',
  'Réflexion / Puzzle',
  'Sport',
  'Course',
  'Simulation',
  'Gestion',
  'Stratégie',
  'Combat',
  'Party Game',
  'Musique / Rythme',
  'Visual Novel',
  "Shoot 'em up",
  "Beat 'em all",
  'Metroidvania',
  'Roguelike',
  'Survival Horror',
  'Éducatif',
  'Sandbox',
  'Point & Click',
  'MMORPG',
  'FPS / TPS',
].sort()

const mapIgdbGenreToLocal = (igdbG: string): string => {
  const g = igdbG.toLowerCase()
  if (g.includes('role-playing') || g.includes('rpg')) return 'RPG'
  if (g.includes('adventure')) return 'Aventure'
  if (g.includes('platform')) return 'Plateforme'
  if (g.includes('puzzle')) return 'Réflexion / Puzzle'
  if (g.includes('racing')) return 'Course'
  if (g.includes('simulator') || g.includes('simulation')) return 'Simulation'
  if (g.includes('strategy') || g.includes('tactical') || g.includes('rts') || g.includes('tbs'))
    return 'Stratégie'
  if (g.includes('fighting')) return 'Combat'
  if (g.includes('music')) return 'Musique / Rythme'
  if (g.includes('sport')) return 'Sport'
  if (g.includes('hack and slash') || g.includes("beat 'em up")) return "Beat 'em all"
  if (g.includes('point-and-click')) return 'Point & Click'
  if (g.includes('shooter')) return 'FPS / TPS'
  if (g.includes('visual novel')) return 'Visual Novel'
  if (g.includes('indie')) return 'Action'
  if (g.includes('arcade')) return 'Action'
  return igdbG.charAt(0).toUpperCase() + igdbG.slice(1)
}

interface GameItem {
  id: string
  title: string
  theme: string
}

interface ColumnProps {
  id: string
  title: string
  items: GameItem[]
  filter: string
  ratings: Record<string, number>
  onRate: (id: string, rating: number) => void
  allThemesList: string[]
  onMoveTheme: (id: string, theme: string) => void
  currentTheme: string
  onGameClick: (item: GameItem) => void
  comment: string
  onOpenComment: (id: string) => void
  genres: string[]
  onOpenGenre: (id: string) => void
}

const DraggableGameItem = ({
  item,
  onClick,
  filter,
  rating,
  onRate,
  activeThemesList,
  onMoveTheme,
  currentTheme,
  comment,
  onOpenComment,
  genres,
  onOpenGenre,
}: {
  item: GameItem
  onClick: () => void
  filter: string
  rating: number
  onRate: (id: string, r: number) => void
  activeThemesList: string[]
  onMoveTheme: (id: string, t: string) => void
  currentTheme: string
  comment: string
  onOpenComment: (id: string) => void
  genres: string[]
  onOpenGenre: (id: string) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { type: 'Game', item },
  })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 999 : 1,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined

  // Remove tabIndex to prevent browser from auto-scrolling to the element when focus is restored after drop
  const { tabIndex: _tabIndex, ...restAttributes } = (attributes || {}) as any

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`game-item ${isDragging ? 'dragging' : ''}`}
      {...restAttributes}
      {...listeners}
      onClick={onClick}
    >
      <span className="game-item-title">{item.title}</span>
      {filter === 'played' && (
        <div
          className="game-item-controls"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="game-rating">
            <FontAwesomeIcon
              icon={comment ? faCommentSolid : (faCommentRegular as any)}
              className={`comment-icon ${comment ? 'has-comment' : ''}`}
              title={comment ? `Commentaire : ${comment}` : 'Ajouter un commentaire'}
              onClick={(e) => {
                e.stopPropagation()
                onOpenComment(item.id)
              }}
            />
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesomeIcon
                key={star}
                icon={star <= rating ? faStarSolid : (faStarRegular as any)}
                className="star-icon"
                onClick={() => onRate(item.id, star === rating ? 0 : star)}
              />
            ))}
          </div>
          <select
            className="theme-select"
            value={currentTheme}
            onChange={(e) => onMoveTheme(item.id, e.target.value)}
          >
            {activeThemesList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div
            className="game-genres-display"
            onClick={(e) => {
              e.stopPropagation()
              onOpenGenre(item.id)
            }}
          >
            {genres && genres.length > 0 ? (
              <span className="genres-list" title="Modifier les genres">
                Genres: {genres.join(', ')}{' '}
                <FontAwesomeIcon icon={faEdit} className="genre-edit-icon" />
              </span>
            ) : (
              <span className="add-genre-btn">
                <FontAwesomeIcon icon={faPlus} /> Ajouter un genre
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const Column = ({
  id,
  title,
  items,
  filter,
  ratings,
  onRate,
  activeThemesList,
  onMoveTheme,
  currentTheme,
  onGameClick,
  comments,
  onOpenComment,
  gameGenres,
  onOpenGenre,
}: Omit<ColumnProps, 'allThemesList' | 'comment' | 'genres'> & {
  activeThemesList: string[]
  comments: Record<string, string>
  onOpenComment: (id: string) => void
  gameGenres: Record<string, string[]>
  onOpenGenre: (id: string) => void
}) => {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div className="kanban-column" ref={setNodeRef} id={id}>
      <h3>
        {title} ({items.length})
      </h3>
      <div className="kanban-column-content">
        {items.map((item) => (
          <DraggableGameItem
            key={item.id}
            item={item}
            onClick={() => onGameClick(item)}
            filter={filter}
            rating={ratings[item.id] || 0}
            onRate={onRate}
            activeThemesList={activeThemesList}
            onMoveTheme={onMoveTheme}
            currentTheme={currentTheme}
            comment={comments[item.id] || ''}
            onOpenComment={onOpenComment}
            genres={gameGenres[item.id] || []}
            onOpenGenre={onOpenGenre}
          />
        ))}
      </div>
    </div>
  )
}

const ThemeSection = ({
  theme,
  unplayed,
  played,
  a_voir,
  isOpen,
  onToggle,
  onGameClick,
  filter,
  ratings,
  onRate,
  activeThemesList,
  onMoveTheme,
  isCustom,
  onRename,
  onDelete,
  comments,
  onOpenComment,
  gameGenres,
  onOpenGenre,
}: {
  theme: string
  unplayed: GameItem[]
  played: GameItem[]
  a_voir: GameItem[]
  isOpen: boolean
  onToggle: () => void
  onGameClick: (i: GameItem) => void
  filter: string
  ratings: Record<string, number>
  onRate: (id: string, r: number) => void
  activeThemesList: string[]
  onMoveTheme: (id: string, t: string) => void
  isCustom: boolean
  onRename: (oldName: string) => void
  onDelete: (name: string) => void
  comments: Record<string, string>
  onOpenComment: (id: string) => void
  gameGenres: Record<string, string[]>
  onOpenGenre: (id: string) => void
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `theme-${theme}`,
    data: { type: 'Theme', theme },
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const total = unplayed.length + played.length + a_voir.length
  const commentedCount = played.filter((g) => comments[g.id] && comments[g.id].trim() !== '').length

  if (total === 0 && !isCustom) return null // Keep empty custom themes visible

  return (
    <div
      className={`theme-section ${isDragging ? 'theme-dragging' : ''}`}
      ref={setNodeRef}
      style={style}
    >
      <div className="theme-header" onClick={onToggle}>
        <div className="theme-header-left">
          <h2>
            {theme}
            <span className="theme-count">
              ({played.length} joués / {total} total{' '}
              {commentedCount > 0 ? `| ${commentedCount} avis` : ''})
            </span>
          </h2>
          {isCustom && (
            <>
              <button
                className="theme-edit-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onRename(theme)
                }}
                title="Renommer"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button
                className="theme-delete-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(theme)
                }}
                title="Supprimer"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </>
          )}
        </div>
        <div className="theme-header-right">
          <button className="theme-toggle-btn">
            <FontAwesomeIcon icon={isOpen ? faChevronUp : faChevronDown} />
          </button>
          {isCustom && filter === 'played' && (
            <div
              {...attributes}
              {...listeners}
              className="theme-drag-handle"
              onClick={(e) => e.stopPropagation()}
              title="Déplacer"
            >
              <FontAwesomeIcon icon={faGripLines} />
            </div>
          )}
        </div>
      </div>
      {isOpen && (
        <div className="theme-kanban">
          <Column
            id={`${theme}-unplayed`}
            title="Non Joué"
            items={unplayed}
            filter={filter}
            ratings={ratings}
            onRate={onRate}
            activeThemesList={activeThemesList}
            onMoveTheme={onMoveTheme}
            currentTheme={theme}
            onGameClick={onGameClick}
            comments={comments}
            onOpenComment={onOpenComment}
            gameGenres={gameGenres}
            onOpenGenre={onOpenGenre}
          />
          <Column
            id={`${theme}-played`}
            title="Joué"
            items={played}
            filter={filter}
            ratings={ratings}
            onRate={onRate}
            activeThemesList={activeThemesList}
            onMoveTheme={onMoveTheme}
            currentTheme={theme}
            onGameClick={onGameClick}
            comments={comments}
            onOpenComment={onOpenComment}
            gameGenres={gameGenres}
            onOpenGenre={onOpenGenre}
          />
          <Column
            id={`${theme}-a_voir`}
            title="À Voir"
            items={a_voir}
            filter={filter}
            ratings={ratings}
            onRate={onRate}
            activeThemesList={activeThemesList}
            onMoveTheme={onMoveTheme}
            currentTheme={theme}
            onGameClick={onGameClick}
            comments={comments}
            onOpenComment={onOpenComment}
            gameGenres={gameGenres}
            onOpenGenre={onOpenGenre}
          />
        </div>
      )}
    </div>
  )
}

const AdminDsGames: React.FC = () => {
  const [localDsGames, setLocalDsGames] = useState<GameItem[]>(dsGamesData as GameItem[])
  const [gamesStatus, setGamesStatus] = useState<Record<string, string>>({})
  const [customThemes, setCustomThemes] = useState<Record<string, string>>({})
  const [createdThemes, setCreatedThemes] = useState<string[]>([])
  const [themeOrder, setThemeOrder] = useState<string[]>([])
  const [gameRatings, setGameRatings] = useState<Record<string, number>>({})
  const [gameComments, setGameComments] = useState<Record<string, string>>({})
  const [gameGenres, setGameGenres] = useState<Record<string, string[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'played' | 'a_voir'>('all')
  const [openTheme, setOpenTheme] = useState<string | null>(null)

  // Add Game Modal State
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false)
  const [newGameTitle, setNewGameTitle] = useState('')
  const [newGameTheme, setNewGameTheme] = useState('')

  // Comment Modal State
  const [commentModalOpenFor, setCommentModalOpenFor] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState('')

  // Genre Modal State
  const [genreModalOpenFor, setGenreModalOpenFor] = useState<string | null>(null)
  const [editingGenres, setEditingGenres] = useState<string[]>([])
  const [isFetchingIgdbGenres, setIsFetchingIgdbGenres] = useState(false)

  // Keep localDsGames in sync with dsGamesData if it reloads via HMR
  useEffect(() => {
    setLocalDsGames(dsGamesData as GameItem[])
  }, [])

  const [activeGame, setActiveGame] = useState<GameItem | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null)
  const [gameDetails, setGameDetails] = useState<ExternalGameDetails | null>(null)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  const dsGames = useMemo(() => localDsGames, [localDsGames])
  const allThemes = useMemo(
    () => Array.from(new Set(dsGames.map((g) => g.theme))).sort(),
    [dsGames]
  )

  const uniquePreviousComments = useMemo(() => {
    const commentsSet = new Set<string>()
    Object.values(gameComments).forEach((c) => {
      if (c && c.trim() !== '') {
        commentsSet.add(c.trim())
      }
    })
    return Array.from(commentsSet).sort()
  }, [gameComments])

  useEffect(() => {
    // Migrate old format (Array of played IDs) to new format (Object mapping id -> status)
    let statusMap: Record<string, string> = {}
    const oldSaved = localStorage.getItem('playedDsGames')
    const newSaved = localStorage.getItem('gamesStatusDs')

    if (newSaved) {
      statusMap = JSON.parse(newSaved)
    } else if (oldSaved) {
      const parsedOld = JSON.parse(oldSaved)
      if (Array.isArray(parsedOld)) {
        parsedOld.forEach((id) => (statusMap[id] = 'played'))
      }
      localStorage.setItem('gamesStatusDs', JSON.stringify(statusMap))
    }
    setGamesStatus(statusMap)

    const savedCustomThemes = localStorage.getItem('customDsThemes')
    if (savedCustomThemes) {
      setCustomThemes(JSON.parse(savedCustomThemes))
    }

    const savedCreatedThemes = localStorage.getItem('createdDsThemes')
    if (savedCreatedThemes) {
      setCreatedThemes(JSON.parse(savedCreatedThemes))
    }

    const savedOrder = localStorage.getItem('themeOrderDs')
    if (savedOrder) {
      setThemeOrder(JSON.parse(savedOrder))
    }

    const savedRatings = localStorage.getItem('gameRatingsDs')
    if (savedRatings) {
      setGameRatings(JSON.parse(savedRatings))
    }

    const savedComments = localStorage.getItem('gameCommentsDs')
    if (savedComments) {
      setGameComments(JSON.parse(savedComments))
    }

    const savedGenres = localStorage.getItem('gameGenresDs')
    if (savedGenres) {
      setGameGenres(JSON.parse(savedGenres))
    }
  }, [])

  const saveStatusToStorage = (newMap: Record<string, string>) => {
    localStorage.setItem('gamesStatusDs', JSON.stringify(newMap))
  }

  const handleRateGame = (id: string, rating: number) => {
    const newRatings = { ...gameRatings }
    if (rating === 0) {
      delete newRatings[id]
    } else {
      newRatings[id] = rating
    }
    setGameRatings(newRatings)
    localStorage.setItem('gameRatingsDs', JSON.stringify(newRatings))
  }

  const handleOpenComment = (id: string) => {
    setEditingComment(gameComments[id] || '')
    setCommentModalOpenFor(id)
  }

  const handleSaveComment = () => {
    if (commentModalOpenFor) {
      const newComments = { ...gameComments }
      if (editingComment.trim() === '') {
        delete newComments[commentModalOpenFor]
      } else {
        newComments[commentModalOpenFor] = editingComment.trim()
      }
      setGameComments(newComments)
      localStorage.setItem('gameCommentsDs', JSON.stringify(newComments))
      setCommentModalOpenFor(null)
    }
  }

  const handleOpenGenre = (id: string) => {
    setEditingGenres(gameGenres[id] || [])
    setGenreModalOpenFor(id)
  }

  const handleSaveGenres = () => {
    if (genreModalOpenFor) {
      const newGenres = { ...gameGenres }
      if (editingGenres.length === 0) {
        delete newGenres[genreModalOpenFor]
      } else {
        newGenres[genreModalOpenFor] = editingGenres
      }
      setGameGenres(newGenres)
      localStorage.setItem('gameGenresDs', JSON.stringify(newGenres))
      setGenreModalOpenFor(null)
    }
  }

  const toggleGenre = (genre: string) => {
    setEditingGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    )
  }

  const handleSuggestGenres = async () => {
    if (!genreModalOpenFor) return
    const game = dsGames.find((g) => g.id === genreModalOpenFor)
    if (!game) return

    setIsFetchingIgdbGenres(true)
    try {
      const results = await searchExternalGames(game.title)
      if (results && results.length > 0) {
        const details = await getExternalGameDetails(results[0].id)
        if (details && details.genres && details.genres.length > 0) {
          const mappedIgdbGenres = details.genres.map(mapIgdbGenreToLocal)

          // Merge with current editing genres to not lose existing ones, avoiding duplicates
          const newGenresList = Array.from(new Set([...editingGenres, ...mappedIgdbGenres]))
          setEditingGenres(newGenresList)
        } else {
          alert('Aucun genre trouvé sur IGDB pour ce jeu.')
        }
      } else {
        alert('Jeu non trouvé sur IGDB.')
      }
    } catch (err) {
      alert('Erreur lors de la récupération IGDB.')
    } finally {
      setIsFetchingIgdbGenres(false)
    }
  }

  const handleMoveTheme = (id: string, theme: string) => {
    const newCustomThemes = { ...customThemes }
    newCustomThemes[id] = theme
    setCustomThemes(newCustomThemes)
    localStorage.setItem('customDsThemes', JSON.stringify(newCustomThemes))
  }

  const handleCreateTheme = () => {
    const themeName = window.prompt('Nom du nouveau thème ?')
    if (themeName && themeName.trim() !== '') {
      const newThemes = Array.from(new Set([...createdThemes, themeName.trim()]))
      setCreatedThemes(newThemes)
      localStorage.setItem('createdDsThemes', JSON.stringify(newThemes))
    }
  }

  const handleRenameTheme = (oldName: string) => {
    const newName = window.prompt('Nouveau nom pour ce thème ?', oldName)
    if (!newName || newName.trim() === '' || newName.trim() === oldName) return

    const trimmedNewName = newName.trim()

    // Update createdThemes
    const newCreatedThemes = createdThemes.map((t) => (t === oldName ? trimmedNewName : t))
    setCreatedThemes(newCreatedThemes)
    localStorage.setItem('createdDsThemes', JSON.stringify(newCreatedThemes))

    // Update customThemes mapping for games
    const newCustomThemes = { ...customThemes }
    Object.keys(newCustomThemes).forEach((gameId) => {
      if (newCustomThemes[gameId] === oldName) {
        newCustomThemes[gameId] = trimmedNewName
      }
    })
    setCustomThemes(newCustomThemes)
    localStorage.setItem('customDsThemes', JSON.stringify(newCustomThemes))

    // Update themeOrder
    if (themeOrder.length > 0) {
      const newOrder = themeOrder.map((t) => (t === oldName ? trimmedNewName : t))
      setThemeOrder(newOrder)
      localStorage.setItem('themeOrderDs', JSON.stringify(newOrder))
    }

    if (openTheme === oldName) setOpenTheme(trimmedNewName)
  }

  const handleDeleteTheme = (themeName: string) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer le thème "${themeName}" ?\nLes jeux qu'il contient retourneront dans leur thème d'origine.`
      )
    ) {
      return
    }

    // Remove from createdThemes
    const newCreatedThemes = createdThemes.filter((t) => t !== themeName)
    setCreatedThemes(newCreatedThemes)
    localStorage.setItem('createdDsThemes', JSON.stringify(newCreatedThemes))

    // Remove from customThemes mapping
    const newCustomThemes = { ...customThemes }
    Object.keys(newCustomThemes).forEach((gameId) => {
      if (newCustomThemes[gameId] === themeName) {
        delete newCustomThemes[gameId]
      }
    })
    setCustomThemes(newCustomThemes)
    localStorage.setItem('customDsThemes', JSON.stringify(newCustomThemes))

    // Remove from themeOrder
    if (themeOrder.length > 0) {
      const newOrder = themeOrder.filter((t) => t !== themeName)
      setThemeOrder(newOrder)
      localStorage.setItem('themeOrderDs', JSON.stringify(newOrder))
    }

    if (openTheme === themeName) setOpenTheme(null)
  }

  const handleAddGame = async () => {
    if (!newGameTitle.trim()) return

    try {
      const response = await fetch('/api/save-ds-game', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newGameTitle.trim(),
          theme: newGameTheme.trim() || 'Autres',
        }),
      })

      const data = await response.json()
      if (data.success) {
        const addedGame = data.game

        // Définir le statut par défaut selon le filtre actif pour que le jeu soit visible
        let targetStatus = 'unplayed'
        if (filter === 'played') targetStatus = 'played'
        if (filter === 'a_voir') targetStatus = 'a_voir'

        if (targetStatus !== 'unplayed') {
          setGamesStatus((prev) => {
            const next = { ...prev, [addedGame.id]: targetStatus }
            saveStatusToStorage(next)
            return next
          })
        }

        // Ajouter le thème aux thèmes créés si c'est un nouveau thème
        const themeToUse = addedGame.theme || 'Autres'
        if (!allThemesList.includes(themeToUse) && !createdThemes.includes(themeToUse)) {
          const newThemes = Array.from(new Set([...createdThemes, themeToUse]))
          setCreatedThemes(newThemes)
          localStorage.setItem('createdDsThemes', JSON.stringify(newThemes))
        }

        // Update local state so it appears immediately
        setLocalDsGames((prev) => {
          const updated = [...prev, addedGame]
          return updated.sort((a, b) => a.title.localeCompare(b.title))
        })

        setOpenTheme(themeToUse)
        setIsAddGameModalOpen(false)
        setNewGameTitle('')
        setNewGameTheme('')
      } else {
        alert("Erreur lors de l'ajout: " + data.error)
      }
    } catch (err) {
      alert('Erreur lors de la requête: ' + err)
    }
  }

  const handleExportPlayed = () => {
    const playedGames = dsGames.filter((g) => gamesStatus[g.id] === 'played')

    // Sort by theme then title
    playedGames.sort((a, b) => {
      const themeA = customThemes[a.id] || a.theme || 'Autres'
      const themeB = customThemes[b.id] || b.theme || 'Autres'
      if (themeA !== themeB) return themeA.localeCompare(themeB)
      return a.title.localeCompare(b.title)
    })

    let csvContent =
      'name,description,rating,comment,genre,platform,status,year,playTime,developer,achievements,isSoon,isFavorite,tags,image\n'

    playedGames.forEach((game) => {
      const theme = customThemes[game.id] || game.theme || 'Autres'
      const rating = gameRatings[game.id] || 0
      const comment = (gameComments[game.id] || '').replace(/"/g, '""')

      const titleStr = `"${game.title.replace(/"/g, '""')}"`
      const descStr = `""` // Non stocké localement
      const ratingStr = rating
      const commentStr = `"${comment}"`
      const genreStr = `"${(gameGenres[game.id] || []).join(', ')}"`
      const platformStr = `"Nintendo DS"`
      const statusStr = `"Terminé"` // Ou Joué
      const yearStr = `""`
      const playTimeStr = `""`
      const devStr = `""`
      const achievementsStr = `""`
      const isSoonStr = `"false"`
      const isFavoriteStr = rating >= 4 ? `"true"` : `"false"` // On suppose favori si note >= 4
      const tagsStr = `"${theme.replace(/"/g, '""')}"`
      const imageStr = `""` // Non stocké localement, récupéré dynamiquement

      csvContent += `${titleStr},${descStr},${ratingStr},${commentStr},${genreStr},${platformStr},${statusStr},${yearStr},${playTimeStr},${devStr},${achievementsStr},${isSoonStr},${isFavoriteStr},${tagsStr},${imageStr}\n`
    })

    // Use BOM for UTF-8 in Excel
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'jeux_ds_joues.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const allThemesList =
    filter === 'played' ? Array.from(new Set([...allThemes, ...createdThemes])).sort() : allThemes

  const groupedGames = useMemo(() => {
    const groups: Record<string, { unplayed: GameItem[]; played: GameItem[]; a_voir: GameItem[] }> =
      {}
    allThemesList.forEach((t) => (groups[t] = { unplayed: [], played: [], a_voir: [] }))

    dsGames.forEach((game) => {
      if (searchQuery && !game.title.toLowerCase().includes(searchQuery.toLowerCase())) return

      const status = (gamesStatus[game.id] || 'unplayed') as 'unplayed' | 'played' | 'a_voir'

      if (filter === 'played' && status !== 'played') return
      if (filter === 'a_voir' && status !== 'a_voir') return

      let theme = game.theme || 'Autres'
      if (filter === 'played' && status === 'played' && customThemes[game.id]) {
        theme = customThemes[game.id]
      }

      if (!groups[theme]) {
        groups[theme] = { unplayed: [], played: [], a_voir: [] }
      }

      if (groups[theme] && groups[theme][status]) {
        groups[theme][status].push(game)
      }
    })
    return groups
  }, [dsGames, allThemesList, gamesStatus, searchQuery, filter, customThemes])

  const activeThemesList = useMemo(() => {
    let list = allThemesList
    if (filter === 'played') {
      list = allThemesList.filter((t) => {
        if (createdThemes.includes(t)) return true
        if (groupedGames[t] && groupedGames[t].played.length > 0) return true
        return false
      })
    }

    if (themeOrder.length > 0) {
      return list.sort((a, b) => {
        const idxA = themeOrder.indexOf(a)
        const idxB = themeOrder.indexOf(b)
        if (idxA !== -1 && idxB !== -1) return idxA - idxB
        if (idxA !== -1) return -1
        if (idxB !== -1) return 1
        return a.localeCompare(b)
      })
    }

    return list
  }, [allThemesList, createdThemes, filter, groupedGames, themeOrder])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveGame(dsGames.find((g) => g.id === active.id) || null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveGame(null)
    const { active, over } = event
    if (!over) return

    // Check if dragging a theme
    if (active.data.current?.type === 'Theme' && over.data.current?.type === 'Theme') {
      const activeTheme = active.data.current.theme
      const overTheme = over.data.current.theme

      if (activeTheme !== overTheme) {
        const currentOrder = themeOrder.length > 0 ? themeOrder : activeThemesList
        const oldIndex = currentOrder.indexOf(activeTheme)
        const newIndex = currentOrder.indexOf(overTheme)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = [...currentOrder]
          newOrder.splice(oldIndex, 1)
          newOrder.splice(newIndex, 0, activeTheme)
          setThemeOrder(newOrder)
          localStorage.setItem('themeOrderDs', JSON.stringify(newOrder))
        }
      }
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const activeGameObj = dsGames.find((g) => g.id === activeId)
    if (!activeGameObj) return

    let targetStatus = gamesStatus[activeId] || 'unplayed'
    let targetTheme = activeGameObj.theme || 'Autres'

    if (overId.endsWith('-played')) {
      targetStatus = 'played'
      targetTheme = overId.replace('-played', '')
    } else if (overId.endsWith('-unplayed')) {
      targetStatus = 'unplayed'
      targetTheme = overId.replace('-unplayed', '')
    } else if (overId.endsWith('-a_voir')) {
      targetStatus = 'a_voir'
      targetTheme = overId.replace('-a_voir', '')
    } else {
      const overGame = dsGames.find((g) => g.id === overId)
      if (overGame) {
        targetStatus = gamesStatus[overGame.id] || 'unplayed'
        if (filter === 'played') {
          targetTheme = customThemes[overGame.id] || overGame.theme || 'Autres'
        } else {
          targetTheme = overGame.theme || 'Autres'
        }
      }
    }

    const currentStatus = gamesStatus[activeId] || 'unplayed'
    const statusChanged = currentStatus !== targetStatus

    let themeChanged = false
    if (filter === 'played' && targetStatus === 'played') {
      const currentTheme = customThemes[activeId] || activeGameObj.theme || 'Autres'
      if (currentTheme !== targetTheme) {
        themeChanged = true
      }
    }

    if (statusChanged || themeChanged) {
      if (statusChanged) {
        const newStatus = { ...gamesStatus }
        if (targetStatus === 'unplayed') {
          delete newStatus[activeId]
        } else {
          newStatus[activeId] = targetStatus
        }
        setGamesStatus(newStatus)
        saveStatusToStorage(newStatus)
      }

      if (filter === 'played' && targetStatus === 'played') {
        const newCustomThemes = { ...customThemes }
        newCustomThemes[activeId] = targetTheme
        setCustomThemes(newCustomThemes)
        localStorage.setItem('customDsThemes', JSON.stringify(newCustomThemes))
      }
    }
  }

  const handleGameClick = async (game: GameItem) => {
    setSelectedGame(game)
    setIsLoadingDetails(true)
    setGameDetails(null)
    try {
      const results = await searchExternalGames(game.title)
      if (results && results.length > 0) {
        const details = await getExternalGameDetails(results[0].id)
        setGameDetails(details)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingDetails(false)
    }
  }

  const closeDetails = () => setSelectedGame(null)

  return (
    <div className="admin-ds-games">
      <div className="header-actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <Link to="/admin" className="admin-back-link">
            ← Retour à l'administration
          </Link>
          <h1>Gestionnaire Nintendo DS</h1>
        </div>
        <div className="filters-container">
          <div className="status-filters">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Tous
            </button>
            <button
              className={`filter-btn ${filter === 'played' ? 'active' : ''}`}
              onClick={() => setFilter('played')}
            >
              Joués
            </button>
            <button
              className={`filter-btn ${filter === 'a_voir' ? 'active' : ''}`}
              onClick={() => setFilter('a_voir')}
            >
              À Voir
            </button>
          </div>
          {filter === 'played' && (
            <button
              className="create-theme-btn"
              onClick={handleExportPlayed}
              title="Exporter les jeux joués en CSV"
            >
              <FontAwesomeIcon icon={faFileExport} /> Exporter
            </button>
          )}
          {filter === 'played' && (
            <button className="create-theme-btn" onClick={handleCreateTheme}>
              <FontAwesomeIcon icon={faPlus} /> Nouveau Thème
            </button>
          )}
          <button className="create-theme-btn" onClick={() => setIsAddGameModalOpen(true)}>
            <FontAwesomeIcon icon={faPlus} /> Ajouter un jeu
          </button>
          <div className="search-bar">
            <FontAwesomeIcon icon={faSearch} />
            <input
              type="text"
              placeholder="Rechercher un jeu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="themes-list">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          accessibility={{ restoreFocus: false }}
        >
          <SortableContext
            items={activeThemesList.map((t) => `theme-${t}`)}
            strategy={verticalListSortingStrategy}
          >
            {activeThemesList.map((theme) => (
              <ThemeSection
                key={theme}
                theme={theme}
                unplayed={groupedGames[theme].unplayed}
                played={groupedGames[theme].played}
                a_voir={groupedGames[theme].a_voir}
                isOpen={openTheme === theme}
                onToggle={() => setOpenTheme(openTheme === theme ? null : theme)}
                onGameClick={handleGameClick}
                filter={filter}
                ratings={gameRatings}
                onRate={handleRateGame}
                activeThemesList={activeThemesList}
                onMoveTheme={handleMoveTheme}
                isCustom={createdThemes.includes(theme)}
                onRename={handleRenameTheme}
                onDelete={handleDeleteTheme}
                comments={gameComments}
                onOpenComment={handleOpenComment}
                gameGenres={gameGenres}
                onOpenGenre={handleOpenGenre}
              />
            ))}
          </SortableContext>

          <DragOverlay>
            {activeGame && activeGame.id ? (
              <div className="game-item dragging">
                <span>{activeGame.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {selectedGame && (
        <div className="game-details-modal" onClick={closeDetails}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeDetails}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2>{selectedGame.title}</h2>

            {isLoadingDetails ? (
              <div className="loading-state">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" />
                <p>Recherche des informations sur IGDB...</p>
              </div>
            ) : gameDetails ? (
              <div className="details-info-container">
                <div className="details-info">
                  {gameDetails.boxArtUrl && (
                    <img src={gameDetails.boxArtUrl} alt="Cover" className="game-cover" />
                  )}
                  <div className="meta-info">
                    <p>
                      <strong>Date de sortie :</strong> {gameDetails.releaseYear || 'Inconnue'}
                    </p>
                    <p>
                      <strong>Développeurs :</strong>{' '}
                      {gameDetails.developers?.join(', ') || 'Inconnu'}
                    </p>
                    <p>
                      <strong>Genres :</strong>{' '}
                      {gameDetails.genres
                        ? Array.from(new Set(gameDetails.genres.map(mapIgdbGenreToLocal))).join(
                            ', '
                          )
                        : 'Inconnu'}
                    </p>
                    <p>
                      <strong>Description :</strong>{' '}
                      {gameDetails.description || 'Aucune description disponible.'}
                    </p>
                  </div>
                </div>

                {gameDetails.screenshots && gameDetails.screenshots.length > 0 && (
                  <div className="screenshots-gallery">
                    <h3>Captures d'écran</h3>
                    <div className="screenshots-list">
                      {gameDetails.screenshots.map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt={`Capture ${i + 1}`}
                          className="screenshot-img"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="error-state">
                <p>Aucune information trouvée pour ce jeu sur IGDB.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Game Modal */}
      {isAddGameModalOpen && (
        <div className="game-details-modal" onClick={() => setIsAddGameModalOpen(false)}>
          <div className="modal-content add-game-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setIsAddGameModalOpen(false)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h2>Ajouter un jeu DS</h2>

            <div className="add-game-form">
              <div className="form-group">
                <label>Titre du jeu</label>
                <input
                  type="text"
                  value={newGameTitle}
                  onChange={(e) => setNewGameTitle(e.target.value)}
                  placeholder="Ex: Pokémon Blanc"
                />
              </div>
              <div className="form-group">
                <label>Thème (Optionnel)</label>
                <input
                  type="text"
                  list="themes-list"
                  value={newGameTheme}
                  onChange={(e) => setNewGameTheme(e.target.value)}
                  placeholder="Ex: Pokémon"
                />
                <datalist id="themes-list">
                  {allThemesList.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <button
                className="btn-primary"
                onClick={handleAddGame}
                disabled={!newGameTitle.trim()}
              >
                Ajouter le jeu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comment Modal */}
      {commentModalOpenFor && (
        <div className="game-details-modal" onClick={() => setCommentModalOpenFor(null)}>
          <div className="modal-content comment-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setCommentModalOpenFor(null)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h2>Avis / Commentaire</h2>
            <p className="comment-game-title">
              {dsGames.find((g) => g.id === commentModalOpenFor)?.title}
            </p>

            <div className="add-game-form">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Avis rapide (Optionnel)</label>
                <select
                  className="theme-select"
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    background: 'rgba(0,0,0,0.3)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    padding: '0.8rem',
                    borderRadius: '8px',
                  }}
                  onChange={(e) => {
                    if (e.target.value) setEditingComment(e.target.value)
                  }}
                  value={uniquePreviousComments.includes(editingComment) ? editingComment : ''}
                >
                  <option value="">-- Choisir un avis déjà rédigé --</option>
                  {uniquePreviousComments.map((commentOption, idx) => (
                    <option key={idx} value={commentOption}>
                      {commentOption}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ou rédigez votre propre avis</label>
                <textarea
                  className="comment-textarea"
                  value={editingComment}
                  onChange={(e) => setEditingComment(e.target.value)}
                  placeholder="Laissez votre avis détaillé ici..."
                  rows={4}
                  style={{ marginTop: '0.5rem' }}
                />
              </div>
              <button className="btn-primary" onClick={handleSaveComment}>
                Enregistrer le commentaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Genre Modal */}
      {genreModalOpenFor && (
        <div className="game-details-modal" onClick={() => setGenreModalOpenFor(null)}>
          <div className="modal-content genre-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setGenreModalOpenFor(null)}>
              <FontAwesomeIcon icon={faTimes} />
            </button>

            <h2>Modifier les Genres</h2>
            <p className="comment-game-title">
              {dsGames.find((g) => g.id === genreModalOpenFor)?.title}
            </p>

            <div className="genre-suggestion-action">
              <button
                className="btn-secondary"
                onClick={handleSuggestGenres}
                disabled={isFetchingIgdbGenres}
                style={{
                  width: '100%',
                  marginBottom: '1rem',
                  background: 'rgba(79, 172, 254, 0.2)',
                  border: '1px solid #4facfe',
                  color: 'white',
                  padding: '0.8rem',
                  borderRadius: '8px',
                }}
              >
                {isFetchingIgdbGenres ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Recherche sur IGDB...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSearch} /> Suggérer via IGDB
                  </>
                )}
              </button>
            </div>

            <div
              className="genres-checkbox-list"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                maxHeight: '400px',
                overflowY: 'auto',
                marginBottom: '1.5rem',
                paddingRight: '0.5rem',
              }}
            >
              {Array.from(new Set([...DEFAULT_GENRES, ...editingGenres]))
                .sort()
                .map((genre) => (
                  <label
                    key={genre}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      padding: '0.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editingGenres.includes(genre)}
                      onChange={() => toggleGenre(genre)}
                    />
                    {genre}
                  </label>
                ))}
            </div>

            <button className="btn-primary" onClick={handleSaveGenres}>
              Enregistrer les genres
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDsGames
