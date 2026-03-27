/**
 * Exercise Video Matcher Script
 * 
 * 1. Lists all Cloudinary video assets & matches against target exercises
 * 2. Queries MuscleWiki API for 1800+ exercises & matches remaining
 * 3. Uses Gemini AI for smart name matching with confidence scores
 * 4. Downloads matched MuscleWiki videos & uploads to Cloudinary
 * 5. Reports: matched URLs (with confidence) + unmatched exercises
 */

import 'dotenv/config';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ──
const CLOUDINARY_CLOUD  = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_KEY    = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_SECRET = process.env.CLOUDINARY_API_SECRET;
const GEMINI_KEY        = process.env.GEMINI_API_KEY;
const MUSCLEWIKI_KEY    = process.env.MUSCLEWIKI_KEY;

// ── Target exercise list (expanded from consolidated entries) ──
const TARGET_EXERCISES = [
  // Chest & Triceps
  'Decline Pushups',
  'Incline Pushups',
  'Hindu Pushups',
  'Archer Pushups',
  'Pushup Shoulder Tap',
  'Tricep Dips (Chair)',
  'Dumbbell Bench Press',
  'Floor Press',
  'Dumbbell Overhead Extensions',
  // Back & Shoulders
  'Bodyweight Rows',
  'Dumbbell Bent-Over Rows',
  'Dumbbell Pullovers',
  'Dumbbell Face Pulls',
  'Dumbbell Reverse Fly',
  'Dumbbell Shrugs',
  'Dumbbell Arnold Press',
  'Dumbbell Front Raises',
  'Reverse Snow Angels',
  // Arms (Biceps) — expanded from consolidated
  'Dumbbell Standard Curls',
  'Dumbbell Hammer Curls',
  'Dumbbell Concentration Curls',
  'Dumbbell Reverse Curls',
  // Legs & Glutes — expanded from consolidated
  'Bodyweight Squats',
  'Pistol Squats',
  'Dumbbell Goblet Squats',
  'Dumbbell Sumo Squats',
  'Side Lunges',
  'Step Ups',
  'Dumbbell Deadlifts',
  'Dumbbell Romanian Deadlifts',
  'Dumbbell Single-Leg Deadlifts',
  'Dumbbell Hip Thrust',
  'Dumbbell Calf Raises',
  'Deep Squat Hold',
  // Core & Full Body
  'Hanging Knee Raises',
  'L-Sit Hold',
  'Superman Hold',
  'High Knees',
  // Mobility, Warm-up & Recovery
  'Dead Hang',
  'Arm Circles',
  'Static Stretching',
  'Light Walk',
  'Foam Rolling',
];

// ── Helpers ──

function fetchJSON(url, options = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { ...options, headers: { ...options.headers } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function postJSON(url, body) {
  const bodyStr = JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const mod = url.startsWith('https') ? https : http;
    const doRequest = (targetUrl) => {
      mod.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          doRequest(res.headers.location);
          return;
        }
        res.pipe(file);
        file.on('finish', () => { file.close(); resolve(destPath); });
      }).on('error', (err) => { fs.unlinkSync(destPath); reject(err); });
    };
    doRequest(url);
  });
}

function cloudinarySign(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(sorted + CLOUDINARY_SECRET).digest('hex');
}

async function uploadToCloudinary(filePath, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { public_id: publicId, timestamp, folder: 'workout_exercises' };
  const signature = cloudinarySign(params);
  
  // Use form-data approach via curl-like multipart
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Date.now();
    const fields = { ...params, signature, api_key: CLOUDINARY_KEY };
    
    let body = '';
    for (const [key, val] of Object.entries(fields)) {
      body += `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`;
    }
    
    const fileData = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: video/mp4\r\n\r\n`;
    const fileFooter = `\r\n--${boundary}--\r\n`;
    
    const bodyBuffer = Buffer.concat([
      Buffer.from(body),
      Buffer.from(fileHeader),
      fileData,
      Buffer.from(fileFooter),
    ]);
    
    const req = https.request({
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD}/video/upload`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuffer.length,
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Cloudinary response: ${data.substring(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.write(bodyBuffer);
    req.end();
  });
}

// ── Step 1: List Cloudinary video assets ──
async function listCloudinaryVideos() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 1: Listing Cloudinary video assets');
  console.log('══════════════════════════════════════════════\n');
  
  const allResources = [];
  let nextCursor = null;
  
  do {
    const cursorParam = nextCursor ? `&next_cursor=${nextCursor}` : '';
    const auth = Buffer.from(`${CLOUDINARY_KEY}:${CLOUDINARY_SECRET}`).toString('base64');
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/resources/video/upload?max_results=500&prefix=workout_exercises${cursorParam}`;
    
    const { status, data } = await fetchJSON(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    
    if (status !== 200) {
      console.error('Cloudinary API error:', data);
      break;
    }
    
    if (data.resources) {
      allResources.push(...data.resources);
    }
    nextCursor = data.next_cursor || null;
  } while (nextCursor);
  
  console.log(`  Found ${allResources.length} video assets on Cloudinary`);
  
  // Extract names from public_ids
  const cloudinaryVideos = allResources.map(r => ({
    publicId: r.public_id,
    url: r.secure_url,
    name: r.public_id.replace('workout_exercises/', '').replace(/_/g, ' '),
  }));
  
  return cloudinaryVideos;
}

// ── Step 2: Use Gemini to match Cloudinary videos ──
async function matchWithGemini(targetExercises, availableExercises, source) {
  console.log(`\n  Using Gemini AI to match ${targetExercises.length} targets against ${availableExercises.length} ${source} exercises...`);
  
  const prompt = `You are an exercise/fitness expert. I need you to match exercises from a TARGET list to exercises from an AVAILABLE list.

TARGET EXERCISES (the ones I need videos for):
${targetExercises.map((e, i) => `${i + 1}. ${e}`).join('\n')}

AVAILABLE EXERCISES (${source}):
${availableExercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n')}

For each TARGET exercise, find the BEST matching exercise from the AVAILABLE list. Consider:
- Same exercise with different names (e.g., "Dumbbell Bench Press" = "Flat Dumbbell Press")
- Very close variations (e.g., "Dumbbell Calf Raises" ≈ "Calf Raises")
- Only match if the movement pattern is genuinely similar

Return ONLY a valid JSON array with this exact structure (no markdown, no code fences):
[
  {
    "target": "Decline Pushups",
    "matchedName": "Decline Push Up" or null,
    "matchedIndex": 5 or null,
    "confidence": 95,
    "reason": "Exact same exercise, different naming convention"
  }
]

Rules:
- confidence: 0-100. Use 90-100 for exact/near-exact matches, 70-89 for close variations, 50-69 for similar but different, below 50 = no match.
- If confidence < 50, set matchedName and matchedIndex to null.
- matchedIndex is 1-based index from the AVAILABLE list.
- EVERY target exercise must appear in the output.
- Return raw JSON only.`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
  
  try {
    const { status, data } = await postJSON(url, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    });
    
    if (status !== 200) {
      console.error(`  Gemini API error (${status}):`, JSON.stringify(data).substring(0, 300));
      return [];
    }
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    
    try {
      return JSON.parse(cleaned);
    } catch {
      console.error('  Failed to parse Gemini response:', cleaned.substring(0, 500));
      return [];
    }
  } catch (err) {
    console.error('  Gemini request failed:', err.message);
    return [];
  }
}

// ── Step 3: Query MuscleWiki API ──
async function fetchMuscleWikiExercises() {
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 3: Fetching MuscleWiki exercises');
  console.log('══════════════════════════════════════════════\n');
  
  const allExercises = [];
  let page = 1;
  const perPage = 100;
  
  while (true) {
    const url = `https://api.musclewiki.com/exercises?page=${page}&per_page=${perPage}`;
    console.log(`  Fetching page ${page}...`);
    
    try {
      const { status, data } = await fetchJSON(url, {
        headers: {
          'X-API-Key': MUSCLEWIKI_KEY,
          'Accept': 'application/json',
        },
      });
      
      if (status !== 200) {
        // Try alternative endpoint format
        console.log(`  Status ${status}, trying alternative endpoint...`);
        break;
      }
      
      const exercises = Array.isArray(data) ? data : (data.results || data.data || data.exercises || []);
      if (exercises.length === 0) break;
      
      allExercises.push(...exercises);
      console.log(`  Page ${page}: got ${exercises.length} exercises (total: ${allExercises.length})`);
      
      if (exercises.length < perPage) break;
      page++;
      
      // Rate limit respect
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  Error on page ${page}:`, err.message);
      break;
    }
  }
  
  // Try alternative API formats if first didn't work
  if (allExercises.length === 0) {
    console.log('  Trying alternative MuscleWiki API endpoints...');
    
    const endpoints = [
      `https://api.musclewiki.com/v1/exercises`,
      `https://api.musclewiki.com/exercises/all`,
      `https://api.musclewiki.com/exercises`,
    ];
    
    for (const url of endpoints) {
      try {
        console.log(`  Trying: ${url}`);
        const { status, data } = await fetchJSON(url, {
          headers: { 'X-API-Key': MUSCLEWIKI_KEY, 'Accept': 'application/json' },
        });
        console.log(`  Status: ${status}, type: ${typeof data}, isArray: ${Array.isArray(data)}`);
        
        if (status === 200) {
          const exercises = Array.isArray(data) ? data : (data.results || data.data || data.exercises || []);
          if (exercises.length > 0) {
            allExercises.push(...exercises);
            console.log(`  Got ${exercises.length} exercises!`);
            // Log first exercise structure
            console.log('  Sample exercise structure:', JSON.stringify(exercises[0]).substring(0, 300));
            break;
          }
        }
        
        // Show response for debugging
        const preview = typeof data === 'string' ? data.substring(0, 300) : JSON.stringify(data).substring(0, 300);
        console.log(`  Response preview: ${preview}`);
      } catch (err) {
        console.log(`  Failed: ${err.message}`);
      }
    }
  }
  
  console.log(`\n  Total MuscleWiki exercises fetched: ${allExercises.length}`);
  return allExercises;
}

// ── Step 4: Download video and upload to Cloudinary ──
async function downloadAndUpload(videoUrl, exerciseName) {
  const tmpDir = path.join(__dirname, 'tmp_videos');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  
  const safeName = exerciseName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const tmpPath = path.join(tmpDir, `${safeName}.mp4`);
  
  console.log(`  Downloading: ${exerciseName}...`);
  await downloadFile(videoUrl, tmpPath);
  
  const stat = fs.statSync(tmpPath);
  console.log(`  Downloaded: ${(stat.size / 1024).toFixed(0)} KB`);
  
  console.log(`  Uploading to Cloudinary: workout_exercises/${safeName}`);
  const result = await uploadToCloudinary(tmpPath, safeName);
  
  // Cleanup
  try { fs.unlinkSync(tmpPath); } catch {}
  
  if (result.secure_url) {
    console.log(`  ✓ Uploaded: ${result.secure_url}`);
    return result.secure_url;
  } else {
    console.error(`  ✗ Upload failed:`, JSON.stringify(result).substring(0, 200));
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
// ── MAIN ──
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   EXERCISE VIDEO MATCHER                    ║');
  console.log('║   Target: ' + TARGET_EXERCISES.length + ' exercises                      ║');
  console.log('╚══════════════════════════════════════════════╝');
  
  const results = {};
  TARGET_EXERCISES.forEach(e => { results[e] = { cloudinaryUrl: null, source: null, confidence: 0, reason: '' }; });
  
  // ── STEP 1: Check existing Cloudinary ──
  const cloudinaryVideos = await listCloudinaryVideos();
  
  // Match with Gemini
  console.log('\n══════════════════════════════════════════════');
  console.log('  STEP 2: Gemini AI matching (Cloudinary)');
  console.log('══════════════════════════════════════════════');
  
  const unmatchedAfterCloudinary = [];
  const cloudinaryMatches = await matchWithGemini(
    TARGET_EXERCISES,
    cloudinaryVideos.map(v => ({ name: v.name })),
    'Cloudinary'
  );
  
  for (const match of cloudinaryMatches) {
    if (match.matchedIndex && match.confidence >= 50) {
      const idx = match.matchedIndex - 1;
      if (idx >= 0 && idx < cloudinaryVideos.length) {
        results[match.target] = {
          cloudinaryUrl: cloudinaryVideos[idx].url,
          source: 'Cloudinary (existing)',
          confidence: match.confidence,
          reason: match.reason,
        };
        console.log(`  ✓ ${match.target} → ${cloudinaryVideos[idx].name} (${match.confidence}%)`);
      }
    }
    if (!match.matchedIndex || match.confidence < 50) {
      unmatchedAfterCloudinary.push(match.target);
    }
  }
  
  // Also add any targets not in the Gemini response
  for (const t of TARGET_EXERCISES) {
    if (!results[t].cloudinaryUrl && !unmatchedAfterCloudinary.includes(t)) {
      unmatchedAfterCloudinary.push(t);
    }
  }
  
  console.log(`\n  Matched from Cloudinary: ${TARGET_EXERCISES.length - unmatchedAfterCloudinary.length}/${TARGET_EXERCISES.length}`);
  console.log(`  Still need: ${unmatchedAfterCloudinary.length} exercises`);
  
  // ── STEP 3: MuscleWiki ──
  let muscleWikiExercises = [];
  if (unmatchedAfterCloudinary.length > 0) {
    muscleWikiExercises = await fetchMuscleWikiExercises();
    
    if (muscleWikiExercises.length > 0) {
      console.log('\n══════════════════════════════════════════════');
      console.log('  STEP 4: Gemini AI matching (MuscleWiki)');
      console.log('══════════════════════════════════════════════');
      
      // Extract exercise names and video URLs from MuscleWiki data
      const mwExercises = muscleWikiExercises.map(e => ({
        name: e.name || e.title || e.exercise_name || '',
        videoUrl: e.video_url || e.video || e.videoURL || e.videos?.[0]?.url || e.media?.video || '',
        gifUrl: e.gif_url || e.gif || e.gifURL || '',
      })).filter(e => e.name);
      
      console.log(`  MuscleWiki exercises with names: ${mwExercises.length}`);
      if (mwExercises[0]) {
        console.log(`  Sample: ${mwExercises[0].name} | video: ${mwExercises[0].videoUrl ? 'YES' : 'NO'}`);
      }
      
      // Gemini matching — process in batches if MuscleWiki list is huge
      const BATCH_SIZE = 200;
      const unmatchedForMW = [...unmatchedAfterCloudinary];
      
      for (let i = 0; i < mwExercises.length && unmatchedForMW.length > 0; i += BATCH_SIZE) {
        const batch = mwExercises.slice(i, i + BATCH_SIZE);
        console.log(`\n  Batch ${Math.floor(i / BATCH_SIZE) + 1}: matching ${unmatchedForMW.length} targets against ${batch.length} MuscleWiki exercises...`);
        
        const mwMatches = await matchWithGemini(unmatchedForMW, batch, `MuscleWiki batch ${Math.floor(i / BATCH_SIZE) + 1}`);
        
        const newlyMatched = [];
        for (const match of mwMatches) {
          if (match.matchedIndex && match.confidence >= 50) {
            const idx = match.matchedIndex - 1;
            if (idx >= 0 && idx < batch.length && batch[idx].videoUrl) {
              results[match.target] = {
                cloudinaryUrl: null,
                muscleWikiUrl: batch[idx].videoUrl,
                muscleWikiName: batch[idx].name,
                source: 'MuscleWiki',
                confidence: match.confidence,
                reason: match.reason,
              };
              newlyMatched.push(match.target);
              console.log(`  ✓ ${match.target} → ${batch[idx].name} (${match.confidence}%) [video: ${batch[idx].videoUrl ? 'YES' : 'NO'}]`);
            }
          }
        }
        
        // Remove newly matched from unmatched list
        for (const m of newlyMatched) {
          const idx = unmatchedForMW.indexOf(m);
          if (idx >= 0) unmatchedForMW.splice(idx, 1);
        }
        
        await new Promise(r => setTimeout(r, 1000)); // Rate limit
      }
    }
  }
  
  // ── STEP 5: Download MuscleWiki videos & upload to Cloudinary ──
  const toUpload = Object.entries(results).filter(([_, r]) => r.source === 'MuscleWiki' && r.muscleWikiUrl);
  
  if (toUpload.length > 0) {
    console.log('\n══════════════════════════════════════════════');
    console.log(`  STEP 5: Download & Upload ${toUpload.length} MuscleWiki videos`);
    console.log('══════════════════════════════════════════════\n');
    
    for (const [name, info] of toUpload) {
      try {
        const url = await downloadAndUpload(info.muscleWikiUrl, name);
        if (url) {
          results[name].cloudinaryUrl = url;
        }
      } catch (err) {
        console.error(`  ✗ Failed for ${name}: ${err.message}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }
  
  // ══════════════════════════════════════════════════════════
  // ── FINAL REPORT ──
  // ══════════════════════════════════════════════════════════
  
  console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                    FINAL REPORT                             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  const matched = [];
  const unmatched = [];
  
  for (const [name, info] of Object.entries(results)) {
    if (info.cloudinaryUrl) {
      matched.push({ exercise: name, ...info });
    } else {
      unmatched.push({ exercise: name, ...info });
    }
  }
  
  console.log('═══ MATCHED EXERCISES (with Cloudinary URLs) ═══\n');
  for (const m of matched) {
    console.log(`  ✓ ${m.exercise}`);
    console.log(`    URL: ${m.cloudinaryUrl}`);
    console.log(`    Source: ${m.source} | Confidence: ${m.confidence}% | ${m.reason}`);
    console.log();
  }
  
  console.log(`\n═══ UNMATCHED EXERCISES (no video found) ═══\n`);
  for (const u of unmatched) {
    console.log(`  ✗ ${u.exercise}`);
    if (u.reason) console.log(`    Note: ${u.reason}`);
  }
  
  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Total targets:  ${TARGET_EXERCISES.length}`);
  console.log(`  Matched:        ${matched.length}`);
  console.log(`  Unmatched:      ${unmatched.length}`);
  
  // Write results to JSON
  const outputPath = path.join(__dirname, 'exercise-match-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({ matched, unmatched, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`\n  Results saved to: ${outputPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
