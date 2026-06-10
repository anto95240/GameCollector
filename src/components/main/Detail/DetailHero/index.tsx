import './DetailHero.css'

import { faStar as faStarEmpty } from '@fortawesome/free-regular-svg-icons'
import {
    faArchive,
    faCalendarAlt,
    faCheck,
    faGamepad,
    faHeart,
    faStar as faStarFull,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import LazyImage from '@/components/common/LazyImage'
import { MOCK_OPTIONS } from '@/config/constants'
import { getOptimizedImageProps } from '@/utils/formatters'

export interface DetailHeroProps {
  game: any;
  onToggleFavorite?: () => void;
  metadata?: {
    statuses?: any[];
    rating?: any[];
    [key: string]: any;
  };
  isUpdating?: boolean;
  onUpdateField?: (field: string, value: any) => void;
  onToggleSoon?: () => void;
}

const DetailHero: React.FC<DetailHeroProps> = ({
  game,
  onToggleFavorite,
  metadata = {},
  isUpdating = false,
  onUpdateField = () => {},
  _onToggleSoon = () => {},
}: any) => {
  const { t } = useTranslation()
  const [isOwned, setIsOwned] = useState(false)
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false)
  const [ratingDropdownOpen, setRatingDropdownOpen] = useState(false)
  const statusDropdownRef = useRef(null)
  const ratingDropdownRef = useRef(null)

  // Fermer les dropdowns quand on clique en dehors ou appuie sur Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (statusDropdownRef.current && !(statusDropdownRef.current as HTMLElement).contains(target)) {
        setStatusDropdownOpen(false)
      }
      if (ratingDropdownRef.current && !(ratingDropdownRef.current as HTMLElement).contains(target)) {
        setRatingDropdownOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (statusDropdownOpen || ratingDropdownOpen) {
          e.preventDefault()
          setStatusDropdownOpen(false)
          setRatingDropdownOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [statusDropdownOpen, ratingDropdownOpen])

  // Calculer isOwned en fonction du status (Wishlist = false, autres = true)
  const [prevStatus, setPrevStatus] = useState(game.status)
  if (game.status !== prevStatus) {
    setPrevStatus(game.status)
    const statusName = game.status || ''
    setIsOwned(statusName.toLowerCase() !== 'wishlist')
  }

  const statusOptions = [
    { value: '', label: t('gameForm.fields.selectStatus') || 'Sélectionner un statut' },
    ...(metadata.statuses || []).map((s: any) => ({ value: s._id, label: s.status_name })),
  ]

  const ratingOptions = metadata.rating || MOCK_OPTIONS.rating

  const handleStatusSelect = (val: string) => {
    onUpdateField('status_id', val)
    setStatusDropdownOpen(false)
  }

  const handleRatingSelect = (val: number | string) => {
    onUpdateField('note', val)
    setRatingDropdownOpen(false)
  }
  return (
    <section className="hero-section">
      {game?.imageUrl && (
        <LazyImage
          {...getOptimizedImageProps(game.imageUrl as string, {
            widths: [300, 600, 1000],
            autoWebp: true,
          })}
          alt={game.name}
          width={280}
          height={420}
          sizes="(max-width: 600px) 140px, 280px"
          className="hero-cover"
        />
      )}

      <div className="hero-content">
        <div className="tags-row">
          {game.tags.map((tag: any, i: number) => (
            <span key={i} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="detail-title">{game.name}</h1>

        <div className="meta-bar">
          <div className="meta-item rating-interactive">
            <div className="rating-container">
              {[1, 2, 3, 4, 5].map((star: any) => (
                <button
                  key={star}
                  className="star-btn"
                  onClick={() => handleRatingSelect(star)}
                  disabled={isUpdating}
                  title={`${star} étoile${star > 1 ? 's' : ''}`}
                >
                  <FontAwesomeIcon icon={(star <= (game.note || 0) ? faStarFull : faStarEmpty) as any} />
                </button>
              ))}
              <span className="rating-value">
                <strong>{game.note || 0}/5</strong>
              </span>
            </div>
            {ratingDropdownOpen && (
              <div className="dropdown-menu rating-dropdown">
                {ratingOptions.map((opt: any) => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${game.note === parseInt(opt.value) ? 'active' : ''}`}
                    onClick={() => handleRatingSelect(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="meta-item">
            <FontAwesomeIcon icon={faCalendarAlt} /> {t('gameDetail.addedToCollection')}{' '}
            <strong>{game.addedDate}</strong>
          </div>
        </div>

        <div className="hero-actions">
          <div className="action-item owned-badge">
            <FontAwesomeIcon icon={faArchive} /> <span>{isOwned ? 'Possédé' : 'Non possédé'}</span>
          </div>

          <button
            className={`btn-secondary-action ${game.isFavorite ? 'active' : ''}`}
            onClick={onToggleFavorite}
          >
            <FontAwesomeIcon icon={faHeart} />{' '}
            {game.isFavorite ? t('common.favorite') : t('common.favorite')}
          </button>

          <div className="status-dropdown-wrapper" ref={statusDropdownRef}>
            <button
              className="btn-secondary-action status"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              disabled={isUpdating}
            >
              <FontAwesomeIcon icon={game.status === 'Terminé' ? faCheck : faGamepad} />
              {game.status}
            </button>
            {statusDropdownOpen && (
              <div className="dropdown-menu status-dropdown">
                {statusOptions.map((opt: any) => (
                  <div
                    key={opt.value}
                    className={`dropdown-item ${game.status_id === opt.value ? 'active' : ''}`}
                    onClick={() => handleStatusSelect(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default DetailHero
