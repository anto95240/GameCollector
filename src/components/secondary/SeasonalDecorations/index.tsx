import './SeasonalDecorations.css'

import {
  faGhost,
  faGift,
  faSnowflake,
  faSpider,
  faTree,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { useTheme } from '@/context/ThemeContext'

const SeasonalDecorations = () => {
  const { activePreset } = useTheme()
  const seasonalThemes = [
    'halloween',
    'christmas',
    'spring',
    'easter',
    'summer',
    'winter',
    'autumn',
    'chandeleur',
    'epiphanie',
  ]

  if (!seasonalThemes.includes(activePreset)) return null

  const renderParticles = (icon: any, count: number, className: string) => {
    return Array.from({ length: count }).map((_, i) => {
      const style = {
        '--random-x': Math.random(),
        '--random-delay': `${Math.random() * 10}s`,
        '--random-duration': `${10 + Math.random() * 15}s`,
        '--random-size': `${1 + Math.random() * 2}rem`,
      } as React.CSSProperties

      return (
        <FontAwesomeIcon
          key={i}
          icon={icon}
          className={`${className} particle`}
          style={style as any}
        />
      )
    })
  }

  return (
    <div className={`seasonal-decorations-container preset-${activePreset}`}>
      {activePreset === 'halloween' && (
        <>
          <FontAwesomeIcon icon={faSpider} className="decor-corner top-left text-orange-500" />
          <FontAwesomeIcon icon={faSpider} className="decor-corner top-right text-purple-500" />
          <div className="particles-container">
            {renderParticles(faGhost, 10, 'particle-float text-white opacity-20')}
          </div>
        </>
      )}

      {(activePreset === 'christmas' || activePreset === 'winter') && (
        <>
          {activePreset === 'christmas' && (
            <>
              <FontAwesomeIcon icon={faTree} className="decor-corner bottom-left text-green-600" />
              <FontAwesomeIcon icon={faGift} className="decor-corner bottom-right text-red-500" />
            </>
          )}
          <div className="particles-container">
            {renderParticles(faSnowflake, 20, 'particle-fall text-white opacity-40')}
          </div>
        </>
      )}
    </div>
  )
}

export default SeasonalDecorations
