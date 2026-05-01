// Migration: Add streak shield/repair columns to players table
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://haplefcvliixfdftqiyt.supabase.co',
  process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhcGxlZmN2bGlpeGZkZnRxaXl0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzQ5MDMwNCwiZXhwIjoyMDkzMDY2MzA0fQ.1rOkXRZxzuUU_zUe3FwKSuVqX1kmsGcE7aRaBX4RJdI'
);

async function migrate() {
  // Test if columns already exist by trying to select them
  const { error: testErr } = await supabase
    .from('players')
    .select('streak_shields, streak_before_break, streak_broken_at')
    .limit(1);

  if (!testErr) {
    console.log('✅ All columns already exist! No migration needed.');
    return;
  }

  console.log('Columns missing, checking which ones...');

  // Try each column individually
  const columns = [
    { name: 'streak_shields', type: 'INTEGER', default: '0' },
    { name: 'streak_before_break', type: 'INTEGER', default: '0' },
    { name: 'streak_broken_at', type: 'TIMESTAMPTZ', default: 'NULL' },
  ];

  for (const col of columns) {
    const { error } = await supabase.from('players').select(col.name).limit(1);
    if (error && error.message.includes('does not exist')) {
      console.log(`❌ Column "${col.name}" missing — needs manual creation via Supabase Dashboard SQL Editor`);
    } else if (error) {
      console.log(`⚠️ Column "${col.name}" check error: ${error.message}`);
    } else {
      console.log(`✅ Column "${col.name}" exists`);
    }
  }

  console.log('\n📋 Run this SQL in Supabase Dashboard > SQL Editor:\n');
  console.log(`ALTER TABLE players ADD COLUMN IF NOT EXISTS streak_shields INTEGER DEFAULT 0;`);
  console.log(`ALTER TABLE players ADD COLUMN IF NOT EXISTS streak_before_break INTEGER DEFAULT 0;`);
  console.log(`ALTER TABLE players ADD COLUMN IF NOT EXISTS streak_broken_at TIMESTAMPTZ DEFAULT NULL;`);
}

migrate().catch(console.error);
