// src/hooks/api/useApiAuth.tsx
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
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  // ── Mise à jour du profil (avec ou sans image) ────────────────────────
  const updateProfile = async (_userId: string, formData: FormData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non connecté')

    const updates: Record<string, any> = {}
    if (formData.has('firstname')) updates.firstname = formData.get('firstname')
    if (formData.has('lastname'))  updates.lastname  = formData.get('lastname')
    if (formData.has('username'))  updates.username  = formData.get('username')

    // Upload de l'image si présente
    const imageFile = formData.get('image') as File | null
    if (imageFile && imageFile.size > 0) {
      const ext      = imageFile.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('game-images')
        .upload(filePath, imageFile, { upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('game-images')
        .getPublicUrl(filePath)
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
  // Note : nécessite une Edge Function Supabase ou service_role (pas faisable côté client)
  // Voir section 12 pour l'alternative
  const deleteAccount = async (_userId: string) => {
    throw new Error('La suppression de compte requiert une Supabase Edge Function.')
  }

  // ── Historique de navigation ──────────────────────────────────────────
  const addGameToHistory = async (gameId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('recently_viewed').upsert(
      { user_id: user.id, game_id: gameId, viewed_at: new Date().toISOString() },
      { onConflict: 'user_id,game_id' }
    )
  }

  const getGameHistory = async () => {
    const { data, error } = await supabase
      .from('recently_viewed')
      .select('*, game:games(id, name, image, genre:genres(genre_name))')
      .order('viewed_at', { ascending: false })
      .limit(20)
    if (error) throw error
    return data
  }

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
