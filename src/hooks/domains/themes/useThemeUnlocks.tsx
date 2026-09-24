import { useEffect, useMemo, useRef, useState } from 'react'

import { normalizeThemeId } from '@/config/themeMigration'
import { THEME_RULES } from '@/config/themeRules'
import { useAuth } from '@/context/AuthContext'
import { useApiAchievements } from '@/hooks/api/useApiAchievements'
import { useGamesList } from '@/hooks/domains/games/useGamesList'
import { supabase } from '@/lib/supabase'

export interface ThemeDB {
  id: string
  id_name: string
  display_name: string
  unlock_type: 'default' | 'achievement' | 'collection' | 'date'
  required_achievement_id_name: string | null
  required_item_count: number | null
  required_genre: string | null
  date_start: string | null
  date_end: string | null
}

export interface UnlockedTheme extends ThemeDB {
  isUnlocked: boolean
  progress: number
  maxProgress: number
  unlockMessage: string
}

export const useThemeUnlocks = () => {
  const { user } = useAuth()
  const { getUserAchievements, getAllAchievements } = useApiAchievements()
  const { games, isLoading: gamesLoading } = useGamesList('')

  const [themes, setThemes] = useState<ThemeDB[]>([])
  const [userAchievements, setUserAchievements] = useState<any[]>([])
  const [allAchievements, setAllAchievements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch themes list
  useEffect(() => {
    const fetchThemes = async () => {
      const { data, error } = await supabase.from('themes').select('*')
      if (!error && data) {
        // Normaliser les IDs au cas où la migration SQL n'a pas encore été appliquée
        const dbThemes = (data as ThemeDB[]).map((t) => ({
          ...t,
          id_name: normalizeThemeId(t.id_name),
        }))
        if (!dbThemes.find((t) => t.id_name === 'neon_night')) {
          dbThemes.push({
            id: 'neon_night',
            id_name: 'neon_night',
            display_name: 'Neon Night',
            unlock_type: 'default',
            required_achievement_id_name: null,
            required_item_count: null,
            required_genre: null,
            date_start: null,
            date_end: null,
          })
        }
        if (!dbThemes.find((t) => t.id_name === 'arctic_day')) {
          dbThemes.push({
            id: 'arctic_day',
            id_name: 'arctic_day',
            display_name: 'Arctic Day',
            unlock_type: 'default',
            required_achievement_id_name: null,
            required_item_count: null,
            required_genre: null,
            date_start: null,
            date_end: null,
          })
        }
        setThemes(dbThemes)
      }
    }
    fetchThemes()
  }, [])

  // Fetch user achievements and all achievements
  useEffect(() => {
    if (user) {
      Promise.all([getUserAchievements(), getAllAchievements()])
        .then(([achievements, allAch]) => {
          setUserAchievements(achievements)
          setAllAchievements(allAch)
        })
        .finally(() => {
          setIsLoading(false)
        })
    } else {
      setUserAchievements([])
      setAllAchievements([])
      setIsLoading(false)
    }
  }, [user])

  const isFirstLoadRef = useRef(true)
  const knownUnlockedRef = useRef<Set<string>>(new Set())

  // Initialiser knownUnlockedRef depuis le localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('gc_known_unlocked_themes')
      if (stored) {
        knownUnlockedRef.current = new Set(JSON.parse(stored))
        isFirstLoadRef.current = false
      }
    } catch {
      /* Valeur corrompue dans localStorage, on ignore */
    }
  }, [])

  const [alwaysShowSeasonal, setAlwaysShowSeasonal] = useState(() => {
    try {
      return localStorage.getItem('gc_always_show_seasonal') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    localStorage.setItem('gc_always_show_seasonal', String(alwaysShowSeasonal))
  }, [alwaysShowSeasonal])

  const evaluatedThemes = useMemo(() => {
    if (!themes.length) return []

    return themes.map((theme) => {
      let isUnlocked = false
      let progress = 0
      let maxProgress = 1
      let unlockMessage = ''

      let type = theme.unlock_type
      let requiredAchId = theme.required_achievement_id_name

      const rule = THEME_RULES.find((r) => r.id === (theme.id_name || theme.id))
      if (rule) {
        if (rule.condition.match(/Trophée\s+`?([^`\s]+)`?/i)) {
          type = 'achievement'
          requiredAchId = rule.condition.match(/Trophée\s+`?([^`\s]+)`?/i)?.[1] || requiredAchId
        } else if (
          rule.condition.includes('Événementielle') ||
          rule.condition.includes('Saisonnière')
        ) {
          type = 'date'
        } else {
          type = 'collection'
        }
      }

      if (type === 'default') {
        isUnlocked = true
        unlockMessage = 'Thème par défaut'
      } else if (type === 'achievement') {
        const ach = userAchievements.find((a) => a.id_name === requiredAchId)
        isUnlocked = !!ach
        progress = isUnlocked ? 1 : 0
        const achDef = allAchievements.find((a) => a.id_name === requiredAchId)
        let achTitle = achDef?.title || requiredAchId?.replace(/_/g, ' ') || 'Trophée Inconnu'
        if (achTitle.toLowerCase() === 'unknown achievement') achTitle = 'Trophée Mystère'
        unlockMessage = `Débloqué via le trophée: ${achTitle}`
      } else if (type === 'collection') {
        if (rule) {
          maxProgress = rule.max
          progress = Math.min(rule.evaluate(games || []), maxProgress)
          isUnlocked = progress >= maxProgress
          unlockMessage = rule.condition.replace(/_/g, ' ')
          if (/^\d+\s+jeu/.test(unlockMessage)) {
            unlockMessage = 'Ajouter ' + unlockMessage
          }
        } else {
          maxProgress = theme.required_item_count || 1
          progress = 0
          isUnlocked = false
          unlockMessage = `Débloquer la collection requise`
        }
      } else if (type === 'date') {
        const now = new Date()
        const month = now.getMonth() + 1
        const id = theme.id_name || theme.id

        if (alwaysShowSeasonal) {
          isUnlocked = true
        } else {
          if (id === 'halloween' || id === 'slappy') isUnlocked = month === 10
          else if (id === 'christmas' || id === 'kevin') isUnlocked = month === 12
          else if (id === 'spring') isUnlocked = month >= 3 && month <= 5
          else if (id === 'summer') isUnlocked = month >= 6 && month <= 8
          else if (id === 'autumn') isUnlocked = month >= 9 && month <= 11
          else if (id === 'winter') isUnlocked = month === 12 || month <= 2
          else if (id === 'easter') isUnlocked = month === 3 || month === 4
          else if (id === 'chandeleur') isUnlocked = month === 2
          else if (id === 'epiphanie') isUnlocked = month === 1
          else isUnlocked = false
        }

        progress = isUnlocked ? 1 : 0
        maxProgress = 0 // Masque la barre de progression pour les thèmes saisonniers
        unlockMessage = isUnlocked
          ? 'Thème saisonnier (Débloqué)'
          : 'Débloqué durant sa saison ou événement'
      }

      return {
        ...theme,
        isUnlocked,
        progress,
        maxProgress,
        unlockMessage,
      } as UnlockedTheme
    })
  }, [themes, userAchievements, games, allAchievements, alwaysShowSeasonal])

  // Détecter les NOUVEAUX thèmes débloqués
  useEffect(() => {
    // Ne pas évaluer si on charge encore ou si on n'a pas de thèmes
    if (isLoading || evaluatedThemes.length === 0) return

    let hasNewUnlocks = false
    const newlyUnlocked: UnlockedTheme[] = []

    evaluatedThemes.forEach((theme) => {
      if (theme.isUnlocked && !knownUnlockedRef.current.has(theme.id_name)) {
        knownUnlockedRef.current.add(theme.id_name)
        hasNewUnlocks = true
        if (!isFirstLoadRef.current) {
          newlyUnlocked.push(theme)
        }
      }
    })

    if (hasNewUnlocks) {
      localStorage.setItem(
        'gc_known_unlocked_themes',
        JSON.stringify(Array.from(knownUnlockedRef.current))
      )
    }

    if (newlyUnlocked.length > 0) {
      // Déclencher les toasts séquentiellement pour ne pas tout empiler d'un coup
      newlyUnlocked.forEach((theme, index) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('themeUnlocked', { detail: theme }))
        }, index * 4000)
      })
    }

    // Après la première vérification post-chargement complet, on désactive le mode premier chargement
    isFirstLoadRef.current = false
  }, [evaluatedThemes, isLoading])

  return {
    themes: evaluatedThemes,
    isLoading: isLoading || gamesLoading,
    alwaysShowSeasonal,
    setAlwaysShowSeasonal,
  }
}
