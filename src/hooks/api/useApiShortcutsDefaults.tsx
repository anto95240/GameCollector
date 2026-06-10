import { useCallback, useState } from 'react'
export const useApiShortcutsDefaults = () => {
  const [defaults, setDefaults] = useState(getHardcodedDefaults())
  const [loading, _setLoading] = useState(false)
  const [error, _setError] = useState<any>(null)
  const getDefaults = useCallback(() => {
    const fallbackDefaults = getHardcodedDefaults()
    setDefaults(fallbackDefaults)
    return fallbackDefaults
  }, [])

  return {
    defaults,
    loading,
    error,
    getDefaults,
  }
}
export const getHardcodedDefaults = () => [
  {
    _id: '1',
    action: 'searchBar',
    description: 'Accéder à la barre de recherche',
    key: 'k',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '2',
    action: 'dashboard',
    description: 'Aller au dashboard',
    key: 'd',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '3',
    action: 'gamesList',
    description: 'Aller à la liste des jeux',
    key: 'l',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '4',
    action: 'categories',
    description: 'Aller aux catégories',
    key: 'c',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '5',
    action: 'profile',
    description: 'Aller au profil',
    key: 'p',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '6',
    action: 'statistics',
    description: 'Aller aux statistiques',
    key: 's',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '7',
    action: 'trophies',
    description: 'Aller aux trophées',
    key: 't',
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
    category: 'Navigation',
  },
  {
    _id: '8',
    action: 'addGame',
    description: 'Ajouter un nouveau jeu',
    key: 'n',
    ctrlKey: true,
    altKey: true,
    shiftKey: false,
    category: 'Actions',
  },
  {
    _id: '9',
    action: 'help',
    description: "Afficher l'aide des raccourcis",
    key: 'h',
    ctrlKey: true,
    altKey: false,
    shiftKey: false,
    category: 'Actions',
  },
]

export default useApiShortcutsDefaults
