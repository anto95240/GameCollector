export interface GitHubRelease {
  id: number
  tag_name: string
  name: string
  body: string
  published_at: string
}

export const useGithubReleases = () => {
  const fetchPatchNotes = async (): Promise<GitHubRelease | null> => {
    try {
      const res = await fetch('https://api.github.com/repos/anto95240/GameCollector/releases')
      if (!res.ok) throw new Error('Erreur récupération releases')

      const releases: GitHubRelease[] = await res.json()
      // On retourne la toute première release (la plus récente)
      if (releases && releases.length > 0) {
        return releases[0]
      }
      return null
    } catch (error) {
      console.error('Erreur API GitHub:', error)
      return null
    }
  }

  return { fetchPatchNotes }
}
