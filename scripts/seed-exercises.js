const http = require('http');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) { console.error('ERROR: ADMIN_PASSWORD environment variable is required'); process.exit(1); }
const BASE_URL = 'http://localhost:8000';

let bearerToken = null;

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;
    const opts = {
      hostname: 'localhost',
      port: 8000,
      path,
      method,
      headers,
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function authenticate() {
  console.log('🔐 Authenticating with admin password...');
  const res = await request('POST', '/api/admin/verify', { password: ADMIN_PASSWORD });
  if (!res.body.authorized || !res.body.token) {
    console.error('Authentication failed:', res.body);
    process.exit(1);
  }
  bearerToken = res.body.token;
  console.log('✅ Authenticated — JWT token received\n');
}

// ─── Exercise definition helpers ────────────────────────────────────────────
const GYM = 'GYM';
const BW  = 'BODYWEIGHT';

function ex(name, type, muscleGroup, equipment, sets, reps, notes = '') {
  return { name, type, muscle_group: muscleGroup, equipment, default_sets: sets, default_reps: reps, notes, display_order: 0, is_active: true, video_url: '' };
}

const C  = (name, mg, eq, notes='') => ex(name, 'COMPOUND',  mg, eq, 4, '8, 8, 6, 6',    notes);
const I  = (name, mg, eq, notes='') => ex(name, 'ISOLATION', mg, eq, 3, '12, 12, 10',    notes);
const CA = (name, mg, eq, notes='') => ex(name, 'CARDIO',    mg, eq, 3, '30s, 30s, 30s', notes);
const ST = (name, mg, eq, notes='') => ex(name, 'STRETCH',   mg, eq, 2, '30s, 30s',      notes);

// ─── Full exercise list from document ────────────────────────────────────────
// Duplicates across sections are deduplicated below via a Set.
// Each exercise is given its primary/best muscle group assignment.

const ALL_EXERCISES = [
  // ── CHEST ─ COMPOUND ──────────────────────────────────────────────────────
  C('Incline Barbell Bench Press',     'CHEST', GYM,  'Keep elbows at 45-60 degrees'),
  C('Decline Barbell Bench Press',     'CHEST', GYM,  'Feet secured; lower bar to lower chest'),
  C('Decline Dumbbell Press',          'CHEST', GYM,  'Decline bench, full range of motion'),
  C('Hammer Strength Chest Press',     'CHEST', GYM,  'Machine compound press for chest'),
  C('Machine Chest Press',             'CHEST', GYM,  'Controlled tempo, full ROM'),
  C('Decline Push-Up',                 'CHEST', BW,   'Feet elevated; targets upper chest'),
  C('Landmine Chest Press',            'CHEST', GYM,  'Single-arm or bilateral; adduction at top'),
  C('Chest Dips',                      'CHEST', BW,   'Lean forward to emphasise chest over triceps'),

  // ── CHEST ─ CARDIO ────────────────────────────────────────────────────────
  CA('Burpees',                        'CORE',  BW,   'Full body explosive movement'),
  CA('Push-Up Jacks',                  'CHEST', BW,   'Push-up with jumping-jack feet'),
  CA('Medicine Ball Chest Pass',       'CHEST', GYM,  'Explosive chest pass against wall or partner'),
  CA('Battle Rope Chest Slam',         'CHEST', GYM,  'Overhead slam with battle ropes'),
  CA('Explosive Push-Up',              'CHEST', BW,   'Push explosively so hands leave the ground'),
  CA('Plyometric Push-Up',             'CHEST', BW,   'Clap at the top; power-focused push-up'),

  // ── CHEST ─ ISOLATION ─────────────────────────────────────────────────────
  I('Dumbbell Fly',                    'CHEST', GYM,  'Slight bend in elbows; feel stretch at bottom'),
  I('Incline Dumbbell Fly',            'CHEST', GYM,  'Targets upper chest; incline 30-45 degrees'),
  I('Decline Dumbbell Fly',            'CHEST', GYM,  'Targets lower chest; slight decline'),
  I('Cable Crossover',                 'CHEST', GYM,  'High pulleys; hands meet below chest'),
  I('Low Cable Fly',                   'CHEST', GYM,  'Cables set low; arc upward to chest height'),
  I('High Cable Fly',                  'CHEST', GYM,  'Cables set high; arc downward across body'),
  I('Single Arm Cable Fly',            'CHEST', GYM,  'Unilateral; rotate slightly toward cable'),
  I('Pec Deck Machine Fly',            'CHEST', GYM,  'Machine fly; squeeze at peak contraction'),
  I('Svend Press',                     'CHEST', GYM,  'Plate squeeze press; constant pec tension'),
  I('Plate Press',                     'CHEST', GYM,  'Squeeze plates together throughout movement'),

  // ── CHEST ─ STRETCH ───────────────────────────────────────────────────────
  ST('Doorway Chest Stretch',          'CHEST', BW,   'Arms at 90 degrees in doorframe; lean forward'),
  ST('Wall Chest Stretch',             'CHEST', BW,   'One arm on wall; rotate body away'),
  ST('Standing Chest Opener Stretch',  'CHEST', BW,   'Interlace hands behind back; open chest'),
  ST('Behind the Back Chest Stretch',  'CHEST', BW,   'Clasp hands behind; straighten arms'),
  ST('Floor Chest Stretch',            'CHEST', BW,   'Prone; arms wide; lift chest off floor'),
  ST('Foam Roller Chest Stretch',      'CHEST', BW,   'Roller along spine; arms open wide'),
  ST('Stability Ball Chest Stretch',   'CHEST', BW,   'Lie over ball; arms extended to sides'),

  // ── BACK ─ COMPOUND ───────────────────────────────────────────────────────
  C('Chin-Up',                         'BACK',  BW,   'Supinated grip; elbows drive to hips'),
  C('T-Bar Row',                       'BACK',  GYM,  'Chest supported or free-standing; mid-back focus'),
  C('Pendlay Row',                     'BACK',  GYM,  'Barbell from floor each rep; explosive pull'),
  C('Inverted Row',                    'BACK',  BW,   'Body horizontal; pull chest to bar'),
  C('Rack Pull',                       'BACK',  GYM,  'Partial deadlift from knee height'),
  C('Landmine Row',                    'BACK',  GYM,  'Single-arm; elbow drives past hip'),

  // ── BACK ─ CARDIO ─────────────────────────────────────────────────────────
  CA('Rowing Machine',                 'BACK',  GYM,  'Drive with legs; pull handle to lower chest'),
  CA('Battle Rope Waves',              'BACK',  GYM,  'Alternate arms; continuous wave motion'),
  CA('Battle Rope Slams',              'BACK',  GYM,  'Both arms overhead; slam down powerfully'),
  CA('Kettlebell Swings',              'GLUTES',GYM,  'Hip hinge driven; bell to shoulder height'),
  CA('Renegade Rows',                  'BACK',  GYM,  'Push-up position; alternate row each side'),

  // ── BACK ─ ISOLATION ──────────────────────────────────────────────────────
  I('Straight Arm Lat Pulldown',       'BACK',  GYM,  'Arms straight; press bar to thighs'),
  I('Reverse Pec Deck Fly',            'REAR DELT', GYM, 'Targets rear delts; pads at chest height'),
  I('Dumbbell Reverse Fly',            'REAR DELT', GYM, 'Hinge forward; arms arc upward'),
  I('Cable Rope Pullover',             'BACK',  GYM,  'High cable; straight arms pull to thighs'),
  I('Back Extension',                  'BACK',  GYM,  'Hyperextension bench; squeeze glutes at top'),
  I('Superman Exercise',               'BACK',  BW,   'Prone; lift arms and legs simultaneously'),
  I('Good Morning',                    'BACK',  GYM,  'Bar on traps; hinge at hips with slight bend'),

  // ── BACK ─ STRETCH ────────────────────────────────────────────────────────
  ST('Cat Cow Stretch',                'BACK',  BW,   'On all fours; alternate arch and round back'),
  ST("Child's Pose",                   'BACK',  BW,   'Knees wide; arms extended; forehead to floor'),
  ST('Knees to Chest Stretch',         'BACK',  BW,   'Supine; hug both knees to chest'),
  ST('Seated Forward Bend Stretch',    'BACK',  BW,   'Seated; reach toward toes; keep back long'),
  ST('Standing Lat Stretch',           'BACK',  BW,   'Overhead; grab wrist; lean to side'),
  ST('Thoracic Extension Stretch',     'BACK',  BW,   'Roller or chair back; extend thoracic spine'),
  ST('Cobra Stretch',                  'BACK',  BW,   'Prone; push chest up; hips stay down'),

  // ── SHOULDERS ─ COMPOUND ──────────────────────────────────────────────────
  C('Arnold Press',                    'SHOULDERS', GYM, 'Rotate palms out as you press up'),
  C('Push Press',                      'SHOULDERS', GYM, 'Dip and drive; momentum from legs'),
  C('Seated Barbell Shoulder Press',   'SHOULDERS', GYM, 'Back supported; bar in front or behind neck'),
  C('Seated Dumbbell Shoulder Press',  'SHOULDERS', GYM, 'Neutral-to-pronated grip; control descent'),
  C('Machine Shoulder Press',          'SHOULDERS', GYM, 'Guided path; good for beginners'),
  C('Landmine Press',                  'SHOULDERS', GYM, 'Arc press; shoulder-friendly angle'),
  C('Handstand Push-Up',               'SHOULDERS', BW,  'Wall-supported or freestanding; full ROM'),
  C('Clean and Press',                 'SHOULDERS', GYM, 'Power clean into overhead press'),

  // ── SHOULDERS ─ CARDIO ────────────────────────────────────────────────────
  CA('Jumping Jacks',                  'CORE',  BW,   'Arms overhead each rep; steady rhythm'),
  CA('Medicine Ball Slams',            'CORE',  GYM,  'Overhead; explosive downward slam'),

  // ── SHOULDERS ─ ISOLATION ─────────────────────────────────────────────────
  I('Front Raise',                     'SHOULDERS', GYM, 'Dumbbell or barbell; arms to shoulder height'),
  I('Rear Delt Fly',                   'REAR DELT', GYM, 'Bent-over; arc arms up to shoulder height'),
  I('Cable Lateral Raise',             'SHOULDERS', GYM, 'Low cable; single or bilateral; controlled'),
  I('Dumbbell Lateral Raise',          'SHOULDERS', GYM, 'Lead with elbows; slight forward lean'),
  I('Cable Front Raise',               'SHOULDERS', GYM, 'Low cable; raise to eye level'),
  I('Upright Row',                     'SHOULDERS', GYM, 'Bar or cable; elbows lead above wrists'),
  I('Shrugs',                          'SHOULDERS', GYM, 'Barbell or dumbbell; elevate traps fully'),
  I('External Rotation',               'SHOULDERS', GYM, 'Cable or band; rotator cuff isolation'),

  // ── SHOULDERS ─ STRETCH ───────────────────────────────────────────────────
  ST('Cross Body Shoulder Stretch',    'SHOULDERS', BW, 'Pull arm across chest; hold 30s each'),
  ST('Overhead Triceps and Shoulder Stretch', 'SHOULDERS', BW, 'Arm overhead; elbow bent; pull with other hand'),
  ST('Doorway Shoulder Stretch',       'SHOULDERS', BW, 'Forearm on frame; rotate body away'),
  ST('Arm Circles',                    'SHOULDERS', BW, 'Forward and backward; small to large'),
  ST('Shoulder Rolls',                 'SHOULDERS', BW, 'Roll shoulders forward then backward'),
  ST('Thread the Needle Stretch',      'SHOULDERS', BW, 'On all fours; thread arm under body'),
  ST('Wall Shoulder Stretch',          'SHOULDERS', BW, 'Arm on wall; rotate chest away'),

  // ── BICEPS ─ ISOLATION ────────────────────────────────────────────────────
  I('Hammer Curl',                     'BICEPS', GYM, 'Neutral grip; targets brachialis'),
  I('Preacher Curl',                   'BICEPS', GYM, 'Arm supported on pad; full ROM'),
  I('Concentration Curl',              'BICEPS', GYM, 'Elbow braced on inner thigh; slow reps'),
  I('Incline Dumbbell Curl',           'BICEPS', GYM, 'Incline bench; full stretch at bottom'),
  I('Spider Curl',                     'BICEPS', GYM, 'Chest on incline bench; strict form'),
  I('EZ Bar Curl',                     'BICEPS', GYM, 'Angled grip; reduces wrist strain'),
  I('Reverse Curl',                    'BICEPS', GYM, 'Pronated grip; targets brachioradialis'),
  I('Zottman Curl',                    'BICEPS', GYM, 'Supinate up; pronate on the way down'),

  // ── BICEPS ─ CARDIO ───────────────────────────────────────────────────────
  CA('Battle Rope Alternating Waves',  'BICEPS', GYM, 'Alternate arms; fast continuous waves'),
  CA('Jump Rope',                      'CORE',   BW,  'Steady pace or double unders'),

  // ── BICEPS ─ STRETCH ──────────────────────────────────────────────────────
  ST('Standing Biceps Stretch',        'BICEPS', BW, 'Arms extended behind; thumbs down'),
  ST('Wall Biceps Stretch',            'BICEPS', BW, 'Palm on wall; rotate body away'),
  ST('Doorway Biceps Stretch',         'BICEPS', BW, 'Grip doorframe; lean body forward'),
  ST('Seated Biceps Stretch',          'BICEPS', BW, 'Hands behind; fingers back; lean back gently'),
  ST('Arm Extension Biceps Stretch',   'BICEPS', BW, 'Arm straight; palm up; pull fingers down'),
  ST('Behind the Back Biceps Stretch', 'BICEPS', BW, 'Clasp hands behind; externally rotate'),

  // ── TRICEPS ─ COMPOUND ────────────────────────────────────────────────────
  C('Close Grip Bench Press',          'TRICEPS', GYM, 'Hands shoulder-width; elbows close to body'),
  C('Parallel Bar Dips',               'TRICEPS', BW,  'Stay upright; targets triceps over chest'),
  C('Bench Dips',                      'TRICEPS', BW,  'Hands on bench behind; lower until 90 degrees'),
  C('Diamond Push-Up',                 'CHEST',   BW,  'Hands form diamond; maximum tricep activation'),
  C('Floor Press',                     'TRICEPS', GYM, 'Dumbbell or barbell; tricep lockout focus'),

  // ── TRICEPS ─ ISOLATION ───────────────────────────────────────────────────
  I('Rope Triceps Pushdown',           'TRICEPS', GYM, 'Rope attachment; flare out at bottom'),
  I('Dumbbell Triceps Extension',      'TRICEPS', GYM, 'Overhead or lying; full stretch'),
  I('Skull Crusher',                   'TRICEPS', GYM, 'EZ bar or barbell to forehead on bench'),
  I('Cable Overhead Triceps Extension','TRICEPS', GYM, 'High cable behind head; full stretch'),
  I('Kickback',                        'TRICEPS', GYM, 'Hinge forward; arm parallel; extend back'),
  I('EZ Bar Skull Crusher',            'TRICEPS', GYM, 'EZ bar to forehead; control descent'),
  I('Single Arm Cable Pushdown',       'TRICEPS', GYM, 'Unilateral; fixes imbalances'),
  I('Reverse Grip Triceps Pushdown',   'TRICEPS', GYM, 'Supinated grip; stresses long head'),

  // ── TRICEPS ─ STRETCH ─────────────────────────────────────────────────────
  ST('Overhead Triceps Stretch',       'TRICEPS', BW, 'Arm bent overhead; pull elbow with other hand'),
  ST('Cross Body Arm Stretch',         'TRICEPS', BW, 'Pull straight arm across chest'),
  ST('Behind the Head Triceps Stretch','TRICEPS', BW, 'Hand behind neck; elbow points up'),
  ST('Wall Triceps Stretch',           'TRICEPS', BW, 'Forearm on wall; lean into stretch'),
  ST('Standing Triceps Stretch',       'TRICEPS', BW, 'Arm overhead bent; use other hand to deepen'),

  // ── LEGS ─ COMPOUND ───────────────────────────────────────────────────────
  C('Front Squat',                     'QUADS',  GYM, 'Bar on front rack; upright torso'),
  C('Sumo Deadlift',                   'HAMSTRINGS', GYM, 'Wide stance; toes out; grips inside legs'),
  C('Lunges',                          'QUADS',  GYM, 'Step forward; knee tracks over toes'),
  C('Walking Lunges',                  'QUADS',  GYM, 'Continuous forward lunges; keep torso upright'),
  C('Bulgarian Split Squat',           'QUADS',  GYM, 'Rear foot elevated; drop back knee down'),
  C('Step-Up',                         'QUADS',  GYM, 'Drive through front heel; control descent'),
  C('Hack Squat',                      'QUADS',  GYM, 'Machine; feet forward; deep knee flexion'),

  // ── LEGS ─ CARDIO ─────────────────────────────────────────────────────────
  CA('Running',                        'LEGS',   BW,  'Steady state or sprint intervals'),
  CA('Cycling',                        'LEGS',   GYM, 'Stationary or outdoor; leg endurance'),
  CA('Jump Squat',                     'QUADS',  BW,  'Squat then explode up; land softly'),
  CA('High Knees',                     'CORE',   BW,  'Drive knees to waist height; fast pace'),
  CA('Box Jumps',                      'LEGS',   GYM, 'Jump onto box; step down; repeat'),
  CA('Stair Climbing',                 'LEGS',   GYM, 'Stair machine or actual stairs; steady pace'),

  // ── LEGS ─ ISOLATION ──────────────────────────────────────────────────────
  I('Leg Extension',                   'QUADS',      GYM, 'Machine; full extension; squeeze at top'),
  I('Seated Leg Curl',                 'HAMSTRINGS', GYM, 'Machine; curl heel toward glute'),
  I('Standing Leg Curl',               'HAMSTRINGS', GYM, 'Standing machine; unilateral option'),
  I('Seated Calf Raise',               'CALVES',     GYM, 'Seated machine; full range of motion'),
  I('Donkey Calf Raise',               'CALVES',     GYM, 'Bent-over position; heavy load possible'),
  I('Glute Kickback',                  'GLUTES',     BW,  'On all fours; extend leg straight back'),
  I('Cable Hip Abduction',             'GLUTES',     GYM, 'Cable at ankle; leg out to side'),
  I('Cable Hip Adduction',             'GLUTES',     GYM, 'Cable at ankle; leg crosses midline'),

  // ── LEGS ─ STRETCH ────────────────────────────────────────────────────────
  ST('Standing Quadriceps Stretch',    'QUADS',      BW, 'Stand on one leg; pull heel to glute'),
  ST('Hamstring Stretch',              'HAMSTRINGS', BW, 'Standing or seated; reach toward toes'),
  ST('Seated Hamstring Stretch',       'HAMSTRINGS', BW, 'Seated; legs extended; fold forward'),
  ST('Butterfly Stretch',              'GLUTES',     BW, 'Soles together; press knees to floor'),
  ST('Calf Stretch',                   'CALVES',     BW, 'Heel down against wall or step'),
  ST('Hip Flexor Stretch',             'QUADS',      BW, 'Lunge position; sink hips; chest tall'),
  ST('Pigeon Pose Stretch',            'GLUTES',     BW, 'Front leg bent 90 degrees; back leg long'),
  ST('Side Lunge Stretch',             'LEGS',       BW, 'Wide stance; shift weight to one side'),

  // ── GLUTES ─ COMPOUND ─────────────────────────────────────────────────────
  C('Glute Bridge',                    'GLUTES', BW,  'Supine; drive hips up; squeeze at top'),
  C('Kettlebell Swing',                'GLUTES', GYM, 'Hip hinge power; bell to shoulder height'),

  // ── GLUTES ─ ISOLATION ────────────────────────────────────────────────────
  I('Cable Glute Kickback',            'GLUTES', GYM, 'Cable at ankle; kick straight back'),
  I('Donkey Kicks',                    'GLUTES', BW,  'On all fours; drive heel to ceiling'),
  I('Fire Hydrants',                   'GLUTES', BW,  'On all fours; lift bent knee to side'),
  I('Hip Abduction Machine',           'GLUTES', GYM, 'Machine; push pads apart; glute med focus'),
  I('Cable Hip Extension',             'GLUTES', GYM, 'Low cable at ankle; extend leg back'),
  I('Glute Kickback Machine',          'GLUTES', GYM, 'Machine; single leg kick rearward'),
  I('Frog Pumps',                      'GLUTES', BW,  'Supine; soles together; drive hips up'),
  I('Single Leg Glute Bridge',         'GLUTES', BW,  'One leg extended; drive hips up high'),

  // ── GLUTES ─ STRETCH ──────────────────────────────────────────────────────
  ST('Figure Four Stretch',            'GLUTES', BW, 'Supine; ankle over opposite knee; pull thigh'),
  ST('Seated Glute Stretch',           'GLUTES', BW, 'Cross ankle over knee; lean forward'),
  ST('Standing Glute Stretch',         'GLUTES', BW, 'Stand; ankle over knee; sit back'),
  ST('Lying Piriformis Stretch',       'GLUTES', BW, 'Supine; cross leg; pull toward chest'),

  // ── CORE ─ COMPOUND ───────────────────────────────────────────────────────
  C("Farmer's Walk",                   'CORE',  GYM, 'Heavy dumbbells; walk; brace core throughout'),
  C('Turkish Get-Up',                  'CORE',  GYM, 'Kettlebell; full get-up sequence; slow control'),

  // ── CORE ─ CARDIO ─────────────────────────────────────────────────────────
  CA('Russian Twists',                 'CORE',  BW,  'Lean back; rotate side to side; feet up'),
  CA('Plank Jacks',                    'CORE',  BW,  'Plank position; jump feet wide and back'),
  CA('Bicycle Crunch',                 'CORE',  BW,  'Elbow to opposite knee; alternate sides'),

  // ── CORE ─ ISOLATION ──────────────────────────────────────────────────────
  I('Crunch',                          'CORE',  BW,  'Curl shoulders off floor; exhale at top'),
  I('Sit-Up',                          'CORE',  BW,  'Full range; feet anchored or free'),
  I('Hanging Leg Raise',               'CORE',  GYM, 'Dead hang; raise straight legs to parallel'),
  I('Lying Leg Raise',                 'CORE',  BW,  'Hands under hips; lower legs without touching floor'),
  I('Side Plank',                      'CORE',  BW,  'Lateral plank; hips up; elbow or hand'),
  I('Ab Wheel Rollout',                'CORE',  GYM, 'Roll out until extended; pull back in'),
  I('Cable Crunch',                    'CORE',  GYM, 'High cable; kneel; crunch elbows to knees'),
  I('V-Up',                            'CORE',  BW,  'Simultaneously lift legs and torso; touch feet'),
  I('Reverse Crunch',                  'CORE',  BW,  'Curl hips toward ceiling; controlled'),
  I('Flutter Kicks',                   'CORE',  BW,  'Supine; alternate small kicks; lower abs'),
  I('Toe Touches',                     'CORE',  BW,  'Supine; legs up; reach for toes'),

  // ── CORE ─ STRETCH ────────────────────────────────────────────────────────
  ST('Standing Side Bend Stretch',     'CORE',  BW, 'Arm overhead; lean to opposite side'),
  ST('Seated Spinal Twist',            'CORE',  BW, 'Cross one leg; rotate toward bent knee'),
  ST('Bridge Stretch',                 'CORE',  BW, 'Supine; press hips up; arch through spine'),
];

// ─── De-duplicate within the document (case-insensitive name) ────────────────
const seen = new Set();
const EXERCISES = [];
for (const e of ALL_EXERCISES) {
  const key = e.name.toLowerCase().trim();
  if (!seen.has(key)) {
    seen.add(key);
    EXERCISES.push(e);
  }
}

async function run() {
  await authenticate();
  console.log('\n🔍 Fetching existing exercises from database...');
  const res = await request('GET', '/api/admin/exercises');
  if (!Array.isArray(res.body)) {
    console.error('Failed to fetch exercises:', res.body);
    process.exit(1);
  }

  const existing = new Set(res.body.map(e => e.name.toLowerCase().trim()));
  console.log(`✅ Found ${existing.size} existing exercises in DB`);
  console.log(`📋 Document contains ${EXERCISES.length} unique exercises to check\n`);

  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  for (const exercise of EXERCISES) {
    const key = exercise.name.toLowerCase().trim();
    if (existing.has(key)) {
      console.log(`  ⏭  SKIP   : ${exercise.name}`);
      skipped++;
      continue;
    }

    const result = await request('POST', '/api/admin/exercises', exercise);
    if (result.status === 200 || result.status === 201) {
      console.log(`  ✅ INSERT : ${exercise.name} [${exercise.type} · ${exercise.muscle_group}]`);
      existing.add(key); // prevent re-inserting if same name appears again
      inserted++;
    } else {
      console.log(`  ❌ FAILED : ${exercise.name} — ${JSON.stringify(result.body)}`);
      failed++;
    }
  }

  console.log('\n─────────────────────────────────────────────');
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Skipped  : ${skipped} (already in DB)`);
  console.log(`  Failed   : ${failed}`);
  console.log(`  Total DB : ~${existing.size}`);
  console.log('─────────────────────────────────────────────\n');

  if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
