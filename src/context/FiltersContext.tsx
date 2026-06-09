import { createContext, useCallback, useContext, useState } from 'react'

interface FiltersContextType {
  searchTerm: string
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>
  selectedFilters: string[]
  setSelectedFilters: React.Dispatch<React.SetStateAction<string[]>>
  page: number
  setPage: React.Dispatch<React.SetStateAction<number>>
  removeFilter: (tag: string) => void
  clearAllFilters: () => void
}

const FiltersContext = createContext<FiltersContextType | null>(null)

export const FiltersProvider = ({ children }: { children: React.ReactNode }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [page, setPage] = useState(1)

  const removeFilter = useCallback((tag: string) => {
    setSelectedFilters((prev: any) => prev.filter((t: any) => t !== tag))
  }, [])

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([])
    setPage(1)
    setSearchTerm('')
  }, [])

  // La logique de handleSelectFilter de useGameFiltering peut être laissée
  // dans le hook ou ramenée ici, mais comme elle est spécifique aux jeux,
  // on peut juste exposer setSelectedFilters.

  return (
    <FiltersContext.Provider
      value={{
        searchTerm,
        setSearchTerm,
        selectedFilters,
        setSelectedFilters,
        page,
        setPage,
        removeFilter,
        clearAllFilters,
      }}
    >
      {children}
    </FiltersContext.Provider>
  )
}

export const useFilters = (): FiltersContextType => {
  const context = useContext(FiltersContext)
  if (!context) {
    throw new Error("useFilters doit être utilisé à l'intérieur d'un FiltersProvider")
  }
  return context
}
