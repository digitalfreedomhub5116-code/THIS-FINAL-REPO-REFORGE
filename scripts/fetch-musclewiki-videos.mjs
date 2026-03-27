/**
 * Focused MuscleWiki video fetcher
 * - Fetches all 1830 exercises from MuscleWiki
 * - Uses Gemini to match against target exercises
 * - Downloads videos LOCALLY to scripts/downloaded_videos/
 * - Then uploads to Cloudinary
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DL_DIR = path.join(__dirname, 'downloaded_videos');
fs.mkdirSync(DL_DIR, { recursive: true });

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME;
const CL_KEY = process.env.CLOUDINARY_API_KEY;
const CL_SEC = process.env.CLOUDINARY_API_SECRET;
const GEMINI = process.env.GEMINI_API_KEY;
const MW_KEY = process.env.MUSCLEWIKI_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

function safeJsonParse(text) {
  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, json: null };
  }
}

function readPreviousResults() {
  try {
    const prevPath = path.join(__dirname, 'musclewiki-results.json');
    if (!fs.existsSync(prevPath)) return { succeeded: new Map(), failed: [] };
    const raw = fs.readFileSync(prevPath, 'utf8');
    const parsed = JSON.parse(raw);
    const succeeded = new Map();
    for (const r of parsed.results || []) {
      if (r?.exercise && r?.cloudinaryUrl) succeeded.set(r.exercise, r);
    }
    return { succeeded, failed: parsed.failed || [] };
  } catch {
    return { succeeded: new Map(), failed: [] };
  }
}

// Exercises that need proper videos (low-confidence Cloudinary matches + unmatched)
const NEED_VIDEOS = [
  'Decline Pushups', 'Incline Pushups', 'Hindu Pushups', 'Archer Pushups',
  'Pushup Shoulder Tap', 'Dumbbell Overhead Extensions',
  'Bodyweight Rows', 'Dumbbell Pullovers', 'Dumbbell Front Raises',
  'Reverse Snow Angels', 'Dumbbell Standard Curls', 'Dumbbell Reverse Curls',
  'Bodyweight Squats', 'Pistol Squats', 'Dumbbell Sumo Squats',
  'Step Ups', 'Dumbbell Deadlifts', 'Dumbbell Single-Leg Deadlifts',
  'Deep Squat Hold', 'L-Sit Hold', 'Superman Hold', 'High Knees',
  'Dead Hang', 'Arm Circles', 'Foam Rolling',
];

// ── Step 1: Fetch ALL MuscleWiki exercises ──
async function fetchAllMW() {
  console.log('═══ Fetching all MuscleWiki exercises ═══\n');
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
    console.log(`  offset=${offset}: +${results.length} (total: ${all.length}/${json.total})`);
    if (results.length < limit || all.length >= json.total) break;
    offset += limit;
    await sleep(200);
  }
  console.log(`\n  Total: ${all.length} exercises\n`);
  return all;
}

// ── Step 2: Gemini match ──
async function geminiMatch(targets, mwExercises) {
  // Process in batches to stay within Gemini context
  const BATCH = 400;
  const allMatches = {};

  for (let i = 0; i < mwExercises.length; i += BATCH) {
    const batch = mwExercises.slice(i, i + BATCH);
    const batchNum = Math.floor(i / BATCH) + 1;
    console.log(`  Gemini batch ${batchNum}: ${targets.length} targets ↔ ${batch.length} MW exercises (offset ${i})...`);

    const prompt = `You are a fitness expert. Match each TARGET exercise to the BEST matching exercise from the MW list.

TARGET EXERCISES (need video):
${targets.map((e, i) => `${i+1}. ${e}`).join('\n')}

MUSCLEWIKI EXERCISES (batch ${batchNum}, IDs shown):
${batch.map((e, i) => `${i+1}. [ID:${e.id}] ${e.name}`).join('\n')}

Return ONLY valid JSON array (no markdown):
[{"target":"Decline Pushups","matchedIndex":42,"matchedId":123,"confidence":95,"reason":"..."}]

Rules:
- matchedIndex: 1-based from this batch, or null
- matchedId: the exercise ID from [ID:X], or null
- confidence: 90-100 exact, 70-89 close, 50-69 ok, <50 → null
- The MOVEMENT must genuinely match. Decline pushup ≠ regular pushup.
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
    try { matches = JSON.parse(cleaned); } catch { console.error('  Parse error:', cleaned.substring(0, 300)); continue; }

    for (const m of matches) {
      if (!m.matchedIndex || m.confidence < 50) continue;
      const ex = batch[m.matchedIndex - 1];
      if (!ex) continue;

      // Keep best match per target
      if (!allMatches[m.target] || m.confidence > allMatches[m.target].confidence) {
        allMatches[m.target] = {
          mwId: ex.id,
          mwName: ex.name,
          confidence: m.confidence,
          reason: m.reason,
        };
        console.log(`    ✓ ${m.target} → ${ex.name} [ID:${ex.id}] (${m.confidence}%)`);
      }
    }

    await sleep(1500); // Gemini rate limit
  }

  return allMatches;
}

// ── Step 3: Fetch exercise detail + video URL ──
async function getVideoUrl(exerciseId) {
  const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}`, {
    headers: { 'X-API-Key': MW_KEY },
  });
  if (!res.ok) return null;
  const d = await res.json();
  // Prefer male front-angle video
  if (d.videos && Array.isArray(d.videos)) {
    const maleFront = d.videos.find(v => v.gender === 'male' && v.angle === 'front');
    if (maleFront?.url) return maleFront.url;
    const male = d.videos.find(v => v.gender === 'male');
    if (male?.url) return male.url;
    if (d.videos[0]?.url) return d.videos[0].url;
  }
  return null;
}

// ── Step 4: Download locally ──
function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function downloadVideo(videoUrl, exerciseName) {
  const fname = safeName(exerciseName) + '.mp4';
  const dest = path.join(DL_DIR, fname);

  if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    console.log(`  ↓ Already exists: ${fname} (${(fs.statSync(dest).size/1024).toFixed(0)} KB)`);
    return dest;
  }

  if (fs.existsSync(dest) && fs.statSync(dest).size === 0) {
    try { fs.unlinkSync(dest); } catch {}
  }

  console.log(`  ↓ Downloading ${exerciseName}...`);
  const res = await fetch(videoUrl, { headers: { 'X-API-Key': MW_KEY } });
  if (!res.ok) throw new Error(`Download ${res.status}: ${videoUrl}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  console.log(`    Saved: ${fname} (${(fs.statSync(dest).size/1024).toFixed(0)} KB)`);
  return dest;
}

// ── Step 5: Upload to Cloudinary ──
async function uploadCloudinary(localPath, exerciseName) {
  const pubId = safeName(exerciseName);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: pubId, timestamp, folder: 'workout_exercises' };
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const sig = crypto.createHash('sha1').update(sorted + CL_SEC).digest('hex');

  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`  ↑ Uploading to Cloudinary: workout_exercises/${pubId}... (attempt ${attempt}/3)`);
    const form = new FormData();
    form.append('file', new Blob([fs.readFileSync(localPath)]), path.basename(localPath));
    form.append('public_id', pubId);
    form.append('folder', 'workout_exercises');
    form.append('timestamp', String(timestamp));
    form.append('signature', sig);
    form.append('api_key', CL_KEY);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, { method: 'POST', body: form });
    const text = await res.text();
    const parsed = safeJsonParse(text);
    const json = parsed.ok ? parsed.json : null;

    const secureUrl = json?.secure_url;
    if (secureUrl) {
      console.log(`  ✓ ${secureUrl}`);
      return secureUrl;
    }

    const preview = text?.substring(0, 250)?.replace(/\s+/g, ' ');
    console.error(`  ✗ Upload failed (status ${res.status}). Response preview: ${preview}`);

    if (attempt < 3) await sleep(1200 * attempt);
  }

  return null;
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log(`║  MuscleWiki Video Fetcher — ${NEED_VIDEOS.length} exercises to find  ║`);
  console.log(`║  Download dir: scripts/downloaded_videos/          ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');

  const prev = readPreviousResults();
  const alreadyDone = new Set(prev.succeeded.keys());
  const targets = NEED_VIDEOS.filter(t => !alreadyDone.has(t));
  if (alreadyDone.size > 0) {
    console.log(`Resuming: skipping ${alreadyDone.size} exercises already uploaded from prior run.`);
  }
  if (targets.length === 0) {
    console.log('Nothing left to do — all target videos already uploaded.');
    return;
  }

  // 1. Fetch all MW exercises
  const mwAll = await fetchAllMW();
  if (mwAll.length === 0) { console.error('No MuscleWiki exercises fetched!'); return; }

  // 2. Gemini match
  console.log('\n═══ Gemini AI Matching ═══\n');
  const matches = await geminiMatch(targets, mwAll);

  // 3+4+5: For each match, fetch video → download → upload
  console.log('\n═══ Download & Upload ═══\n');
  const results = Array.from(prev.succeeded.values());
  const failed = [];

  for (const target of targets) {
    const match = matches[target];
    if (!match) {
      console.log(`  ✗ ${target} — no MuscleWiki match found`);
      failed.push({ exercise: target, reason: 'No match in MuscleWiki' });
      continue;
    }

    console.log(`\n  ── ${target} → ${match.mwName} (${match.confidence}%) ──`);

    try {
      // Get video URL
      const videoUrl = await getVideoUrl(match.mwId);
      if (!videoUrl) {
        console.log(`  ✗ No video available for ${match.mwName}`);
        failed.push({ exercise: target, reason: `Matched ${match.mwName} but no video`, confidence: match.confidence });
        continue;
      }

      // Download locally
      const localPath = await downloadVideo(videoUrl, target);

      // Upload to Cloudinary
      const clUrl = await uploadCloudinary(localPath, target);

      if (!clUrl) {
        failed.push({ exercise: target, reason: 'Cloudinary upload failed after retries', confidence: match.confidence });
        continue;
      }

      results.push({
        exercise: target,
        cloudinaryUrl: clUrl,
        mwName: match.mwName,
        mwId: match.mwId,
        confidence: match.confidence,
        reason: match.reason,
        localFile: path.basename(localPath),
      });

      await sleep(500);
    } catch (err) {
      console.error(`  ✗ Error for ${target}: ${err.message}`);
      failed.push({ exercise: target, reason: err.message, confidence: match.confidence });
    }
  }

  // ── Report ──
  console.log('\n\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    FINAL REPORT                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');

  console.log(`═══ SUCCESSFULLY DOWNLOADED & UPLOADED (${results.length}) ═══\n`);
  for (const r of results) {
    console.log(`  ✓ [${r.confidence}%] ${r.exercise}`);
    console.log(`    MW Match: ${r.mwName} (ID: ${r.mwId})`);
    console.log(`    Cloudinary: ${r.cloudinaryUrl}`);
    console.log(`    Local: downloaded_videos/${r.localFile}`);
    console.log(`    Reason: ${r.reason}\n`);
  }

  console.log(`═══ FAILED / NO MATCH (${failed.length}) ═══\n`);
  for (const f of failed) {
    console.log(`  ✗ ${f.exercise} — ${f.reason}`);
  }

  // List all local files
  const files = fs.readdirSync(DL_DIR).filter(f => f.endsWith('.mp4'));
  console.log(`\n═══ LOCAL FILES (${files.length}) in ${DL_DIR} ═══\n`);
  for (const f of files) {
    const size = fs.statSync(path.join(DL_DIR, f)).size;
    console.log(`  ${f} (${(size/1024).toFixed(0)} KB)`);
  }

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Targets: ${NEED_VIDEOS.length}`);
  console.log(`  Downloaded & uploaded: ${results.length}`);
  console.log(`  Failed: ${failed.length}`);

  // Save results
  const out = path.join(__dirname, 'musclewiki-results.json');
  fs.writeFileSync(out, JSON.stringify({ results, failed, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`  Results: ${out}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
