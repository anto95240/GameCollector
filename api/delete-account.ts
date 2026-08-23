import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const { userId } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' })
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase configuration variables (Service Role Key required)')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  try {
    // Création d'un client admin (Service Role) pour contourner les RLS et supprimer l'utilisateur
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      throw error
    }

    return res.status(200).json({ success: true, message: 'Compte supprimé avec succès' })
  } catch (error: any) {
    console.error('Erreur lors de la suppression du compte:', error)
    return res.status(500).json({ success: false, error: error.message || 'Erreur interne' })
  }
}
