/**
 * Fix remaining tables that failed in migration v2
 * Strips auto-generated/identity columns that can't be inserted
 */
import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://xdhajxmvmrtajoffzmkm.supabase.co';
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaGFqeG12bXJ0YWpvZmZ6bWttIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzEzMjczNiwiZXhwIjoyMDg4NzA4NzM2fQ.uoD1e4J3Nx5i1Yrlb6mnMiaTYWbolVw8tlW1G4Htw1w';
const NEW_URL = 'https://haplefcvliixfdftqiyt.supabase.co';
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcGxlZmN2bGlpeGZkZnRxaXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5MDMwNCwiZXhwIjoyMDkzMDY2MzA0fQ.1rOkXRZxzuUU_zUe3FwKSuVqX1kmsGcE7aRaBX4RJdI';

const oldDb = createClient(OLD_URL, OLD_KEY);
const newDb = createClient(NEW_URL, NEW_KEY);

async function fetchAll(client, table) {
  const rows = [];
  let offset = 0;
  while (true) {
    const { data, error } = await client.from(table).select('*').range(offset, offset + 999);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < 1000) break;
    offset += 1000;
  }
  return rows;
}

// Table-specific column strippers
const FIXES = {
  goals: {
    strip: ['current_milestone', 'current_progress'],
    columns: ['id', 'user_id', 'title', 'category', 'description', 'target_date', 
              'duration_days', 'daily_minutes', 'status', 'progress', 'milestones',
              'daily_tasks', 'plan', 'xp_reward', 'created_at', 'updated_at'],
  },
  user_custom_plans: {
    strip: ['id'], // Old uses integer, new uses uuid
    columns: ['user_id', 'name', 'days', 'plan_type', 'created_at'],
  },
  admin_audit_log: {
    strip: ['id'], // Identity column - ALWAYS generated
    columns: ['admin_id', 'action', 'target_user', 'old_value', 'new_value', 'ip_address', 'created_at'],
  },
  player_reports: {
    strip: ['id'], // Serial column
    columns: ['reporter_user_id', 'reporter_name', 'reported_user_id', 'reported_name',
              'reported_level', 'reported_rank', 'reported_xp', 'reported_gold',
              'reported_keys', 'reported_outfit_id', 'reported_unlocked_outfits',
              'reasons', 'status', 'created_at'],
  },
  integrity_pool: {
    strip: [], // Already migrated system_pacts, so FKs should be fine
    columns: ['id', 'user_id', 'pact_id', 'amount', 'week_start', 'created_at'],
  },
  api_usage_logs: {
    strip: [],
    columns: ['id', 'user_id', 'endpoint', 'method', 'status_code', 'response_time',
              'created_at', 'route', 'model', 'input_tokens', 'output_tokens', 'cost_usd', 'success'],
  }
};

async function fixTable(table) {
  const fix = FIXES[table];
  console.log(`\n📦 Fixing: ${table}`);
  
  const rows = await fetchAll(oldDb, table);
  if (rows.length === 0) { console.log(`  ⏭️  0 rows`); return; }
  console.log(`  📖 ${rows.length} rows from source`);
  
  // Filter to only allowed columns
  const cleaned = rows.map(row => {
    const clean = {};
    for (const col of fix.columns) {
      if (col in row) clean[col] = row[col];
    }
    return clean;
  });
  
  // Clear existing in new DB
  try {
    await newDb.from(table).delete().gte('created_at', '1970-01-01');
  } catch (e) {}
  
  // Insert in batches
  let inserted = 0, errors = 0;
  const BATCH = 100;
  
  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch = cleaned.slice(i, i + BATCH);
    const { error } = await newDb.from(table).insert(batch);
    if (error) {
      console.log(`  ⚠️  Batch error: ${error.message.substring(0, 100)}`);
      // Row by row
      for (const row of batch) {
        const { error: re } = await newDb.from(table).insert(row);
        if (re) { errors++; } else { inserted++; }
      }
    } else {
      inserted += batch.length;
    }
    if (cleaned.length > BATCH) process.stdout.write(`.`);
  }
  
  if (cleaned.length > BATCH) console.log('');
  console.log(`  ✅ ${inserted} migrated${errors > 0 ? `, ${errors} errors` : ''}`);
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  MIGRATION FIX — Remaining Tables');
  console.log('═══════════════════════════════════════');
  
  for (const table of Object.keys(FIXES)) {
    await fixTable(table);
  }
  
  // Final verification
  console.log('\n═══════════════════════════════════════');
  console.log('  FINAL VERIFICATION');
  console.log('═══════════════════════════════════════');
  
  const tables = ['players', 'store_outfits', 'workout_exercises', 'workout_plans',
    'workouts', 'global_config', 'leaderboard_cache', 'daily_rank_snapshots',
    'system_pacts', 'goals', 'user_custom_plans', 'admin_audit_log',
    'player_reports', 'integrity_pool', 'api_usage_logs'];
  
  for (const t of tables) {
    const { count } = await newDb.from(t).select('*', { count: 'exact', head: true });
    console.log(`  ${t.padEnd(25)} ${String(count ?? 0).padStart(5)} rows`);
  }
}

main().catch(console.error);
