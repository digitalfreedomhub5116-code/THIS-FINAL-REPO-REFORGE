// ── Cloudinary exercise video map ─────────────────────────────────────────────
// Maps exercise names → Cloudinary demo video URLs
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary

const CLOUDINARY = 'https://res.cloudinary.com/dkygyxsdw/video/upload';

export const EXERCISE_VIDEOS: Record<string, string> = {
  // ── Push (Chest / Shoulders / Triceps) ──
  'Barbell Bench Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Incline Dumbbell Press': `${CLOUDINARY}/v1774029229/inclinedumbellpress_vfgovp.mp4`,
  'Dumbbell Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Dumbbell Fly': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Cable Fly': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Overhead Barbell Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Dumbbell Shoulder Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Machine Shoulder Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Lateral Raises': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Dumbbell Lateral Raise': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Cable Lateral Raise': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Cable Front Raise': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Tricep Pushdown': `${CLOUDINARY}/v1774029198/triceppushdown_y10y7e.mp4`,
  'Rope Triceps Pushdown': `${CLOUDINARY}/v1774029198/triceppushdown_y10y7e.mp4`,
  'Cable Overhead Triceps Extension': `${CLOUDINARY}/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4`,
  'Dumbbell Triceps Extension': `${CLOUDINARY}/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4`,
  'Close Grip Bench Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Floor Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Dips': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Parallel Bar Dips': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Chair Dips': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Dumbbell Tricep Kickback': `${CLOUDINARY}/v1774029213/dumbell_kickbacks_zyzjar.mp4`,
  'Push-Ups': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Diamond Push-Ups': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Pike Push-Ups': `${CLOUDINARY}/v1774029199/pikepushups_lsp8hg.mp4`,
  'Archer Pushups': `${CLOUDINARY}/v1774029197/archerpushups_pw1s1d.mp4`,
  'Clap Push-Up': `${CLOUDINARY}/v1774029201/clap_pushups_jvljub.mp4`,

  // ── Pull (Back / Biceps) ──
  'Barbell Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Bent Over Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Pull-Ups': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Chin-Ups': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Lat Pulldown': `${CLOUDINARY}/v1774029229/latpulldown_snpror.mp4`,
  'Wide Grip Lat Pulldown': `${CLOUDINARY}/v1774029229/latpulldown_snpror.mp4`,
  'Seated Cable Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Wide Grip Seated Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Cable Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Dumbbell Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Single Arm Dumbbell Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Face Pulls': `${CLOUDINARY}/v1774029215/facepulls_w5b1l3.mp4`,
  'Cable Rear Delt Fly': `${CLOUDINARY}/v1774029201/dumbell_reverse_fly_vavdjo.mp4`,
  'Reverse Fly': `${CLOUDINARY}/v1774029201/dumbell_reverse_fly_vavdjo.mp4`,
  'Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Barbell Curl': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Hammer Curl': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Incline Dumbbell Curl': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Preacher Curl': `${CLOUDINARY}/v1774029213/barpreacher_curls_qdfp0i.mp4`,
  'Concentration Curl': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Zottman Curl': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Shrugs': `${CLOUDINARY}/v1774029203/barbell_upright_row_bs7kau.mp4`,
  'Upright Row': `${CLOUDINARY}/v1774029203/barbell_upright_row_bs7kau.mp4`,

  // ── Legs / Glutes ──
  'Barbell Squat': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Front Squat': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Goblet Squat': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Sumo Squat': `${CLOUDINARY}/v1774029214/dumbellsumo_suqat_ntdjra.mp4`,
  'Hack Squat': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Jump Squat': `${CLOUDINARY}/v1774029212/dumbelljumpsqaut_gfmhjx.mp4`,
  'Cossack Squat': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Romanian Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Leg Press': `${CLOUDINARY}/v1774029230/legpress_cbqtvw.mp4`,
  'Leg Extension': `${CLOUDINARY}/v1774029229/legextentions_dzumhi.mp4`,
  'Leg Curl': `${CLOUDINARY}/v1774029229/legextentions_dzumhi.mp4`,
  'Seated Leg Curl': `${CLOUDINARY}/v1774029229/legextentions_dzumhi.mp4`,
  'Hip Thrust': `${CLOUDINARY}/v1774029213/barbell_hip_thrust_ecnuhj.mp4`,
  'Glute Bridge': `${CLOUDINARY}/v1774029212/barbell_glute_bridge_pulspt.mp4`,
  'Single Leg Glute Bridge': `${CLOUDINARY}/v1774029212/barbell_glute_bridge_pulspt.mp4`,
  'Bulgarian Split Squat': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Walking Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Dumbbell Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Lateral Lunge': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Step Up': `${CLOUDINARY}/v1774029201/dumbell_single_leg_step_up_zatudl.mp4`,
  'Calf Raises': `${CLOUDINARY}/v1774029201/dumbell_single_leg_step_up_zatudl.mp4`,
  'Wall Sit': `${CLOUDINARY}/v1774029204/wall_sit_oifund.mp4`,

  // ── Core ──
  'Plank': `${CLOUDINARY}/v1774029205/weightedfrontplan_qpdndz.mp4`,
  'Side Plank': `${CLOUDINARY}/v1774029205/weightedfrontplan_qpdndz.mp4`,
  'Ab Wheel Rollout': `${CLOUDINARY}/v1774029205/weightedfrontplan_qpdndz.mp4`,
  'Cable Crunch': `${CLOUDINARY}/v1774029205/weightedfrontplan_qpdndz.mp4`,
  'Crunches': `${CLOUDINARY}/v1774029205/weightedfrontplan_qpdndz.mp4`,
  'Hanging Leg Raise': `${CLOUDINARY}/v1774029198/legraisesfinal_fwllig.mp4`,
  'Leg Raises': `${CLOUDINARY}/v1774029198/legraisesfinal_fwllig.mp4`,
  'Reverse Crunch': `${CLOUDINARY}/v1774029198/legraisesfinal_fwllig.mp4`,
  'Bicycle Crunch': `${CLOUDINARY}/v1774029212/crossbody_mountain_climbers_ppi9f3.mp4`,
  'Russian Twist': `${CLOUDINARY}/v1774029203/russian_twist_roidjd.mp4`,
  'Mountain Climbers': `${CLOUDINARY}/v1774029212/crossbody_mountain_climbers_ppi9f3.mp4`,
  'Cross Body Mountain Climbers': `${CLOUDINARY}/v1774029212/crossbody_mountain_climbers_ppi9f3.mp4`,

  // ── Cardio ──
  'Brisk Walk': `${CLOUDINARY}/v1774029203/brisk_walk_gjazf1.mp4`,
  'High Knees': `${CLOUDINARY}/v1774029228/highknee_mlzn65.mp4`,
  'Burpees': `${CLOUDINARY}/v1774029228/highknee_mlzn65.mp4`,
  'Jumping Jacks': `${CLOUDINARY}/v1774029228/highknee_mlzn65.mp4`,
  'Skipping': `${CLOUDINARY}/v1774029228/highknee_mlzn65.mp4`,

  // ── Stretch / Recovery ──
  'Shoulder Stretch': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Hamstring Stretch': `${CLOUDINARY}/v1774029203/standing_hamstring_stretch_ag0bsq.mp4`,
  'Seated Hamstring Stretch': `${CLOUDINARY}/v1774029203/standing_hamstring_stretch_ag0bsq.mp4`,
  'Calf Stretch': `${CLOUDINARY}/v1774029197/hamstring_streching_n6dnxt.mp4`,
  'Hip Flexor Stretch': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Figure Four Stretch': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Deep Squat Hold': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Pigeon Pose Stretch': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Standing Quadriceps Stretch': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Downward Dog': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Arm Circles': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Leg Swings': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Hip Circles': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Shoulder Rolls': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Shoulder CARs': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Cross Body Arm Stretch': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Overhead Triceps Stretch': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Standing Biceps Stretch': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Wall Biceps Stretch': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
};

// Helper: lookup video URL by exercise name (case-insensitive)
export function getExerciseVideoUrl(name: string): string {
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];
  const key = Object.keys(EXERCISE_VIDEOS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? EXERCISE_VIDEOS[key] : '';
}
