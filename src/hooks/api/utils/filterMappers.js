

export const mapApiFilterToLocal = (filter) => {
  let parsedDescription = null;
  if (filter?.description) {
    try {
      parsedDescription = JSON.parse(filter.description);
    } catch (error) {
      parsedDescription = null;
    }
  }

  if (parsedDescription?.selectedFilters) {
    return {
      id: filter._id || filter.id,
      name: filter.name,
      description: filter.description || "",
      filters: parsedDescription.selectedFilters,
      isActive: Boolean(filter.isActive),
      createdAt: filter.createdAt,
      updatedAt: filter.updatedAt,
    };
  }

  const selectedFilters = [];

  if (Array.isArray(filter.genre) && filter.genre.length > 0) {
    selectedFilters.push(`Genre: ${filter.genre.join("|")}`);
  }

  if (Array.isArray(filter.platform) && filter.platform.length > 0) {
    selectedFilters.push(`Plateforme: ${filter.platform.join("|")}`);
  }

  if (filter.minRating !== null && filter.minRating !== undefined) {
    const maxRating = filter.maxRating ?? 5;
    selectedFilters.push(`Note: ${filter.minRating}-${maxRating}`);
  }

  if (filter.releaseYear !== null && filter.releaseYear !== undefined) {
    selectedFilters.push(`Année: ${filter.releaseYear}-${filter.releaseYear}`);
  }

  return {
    id: filter._id || filter.id,
    name: filter.name,
    description: filter.description || "",
    filters: selectedFilters,
    isActive: Boolean(filter.isActive),
    createdAt: filter.createdAt,
    updatedAt: filter.updatedAt,
  };
};
