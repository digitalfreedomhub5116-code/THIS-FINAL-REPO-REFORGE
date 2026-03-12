/**
 * db-push.cjs
 * Applies SQL schema files to the connected Supabase PostgreSQL database
 * and reloads the PostgREST schema cache.
 *
 * Usage:
 *   npm run db:push                          # apply default schema
 *   npm run db:push -- --file=my_schema.sql  # apply a specific file
 *   npm run db:reload-cache                  # just reload PostgREST cache
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env
try { require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); } catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const args = process.argv.slice(2);
const reloadOnly = args.includes('--reload-only');

async function run() {
  const client = await pool.connect();
  try {
    if (!reloadOnly) {
      // Determine which SQL file to run
      const fileArg = args.find(a => a.startsWith('--file='));
      const sqlFile = fileArg
        ? path.resolve(process.cwd(), fileArg.split('=')[1])
        : path.resolve(__dirname, '..', 'supabase_database_schema.sql');

      if (!fs.existsSync(sqlFile)) {
        console.error(`❌ SQL file not found: ${sqlFile}`);
        process.exit(1);
      }

      console.log(`📄 Applying SQL from: ${path.basename(sqlFile)}`);
      const sql = fs.readFileSync(sqlFile, 'utf-8');

      // Split on semicolons and run each statement
      const statements = sql
        .split(/;\s*$/m)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      let success = 0;
      let failed = 0;
      for (const stmt of statements) {
        try {
          await client.query(stmt);
          success++;
        } catch (err) {
          // Skip harmless errors (already exists, etc.)
          const msg = err.message || '';
          if (msg.includes('already exists') || msg.includes('does not exist') || msg.includes('duplicate key')) {
            console.log(`  ⏭️  Skipped (already exists): ${stmt.substring(0, 60)}...`);
          } else {
            console.error(`  ❌ Failed: ${stmt.substring(0, 80)}...`);
            console.error(`     Error: ${msg}`);
            failed++;
          }
        }
      }
      console.log(`✅ Schema applied: ${success} statements succeeded, ${failed} failed`);
    }

    // Reload PostgREST schema cache
    console.log('🔄 Reloading PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('✅ PostgREST schema cache reloaded!');

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
