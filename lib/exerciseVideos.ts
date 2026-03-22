// ── Cloudinary exercise video map ─────────────────────────────────────────────
// Maps exercise names → Cloudinary demo video URLs
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary, defaultPlans

// ── User-provided URLs (primary sources) ──
const V = {
  dynamicStretching: 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4',
  barbellBench:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_benchpress_yqbxws.mp4',
  overheadPress:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_shoulder_press_bmsnr1.mp4',
  inclineDB:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/inclinedumbelpress_vfgngy.mp4',
  lateralRaises:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/machine_lateral_raises_of7qan.mp4',
  tricepPushdown:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/triceppushdown_z32y7n.mp4',
  overheadTricep:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/highpulleyoverhead_tricep_extention_ahfehc.mp4',
  briskWalk:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  staticStretching:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  barbellRows:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_upright_row_ba7hmw.mp4',
  pullUps:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/pullups_phytmu.mp4',
  seatedRow:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/seated_row_otmti3.mp4',
  facePulls:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/facepulls_ebnli2.mp4',
  barbellCurls:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_curls_dmdnvd.mp4',
  hammerCurls:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/hammercurls_jh0qy7.mp4',
  barbellSquats:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_squats_inzbeb.mp4',
  romanianDL:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_romanian_deadlift_nszbgw.mp4',
  legPress:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legpress_ilqivw.mp4',
  legExtension:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legextension_dausmi.mp4',
  calfRaises:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/calf_raises_ilbooa.mp4',
  plank:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/plank_xnosho.mp4',
  flatDBPress:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbellpress_rwfcep.mp4',
  cableFlyes:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/cableflyes_zdrwy2.mp4',
  arnoldPress:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/arnoldpress_inkrme.mp4',
  closeGripBench:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/closegripbenchpress_hkdgyb.mp4',
  dips:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/chair_dip_onqvke.mp4',
  deadlift:          'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/deadlifts_ljzuek.gif',
  latPulldown:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/latpulldown_ongnqr.mp4',
  dbRows:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_rows_nkdbqa.mp4',
  reverseFlyes:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_reverse_fly_vwx0jn.mp4',
  preacherCurls:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4',
  shrugs:            'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/dumbbell_shrug_bwrgvo.gif',
  frontSquats:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/frontsquats_yvvwki.mp4',
  walkingLunges:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/dumbbell_lunges_prt1jv.mp4',
  seatedLegCurls:    'https://res.cloudinary.com/dkygyxsdw/image/upload/v1774029197/leg_curls_o2v6fe.gif',
  hipThrusts:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/barbell_hip_thrust_mvwky2.mp4',
  hangingLegRaises:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/legraisesflatbench_fwll1y.mp4',
};

export const EXERCISE_VIDEOS: Record<string, string> = {
  // ══════════════════════════════════════════════
  // ── Push (Chest / Shoulders / Triceps) ──
  // ══════════════════════════════════════════════
  'Barbell Bench Press':             V.barbellBench,
  'Close Grip Bench Press':          V.closeGripBench,
  'Incline Dumbbell Press':          V.inclineDB,
  'Flat Dumbbell Press':             V.flatDBPress,
  'Dumbbell Press':                  V.flatDBPress,
  'Floor Press':                     V.flatDBPress,
  'Dumbbell Fly':                    V.cableFlyes,
  'Cable Flyes':                     V.cableFlyes,
  'Cable Fly':                       V.cableFlyes,
  'Dips':                            V.dips,
  'Parallel Bar Dips':               V.dips,
  'Chair Dips':                      V.dips,

  'Overhead Press':                  V.overheadPress,
  'Overhead Barbell Press':          V.overheadPress,
  'Dumbbell Shoulder Press':         V.overheadPress,
  'Machine Shoulder Press':          V.overheadPress,
  'Arnold Press':                    V.arnoldPress,
  'Lateral Raises':                  V.lateralRaises,
  'Dumbbell Lateral Raise':          V.lateralRaises,
  'Cable Lateral Raise':             V.lateralRaises,
  'Cable Front Raise':               V.lateralRaises,

  'Tricep Pushdowns':                V.tricepPushdown,
  'Tricep Pushdown':                 V.tricepPushdown,
  'Rope Triceps Pushdown':           V.tricepPushdown,
  'Overhead Tricep Extension':       V.overheadTricep,
  'Cable Overhead Triceps Extension': V.overheadTricep,
  'Dumbbell Triceps Extension':      V.overheadTricep,
  'Dumbbell Tricep Kickback':        V.overheadTricep,

  'Push-Ups':                        V.barbellBench,
  'Diamond Push-Ups':                V.barbellBench,
  'Pike Push-Ups':                   V.overheadPress,
  'Archer Pushups':                  V.barbellBench,
  'Clap Push-Up':                    V.barbellBench,

  // ══════════════════════════════════════════════
  // ── Pull (Back / Biceps) ──
  // ══════════════════════════════════════════════
  'Pull-Ups':                        V.pullUps,
  'Chin-Ups':                        V.pullUps,
  'Lat Pulldown':                    V.latPulldown,
  'Wide Grip Lat Pulldown':          V.latPulldown,
  'Seated Cable Row':                V.seatedRow,
  'Wide Grip Seated Row':            V.seatedRow,
  'Cable Row':                       V.seatedRow,
  'Barbell Rows':                    V.barbellRows,
  'Barbell Row':                     V.barbellRows,
  'Bent Over Row':                   V.barbellRows,
  'Upright Row':                     V.barbellRows,
  'Dumbbell Rows':                   V.dbRows,
  'Dumbbell Row':                    V.dbRows,
  'Single Arm Dumbbell Row':         V.dbRows,
  'Deadlift':                        V.deadlift,

  'Face Pulls':                      V.facePulls,
  'Reverse Flyes':                   V.reverseFlyes,
  'Cable Rear Delt Fly':             V.reverseFlyes,
  'Reverse Fly':                     V.reverseFlyes,
  'Shrugs':                          V.shrugs,

  'Barbell Curls':                   V.barbellCurls,
  'Barbell Curl':                    V.barbellCurls,
  'Incline Dumbbell Curl':           V.barbellCurls,
  'Concentration Curl':              V.barbellCurls,
  'Zottman Curl':                    V.barbellCurls,
  'Hammer Curls':                    V.hammerCurls,
  'Hammer Curl':                     V.hammerCurls,
  'Preacher Curls':                  V.preacherCurls,
  'Preacher Curl':                   V.preacherCurls,

  // ══════════════════════════════════════════════
  // ── Legs / Glutes ──
  // ══════════════════════════════════════════════
  'Barbell Squats':                  V.barbellSquats,
  'Barbell Squat':                   V.barbellSquats,
  'Front Squats':                    V.frontSquats,
  'Front Squat':                     V.frontSquats,
  'Goblet Squat':                    V.frontSquats,
  'Sumo Squat':                      V.barbellSquats,
  'Hack Squat':                      V.barbellSquats,
  'Jump Squat':                      V.barbellSquats,
  'Cossack Squat':                   V.frontSquats,
  'Romanian Deadlift':               V.romanianDL,
  'Leg Press':                       V.legPress,
  'Leg Extensions':                  V.legExtension,
  'Leg Extension':                   V.legExtension,
  'Leg Curls':                       V.legExtension,
  'Leg Curl':                        V.legExtension,
  'Seated Leg Curls':                V.seatedLegCurls,
  'Seated Leg Curl':                 V.seatedLegCurls,
  'Hip Thrusts':                     V.hipThrusts,
  'Hip Thrust':                      V.hipThrusts,
  'Glute Bridge':                    V.hipThrusts,
  'Single Leg Glute Bridge':         V.hipThrusts,
  'Walking Lunges':                  V.walkingLunges,
  'Lunges':                          V.walkingLunges,
  'Dumbbell Lunges':                 V.walkingLunges,
  'Bulgarian Split Squat':           V.walkingLunges,
  'Lateral Lunge':                   V.walkingLunges,
  'Step Up':                         V.walkingLunges,
  'Calf Raises':                     V.calfRaises,
  'Wall Sit':                        V.barbellSquats,

  // ══════════════════════════════════════════════
  // ── Core ──
  // ══════════════════════════════════════════════
  'Plank Hold':                      V.plank,
  'Plank':                           V.plank,
  'Side Plank':                      V.plank,
  'Ab Wheel Rollout':                V.plank,
  'Cable Crunch':                    V.hangingLegRaises,
  'Crunches':                        V.hangingLegRaises,
  'Hanging Leg Raises':              V.hangingLegRaises,
  'Hanging Leg Raise':               V.hangingLegRaises,
  'Leg Raises':                      V.hangingLegRaises,
  'Reverse Crunch':                  V.hangingLegRaises,
  'Bicycle Crunch':                  V.hangingLegRaises,
  'Russian Twist':                   V.hangingLegRaises,
  'Mountain Climbers':               V.hangingLegRaises,
  'Cross Body Mountain Climbers':    V.hangingLegRaises,

  // ══════════════════════════════════════════════
  // ── Cardio ──
  // ══════════════════════════════════════════════
  'Slow Walk':                       V.briskWalk,
  'Brisk Walk / Light Jog':          V.briskWalk,
  'Brisk Walk':                      V.briskWalk,
  'High Knees':                      V.briskWalk,
  'Burpees':                         V.briskWalk,
  'Jumping Jacks':                   V.briskWalk,
  'Skipping':                        V.briskWalk,

  // ══════════════════════════════════════════════
  // ── Stretch / Recovery ──
  // ══════════════════════════════════════════════
  'Dynamic Stretching':              V.dynamicStretching,
  'Static Stretching':               V.staticStretching,
  'Shoulder Stretch':                V.staticStretching,
  'Hamstring Stretch':               V.dynamicStretching,
  'Seated Hamstring Stretch':        V.dynamicStretching,
  'Calf Stretch':                    V.dynamicStretching,
  'Hip Flexor Stretch':              V.dynamicStretching,
  'Figure Four Stretch':             V.dynamicStretching,
  'Deep Squat Hold':                 V.dynamicStretching,
  'Pigeon Pose Stretch':             V.dynamicStretching,
  'Standing Quadriceps Stretch':     V.dynamicStretching,
  'Downward Dog':                    V.staticStretching,
  'Arm Circles':                     V.staticStretching,
  'Leg Swings':                      V.dynamicStretching,
  'Hip Circles':                     V.dynamicStretching,
  'Shoulder Rolls':                  V.staticStretching,
  'Shoulder CARs':                   V.staticStretching,
  'Cross Body Arm Stretch':          V.staticStretching,
  'Overhead Triceps Stretch':        V.staticStretching,
  'Standing Biceps Stretch':         V.staticStretching,
  'Wall Biceps Stretch':             V.staticStretching,
};

// Helper: lookup video URL by exercise name (case-insensitive)
export function getExerciseVideoUrl(name: string): string {
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];
  const key = Object.keys(EXERCISE_VIDEOS).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? EXERCISE_VIDEOS[key] : '';
}
