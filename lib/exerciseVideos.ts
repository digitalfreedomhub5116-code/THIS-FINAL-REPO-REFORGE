// ── Cloudinary exercise video map ─────────────────────────────────────────────
// Maps exercise names → Cloudinary demo video URLs
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary

export const EXERCISE_VIDEOS: Record<string, string> = {
  // ── Push (Chest / Shoulders / Triceps) ──
  'Barbell Bench Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_benchpress_yqbxws.mp4`,
  'Close Grip Bench Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/closegripbenchpress_hkdgyb.mp4`,
  'Incline Dumbbell Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/inclinedumbelpress_vfgngy.mp4`,
  'Flat Dumbbell Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbellpress_rwfcep.mp4`,
  'Dumbbell Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbellpress_rwfcep.mp4`,
  'Cable Flyes': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/cableflyes_zdrwy2.mp4`,
  'Cable Fly': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/cableflyes_zdrwy2.mp4`,
  'Dips': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/chair_dip_onqvke.mp4`,
  'Parallel Bar Dips': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/chair_dip_onqvke.mp4`,

  'Overhead Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmsnr1.mp4`,
  'Overhead Barbell Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmsnr1.mp4`,
  'Machine Shoulder Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmsnr1.mp4`,
  'Arnold Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/arnoldpress_inkrme.mp4`,
  'Lateral Raises': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_lateral_raises_of7qan.mp4`,
  'Dumbbell Lateral Raise': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_lateral_raises_of7qan.mp4`,

  'Tricep Pushdowns': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/triceppushdown_z32y7n.mp4`,
  'Tricep Pushdown': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/triceppushdown_z32y7n.mp4`,
  'Rope Triceps Pushdown': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/triceppushdown_z32y7n.mp4`,
  'Overhead Tricep Extension': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/highpulleyoverhead_tricep_extention_ahfehc.mp4`,
  'Cable Overhead Triceps Extension': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/highpulleyoverhead_tricep_extention_ahfehc.mp4`,

  // ── Pull (Back / Biceps) ──
  'Pull-Ups': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/pullups_phytmu.mp4`,
  'Lat Pulldown': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/latpulldown_ongnqr.mp4`,
  'Wide Grip Lat Pulldown': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/latpulldown_ongnqr.mp4`,
  'Seated Cable Row': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/seated_row_otmti3.mp4`,
  'Barbell Rows': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_upright_row_ba7hmw.mp4`,
  'Barbell Row': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_upright_row_ba7hmw.mp4`,
  'Bent Over Row': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_upright_row_ba7hmw.mp4`,
  'Dumbbell Rows': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_rows_nkdbqa.mp4`,
  'Single Arm Dumbbell Row': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_rows_nkdbqa.mp4`,
  'Dumbbell Row': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_rows_nkdbqa.mp4`,
  'Deadlift': `https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/deadlifts_ljzuek.gif`,

  'Face Pulls': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/facepulls_ebnli2.mp4`,
  'Reverse Flyes': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_reverse_fly_vwx0jn.mp4`,
  'Cable Rear Delt Fly': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_reverse_fly_vwx0jn.mp4`,
  'Reverse Fly': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_reverse_fly_vwx0jn.mp4`,
  'Shrugs': `https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/dumbbell_shrug_bwrgvo.gif`,

  'Barbell Curls': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_curls_dmdnvd.mp4`,
  'Barbell Curl': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_curls_dmdnvd.mp4`,
  'Hammer Curls': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/hammercurls_jh0qy7.mp4`,
  'Hammer Curl': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/hammercurls_jh0qy7.mp4`,
  'Preacher Curls': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4`,
  'Preacher Curl': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4`,

  // ── Legs / Glutes ──
  'Barbell Squats': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_squats_inzbeb.mp4`,
  'Barbell Squat': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_squats_inzbeb.mp4`,
  'Front Squats': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/frontsquats_yvvwki.mp4`,
  'Front Squat': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/frontsquats_yvvwki.mp4`,
  'Romanian Deadlift': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_romanian_deadlift_nszbgw.mp4`,
  'Leg Press': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legpress_ilqivw.mp4`,
  'Leg Extensions': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legextension_dausmi.mp4`,
  'Leg Extension': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legextension_dausmi.mp4`,
  'Leg Curls': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legextension_dausmi.mp4`, // Uses the legextension one from user list as a fallback, user's input might be flawed but it maps here
  'Leg Curl': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legextension_dausmi.mp4`,
  'Seated Leg Curls': `https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/leg_curls_o2v6fe.gif`,
  'Seated Leg Curl': `https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/leg_curls_o2v6fe.gif`,
  'Walking Lunges': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_lunges_prt1jv.mp4`,
  'Lunges': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_lunges_prt1jv.mp4`,
  'Hip Thrusts': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_hip_thrust_mvwky2.mp4`,
  'Hip Thrust': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_hip_thrust_mvwky2.mp4`,
  'Calf Raises': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/calf_raises_ilbooa.mp4`,

  // ── Core ──
  'Plank Hold': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/plank_xnosho.mp4`,
  'Plank': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/plank_xnosho.mp4`,
  'Hanging Leg Raises': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legraisesflatbench_fwll1y.mp4`,
  'Hanging Leg Raise': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legraisesflatbench_fwll1y.mp4`,
  'Leg Raises': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legraisesflatbench_fwll1y.mp4`,

  // ── Cardio ──
  'Slow Walk': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4`,
  'Brisk Walk / Light Jog': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4`,
  'Brisk Walk': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4`,

  // ── Stretch / Recovery ──
  'Dynamic Stretching': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4`,
  'Static Stretching': `https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4`,
};

// Helper: lookup video URL by exercise name (case-insensitive)
export function getExerciseVideoUrl(name: string): string {
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];
  const key = Object.keys(EXERCISE_VIDEOS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? EXERCISE_VIDEOS[key] : '';
}
