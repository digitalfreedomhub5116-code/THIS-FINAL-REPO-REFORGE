/**
 * populate-exercise-gifs.ts
 *
 * One-time script to populate workout_exercises.video_url with videos from MuscleWiki.
 *
 * Pipeline:
 *   Phase 1: Fetch MuscleWiki exercise names (paginated)
 *   Phase 2: Gemini AI match our 216 DB exercises → MuscleWiki
 *   Phase 3: Download matched MP4s locally to scripts/exercise-videos/
 *   Phase 4: Upload local MP4s to Cloudinary
 *   Phase 5: Update workout_exercises.video_url in Supabase
 *   Phase 6: Generate updated exerciseVideos map + write CSV report
 *
 * Usage:  npm run populate-gifs
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, writeFileSync, existsSync, readFileSync, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createObjectCsvWriter } from 'csv-writer';

// ── Load .env ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// ── Validate required env vars ──
const REQUIRED_VARS = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'MUSCLEWIKI_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'GEMINI_API_KEY',
];
for (const key of REQUIRED_VARS) {
  if (!process.env[key]) {
    console.error(`❌ Missing env var: ${key}`);
    process.exit(1);
  }
}

const MW_KEY = process.env.MUSCLEWIKI_KEY!;
const MW_BASE = 'https://api.musclewiki.com';
const VIDEOS_DIR = join(__dirname, 'exercise-videos');
const MATCHES_CACHE = join(__dirname, 'matches-cache.json');

// ── Init Supabase (service role) ──
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ── Init Cloudinary ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Init Gemini ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

// ── API call counter ──
let mwApiCalls = 0;
const MW_CALL_LIMIT = 950; // safety margin under 1000

function checkBudget(needed: number = 1): boolean {
  if (mwApiCalls + needed > MW_CALL_LIMIT) {
    console.error(`\n🛑 API budget exceeded! Used ${mwApiCalls}/${MW_CALL_LIMIT}. Stopping.`);
    return false;
  }
  return true;
}

// ── Types ──
interface MyExercise {
  id: string;
  name: string;
}

interface MWExercise {
  id: number;
  name: string;
}

interface MWVideo {
  url: string;
  angle: string;
  gender: string;
}

interface GeminiMatch {
  my_name: string;
  matched_name: string;
  confidence: number;
}

interface ProcessedExercise {
  my_id: string;
  my_name: string;
  matched_name: string;
  mw_id: number;
  confidence: number;
  local_path: string;
  cloudinary_url: string;
  status: string;
}

// ── Helpers ──
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Sanitize exercise name into a safe filename / Cloudinary public_id. */
function toSafeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 80);
}

/** Fetch exercise detail from MuscleWiki and return the best video URL (male, front). */
async function getMWVideoUrl(mwId: number): Promise<string | null> {
  if (!checkBudget()) return null;
  const res = await fetch(`${MW_BASE}/exercises/${mwId}`, {
    headers: { 'X-API-Key': MW_KEY },
  });
  mwApiCalls++;
  if (!res.ok) return null;
  const detail = await res.json();
  const videos: MWVideo[] = detail.videos || [];
  if (videos.length === 0) return null;

  // Prefer male + front angle
  const maleFront = videos.find((v) => v.gender === 'male' && v.angle === 'front');
  if (maleFront) return maleFront.url;
  const male = videos.find((v) => v.gender === 'male');
  if (male) return male.url;
  return videos[0].url;
}

/** Download MP4 from MuscleWiki to local file. */
async function downloadVideo(videoUrl: string, localPath: string): Promise<void> {
  if (!checkBudget()) throw new Error('API budget exceeded');
  const res = await fetch(videoUrl, {
    headers: { 'X-API-Key': MW_KEY },
  });
  mwApiCalls++;
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(localPath, buf);
}

/** Upload local MP4 to Cloudinary. */
async function uploadLocalToCloudinary(localPath: string, publicId: string): Promise<string> {
  const buf = readFileSync(localPath);
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'workout_exercises',
        public_id: publicId,
        resource_type: 'video',
        overwrite: true,
        format: 'mp4',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!.secure_url);
      }
    );
    const readable = Readable.from(buf);
    readable.pipe(uploadStream);
  });
}

/** Ask Gemini to match a batch of exercise names against MuscleWiki names. */
async function geminiMatchBatch(
  myNames: string[],
  mwNames: string[]
): Promise<GeminiMatch[]> {
  const prompt = `You are an exercise name matcher. I have a list of exercise names from MY database and a list from MuscleWiki. For each of my exercise names, find the BEST matching exercise from the MuscleWiki list.

MY EXERCISES:
${myNames.map((n, i) => `${i + 1}. ${n}`).join('\n')}

MUSCLEWIKI EXERCISES:
${mwNames.join('\n')}

For each of my exercises, respond with a JSON array. Each element must have:
- "my_name": the exact name from MY list
- "matched_name": the exact name from the MuscleWiki list that best matches (or "" if no reasonable match)
- "confidence": integer 0-100 representing how confident you are this is the same exercise

Rules:
- Match by the actual exercise movement, not just word similarity
- "Bench Press" should match "Barbell Bench Press" with high confidence
- "Hammer Curl" should match "Dumbbell Hammer Curl" with high confidence
- Stretches, mobility drills, and very specific exercises may have no match — give confidence 0 and matched_name ""
- Equipment variations are OK (e.g. "Cable Fly" → "Cable Fly" is a match)
- Do NOT force bad matches. If unsure, give low confidence.

Respond with ONLY valid JSON array, no markdown, no explanation:
[{"my_name":"...","matched_name":"...","confidence":95}, ...]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    return JSON.parse(cleaned) as GeminiMatch[];
  } catch {
    console.error('  ⚠️ Failed to parse Gemini response, retrying...');
    console.error('  Raw:', text.substring(0, 200));
    await sleep(2000);
    const retry = await model.generateContent(prompt);
    const retryText = retry.response.text().trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(retryText) as GeminiMatch[];
  }
}

// ══════════════════════════════════════════════════════════════
// ── MAIN ──
// ══════════════════════════════════════════════════════════════
async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  EXERCISE VIDEO POPULATION (MuscleWiki + Gemini AI)');
  console.log('══════════════════════════════════════════════\n');

  // Create local videos directory
  mkdirSync(VIDEOS_DIR, { recursive: true });

  // ═══════════════════════════════════════════
  // PHASE 1: Fetch MuscleWiki exercise names
  // ═══════════════════════════════════════════
  console.log('PHASE 1: Fetching MuscleWiki exercise library...');
  const mwExercises: MWExercise[] = [];
  const PAGE_SIZE = 100;
  let offset = 0;

  while (true) {
    if (!checkBudget()) break;
    const res = await fetch(`${MW_BASE}/exercises?limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { 'X-API-Key': MW_KEY },
    });
    mwApiCalls++;
    if (!res.ok) {
      console.error(`  ⚠️ HTTP ${res.status} at offset ${offset}, stopping.`);
      break;
    }
    const data = await res.json();
    const results: MWExercise[] = data.results || [];
    if (results.length === 0) break;
    mwExercises.push(...results);
    process.stdout.write(`\r  Fetched ${mwExercises.length}/${data.total} exercises (${mwApiCalls} API calls used)...`);
    offset += PAGE_SIZE;
    if (mwExercises.length >= data.total) break;
    await sleep(500);
  }
  console.log(`\n✅ Fetched ${mwExercises.length} exercises from MuscleWiki. (${mwApiCalls} API calls)\n`);

  // Build lookup: lowercase name → MWExercise
  const mwMap = new Map<string, MWExercise>();
  for (const e of mwExercises) {
    mwMap.set(e.name.toLowerCase(), e);
  }
  const mwNames = mwExercises.map((e) => e.name);

  // ═══════════════════════════════════════════
  // PHASE 2: Fetch our exercises + Gemini match
  // ═══════════════════════════════════════════
  console.log('PHASE 2: Fetching our exercises + Gemini AI matching...');
  const { data: myExercises, error: fetchErr } = await (supabase as any)
    .from('workout_exercises')
    .select('id, name')
    .order('id', { ascending: true });
  if (fetchErr) {
    console.error('❌ Failed to fetch workout_exercises:', fetchErr.message);
    process.exit(1);
  }
  const exercises: MyExercise[] = myExercises || [];
  console.log(`  Found ${exercises.length} exercises in our DB.`);

  if (exercises.length === 0) {
    console.log('⚠️  No exercises to process. Exiting.');
    return;
  }

  const BATCH_SIZE = 15;
  const allMatches: GeminiMatch[] = [];
  const batches = Math.ceil(exercises.length / BATCH_SIZE);

  console.log(`  Matching with Gemini AI (${batches} batches of ~${BATCH_SIZE})...\n`);

  for (let b = 0; b < batches; b++) {
    const start = b * BATCH_SIZE;
    const batch = exercises.slice(start, start + BATCH_SIZE);
    const batchNames = batch.map((e) => e.name);

    console.log(`  Batch ${b + 1}/${batches}: ${batchNames.length} exercises...`);
    try {
      const matches = await geminiMatchBatch(batchNames, mwNames);
      allMatches.push(...matches);
      console.log(`  ✅ Got ${matches.length} matches`);
    } catch (err: any) {
      console.error(`  ❌ Batch ${b + 1} failed: ${err.message}`);
      for (const name of batchNames) {
        allMatches.push({ my_name: name, matched_name: '', confidence: 0 });
      }
    }
    if (b < batches - 1) await sleep(3000);
  }

  // Save matches cache (so we don't redo Gemini if re-run)
  writeFileSync(MATCHES_CACHE, JSON.stringify(allMatches, null, 2));
  console.log(`\n✅ Gemini matching done. Cached to ${MATCHES_CACHE}\n`);

  // Build lookup: my_name (lowercase) → GeminiMatch
  const matchMap = new Map<string, GeminiMatch>();
  for (const m of allMatches) {
    matchMap.set(m.my_name.toLowerCase(), m);
  }

  // ═══════════════════════════════════════════
  // PHASE 3: Download matched videos locally
  // ═══════════════════════════════════════════
  console.log('PHASE 3: Downloading matched videos locally...\n');

  const processed: ProcessedExercise[] = [];
  const total = exercises.length;

  for (let i = 0; i < total; i++) {
    const ex = exercises[i];
    const match = matchMap.get(ex.name.toLowerCase());
    const prefix = `[${i + 1}/${total}]`;
    const safeName = toSafeName(ex.name);
    const localPath = join(VIDEOS_DIR, `${safeName}.mp4`);

    // No match or low confidence
    if (!match || !match.matched_name || match.confidence < 50) {
      const conf = match?.confidence || 0;
      console.log(`${prefix} ${ex.name} → NO MATCH (${conf}%) ❌`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: match?.matched_name || '',
        mw_id: 0, confidence: conf, local_path: '', cloudinary_url: '', status: 'NO_MATCH',
      });
      continue;
    }

    const confidence = match.confidence;
    const matchedName = match.matched_name;
    const mwEntry = mwMap.get(matchedName.toLowerCase());

    if (!mwEntry) {
      console.log(`${prefix} ${ex.name} → ${matchedName} (${confidence}%) ⚠️ MAP_MISS`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: 0, confidence, local_path: '', cloudinary_url: '', status: 'MAP_MISS',
      });
      continue;
    }

    if (confidence < 80) {
      console.log(`${prefix} ${ex.name} → ${matchedName} (${confidence}%) 🟡 NEEDS REVIEW`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: mwEntry.id, confidence, local_path: '', cloudinary_url: '', status: 'NEEDS_REVIEW',
      });
      continue;
    }

    // ≥80% confidence — download
    // Skip if already downloaded locally
    if (existsSync(localPath)) {
      console.log(`${prefix} ${ex.name} → ${matchedName} (${confidence}%) 📁 Already downloaded`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: mwEntry.id, confidence, local_path: localPath, cloudinary_url: '', status: 'DOWNLOADED',
      });
      continue;
    }

    if (!checkBudget(2)) {  // need 1 detail + 1 download
      console.log(`${prefix} ${ex.name} → BUDGET STOP 🛑`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: mwEntry.id, confidence, local_path: '', cloudinary_url: '', status: 'BUDGET_STOP',
      });
      continue;
    }

    try {
      const videoUrl = await getMWVideoUrl(mwEntry.id);
      if (!videoUrl) throw new Error('No video available');

      await downloadVideo(videoUrl, localPath);
      console.log(`${prefix} ${ex.name} → ${matchedName} (${confidence}%) 📥 Downloaded (${mwApiCalls} API calls)`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: mwEntry.id, confidence, local_path: localPath, cloudinary_url: '', status: 'DOWNLOADED',
      });
    } catch (err: any) {
      console.log(`${prefix} ${ex.name} → ${matchedName} (${confidence}%) ⚠️ Download failed: ${err.message}`);
      processed.push({
        my_id: ex.id, my_name: ex.name, matched_name: matchedName,
        mw_id: mwEntry.id, confidence, local_path: '', cloudinary_url: '', status: 'DOWNLOAD_FAILED',
      });
    }

    await sleep(1000);
  }

  const downloaded = processed.filter((p) => p.status === 'DOWNLOADED');
  console.log(`\n✅ Phase 3 done. ${downloaded.length} videos downloaded locally. (${mwApiCalls} total API calls)\n`);

  // ═══════════════════════════════════════════
  // PHASE 4: Upload to Cloudinary
  // ═══════════════════════════════════════════
  console.log('PHASE 4: Uploading to Cloudinary...\n');

  for (let i = 0; i < downloaded.length; i++) {
    const p = downloaded[i];
    const prefix = `[${i + 1}/${downloaded.length}]`;
    try {
      const publicId = toSafeName(p.my_name);
      const cloudinaryUrl = await uploadLocalToCloudinary(p.local_path, publicId);
      p.cloudinary_url = cloudinaryUrl;
      p.status = 'UPLOADED';
      console.log(`${prefix} ${p.my_name} → ✅ ${cloudinaryUrl}`);
    } catch (err: any) {
      console.log(`${prefix} ${p.my_name} → ⚠️ Upload failed: ${err.message}`);
      p.status = 'UPLOAD_FAILED';
    }
    await sleep(500);
  }

  const uploaded = processed.filter((p) => p.status === 'UPLOADED');
  console.log(`\n✅ Phase 4 done. ${uploaded.length} videos uploaded to Cloudinary.\n`);

  // ═══════════════════════════════════════════
  // PHASE 5: Update Supabase DB + wipe old URLs
  // ═══════════════════════════════════════════
  console.log('PHASE 5: Updating Supabase workout_exercises...\n');

  // First wipe all video_url
  const { error: wipeErr } = await (supabase as any)
    .from('workout_exercises')
    .update({ video_url: null })
    .gt('id', 0);
  if (wipeErr) {
    console.error('❌ Failed to wipe video_url:', wipeErr.message);
  } else {
    console.log('  Wiped all existing video_url fields.');
  }

  let dbUpdated = 0;
  for (const p of uploaded) {
    const { error: updateErr } = await (supabase as any)
      .from('workout_exercises')
      .update({ video_url: p.cloudinary_url })
      .eq('id', p.my_id);
    if (updateErr) {
      console.log(`  ⚠️ DB update failed for ${p.my_name}: ${updateErr.message}`);
    } else {
      p.status = 'COMPLETE';
      dbUpdated++;
    }
  }
  console.log(`\n✅ Phase 5 done. ${dbUpdated} exercises updated in Supabase.\n`);

  // ═══════════════════════════════════════════
  // PHASE 6: Generate exerciseVideos map + CSV
  // ═══════════════════════════════════════════
  console.log('PHASE 6: Generating exerciseVideos update + CSV report...\n');

  // Generate a partial map for exerciseVideos.ts
  const videoMapEntries = processed
    .filter((p) => p.status === 'COMPLETE')
    .map((p) => `  '${p.my_name.replace(/'/g, "\\'")}': '${p.cloudinary_url}',`)
    .join('\n');

  const videoMapFile = join(__dirname, 'new-exercise-videos-map.ts');
  writeFileSync(videoMapFile, `// Auto-generated Cloudinary URLs from MuscleWiki matching
// Copy these entries into lib/exerciseVideos.ts EXERCISE_VIDEOS map
// Generated: ${new Date().toISOString()}

export const NEW_EXERCISE_VIDEOS: Record<string, string> = {
${videoMapEntries}
};
`);
  console.log(`  ✅ Video map written to: ${videoMapFile}`);

  // Write CSV
  const csvPath = join(__dirname, 'review_results.csv');
  const csvWriter = createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'my_name', title: 'my_name' },
      { id: 'matched_name', title: 'matched_name' },
      { id: 'confidence', title: 'confidence' },
      { id: 'cloudinary_url', title: 'cloudinary_url' },
      { id: 'status', title: 'status' },
    ],
  });
  await csvWriter.writeRecords(processed.map((p) => ({
    my_name: p.my_name,
    matched_name: p.matched_name,
    confidence: p.confidence,
    cloudinary_url: p.cloudinary_url,
    status: p.status,
  })));
  console.log(`  ✅ CSV written to: ${csvPath}`);

  // ─── Final Summary ───
  const stats = {
    total: processed.length,
    complete: processed.filter((p) => p.status === 'COMPLETE').length,
    needsReview: processed.filter((p) => p.status === 'NEEDS_REVIEW').length,
    noMatch: processed.filter((p) => p.status === 'NO_MATCH').length,
    mapMiss: processed.filter((p) => p.status === 'MAP_MISS').length,
    downloadFailed: processed.filter((p) => p.status === 'DOWNLOAD_FAILED').length,
    uploadFailed: processed.filter((p) => p.status === 'UPLOAD_FAILED').length,
    budgetStop: processed.filter((p) => p.status === 'BUDGET_STOP').length,
  };

  console.log('\n══════════════════════════════════════════════');
  console.log('  FINAL SUMMARY');
  console.log('══════════════════════════════════════════════');
  console.log(`  Total exercises:       ${stats.total}`);
  console.log(`  ✅ Complete:           ${stats.complete}`);
  console.log(`  🟡 Needs review:       ${stats.needsReview}`);
  console.log(`  ❌ No match:           ${stats.noMatch}`);
  console.log(`  ⚠️  Map miss:           ${stats.mapMiss}`);
  console.log(`  ⚠️  Download failed:    ${stats.downloadFailed}`);
  console.log(`  ⚠️  Upload failed:      ${stats.uploadFailed}`);
  console.log(`  🛑 Budget stop:        ${stats.budgetStop}`);
  console.log(`  📡 MuscleWiki API:     ${mwApiCalls}/${MW_CALL_LIMIT} calls`);
  console.log(`  📁 Local videos:       ${VIDEOS_DIR}`);
  console.log('══════════════════════════════════════════════\n');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
