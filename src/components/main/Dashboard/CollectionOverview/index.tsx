import './CollectionOverview.css'

import {
  faClock,
  faGamepad,
  faHeart,
  faLayerGroup,
  faStar,
  faTv,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface CollectionOverviewProps {
  stats: any
}

const CollectionOverview: React.FC<CollectionOverviewProps> = ({ stats }) => {
  const { t } = useTranslation()

  const cards = useMemo(() => {
    if (!stats) return []

    const totalHours = Math.round(stats.totalPlayingTime || 0)
    const formattedTime =
      totalHours >= 1000 ? `${(totalHours / 1000).toFixed(1)}k` : `${totalHours}`

    return [
      {
        icon: faGamepad,
        label: t('dashboard.totalGame'),
        value: stats.totalGames ?? 0,
        unit: '',
      },
      {
        icon: faHeart,
        label: t('dashboard.favorite'),
        value: stats.favoriteCount ?? 0,
        unit: '',
      },
      {
        icon: faTv,
        label: t('dashboard.platform'),
        value: stats.platformCount ?? 0,
        unit: '',
      },
      {
        icon: faLayerGroup,
        label: t('dashboard.genre'),
        value: stats.genreCount ?? 0,
        unit: '',
      },
      {
        icon: faClock,
        label: t('editMode.widgets.totalPlayingTime'),
        value: formattedTime,
        unit: 'h',
      },
      {
        icon: faStar,
        label: t('editMode.widgets.avgRating'),
        value: stats.avgRating ?? '–',
        unit: stats.avgRating ? '/10' : '',
      },
    ]
  }, [stats, t])

  if (!stats) return null

  return (
    <div className="collection-overview">
      {cards.map((card, i) => (
        <div key={i} className="collection-overview-card">
          <div className="overview-icon-wrap">
            <FontAwesomeIcon icon={card.icon} />
          </div>
          <div className="overview-card-body">
            <span className="overview-card-label">{card.label}</span>
            <span className="overview-card-value">
              {card.value}
              {card.unit && <span className="overview-unit">{card.unit}</span>}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default React.memo(CollectionOverview)
