import './TopGamesWidget.css'

import { faMedal, faStar } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { formatImageUrl } from '@/utils/formatters/imageFormatters'

const MEDALS = ['🥇', '🥈', '🥉']

const TopGamesWidget = ({ stats, metadata = {} }) => {
  if (!stats || !stats.topGames) return null

  const topGames = stats.topGames.map((g) => ({
    ...g,
    platformName: metadata.platforms?.find((p) => p._id === g.platform)?.platform_name || 'Inconnu',
    genreName: metadata.genres?.find((mg) => mg._id === g.genre)?.genre_name || '',
    imageUrl: formatImageUrl(g.image),
  }))

  return (
    <div className="top-games-wrapper">
      <div className="top-games-section">
        <div className="top-games-section-header">
          <FontAwesomeIcon icon={faMedal} />
          <span>Top 5 meilleures notes</span>
        </div>
        <div className="top-games-list">
          {topGames.length === 0 && (
            <p className="top-games-empty">Notez vos jeux pour les voir apparaître ici</p>
          )}
          {topGames.map((g, i) => (
            <div key={g._id} className="top-game-row">
              <span className="top-game-rank">{MEDALS[i] || `#${i + 1}`}</span>
              <div
                className="top-game-cover"
                style={g.imageUrl ? { backgroundImage: `url("${g.imageUrl}")` } : {}}
              />
              <div className="top-game-info">
                <span className="top-game-name">{g.name}</span>
                <span className="top-game-meta">{g.platformName}</span>
              </div>
              <div className="top-game-rating">
                <span className="rating-num">
                  {g.note}/5 <FontAwesomeIcon icon={faStar} className="star-filled" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default TopGamesWidget
