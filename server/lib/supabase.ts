import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables in this module
dotenv.config()

let supabaseServer: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseServer) {
    console.log('[Supabase] Environment check:');
    console.log('[Supabase] SUPABASE_URL:', process.env.SUPABASE_URL);
    console.log('[Supabase] VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
    console.log('[Supabase] SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY?.substring(0, 20) + '...');
    console.log('[Supabase] VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
    
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl) {
      console.error('[Supabase] No URL found in environment variables');
      throw new Error('Supabase URL is required. Please check your environment variables.')
    }
    
    console.log('[Supabase] Creating client with URL:', supabaseUrl);
    supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    console.log('[Supabase] Client created successfully');
  }
  return supabaseServer
}

export { getSupabaseClient as supabaseServer }
