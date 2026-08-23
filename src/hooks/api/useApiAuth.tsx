import { useCallback } from 'react'

import { supabase } from '@/lib/supabase'

export const useApiAuth = () => {
  // ── Inscription ──────────────────────────────────────────────────────
  const register = async (userData: {
    email: string
    password: string
    firstname: string
    lastname: string
    username: string
  }) => {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          firstname: userData.firstname,
          lastname: userData.lastname,
          username: userData.username,
        },
      },
    })
    if (error) throw error
    return data
  }

  // ── Connexion ────────────────────────────────────────────────────────
  const login = async (credentials: { email: string; password: string }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })
    if (error) throw error
    return data
  }

  // ── Déconnexion ──────────────────────────────────────────────────────
  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  // ── Utilisateur courant (session) ─────────────────────────────────────
  const getMe = async () => {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  // ── Mise à jour du profil (avec ou sans image) ────────────────────────
  const updateProfile = async (_userId: string, formData: FormData) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    const updates: Record<string, any> = {}
    if (formData.has('firstname')) updates.firstname = formData.get('firstname')
    if (formData.has('lastname')) updates.lastname = formData.get('lastname')
    if (formData.has('username')) updates.username = formData.get('username')

    // Mise à jour de l'email dans l'Auth Supabase (enverra un email de confirmation)
    if (formData.has('email')) {
      const newEmail = formData.get('email') as string
      if (newEmail !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email: newEmail })
        if (emailError) throw emailError
      }
    }

    // Mise à jour du mot de passe dans l'Auth Supabase
    if (formData.has('password')) {
      const newPassword = formData.get('password') as string
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword })
        if (passwordError) throw passwordError
      }
    }

    // Upload de l'image si présente
    const imageFile = formData.get('image') as File | null
    if (imageFile && imageFile.size > 0) {
      const ext = imageFile.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(filePath, imageFile, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('game-images').getPublicUrl(filePath)
      updates.image = urlData.publicUrl
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    return data
  }

  // ── Suppression du compte ─────────────────────────────────────────────
  // Appelle la Vercel Serverless Function qui utilise le service_role
  const deleteAccount = async (userId: string) => {
    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Erreur lors de la suppression du compte')
    }

    return await response.json()
  }

  // ── Historique de navigation ──────────────────────────────────────────
  const addGameToHistory = useCallback(async (gameId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('recently_viewed')
      .upsert(
        { user_id: user.id, game_id: gameId, viewed_at: new Date().toISOString() },
        { onConflict: 'user_id,game_id' }
      )
  }, [])

  const getGameHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('*, game:games(id, name, image, genre:genres(genre_name))')
      .order('viewed_at', { ascending: false })
      .limit(20)
    if (error) throw error
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
