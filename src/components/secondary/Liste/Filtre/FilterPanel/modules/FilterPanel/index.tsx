import './FilterPanel.css'

import {
    faCalendarAlt,
    faCheckCircle,
    faClock,
    faGamepad,
    faHeart,
    faLayerGroup,
    faStar,
} from '@fortawesome/free-solid-svg-icons'
import { t } from 'i18next'
import { useEffect, useState } from 'react'

import FilterAccordionItem from '@/components/secondary/Liste/Filtre/FilterAccordionItem'

import {
    getActiveFilterValue,
    getActiveSort,
    getOptionCount,
    handleClearCategory,
    parseRangeDraft,
} from '../../filterUtils'
import { ActiveFiltersBox } from '../ActiveFiltersBox'
import { FilterPanelFooter } from '../FilterPanelFooter'
import { FilterPanelHeader } from '../FilterPanelHeader'
import { FilterPanelTabs } from '../FilterPanelTabs'
import { SavedFiltersList } from '../SavedFiltersList'
import { SaveFiltersBox } from '../SaveFiltersBox'
import { RangeFilterItem, SortFilterItem } from '../SpecialFilters'

const ICONS = {
  genre: faLayerGroup,
  platform: faGamepad,
  year: faCalendarAlt,
  rating: faStar,
  status: faCheckCircle,
  favorite: faHeart,
  soon: faClock,
}

const FilterPanel = ({
  isOpen,
  onClose,
  selectedFilters,
  onRemoveFilter,
  onClearAll,
  filterData,
  onSelectFilter,
  games,
  resultCount,
  savedFilters = [],
  onSaveCurrentFilters,
  onApplySaved,
  onDeleteSaved,
}: any) => {
  const [expandedFilter, setExpandedFilter] = useState<any>(null)
  const [showAllOptions, setShowAllOptions] = useState({})
  const [activePanelTab, setActivePanelTab] = useState('all')
  const [saveName, setSaveName] = useState('')
  const [specialExpanded, setSpecialExpanded] = useState({
    sort: false,
    ratingRange: false,
    yearRange: false,
  })
  const [sortDraft, setSortDraft] = useState({ field: 'Nom', order: 'asc' })
  const [rangeDrafts, setRangeDrafts] = useState({
    yearRange: { min: '', max: '' },
    ratingRange: { min: '', max: '' },
  })

  const toggleFilterCategory = (id: any) => setExpandedFilter(expandedFilter === id ? null : id)

  const toggleShowAll = (categoryId: any) => {
    setShowAllOptions((prev: any) => ({ ...prev, [categoryId]: !prev[categoryId] }))
  }

  const handleClearCategoryLocal = (categoryLabel: any) => {
    handleClearCategory(selectedFilters, onRemoveFilter, categoryLabel)
  }

  const getOptionCountLocal = (categoryLabel: any, optionValue: any) =>
    getOptionCount(games, categoryLabel, optionValue)

  const getActiveFilterValueLocal = (categoryLabel: any) =>
    getActiveFilterValue(selectedFilters, categoryLabel)

  const getActiveSortLocal = () => getActiveSort(selectedFilters)

  const toggleSpecial = (key: any) => {
    setSpecialExpanded((prev: any) => ({ ...prev, [key]: !prev[key] }))
  }

  useEffect(() => {
    setRangeDrafts({
      yearRange: parseRangeDraft(selectedFilters, 'Année'),
      ratingRange: parseRangeDraft(selectedFilters, 'Note'),
    })
    setSortDraft(getActiveSortLocal())
  }, [selectedFilters])

  return (
    <div
      className={`filter-panel flex flex-col ${isOpen ? 'open' : ''}`}
      onClick={(e: any) => e.stopPropagation()}
    >
      <FilterPanelHeader onClose={onClose} />

      <div className="filter-scroll-content grow overflow-y-auto custom-scrollbar">
        <ActiveFiltersBox
          selectedFilters={selectedFilters}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
          noFilterLabel={t('gameList.filters.noFilter')}
          clearAllLabel={t('gameList.filters.clearAll')}
        />

        <FilterPanelTabs activePanelTab={activePanelTab} setActivePanelTab={setActivePanelTab} />

        {activePanelTab === 'all' ? (
          <div className="filter-accordion flex flex-col gap-3 pb-4">
            {filterData.map((cat: any) => {
              if (cat.type === 'range') {
                return (
                  <RangeFilterItem
                    key={cat.id}
                    category={cat}
                    rangeDrafts={rangeDrafts}
                    setRangeDrafts={setRangeDrafts}
                    getActiveFilterValue={getActiveFilterValueLocal}
                    onSelectFilter={onSelectFilter}
                    onClose={onClose}
                    icon={(ICONS as any)[cat.id] || faLayerGroup}
                    specialExpanded={specialExpanded}
                    toggleSpecial={toggleSpecial}
                  />
                )
              }

              if (cat.type === 'sort') {
                return (
                  <SortFilterItem
                    key={cat.id}
                    category={cat}
                    sortDraft={sortDraft}
                    setSortDraft={setSortDraft}
                    getActiveFilterValue={getActiveFilterValueLocal}
                    onSelectFilter={onSelectFilter}
                    onClose={onClose}
                    icon={(ICONS as any)[cat.id] || faLayerGroup}
                    specialExpanded={specialExpanded}
                    toggleSpecial={toggleSpecial}
                  />
                )
              }

              return (
                <FilterAccordionItem
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedFilter === cat.id}
                  onToggle={() => toggleFilterCategory(cat.id)}
                  selectedFilters={selectedFilters}
                  onSelectFilter={onSelectFilter}
                  onRemoveFilter={onRemoveFilter}
                  icon={(ICONS as any)[cat.id] || faLayerGroup}
                  getOptionCount={getOptionCountLocal}
                  showAllState={(showAllOptions as any)[cat.id]}
                  toggleShowAll={toggleShowAll}
                  handleClearCategory={handleClearCategoryLocal}
                />
              )
            })}

            <SaveFiltersBox
              saveName={saveName}
              setSaveName={setSaveName}
              onSaveCurrentFilters={onSaveCurrentFilters}
              onClearAll={onClearAll}
            />
          </div>
        ) : (
          <SavedFiltersList
            savedFilters={savedFilters}
            onApplySaved={(s: any) => {
              if (onApplySaved) onApplySaved(s)
              setActivePanelTab('all')
            }}
            onDeleteSaved={onDeleteSaved}
          />
        )}
      </div>

      <FilterPanelFooter resultCount={resultCount} onClose={onClose} />
    </div>
  )
}

export default FilterPanel
