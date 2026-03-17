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

/**
 * Detect if a Supabase error is actually a Cloudflare HTML error page
 * (happens when Supabase is paused, down, or unreachable).
 */
function isSupabaseDown(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : error?.message || '';
  return msg.includes('<!DOCTYPE html') || msg.includes('522') || msg.includes('502') || msg.includes('Connection timed out');
}

/**
 * Ping Supabase to keep the free-tier project alive (prevents auto-pausing after 7 days).
 * Call this on a schedule (e.g. every 4 days).
 */
async function pingSupabase(): Promise<boolean> {
  try {
    const sb = getSupabaseClient() as any;
    const { error } = await sb.from('players').select('supabase_id').limit(1);
    if (error && isSupabaseDown(error)) {
      console.error('[Supabase Ping] Supabase appears to be down:', error.message?.substring(0, 100));
      return false;
    }
    console.log('[Supabase Ping] OK');
    return true;
  } catch (err: any) {
    console.error('[Supabase Ping] Failed:', err?.message?.substring(0, 100));
    return false;
  }
}

export { getSupabaseClient as supabaseServer, isSupabaseDown, pingSupabase }
