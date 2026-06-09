import axios from 'axios'

import { removeStoredUser } from '@/utils/userStorage'

import { API_URL } from './constants'

axios.defaults.baseURL = API_URL

// CRUCIAL : Permet d'envoyer et recevoir les cookies du backend
axios.defaults.withCredentials = true

axios.interceptors.request.use(
  (config: any) => {
    // Si c'est FormData, ne pas définir Content-Type (le navigateur le fera automatiquement)
    if (config.data instanceof FormData) {
      // Ne rien faire - laisser le navigateur gérer multipart/form-data
    }
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

axios.interceptors.response.use(
  (response: any) => {
    return response
  },
  (error: any) => {
    // Si le cookie est expiré ou invalide, le back renvoie 401
    if (error.response && error.response.status === 401) {
      // On nettoie le localStorage (qui contient juste les infos user, pas le token)
      removeStoredUser()

      // Redirection vers login sauf si on y est déjà
      if (window.location.pathname !== '/' && window.location.pathname !== '/register') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default axios
