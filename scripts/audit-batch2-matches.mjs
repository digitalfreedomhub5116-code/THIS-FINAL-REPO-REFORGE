/**
 * audit-batch2-matches.mjs
 * 
 * Classifies each exercise video match into:
 *   ✓ CORRECT - exact or functionally same exercise
 *   ~ CLOSE - similar exercise, acceptable
 *   ✗ WRONG - different exercise entirely
 *   ∅ MISSING - no video exists
 */

// These are what we ACTUALLY downloaded after ALL fixes
const MATCHES = [
  // Gym machines - most are correct type, just named differently in MW
  { name: 'Smith Machine Bench Press',    mw: 'Smith Machine Bench Press [950]',          status: '✓' },  // Fixed
  { name: 'Smith Machine Squat',          mw: 'Smith Machine Split Squat [964]',          status: '~' },  // Split squat ≈ squat variation
  { name: 'Leg Extension Machine',        mw: 'Machine Leg Extension [10]',               status: '✓' },  // Same exercise
  { name: 'Leg Curl Machine',             mw: 'Machine Seated Leg Curl [1198]',            status: '✓' },  // Same exercise
  { name: 'Pec Deck Fly',                mw: 'Machine Pec Fly [1507]',                   status: '✓' },  // Same exercise
  { name: 'Lat Pulldown Machine',         mw: 'Machine Plate Loaded Pulldown [1659]',     status: '✓' },  // Same exercise
  { name: 'Seated Row Machine',           mw: 'Machine Seated Cable Row [24]',            status: '✓' },  // Same exercise
  { name: 'Shoulder Press Machine',       mw: 'Machine Overhand Overhead Press [1508]',   status: '✓' },  // Fixed
  { name: 'Bicep Curl Machine',           mw: 'Machine Bicep Curl [1680]',                status: '✓' },  // Same exercise  
  { name: 'Tricep Extension Machine',     mw: 'Machine Tricep Pushdown [1681]',           status: '~' },  // Pushdown ≈ extension
  { name: 'Cable Face Pull',              mw: 'Cable Rope Face Pulls [22]',               status: '✓' },  // Same exercise
  { name: 'Cable Wood Chop',              mw: 'Cable Wood Chopper [247]',                 status: '✓' },  // Same exercise
  { name: 'Roman Chair Back Extension',   mw: 'Machine 45 Degree Back Extension [40]',    status: '✓' },  // Same exercise
  { name: 'Hyperextension',               mw: 'Bodyweight Stability Ball Hyperext [1777]', status: '~' },  // Similar, on ball
  { name: 'T-Bar Row',                    mw: 'Barbell Landmine Row [338]',               status: '~' },  // Landmine ≈ T-bar
  { name: 'Decline Bench Press',          mw: 'Dumbbell Decline Bench Press [381]',       status: '✓' },  // Fixed
  { name: 'Incline Dumbbell Fly',         mw: 'Dumbbell Incline Chest Flys [7]',          status: '✓' },  // Same exercise
  { name: 'Decline Dumbbell Press',       mw: 'Dumbbell Decline Chest Fly [382]',         status: '~' },  // Fixed, fly ≈ press angle
  { name: 'Cable Bicep Curl',             mw: 'Cable Bar Curl [1021]',                    status: '✓' },  // Fixed
  { name: 'Cable Rear Delt Row',          mw: 'Cable High Single Arm Rear Delt Fly [228]',status: '~' },  // Close, rear delt work
  { name: 'Standing Cable Chest Fly',     mw: 'Cable Standing Single Arm Incline Chest Fly [1851]', status: '✓' },
  { name: 'Decline Crunch',               mw: null,                                       status: '∅' },  // MW doesn't have it
  { name: 'Cable Shrug',                  mw: 'Cable 30 Degree Shrug [235]',              status: '✓' },  // Same exercise
  { name: 'Smith Machine Calf Raise',     mw: 'Smith Machine Seated Calf Raise [946]',    status: '✓' },  // Same exercise
  { name: 'Standing Cable Curl',          mw: 'Cable Bar Curl [1021]',                    status: '✓' },  // Fixed
  { name: 'Bird Dog',                     mw: 'Bird Dog [867]',                           status: '✓' },  // Exact
  { name: 'Reverse Plank',               mw: null,                                       status: '∅' },  // MW doesn't have it
  { name: 'Superman',                     mw: 'Supermans [195]',                          status: '✓' },  // Same
  { name: 'Glute Bridge March',           mw: 'Glute Bridge [29]',                        status: '~' },  // Bridge but no marching
  { name: 'Bear Crawl',                   mw: null,                                       status: '∅' },  // MW doesn't have it
  { name: 'Hollow Body Hold',             mw: 'Hollow Hold [328]',                        status: '✓' },  // Same
  { name: 'Side Plank Hip Dips',          mw: 'Side Plank Up Down [322]',                 status: '~' },  // Similar movement
  { name: 'Walking Plank',               mw: 'Side Plank Up Down [322]',                 status: '✗' },  // WRONG - needs plank walkout
  { name: 'Box Push-Ups',                mw: 'Incline Push Up [186]',                    status: '~' },  // Close enough
  { name: 'Incline Push-Ups',            mw: 'Incline Push Up [186]',                    status: '✓' },  // Same
  { name: 'Decline Push-Ups',            mw: 'Decline Push Up [187]',                    status: '✓' },  // Same
  { name: 'Pistol Squat',                mw: 'Single Leg Eccentric Box Squat [1258]',    status: '~' },  // Close, single-leg squat
  { name: 'Wall Sit with Ball Squeeze',  mw: 'Seated Quad Stretch [1311]',               status: '✗' },  // WRONG
  { name: 'Dumbbell Goblet Squat',       mw: 'Dumbbell Goblet Squat [11]',               status: '✓' },  // Exact
  { name: 'Dumbbell Romanian Deadlift',   mw: 'Dumbbell Romanian Deadlift [291]',         status: '✓' },  // Exact
  { name: 'Dumbbell Pullover',           mw: 'Dumbbell Pullover [413]',                  status: '✓' },  // Exact
  { name: 'Dumbbell Shrug',              mw: 'Dumbbell Seated Shrug [12]',               status: '~' },  // Seated vs standing
  { name: 'Dumbbell Front Squat',        mw: 'Dumbbell Front Rack Pause Squat [426]',    status: '~' },  // Front rack variation
  { name: 'Dumbbell Hammer Curl',        mw: 'Dumbbell Hammer Curl [3]',                 status: '✓' },  // Exact
  { name: 'Dumbbell Calf Raise',         mw: 'Dumbbell Calf Raise [294]',                status: '✓' },  // Exact
  { name: 'Dumbbell Wrist Curl',         mw: 'Dumbbell Wrist Curl [32]',                 status: '✓' },  // Exact
  { name: 'Dumbbell Wrist Extension',    mw: 'Dumbbell Wrist Extension [316]',           status: '✓' },  // Exact
];

const exact = MATCHES.filter(m => m.status === '✓').length;
const close = MATCHES.filter(m => m.status === '~').length;
const wrong = MATCHES.filter(m => m.status === '✗').length;
const missing = MATCHES.filter(m => m.status === '∅').length;

console.log('═══ BATCH-2 VIDEO MATCH AUDIT ═══');
console.log(`  ✓ Exact/correct: ${exact}`);
console.log(`  ~ Close enough:  ${close}`);
console.log(`  ✗ Wrong:         ${wrong}`);
console.log(`  ∅ Missing (MW):  ${missing}`);
console.log(`  Total:           ${MATCHES.length}`);
console.log('');
console.log(`  Match rate: ${((exact + close) / MATCHES.length * 100).toFixed(0)}%`);
console.log('');

console.log('WRONG matches (need fixing):');
for (const m of MATCHES.filter(m => m.status === '✗')) {
  console.log(`  ${m.name} → ${m.mw}`);
}
console.log('');
console.log('MISSING (MW has no exercise):');
for (const m of MATCHES.filter(m => m.status === '∅')) {
  console.log(`  ${m.name}`);
}
