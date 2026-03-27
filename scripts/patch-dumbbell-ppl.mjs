/**
 * Patch "Home Iron: Dumbbell PPL" plan (id=6) in Supabase:
 * 1. Remove "Dumbbell Face Pulls (Band)" from all days
 * 2. Remove "Foam Rolling" from all days
 * 3. Assign video URLs to 25 exercises
 */
import 'dotenv/config';

const SUPA = process.env.VITE_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_KEY;
const PLAN_ID = 6;

// Video URL mapping (exercise name in plan → URL)
const VIDEO_MAP = {
  'Dumbbell Floor Press':       'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774611000/dumbellflooorpress_tkctoc.gif',
  'Incline Push-Ups':           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774587116/workout_exercises/incline_pushups.mp4',
  'Dumbbell Deadlift':          'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774611160/dumbelldeadlift_gfu9js.gif',
  'Dumbbell Reverse Flyes':     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515511/workout_exercises/reverse_fly.mp4',
  'Dumbbell Shrugs':            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515450/workout_exercises/shrugs.mp4',
  'Dumbbell Curls':             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774587279/workout_exercises/dumbbell_standard_curls.mp4',
  'Dumbbell Hammer Curls':      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515488/workout_exercises/hammer_curl.mp4',
  'Dumbbell Goblet Squats':     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515326/workout_exercises/goblet_squat.mp4',
  'Dumbbell Romanian Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4',
  'Dumbbell Calf Raises':       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515317/workout_exercises/calf_raises.mp4',
  'Dumbbell Step-Ups':          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_single_leg_step_up_zatudl.mp4',
  'Dumbbell Bench Press':       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515226/workout_exercises/dumbbell_press.mp4',
  'Dumbbell Arnold Press':      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519079/workout_exercises/arnold_press.mp4',
  'Dumbbell Front Raises':      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774587263/workout_exercises/dumbbell_front_raises.mp4',
  'Dumbbell Overhead Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774587212/workout_exercises/dumbbell_overhead_extensions.mp4',
  'Dumbbell Bent Over Rows':    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774187454/dumbellrows_ks8zag.mp4',
  'Dumbbell Pullover':          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774587253/workout_exercises/dumbbell_pullovers.mp4',
  'Dumbbell Concentration Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515494/workout_exercises/concentration_curl.mp4',
  'Dumbbell Reverse Curls':     'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774611652/REV_DB_WRIST_CURL_oroe3u.gif',
  'Superman Hold':              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774606044/workout_exercises/superman_hold.mp4',
  'Dumbbell Sumo Squats':       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774606002/workout_exercises/dumbbell_sumo_squats.mp4',
  'Dumbbell Single Leg Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774606018/workout_exercises/dumbbell_single_leg_deadlifts.mp4',
  'Dumbbell Hip Thrusts':       'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774611794/resistance-band-hip-thrust_f9fqqh.gif',
  'Dumbbell Side Lunges':       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515684/workout_exercises/side_lunge_stretch.mp4',
  'Light Walk / Stretching':    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774519096/workout_exercises/brisk_walk.mp4',
};

// Exercises to REMOVE completely
const REMOVE = [
  'Dumbbell Face Pulls (Band)',
  'Foam Rolling',
];

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  Patching Home Iron: Dumbbell PPL (plan id=6)   ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  // 1. Fetch plan
  const res = await fetch(`${SUPA}/rest/v1/workout_plans?select=*&id=eq.${PLAN_ID}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  const plans = await res.json();
  if (!plans.length) { console.error('Plan not found!'); return; }
  const plan = plans[0];
  console.log(`Plan: "${plan.name}" — ${plan.days.length} days\n`);

  let removedCount = 0;
  let urlsAssigned = 0;

  for (const day of plan.days) {
    const before = (day.exercises || []).length;

    // Remove exercises
    day.exercises = (day.exercises || []).filter(ex => {
      const shouldRemove = REMOVE.some(r => ex.name.toLowerCase().includes(r.toLowerCase()));
      if (shouldRemove) {
        console.log(`  ✗ REMOVED: "${ex.name}" from ${day.day}`);
        removedCount++;
      }
      return !shouldRemove;
    });

    // Assign video URLs
    for (const ex of day.exercises) {
      const url = VIDEO_MAP[ex.name];
      if (url && (!ex.videoUrl || !ex.videoUrl.trim())) {
        ex.videoUrl = url;
        urlsAssigned++;
        console.log(`  ✓ ${day.day}: "${ex.name}" → assigned video`);
      }
    }
  }

  console.log(`\n═══ Summary before save ═══`);
  console.log(`  Exercises removed: ${removedCount}`);
  console.log(`  Video URLs assigned: ${urlsAssigned}`);

  // 2. Update plan in Supabase
  console.log('\n  Saving to Supabase...');
  const updateRes = await fetch(`${SUPA}/rest/v1/workout_plans?id=eq.${PLAN_ID}`, {
    method: 'PATCH',
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ days: plan.days }),
  });

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error(`  ✗ Update failed (${updateRes.status}): ${err}`);
    return;
  }

  const updated = await updateRes.json();
  console.log(`  ✓ Plan updated successfully!`);

  // 3. Verify — check for remaining missing videos
  console.log('\n═══ Verification: remaining exercises without videoUrl ═══\n');
  let stillMissing = 0;
  for (const day of updated[0].days) {
    for (const ex of day.exercises || []) {
      if (!ex.videoUrl || !ex.videoUrl.trim()) {
        console.log(`  ⚠ ${day.day}: "${ex.name}" — still no video`);
        stillMissing++;
      }
    }
  }
  if (stillMissing === 0) {
    console.log('  ✓ All exercises now have video URLs!');
  } else {
    console.log(`\n  ${stillMissing} exercises still missing videos`);
  }

  // Check that removed exercises are gone
  let facePullsLeft = 0, foamLeft = 0;
  for (const day of updated[0].days) {
    for (const ex of day.exercises || []) {
      if (ex.name.toLowerCase().includes('face pull')) facePullsLeft++;
      if (ex.name.toLowerCase().includes('foam rolling')) foamLeft++;
    }
  }
  console.log(`\n  Face Pulls remaining: ${facePullsLeft}`);
  console.log(`  Foam Rolling remaining: ${foamLeft}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
