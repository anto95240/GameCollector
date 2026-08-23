/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'

// Vercel Serverless Function
export default async function handler(req: any, res: any) {
  try {
    // Vérification de sécurité CRON_SECRET
    const authHeader = req.headers.authorization
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

    // Optionnel : si vous voulez le tester depuis le navigateur, on peut l'ignorer en dev, mais en prod on bloque.
    if (
      process.env.CRON_SECRET &&
      authHeader !== expectedAuth &&
      req.query.secret !== process.env.CRON_SECRET
    ) {
      console.warn('Unauthorized attempt to trigger keep-alive')
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing env vars:', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        availableEnvKeys: Object.keys(process.env).filter(
          (k) => k.includes('SUPABASE') || k.includes('VITE')
        ),
      })
      return res.status(500).json({ error: 'Missing Supabase configuration variables' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Ping Supabase pour maintenir la connexion active.
    const { data, error } = await supabase.from('games').select('id').limit(1)

    if (error) {
      throw new Error(`Supabase query error: ${error.message || JSON.stringify(error)}`)
    }

    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] Keep-alive successful - rows returned: ${data?.length ?? 0}`)

    return res.status(200).json({
      success: true,
      message: 'Ping Supabase réussi',
      rowsReturned: data?.length ?? 0,
      timestamp,
    })
  } catch (error: any) {
    const timestamp = new Date().toISOString()
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error(`[${timestamp}] Keep-alive error:`, errorMessage)

    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp,
    })
  }
}
