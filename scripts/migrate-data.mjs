/**
 * Data Migration Script v2: Old Supabase → New Pro Supabase
 * Only copies columns that exist in the target schema.
 */
import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://xdhajxmvmrtajoffzmkm.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaGFqeG12bXJ0YWpvZmZ6bWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMjczNiwiZXhwIjoyMDg4NzA4NzM2fQ.uoD1e4J3Nx5i1Yrlb6mnMiaTYWbolVw8tlW1G4Htw1w';

const NEW_URL = 'https://haplefcvliixfdftqiyt.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcGxlZmN2bGlpeGZkZnRxaXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5MDMwNCwiZXhwIjoyMDkzMDY2MzA0fQ.1rOkXRZxzuUU_zUe3FwKSuVqX1kmsGcE7aRaBX4RJdI';

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

// ── Column mapping: only columns that exist in NEW schema ──
// If old column name differs, map it. Otherwise just list the columns to keep.
const TABLE_COLUMNS = {
  players: [
    'id', 'supabase_id', 'username', 'name', 'email', 'level', 'total_xp', 'rank',
    'gold', 'keys', 'streak', 'avatar_url', 'original_selfie_url', 'cheat_strikes',
    'is_banned', 'country', 'timezone', 'raw_data', 'created_at', 'updated_at',
    'total_strikes_ever', 'pending_notifications', 'password_hash', 'auth_type',
    'current_xp', 'required_xp', 'daily_xp', 'hp', 'max_hp', 'mp', 'max_mp',
    'is_configured', 'is_penalty_active', 'tutorial_step', 'tutorial_complete',
    'daily_quest_complete'
  ],
  store_outfits: [
    'outfit_key', 'name', 'description', 'tier', 'cost', 'accent_color',
    'image_url', 'intro_video_url', 'loop_video_url', 'attack', 'boost',
    'extraction', 'ultimate', 'is_default', 'display_order', 'created_at'
    // 'id' excluded — new DB uses uuid, old uses integer
  ],
  workout_exercises: [
    'name', 'type', 'muscle_group', 'default_sets', 'default_reps',
    'video_url', 'notes', 'is_active', 'display_order', 'created_at'
    // 'equipment' excluded — old uses text, new uses text[] array
    // 'id' excluded — let new DB generate UUIDs
  ],
  workout_plans: null, // Copy all matching
  workouts: null,
  global_config: null,
  global_videos: null,
  event_banners: null,
  leaderboard_cache: null,
  daily_rank_snapshots: null,
  system_pacts: null,
  integrity_pool: null,
  user_custom_plans: null,
  admin_audit_log: null,
  admin_failed_logins: null,
  player_reports: null,
  audit_logs: null,
  api_usage_logs: null,
  goals: null,
  user_outfits: null,
  workout_sessions: null,
};

// Tables with non-uuid primary keys that need special handling
const TABLES_NO_UUID_PK = ['store_outfits', 'workout_exercises', 'workout_plans', 'event_banners', 'admin_audit_log', 'leaderboard_cache', 'global_config', 'global_videos', 'admin_failed_logins'];

const BATCH_SIZE = 200;

// Migration order (respecting FK constraints)
const MIGRATION_ORDER = [
  // Phase 1: No FK dependencies
  'players', 'store_outfits', 'workout_exercises', 'workout_plans',
  'global_config', 'global_videos', 'event_banners', 'admin_failed_logins',
  'leaderboard_cache', 'workouts', 'goals',
  // Phase 2: FK to players/store_outfits
  'user_outfits', 'workout_sessions', 'daily_rank_snapshots',
  'system_pacts', 'user_custom_plans', 'admin_audit_log',
  'player_reports', 'audit_logs',
  // Phase 3: FK to system_pacts
  'integrity_pool',
  // Phase 4: Large logs (last — non-critical)
  'api_usage_logs',
];

async function getNewTableColumns(table) {
  // Fetch one row from new DB to get column names, or use empty insert to discover
  const { data, error } = await newDb.from(table).select('*').limit(0);
  // Can't get columns from empty select, use a different approach
  // Just return null and we'll filter on insert errors
  return null;
}

async function fetchAllRows(client, table) {
  const allRows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.from(table).select('*').range(offset, offset + 999);
    if (error) { console.error(`  ❌ Fetch error: ${error.message}`); return null; }
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return allRows;
}

function filterColumns(rows, allowedColumns) {
  if (!allowedColumns) return rows;
  return rows.map(row => {
    const filtered = {};
    for (const col of allowedColumns) {
      if (col in row) filtered[col] = row[col];
    }
    return filtered;
  });
}

async function clearTable(table) {
  // Try various delete strategies
  const strategies = [
    () => newDb.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    () => newDb.from(table).delete().gte('created_at', '1970-01-01'),
    () => newDb.from(table).delete().neq('key', '___nonexistent___'),
    () => newDb.from(table).delete().neq('sid', '___nonexistent___'),
    () => newDb.from(table).delete().neq('ip_address', '___nonexistent___'),
    () => newDb.from(table).delete().neq('username', '___nonexistent___'),
  ];
  for (const strategy of strategies) {
    const { error } = await strategy();
    if (!error) return true;
  }
  return false;
}

async function migrateTable(table) {
  console.log(`\n📦 ${table}`);
  
  const rows = await fetchAllRows(oldDb, table);
  if (!rows) return { table, status: 'error', count: 0, errors: 0 };
  if (rows.length === 0) { console.log(`  ⏭️  0 rows`); return { table, status: 'empty', count: 0, errors: 0 }; }
  
  console.log(`  📖 ${rows.length} rows from source`);
  
  // Filter to allowed columns
  const allowedCols = TABLE_COLUMNS[table];
  const filtered = filterColumns(rows, allowedCols);
  
  // Clear existing
  await clearTable(table);
  
  let inserted = 0, errors = 0;
  
  for (let i = 0; i < filtered.length; i += BATCH_SIZE) {
    const batch = filtered.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(filtered.length / BATCH_SIZE);
    
    // Try upsert first
    const { data, error } = await newDb.from(table).upsert(batch, { ignoreDuplicates: true }).select('*');
    
    if (error) {
      // Try insert
      const { data: d2, error: e2 } = await newDb.from(table).insert(batch).select('*');
      if (e2) {
        console.log(`  ⚠️  Batch ${batchNum}/${totalBatches}: ${e2.message.substring(0, 80)}`);
        // Row by row fallback
        for (const row of batch) {
          const { error: re } = await newDb.from(table).upsert(row, { ignoreDuplicates: true });
          if (re) {
            const { error: re2 } = await newDb.from(table).insert(row);
            if (re2) { errors++; } else { inserted++; }
          } else { inserted++; }
        }
      } else {
        inserted += d2?.length || batch.length;
        if (totalBatches > 1) process.stdout.write(`  ✓ ${batchNum}/${totalBatches} `);
      }
    } else {
      inserted += data?.length || batch.length;
      if (totalBatches > 1) process.stdout.write(`  ✓ ${batchNum}/${totalBatches} `);
    }
  }
  
  if (filtered.length > BATCH_SIZE) console.log('');
  console.log(`  ✅ ${inserted} migrated${errors > 0 ? `, ${errors} errors` : ''}`);
  return { table, status: 'done', count: inserted, errors };
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  REFORGE DATA MIGRATION v2');
  console.log('═══════════════════════════════════════');
  
  const results = [];
  for (const table of MIGRATION_ORDER) {
    results.push(await migrateTable(table));
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('  SUMMARY');
  console.log('═══════════════════════════════════════');
  let total = 0, totalErr = 0;
  for (const r of results) {
    const icon = r.status === 'done' ? '✅' : r.status === 'empty' ? '⏭️ ' : '❌';
    console.log(`  ${icon} ${r.table.padEnd(25)} ${String(r.count).padStart(5)} rows${r.errors ? ` (${r.errors} err)` : ''}`);
    total += r.count; totalErr += r.errors;
  }
  console.log('───────────────────────────────────────');
  console.log(`  Total: ${total} rows, ${totalErr} errors`);
}

main().catch(console.error);
