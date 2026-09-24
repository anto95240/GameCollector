import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo } from 'react'

import { THEME_CATEGORIES_DATA } from '@/config/themeData'
import { useTheme } from '@/context/ThemeContext'
import { useThemeUnlocks } from '@/hooks/domains/themes/useThemeUnlocks'

function getLuminance(hex: string) {
  if (!hex || hex === 'transparent') return 0.5
  let c = hex.substring(1)
  let rgb = parseInt(c, 16)
  let r = (rgb >> 16) & 0xff
  let g = (rgb >>  8) & 0xff
  let b = (rgb >>  0) & 0xff
  let a = [r, g, b].map(function (v) {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

export default function ThemesGallery() {
  const { themes, isLoading, alwaysShowSeasonal, setAlwaysShowSeasonal } = useThemeUnlocks()
  const { activePreset, setPreset, isLoadingSync } = useTheme()

  const handleSelectTheme = (themeId: string) => {
    setPreset(themeId)
  }

  const themesById = useMemo(() => {
    return themes.reduce((acc, t) => {
      acc[t.id_name] = t
      return acc
    }, {} as Record<string, typeof themes[0]>)
  }, [themes])

  return (
      <div className="themes-gallery-page" style={{ padding: '2rem' }}>
        <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Galerie des Thèmes</h1>
            <p style={{ color: 'var(--text-muted)' }}>
              Débloquez de nouveaux thèmes en ajoutant des jeux à votre collection et en remportant des trophées.
            </p>
          </div>
          
          {setAlwaysShowSeasonal && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem', 
              background: 'var(--bg-panel)', padding: '0.75rem 1rem', 
              borderRadius: '12px', border: '1px solid var(--border-subtle)',
              cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <input 
                type="checkbox" 
                checked={alwaysShowSeasonal} 
                onChange={(e) => setAlwaysShowSeasonal(e.target.checked)}
                style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--brand-primary)', cursor: 'pointer' }}
              />
              Toujours afficher les thèmes saisonniers
            </label>
          )}
        </header>

        {(isLoading || isLoadingSync) ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem', gap: '1rem', color: 'var(--accent-color)' }}>
            <FontAwesomeIcon icon={faSpinner} spin size="3x" />
            <p>Analyse de votre collection en cours...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            {THEME_CATEGORIES_DATA.map((category) => {
              // Filtrer les thèmes pour n'afficher que ceux qui sont dans la base (ou gérer l'affichage de ceux qui n'y sont pas encore)
              const categoryThemes = category.themes.map(tInfo => {
                const dbTheme = themesById[tInfo.id]
                return {
                  ...tInfo,
                  dbData: dbTheme
                }
              }).filter(t => t.dbData !== undefined)

              if (categoryThemes.length === 0) return null
              
              const cleanTitle = category.title
                .replace(/\s*\([^)]*\)/g, '') // Retire (16 idées) ou (9 thèmes intégrés)
                .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\p{M}]+\s*/gu, '') // Retire les émojis en début de ligne
                .replace(/^[^\wÀ-ÿ]+/g, '') // Retire les éventuels symboles parasites restants
                .trim()

              return (
                <section key={category.id}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                    {cleanTitle} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>({categoryThemes.length})</span>
                  </h2>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {categoryThemes.map(theme => {
                      const dbTheme = theme.dbData
                      const isEquipped = activePreset === theme.id
                      
                      const hasColors = theme.colors && theme.colors.length > 0;
                      const color1 = hasColors ? theme.colors[0] : 'transparent';
                      const color2 = hasColors && theme.colors.length > 1 ? theme.colors[1] : color1;
                      
                      // Calcul de lisibilité par rapport au vrai fond de la carte (color1)
                      const isBgLight = getLuminance(color1) > 0.22; // Seuil ajusté pour un meilleur rendu
                      const textColor = isBgLight ? '#000000' : '#ffffff';
                      const subTextColor = isBgLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)';

                      const baseBorderColor = 'rgba(255, 255, 255, 0.1)';
                      const topBorderColor = hasColors ? 'var(--brand-primary)' : baseBorderColor;

                      return (
                        <div 
                          key={theme.id}
                          data-preset={theme.id}
                          className="theme-card-preview"
                          style={{
                            backgroundColor: 'var(--bg-app)',
                            backgroundImage: hasColors && !isEquipped ? `linear-gradient(135deg, ${color1}08, ${color2}08)` : undefined,
                            borderWidth: hasColors ? '4px 1px 1px 1px' : '1px',
                            borderStyle: 'solid',
                            borderColor: `${topBorderColor} ${baseBorderColor} ${baseBorderColor} ${baseBorderColor}`,
                            borderRadius: '12px',
                            padding: '1.5rem',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
                            cursor: dbTheme.isUnlocked ? 'pointer' : 'default',
                            opacity: dbTheme.isUnlocked ? 1 : 0.6,
                            boxShadow: isEquipped ? '0 0 0 1px var(--success-color, #10b981)' : 'none'
                          }}
                          onClick={() => {
                            if (dbTheme.isUnlocked && !isEquipped) {
                              handleSelectTheme(theme.id)
                            }
                          }}
                          onMouseEnter={(e) => {
                            if (dbTheme.isUnlocked && !isEquipped) {
                              e.currentTarget.style.transform = 'translateY(-4px)'
                              e.currentTarget.style.borderColor = 'var(--border-focus)'
                              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (dbTheme.isUnlocked && !isEquipped) {
                              e.currentTarget.style.transform = 'none'
                              e.currentTarget.style.borderColor = 'var(--border-main)'
                              e.currentTarget.style.boxShadow = 'none'
                            }
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: textColor }}>{dbTheme.display_name}</h3>
                            {theme.colors && theme.colors.length > 0 && (
                              <div style={{ display: 'flex', gap: '4px' }}>
                                {theme.colors.map((color, index) => (
                                  <div key={index} style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: color, border: '1px solid rgba(255,255,255,0.2)' }} />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {!dbTheme.isUnlocked ? (
                            <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: subTextColor }}>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <p style={{ margin: 0, lineHeight: 1.4 }}>{dbTheme.unlockMessage}</p>
                              {dbTheme.maxProgress > 0 && (
                                <div style={{ marginTop: '0.5rem' }}>
                                  <div style={{ 
                                    height: '4px', 
                                    background: 'var(--border-subtle)', 
                                    borderRadius: '2px', 
                                    marginBottom: '0.25rem',
                                    position: 'relative'
                                  }}>
                                    <div style={{
                                      position: 'absolute',
                                      left: 0, top: 0, bottom: 0,
                                      background: 'var(--brand-primary)',
                                      borderRadius: '2px',
                                      width: `${(dbTheme.progress / dbTheme.maxProgress) * 100}%`
                                    }} />
                                  </div>
                                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{dbTheme.progress} / {dbTheme.maxProgress}</span>
                                </div>
                              )}
                              </div>
                            </div>
                          ) : (
                            <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
                              {isEquipped ? (
                                <span style={{ color: textColor, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.9 }}>
                                  Équipé
                                </span>
                              ) : (
                                <span style={{ color: subTextColor, fontWeight: 500 }}>Cliquez pour équiper</span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
  )
}

