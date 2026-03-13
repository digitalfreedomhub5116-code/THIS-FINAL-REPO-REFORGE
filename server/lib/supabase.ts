import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables in this module
dotenv.config()

let supabaseServer: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseServer) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl) {
      throw new Error('Supabase URL is required. Please check your environment variables.')
    }
    
    supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('[Supabase] Client initialized');
  }
  return supabaseServer
}

export { getSupabaseClient as supabaseServer }
