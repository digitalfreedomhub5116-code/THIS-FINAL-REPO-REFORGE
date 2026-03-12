import { supabaseServer } from './server/lib/supabase.js';

async function testSupabase() {
  try {
    console.log('[Test] Testing Supabase connection...');
    const client = supabaseServer();
    console.log('[Test] Client created:', !!client);
    
    // Test simple query
    const { data, error } = await client
      .from('players')
      .select('count')
      .single();
    
    console.log('[Test] Query result:', { data, error });
    
    if (error) {
      console.error('[Test] Supabase error:', error);
    } else {
      console.log('[Test] Supabase connection successful!');
    }
  } catch (err) {
    console.error('[Test] Supabase test failed:', err);
  }
}

testSupabase();
