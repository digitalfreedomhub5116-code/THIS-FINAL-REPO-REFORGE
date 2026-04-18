/**
 * compress-all-videos.mjs
 * Compresses:
 *   1. New batch-2 downloads → public/assets/videos/exercises-batch2/
 *   2. Existing oversized videos (>500KB) in exercises/ — in-place recompress
 * 
 * FFmpeg settings: 360p, CRF 35, no audio, 6s max, fast-start
 * Target: 30-150 KB per file
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BATCH2_INPUT  = path.join(__dirname, 'downloaded_videos_batch2');
const BATCH2_OUTPUT = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises-batch2');
const EXISTING_DIR  = path.join(__dirname, '..', 'public', 'assets', 'videos', 'exercises');
const TEMP_DIR      = path.join(__dirname, 'compress_temp');

fs.mkdirSync(BATCH2_OUTPUT, { recursive: true });
fs.mkdirSync(TEMP_DIR, { recursive: true });

// Aggressive compression: 360p, CRF 35, no audio, 6s clip, fast-start
function compressVideo(inputPath, outputPath) {
  const cmd = [
    'ffmpeg', '-y',
    '-i', `"${inputPath}"`,
    '-vf', 'scale=-2:360',
    '-c:v', 'libx264',
    '-crf', '35',
    '-preset', 'fast',
    '-an',                  // no audio
    '-t', '6',              // max 6 seconds
    '-movflags', '+faststart',
    '-pix_fmt', 'yuv420p',
    `"${outputPath}"`
  ].join(' ');

  try {
    execSync(cmd, { stdio: 'pipe', timeout: 30000 });
    return true;
  } catch (err) {
    console.error(`    ✗ FFmpeg failed for ${path.basename(inputPath)}: ${err.message?.substring(0, 100)}`);
    return false;
  }
}

function formatSize(bytes) {
  return (bytes / 1024).toFixed(0) + ' KB';
}

async function main() {
  let totalSavedBytes = 0;

  // ═══ Part 1: Compress batch-2 downloads ═══
  console.log('═══ Part 1: Compress batch-2 videos (new exercises) ═══\n');
  
  const batch2Files = fs.readdirSync(BATCH2_INPUT).filter(f => f.endsWith('.mp4'));
  console.log(`  Found ${batch2Files.length} videos to compress\n`);

  let b2Success = 0;
  for (const file of batch2Files) {
    const inputPath = path.join(BATCH2_INPUT, file);
    const outputPath = path.join(BATCH2_OUTPUT, file);
    const inputSize = fs.statSync(inputPath).size;

    process.stdout.write(`  [${b2Success+1}/${batch2Files.length}] ${file} (${formatSize(inputSize)}) → `);
    
    if (compressVideo(inputPath, outputPath)) {
      const outputSize = fs.statSync(outputPath).size;
      const saved = inputSize - outputSize;
      totalSavedBytes += (inputSize > outputSize ? saved : 0);
      console.log(`${formatSize(outputSize)} (${saved > 0 ? '-' + formatSize(saved) : '+' + formatSize(-saved)})`);
      b2Success++;
    }
  }
  console.log(`\n  ✅ Batch 2: ${b2Success}/${batch2Files.length} compressed\n`);

  // ═══ Part 2: Re-compress existing oversized videos ═══
  console.log('═══ Part 2: Re-compress existing oversized videos (>500 KB) ═══\n');
  
  const existingFiles = fs.readdirSync(EXISTING_DIR).filter(f => f.endsWith('.mp4'));
  const oversized = existingFiles.filter(f => {
    const size = fs.statSync(path.join(EXISTING_DIR, f)).size;
    return size > 500 * 1024; // > 500 KB
  });
  console.log(`  Found ${oversized.length} oversized videos (>500 KB)\n`);

  let reSuccess = 0;
  for (const file of oversized) {
    const originalPath = path.join(EXISTING_DIR, file);
    const tempPath = path.join(TEMP_DIR, file);
    const inputSize = fs.statSync(originalPath).size;

    process.stdout.write(`  [${reSuccess+1}/${oversized.length}] ${file} (${formatSize(inputSize)}) → `);

    if (compressVideo(originalPath, tempPath)) {
      const outputSize = fs.statSync(tempPath).size;
      
      // Only replace if we actually made it smaller
      if (outputSize < inputSize) {
        fs.copyFileSync(tempPath, originalPath);
        const saved = inputSize - outputSize;
        totalSavedBytes += saved;
        console.log(`${formatSize(outputSize)} (saved ${formatSize(saved)}) ✓`);
        reSuccess++;
      } else {
        console.log(`${formatSize(outputSize)} — already optimal, skipped`);
      }
      
      // Cleanup temp
      try { fs.unlinkSync(tempPath); } catch {}
    }
  }

  console.log(`\n  ✅ Re-compressed: ${reSuccess}/${oversized.length} files\n`);

  // ═══ Summary ═══
  console.log('═══════════════════════════════════════════');
  console.log(`  Total disk saved:      ${formatSize(totalSavedBytes)} (${(totalSavedBytes / 1024 / 1024).toFixed(1)} MB)`);
  
  // Count final batch2 output files
  const b2OutputFiles = fs.readdirSync(BATCH2_OUTPUT).filter(f => f.endsWith('.mp4'));
  const b2TotalSize = b2OutputFiles.reduce((sum, f) => sum + fs.statSync(path.join(BATCH2_OUTPUT, f)).size, 0);
  console.log(`  Batch-2 folder size:   ${formatSize(b2TotalSize)} (${b2OutputFiles.length} files)`);
  
  // Count existing folder
  const exFinalFiles = fs.readdirSync(EXISTING_DIR).filter(f => f.endsWith('.mp4'));
  const exTotalSize = exFinalFiles.reduce((sum, f) => sum + fs.statSync(path.join(EXISTING_DIR, f)).size, 0);
  console.log(`  Existing folder size:  ${formatSize(exTotalSize)} (${exFinalFiles.length} files)`);
  console.log(`  Combined video total:  ${formatSize(b2TotalSize + exTotalSize)}`);
  console.log('═══════════════════════════════════════════');

  // Cleanup temp dir
  try { fs.rmSync(TEMP_DIR, { recursive: true }); } catch {}
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
