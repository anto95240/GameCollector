export const normalizeUserId = (user) => user?.uid || user?._id || user?.id || null

export const parseNumeric = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export const extractFilterValues = (selectedFilters) => {
  const values = {
    genre: [],
    platform: [],
    minRating: null,
    maxRating: null,
    releaseYear: null,
    isActive: false,
    description: '',
  }

  for (const filter of selectedFilters || []) {
    const [categoryRaw, valueRaw = ''] = filter.split(': ')
    const category = (categoryRaw || '').toLowerCase()
    const value = valueRaw.trim()

    if (category.includes('genre')) {
      values.genre.push(...value.split('|').filter(Boolean))
      continue
    }

    if (category.includes('platform') || category.includes('plateforme')) {
      values.platform.push(...value.split('|').filter(Boolean))
      continue
    }

    if (category.includes('rating') || category.includes('note')) {
      const [min, max] = value.split('|').length > 1 ? value.split('|') : value.split('-')
      const minRating = parseNumeric(min)
      const maxRating = parseNumeric(max)
      if (minRating !== null) values.minRating = minRating
      if (maxRating !== null) values.maxRating = maxRating
      continue
    }

    if (category.includes('year') || category.includes('année') || category.includes('annee')) {
      const [minYear] = value.split('-')
      const year = parseNumeric(minYear)
      if (year !== null) values.releaseYear = year
      continue
    }

    if (category.includes('active')) {
      values.isActive = value === 'true' || value === '1'
    }
  }

  values.genre = Array.from(new Set(values.genre))
  values.platform = Array.from(new Set(values.platform))
  values.description = JSON.stringify({ selectedFilters })

  return values
}
