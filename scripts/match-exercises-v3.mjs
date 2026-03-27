/**
 * Exercise Video Matcher v3
 * - Downloads MuscleWiki videos LOCALLY first (scripts/downloaded_videos/)
 * - Then uploads to Cloudinary
 * - Only targets exercises that need proper videos (low-confidence or unmatched)
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

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME;
const CL_KEY = process.env.CLOUDINARY_API_KEY;
const CL_SEC = process.env.CLOUDINARY_API_SECRET;
const GEMINI = process.env.GEMINI_API_KEY;
const MW_KEY = process.env.MUSCLEWIKI_KEY;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// All 43 target exercises
const TARGETS = [
  'Decline Pushups', 'Incline Pushups', 'Hindu Pushups', 'Archer Pushups',
  'Pushup Shoulder Tap', 'Tricep Dips (Chair)', 'Dumbbell Bench Press',
  'Floor Press', 'Dumbbell Overhead Extensions',
  'Bodyweight Rows', 'Dumbbell Bent-Over Rows', 'Dumbbell Pullovers',
  'Dumbbell Face Pulls', 'Dumbbell Reverse Fly', 'Dumbbell Shrugs',
  'Dumbbell Arnold Press', 'Dumbbell Front Raises', 'Reverse Snow Angels',
  'Dumbbell Standard Curls', 'Dumbbell Hammer Curls',
  'Dumbbell Concentration Curls', 'Dumbbell Reverse Curls',
  'Bodyweight Squats', 'Pistol Squats', 'Dumbbell Goblet Squats',
  'Dumbbell Sumo Squats', 'Side Lunges', 'Step Ups',
  'Dumbbell Deadlifts', 'Dumbbell Romanian Deadlifts',
  'Dumbbell Single-Leg Deadlifts', 'Dumbbell Hip Thrust',
  'Dumbbell Calf Raises', 'Deep Squat Hold',
  'Hanging Knee Raises', 'L-Sit Hold', 'Superman Hold', 'High Knees',
  'Dead Hang', 'Arm Circles', 'Static Stretching', 'Light Walk', 'Foam Rolling',
];

// ══════════════════════════════════════════════════
// Gemini AI matching
// ══════════════════════════════════════════════════
async function geminiMatch(targets, available, source) {
  console.log(`  Gemini: ${targets.length} targets ↔ ${available.length} ${source} exercises...`);
  const prompt = `You are a fitness expert. Match TARGET exercises to the AVAILABLE list.

TARGET EXERCISES:
${targets.map((e, i) => `${i+1}. ${e}`).join('\n')}

AVAILABLE EXERCISES (from ${source}):
${available.map((e, i) => `${i+1}. ${typeof e === 'string' ? e : e.name}`).join('\n')}

For EACH target find the single best match. Return ONLY valid JSON (no markdown):
[{"target":"...","matchedIndex":5,"confidence":95,"reason":"..."}]

- matchedIndex: 1-based from AVAILABLE, or null if no good match
- confidence: 90-100 exact, 70-89 close variation, 50-69 similar, <50 → null
- The exercise movement must genuinely match. Do NOT match unrelated exercises.
- EVERY target must appear in output.`;

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
  try { return JSON.parse(cleaned); }
  catch { console.error('  Parse error:', cleaned.substring(0, 300)); return []; }
}

// ══════════════════════════════════════════════════
// Cloudinary: list videos
// ══════════════════════════════════════════════════
async function listCloudinary() {
  console.log('\n═══ STEP 1: Listing Cloudinary videos ═══\n');
  const auth = Buffer.from(`${CL_KEY}:${CL_SEC}`).toString('base64');
  const all = [];
  let cursor = '';
  do {
    const qs = cursor ? `&next_cursor=${cursor}` : '';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/resources/video/upload?max_results=500&prefix=workout_exercises${qs}`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const json = await res.json();
    if (!res.ok) { console.error('  CL error:', json); break; }
    all.push(...(json.resources || []));
    cursor = json.next_cursor || '';
  } while (cursor);

  const videos = all.map(r => ({
    publicId: r.public_id,
    url: r.secure_url,
    name: r.public_id.replace('workout_exercises/', '').replace(/_/g, ' '),
  }));
  console.log(`  Found ${videos.length} videos`);
  return videos;
}

// ══════════════════════════════════════════════════
// MuscleWiki: fetch all exercises
// ══════════════════════════════════════════════════
async function fetchAllMW() {
  console.log('\n═══ STEP 3: Fetching MuscleWiki exercises ═══\n');
  const all = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const url = `https://api.musclewiki.com/exercises?limit=${limit}&offset=${offset}`;
    console.log(`  offset=${offset}...`);
    const res = await fetch(url, { headers: { 'X-API-Key': MW_KEY } });
    console.log(`  Status: ${res.status}`);

    if (!res.ok) {
      const txt = await res.text();
      console.error(`  Error: ${txt.substring(0, 300)}`);
      break;
    }

    const json = await res.json();
    const results = json.results || json.exercises || (Array.isArray(json) ? json : []);
    all.push(...results);
    console.log(`  Got ${results.length} (total: ${all.length}/${json.total || '?'})`);

    if (results.length < limit || all.length >= (json.total || Infinity)) break;
    offset += limit;
    await sleep(300);
  }

  if (all.length > 0) {
    console.log(`  Sample: ${JSON.stringify(all[0]).substring(0, 300)}`);
  }
  console.log(`  Total: ${all.length}`);
  return all;
}

// ── Fetch video URLs for a specific exercise ──
async function fetchMWVideos(exerciseId) {
  // Try /exercises/{id}/videos
  try {
    const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}/videos`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    if (res.ok) {
      const json = await res.json();
      // Extract first video URL from whatever structure is returned
      if (Array.isArray(json)) {
        for (const v of json) {
          const url = v.url || v.video_url || v.video || v.mp4 || v.webm;
          if (url) return url;
        }
      }
      if (json.videos && Array.isArray(json.videos)) {
        for (const v of json.videos) {
          const url = v.url || v.video_url || v.video || v.mp4;
          if (url) return url;
        }
      }
      if (json.url) return json.url;
      if (json.video_url) return json.video_url;
      // Log structure for debugging
      console.log(`    /videos keys: ${Object.keys(json).join(', ')}`);
    }
  } catch {}

  // Try /exercises/{id} detail
  try {
    const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    if (res.ok) {
      const d = await res.json();
      // Try common video fields
      const candidates = [
        d.video_url, d.video, d.male?.video, d.female?.video,
        d.videos?.[0]?.url, d.videos?.[0]?.video_url,
        d.male?.videos?.[0]?.url, d.female?.videos?.[0]?.url,
        d.media?.video, d.media?.male_video, d.media?.female_video,
      ];
      for (const c of candidates) {
        if (c && typeof c === 'string' && (c.endsWith('.mp4') || c.includes('video'))) return c;
      }
      // Last resort: any URL-like field
      for (const key of Object.keys(d)) {
        const val = d[key];
        if (typeof val === 'string' && (val.endsWith('.mp4') || val.endsWith('.webm'))) return val;
      }
      console.log(`    Detail keys: ${Object.keys(d).join(', ')}`);
      // Check for nested video objects
      if (d.male) console.log(`    male keys: ${Object.keys(d.male).join(', ')}`);
    }
  } catch {}

  return null;
}

// ══════════════════════════════════════════════════
// Download locally + Upload to Cloudinary
// ══════════════════════════════════════════════════
function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

async function downloadLocally(videoUrl, exerciseName) {
  fs.mkdirSync(DL_DIR, { recursive: true });
  const fname = safeName(exerciseName) + '.mp4';
  const dest = path.join(DL_DIR, fname);

  // Skip if already downloaded
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`  ↓ Already downloaded: ${fname} (${(fs.statSync(dest).size/1024).toFixed(0)} KB)`);
    return dest;
  }

  console.log(`  ↓ Downloading ${exerciseName}...`);
  const res = await fetch(videoUrl, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  const size = fs.statSync(dest).size;
  console.log(`    Saved: ${fname} (${(size/1024).toFixed(0)} KB)`);
  return dest;
}

async function uploadToCloudinary(localPath, exerciseName) {
  const pubId = safeName(exerciseName);
  const timestamp = Math.floor(Date.now()/1000);
  const params = { public_id: pubId, timestamp, folder: 'workout_exercises' };
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  const sig = crypto.createHash('sha1').update(sorted + CL_SEC).digest('hex');

  console.log(`  ↑ Uploading ${path.basename(localPath)} → Cloudinary...`);
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(localPath)]), path.basename(localPath));
  form.append('public_id', pubId);
  form.append('folder', 'workout_exercises');
  form.append('timestamp', String(timestamp));
  form.append('signature', sig);
  form.append('api_key', CL_KEY);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, {
    method: 'POST', body: form,
  });
  const json = await res.json();
  if (json.secure_url) {
    console.log(`  ✓ ${json.secure_url}`);
    return json.secure_url;
  }
  console.error(`  ✗ Upload failed:`, JSON.stringify(json).substring(0, 200));
  return null;
}

// ══════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log(`║  Exercise Video Matcher v3 — ${TARGETS.length} targets          ║`);
  console.log(`║  Local download dir: scripts/downloaded_videos ║`);
  console.log('╚═══════════════════════════════════════════════╝');

  const results = {};
  TARGETS.forEach(e => { results[e] = { url: null, source: null, confidence: 0, reason: '', localFile: null }; });

  // ── Step 1+2: Match against existing Cloudinary ──
  const clVideos = await listCloudinary();
  console.log('\n═══ STEP 2: Gemini matching (Cloudinary) ═══\n');
  const clMatches = await geminiMatch(TARGETS, clVideos, 'Cloudinary');

  const needMW = []; // exercises that need MuscleWiki (unmatched or <80% confidence)

  for (const m of clMatches) {
    if (m.matchedIndex && m.confidence >= 80) {
      const v = clVideos[m.matchedIndex - 1];
      if (v) {
        results[m.target] = { url: v.url, source: 'Cloudinary (existing)', confidence: m.confidence, reason: m.reason, localFile: null };
        console.log(`  ✓ [${m.confidence}%] ${m.target} → ${v.name}`);
        continue;
      }
    }
    needMW.push(m.target);
    if (m.matchedIndex && m.confidence >= 50) {
      const v = clVideos[m.matchedIndex - 1];
      if (v) {
        // Store as fallback
        results[m.target] = { url: v.url, source: 'Cloudinary (fallback)', confidence: m.confidence, reason: m.reason, localFile: null };
        console.log(`  ~ [${m.confidence}%] ${m.target} → ${v.name} (will try MuscleWiki for better match)`);
      }
    }
  }
  // Catch targets missing from Gemini response
  for (const t of TARGETS) {
    if (!results[t].url && !needMW.includes(t)) needMW.push(t);
  }

  const highConf = TARGETS.length - needMW.length;
  console.log(`\n  High-confidence Cloudinary matches (≥80%): ${highConf}/${TARGETS.length}`);
  console.log(`  Need MuscleWiki: ${needMW.length} → ${needMW.join(', ')}\n`);

  // ── Step 3+4: MuscleWiki for remaining ──
  if (needMW.length > 0) {
    const mwAll = await fetchAllMW();

    if (mwAll.length > 0) {
      console.log('\n═══ STEP 4: Gemini matching (MuscleWiki) ═══\n');

      const BATCH = 300;
      const remaining = [...needMW];

      for (let i = 0; i < mwAll.length && remaining.length > 0; i += BATCH) {
        const batch = mwAll.slice(i, i + BATCH).map(e => ({
          id: e.id,
          name: e.name || e.title || `exercise_${e.id}`,
        }));

        console.log(`\n  Batch ${Math.floor(i/BATCH)+1}: ${remaining.length} targets ↔ ${batch.length} MW exercises`);
        const mwMatches = await geminiMatch(remaining, batch, 'MuscleWiki');
        const matched = [];

        for (const m of mwMatches) {
          if (!m.matchedIndex || m.confidence < 50) continue;
          const ex = batch[m.matchedIndex - 1];
          if (!ex) continue;

          console.log(`  ⟳ ${m.target} → ${ex.name} (${m.confidence}%) — fetching video...`);
          const videoUrl = await fetchMWVideos(ex.id);
          await sleep(300);

          if (videoUrl) {
            try {
              // Download locally first
              const localPath = await downloadLocally(videoUrl, m.target);

              // Upload to Cloudinary
              const clUrl = await uploadToCloudinary(localPath, m.target);

              results[m.target] = {
                url: clUrl || videoUrl,
                source: 'MuscleWiki → Cloudinary',
                confidence: m.confidence,
                reason: m.reason,
                mwName: ex.name,
                mwId: ex.id,
                localFile: localPath,
              };
              matched.push(m.target);
              console.log(`  ✓ ${m.target} — DONE\n`);
            } catch (err) {
              console.error(`  ✗ ${m.target}: ${err.message}`);
            }
          } else {
            console.log(`    No video URL found for ${ex.name}`);
          }
        }

        for (const t of matched) {
          const idx = remaining.indexOf(t);
          if (idx >= 0) remaining.splice(idx, 1);
        }
        await sleep(1000);
      }
    } else {
      console.log('  ⚠ MuscleWiki returned 0 exercises. Check API key / plan tier.');
    }
  }

  // ══════════════════════════════════════════════════
  // FINAL REPORT
  // ══════════════════════════════════════════════════
  const high = [], fallback = [], unmatched = [];
  for (const [name, info] of Object.entries(results)) {
    if (!info.url) { unmatched.push({ exercise: name, ...info }); continue; }
    if (info.confidence >= 80) high.push({ exercise: name, ...info });
    else fallback.push({ exercise: name, ...info });
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL REPORT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log(`═══ HIGH CONFIDENCE (≥80%) — ${high.length} exercises ═══\n`);
  for (const m of high) {
    console.log(`  ✓ [${m.confidence}%] ${m.exercise}`);
    console.log(`    URL: ${m.url}`);
    console.log(`    Source: ${m.source} | ${m.reason}`);
    if (m.localFile) console.log(`    Local: ${m.localFile}`);
    console.log();
  }

  console.log(`═══ FALLBACK (<80%) — ${fallback.length} exercises ═══\n`);
  for (const m of fallback) {
    console.log(`  ~ [${m.confidence}%] ${m.exercise}`);
    console.log(`    URL: ${m.url}`);
    console.log(`    Source: ${m.source} | ${m.reason}`);
    console.log();
  }

  console.log(`═══ UNMATCHED — ${unmatched.length} exercises ═══\n`);
  for (const u of unmatched) {
    console.log(`  ✗ ${u.exercise}`);
  }

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Total: ${TARGETS.length}`);
  console.log(`  High confidence (≥80%): ${high.length}`);
  console.log(`  Fallback (<80%): ${fallback.length}`);
  console.log(`  Unmatched: ${unmatched.length}`);
  console.log(`  Local downloads: ${DL_DIR}`);

  // List local files
  if (fs.existsSync(DL_DIR)) {
    const files = fs.readdirSync(DL_DIR).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      console.log(`\n  Downloaded files (${files.length}):`);
      for (const f of files) {
        const size = fs.statSync(path.join(DL_DIR, f)).size;
        console.log(`    ${f} (${(size/1024).toFixed(0)} KB)`);
      }
    }
  }

  const out = path.join(__dirname, 'exercise-match-results.json');
  fs.writeFileSync(out, JSON.stringify({ high, fallback, unmatched, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\n  Results: ${out}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
