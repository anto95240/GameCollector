import { useEffect, useState } from 'react'

import { APP_VERSION } from '@/config/constants'
import { readStoredUser } from '@/utils/userStorage'

import { GitHubRelease, useGithubReleases } from './useGithubReleases'

export const useVersionCheck = () => {
  const [isPatchNotesVisible, setIsPatchNotesVisible] = useState(false)
  const [latestRelease, setLatestRelease] = useState<GitHubRelease | null>(null)
  const { fetchPatchNotes } = useGithubReleases()

  useEffect(() => {
    const checkVersion = async () => {
      // On n'affiche la modale de nouveautés que pour les utilisateurs connectés
      if (!readStoredUser()) return

      const lastSeenVersion = localStorage.getItem('last_seen_version')

      // S'il n'y a pas de last_seen_version, c'est que c'est une connexion
      // très ancienne ou un cas imprévu. On sauvegarde la version sans le spammer.
      if (!lastSeenVersion) {
        localStorage.setItem('last_seen_version', APP_VERSION)
        return
      }

      if (lastSeenVersion !== APP_VERSION) {
        // La version a changé, on récupère les notes de mise à jour !
        const release = await fetchPatchNotes()
        if (release) {
          setLatestRelease(release)
          setIsPatchNotesVisible(true)
        } else {
          // Si on n'arrive pas à fetch, on met à jour quand même pour ne pas le bloquer indéfiniment
          localStorage.setItem('last_seen_version', APP_VERSION)
        }
      }
    }

    checkVersion()
  }, [fetchPatchNotes])

  useEffect(() => {
    const handleShowPatchNotes = async () => {
      // On affiche la modale (même si on a pas encore la release, ça charge)
      setIsPatchNotesVisible(true)
      const release = await fetchPatchNotes()
      if (release) {
        setLatestRelease(release)
      }
    }

    window.addEventListener('showPatchNotes', handleShowPatchNotes)
    return () => window.removeEventListener('showPatchNotes', handleShowPatchNotes)
  }, [fetchPatchNotes])

  const closePatchNotes = () => {
    setIsPatchNotesVisible(false)
    localStorage.setItem('last_seen_version', APP_VERSION)
  }

  return { isPatchNotesVisible, latestRelease, closePatchNotes }
}
