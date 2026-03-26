/**
 * Cleanup script:
 * 1. Enrich all DB workout_plans with video URLs from EXERCISE_VIDEOS map
 * 2. Deactivate (is_active=false) all NO_MATCH exercises from workout_exercises
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

// ── Import the EXERCISE_VIDEOS map and lookup helper ──
// We inline the lookup here to avoid TS module issues in scripts
const EXERCISE_VIDEOS: Record<string, string> = {
  'Barbell Bench Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515211/workout_exercises/barbell_bench_press.mp4',
  'Close Grip Bench Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515526/workout_exercises/close_grip_bench_press.mp4',
  'Incline Dumbbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515217/workout_exercises/incline_dumbbell_press.mp4',
  'Flat Dumbbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515226/workout_exercises/dumbbell_press.mp4',
  'Dumbbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515226/workout_exercises/dumbbell_press.mp4',
  'Floor Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515537/workout_exercises/floor_press.mp4',
  'Dumbbell Fly': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515429/workout_exercises/dumbbell_fly.mp4',
  'Cable Flyes': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515221/workout_exercises/cable_fly.mp4',
  'Cable Fly': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515221/workout_exercises/cable_fly.mp4',
  'Dip': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515254/workout_exercises/dips.mp4',
  'Dips': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515254/workout_exercises/dips.mp4',
  'Parallel Bar Dips': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515530/workout_exercises/parallel_bar_dips.mp4',
  'Chair Dips': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515533/workout_exercises/chair_dips.mp4',
  'Overhead Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515232/workout_exercises/overhead_barbell_press.mp4',
  'Overhead Barbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515232/workout_exercises/overhead_barbell_press.mp4',
  'Dumbbell Shoulder Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515240/workout_exercises/dumbbell_shoulder_press.mp4',
  'Machine Shoulder Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515959/workout_exercises/machine_shoulder_press.mp4',
  'Arnold Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/arnoldpress_inkrme.mp4',
  'Lateral Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515236/workout_exercises/lateral_raises.mp4',
  'Dumbbell Lateral Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515437/workout_exercises/dumbbell_lateral_raise.mp4',
  'Cable Lateral Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515433/workout_exercises/cable_lateral_raise.mp4',
  'Cable Front Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515442/workout_exercises/cable_front_raise.mp4',
  'Tricep Pushdowns': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515245/workout_exercises/tricep_pushdown.mp4',
  'Tricep Pushdown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515245/workout_exercises/tricep_pushdown.mp4',
  'Rope Triceps Pushdown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515541/workout_exercises/rope_triceps_pushdown.mp4',
  'Overhead Tricep Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515551/workout_exercises/cable_overhead_triceps_extension.mp4',
  'Cable Overhead Triceps Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515551/workout_exercises/cable_overhead_triceps_extension.mp4',
  'Dumbbell Triceps Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515407/workout_exercises/dumbbell_tricep_kickback.mp4',
  'Dumbbell Tricep Kickback': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515407/workout_exercises/dumbbell_tricep_kickback.mp4',
  'Skull Crusher': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515545/workout_exercises/skull_crusher.mp4',
  'Kickback': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515555/workout_exercises/kickback.mp4',
  'Single Arm Cable Pushdown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515558/workout_exercises/single_arm_cable_pushdown.mp4',
  'Reverse Grip Triceps Pushdown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515562/workout_exercises/reverse_grip_triceps_pushdown.mp4',
  'Push-Up': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  'Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  'Pushup': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  'Pushups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  'Diamond Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515250/workout_exercises/diamond_push_ups.mp4',
  'Pike Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515391/workout_exercises/pike_push_ups.mp4',
  'Archer Pushups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  'Pull-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515262/workout_exercises/pull_ups.mp4',
  'Chin-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515295/workout_exercises/chin_ups.mp4',
  'Lat Pulldown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515268/workout_exercises/lat_pulldown.mp4',
  'Wide Grip Lat Pulldown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515805/workout_exercises/wide_grip_lat_pulldown.mp4',
  'Seated Cable Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515796/workout_exercises/seated_cable_row.mp4',
  'Wide Grip Seated Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515796/workout_exercises/seated_cable_row.mp4',
  'Cable Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515273/workout_exercises/cable_row.mp4',
  'Barbell Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515258/workout_exercises/barbell_row.mp4',
  'Barbell Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515258/workout_exercises/barbell_row.mp4',
  'Bent Over Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515792/workout_exercises/bent_over_row.mp4',
  'Upright Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515446/workout_exercises/upright_row.mp4',
  'Dumbbell Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515285/workout_exercises/dumbbell_row.mp4',
  'Dumbbell Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515285/workout_exercises/dumbbell_row.mp4',
  'Single Arm Dumbbell Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515801/workout_exercises/single_arm_dumbbell_row.mp4',
  'Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515278/workout_exercises/deadlift.mp4',
  'Face Pulls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515730/workout_exercises/face_pulls.mp4',
  'Reverse Flyes': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515511/workout_exercises/reverse_fly.mp4',
  'Cable Rear Delt Fly': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515812/workout_exercises/cable_rear_delt_fly.mp4',
  'Reverse Fly': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515511/workout_exercises/reverse_fly.mp4',
  'Resistance Band Pull Apart': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515816/workout_exercises/resistance_band_pull_apart.mp4',
  'Shrugs': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515450/workout_exercises/shrugs.mp4',
  'External Rotation': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515454/workout_exercises/external_rotation.mp4',
  'Barbell Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515290/workout_exercises/barbell_curl.mp4',
  'Barbell Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515290/workout_exercises/barbell_curl.mp4',
  'EZ Bar Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515508/workout_exercises/ez_bar_curl.mp4',
  'Incline Dumbbell Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515500/workout_exercises/incline_dumbbell_curl.mp4',
  'Concentration Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515494/workout_exercises/concentration_curl.mp4',
  'Spider Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515504/workout_exercises/spider_curl.mp4',
  'Zottman Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515516/workout_exercises/zottman_curl.mp4',
  'Hammer Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515488/workout_exercises/hammer_curl.mp4',
  'Hammer Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515488/workout_exercises/hammer_curl.mp4',
  'Preacher Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4',
  'Preacher Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4',
  'Barbell Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515301/workout_exercises/barbell_squat.mp4',
  'Barbell Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515301/workout_exercises/barbell_squat.mp4',
  'Barbell Back Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515820/workout_exercises/barbell_back_squat.mp4',
  'Front Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515567/workout_exercises/front_squat.mp4',
  'Front Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515567/workout_exercises/front_squat.mp4',
  'Goblet Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515326/workout_exercises/goblet_squat.mp4',
  'Sumo Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515301/workout_exercises/barbell_squat.mp4',
  'Jump Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515586/workout_exercises/jump_squat.mp4',
  'Jump Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515332/workout_exercises/jump_squats.mp4',
  'Romanian Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515282/workout_exercises/romanian_deadlift.mp4',
  'Leg Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515306/workout_exercises/leg_press.mp4',
  'Leg Extensions': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515598/workout_exercises/leg_extension.mp4',
  'Leg Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515598/workout_exercises/leg_extension.mp4',
  'Leg Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515312/workout_exercises/leg_curl.mp4',
  'Leg Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515312/workout_exercises/leg_curl.mp4',
  'Seated Leg Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515607/workout_exercises/seated_leg_curl.mp4',
  'Seated Leg Curl': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515607/workout_exercises/seated_leg_curl.mp4',
  'Hip Thrusts': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515424/workout_exercises/hip_thrust.mp4',
  'Hip Thrust': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515424/workout_exercises/hip_thrust.mp4',
  'Glute Bridge': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515688/workout_exercises/glute_bridge.mp4',
  'Single Leg Glute Bridge': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515727/workout_exercises/single_leg_glute_bridge.mp4',
  'Walking Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515575/workout_exercises/walking_lunges.mp4',
  'Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515570/workout_exercises/lunges.mp4',
  'Dumbbell Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515321/workout_exercises/dumbbell_lunges.mp4',
  'Bulgarian Split Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515581/workout_exercises/bulgarian_split_squat.mp4',
  'Lateral Lunge': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515851/workout_exercises/lateral_lunge.mp4',
  'Step Up': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515570/workout_exercises/lunges.mp4',
  'Calf Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515317/workout_exercises/calf_raises.mp4',
  'Seated Calf Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515614/workout_exercises/seated_calf_raise.mp4',
  'Donkey Calf Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515619/workout_exercises/donkey_calf_raise.mp4',
  'Wall Sit': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515838/workout_exercises/wall_sit.mp4',
  'Box Jumps': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515592/workout_exercises/box_jumps.mp4',
  'Glute Kickback': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515622/workout_exercises/glute_kickback.mp4',
  'Glute Kickback Machine': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515724/workout_exercises/glute_kickback_machine.mp4',
  'Cable Glute Kickback': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515711/workout_exercises/cable_glute_kickback.mp4',
  'Donkey Kicks': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515715/workout_exercises/donkey_kicks.mp4',
  'Cable Hip Abduction': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515626/workout_exercises/cable_hip_abduction.mp4',
  'Cable Hip Adduction': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515630/workout_exercises/cable_hip_adduction.mp4',
  'Hip Abduction Machine': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515718/workout_exercises/hip_abduction_machine.mp4',
  'Kettlebell Swing': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515695/workout_exercises/kettlebell_swing.mp4',
  'Jump Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515894/workout_exercises/jump_lunges.mp4',
  'Glute Activation Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515964/workout_exercises/glute_activation_walk.mp4',
  'Plank Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515345/workout_exercises/plank.mp4',
  'Plank': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515345/workout_exercises/plank.mp4',
  'Side Plank': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515345/workout_exercises/plank.mp4',
  'Plank Jacks': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515738/workout_exercises/plank_jacks.mp4',
  'Cable Crunch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515768/workout_exercises/cable_crunch.mp4',
  'Crunches': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515348/workout_exercises/crunches.mp4',
  'Crunch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515748/workout_exercises/crunch.mp4',
  'Sit-Up': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515753/workout_exercises/sit_up.mp4',
  'Hanging Leg Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515758/workout_exercises/hanging_leg_raise.mp4',
  'Hanging Leg Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515758/workout_exercises/hanging_leg_raise.mp4',
  'Leg Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515353/workout_exercises/leg_raises.mp4',
  'Lying Leg Raise': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515763/workout_exercises/lying_leg_raise.mp4',
  'Reverse Crunch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515773/workout_exercises/reverse_crunch.mp4',
  'Bicycle Crunch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515744/workout_exercises/bicycle_crunch.mp4',
  'Russian Twist': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515357/workout_exercises/russian_twist.mp4',
  'Russian Twists': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515734/workout_exercises/russian_twists.mp4',
  'Mountain Climbers': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515363/workout_exercises/mountain_climbers.mp4',
  'Cross Body Mountain Climbers': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515460/workout_exercises/cross_body_mountain_climbers.mp4',
  'Seated Spinal Twist': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515782/workout_exercises/seated_spinal_twist.mp4',
  'Slow Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'Brisk Walk / Light Jog': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'Brisk Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'High Knees': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515396/workout_exercises/burpees.mp4',
  'Burpees': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515396/workout_exercises/burpees.mp4',
  'Jumping Jacks': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515403/workout_exercises/jumping_jacks.mp4',
  'Skipping': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515881/workout_exercises/skipping.mp4',
  'Jump Rope': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515521/workout_exercises/jump_rope.mp4',
  'Treadmill Run': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515412/workout_exercises/treadmill_run.mp4',
  'Rowing Machine': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515419/workout_exercises/rowing_machine.mp4',
  'Jogging': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515856/workout_exercises/jogging.mp4',
  'Sprint': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515860/workout_exercises/sprint.mp4',
  'Elliptical Training': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515865/workout_exercises/elliptical_training.mp4',
  'Skater Jump': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515871/workout_exercises/skater_jump.mp4',
  'Butt Kicks': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515876/workout_exercises/butt_kicks.mp4',
  'Carioca Drill': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515888/workout_exercises/carioca_drill.mp4',
  'Dynamic Side Shuffle': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515898/workout_exercises/dynamic_side_shuffle.mp4',
  'Snatch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515825/workout_exercises/snatch.mp4',
  'Thruster': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515829/workout_exercises/thruster.mp4',
  'Kettlebell Snatch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515834/workout_exercises/kettlebell_snatch.mp4',
  'Inchworm Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515842/workout_exercises/inchworm_walk.mp4',
  'Windmill': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515847/workout_exercises/windmill.mp4',
  'Dynamic Stretching': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4',
  'Static Stretching': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  'Shoulder Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  'Hamstring Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515639/workout_exercises/hamstring_stretch.mp4',
  'Seated Hamstring Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515644/workout_exercises/seated_hamstring_stretch.mp4',
  'Calf Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515653/workout_exercises/calf_stretch.mp4',
  'Hip Flexor Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515657/workout_exercises/hip_flexor_stretch.mp4',
  'Kneeling Hip Flexor Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515955/workout_exercises/kneeling_hip_flexor_stretch.mp4',
  'Figure Four Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515671/workout_exercises/pigeon_pose_stretch.mp4',
  'Deep Squat Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515326/workout_exercises/goblet_squat.mp4',
  'Pigeon Pose Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515671/workout_exercises/pigeon_pose_stretch.mp4',
  'Standing Quadriceps Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515635/workout_exercises/standing_quadriceps_stretch.mp4',
  'Downward Dog': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515906/workout_exercises/downward_dog.mp4',
  'Standing Forward Bend': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515918/workout_exercises/standing_forward_bend.mp4',
  'Seated Forward Fold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515927/workout_exercises/seated_forward_fold.mp4',
  'Butterfly Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515649/workout_exercises/butterfly_stretch.mp4',
  'Side Lunge Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515684/workout_exercises/side_lunge_stretch.mp4',
  'Thread the Needle Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515477/workout_exercises/thread_the_needle_stretch.mp4',
  'Lying Spinal Twist': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515944/workout_exercises/lying_spinal_twist.mp4',
  'Arm Circles': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  'Leg Swings': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4',
  'Hip Circles': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4',
  'Shoulder Rolls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  'Cossack Squat': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515567/workout_exercises/front_squat.mp4',
};

// Case-insensitive lookup helper
function lookupVideo(name: string): string {
  if (!name) return '';
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(EXERCISE_VIDEOS)) {
    if (k.toLowerCase() === lower) return v;
  }
  return '';
}

// ── 32 NO_MATCH exercises to deactivate ──
const NO_MATCH_EXERCISES = [
  'Stair Climber',
  'Shoulder Rolls',
  'Battle Rope Alternating Waves',
  'Cross Body Arm Stretch',
  'Running',
  'Cycling',
  'High Knees',
  'Stair Climbing',
  'V-Up',
  'Flutter Kicks',
  'Toe Touches',
  'Standing Side Bend Stretch',
  'Turkish Get-Up',
  'Man Maker',
  'Spiderman Crawl',
  'Crab Walk',
  'Swimming',
  'Agility Ladder Drills',
  'Bounding',
  'Sled Push',
  'Sled Pull',
  'Sun Salutation',
  "World's Greatest Stretch",
  'Spiderman Stretch',
  'Leg Swings',
  'Ankle Mobility Rock',
  'Knee Circles',
  'Hip Circles',
  'Scapular Wall Slides',
  'Shoulder CARs',
  'Hip CARs',
  'Lying Piriformis Stretch',
];

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  CLEANUP: Plans + Exercise Library');
  console.log('═══════════════════════════════════════\n');

  // ── STEP 1: Enrich DB workout_plans with video URLs ──
  console.log('STEP 1: Enriching DB plans with video URLs...\n');
  const { data: plans, error: plansErr } = await supabase
    .from('workout_plans')
    .select('*');

  if (plansErr) {
    console.error('  ❌ Failed to fetch plans:', plansErr.message);
  } else if (!plans || plans.length === 0) {
    console.log('  ℹ️  No DB plans found (default plans are handled by code).');
  } else {
    let plansUpdated = 0;
    let exercisesEnriched = 0;

    for (const plan of plans) {
      if (!Array.isArray(plan.days)) continue;
      let changed = false;

      const enrichedDays = plan.days.map((day: any) => {
        if (!Array.isArray(day.exercises)) return day;
        const enrichedExercises = day.exercises.map((ex: any) => {
          const url = lookupVideo(ex.name);
          if (url && (!ex.videoUrl || ex.videoUrl.trim() === '')) {
            exercisesEnriched++;
            changed = true;
            return { ...ex, videoUrl: url };
          }
          return ex;
        });
        return { ...day, exercises: enrichedExercises };
      });

      if (changed) {
        const { error: upErr } = await supabase
          .from('workout_plans')
          .update({ days: enrichedDays })
          .eq('id', plan.id);

        if (upErr) {
          console.error(`  ❌ Failed to update plan "${plan.name}":`, upErr.message);
        } else {
          plansUpdated++;
          console.log(`  ✅ Updated plan "${plan.name}"`);
        }
      }
    }

    console.log(`\n  Plans updated: ${plansUpdated}, exercises enriched: ${exercisesEnriched}`);
  }

  // ── STEP 2: Deactivate NO_MATCH exercises ──
  console.log('\nSTEP 2: Deactivating NO_MATCH exercises...\n');

  let deactivated = 0;
  for (const name of NO_MATCH_EXERCISES) {
    const { data, error } = await supabase
      .from('workout_exercises')
      .update({ is_active: false })
      .ilike('name', name)
      .select('id, name');

    if (error) {
      console.error(`  ❌ Failed to deactivate "${name}":`, error.message);
    } else if (data && data.length > 0) {
      deactivated++;
      console.log(`  🗑️  Deactivated: ${name} (id: ${data[0].id})`);
    } else {
      console.log(`  ⚠️  Not found in DB: ${name}`);
    }
  }

  console.log(`\n  Total deactivated: ${deactivated} / ${NO_MATCH_EXERCISES.length}`);

  console.log('\n═══════════════════════════════════════');
  console.log('  CLEANUP COMPLETE');
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
