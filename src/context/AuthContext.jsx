// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'

import { useApiAuth } from '@/hooks/api/useApiAuth'
import { readStoredUser, removeStoredUser, writeStoredUser } from '@/utils/userStorage'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const { getMe } = useApiAuth()

  const [user, setUser] = useState(() => {
    return readStoredUser()
  })

  const updateUser = (newUser) => {
    setUser(newUser)
    if (newUser) {
      writeStoredUser(newUser)
    } else {
      removeStoredUser()
    }
  }

  useEffect(() => {
    const checkUser = async () => {
      try {
        // Vérifier seulement si on a un utilisateur en localStorage
        const saved = readStoredUser()
        if (!saved) {
          return
        }

        // On vérifie avec le backend
        const freshUser = await getMe()
        if (freshUser) {
          updateUser(freshUser)
        }
      } catch (error) {}
    }

    checkUser()
  }, []) // S'exécute une fois au montage de l'app

  return <AuthContext.Provider value={{ user, updateUser }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider")
  }
  return context
}
