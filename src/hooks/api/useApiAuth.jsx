import { useCallback } from 'react'

import axios from '@/config/interceptor' // On utilise l'instance configurée
import { removeStoredUser } from '@/utils/userStorage'

export const useApiAuth = () => {
  const login = async (credentials) => {
    const { data } = await axios.post('/api/user/login', credentials)
    return data
  }

  const register = async (userData) => {
    const { data } = await axios.post('/api/user/sign-up', userData)
    return data
  }

  const logout = async () => {
    try {
      await axios.post('/api/user/logout')
    } catch (error) {
      console.error('Erreur lors du logout', error)
    } finally {
      removeStoredUser()
      sessionStorage.clear()
      window.location.href = '/'
    }
  }

  const getMe = useCallback(async () => {
    const { data } = await axios.get('/api/user/me')
    return data
  }, [])

  const updateProfile = async (userId, formData) => {
    const { data } = await axios.put(`/api/user/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  }

  const deleteAccount = async (userId) => {
    const { data } = await axios.delete(`/api/user/${userId}`)
    return data
  }

  const addGameToHistory = async (gameId) => {
    const { data } = await axios.put(`/api/user/history/${gameId}`)
    return data
  }

  const getGameHistory = useCallback(async () => {
    const { data } = await axios.get('/api/user/history')
    return data
  }, [])

  return {
    login,
    register,
    logout,
    getMe,
    updateProfile,
    deleteAccount,
    addGameToHistory,
    getGameHistory,
  }
}
