import { faHeart as faHeartSolid, faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import React, { useMemo, useState } from 'react'

import { THEME_CATEGORIES_DATA, ThemeInfo } from '@/config/themeData'
import { useTheme } from '@/context/ThemeContext'
import { useApiThemeFavorites } from '@/hooks/api/useApiThemeFavorites'
import { useThemeUnlocks } from '@/hooks/domains/themes/useThemeUnlocks'

// ─── Utilitaire luminance ────────────────────────────────────────────────────
function getLuminance(hex: string) {
  if (!hex || hex === 'transparent') return 0.5
  const c = hex.substring(1)
  const rgb = parseInt(c, 16)
  const r = (rgb >> 16) & 0xff
  const g = (rgb >> 8) & 0xff
  const b = (rgb >> 0) & 0xff
  const a = [r, g, b].map(function (v) {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  })
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
}

// ─── Label d'univers lisible ─────────────────────────────────────────────────
function universeLabel(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// ─── Filtres disponibles ──────────────────────────────────────────────────────
type FilterMode = 'all' | 'unlocked' | 'locked' | 'favorites' | string

export default function ThemesGallery() {
  const { themes, isLoading, alwaysShowSeasonal, setAlwaysShowSeasonal } = useThemeUnlocks()
  const { activePreset, setPreset, isLoadingSync } = useTheme()
  const { isFavorite, toggleFavorite, isLoading: favLoading } = useApiThemeFavorites()

  const [filterMode, setFilterMode] = useState<FilterMode>('all')
  const [universeFilter, setUniverseFilter] = useState<string>('all')

  const handleSelectTheme = (themeId: string) => {
    setPreset(themeId)
  }

  // Map thèmes DB par id_name
  const themesById = useMemo(() => {
    return themes.reduce(
      (acc, t) => {
        acc[t.id_name] = t
        return acc
      },
      {} as Record<string, (typeof themes)[0]>
    )
  }, [themes])

  // Collecter tous les univers uniques présents dans les thèmes débloqués/disponibles
  const allUniverses = useMemo(() => {
    const slugs = new Set<string>()
    THEME_CATEGORIES_DATA.forEach((cat) =>
      cat.themes.forEach((tInfo) => {
        const dbTheme = themesById[tInfo.id]
        const universe = dbTheme?.universe ?? tInfo.universe ?? null
        if (universe) slugs.add(universe)
      })
    )
    return Array.from(slugs).sort()
  }, [themesById])

  // Filtres rapides (statut)
  const quickFilters: { key: FilterMode; label: string }[] = [
    { key: 'all', label: 'Tous' },
    { key: 'unlocked', label: '✅ Débloqués' },
    { key: 'locked', label: '🔒 Verrouillés' },
    { key: 'favorites', label: '❤️ Favoris' },
  ]

  const isLoaded = !isLoading && !isLoadingSync && !favLoading

  return (
    <div className="themes-gallery-page" style={{ padding: '2rem' }}>
      {/* ── En-tête ── */}
      <header
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h1>Galerie des Thèmes</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Débloquez de nouveaux thèmes en ajoutant des jeux à votre collection et en remportant
            des trophées.
          </p>
        </div>

        {setAlwaysShowSeasonal && (
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'var(--bg-panel)',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: '1px solid var(--border-subtle)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <input
              type="checkbox"
              checked={alwaysShowSeasonal}
              onChange={(e) => setAlwaysShowSeasonal(e.target.checked)}
              style={{
                width: '1.2rem',
                height: '1.2rem',
                accentColor: 'var(--brand-primary)',
                cursor: 'pointer',
              }}
            />
            Toujours afficher les thèmes saisonniers
          </label>
        )}
      </header>

      {/* ── Barre de filtres ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '2rem',
          alignItems: 'center',
        }}
      >
        {/* Filtres rapides */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {quickFilters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilterMode(f.key)}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '999px',
                border: '1px solid',
                borderColor: filterMode === f.key ? 'var(--brand-primary)' : 'var(--border-subtle)',
                background: filterMode === f.key ? 'var(--brand-primary)' : 'var(--bg-panel)',
                color: filterMode === f.key ? '#fff' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: filterMode === f.key ? 600 : 400,
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Séparateur */}
        <div
          style={{
            width: '1px',
            height: '24px',
            background: 'var(--border-subtle)',
            margin: '0 0.25rem',
          }}
        />

        {/* Filtre par univers */}
        <select
          value={universeFilter}
          onChange={(e) => setUniverseFilter(e.target.value)}
          style={{
            padding: '0.45rem 0.9rem',
            borderRadius: '999px',
            border: `1px solid ${universeFilter !== 'all' ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '0.85rem',
            outline: 'none',
            minWidth: '160px',
          }}
        >
          <option value="all">🎮 Tous les univers</option>
          <option value="none">— Sans univers</option>
          {allUniverses.map((u) => (
            <option key={u} value={u}>
              {universeLabel(u)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Contenu ── */}
      {!isLoaded ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '4rem',
            gap: '1rem',
            color: 'var(--accent-color)',
          }}
        >
          <FontAwesomeIcon icon={faSpinner} spin size="3x" />
          <p>Analyse de votre collection en cours...</p>
        </div>
      ) : (
        <ThemeGrid
          themes={themes}
          themesById={themesById}
          filterMode={filterMode}
          universeFilter={universeFilter}
          activePreset={activePreset}
          isFavorite={isFavorite}
          toggleFavorite={toggleFavorite}
          onSelectTheme={handleSelectTheme}
        />
      )}
    </div>
  )
}

// ─── Types internes ──────────────────────────────────────────────────────────
type UnlockedThemeWithData = ReturnType<typeof useThemeUnlocks>['themes'][0]
type EnrichedTheme = ThemeInfo & { dbData: UnlockedThemeWithData }

// ─── Grille des thèmes ────────────────────────────────────────────────────────
interface ThemeGridProps {
  themes: UnlockedThemeWithData[]
  themesById: Record<string, UnlockedThemeWithData>
  filterMode: FilterMode
  universeFilter: string
  activePreset: string | null
  isFavorite: (id: string) => boolean
  toggleFavorite: (id: string) => void
  onSelectTheme: (id: string) => void
}

function ThemeGrid({
  themesById,
  filterMode,
  universeFilter,
  activePreset,
  isFavorite,
  toggleFavorite,
  onSelectTheme,
}: ThemeGridProps) {
  // Construire la liste filtrée depuis THEME_CATEGORIES_DATA
  const sections = useMemo(() => {
    return THEME_CATEGORIES_DATA.map((category) => {
      const categoryThemes: EnrichedTheme[] = category.themes
        .map((tInfo): EnrichedTheme | null => {
          const dbTheme = themesById[tInfo.id]
          if (!dbTheme) return null
          return { ...tInfo, dbData: dbTheme }
        })
        .filter((t): t is EnrichedTheme => t !== null)
        .filter((t) => {
          const universe = t.dbData.universe ?? t.universe ?? null

          // Filtre univers
          if (universeFilter === 'none' && universe !== null) return false
          if (universeFilter !== 'all' && universeFilter !== 'none' && universe !== universeFilter)
            return false

          // Filtre statut
          if (filterMode === 'unlocked' && !t.dbData.isUnlocked) return false
          if (filterMode === 'locked' && t.dbData.isUnlocked) return false
          if (filterMode === 'favorites' && !isFavorite(t.id)) return false

          return true
        })

      return { category, themes: categoryThemes }
    }).filter((s) => s.themes.length > 0)
  }, [themesById, filterMode, universeFilter, isFavorite])

  if (sections.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem',
          color: 'var(--text-muted)',
          fontSize: '1rem',
        }}
      >
        Aucun thème ne correspond à ces filtres.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {sections.map(({ category, themes: catThemes }) => {
        const cleanTitle = category.title
          .replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\p{M}]+\s*/gu, '')
          .trim()

        return (
          <section key={category.id}>
            <h2
              style={{
                fontSize: '1.5rem',
                marginBottom: '1.5rem',
                paddingBottom: '0.5rem',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              {cleanTitle}{' '}
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                ({catThemes.length})
              </span>
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1.5rem',
              }}
            >
              {catThemes.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  dbTheme={theme.dbData}
                  isEquipped={activePreset === theme.id}
                  isFavorite={isFavorite(theme.id)}
                  onToggleFavorite={toggleFavorite}
                  onSelect={onSelectTheme}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

// ─── Carte thème ──────────────────────────────────────────────────────────────
interface ThemeCardProps {
  theme: EnrichedTheme
  dbTheme: UnlockedThemeWithData
  isEquipped: boolean
  isFavorite: boolean
  onToggleFavorite: (id: string) => void
  onSelect: (id: string) => void
}

function ThemeCard({
  theme,
  dbTheme,
  isEquipped,
  isFavorite,
  onToggleFavorite,
  onSelect,
}: ThemeCardProps) {
  const hasColors = theme.colors && theme.colors.length > 0
  const color1 = hasColors ? theme.colors![0] : 'transparent'
  const color2 = hasColors && theme.colors!.length > 1 ? theme.colors![1] : color1

  const isBgLight = getLuminance(color1) > 0.22
  const textColor = isBgLight ? '#000000' : '#ffffff'
  const subTextColor = isBgLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)'

  const baseBorderColor = 'rgba(255, 255, 255, 0.1)'
  const topBorderColor = hasColors ? 'var(--brand-primary)' : baseBorderColor

  const universe = dbTheme.universe ?? theme.universe ?? null

  return (
    <div
      key={theme.id}
      data-preset={theme.id}
      className="theme-card-preview"
      style={{
        backgroundColor: 'var(--bg-app)',
        backgroundImage:
          hasColors && !isEquipped
            ? `linear-gradient(135deg, ${color1}08, ${color2}08)`
            : undefined,
        borderWidth: hasColors ? '4px 1px 1px 1px' : '1px',
        borderStyle: 'solid',
        borderColor: `${topBorderColor} ${baseBorderColor} ${baseBorderColor} ${baseBorderColor}`,
        borderRadius: '12px',
        padding: '1.5rem',
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, opacity 0.2s ease',
        cursor: dbTheme.isUnlocked ? 'pointer' : 'default',
        opacity: dbTheme.isUnlocked ? 1 : 0.6,
        boxShadow: isEquipped ? '0 0 0 1px var(--success-color, #10b981)' : 'none',
        position: 'relative',
      }}
      onClick={() => {
        if (dbTheme.isUnlocked && !isEquipped) onSelect(theme.id)
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
      {/* ── Bouton favori ── */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite(theme.id)
        }}
        title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        style={{
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.25rem',
          fontSize: '1rem',
          color: isFavorite ? '#ef4444' : subTextColor,
          opacity: isFavorite ? 1 : 0.5,
          transition: 'opacity 0.15s ease, color 0.15s ease, transform 0.15s ease',
          lineHeight: 1,
          zIndex: 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1'
          e.currentTarget.style.transform = 'scale(1.15)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = isFavorite ? '1' : '0.5'
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {isFavorite ? (
          <FontAwesomeIcon icon={faHeartSolid} />
        ) : (
          <svg
            viewBox="0 0 512 512"
            fill="currentColor"
            width="1em"
            height="1em"
            aria-hidden="true"
          >
            <path d="M458.4 64.3C400.6 15.7 311.3 23 256 79.3 200.7 23 111.4 15.6 53.6 64.3-21.6 123.6-10.6 230.8 43 285.5l175.4 178.7c10 10.2 23.4 15.9 37.6 15.9 14.3 0 27.6-5.6 37.6-15.8L469 285.6c53.5-54.7 64.7-161.9-10.6-221.3zm-23.6 198.8L259.4 440.8c-1.5 1.5-3.4 2.2-5.4 2.2-1.9 0-3.8-.7-5.4-2.1L73.2 263.1C23.9 212.7 17.5 133.2 67.4 89.1c45.5-39.8 113.1-33.7 155.9 13.5L256 141.4l32.7-38.8c42.7-47.1 110.2-53.2 155.9-13.5 49.9 44.1 43.5 123.6-9.8 174z" />
          </svg>
        )}
      </button>

      {/* ── Nom + couleurs ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.6rem',
          paddingRight: '1.5rem', // évite chevauchement avec le cœur
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: textColor }}>{dbTheme.display_name}</h3>
        {hasColors && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {theme.colors!.map((color, index) => (
              <div
                key={index}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Badge univers ── */}
      {universe && (
        <div style={{ marginBottom: '0.75rem' }}>
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.03em',
              padding: '0.2rem 0.6rem',
              borderRadius: '999px',
              background: `${color2}25`,
              color: subTextColor,
              border: `1px solid ${color2}40`,
              textTransform: 'uppercase',
            }}
          >
            {universeLabel(universe)}
          </span>
        </div>
      )}

      {/* ── Statut / progression ── */}
      {!dbTheme.isUnlocked ? (
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.85rem', color: subTextColor }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <p style={{ margin: 0, lineHeight: 1.4 }}>{dbTheme.unlockMessage}</p>
            {dbTheme.maxProgress > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div
                  style={{
                    height: '4px',
                    background: 'var(--border-subtle)',
                    borderRadius: '2px',
                    marginBottom: '0.25rem',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      background: 'var(--brand-primary)',
                      borderRadius: '2px',
                      width: `${(dbTheme.progress / dbTheme.maxProgress) * 100}%`,
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>
                  {dbTheme.progress} / {dbTheme.maxProgress}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
          {isEquipped ? (
            <span
              style={{
                color: textColor,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: 0.9,
              }}
            >
              Équipé
            </span>
          ) : (
            <span style={{ color: subTextColor, fontWeight: 500 }}>Cliquez pour équiper</span>
          )}
        </div>
      )}
    </div>
  )
}
