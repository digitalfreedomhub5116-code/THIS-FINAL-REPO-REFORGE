/**
 * Match user's exercise list against Supabase workout_exercises table
 * Uses Supabase REST API directly + Gemini for smart matching
 */
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI = process.env.GEMINI_API_KEY;

// User's target exercise list (cleaned up from their message)
const TARGETS = [
  'Decline Pushups',
  'Incline Pushups',
  'Hindu Pushups',
  'Archer Pushups',
  'Pushup Shoulder Tap',
  'Tricep Dips (Chair)',
  'Dumbbell Bench Press',
  'Floor Press',
  'Dumbbell Overhead Extensions',
  'Bodyweight Rows',
  'Dumbbell Bent-Over Rows',
  'Dumbbell Pullovers',
  'Dumbbell Face Pulls',
  'Dumbbell Reverse Fly',
  'Dumbbell Shrugs',
  'Dumbbell Arnold Press',
  'Dumbbell Front Raises',
  'Reverse Snow Angels',
  'Dumbbell Standard Curls',
  'Dumbbell Hammer Curls',
  'Dumbbell Concentration Curls',
  'Dumbbell Reverse Curls',
  'Bodyweight Squats',
  'Pistol Squats',
  'Dumbbell Goblet Squats',
  'Dumbbell Sumo Squats',
  'Side Lunges',
  'Step Ups',
  'Dumbbell Deadlifts',
  'Dumbbell Romanian Deadlifts',
  'Dumbbell Single-Leg Deadlifts',
  'Dumbbell Hip Thrust',
  'Dumbbell Calf Raises',
  'Deep Squat Hold',
  'Hanging Knee Raises',
  'L-Sit Hold',
  'Superman Hold',
  'High Knees',
  'Dead Hang',
  'Arm Circles',
  'Static Stretching',
  'Light Walk',
  'Foam Rolling',
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Match exercises: Your list ↔ Supabase DB           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── Step 1: Fetch all exercises from Supabase ──
  console.log('═══ Step 1: Fetching exercises from Supabase ═══\n');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/workout_exercises?select=id,name,video_url,type,muscle_group,equipment&order=id.asc`, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });

  if (!res.ok) {
    console.error('Supabase error:', res.status, await res.text());
    return;
  }

  const dbExercises = await res.json();
  console.log(`  Found ${dbExercises.length} exercises in Supabase\n`);

  // Show exercises that have video URLs
  const withVideo = dbExercises.filter(e => e.video_url && e.video_url.trim());
  const noVideo = dbExercises.filter(e => !e.video_url || !e.video_url.trim());
  console.log(`  With video_url: ${withVideo.length}`);
  console.log(`  Without video_url: ${noVideo.length}\n`);

  // ── Step 2: Use Gemini to match ──
  console.log('═══ Step 2: Gemini AI matching ═══\n');

  const dbList = dbExercises.map((e, i) => `${i+1}. [ID:${e.id}] "${e.name}" ${e.video_url ? '(has video)' : '(no video)'}`).join('\n');

  const prompt = `You are a fitness expert. Match each TARGET exercise to the BEST matching exercise in the SUPABASE DATABASE.

TARGET EXERCISES (user's list):
${TARGETS.map((e, i) => `${i+1}. ${e}`).join('\n')}

SUPABASE DATABASE EXERCISES:
${dbList}

For EACH target, find the single best match from the database. Return ONLY valid JSON (no markdown):
[{"target":"Decline Pushups","dbIndex":42,"dbId":123,"dbName":"...","confidence":95,"reason":"..."}]

Rules:
- dbIndex: 1-based index from DB list, or null if no match
- dbId: the exercise ID from [ID:X], or null
- dbName: exact name from DB
- confidence: 90-100 exact/near-exact, 70-89 close variation, 50-69 ok, <50 → set dbIndex to null
- Match by MOVEMENT PATTERN. "Dumbbell Bench Press" = "Dumbbell Press" or "Flat Dumbbell Press"
- "Dumbbell Standard Curls" should match "Dumbbell Curl" or similar
- "Tricep Dips (Chair)" should match "Chair Dips" or "Bench Dips"
- EVERY target must appear in output`;

  const gemRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  const gemJson = await gemRes.json();
  const text = gemJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  let matches;
  try {
    matches = JSON.parse(cleaned);
  } catch {
    console.error('Gemini parse error:', cleaned.substring(0, 500));
    return;
  }

  // ── Step 3: Report ──
  console.log('═══ RESULTS ═══\n');

  const matched = [];
  const unmatched = [];

  for (const m of matches) {
    if (m.dbIndex && m.dbId && m.confidence >= 50) {
      const dbEx = dbExercises.find(e => e.id === m.dbId) || dbExercises[m.dbIndex - 1];
      const videoUrl = dbEx?.video_url || '';
      matched.push({
        target: m.target,
        dbId: m.dbId,
        dbName: m.dbName || dbEx?.name,
        videoUrl: videoUrl,
        hasVideo: !!(videoUrl && videoUrl.trim()),
        confidence: m.confidence,
        reason: m.reason,
      });
    } else {
      unmatched.push({ target: m.target, confidence: m.confidence || 0, reason: m.reason || 'No match found' });
    }
  }

  // Catch targets missing from Gemini output
  for (const t of TARGETS) {
    if (!matched.find(m => m.target === t) && !unmatched.find(u => u.target === t)) {
      unmatched.push({ target: t, confidence: 0, reason: 'Missing from Gemini output' });
    }
  }

  console.log(`\n═══ MATCHED WITH VIDEO URL (${matched.filter(m => m.hasVideo).length}) ═══\n`);
  for (const m of matched.filter(m => m.hasVideo)) {
    console.log(`  ✓ [${m.confidence}%] ${m.target}`);
    console.log(`    DB: "${m.dbName}" (id: ${m.dbId})`);
    console.log(`    Video: ${m.videoUrl}`);
    console.log(`    Reason: ${m.reason}\n`);
  }

  console.log(`═══ MATCHED BUT NO VIDEO IN DB (${matched.filter(m => !m.hasVideo).length}) ═══\n`);
  for (const m of matched.filter(m => !m.hasVideo)) {
    console.log(`  ~ [${m.confidence}%] ${m.target}`);
    console.log(`    DB: "${m.dbName}" (id: ${m.dbId}) — NO video_url in DB`);
    console.log(`    Reason: ${m.reason}\n`);
  }

  console.log(`═══ UNMATCHED (${unmatched.length}) ═══\n`);
  for (const u of unmatched) {
    console.log(`  ✗ ${u.target} — ${u.reason}`);
  }

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Your list: ${TARGETS.length} exercises`);
  console.log(`  DB total: ${dbExercises.length} exercises`);
  console.log(`  Matched with video: ${matched.filter(m => m.hasVideo).length}`);
  console.log(`  Matched without video: ${matched.filter(m => !m.hasVideo).length}`);
  console.log(`  Unmatched: ${unmatched.length}`);

  // Save JSON
  const out = { matched, unmatched, generatedAt: new Date().toISOString() };
  const fs = await import('fs');
  const path = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const outPath = path.join(__dirname, 'supabase-match-results.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`  Saved: ${outPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
