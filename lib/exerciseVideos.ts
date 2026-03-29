// ── Local exercise video map ──────────────────────────────────────────────────
// Maps exercise names → local video paths (bundled in public/videos/exercises/)
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary, defaultPlans
//
// 135 exercises with local .mp4 files (compressed, 480p)

// ── New MuscleWiki-sourced URLs ──
const N = {
  barbellBenchPress:     '/videos/exercises/barbell_bench_press.mp4',
  inclineDumbbellPress:  '/videos/exercises/incline_dumbbell_press.mp4',
  cableFly:              '/videos/exercises/cable_fly.mp4',
  dumbbellPress:         '/videos/exercises/dumbbell_press.mp4',
  overheadBarbellPress:  '/videos/exercises/overhead_barbell_press.mp4',
  lateralRaises:         '/videos/exercises/lateral_raises.mp4',
  dumbbellShoulderPress: '/videos/exercises/dumbbell_shoulder_press.mp4',
  tricepPushdown:        '/videos/exercises/tricep_pushdown.mp4',
  diamondPushUps:        '/videos/exercises/diamond_push_ups.mp4',
  dips:                  '/videos/exercises/dips.mp4',
  barbellRow:            '/videos/exercises/barbell_row.mp4',
  pullUps:               '/videos/exercises/pull_ups.mp4',
  latPulldown:           '/videos/exercises/lat_pulldown.mp4',
  cableRow:              '/videos/exercises/cable_row.mp4',
  deadlift:              '/videos/exercises/deadlift.mp4',
  romanianDeadlift:      '/videos/exercises/romanian_deadlift.mp4',
  dumbbellRow:           '/videos/exercises/dumbbell_row.mp4',
  barbellCurl:           '/videos/exercises/barbell_curl.mp4',
  chinUps:               '/videos/exercises/chin_ups.mp4',
  barbellSquat:          '/videos/exercises/barbell_squat.mp4',
  legPress:              '/videos/exercises/leg_press.mp4',
  legCurl:               '/videos/exercises/leg_curl.mp4',
  calfRaises:            '/videos/exercises/calf_raises.mp4',
  dumbbellLunges:        '/videos/exercises/dumbbell_lunges.mp4',
  gobletSquat:           '/videos/exercises/goblet_squat.mp4',
  jumpSquats:            '/videos/exercises/jump_squats.mp4',
  plank:                 '/videos/exercises/plank.mp4',
  crunches:              '/videos/exercises/crunches.mp4',
  legRaises:             '/videos/exercises/leg_raises.mp4',
  russianTwist:          '/videos/exercises/russian_twist.mp4',
  mountainClimbers:      '/videos/exercises/mountain_climbers.mp4',
  pushUps:               '/videos/exercises/push_ups.mp4',
  pikePushUps:           '/videos/exercises/pike_push_ups.mp4',
  burpees:               '/videos/exercises/burpees.mp4',
  jumpingJacks:          '/videos/exercises/jumping_jacks.mp4',
  dumbbellTricepKickback:'/videos/exercises/dumbbell_tricep_kickback.mp4',
  treadmillRun:          '/videos/exercises/treadmill_run.mp4',
  rowingMachine:         '/videos/exercises/rowing_machine.mp4',
  hipThrust:             '/videos/exercises/hip_thrust.mp4',
  dumbbellFly:           '/videos/exercises/dumbbell_fly.mp4',
  cableLateralRaise:     '/videos/exercises/cable_lateral_raise.mp4',
  dumbbellLateralRaise:  '/videos/exercises/dumbbell_lateral_raise.mp4',
  cableFrontRaise:       '/videos/exercises/cable_front_raise.mp4',
  uprightRow:            '/videos/exercises/upright_row.mp4',
  shrugs:                '/videos/exercises/shrugs.mp4',
  externalRotation:      '/videos/exercises/external_rotation.mp4',
  crossBodyMtnClimbers:  '/videos/exercises/cross_body_mountain_climbers.mp4',
  threadTheNeedle:       '/videos/exercises/thread_the_needle_stretch.mp4',
  hammerCurl:            '/videos/exercises/hammer_curl.mp4',
  concentrationCurl:     '/videos/exercises/concentration_curl.mp4',
  inclineDumbbellCurl:   '/videos/exercises/incline_dumbbell_curl.mp4',
  spiderCurl:            '/videos/exercises/spider_curl.mp4',
  ezBarCurl:             '/videos/exercises/ez_bar_curl.mp4',
  reverseFly:            '/videos/exercises/reverse_fly.mp4',
  zottmanCurl:           '/videos/exercises/zottman_curl.mp4',
  jumpRope:              '/videos/exercises/jump_rope.mp4',
  closeGripBench:        '/videos/exercises/close_grip_bench_press.mp4',
  parallelBarDips:       '/videos/exercises/parallel_bar_dips.mp4',
  chairDips:             '/videos/exercises/chair_dips.mp4',
  floorPress:            '/videos/exercises/floor_press.mp4',
  ropeTricepsPushdown:   '/videos/exercises/rope_triceps_pushdown.mp4',
  skullCrusher:          '/videos/exercises/skull_crusher.mp4',
  cableOverheadTricep:   '/videos/exercises/cable_overhead_triceps_extension.mp4',
  kickback:              '/videos/exercises/kickback.mp4',
  singleArmCablePush:    '/videos/exercises/single_arm_cable_pushdown.mp4',
  reverseGripPushdown:   '/videos/exercises/reverse_grip_triceps_pushdown.mp4',
  frontSquat:            '/videos/exercises/front_squat.mp4',
  lunges:                '/videos/exercises/lunges.mp4',
  walkingLunges:         '/videos/exercises/walking_lunges.mp4',
  bulgarianSplitSquat:   '/videos/exercises/bulgarian_split_squat.mp4',
  jumpSquat:             '/videos/exercises/jump_squat.mp4',
  boxJumps:              '/videos/exercises/box_jumps.mp4',
  legExtension:          '/videos/exercises/leg_extension.mp4',
  seatedLegCurl:         '/videos/exercises/seated_leg_curl.mp4',
  seatedCalfRaise:       '/videos/exercises/seated_calf_raise.mp4',
  donkeyCalfRaise:       '/videos/exercises/donkey_calf_raise.mp4',
  gluteKickback:         '/videos/exercises/glute_kickback.mp4',
  cableHipAbduction:     '/videos/exercises/cable_hip_abduction.mp4',
  cableHipAdduction:     '/videos/exercises/cable_hip_adduction.mp4',
  standingQuadStretch:   '/videos/exercises/standing_quadriceps_stretch.mp4',
  hamstringStretch:      '/videos/exercises/hamstring_stretch.mp4',
  seatedHamstringStr:    '/videos/exercises/seated_hamstring_stretch.mp4',
  butterflyStretch:      '/videos/exercises/butterfly_stretch.mp4',
  calfStretch:           '/videos/exercises/calf_stretch.mp4',
  hipFlexorStretch:      '/videos/exercises/hip_flexor_stretch.mp4',
  pigeonPoseStretch:     '/videos/exercises/pigeon_pose_stretch.mp4',
  sideLungeStretch:      '/videos/exercises/side_lunge_stretch.mp4',
  gluteBridge:           '/videos/exercises/glute_bridge.mp4',
  kettlebellSwing:       '/videos/exercises/kettlebell_swing.mp4',
  cableGluteKickback:    '/videos/exercises/cable_glute_kickback.mp4',
  donkeyKicks:           '/videos/exercises/donkey_kicks.mp4',
  hipAbductionMachine:   '/videos/exercises/hip_abduction_machine.mp4',
  gluteKickbackMachine:  '/videos/exercises/glute_kickback_machine.mp4',
  singleLegGluteBridge:  '/videos/exercises/single_leg_glute_bridge.mp4',
  facePulls:             '/videos/exercises/face_pulls.mp4',
  russianTwists:         '/videos/exercises/russian_twists.mp4',
  plankJacks:            '/videos/exercises/plank_jacks.mp4',
  bicycleCrunch:         '/videos/exercises/bicycle_crunch.mp4',
  crunch:                '/videos/exercises/crunch.mp4',
  sitUp:                 '/videos/exercises/sit_up.mp4',
  hangingLegRaise:       '/videos/exercises/hanging_leg_raise.mp4',
  lyingLegRaise:         '/videos/exercises/lying_leg_raise.mp4',
  cableCrunch:           '/videos/exercises/cable_crunch.mp4',
  reverseCrunch:         '/videos/exercises/reverse_crunch.mp4',
  seatedSpinalTwist:     '/videos/exercises/seated_spinal_twist.mp4',
  bentOverRow:           '/videos/exercises/bent_over_row.mp4',
  seatedCableRow:        '/videos/exercises/seated_cable_row.mp4',
  singleArmDbRow:        '/videos/exercises/single_arm_dumbbell_row.mp4',
  wideGripLatPulldown:   '/videos/exercises/wide_grip_lat_pulldown.mp4',
  cableRearDeltFly:      '/videos/exercises/cable_rear_delt_fly.mp4',
  resistanceBandPull:    '/videos/exercises/resistance_band_pull_apart.mp4',
  barbellBackSquat:      '/videos/exercises/barbell_back_squat.mp4',
  snatch:                '/videos/exercises/snatch.mp4',
  thruster:              '/videos/exercises/thruster.mp4',
  kettlebellSnatch:      '/videos/exercises/kettlebell_snatch.mp4',
  wallSit:               '/videos/exercises/wall_sit.mp4',
  inchwormWalk:          '/videos/exercises/inchworm_walk.mp4',
  windmill:              '/videos/exercises/windmill.mp4',
  lateralLunge:          '/videos/exercises/lateral_lunge.mp4',
  jogging:               '/videos/exercises/jogging.mp4',
  sprint:                '/videos/exercises/sprint.mp4',
  elliptical:            '/videos/exercises/elliptical_training.mp4',
  skaterJump:            '/videos/exercises/skater_jump.mp4',
  buttKicks:             '/videos/exercises/butt_kicks.mp4',
  skipping:              '/videos/exercises/skipping.mp4',
  cariocaDrill:          '/videos/exercises/carioca_drill.mp4',
  jumpLunges:            '/videos/exercises/jump_lunges.mp4',
  dynamicSideShuffle:    '/videos/exercises/dynamic_side_shuffle.mp4',
  downwardDog:           '/videos/exercises/downward_dog.mp4',
  standingForwardBend:   '/videos/exercises/standing_forward_bend.mp4',
  seatedForwardFold:     '/videos/exercises/seated_forward_fold.mp4',
  lyingSpinalTwist:      '/videos/exercises/lying_spinal_twist.mp4',
  kneelingHipFlexor:     '/videos/exercises/kneeling_hip_flexor_stretch.mp4',
  machineShoulderPress:  '/videos/exercises/machine_shoulder_press.mp4',
  gluteActivationWalk:   '/videos/exercises/glute_activation_walk.mp4',
  arnoldPress:           '/videos/exercises/dumbbell_shoulder_press.mp4',  // arnold_press.mp4 missing, closest match
  preacherCurl:          '/videos/exercises/incline_dumbbell_curl.mp4',   // preacher_curl.mp4 missing, closest match
  briskWalk:             '/videos/exercises/jogging.mp4',                  // brisk_walk.mp4 missing, closest match
  shoulderStretch:       '/videos/exercises/thread_the_needle_stretch.mp4', // shoulder_stretch.mp4 missing, closest match
};


export const EXERCISE_VIDEOS: Record<string, string> = {
  // ══════════════════════════════════════════════
  // ── Push (Chest / Shoulders / Triceps) ──
  // ══════════════════════════════════════════════
  'Barbell Bench Press':             N.barbellBenchPress,
  'Close Grip Bench Press':          N.closeGripBench,
  'Incline Dumbbell Press':          N.inclineDumbbellPress,
  'Flat Dumbbell Press':             N.dumbbellPress,
  'Dumbbell Press':                  N.dumbbellPress,
  'Floor Press':                     N.floorPress,
  'Dumbbell Fly':                    N.dumbbellFly,
  'Cable Flyes':                     N.cableFly,
  'Cable Fly':                       N.cableFly,
  'Dip':                             N.dips,
  'Dips':                            N.dips,
  'Parallel Bar Dips':               N.parallelBarDips,
  'Chair Dips':                      N.chairDips,

  'Overhead Press':                  N.overheadBarbellPress,
  'Overhead Barbell Press':          N.overheadBarbellPress,
  'Dumbbell Shoulder Press':         N.dumbbellShoulderPress,
  'Machine Shoulder Press':          N.machineShoulderPress,
  'Arnold Press':                    N.arnoldPress,
  'Lateral Raises':                  N.lateralRaises,
  'Dumbbell Lateral Raise':          N.dumbbellLateralRaise,
  'Cable Lateral Raise':             N.cableLateralRaise,
  'Cable Front Raise':               N.cableFrontRaise,

  'Tricep Pushdowns':                N.tricepPushdown,
  'Tricep Pushdown':                 N.tricepPushdown,
  'Rope Triceps Pushdown':           N.ropeTricepsPushdown,
  'Overhead Tricep Extension':       N.cableOverheadTricep,
  'Cable Overhead Triceps Extension': N.cableOverheadTricep,
  'Dumbbell Triceps Extension':      N.dumbbellTricepKickback,
  'Dumbbell Tricep Kickback':        N.dumbbellTricepKickback,
  'Dumbbell Tricep Kickbacks':       N.dumbbellTricepKickback,
  'Skull Crusher':                   N.skullCrusher,
  'EZ Bar Skull Crusher':            N.skullCrusher,
  'Kickback':                        N.kickback,
  'Single Arm Cable Pushdown':       N.singleArmCablePush,
  'Reverse Grip Triceps Pushdown':   N.reverseGripPushdown,

  'Push-Up':                         N.pushUps,
  'Push-Ups':                        N.pushUps,
  'Pushup':                          N.pushUps,
  'Pushups':                         N.pushUps,
  'Diamond Push-Ups':                N.diamondPushUps,
  'Pike Push-Ups':                   N.pikePushUps,
  'Archer Pushups':                  N.diamondPushUps,
  'Clap Push-Up':                    N.pushUps,

  // ══════════════════════════════════════════════
  // ── Pull (Back / Biceps) ──
  // ══════════════════════════════════════════════
  'Pull-Ups':                        N.pullUps,
  'Chin-Ups':                        N.chinUps,
  'Lat Pulldown':                    N.latPulldown,
  'Wide Grip Lat Pulldown':          N.wideGripLatPulldown,
  'Seated Cable Row':                N.seatedCableRow,
  'Wide Grip Seated Row':            N.seatedCableRow,
  'Cable Row':                       N.cableRow,
  'Barbell Rows':                    N.barbellRow,
  'Barbell Row':                     N.barbellRow,
  'Bent Over Row':                   N.bentOverRow,
  'Upright Row':                     N.uprightRow,
  'Upright Rows':                    N.uprightRow,
  'Dumbbell Rows':                   N.dumbbellRow,
  'Dumbbell Row':                    N.dumbbellRow,
  'Single Arm Dumbbell Row':         N.singleArmDbRow,
  'Deadlift':                        N.deadlift,

  'Face Pulls':                      N.facePulls,
  'Reverse Flyes':                   N.reverseFly,
  'Cable Rear Delt Fly':             N.cableRearDeltFly,
  'Reverse Fly':                     N.reverseFly,
  'Resistance Band Pull Apart':      N.resistanceBandPull,
  'Shrugs':                          N.shrugs,
  'External Rotation':               N.externalRotation,

  'Barbell Curls':                   N.barbellCurl,
  'Barbell Curl':                    N.barbellCurl,
  'EZ Bar Curl':                     N.ezBarCurl,
  'Incline Dumbbell Curl':           N.inclineDumbbellCurl,
  'Concentration Curl':              N.concentrationCurl,
  'Spider Curl':                     N.spiderCurl,
  'Zottman Curl':                    N.zottmanCurl,
  'Hammer Curls':                    N.hammerCurl,
  'Hammer Curl':                     N.hammerCurl,
  'Preacher Curls':                  N.preacherCurl,
  'Preacher Curl':                   N.preacherCurl,

  // ══════════════════════════════════════════════
  // ── Legs / Glutes ──
  // ══════════════════════════════════════════════
  'Barbell Squats':                  N.barbellSquat,
  'Barbell Squat':                   N.barbellSquat,
  'Barbell Back Squat':              N.barbellBackSquat,
  'Front Squats':                    N.frontSquat,
  'Front Squat':                     N.frontSquat,
  'Goblet Squat':                    N.gobletSquat,
  'Sumo Squat':                      N.barbellSquat,
  'Hack Squat':                      N.barbellSquat,
  'Jump Squat':                      N.jumpSquat,
  'Jump Squats':                     N.jumpSquats,
  'Cossack Squat':                   N.frontSquat,
  'Romanian Deadlift':               N.romanianDeadlift,
  'Leg Press':                       N.legPress,
  'Leg Extensions':                  N.legExtension,
  'Leg Extension':                   N.legExtension,
  'Leg Curls':                       N.legCurl,
  'Leg Curl':                        N.legCurl,
  'Seated Leg Curls':                N.seatedLegCurl,
  'Seated Leg Curl':                 N.seatedLegCurl,
  'Hip Thrusts':                     N.hipThrust,
  'Hip Thrust':                      N.hipThrust,
  'Glute Bridge':                    N.gluteBridge,
  'Single Leg Glute Bridge':         N.singleLegGluteBridge,
  'Walking Lunges':                  N.walkingLunges,
  'Lunges':                          N.lunges,
  'Dumbbell Lunges':                 N.dumbbellLunges,
  'Bulgarian Split Squat':           N.bulgarianSplitSquat,
  'Lateral Lunge':                   N.lateralLunge,
  'Step Up':                         N.lunges,
  'Calf Raises':                     N.calfRaises,
  'Seated Calf Raise':               N.seatedCalfRaise,
  'Donkey Calf Raise':               N.donkeyCalfRaise,
  'Wall Sit':                        N.wallSit,
  'Box Jumps':                       N.boxJumps,
  'Glute Kickback':                  N.gluteKickback,
  'Glute Kickback Machine':          N.gluteKickbackMachine,
  'Cable Glute Kickback':            N.cableGluteKickback,
  'Donkey Kicks':                    N.donkeyKicks,
  'Cable Hip Abduction':             N.cableHipAbduction,
  'Cable Hip Adduction':             N.cableHipAdduction,
  'Hip Abduction Machine':           N.hipAbductionMachine,
  'Kettlebell Swing':                N.kettlebellSwing,
  'Jump Lunges':                     N.jumpLunges,
  'Glute Activation Walk':           N.gluteActivationWalk,

  // ══════════════════════════════════════════════
  // ── Core ──
  // ══════════════════════════════════════════════
  'Plank Hold':                      N.plank,
  'Plank':                           N.plank,
  'Side Plank':                      N.plank,
  'Plank Jacks':                     N.plankJacks,
  'Ab Wheel Rollout':                N.plank,
  'Cable Crunch':                    N.cableCrunch,
  'Crunches':                        N.crunches,
  'Crunch':                          N.crunch,
  'Sit-Up':                          N.sitUp,
  'Hanging Leg Raises':              N.hangingLegRaise,
  'Hanging Leg Raise':               N.hangingLegRaise,
  'Leg Raises':                      N.legRaises,
  'Lying Leg Raise':                 N.lyingLegRaise,
  'Reverse Crunch':                  N.reverseCrunch,
  'Bicycle Crunch':                  N.bicycleCrunch,
  'Russian Twist':                   N.russianTwist,
  'Russian Twists':                  N.russianTwists,
  'Mountain Climbers':               N.mountainClimbers,
  'Cross Body Mountain Climbers':    N.crossBodyMtnClimbers,
  'Seated Spinal Twist':             N.seatedSpinalTwist,

  // ══════════════════════════════════════════════
  // ── Cardio ──
  // ══════════════════════════════════════════════
  'Slow Walk':                       N.briskWalk,
  'Brisk Walk / Light Jog':          N.briskWalk,
  'Brisk Walk':                      N.briskWalk,
  'High Knees':                      N.burpees,
  'Burpees':                         N.burpees,
  'Jumping Jacks':                   N.jumpingJacks,
  'Skipping':                        N.skipping,
  'Jump Rope':                       N.jumpRope,
  'Treadmill Run':                   N.treadmillRun,
  'Rowing Machine':                  N.rowingMachine,
  'Jogging':                         N.jogging,
  'Sprint':                          N.sprint,
  'Elliptical Training':             N.elliptical,
  'Skater Jump':                     N.skaterJump,
  'Butt Kicks':                      N.buttKicks,
  'Carioca Drill':                   N.cariocaDrill,
  'Dynamic Side Shuffle':            N.dynamicSideShuffle,

  // ══════════════════════════════════════════════
  // ── Olympic / Functional ──
  // ══════════════════════════════════════════════
  'Snatch':                          N.snatch,
  'Thruster':                        N.thruster,
  'Kettlebell Snatch':               N.kettlebellSnatch,
  'Inchworm Walk':                   N.inchwormWalk,
  'Windmill':                        N.windmill,

  // ══════════════════════════════════════════════
  // ── Stretch / Recovery ──
  // ══════════════════════════════════════════════
  'Shoulder Stretch':                N.shoulderStretch,
  'Hamstring Stretch':               N.hamstringStretch,
  'Seated Hamstring Stretch':        N.seatedHamstringStr,
  'Calf Stretch':                    N.calfStretch,
  'Hip Flexor Stretch':              N.hipFlexorStretch,
  'Kneeling Hip Flexor Stretch':     N.kneelingHipFlexor,
  'Figure Four Stretch':             N.pigeonPoseStretch,
  'Deep Squat Hold':                 N.gobletSquat,
  'Pigeon Pose Stretch':             N.pigeonPoseStretch,
  'Standing Quadriceps Stretch':     N.standingQuadStretch,
  'Downward Dog':                    N.downwardDog,
  'Standing Forward Bend':           N.standingForwardBend,
  'Seated Forward Fold':             N.seatedForwardFold,
  'Butterfly Stretch':               N.butterflyStretch,
  'Side Lunge Stretch':              N.sideLungeStretch,
  'Thread the Needle Stretch':       N.threadTheNeedle,
  'Lying Spinal Twist':              N.lyingSpinalTwist,
};

// Helper: lookup video URL by exercise name
// Handles: exact match, case-insensitive, parenthetical suffixes like "(Chest)",
// singular/plural, and prefix matching
export function getExerciseVideoUrl(name: string): string {
  if (!name) return '';
  // 1. Exact match
  if (EXERCISE_VIDEOS[name]) return EXERCISE_VIDEOS[name];

  const lower = name.toLowerCase().trim();
  const keys = Object.keys(EXERCISE_VIDEOS);

  // 2. Case-insensitive exact
  const ciKey = keys.find(k => k.toLowerCase() === lower);
  if (ciKey) return EXERCISE_VIDEOS[ciKey];

  // 3. Strip parenthetical suffix: "Dips (Chest)" → "Dips"
  const stripped = lower.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (stripped !== lower) {
    const sKey = keys.find(k => k.toLowerCase() === stripped);
    if (sKey) return EXERCISE_VIDEOS[sKey];
  }

  // 4. Try adding/removing trailing 's': "Upright Row" ↔ "Upright Rows"
  const withS = stripped.endsWith('s') ? stripped.slice(0, -1) : stripped + 's';
  const sKey2 = keys.find(k => k.toLowerCase() === withS);
  if (sKey2) return EXERCISE_VIDEOS[sKey2];

  // 5. Prefix match: "Dips (Chest)" base "Dips" matches key "Dips"
  const prefixKey = keys.find(k => stripped.startsWith(k.toLowerCase()) || k.toLowerCase().startsWith(stripped));
  if (prefixKey) return EXERCISE_VIDEOS[prefixKey];

  return '';
}
