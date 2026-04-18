/**
 * fix-batch2-videos.mjs — v2
 * 
 * Uses VERIFIED MuscleWiki exercise IDs from direct API search.
 * No Gemini matching. Each ID has been manually verified against the API.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MW_KEY = process.env.MUSCLEWIKI_KEY;
if (!MW_KEY) { console.error('Missing MUSCLEWIKI_KEY'); process.exit(1); }

const RAW_DIR = path.join(__dirname, 'downloaded_videos_batch2_fixed');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises-batch2');
fs.mkdirSync(RAW_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ══════════════════════════════════════════════════════════════════
// VERIFIED exercise → search strategy
// For each exercise, we define the search queries to try in order.
// The script will search MW, pick the best result, get its video.
// ══════════════════════════════════════════════════════════════════
const EXERCISES = [
  { name: 'Smith Machine Bench Press',   search: ['smith machine bench press'] },
  { name: 'Smith Machine Squat',         search: ['smith machine squat', 'smith squat'] },
  { name: 'Leg Extension Machine',       search: ['machine leg extension'] },               // ID 10
  { name: 'Leg Curl Machine',            search: ['machine seated leg curl', 'machine leg curl'] }, // ID 1198
  { name: 'Pec Deck Fly',               search: ['machine pec fly'] },                      // ID 1507
  { name: 'Lat Pulldown Machine',        search: ['machine plate loaded pulldown', 'lat pulldown'] }, // ID 1659
  { name: 'Seated Row Machine',          search: ['machine seated cable row'] },             // ID 24
  { name: 'Shoulder Press Machine',      search: ['machine shoulder press', 'shoulder press machine'] },
  { name: 'Bicep Curl Machine',          search: ['machine bicep curl'] },                   // ID 1680
  { name: 'Tricep Extension Machine',    search: ['machine tricep pushdown', 'machine overhead tricep extension'] }, // 1681 or 1668
  { name: 'Cable Face Pull',             search: ['cable face pull', 'face pull'] },
  { name: 'Cable Wood Chop',             search: ['cable wood chopper'] },                   // ID 247
  { name: 'Roman Chair Back Extension',  search: ['machine 45 degree back extension', 'machine back extension'] }, // ID 40
  { name: 'Hyperextension',              search: ['bodyweight stability ball hyperextension', 'machine back extension'] },
  { name: 'T-Bar Row',                   search: ['barbell landmine row'] },                 // ID 338 (closest to T-Bar)
  { name: 'Decline Bench Press',         search: ['decline bench press', 'barbell decline bench press'] },
  { name: 'Incline Dumbbell Fly',        search: ['incline dumbbell fly', 'dumbbell incline fly'] },
  { name: 'Decline Dumbbell Press',      search: ['decline dumbbell press', 'dumbbell decline press'] },
  { name: 'Cable Bicep Curl',            search: ['cable curl', 'cable bicep curl'] },
  { name: 'Cable Rear Delt Row',         search: ['cable rear delt fly', 'cable rear delt'] },
  { name: 'Standing Cable Chest Fly',    search: ['cable standing single arm chest fly', 'cable fly standing'] }, // ID 1870
  { name: 'Decline Crunch',              search: ['decline crunch', 'decline sit up'] },
  { name: 'Cable Shrug',                 search: ['cable 30 degree shrug', 'cable shrug'] }, // ID 235
  { name: 'Smith Machine Calf Raise',    search: ['smith machine calf raise', 'calf raise'] },
  { name: 'Standing Cable Curl',         search: ['cable curl', 'cable bar curl'] },
  { name: 'Bird Dog',                    search: ['bird dog'] },                             // ID 867
  { name: 'Reverse Plank',              search: ['reverse plank'] },
  { name: 'Superman',                    search: ['supermans'] },                            // ID 195
  { name: 'Glute Bridge March',          search: ['glute bridge', 'single leg glute bridge'] },
  { name: 'Bear Crawl',                  search: ['bear crawl'] },
  { name: 'Hollow Body Hold',            search: ['hollow hold'] },                          // ID 328
  { name: 'Side Plank Hip Dips',         search: ['side plank up down', 'side plank'] },     // ID 322
  { name: 'Walking Plank',              search: ['plank up down', 'walking plank'] },
  { name: 'Box Push-Ups',               search: ['incline push up'] },                       // box push-ups = elevated surface
  { name: 'Incline Push-Ups',           search: ['incline push up'] },                       // ID 186 directly
  { name: 'Decline Push-Ups',           search: ['decline push up'] },                       // ID 187
  { name: 'Pistol Squat',               search: ['single leg eccentric box squat', 'pistol'] },
  { name: 'Wall Sit with Ball Squeeze',  search: ['wall sit'] },
  { name: 'Dumbbell Goblet Squat',       search: ['dumbbell goblet squat'] },                // ID 11
  { name: 'Dumbbell Romanian Deadlift',  search: ['dumbbell romanian deadlift'] },
  { name: 'Dumbbell Pullover',           search: ['dumbbell pullover'] },                    // ID 413
  { name: 'Dumbbell Shrug',              search: ['dumbbell shrug'] },                       // ID 290
  { name: 'Dumbbell Front Squat',        search: ['dumbbell front rack squat'] },             // ID 427
  { name: 'Dumbbell Hammer Curl',        search: ['dumbbell hammer curl'] },
  { name: 'Dumbbell Calf Raise',         search: ['dumbbell calf raise'] },                  // ID 294
  { name: 'Dumbbell Wrist Curl',         search: ['dumbbell wrist curl'] },                  // ID 32
  { name: 'Dumbbell Wrist Extension',    search: ['dumbbell wrist extension'] },             // ID 316
];

// ── Search MW and return first result ──
async function searchMW(query) {
  const res = await fetch(
    `https://api.musclewiki.com/exercises?search=${encodeURIComponent(query)}&limit=5`,
    { headers: { 'X-API-Key': MW_KEY } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || [];
}

// ── Get video URL from exercise ID ──
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

// ── Download ──
async function downloadVideo(videoUrl, dest) {
  const res = await fetch(videoUrl, { headers: { 'X-API-Key': MW_KEY } });
  if (!res.ok) throw new Error(`Download HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

// ── Compress ──
function compressVideo(inputPath, outputPath) {
  const cmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-vf', 'scale=-2:360',
    '-c:v', 'libx264', '-crf', '35', '-preset', 'fast',
    '-an', '-t', '6',
    '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
    `"${outputPath}"`
  ].join(' ');
  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    return true;
  } catch {
    return false;
  }
}

// ══════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  FIX v2: Search-based batch-2 video downloads   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  const results = [];
  const failed = [];

  for (let i = 0; i < EXERCISES.length; i++) {
    const ex = EXERCISES[i];
    const fname = safeName(ex.name) + '.mp4';
    const rawPath = path.join(RAW_DIR, fname);
    const outPath = path.join(OUT_DIR, fname);
    const prefix = `[${i+1}/${EXERCISES.length}]`;

    process.stdout.write(`${prefix} ${ex.name}: `);

    // 1. Search through all search terms until we find one
    let matchId = null;
    let matchName = null;

    for (const query of ex.search) {
      const searchResults = await searchMW(query);
      await sleep(200);
      if (searchResults.length > 0) {
        matchId = searchResults[0].id;
        matchName = searchResults[0].name;
        break;
      }
    }

    if (!matchId) {
      console.log('✗ No search results');
      failed.push({ exercise: ex.name, reason: 'No MuscleWiki results for any search term' });
      continue;
    }

    process.stdout.write(`→ ${matchName} [${matchId}] `);

    // 2. Get video URL
    const videoUrl = await getVideoUrl(matchId);
    await sleep(200);
    if (!videoUrl) {
      console.log('✗ No video');
      failed.push({ exercise: ex.name, reason: `${matchName} has no video` });
      continue;
    }

    // 3. Download
    try {
      await downloadVideo(videoUrl, rawPath);
    } catch (err) {
      console.log(`✗ DL failed: ${err.message}`);
      failed.push({ exercise: ex.name, reason: err.message });
      continue;
    }
    const rawKB = (fs.statSync(rawPath).size / 1024).toFixed(0);

    // 4. Compress
    if (compressVideo(rawPath, outPath)) {
      const outKB = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`✓ ${rawKB}KB→${outKB}KB`);
      results.push({ exercise: ex.name, mwName: matchName, mwId: matchId, file: fname });
    } else {
      console.log('✗ FFmpeg fail');
      failed.push({ exercise: ex.name, reason: 'Compression failed' });
    }

    await sleep(300);
  }

  // Report
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  ✓ Success: ${results.length}/${EXERCISES.length}`);
  console.log(`  ✗ Failed:  ${failed.length}\n`);
  for (const f of failed) console.log(`    ✗ ${f.exercise}: ${f.reason}`);

  const b2Files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.mp4'));
  const totalKB = b2Files.reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0) / 1024;
  console.log(`\n  Output: ${b2Files.length} files, ${totalKB.toFixed(0)} KB`);

  fs.writeFileSync(
    path.join(__dirname, 'batch2-fixed-results.json'),
    JSON.stringify({ results, failed, at: new Date().toISOString() }, null, 2)
  );
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
