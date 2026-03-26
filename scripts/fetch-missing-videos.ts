/**
 * Targeted script to fetch MuscleWiki videos for specific exercises
 * that were missed or had low confidence in the original run.
 *
 * Target exercises:
 *   - Arnold Press
 *   - Preacher Curl (EZ bar / dumbbell, NOT kettlebell)
 *   - Treadmill Walk / Brisk Walk
 *   - Dynamic Stretching / Static Stretching / Shoulder Stretch
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';
import { Readable } from 'stream';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const MW_KEY = process.env.MUSCLEWIKI_KEY!;
const MW_BASE = 'https://api.musclewiki.com';
const VIDEOS_DIR = join(__dirname, 'targeted-videos');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

let apiCalls = 0;

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function toSafeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 80);
}

interface MWExercise { id: number; name: string; }
interface MWVideo { url: string; angle: string; gender: string; }

// ── Fetch full MuscleWiki exercise list ──
async function fetchAllMW(): Promise<MWExercise[]> {
  const all: MWExercise[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(`${MW_BASE}/exercises?limit=100&offset=${offset}`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    apiCalls++;
    if (!res.ok) break;
    const data = await res.json();
    const results: MWExercise[] = data.results || [];
    if (results.length === 0) break;
    all.push(...results);
    process.stdout.write(`\r  Fetched ${all.length} MuscleWiki exercises...`);
    offset += 100;
    if (all.length >= data.total) break;
    await sleep(300);
  }
  console.log(`\n  Total: ${all.length} exercises (${apiCalls} API calls)\n`);
  return all;
}

// ── Get video URL from MuscleWiki exercise detail ──
async function getMWVideo(mwId: number): Promise<string | null> {
  const res = await fetch(`${MW_BASE}/exercises/${mwId}`, {
    headers: { 'X-API-Key': MW_KEY },
  });
  apiCalls++;
  if (!res.ok) return null;
  const detail = await res.json();
  const videos: MWVideo[] = detail.videos || [];
  if (videos.length === 0) return null;
  const maleFront = videos.find(v => v.gender === 'male' && v.angle === 'front');
  if (maleFront) return maleFront.url;
  const male = videos.find(v => v.gender === 'male');
  if (male) return male.url;
  return videos[0].url;
}

// ── Download video ──
async function downloadVideo(videoUrl: string, localPath: string): Promise<void> {
  const res = await fetch(videoUrl, { headers: { 'X-API-Key': MW_KEY } });
  apiCalls++;
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
}

// ── Upload to Cloudinary ──
async function uploadToCloudinary(localPath: string, publicId: string): Promise<string> {
  const buf = readFileSync(localPath);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'workout_exercises', public_id: publicId, resource_type: 'video', overwrite: true, format: 'mp4' },
      (err, result) => { if (err) reject(err); else resolve(result!.secure_url); }
    );
    Readable.from(buf).pipe(stream);
  });
}

// ── Target exercises: our name → MuscleWiki search keywords ──
const TARGETS: { ourName: string; searchTerms: string[] }[] = [
  { ourName: 'Arnold Press', searchTerms: ['arnold'] },
  { ourName: 'Preacher Curl', searchTerms: ['preacher'] },
  { ourName: 'Brisk Walk', searchTerms: ['treadmill walk'] },
  { ourName: 'Dynamic Stretching', searchTerms: ['dynamic stretch', 'warm up'] },
  { ourName: 'Static Stretching', searchTerms: ['static stretch', 'cool down'] },
  { ourName: 'Shoulder Stretch', searchTerms: ['shoulder stretch', 'shoulders stretch'] },
];

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  TARGETED VIDEO FETCH');
  console.log('═══════════════════════════════════════\n');

  mkdirSync(VIDEOS_DIR, { recursive: true });

  // Step 1: Fetch full MuscleWiki list
  console.log('Step 1: Fetching MuscleWiki exercise list...');
  const mwList = await fetchAllMW();

  // Step 2: Search for each target exercise
  console.log('Step 2: Searching for target exercises...\n');

  const results: { ourName: string; mwName: string; mwId: number; cloudinaryUrl: string }[] = [];

  for (const target of TARGETS) {
    console.log(`  🔍 Searching for: ${target.ourName}`);

    // Find best MuscleWiki match
    let bestMatch: MWExercise | null = null;
    const lowerList = mwList.map(e => ({ ...e, lower: e.name.toLowerCase() }));

    for (const term of target.searchTerms) {
      const termLower = term.toLowerCase();
      // Exact substring match
      const matches = lowerList.filter(e => e.lower.includes(termLower));
      if (matches.length > 0) {
        // Print all matches for visibility
        console.log(`     Found ${matches.length} matches for "${term}":`);
        for (const m of matches.slice(0, 8)) {
          console.log(`       - [${m.id}] ${m.name}`);
        }
        // Pick the best one (prefer shortest name = most specific)
        if (!bestMatch) {
          bestMatch = matches.sort((a, b) => a.name.length - b.name.length)[0];
        }
        break;
      }
    }

    if (!bestMatch) {
      console.log(`     ❌ No MuscleWiki match found\n`);
      continue;
    }

    console.log(`     ✅ Best match: [${bestMatch.id}] ${bestMatch.name}`);

    // Step 3: Get video URL
    const videoUrl = await getMWVideo(bestMatch.id);
    if (!videoUrl) {
      console.log(`     ⚠️ No video available for this exercise\n`);
      continue;
    }
    console.log(`     📹 Video URL found`);

    // Step 4: Download
    const safeName = toSafeName(target.ourName);
    const localPath = join(VIDEOS_DIR, `${safeName}.mp4`);
    try {
      await downloadVideo(videoUrl, localPath);
      console.log(`     📥 Downloaded to ${safeName}.mp4`);
    } catch (err: any) {
      console.log(`     ❌ Download failed: ${err.message}\n`);
      continue;
    }

    // Step 5: Upload to Cloudinary
    try {
      const cloudUrl = await uploadToCloudinary(localPath, safeName);
      console.log(`     ☁️  Uploaded: ${cloudUrl}`);
      results.push({ ourName: target.ourName, mwName: bestMatch.name, mwId: bestMatch.id, cloudinaryUrl: cloudUrl });
    } catch (err: any) {
      console.log(`     ❌ Cloudinary upload failed: ${err.message}`);
    }

    console.log('');
    await sleep(500);
  }

  // Step 6: Print summary & update instructions
  console.log('\n═══════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════\n');

  for (const r of results) {
    console.log(`  ${r.ourName}`);
    console.log(`    MuscleWiki: ${r.mwName} (ID: ${r.mwId})`);
    console.log(`    Cloudinary: ${r.cloudinaryUrl}\n`);
  }

  // Step 7: Update Supabase DB
  if (results.length > 0) {
    console.log('Step 7: Updating Supabase DB...\n');
    for (const r of results) {
      const { data, error } = await supabase
        .from('workout_exercises')
        .update({ video_url: r.cloudinaryUrl })
        .ilike('name', r.ourName)
        .select('id, name');

      if (error) {
        console.log(`  ❌ DB update failed for ${r.ourName}: ${error.message}`);
      } else if (data && data.length > 0) {
        console.log(`  ✅ DB updated: ${r.ourName} (id: ${data[0].id})`);
      } else {
        console.log(`  ⚠️ ${r.ourName} not found in DB (may be hardcoded only)`);
      }
    }
  }

  console.log(`\n  Total API calls used: ${apiCalls}`);
  console.log('\n═══════════════════════════════════════');
  console.log('  DONE — Copy the Cloudinary URLs above');
  console.log('  into lib/exerciseVideos.ts');
  console.log('═══════════════════════════════════════');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
