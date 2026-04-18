/**
 * fetch-batch2-videos.mjs
 * Fetches videos from MuscleWiki for batch-2 exercises.
 * Reuses the proven pipeline from fetch-musclewiki-videos.mjs.
 * Downloads to scripts/downloaded_videos_batch2/
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DL_DIR = path.join(__dirname, 'downloaded_videos_batch2');
fs.mkdirSync(DL_DIR, { recursive: true });

const GEMINI = process.env.GEMINI_API_KEY;
const MW_KEY = process.env.MUSCLEWIKI_KEY;
if (!GEMINI) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }
if (!MW_KEY) { console.error('Missing MUSCLEWIKI_KEY'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load new exercises (skip sports — no MW videos for those)
const newExercises = JSON.parse(fs.readFileSync(path.join(__dirname, 'new-exercises.json'), 'utf8'));
const NEED_VIDEOS = newExercises
  .filter(e => !e.is_sport)
  .map(e => e.name);

console.log(`\n═══ Batch 2 Video Fetcher ═══`);
console.log(`  Total new exercises: ${newExercises.length}`);
console.log(`  Need videos (non-sport): ${NEED_VIDEOS.length}\n`);

// ── Fetch ALL MuscleWiki exercises ──
async function fetchAllMW() {
  console.log('Step 1: Fetching all MuscleWiki exercises...');
  const all = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const res = await fetch(`https://api.musclewiki.com/exercises?limit=${limit}&offset=${offset}`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    if (!res.ok) { console.error(`  Error ${res.status}:`, await res.text()); break; }
    const json = await res.json();
    const results = json.results || [];
    all.push(...results);
    process.stdout.write(`\r  Fetched ${all.length}/${json.total}...`);
    if (results.length < limit || all.length >= json.total) break;
    offset += limit;
    await sleep(200);
  }
  console.log(`\n  Total: ${all.length} exercises\n`);
  return all;
}

// ── Gemini match ──
async function geminiMatch(targets, mwExercises) {
  const BATCH = 500;
  const allMatches = {};

  for (let i = 0; i < mwExercises.length; i += BATCH) {
    const batch = mwExercises.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    console.log(`  Gemini batch ${batchNum}: ${targets.length} targets ↔ ${batch.length} MW exercises...`);

    const prompt = `You are a fitness expert. Match each TARGET exercise to the BEST matching exercise from the MW list.

TARGET EXERCISES:
${targets.map((e, i) => `${i+1}. ${e}`).join('\n')}

MUSCLEWIKI EXERCISES (batch ${batchNum}):
${batch.map((e, i) => `${i+1}. [ID:${e.id}] ${e.name}`).join('\n')}

Return ONLY valid JSON array (no markdown):
[{"target":"...","matchedIndex":42,"matchedId":123,"confidence":95,"reason":"..."}]

Rules:
- matchedIndex: 1-based from this batch, or null
- matchedId: the exercise ID from [ID:X], or null  
- confidence: 90-100 exact, 70-89 close, 50-69 ok, <50 → null
- The MOVEMENT must genuinely match
- EVERY target must appear in output`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
      }),
    });
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

    let matches = [];
    try { matches = JSON.parse(cleaned); } catch { console.error('  Parse error'); continue; }

    for (const m of matches) {
      if (!m.matchedIndex || m.confidence < 50) continue;
      const ex = batch[m.matchedIndex - 1];
      if (!ex) continue;
      if (!allMatches[m.target] || m.confidence > allMatches[m.target].confidence) {
        allMatches[m.target] = { mwId: ex.id, mwName: ex.name, confidence: m.confidence };
        console.log(`    ✓ ${m.target} → ${ex.name} [ID:${ex.id}] (${m.confidence}%)`);
      }
    }
    await sleep(2000);
  }
  return allMatches;
}

// ── Get video URL from MW exercise detail ──
async function getVideoUrl(exerciseId) {
  const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}`, {
    headers: { 'X-API-Key': MW_KEY },
  });
  if (!res.ok) return null;
  const d = await res.json();
  if (d.videos && Array.isArray(d.videos)) {
    const maleFront = d.videos.find(v => v.gender === 'male' && v.angle === 'front');
    if (maleFront?.url) return maleFront.url;
    const male = d.videos.find(v => v.gender === 'male');
    if (male?.url) return male.url;
    if (d.videos[0]?.url) return d.videos[0].url;
  }
  return null;
}

// ── Download video ──
function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function downloadVideo(videoUrl, exerciseName) {
  const fname = safeName(exerciseName) + '.mp4';
  const dest = path.join(DL_DIR, fname);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    console.log(`  ↓ Already: ${fname} (${(fs.statSync(dest).size/1024).toFixed(0)} KB)`);
    return dest;
  }
  console.log(`  ↓ Downloading ${exerciseName}...`);
  const res = await fetch(videoUrl, { headers: { 'X-API-Key': MW_KEY } });
  if (!res.ok) throw new Error(`Download ${res.status}: ${videoUrl}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  console.log(`    Saved: ${fname} (${(fs.statSync(dest).size/1024).toFixed(0)} KB)`);
  return dest;
}

// ── MAIN ──
async function main() {
  const mwAll = await fetchAllMW();
  if (mwAll.length === 0) { console.error('No MW exercises fetched!'); return; }

  console.log('\nStep 2: Gemini AI Matching...\n');
  const matches = await geminiMatch(NEED_VIDEOS, mwAll);

  console.log('\nStep 3: Download videos...\n');
  const results = [];
  const failed = [];

  for (const target of NEED_VIDEOS) {
    const match = matches[target];
    if (!match) {
      console.log(`  ✗ ${target} — no match`);
      failed.push({ exercise: target, reason: 'No MuscleWiki match' });
      continue;
    }

    try {
      const videoUrl = await getVideoUrl(match.mwId);
      if (!videoUrl) {
        failed.push({ exercise: target, reason: `Matched ${match.mwName} but no video` });
        continue;
      }
      const localPath = await downloadVideo(videoUrl, target);
      results.push({
        exercise: target,
        localFile: path.basename(localPath),
        mwName: match.mwName,
        mwId: match.mwId,
        confidence: match.confidence,
      });
      await sleep(300);
    } catch (err) {
      console.error(`  ✗ Error for ${target}: ${err.message}`);
      failed.push({ exercise: target, reason: err.message });
    }
  }

  console.log(`\n═══ RESULTS ═══`);
  console.log(`  Downloaded: ${results.length}`);
  console.log(`  Failed: ${failed.length}\n`);

  for (const f of failed) {
    console.log(`  ✗ ${f.exercise}: ${f.reason}`);
  }

  const outPath = path.join(__dirname, 'batch2-results.json');
  fs.writeFileSync(outPath, JSON.stringify({ results, failed, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\n  ✅ Results saved to: ${outPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
