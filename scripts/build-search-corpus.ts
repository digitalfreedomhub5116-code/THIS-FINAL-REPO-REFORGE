/**
 * scripts/build-search-corpus.ts
 *
 * Builds the JSONL corpus for the Vertex AI Search data store (`reforge-search`).
 *
 * Sources:
 *   1. Foods   ← lib/foodDatabase.ts (static TS, ~hundreds of entries)
 *   2. Skills  ← lib/skillsDatabase.ts (static TS — flattens skill levels into
 *               one document per skill so search hits the skill directly)
 *   3. Exercises ← Supabase `admin_exercises` table (live data, may grow)
 *
 * Output: scripts/corpus.jsonl  (one JSON object per line, ready for GCS upload)
 *
 * Each document has:
 *   {
 *     id: string,            // stable, prefixed by type (food-, skill-, exercise-)
 *     structData: {
 *       type, name, category, description, ...type-specific fields
 *     }
 *   }
 *
 * Run with:
 *   npx tsx scripts/build-search-corpus.ts
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// ── Local imports (TS, read directly thanks to tsx) ──
import { FOOD_DATABASE } from '../lib/foodDatabase';
import { SKILLS_DATABASE } from '../lib/skillsDatabase';

// ── Output config ──
const OUT_PATH = path.join(process.cwd(), 'scripts', 'corpus.jsonl');

// ── Supabase config ──
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

// ── Helpers ──
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

interface CorpusDoc {
  id: string;
  structData: Record<string, unknown>;
}

function writeJsonl(docs: CorpusDoc[]): void {
  const lines = docs.map((d) => JSON.stringify(d));
  fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');
}

// ── Build food docs ──
function buildFoodDocs(): CorpusDoc[] {
  return FOOD_DATABASE.map((item) => ({
    id: `food-${slug(item.name) || item.id}`,
    structData: {
      type: 'food',
      name: item.name,
      category: item.category,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fats: item.fats,
      fiber: item.fiber,
      servingSize: item.servingSize,
      isVeg: item.isVeg,
      // Synthetic search-friendly description so semantic queries
      // (e.g. "high protein vegetarian") can match.
      description:
        `${item.name} — ${item.category.toLowerCase().replace(/_/g, ' ')}. ` +
        `${item.calories} kcal, ${item.protein}g protein, ${item.carbs}g carbs, ${item.fats}g fats per ${item.servingSize}. ` +
        `${item.isVeg ? 'Vegetarian.' : 'Non-vegetarian.'}`,
    },
  }));
}

// ── Build skill docs ──
// One document per Skill (not per lesson) — the skill is the user-meaningful unit.
function buildSkillDocs(): CorpusDoc[] {
  return SKILLS_DATABASE.map((skill) => {
    const lessonTitles = skill.levels
      .flatMap((lvl) => lvl.lessons.map((l) => l.title))
      .slice(0, 8); // cap at 8 to keep description concise
    return {
      id: `skill-${slug(skill.name) || skill.id}`,
      structData: {
        type: 'skill',
        name: skill.name,
        category: skill.category,
        icon: skill.icon,
        levelCount: skill.levels.length,
        lessonCount: skill.levels.reduce((sum, lvl) => sum + lvl.lessons.length, 0),
        description:
          `${skill.name} — ${skill.description}. ` +
          (lessonTitles.length > 0 ? `Lessons include: ${lessonTitles.join(', ')}.` : ''),
      },
    };
  });
}

// ── Build exercise docs from Supabase ──
async function buildExerciseDocs(): Promise<CorpusDoc[]> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.warn(
      '[corpus] VITE_SUPABASE_URL or SUPABASE_SERVICE_KEY missing — skipping exercises.',
    );
    return [];
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  // Production table is `workout_exercises`. Columns observed in admin code:
  //   id, name, type, muscle_group, equipment, video_url, notes, default_reps, default_sets
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('id, name, type, muscle_group, equipment, default_reps, default_sets, notes');
  if (error) {
    console.error('[corpus] Supabase error:', error.message);
    return [];
  }
  if (!data || data.length === 0) {
    console.warn('[corpus] No rows returned from workout_exercises.');
    return [];
  }
  return data.map((row: any) => ({
    id: `exercise-${slug(row.name) || row.id}`,
    structData: {
      type: 'exercise',
      name: row.name,
      exerciseType: row.type ?? null,        // COMPOUND / ACCESSORY / CARDIO / STRETCH
      muscleGroup: row.muscle_group ?? null, // chest / back / legs / etc.
      equipment: row.equipment ?? null,      // BODYWEIGHT / DUMBBELLS / GYM / ANY
      defaultReps: row.default_reps ?? null,
      defaultSets: row.default_sets ?? null,
      description:
        `${row.name} — ` +
        (row.muscle_group ? `${row.muscle_group} ` : '') +
        (row.type ? `${String(row.type).toLowerCase()} ` : '') +
        `exercise. ` +
        (row.equipment ? `Equipment: ${row.equipment}. ` : '') +
        (row.notes ? String(row.notes).slice(0, 200) : ''),
    },
  }));
}

// ── Main ──
async function main() {
  console.log('Building Vertex AI Search corpus...\n');

  const foodDocs = buildFoodDocs();
  console.log(`  • Foods:     ${foodDocs.length} documents`);

  const skillDocs = buildSkillDocs();
  console.log(`  • Skills:    ${skillDocs.length} documents`);

  console.log(`  • Exercises: fetching from Supabase...`);
  const exerciseDocs = await buildExerciseDocs();
  console.log(`  • Exercises: ${exerciseDocs.length} documents`);

  // De-duplicate IDs (same slug from two sources would clash). Last wins.
  const all = new Map<string, CorpusDoc>();
  for (const doc of [...foodDocs, ...skillDocs, ...exerciseDocs]) {
    if (all.has(doc.id)) {
      console.warn(`[corpus] duplicate id ${doc.id} — overwriting`);
    }
    all.set(doc.id, doc);
  }

  const out = Array.from(all.values());
  writeJsonl(out);

  const sizeKB = Math.round(fs.statSync(OUT_PATH).size / 1024);
  console.log(`\n✅ Wrote ${out.length} documents to ${OUT_PATH} (${sizeKB} KB)\n`);
  console.log('Next steps:');
  console.log('  1. Upload to Cloud Storage:');
  console.log(`     gsutil cp scripts/corpus.jsonl gs://<your-bucket>/corpus.jsonl`);
  console.log('  2. In AI Applications console, open data store reforge-search → Documents → Import documents.');
  console.log('  3. Pick "Replace existing documents" so the test rows are cleared.');
  console.log('  4. Wait ~10–20 min for indexing, then re-run scripts/test-search.mjs to verify.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
