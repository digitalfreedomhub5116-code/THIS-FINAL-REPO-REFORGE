/**
 * fix-remaining.mjs
 * Fix the last 5 problem videos:
 *   1. Walking Plank → Inchworm (closest locomotion pattern)
 *   2. Wall Sit with Ball Squeeze → copy wall_sit.mp4 from batch 1
 *   3. Decline Crunch → Crunches (closest)
 *   4. Reverse Plank → Dead Bug (similar core stabilization)
 *   5. Bear Crawl → Inchworm (similar locomotion)
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
const BATCH1_DIR = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function downloadAndCompress(name, mwId, outFileName) {
  console.log(`\n  ${name}:`);
  
  // Get exercise details
  const res = await fetch(`https://api.musclewiki.com/exercises/${mwId}`, {
    headers: { 'X-API-Key': MW_KEY },
  });
  const d = await res.json();
  console.log(`    MW: ${d.name}`);
  
  const vid = d.videos?.find(v => v.gender === 'male' && v.angle === 'front')
    || d.videos?.find(v => v.gender === 'male')
    || d.videos?.[0];
  
  if (!vid?.url) { console.log('    ✗ No video'); return false; }
  
  // Download
  const rawPath = path.join(RAW_DIR, outFileName);
  const outPath = path.join(OUT_DIR, outFileName);
  
  const dlRes = await fetch(vid.url, { headers: { 'X-API-Key': MW_KEY } });
  await pipeline(Readable.fromWeb(dlRes.body), fs.createWriteStream(rawPath));
  console.log(`    Downloaded: ${(fs.statSync(rawPath).size / 1024).toFixed(0)} KB`);
  
  // Compress
  const cmd = `ffmpeg -y -i "${rawPath}" -vf scale=-2:360 -c:v libx264 -crf 35 -preset fast -an -t 6 -movflags +faststart -pix_fmt yuv420p "${outPath}"`;
  execSync(cmd, { stdio: 'pipe', timeout: 30000 });
  console.log(`    Compressed: ${(fs.statSync(outPath).size / 1024).toFixed(0)} KB ✓`);
  return true;
}

async function main() {
  console.log('═══ Fixing last 5 problem videos ═══');

  // 1. Walking Plank → Inchworm [1594]
  await downloadAndCompress('Walking Plank', 1594, 'walking_plank.mp4');
  await sleep(300);

  // 2. Wall Sit → copy existing wall_sit.mp4 from batch 1
  console.log('\n  Wall Sit with Ball Squeeze:');
  const wallSrc = path.join(BATCH1_DIR, 'wall_sit.mp4');
  const wallDst = path.join(OUT_DIR, 'wall_sit_with_ball_squeeze.mp4');
  if (fs.existsSync(wallSrc)) {
    fs.copyFileSync(wallSrc, wallDst);
    console.log(`    Copied from batch 1: ${(fs.statSync(wallDst).size / 1024).toFixed(0)} KB ✓`);
  } else {
    console.log('    ✗ wall_sit.mp4 not found in batch 1');
  }

  // 3. Decline Crunch → Crunches [35]
  await downloadAndCompress('Decline Crunch', 35, 'decline_crunch.mp4');
  await sleep(300);

  // 4. Reverse Plank → Dead Bug [869] (core stabilization)
  await downloadAndCompress('Reverse Plank', 869, 'reverse_plank.mp4');
  await sleep(300);

  // 5. Bear Crawl → Inchworm [1594] (locomotion)
  await downloadAndCompress('Bear Crawl', 1594, 'bear_crawl.mp4');

  console.log('\n\n═══ DONE ═══');
  
  // Final count
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith('.mp4'));
  const totalKB = files.reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0) / 1024;
  console.log(`  Batch 2: ${files.length} files, ${totalKB.toFixed(0)} KB total`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
