/**
 * generate-new-exercises.mjs
 * Uses Gemini to identify popular exercises missing from our library + sports.
 * Output: scripts/new-exercises.json
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEMINI = process.env.GEMINI_API_KEY;
if (!GEMINI) { console.error('Missing GEMINI_API_KEY'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Current 157 exercises in our DB
const EXISTING = [
  "Ab Wheel Rollout","Archer Pushups","Arm Circles","Arnold Press","Barbell Back Squat",
  "Barbell Bench Press","Barbell Curl","Barbell Row","Barbell Squat","Bent Over Row",
  "Bicycle Crunch","Box Jumps","Brisk Walk","Bulgarian Split Squat","Burpees",
  "Butt Kicks","Butterfly Stretch","Cable Crunch","Cable Fly","Cable Front Raise",
  "Cable Glute Kickback","Cable Hip Abduction","Cable Hip Adduction","Cable Lateral Raise",
  "Cable Overhead Triceps Extension","Cable Rear Delt Fly","Cable Row","Calf Raises",
  "Calf Stretch","Carioca Drill","Chair Dips","Chin-Ups","Clap Push-Up",
  "Close Grip Bench Press","Concentration Curl","Cossack Squat","Cross Body Mountain Climbers",
  "Crunch","Crunches","Deadlift","Deep Squat Hold","Diamond Push-Ups","Dips",
  "Donkey Calf Raise","Donkey Kicks","Downward Dog","Dumbbell Fly","Dumbbell Lateral Raise",
  "Dumbbell Lunges","Dumbbell Press","Dumbbell Row","Dumbbell Shoulder Press",
  "Dumbbell Tricep Kickback","Dumbbell Triceps Extension","Dynamic Side Shuffle",
  "Elliptical Training","External Rotation","EZ Bar Curl","EZ Bar Skull Crusher",
  "Face Pulls","Figure Four Stretch","Floor Press","Front Squat","Glute Activation Walk",
  "Glute Bridge","Glute Kickback","Glute Kickback Machine","Goblet Squat","Hack Squat",
  "Hammer Curl","Hamstring Stretch","Hanging Leg Raise","Hip Abduction Machine",
  "Hip Flexor Stretch","Hip Thrust","Inchworm Walk","Incline Dumbbell Curl",
  "Incline Dumbbell Press","Jogging","Jump Lunges","Jump Rope","Jump Squat","Jump Squats",
  "Jumping Jacks","Kettlebell Clean","Kettlebell Snatch","Kettlebell Swing","Kickback",
  "Kneeling Hip Flexor Stretch","Lat Pulldown","Lateral Lunge","Lateral Raises","Leg Curl",
  "Leg Extension","Leg Press","Leg Raises","Lunges","Lying Leg Raise","Lying Spinal Twist",
  "Machine Shoulder Press","Mountain Climbers","Overhead Barbell Press",
  "Overhead Triceps Stretch","Parallel Bar Dips","Pigeon Pose Stretch","Pike Push-Ups",
  "Plank","Plank Jacks","Preacher Curl","Pull-Ups","Push-Ups","Resistance Band Pull Apart",
  "Reverse Crunch","Reverse Fly","Reverse Grip Triceps Pushdown","Romanian Deadlift",
  "Rope Triceps Pushdown","Rowing Machine","Russian Twist","Russian Twists",
  "Seated Cable Row","Seated Calf Raise","Seated Forward Fold","Seated Hamstring Stretch",
  "Seated Leg Curl","Seated Spinal Twist","Shoulder Stretch","Shrugs","Side Lunge Stretch",
  "Side Plank","Single Arm Cable Pushdown","Single Arm Dumbbell Row","Single Leg Glute Bridge",
  "Sit-Up","Skater Jump","Skipping","Skull Crusher","Snatch","Spider Curl","Sprint",
  "Standing Biceps Stretch","Standing Forward Bend","Standing Quadriceps Stretch","Step Up",
  "Sumo Squat","Thread the Needle Stretch","Thruster","Treadmill Run","Tricep Pushdown",
  "Upright Row","Walking Lunges","Wall Biceps Stretch","Wall Sit","Wide Grip Lat Pulldown",
  "Wide Grip Seated Row","Windmill","Zottman Curl"
];

async function callGemini(prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
      }),
    }
  );
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function main() {
  console.log('═══ Phase 1: Generate new exercises via Gemini ═══\n');
  console.log(`  Existing exercises: ${EXISTING.length}`);

  const prompt = `You are a certified fitness trainer and exercise database expert.

Here are the ${EXISTING.length} exercises ALREADY in our workout app database:
${EXISTING.join(', ')}

I need you to generate a comprehensive list of **additional popular exercises** that the mass public commonly performs but are NOT in the list above.

Include exercises from these categories:
1. **Gym exercises** (machines, barbells, cables) - about 25 exercises
2. **Bodyweight exercises** (calisthenics, home workouts) - about 15 exercises  
3. **Dumbbell/kettlebell exercises** - about 10 exercises
4. **Sports & Activities** - about 12 items: Running (outdoor), Cycling, Cricket, Football (Soccer), Basketball, Badminton, Tennis, Swimming, Hiking, Yoga Flow, Jump Rope HIIT, Stair Climbing

For each exercise, provide:
- "name": display name (title case)
- "type": one of "COMPOUND", "ISOLATION", "CARDIO", "STRETCH", "SPORT"
- "muscle_group": primary target from: "CHEST", "BACK", "SHOULDERS", "BICEPS", "TRICEPS", "CORE", "LEGS", "QUADS", "HAMSTRINGS", "CALVES", "GLUTES", "FULL BODY", "CARDIO"
- "equipment": one of "BODYWEIGHT", "DUMBBELL", "GYM"
- "default_sets": integer (3 for rep-based exercises, for time-based exercises choose 1-2 as appropriate for a beginner)
- "default_reps": string like "12, 12, 10" for rep-based OR "30s, 30s" for time-based OR "20 min" for long cardio/sports
- "is_time_based": boolean
- "is_sport": boolean (true only for sports/activities)

CRUCIAL Rules:
- Do NOT include ANY exercise that is already in the existing list above (even with different naming)
- Do NOT create duplicates or near-duplicates of existing entries
- Make it realistic — only well-known, genuinely popular exercises
- Sports should have equipment "BODYWEIGHT" and type "SPORT" or "CARDIO"

Respond with ONLY a valid JSON array. No markdown, no explanation. Just the array.`;

  console.log('  Calling Gemini...\n');
  const text = await callGemini(prompt);
  const cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  let exercises;
  try {
    exercises = JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse Gemini response:', err.message);
    console.error('Raw:', cleaned.substring(0, 500));
    // Write raw to file for debugging
    fs.writeFileSync(path.join(__dirname, 'new-exercises-raw.txt'), text);
    process.exit(1);
  }

  // Deduplicate against existing
  const existingLower = new Set(EXISTING.map(e => e.toLowerCase()));
  const filtered = exercises.filter(e => !existingLower.has(e.name.toLowerCase()));
  
  // Validate and clean
  const validTypes = ['COMPOUND', 'ISOLATION', 'CARDIO', 'STRETCH', 'SPORT'];
  const validEquip = ['BODYWEIGHT', 'DUMBBELL', 'GYM'];
  
  const final = filtered.map(e => ({
    name: e.name,
    type: validTypes.includes(e.type) ? e.type : 'COMPOUND',
    muscle_group: e.muscle_group || 'FULL BODY',
    equipment: validEquip.includes(e.equipment) ? e.equipment : 'BODYWEIGHT',
    default_sets: Number(e.default_sets) || 3,
    default_reps: e.default_reps || '10',
    is_time_based: !!e.is_time_based,
    is_sport: !!e.is_sport,
  }));

  console.log(`  Gemini returned: ${exercises.length} exercises`);
  console.log(`  After dedup:     ${filtered.length} exercises`);
  console.log(`  Final count:     ${final.length} exercises\n`);

  // Categorize
  const sports = final.filter(e => e.is_sport);
  const gym = final.filter(e => !e.is_sport && e.equipment === 'GYM');
  const bw = final.filter(e => !e.is_sport && e.equipment === 'BODYWEIGHT');
  const db = final.filter(e => !e.is_sport && e.equipment === 'DUMBBELL');

  console.log(`  Breakdown:`);
  console.log(`    Gym:        ${gym.length}`);
  console.log(`    Bodyweight: ${bw.length}`);
  console.log(`    Dumbbell:   ${db.length}`);
  console.log(`    Sports:     ${sports.length}\n`);

  for (const e of final) {
    console.log(`  ${e.is_sport ? '⚽' : '💪'} ${e.name} [${e.type}] → ${e.muscle_group} (${e.equipment}) ${e.default_sets}x${e.default_reps}`);
  }

  const outPath = path.join(__dirname, 'new-exercises.json');
  fs.writeFileSync(outPath, JSON.stringify(final, null, 2));
  console.log(`\n  ✅ Saved to: ${outPath}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
