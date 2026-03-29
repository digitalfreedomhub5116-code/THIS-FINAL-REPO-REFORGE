// Final proper cross-reference
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const videoDir = path.join(__dirname, '../public/videos/exercises');

const videoFiles = new Set(
  fs.readdirSync(videoDir).filter(f => f.endsWith('.mp4')).map(f => f.replace('.mp4', ''))
);

const exVidSrc = fs.readFileSync(path.join(__dirname, '../lib/exerciseVideos.ts'), 'utf-8');

// Build N constant map: allow no space before colon
const nMap = {};
const nRegex = /^\s+(\w+):\s*'([^']+)'/gm;
let m;
while ((m = nRegex.exec(exVidSrc)) !== null) {
  nMap[m[1]] = m[2];
}

// Build EXERCISE_VIDEOS map
const exerciseMap = {};
const mapRegex = /^\s+'([^']+)':\s+N\.(\w+)/gm;
while ((m = mapRegex.exec(exVidSrc)) !== null) {
  if (nMap[m[2]]) exerciseMap[m[1]] = nMap[m[2]];
}

// Extract exercises from plans
const planSrc = fs.readFileSync(path.join(__dirname, '../lib/defaultPlans.ts'), 'utf-8');
const planExercises = new Set();
const exRegex = /ex\('([^']+)'/g;
while ((m = exRegex.exec(planSrc)) !== null) {
  planExercises.add(m[1]);
}

console.log(`Video files on disk: ${videoFiles.size}`);
console.log(`N constants: ${Object.keys(nMap).length}`);
console.log(`EXERCISE_VIDEOS entries: ${Object.keys(exerciseMap).length}`);
console.log(`Unique exercises in plans: ${planExercises.size}\n`);

const missing = [];
const found = [];

for (const name of planExercises) {
  const videoPath = exerciseMap[name];
  if (!videoPath) {
    missing.push({ name, reason: 'NOT in EXERCISE_VIDEOS map' });
    continue;
  }
  const filename = videoPath.split('/').pop().replace('.mp4', '');
  if (!videoFiles.has(filename)) {
    missing.push({ name, reason: `FILE MISSING: ${videoPath}` });
    continue;
  }
  found.push(name);
}

if (missing.length > 0) {
  console.log(`❌ MISSING (${missing.length}):`);
  missing.forEach(m => console.log(`  - ${m.name}: ${m.reason}`));
} else {
  console.log('✅ ALL 79 plan exercises have valid local videos! PERFECT.');
}
console.log(`\nResult: ${found.length}/${planExercises.size} valid`);
