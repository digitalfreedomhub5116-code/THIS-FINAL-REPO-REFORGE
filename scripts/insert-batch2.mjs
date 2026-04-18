/**
 * insert-batch2.mjs
 * Inserts new exercises from new-exercises.json into the Supabase DB.
 * Sets local video paths for exercises with videos in exercises-batch2/
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function main() {
  console.log('═══ Insert Batch 2 Exercises into Supabase ═══\n');

  // Load exercises
  const exercises = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'new-exercises.json'), 'utf8')
  );

  // Check which compressed videos exist
  const batch2Dir = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises-batch2');
  const videoFiles = new Set(
    fs.existsSync(batch2Dir)
      ? fs.readdirSync(batch2Dir).filter(f => f.endsWith('.mp4'))
      : []
  );

  console.log(`  Exercises to insert: ${exercises.length}`);
  console.log(`  Videos available:    ${videoFiles.size}\n`);

  // Check for existing exercise names to avoid duplicates
  const { data: existing } = await supabase
    .from('workout_exercises')
    .select('name');
  const existingNames = new Set((existing || []).map(e => e.name.toLowerCase()));

  // Get current max display_order
  const { data: maxOrder } = await supabase
    .from('workout_exercises')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1);
  let displayOrder = (maxOrder?.[0]?.display_order || 0) + 10;

  let inserted = 0;
  let skipped = 0;

  for (const ex of exercises) {
    // Skip if already exists
    if (existingNames.has(ex.name.toLowerCase())) {
      console.log(`  ⏭ ${ex.name} — already exists`);
      skipped++;
      continue;
    }

    // Determine video URL
    const videoFileName = safeName(ex.name) + '.mp4';
    let videoUrl = null;
    if (!ex.is_sport && videoFiles.has(videoFileName)) {
      videoUrl = `/assets/videos/exercises-batch2/${videoFileName}`;
    }

    const row = {
      name: ex.name,
      type: ex.type === 'SPORT' ? 'CARDIO' : ex.type,  // DB doesn't have SPORT type, map to CARDIO
      muscle_group: ex.muscle_group,
      equipment: ex.equipment,
      default_sets: ex.default_sets,
      default_reps: ex.default_reps,
      video_url: videoUrl,
      notes: ex.is_sport ? 'Sport / Activity' : '',
      is_active: true,
      display_order: displayOrder,
    };

    const { error } = await supabase
      .from('workout_exercises')
      .insert(row);

    if (error) {
      console.error(`  ✗ ${ex.name}: ${error.message}`);
    } else {
      const videoStatus = videoUrl ? '🎥' : (ex.is_sport ? '⚽' : '❌');
      console.log(`  ✓ ${ex.name} ${videoStatus} [${row.type}/${row.muscle_group}]`);
      inserted++;
      displayOrder += 10;
    }
  }

  console.log(`\n═══ DONE ═══`);
  console.log(`  Inserted: ${inserted}`);
  console.log(`  Skipped:  ${skipped}`);

  // Verify total count
  const { count } = await supabase
    .from('workout_exercises')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  console.log(`  Total active exercises in DB: ${count}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
