// ── Cloudinary exercise video map ─────────────────────────────────────────────
// Maps exercise names → Cloudinary demo video URLs
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary

const CLOUDINARY = 'https://res.cloudinary.com/dkygyxsdw/video/upload';

export const EXERCISE_VIDEOS: Record<string, string> = {
  // Push (Chest / Shoulders / Triceps)
  'Barbell Bench Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Overhead Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Incline Dumbbell Press': `${CLOUDINARY}/v1774029229/inclinedumbellpress_vfgovp.mp4`,
  'Lateral Raises': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Tricep Pushdowns': `${CLOUDINARY}/v1774029198/triceppushdown_y10y7e.mp4`,
  'Overhead Tricep Extension': `${CLOUDINARY}/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4`,
  'Flat Dumbbell Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Arnold Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Close Grip Bench Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Dips': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Dips (Chest)': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Push-Ups (Burnout)': `${CLOUDINARY}/v1774029201/clap_pushups_jvljub.mp4`,
  'Dumbbell Floor Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Dumbbell Shoulder Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Incline Push-Ups': `${CLOUDINARY}/v1774029229/inclinepushups_wnhy4g.mp4`,
  'Dumbbell Lateral Raises': `${CLOUDINARY}/v1774029214/dumbell_lateral_raises_af7wan.mp4`,
  'Dumbbell Tricep Kickbacks': `${CLOUDINARY}/v1774029213/dumbell_kickbacks_zyzjar.mp4`,
  'Diamond Push-Ups': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Dumbbell Bench Press': `${CLOUDINARY}/v1774029214/dumbellpress_ref1ep.mp4`,
  'Dumbbell Arnold Press': `${CLOUDINARY}/v1774029197/machine_shoulder_press_bmhmr1.mp4`,
  'Push-Ups': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Dumbbell Overhead Extension': `${CLOUDINARY}/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4`,
  'Pike Push-Ups': `${CLOUDINARY}/v1774029199/pikepushups_lsp8hg.mp4`,
  'Decline Push-Ups': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Tricep Dips (Chair)': `${CLOUDINARY}/v1774029201/chair_dip_abp4bc.mp4`,
  'Plank to Push-Up': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,
  'Archer Push-Ups': `${CLOUDINARY}/v1774029197/archerpushups_pw1s1d.mp4`,
  'Hindu Push-Ups': `${CLOUDINARY}/v1774029216/hindupushups_hwawnk.mp4`,
  'Push-Up to Shoulder Tap': `${CLOUDINARY}/v1774029198/pushup_plus_n3k2wh.mp4`,

  // Pull (Back / Biceps)
  'Barbell Rows': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Pull-Ups': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Seated Cable Row': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Face Pulls': `${CLOUDINARY}/v1774029215/facepulls_w5b1l3.mp4`,
  'Barbell Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Hammer Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Lat Pulldown': `${CLOUDINARY}/v1774029229/latpulldown_snpror.mp4`,
  'Dumbbell Rows': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Reverse Flyes': `${CLOUDINARY}/v1774029201/dumbell_reverse_fly_vavdjo.mp4`,
  'Preacher Curls': `${CLOUDINARY}/v1774029213/barpreacher_curls_qdfp0i.mp4`,
  'Dumbbell Reverse Flyes': `${CLOUDINARY}/v1774029201/dumbell_reverse_fly_vavdjo.mp4`,
  'Dumbbell Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Dumbbell Hammer Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Dumbbell Bent Over Rows': `${CLOUDINARY}/v1774029203/seated_row_ebw7kd.mp4`,
  'Dumbbell Face Pulls (Band)': `${CLOUDINARY}/v1774029215/facepulls_w5b1l3.mp4`,
  'Dumbbell Concentration Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Dumbbell Reverse Curls': `${CLOUDINARY}/v1774029215/hammercurls_jzdzg7.mp4`,
  'Pull-Ups / Inverted Rows': `${CLOUDINARY}/v1774029199/inverted_row_x6jhru.mp4`,
  'Chin-Ups (or Negatives)': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Reverse Snow Angels': `${CLOUDINARY}/v1774029201/dumbell_reverse_fly_vavdjo.mp4`,
  'Dead Hang': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Pull-Ups (Wide Grip)': `${CLOUDINARY}/v1774029199/pullups_y9ptmv.mp4`,
  'Bodyweight Rows': `${CLOUDINARY}/v1774029199/inverted_row_x6jhru.mp4`,

  // Legs / Glutes
  'Barbell Squats': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Romanian Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Leg Press': `${CLOUDINARY}/v1774029230/legpress_cbqtvw.mp4`,
  'Front Squats': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Walking Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Leg Extensions': `${CLOUDINARY}/v1774029229/legextentions_dzumhi.mp4`,
  'Hip Thrusts': `${CLOUDINARY}/v1774029213/barbell_hip_thrust_ecnuhj.mp4`,
  'Dumbbell Goblet Squats': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Dumbbell Romanian Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Dumbbell Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Dumbbell Step-Ups': `${CLOUDINARY}/v1774029201/dumbell_single_leg_step_up_zatudl.mp4`,
  'Dumbbell Sumo Squats': `${CLOUDINARY}/v1774029214/dumbellsumo_suqat_ntdjra.mp4`,
  'Dumbbell Single Leg Deadlift': `${CLOUDINARY}/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4`,
  'Dumbbell Hip Thrusts': `${CLOUDINARY}/v1774029213/barbell_hip_thrust_ecnuhj.mp4`,
  'Dumbbell Side Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Bodyweight Squats': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Bulgarian Split Squats': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Glute Bridges': `${CLOUDINARY}/v1774029212/barbell_glute_bridge_pulspt.mp4`,
  'Wall Sit': `${CLOUDINARY}/v1774029204/wall_sit_oifund.mp4`,
  'Jump Squats': `${CLOUDINARY}/v1774029212/dumbelljumpsqaut_gfmhjx.mp4`,
  'Pistol Squats (Assisted)': `${CLOUDINARY}/v1774029215/frontsquts_yvs4dj.mp4`,
  'Side Lunges': `${CLOUDINARY}/v1774029201/dumbell_lunges_brfj3v.mp4`,
  'Step-Ups': `${CLOUDINARY}/v1774029201/dumbell_single_leg_step_up_zatudl.mp4`,
  'Single Leg Glute Bridge': `${CLOUDINARY}/v1774029212/barbell_glute_bridge_pulspt.mp4`,

  // Core
  'Plank Hold': `${CLOUDINARY}/v1774029196/plank_mmodhe.mp4`,
  'Hanging Leg Raises': `${CLOUDINARY}/v1774029198/legraisesfinal_fwllig.mp4`,
  'Hanging Knee Raises': `${CLOUDINARY}/v1774029198/legraisesfinal_fwllig.mp4`,
  'L-Sit Hold': `${CLOUDINARY}/v1774029228/lsits_etim2n.mp4`,
  'Russian Twists (w/ Dumbbell)': `${CLOUDINARY}/v1774029203/russian_twist_roidjd.mp4`,
  'Mountain Climbers': `${CLOUDINARY}/v1774029212/crossbody_mountain_climbers_ppi9f3.mp4`,

  // Cardio
  'High Knees': `${CLOUDINARY}/v1774029228/highknee_mlzn65.mp4`,
  'Brisk Walk / Light Jog': `${CLOUDINARY}/v1774029203/brisk_walk_gjazf1.mp4`,
  'Light Walk / Stretching': `${CLOUDINARY}/v1774029203/brisk_walk_gjazf1.mp4`,
  'Slow Walk': `${CLOUDINARY}/v1774029203/brisk_walk_gjazf1.mp4`,
  'Upright Rows': `${CLOUDINARY}/v1774029203/barbell_upright_row_bs7kau.mp4`,

  // Stretch / Recovery
  'Dynamic Stretching': `${CLOUDINARY}/v1774029197/stretching_vgp42u.mp4`,
  'Static Stretching': `${CLOUDINARY}/v1774029203/standing_hamstring_stretch_ag0bsq.mp4`,
  'Hip Flexor Stretch': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Deep Squat Hold': `${CLOUDINARY}/v1774029197/leg_stretching_kfnebj.mp4`,
  'Foam Rolling': `${CLOUDINARY}/v1774029214/foamrollerchest_stretch_oaghbe.mp4`,
  'Foam Rolling / Yoga': `${CLOUDINARY}/v1774029214/foamrollerchest_stretch_oaghbe.mp4`,
};

// Helper: lookup video URL by exercise name (case-insensitive)
export function getExerciseVideoUrl(name: string): string {
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];
  const key = Object.keys(EXERCISE_VIDEOS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? EXERCISE_VIDEOS[key] : '';
}
