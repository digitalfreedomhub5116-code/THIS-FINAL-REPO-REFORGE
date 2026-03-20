import { WorkoutDay, WorkoutPlan, Exercise } from '../types';

// ── Cloudinary exercise video map ─────────────────────────────────────────────
export const EXERCISE_VIDEOS: Record<string, string> = {
  // Push (Chest / Shoulders / Triceps)
  'Barbell Bench Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Overhead Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmhmr1.mp4',
  'Incline Dumbbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/inclinedumbellpress_vfgovp.mp4',
  'Lateral Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbell_lateral_raises_af7wan.mp4',
  'Tricep Pushdowns': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/triceppushdown_y10y7e.mp4',
  'Overhead Tricep Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4',
  'Flat Dumbbell Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Cable Flyes': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Arnold Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmhmr1.mp4',
  'Close Grip Bench Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Dips': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/chair_dip_abp4bc.mp4',
  'Dips (Chest)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/chair_dip_abp4bc.mp4',
  'Push-Ups (Burnout)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/clap_pushups_jvljub.mp4',
  'Dumbbell Floor Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Dumbbell Shoulder Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmhmr1.mp4',
  'Incline Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/inclinepushups_wnhy4g.mp4',
  'Dumbbell Lateral Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbell_lateral_raises_af7wan.mp4',
  'Dumbbell Tricep Kickbacks': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029213/dumbell_kickbacks_zyzjar.mp4',
  'Diamond Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/pushup_plus_n3k2wh.mp4',
  'Dumbbell Bench Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Dumbbell Arnold Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmhmr1.mp4',
  'Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/pushup_plus_n3k2wh.mp4',
  'Dumbbell Front Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbell_lateral_raises_af7wan.mp4',
  'Dumbbell Overhead Extension': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/highpulleyoverhead_tricep_extention_mfdhf4.mp4',
  'Pike Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/pikepushups_lsp8hg.mp4',
  'Decline Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/pushup_plus_n3k2wh.mp4',
  'Tricep Dips (Chair)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/chair_dip_abp4bc.mp4',
  'Plank to Push-Up': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/pushup_plus_n3k2wh.mp4',
  'Archer Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/archerpushups_pw1s1d.mp4',
  'Hindu Push-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029216/hindupushups_hwawnk.mp4',
  'Push-Up to Shoulder Tap': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/pushup_plus_n3k2wh.mp4',

  // Pull (Back / Biceps)
  'Barbell Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/seated_row_ebw7kd.mp4',
  'Pull-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/pullups_y9ptmv.mp4',
  'Seated Cable Row': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/seated_row_ebw7kd.mp4',
  'Face Pulls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/facepulls_w5b1l3.mp4',
  'Barbell Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Hammer Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4',
  'Lat Pulldown': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/latpulldown_snpror.mp4',
  'Dumbbell Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/seated_row_ebw7kd.mp4',
  'Reverse Flyes': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_reverse_fly_vavdjo.mp4',
  'Preacher Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029213/barpreacher_curls_qdfp0i.mp4',
  'Shrugs': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbell_lateral_raises_af7wan.mp4',
  'Dumbbell Reverse Flyes': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_reverse_fly_vavdjo.mp4',
  'Dumbbell Shrugs': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbell_lateral_raises_af7wan.mp4',
  'Dumbbell Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Dumbbell Hammer Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Dumbbell Bent Over Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/seated_row_ebw7kd.mp4',
  'Dumbbell Pullover': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellpress_ref1ep.mp4',
  'Dumbbell Face Pulls (Band)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/facepulls_w5b1l3.mp4',
  'Dumbbell Concentration Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Dumbbell Reverse Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/hammercurls_jzdzg7.mp4',
  'Pull-Ups / Inverted Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/inverted_row_x6jhru.mp4',
  'Chin-Ups (or Negatives)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/pullups_y9ptmv.mp4',
  'Reverse Snow Angels': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_reverse_fly_vavdjo.mp4',
  'Dead Hang': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/pullups_y9ptmv.mp4',
  'Pull-Ups (Wide Grip)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/pullups_y9ptmv.mp4',
  'Bodyweight Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029199/inverted_row_x6jhru.mp4',

  // Legs / Glutes
  'Barbell Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Romanian Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4',
  'Leg Press': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029230/legpress_cbqtvw.mp4',
  'Leg Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/legextentions_dzumhi.mp4',
  'Calf Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Front Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Walking Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Leg Extensions': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/legextentions_dzumhi.mp4',
  'Seated Leg Curls': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029229/legextentions_dzumhi.mp4',
  'Hip Thrusts': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029213/barbell_hip_thrust_ecnuhj.mp4',
  'Dumbbell Goblet Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Dumbbell Romanian Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4',
  'Dumbbell Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Dumbbell Calf Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Dumbbell Step-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_single_leg_step_up_zatudl.mp4',
  'Dumbbell Sumo Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/dumbellsumo_suqat_ntdjra.mp4',
  'Dumbbell Single Leg Deadlift': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_romanian_deadlift_hkz0gr.mp4',
  'Dumbbell Hip Thrusts': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029213/barbell_hip_thrust_ecnuhj.mp4',
  'Dumbbell Side Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Bodyweight Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Bulgarian Split Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Glute Bridges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029212/barbell_glute_bridge_pulspt.mp4',
  'Calf Raises (Single Leg)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Wall Sit': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029204/wall_sit_oifund.mp4',
  'Jump Squats': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029212/dumbelljumpsqaut_gfmhjx.mp4',
  'Pistol Squats (Assisted)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029215/frontsquts_yvs4dj.mp4',
  'Side Lunges': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_lunges_brfj3v.mp4',
  'Step-Ups': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029201/dumbell_single_leg_step_up_zatudl.mp4',
  'Single Leg Glute Bridge': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029212/barbell_glute_bridge_pulspt.mp4',

  // Core
  'Plank Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029196/plank_mmodhe.mp4',
  'Hanging Leg Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/legraisesfinal_fwllig.mp4',
  'Hanging Knee Raises': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029198/legraisesfinal_fwllig.mp4',
  'L-Sit Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029228/lsits_etim2n.mp4',
  'Bicycle Crunches': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/russian_twist_roidjd.mp4',
  'Russian Twists (w/ Dumbbell)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/russian_twist_roidjd.mp4',
  'Cable Crunches': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/russian_twist_roidjd.mp4',
  'Mountain Climbers': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029212/crossbody_mountain_climbers_ppi9f3.mp4',

  // Cardio
  'Burpees': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029230/highkneerun_jiufmr.mp4',
  'High Knees': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029228/highknee_mlzn65.mp4',
  'Brisk Walk / Light Jog': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'Light Walk / Stretching': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'Slow Walk': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  'Upright Rows': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/barbell_upright_row_bs7kau.mp4',

  // Stretch / Recovery
  'Dynamic Stretching': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_vgp42u.mp4',
  'Static Stretching': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/standing_hamstring_stretch_ag0bsq.mp4',
  'Hip Flexor Stretch': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_kfnebj.mp4',
  'Deep Squat Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_kfnebj.mp4',
  'Foam Rolling': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/foamrollerchest_stretch_oaghbe.mp4',
  'Foam Rolling / Yoga': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029214/foamrollerchest_stretch_oaghbe.mp4',
  'Arm Circles (Burnout)': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_vgp42u.mp4',
  'Superman Hold': 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029196/plank_mmodhe.mp4',
};

// Helper to build exercise entries (auto-looks up video from map)
const ex = (
  name: string,
  sets: number,
  reps: string,
  type: 'COMPOUND' | 'ACCESSORY' | 'CARDIO' | 'STRETCH',
  duration: number = 0,
  rest: number = 90,
  isSupplementary?: boolean
): Exercise => ({
  name,
  sets,
  reps,
  type,
  duration,
  rest,
  completed: false,
  isSupplementary,
  videoUrl: EXERCISE_VIDEOS[name] || '',
});

const DEFAULT_WARMUP: Exercise[] = [
  ex('Brisk Walk / Light Jog', 1, '3 min', 'CARDIO', 3, 15, true),
  ex('Dynamic Stretching', 1, '2 min', 'STRETCH', 2, 15, true),
];

const DEFAULT_COOLDOWN: Exercise[] = [
  ex('Slow Walk', 1, '3 min', 'CARDIO', 3, 15, true),
  ex('Static Stretching', 1, '3 min', 'STRETCH', 3, 15, true),
];

// ─────────────────────────────────────────────
// PLAN 1: Full Gym — Push/Pull/Legs
// ─────────────────────────────────────────────
const gymPPLDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Push', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Bench Press', 4, '8-10', 'COMPOUND', 8),
      ex('Overhead Press', 3, '8-10', 'COMPOUND', 7),
      ex('Incline Dumbbell Press', 3, '10-12', 'ACCESSORY', 6),
      ex('Lateral Raises', 3, '12-15', 'ACCESSORY', 5),
      ex('Tricep Pushdowns', 3, '12-15', 'ACCESSORY', 5),
      ex('Overhead Tricep Extension', 3, '12-15', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 2', focus: 'Pull', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Rows', 4, '8-10', 'COMPOUND', 8),
      ex('Pull-Ups', 3, '6-10', 'COMPOUND', 7),
      ex('Seated Cable Row', 3, '10-12', 'ACCESSORY', 6),
      ex('Face Pulls', 3, '15-20', 'ACCESSORY', 5),
      ex('Barbell Curls', 3, '10-12', 'ACCESSORY', 5),
      ex('Hammer Curls', 3, '12-15', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 3', focus: 'Legs', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Squats', 4, '8-10', 'COMPOUND', 8),
      ex('Romanian Deadlift', 3, '10-12', 'COMPOUND', 7),
      ex('Leg Press', 3, '10-12', 'ACCESSORY', 7),
      ex('Leg Curls', 3, '12-15', 'ACCESSORY', 5),
      ex('Calf Raises', 4, '15-20', 'ACCESSORY', 5),
      ex('Plank Hold', 3, '45s', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 4', focus: 'Push (Heavy)', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Overhead Press', 4, '6-8', 'COMPOUND', 8),
      ex('Flat Dumbbell Press', 3, '8-10', 'COMPOUND', 7),
      ex('Cable Flyes', 3, '12-15', 'ACCESSORY', 5),
      ex('Arnold Press', 3, '10-12', 'ACCESSORY', 6),
      ex('Close Grip Bench Press', 3, '8-10', 'COMPOUND', 6),
      ex('Dips', 3, '8-12', 'COMPOUND', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 5', focus: 'Pull (Heavy)', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Deadlift', 4, '5-8', 'COMPOUND', 10),
      ex('Lat Pulldown', 3, '10-12', 'ACCESSORY', 6),
      ex('Dumbbell Rows', 3, '10-12', 'ACCESSORY', 6),
      ex('Reverse Flyes', 3, '12-15', 'ACCESSORY', 5),
      ex('Preacher Curls', 3, '10-12', 'ACCESSORY', 5),
      ex('Shrugs', 3, '12-15', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 6', focus: 'Legs (Volume)', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Front Squats', 4, '8-10', 'COMPOUND', 8),
      ex('Walking Lunges', 3, '12 each', 'COMPOUND', 7),
      ex('Leg Extensions', 3, '12-15', 'ACCESSORY', 5),
      ex('Seated Leg Curls', 3, '12-15', 'ACCESSORY', 5),
      ex('Hip Thrusts', 3, '10-12', 'COMPOUND', 6),
      ex('Hanging Leg Raises', 3, '12-15', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Light Walk / Stretching', 1, '20 min', 'CARDIO', 20),
      ex('Foam Rolling', 1, '10 min', 'STRETCH', 10),
    ],
  },
];

// ─────────────────────────────────────────────
// PLAN 2: Full Gym — Classic Split (Chest/Back/Shoulders/Arms/Legs)
// ─────────────────────────────────────────────
const gymClassicDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Chest', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Bench Press', 4, '8-10', 'COMPOUND', 8),
      ex('Incline Dumbbell Press', 3, '10-12', 'COMPOUND', 7),
      ex('Cable Flyes', 3, '12-15', 'ACCESSORY', 5),
      ex('Dips (Chest)', 3, '8-12', 'COMPOUND', 6),
      ex('Push-Ups (Burnout)', 2, 'Max', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 2', focus: 'Back', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Deadlift', 4, '6-8', 'COMPOUND', 10),
      ex('Barbell Rows', 3, '8-10', 'COMPOUND', 7),
      ex('Lat Pulldown', 3, '10-12', 'ACCESSORY', 6),
      ex('Seated Cable Row', 3, '10-12', 'ACCESSORY', 6),
      ex('Face Pulls', 3, '15-20', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 3', focus: 'Legs', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Squats', 4, '8-10', 'COMPOUND', 8),
      ex('Leg Press', 3, '10-12', 'COMPOUND', 7),
      ex('Romanian Deadlift', 3, '10-12', 'COMPOUND', 7),
      ex('Leg Curls', 3, '12-15', 'ACCESSORY', 5),
      ex('Calf Raises', 4, '15-20', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 4', focus: 'Shoulders', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Overhead Press', 4, '8-10', 'COMPOUND', 8),
      ex('Arnold Press', 3, '10-12', 'ACCESSORY', 6),
      ex('Lateral Raises', 4, '12-15', 'ACCESSORY', 5),
      ex('Reverse Flyes', 3, '12-15', 'ACCESSORY', 5),
      ex('Upright Rows', 3, '10-12', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 5', focus: 'Arms & Core', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Curls', 3, '10-12', 'ACCESSORY', 5),
      ex('Close Grip Bench Press', 3, '8-10', 'COMPOUND', 6),
      ex('Hammer Curls', 3, '12-15', 'ACCESSORY', 5),
      ex('Tricep Pushdowns', 3, '12-15', 'ACCESSORY', 5),
      ex('Hanging Leg Raises', 3, '12-15', 'ACCESSORY', 5),
      ex('Cable Crunches', 3, '15-20', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 6', focus: 'Full Body Power', totalDuration: 60, exercises: [
      ...DEFAULT_WARMUP,
      ex('Barbell Squats', 3, '6-8', 'COMPOUND', 8),
      ex('Barbell Bench Press', 3, '6-8', 'COMPOUND', 7),
      ex('Barbell Rows', 3, '6-8', 'COMPOUND', 7),
      ex('Overhead Press', 3, '8-10', 'COMPOUND', 7),
      ex('Pull-Ups', 3, '6-10', 'COMPOUND', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Light Walk / Stretching', 1, '20 min', 'CARDIO', 20),
      ex('Foam Rolling', 1, '10 min', 'STRETCH', 10),
    ],
  },
];

// ─────────────────────────────────────────────
// PLAN 3: Home Dumbbells — Push/Pull/Legs
// ─────────────────────────────────────────────
const dumbbellPPLDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Push', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Floor Press', 4, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Shoulder Press', 3, '10-12', 'COMPOUND', 6),
      ex('Incline Push-Ups', 3, '12-15', 'COMPOUND', 5),
      ex('Dumbbell Lateral Raises', 3, '12-15', 'ACCESSORY', 5),
      ex('Dumbbell Tricep Kickbacks', 3, '12-15', 'ACCESSORY', 5),
      ex('Diamond Push-Ups', 3, '10-15', 'COMPOUND', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 2', focus: 'Pull', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Rows', 4, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Deadlift', 3, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Reverse Flyes', 3, '12-15', 'ACCESSORY', 5),
      ex('Dumbbell Shrugs', 3, '12-15', 'ACCESSORY', 5),
      ex('Dumbbell Curls', 3, '10-12', 'ACCESSORY', 5),
      ex('Dumbbell Hammer Curls', 3, '12-15', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 3', focus: 'Legs', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Goblet Squats', 4, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Romanian Deadlift', 3, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Lunges', 3, '10 each', 'COMPOUND', 7),
      ex('Dumbbell Calf Raises', 4, '15-20', 'ACCESSORY', 5),
      ex('Dumbbell Step-Ups', 3, '10 each', 'COMPOUND', 6),
      ex('Plank Hold', 3, '45s', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 4', focus: 'Upper Push', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Bench Press', 4, '8-10', 'COMPOUND', 7),
      ex('Dumbbell Arnold Press', 3, '10-12', 'COMPOUND', 6),
      ex('Push-Ups', 3, '15-20', 'COMPOUND', 5),
      ex('Dumbbell Front Raises', 3, '12-15', 'ACCESSORY', 5),
      ex('Dumbbell Overhead Extension', 3, '12-15', 'ACCESSORY', 5),
      ex('Pike Push-Ups', 3, '8-12', 'COMPOUND', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 5', focus: 'Upper Pull', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Bent Over Rows', 4, '8-10', 'COMPOUND', 7),
      ex('Dumbbell Pullover', 3, '10-12', 'ACCESSORY', 6),
      ex('Dumbbell Face Pulls (Band)', 3, '15-20', 'ACCESSORY', 5),
      ex('Dumbbell Concentration Curls', 3, '10-12', 'ACCESSORY', 5),
      ex('Dumbbell Reverse Curls', 3, '12-15', 'ACCESSORY', 5),
      ex('Superman Hold', 3, '30s', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 6', focus: 'Legs & Core', totalDuration: 55, exercises: [
      ...DEFAULT_WARMUP,
      ex('Dumbbell Sumo Squats', 4, '10-12', 'COMPOUND', 7),
      ex('Dumbbell Single Leg Deadlift', 3, '10 each', 'COMPOUND', 7),
      ex('Dumbbell Hip Thrusts', 3, '12-15', 'COMPOUND', 6),
      ex('Dumbbell Side Lunges', 3, '10 each', 'COMPOUND', 6),
      ex('Bicycle Crunches', 3, '20', 'ACCESSORY', 4),
      ex('Russian Twists (w/ Dumbbell)', 3, '20', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Light Walk / Stretching', 1, '20 min', 'CARDIO', 20),
      ex('Foam Rolling', 1, '10 min', 'STRETCH', 10),
    ],
  },
];

// ─────────────────────────────────────────────
// PLAN 4: Bodyweight — Classic Split
// ─────────────────────────────────────────────
const bodyweightClassicDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Upper Push', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Push-Ups', 4, '15-20', 'COMPOUND', 5),
      ex('Diamond Push-Ups', 3, '10-15', 'COMPOUND', 5),
      ex('Pike Push-Ups', 3, '8-12', 'COMPOUND', 5),
      ex('Decline Push-Ups', 3, '12-15', 'COMPOUND', 5),
      ex('Tricep Dips (Chair)', 3, '12-15', 'COMPOUND', 5),
      ex('Plank to Push-Up', 3, '10', 'ACCESSORY', 5),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 2', focus: 'Upper Pull & Core', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Pull-Ups / Inverted Rows', 4, '6-12', 'COMPOUND', 7),
      ex('Chin-Ups (or Negatives)', 3, '6-10', 'COMPOUND', 6),
      ex('Superman Hold', 3, '30s', 'ACCESSORY', 4),
      ex('Reverse Snow Angels', 3, '12-15', 'ACCESSORY', 5),
      ex('Hanging Knee Raises', 3, '12-15', 'ACCESSORY', 5),
      ex('Dead Hang', 3, '30s', 'ACCESSORY', 3),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 3', focus: 'Legs', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Bodyweight Squats', 4, '20', 'COMPOUND', 5),
      ex('Lunges', 3, '12 each', 'COMPOUND', 6),
      ex('Bulgarian Split Squats', 3, '10 each', 'COMPOUND', 7),
      ex('Glute Bridges', 3, '15-20', 'COMPOUND', 5),
      ex('Calf Raises (Single Leg)', 4, '15 each', 'ACCESSORY', 5),
      ex('Wall Sit', 3, '45s', 'ACCESSORY', 3),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 4', focus: 'Full Body HIIT', totalDuration: 45, exercises: [
      ...DEFAULT_WARMUP,
      ex('Burpees', 4, '10', 'CARDIO', 5),
      ex('Mountain Climbers', 3, '30s', 'CARDIO', 3),
      ex('Jump Squats', 3, '15', 'COMPOUND', 4),
      ex('Push-Up to Shoulder Tap', 3, '12', 'COMPOUND', 5),
      ex('High Knees', 3, '30s', 'CARDIO', 3),
      ex('Plank Hold', 3, '60s', 'ACCESSORY', 4),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 5', focus: 'Upper Strength', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Archer Push-Ups', 3, '6-8 each', 'COMPOUND', 6),
      ex('Pull-Ups (Wide Grip)', 3, '6-10', 'COMPOUND', 7),
      ex('Hindu Push-Ups', 3, '10-15', 'COMPOUND', 5),
      ex('Bodyweight Rows', 3, '12-15', 'COMPOUND', 6),
      ex('L-Sit Hold', 3, '15-20s', 'ACCESSORY', 3),
      ex('Arm Circles (Burnout)', 2, '30s each', 'STRETCH', 3),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 6', focus: 'Legs & Mobility', totalDuration: 50, exercises: [
      ...DEFAULT_WARMUP,
      ex('Pistol Squats (Assisted)', 3, '6-8 each', 'COMPOUND', 6),
      ex('Side Lunges', 3, '12 each', 'COMPOUND', 6),
      ex('Step-Ups', 3, '12 each', 'COMPOUND', 6),
      ex('Single Leg Glute Bridge', 3, '12 each', 'COMPOUND', 5),
      ex('Hip Flexor Stretch', 2, '30s each', 'STRETCH', 3),
      ex('Deep Squat Hold', 3, '30s', 'STRETCH', 3),
      ...DEFAULT_COOLDOWN,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Light Walk / Stretching', 1, '20 min', 'CARDIO', 20),
      ex('Foam Rolling / Yoga', 1, '10 min', 'STRETCH', 10),
    ],
  },
];

// Expand a 1-week template to 4 weeks
function expandToFourWeeks(weekTemplate: WorkoutDay[]): WorkoutDay[] {
  const result: WorkoutDay[] = [];
  for (let week = 0; week < 4; week++) {
    weekTemplate.forEach((day, i) => {
      const dayNum = week * weekTemplate.length + i + 1;
      result.push({
        ...day,
        day: `Day ${dayNum}`,
        exercises: day.exercises.map(e => ({ ...e, completed: false })),
      });
    });
  }
  return result;
}

export const DEFAULT_PLANS: WorkoutPlan[] = [
  {
    id: -1,
    name: 'Gym Domination: PPL',
    description: 'Push/Pull/Legs split for full gym access. High volume, proven strength builder.',
    difficulty: 'INTERMEDIATE',
    equipment: 'GYM',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(gymPPLDays),
    is_active: true,
    display_order: 1,
  },
  {
    id: -2,
    name: 'Iron Classic Split',
    description: 'Traditional bodypart split. Chest, Back, Legs, Shoulders, Arms + Full Body power day.',
    difficulty: 'INTERMEDIATE',
    equipment: 'GYM',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(gymClassicDays),
    is_active: true,
    display_order: 2,
  },
  {
    id: -3,
    name: 'Home Iron: Dumbbell PPL',
    description: 'Push/Pull/Legs with dumbbells only. Perfect for home gym warriors.',
    difficulty: 'BEGINNER',
    equipment: 'HOME_DUMBBELLS',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(dumbbellPPLDays),
    is_active: true,
    display_order: 3,
  },
  {
    id: -4,
    name: 'No Excuses: Bodyweight',
    description: 'Zero equipment needed. Calisthenics-based program for anywhere, anytime.',
    difficulty: 'BEGINNER',
    equipment: 'BODYWEIGHT',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(bodyweightClassicDays),
    is_active: true,
    display_order: 4,
  },
];

// Auto-select the best default plan based on user equipment and split preference
export function getRecommendedPlan(
  equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT',
  split?: 'PPL' | 'CLASSIC'
): WorkoutPlan {
  const eqPlans = DEFAULT_PLANS.filter(p => p.equipment === equipment);
  if (eqPlans.length === 0) return DEFAULT_PLANS[3]; // fallback: bodyweight

  if (split === 'PPL') {
    const ppl = eqPlans.find(p => p.name.includes('PPL'));
    if (ppl) return ppl;
  }
  if (split === 'CLASSIC') {
    const classic = eqPlans.find(p => p.name.includes('Classic') || p.name.includes('Bodyweight'));
    if (classic) return classic;
  }

  return eqPlans[0];
}
