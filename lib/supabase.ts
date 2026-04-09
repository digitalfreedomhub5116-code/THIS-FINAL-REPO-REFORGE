import { createClient } from '@supabase/supabase-js'

const runtimeConfig = (typeof window !== 'undefined' && (window as any).__REFORGE_CONFIG__) || {};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || runtimeConfig.supabaseUrl || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || runtimeConfig.supabaseAnonKey || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
