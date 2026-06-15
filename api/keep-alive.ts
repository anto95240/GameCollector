import { createClient } from '@supabase/supabase-js';

// Vercel Serverless Function
export default async function handler(req: any, res: any) {
  try {
    // On utilise les variables d'environnement VITE_ ou standards (selon la config Vercel)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase configuration variables' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Ping Supabase pour maintenir la connexion active.
    // L'utilisation d'un simple select sur la table 'games' avec limit(1) est suffisant
    // pour "réveiller" l'instance sans nécessiter de clé Admin / Service Role.
    const { error } = await supabase.from('games').select('id').limit(1);
    
    if (error) {
      throw new Error(`Supabase error: ${error.message || JSON.stringify(error)}`);
    }

    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Keep-alive successful`);
    
    return res.status(200).json({
      success: true,
      message: "Ping Supabase réussi",
      timestamp
    });
  } catch (error: any) {
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    console.error(`[${timestamp}] Keep-alive error:`, errorMessage);
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      timestamp
    });
  }
}
