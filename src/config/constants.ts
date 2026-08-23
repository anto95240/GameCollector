// Sections pour la navigation du Profil
export const PROFILE_SECTIONS = [
  { id: 'profile-section', label: 'profile.links.myProfile' },
  { id: 'login-section', label: 'profile.links.loginSection' },
  { id: 'bug-report-section', label: 'profile.bugReport.title' },
  { id: 'account-delete-section', label: 'profile.links.dangerZone' },
]

export const APP_VERSION = '3.1.1'

// Options statiques utilisées dans les formulaires (ex: AddEditGame)
export const MOCK_OPTIONS = {
  rating: [
    { value: '', labelKey: 'gameForm.fields.selectRating' },
    { value: '5', labelKey: 'gameForm.fields.stars', count: 5 },
    { value: '4', labelKey: 'gameForm.fields.stars', count: 4 },
    { value: '3', labelKey: 'gameForm.fields.stars', count: 3 },
    { value: '2', labelKey: 'gameForm.fields.stars', count: 2 },
    { value: '1', labelKey: 'gameForm.fields.star', count: 1 },
  ],
}

export const SECTIONS = [
  { id: 'desc', label: 'gameForm.sections.description' },
  { id: 'rate', label: 'gameForm.sections.rating' },
  { id: 'detail', label: 'gameForm.sections.details' },
  { id: 'img', label: 'gameForm.sections.image' },
  { id: 'status', label: 'gameForm.sections.status' },
  { id: 'tags', label: 'gameForm.sections.tags' },
]
