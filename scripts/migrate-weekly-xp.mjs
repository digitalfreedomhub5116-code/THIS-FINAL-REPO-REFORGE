/**
 * Migration: Add weekly_xp and week_start_date columns to players table.
 * 
 * Run: node scripts/migrate-weekly-xp.mjs
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function migrate() {
  console.log('Adding weekly_xp and week_start_date columns to players table...');

  // Try to add columns via RPC (raw SQL)
  // If your Supabase doesn't support rpc('exec'), add these columns manually in the SQL editor:
  //
  //   ALTER TABLE players ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;
  //   ALTER TABLE players ADD COLUMN IF NOT EXISTS week_start_date TIMESTAMPTZ DEFAULT NOW();
  //

  // Test if columns exist by reading a player
  const { data, error } = await supabase
    .from('players')
    .select('id, weekly_xp, week_start_date')
    .limit(1);

  if (error && error.message.includes('weekly_xp')) {
    console.log('\n⚠️  Columns do not exist yet. Please run this SQL in your Supabase SQL Editor:\n');
    console.log('  ALTER TABLE players ADD COLUMN IF NOT EXISTS weekly_xp INTEGER DEFAULT 0;');
    console.log('  ALTER TABLE players ADD COLUMN IF NOT EXISTS week_start_date TIMESTAMPTZ DEFAULT NOW();');
    console.log('\nThen re-run this script to verify.');
    process.exit(1);
  }

  if (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }

  console.log('✅ Columns exist! weekly_xp and week_start_date are ready.');

  // Initialize all players' week_start_date to the current week's Monday
  const now = new Date();
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon...
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7)); // Roll back to Monday
  monday.setUTCHours(0, 0, 0, 0);

  const { error: updateErr } = await supabase
    .from('players')
    .update({ weekly_xp: 0, week_start_date: monday.toISOString() })
    .is('week_start_date', null);

  if (updateErr) {
    console.warn('Warning: Could not initialize week_start_date for existing players:', updateErr);
  } else {
    console.log(`✅ Initialized players with null week_start_date to ${monday.toISOString()}`);
  }

  console.log('\nMigration complete!');
}

migrate().catch(console.error);
