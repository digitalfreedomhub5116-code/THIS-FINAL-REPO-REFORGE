/**
 * Exercise Video Matcher v2
 * Uses native fetch, correct MuscleWiki API format, Gemini AI matching
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CLOUD  = process.env.CLOUDINARY_CLOUD_NAME;
const CL_KEY = process.env.CLOUDINARY_API_KEY;
const CL_SEC = process.env.CLOUDINARY_API_SECRET;
const GEMINI = process.env.GEMINI_API_KEY;
const MW_KEY = process.env.MUSCLEWIKI_KEY;

// ── Target exercises (expanded) ──
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

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ══════════════════════════════════════════════════
// ── STEP 1: Cloudinary — list all workout_exercises videos ──
// ══════════════════════════════════════════════════
async function listCloudinary() {
  console.log('\n═══ STEP 1: Listing Cloudinary videos ═══\n');
  const auth = Buffer.from(`${CL_KEY}:${CL_SEC}`).toString('base64');
  const all = [];
  let cursor = '';

  do {
    const qs = cursor ? `&next_cursor=${cursor}` : '';
    const url = `https://api.cloudinary.com/v1_1/${CLOUD}/resources/video/upload?max_results=500&prefix=workout_exercises${qs}`;
    const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } });
    const json = await res.json();
    if (!res.ok) { console.error('Cloudinary error:', json); break; }
    all.push(...(json.resources || []));
    cursor = json.next_cursor || '';
  } while (cursor);

  const videos = all.map(r => ({
    publicId: r.public_id,
    url: r.secure_url,
    name: r.public_id.replace('workout_exercises/', '').replace(/_/g, ' '),
  }));
  console.log(`  Found ${videos.length} videos on Cloudinary`);
  return videos;
}

// ══════════════════════════════════════════════════
// ── STEP 2: Gemini AI matching ──
// ══════════════════════════════════════════════════
async function geminiMatch(targets, available, source) {
  console.log(`  Gemini: matching ${targets.length} targets ↔ ${available.length} ${source} exercises...`);

  const prompt = `You are a fitness/exercise expert. Match TARGET exercises to AVAILABLE exercises.

TARGET EXERCISES:
${targets.map((e, i) => `${i+1}. ${e}`).join('\n')}

AVAILABLE EXERCISES (from ${source}):
${available.map((e, i) => `${i+1}. ${e.name}`).join('\n')}

For EACH target, find the single best match. Consider:
- Same exercise different name ("Dumbbell Bench Press" = "Flat Dumbbell Press")
- Close variations ("Dumbbell Calf Raises" ≈ "Calf Raises")
- Only match if movement pattern is genuinely the same or very close

Return ONLY valid JSON (no markdown fences):
[{"target":"...","matchedIndex":5,"confidence":95,"reason":"..."}]

- matchedIndex: 1-based index from AVAILABLE list, or null if no good match
- confidence: 0-100 (90-100 exact, 70-89 close variation, 50-69 similar, <50 no match → set matchedIndex null)
- EVERY target must appear in output`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`;
  const res = await fetch(url, {
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
  catch { console.error('  Gemini parse error:', cleaned.substring(0, 300)); return []; }
}

// ══════════════════════════════════════════════════
// ── STEP 3: MuscleWiki — fetch all exercises ──
// ══════════════════════════════════════════════════
async function fetchMuscleWiki() {
  console.log('\n═══ STEP 3: Fetching MuscleWiki exercises ═══\n');
  const all = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const url = `https://api.musclewiki.com/exercises?limit=${limit}&offset=${offset}`;
    console.log(`  Fetching offset=${offset}...`);
    try {
      const res = await fetch(url, {
        headers: { 'X-API-Key': MW_KEY, 'Accept': 'application/json' },
      });
      console.log(`  Status: ${res.status}`);
      
      if (!res.ok) {
        const text = await res.text();
        console.error(`  Error: ${text.substring(0, 200)}`);
        break;
      }
      
      const json = await res.json();
      const results = json.results || [];
      all.push(...results);
      console.log(`  Got ${results.length} (total so far: ${all.length}/${json.total || '?'})`);
      
      if (results.length < limit || all.length >= (json.total || Infinity)) break;
      offset += limit;
      await sleep(300);
    } catch (err) {
      console.error(`  Fetch error: ${err.message}`);
      break;
    }
  }

  if (all.length > 0) {
    console.log(`\n  Sample exercise: ${JSON.stringify(all[0]).substring(0, 200)}`);
  }
  console.log(`  Total MuscleWiki exercises: ${all.length}`);
  return all;
}

// ── Fetch video URL for a specific MuscleWiki exercise ──
async function fetchMWVideo(exerciseId) {
  try {
    const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}/videos`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Could be array or object with videos
    if (Array.isArray(json)) return json[0]?.url || json[0]?.video_url || null;
    if (json.videos) return json.videos[0]?.url || null;
    if (json.url) return json.url;
    // Try standard response fields
    return json.male?.video || json.female?.video || json.video_url || null;
  } catch { return null; }
}

// ── Fetch full exercise detail (includes videos) ──
async function fetchMWDetail(exerciseId) {
  try {
    const res = await fetch(`https://api.musclewiki.com/exercises/${exerciseId}`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

// ══════════════════════════════════════════════════
// ── Download & Upload to Cloudinary ──
// ══════════════════════════════════════════════════
async function downloadAndUpload(videoUrl, name) {
  const tmpDir = path.join(__dirname, 'tmp_videos');
  fs.mkdirSync(tmpDir, { recursive: true });
  const safe = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const tmp = path.join(tmpDir, `${safe}.mp4`);

  console.log(`  ↓ Downloading ${name}...`);
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  const size = fs.statSync(tmp).size;
  console.log(`    ${(size/1024).toFixed(0)} KB`);

  console.log(`  ↑ Uploading to Cloudinary...`);
  const timestamp = Math.floor(Date.now()/1000);
  const params = { public_id: safe, timestamp, folder: 'workout_exercises' };
  const sorted = Object.keys(params).sort().map(k=>`${k}=${params[k]}`).join('&');
  const sig = crypto.createHash('sha1').update(sorted + CL_SEC).digest('hex');

  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(tmp)]), `${safe}.mp4`);
  form.append('public_id', safe);
  form.append('folder', 'workout_exercises');
  form.append('timestamp', String(timestamp));
  form.append('signature', sig);
  form.append('api_key', CL_KEY);

  const upRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/video/upload`, {
    method: 'POST', body: form,
  });
  const upJson = await upRes.json();
  fs.unlinkSync(tmp);

  if (upJson.secure_url) {
    console.log(`  ✓ ${upJson.secure_url}`);
    return upJson.secure_url;
  }
  console.error(`  ✗ Upload failed:`, JSON.stringify(upJson).substring(0, 200));
  return null;
}

// ══════════════════════════════════════════════════
// ── MAIN ──
// ══════════════════════════════════════════════════
async function main() {
  console.log('╔═══════════════════════════════════════════════╗');
  console.log(`║  Exercise Video Matcher — ${TARGETS.length} targets          ║`);
  console.log('╚═══════════════════════════════════════════════╝');

  const results = {};
  TARGETS.forEach(e => { results[e] = { url: null, source: null, confidence: 0, reason: '' }; });

  // ── Step 1+2: Cloudinary match ──
  const clVideos = await listCloudinary();

  console.log('\n═══ STEP 2: Gemini matching (Cloudinary) ═══\n');
  const clMatches = await geminiMatch(TARGETS, clVideos, 'Cloudinary');
  const stillNeed = [];

  for (const m of clMatches) {
    if (m.matchedIndex && m.confidence >= 50) {
      const v = clVideos[m.matchedIndex - 1];
      if (v) {
        results[m.target] = { url: v.url, source: 'Cloudinary (existing)', confidence: m.confidence, reason: m.reason };
        console.log(`  ✓ ${m.target} → ${v.name} (${m.confidence}%)`);
        continue;
      }
    }
    stillNeed.push(m.target);
  }
  // Catch any targets not in Gemini response
  for (const t of TARGETS) {
    if (!results[t].url && !stillNeed.includes(t)) stillNeed.push(t);
  }
  console.log(`\n  Cloudinary matched: ${TARGETS.length - stillNeed.length}/${TARGETS.length}`);
  console.log(`  Still need: ${stillNeed.length} → ${stillNeed.join(', ')}`);

  // ── Step 3+4: MuscleWiki ──
  if (stillNeed.length > 0) {
    const mwAll = await fetchMuscleWiki();

    if (mwAll.length > 0) {
      console.log('\n═══ STEP 4: Gemini matching (MuscleWiki) ═══\n');

      // Process in batches of 300 for Gemini context limits
      const BATCH = 300;
      const remaining = [...stillNeed];

      for (let i = 0; i < mwAll.length && remaining.length > 0; i += BATCH) {
        const batch = mwAll.slice(i, i + BATCH).map(e => ({
          id: e.id,
          name: e.name || e.title || `exercise_${e.id}`,
        }));
        console.log(`\n  Batch ${Math.floor(i/BATCH)+1}: ${remaining.length} targets ↔ ${batch.length} MW exercises`);

        const mwMatches = await geminiMatch(remaining, batch, 'MuscleWiki');
        const matched = [];

        for (const m of mwMatches) {
          if (m.matchedIndex && m.confidence >= 50) {
            const ex = batch[m.matchedIndex - 1];
            if (!ex) continue;

            // Fetch video for this exercise
            console.log(`  Fetching video for ${ex.name} (id=${ex.id})...`);
            let videoUrl = await fetchMWVideo(ex.id);

            if (!videoUrl) {
              // Try detail endpoint
              const detail = await fetchMWDetail(ex.id);
              if (detail) {
                videoUrl = detail.male?.video || detail.female?.video ||
                           detail.videos?.[0]?.url || detail.video_url || null;
                if (!videoUrl && detail.male?.gif) videoUrl = detail.male.gif;
                if (!videoUrl) {
                  console.log(`    Detail keys: ${Object.keys(detail).join(', ')}`);
                }
              }
            }

            if (videoUrl) {
              console.log(`  ✓ ${m.target} → ${ex.name} (${m.confidence}%) video: YES`);
              // Download & upload to Cloudinary
              try {
                const clUrl = await downloadAndUpload(videoUrl, m.target);
                results[m.target] = { url: clUrl || videoUrl, source: 'MuscleWiki → Cloudinary', confidence: m.confidence, reason: m.reason, mwName: ex.name };
              } catch (err) {
                console.error(`    Upload failed: ${err.message}`);
                results[m.target] = { url: videoUrl, source: 'MuscleWiki (direct)', confidence: m.confidence, reason: m.reason, mwName: ex.name };
              }
              matched.push(m.target);
            } else {
              console.log(`  ~ ${m.target} → ${ex.name} (${m.confidence}%) video: NONE`);
            }
            await sleep(200);
          }
        }

        for (const t of matched) {
          const idx = remaining.indexOf(t);
          if (idx >= 0) remaining.splice(idx, 1);
        }
        await sleep(1000);
      }
    }
  }

  // ══════════════════════════════════════════════════
  // ── FINAL REPORT ──
  // ══════════════════════════════════════════════════
  const matched = [], unmatched = [];
  for (const [name, info] of Object.entries(results)) {
    if (info.url) matched.push({ exercise: name, ...info });
    else unmatched.push({ exercise: name, ...info });
  }

  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL REPORT                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  console.log('═══ MATCHED (with URLs) ═══\n');
  for (const m of matched) {
    console.log(`  ✓ ${m.exercise}`);
    console.log(`    URL: ${m.url}`);
    console.log(`    Source: ${m.source} | Confidence: ${m.confidence}% | ${m.reason}`);
    console.log();
  }

  console.log('═══ UNMATCHED (no video) ═══\n');
  for (const u of unmatched) {
    console.log(`  ✗ ${u.exercise}${u.reason ? ` — ${u.reason}` : ''}`);
  }

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Total: ${TARGETS.length} | Matched: ${matched.length} | Unmatched: ${unmatched.length}`);

  const out = path.join(__dirname, 'exercise-match-results.json');
  fs.writeFileSync(out, JSON.stringify({ matched, unmatched, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`  Saved: ${out}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
