export const createSlug = (name: string) => {
  return (name || '')
    .toLowerCase()
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
}
