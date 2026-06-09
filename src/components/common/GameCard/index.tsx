import './GameCard.css'

import {
    faEllipsisVertical,
    faHeart,
    faPen,
    faPlus,
    faTrash,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React from 'react'
import { useNavigate } from 'react-router'

import LazyImage from '@/components/common/LazyImage'
import { usePreloadRoute } from '@/hooks/ui/usePreloadRoute'
import { getOptimizedImageProps } from '@/utils/formatters'
import { createSlug } from '@/utils/helpers/slugGenerator'

export interface GameCardProps {
  game?: any;
  variant?: string;
  index?: number;
  activeMenuIndex?: number;
  onToggleMenu?: (index: number, e: React.MouseEvent) => void;
  t?: any;
  onDeleteRequest?: (game: any) => void;
  onToggleFavorite?: (game: any) => void;
  onClick?: () => void;
  className?: string;
  isActive?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  game,
  variant = 'list',
  index,
  activeMenuIndex,
  onToggleMenu,
  t,
  onDeleteRequest,
  onToggleFavorite,
  onClick,
  className = '',
  isActive = false,
}: any) => {
  const navigate = useNavigate()
  const { preloadRoute } = usePreloadRoute()

  const getGamePath = () => {
    const name = typeof game === 'string' ? game : game?.name
    return name ? `/game/${createSlug(name)}` : null
  }

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('.btn-dots') ||
      target.closest('.context-menu') ||
      target.closest('.icon-heart')
    ) {
      return
    }

    if (variant === 'add') {
      if (onClick) onClick()
      return
    }

    const path = getGamePath()
    if (path) {
      navigate(path)
    }
  }

  const handlePreload = () => {
    if (variant === 'add') return
    const path = getGamePath()
    if (path) {
      preloadRoute(path)
    }
  }

  if (variant === 'add') {
    return (
      <div className={`game-card card-add cursor-pointer ${className}`} onClick={handleCardClick}>
        <div className="card-add-content">
          <FontAwesomeIcon icon={faPlus} className="plus-icon" />
          <span>{t('gameList.addGame')}</span>
        </div>
      </div>
    )
  }

  const isListVariant = variant === 'list'
  const gameName = typeof game === 'string' ? game : game.name

  // Optimized image props with lazy-loading, WebP support, and responsive sizing
  const imageProps = game?.image
    ? getOptimizedImageProps(game.image, {
        widths: [300, 500, 800], // Optimized for card display
        autoWebp: true,
      })
    : null

  return (
    <div
      className={`game-card card-${variant} ${isActive ? 'active-mobile' : ''} cursor-pointer ${className}`}
      onClick={handleCardClick}
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
      data-id={game.id || index}
      tabIndex={0}
    >
      {imageProps && (
        <LazyImage
          {...imageProps}
          src={imageProps?.src || ''}
          alt={gameName}
          width={300}
          height={400}
          sizes="(max-width: 787px) 180px, 210px"
          className="game-card-image-background"
        />
      )}

      <div className="card-overlay"></div>

      {isListVariant && (
        <div className="card-top">
          <FontAwesomeIcon
            icon={faHeart}
            className={`icon-heart ${game.isFavorite ? 'favorite' : ''}`}
            onClick={(e: any) => {
              e.stopPropagation()
              if (onToggleFavorite) onToggleFavorite(game)
            }}
          />
          <button
            className="btn-dots"
            onClick={(e: any) => {
              e.stopPropagation()
              onToggleMenu?.(index!, e)
            }}
          >
            <FontAwesomeIcon icon={faEllipsisVertical} />
          </button>
        </div>
      )}

      {isListVariant && activeMenuIndex === index && (
        <div className="context-menu" onClick={(e: any) => e.stopPropagation()}>
          <button
            className="ctx-item"
            onClick={(e: any) => {
              e.stopPropagation()
              navigate('/game/add-edit-game', { state: { game } })
            }}
          >
            <FontAwesomeIcon icon={faPen} /> <span>{t('common.edit')}</span>
          </button>
          <button
            className="ctx-item delete"
            onClick={(e: any) => {
              e.stopPropagation()
              onDeleteRequest?.(game)
            }}
          >
            <FontAwesomeIcon icon={faTrash} /> <span>{t('common.delete')}</span>
          </button>
        </div>
      )}

      <p className={`game-title ${variant === 'dashboard' ? 'game-name-dashboard' : ''}`}>
        {gameName}
      </p>
    </div>
  )
}

// Custom comparison function for memoization
// Only re-render if game data, variant, or visibility changes
const arePropsEqual = (prevProps: GameCardProps, nextProps: GameCardProps) => {
  const prevGame = prevProps.game
  const nextGame = nextProps.game

  // Compare critical game properties that affect rendering
  const gameEqual =
    prevGame?.id === nextGame?.id &&
    prevGame?.name === nextGame?.name &&
    prevGame?.image === nextGame?.image &&
    prevGame?.rating === nextGame?.rating &&
    prevGame?.isFavorite === nextGame?.isFavorite

  // Compare other critical props
  return (
    gameEqual &&
    prevProps.variant === nextProps.variant &&
    prevProps.index === nextProps.index &&
    prevProps.activeMenuIndex === nextProps.activeMenuIndex &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.className === nextProps.className
  )
}

export default React.memo(GameCard, arePropsEqual)
