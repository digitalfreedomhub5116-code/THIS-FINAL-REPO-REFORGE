/**
 * fix-specific-videos.mjs
 * 
 * Fixes the remaining mismatched videos from the batch-2 fix run.
 * Each exercise here has a manually verified MuscleWiki exercise ID.
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
const RAW_DIR = path.join(__dirname, 'downloaded_videos_batch2_fixed');
const OUT_DIR = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises-batch2');
fs.mkdirSync(RAW_DIR, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));

function safeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// ── Exercises that need specific fixes ──
// Each has a verified MW search query that returns the correct exercise
const FIXES = [
  { name: 'Cable Bicep Curl',           search: 'cable bar curl',           pickIndex: 1 },  // ID 1021 Cable Bar Curl
  { name: 'Standing Cable Curl',        search: 'cable bar curl',           pickIndex: 1 },  // Same exercise, different name
  { name: 'Shoulder Press Machine',     search: 'machine overhead press',   pickIndex: 1 },  // ID 1508 Machine Overhand Overhead Press  
  { name: 'Decline Dumbbell Press',     search: 'dumbbell decline fly',     pickIndex: 0 },  // ID 382 Dumbbell Decline Chest Fly (closest)
  { name: 'Smith Machine Squat',        search: 'smith machine split squat',pickIndex: 0 },  // Better match than sissy squat
  { name: 'Smith Machine Bench Press',  search: 'smith machine bench press',pickIndex: 2 },  // ID 950 (exact), not guillotine
  { name: 'Decline Bench Press',        search: 'dumbbell decline bench press', pickIndex: 0 }, // Fix to actual decline press
];

async function searchMW(query) {
  const res = await fetch(
    `https://api.musclewiki.com/exercises?search=${encodeURIComponent(query)}&limit=5`,
    { headers: { 'X-API-Key': MW_KEY } }
  );
  if (!res.ok) return [];
  const json = await res.json();
  return json.results || [];
}

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

async function downloadVideo(videoUrl, dest) {
  const res = await fetch(videoUrl, { headers: { 'X-API-Key': MW_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

function compressVideo(inputPath, outputPath) {
  const cmd = [
    'ffmpeg', '-y', '-i', `"${inputPath}"`,
    '-vf', 'scale=-2:360', '-c:v', 'libx264', '-crf', '35', '-preset', 'fast',
    '-an', '-t', '6', '-movflags', '+faststart', '-pix_fmt', 'yuv420p',
    `"${outputPath}"`
  ].join(' ');
  try { execSync(cmd, { stdio: 'pipe', timeout: 30000 }); return true; }
  catch { return false; }
}

async function main() {
  console.log('═══ Fixing specific mismatched videos ═══\n');

  // First, let's see what search returns to verify
  for (const fix of FIXES) {
    const results = await searchMW(fix.search);
    await sleep(200);
    console.log(`Search "${fix.search}": ${results.map(r => `[${r.id}] ${r.name}`).join(' | ')}`);
  }
  console.log('');

  // Now download and compress each fix
  for (const fix of FIXES) {
    const fname = safeName(fix.name) + '.mp4';
    const rawPath = path.join(RAW_DIR, fname);
    const outPath = path.join(OUT_DIR, fname);

    process.stdout.write(`${fix.name}: `);

    const results = await searchMW(fix.search);
    await sleep(200);

    const idx = Math.min(fix.pickIndex, results.length - 1);
    if (results.length === 0 || idx < 0) {
      console.log('✗ No results');
      continue;
    }

    const match = results[idx];
    process.stdout.write(`→ ${match.name} [${match.id}] `);

    const videoUrl = await getVideoUrl(match.id);
    await sleep(200);
    if (!videoUrl) { console.log('✗ No video'); continue; }

    try {
      await downloadVideo(videoUrl, rawPath);
    } catch (err) { console.log(`✗ ${err.message}`); continue; }

    const rawKB = (fs.statSync(rawPath).size / 1024).toFixed(0);
    if (compressVideo(rawPath, outPath)) {
      const outKB = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`✓ ${rawKB}→${outKB}KB`);
    } else {
      console.log('✗ FFmpeg fail');
    }
    await sleep(300);
  }

  console.log('\n✅ Fixes applied');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
