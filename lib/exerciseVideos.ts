// ── Local exercise video map ──────────────────────────────────────────────────
// Maps exercise names → local video paths (bundled in public/assets/videos/exercises/)
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary, defaultPlans
//
// 135 exercises with local .mp4 files (compressed, 480p)

// ── New MuscleWiki-sourced URLs ──
const N = {
  barbellBenchPress:     '/assets/videos/exercises/barbell_bench_press.mp4',
  inclineDumbbellPress:  '/assets/videos/exercises/incline_dumbbell_press.mp4',
  cableFly:              '/assets/videos/exercises/cable_fly.mp4',
  dumbbellPress:         '/assets/videos/exercises/dumbbell_press.mp4',
  overheadBarbellPress:  '/assets/videos/exercises/overhead_barbell_press.mp4',
  lateralRaises:         '/assets/videos/exercises/lateral_raises.mp4',
  dumbbellShoulderPress: '/assets/videos/exercises/dumbbell_shoulder_press.mp4',
  tricepPushdown:        '/assets/videos/exercises/tricep_pushdown.mp4',
  diamondPushUps:        '/assets/videos/exercises/diamond_push_ups.mp4',
  dips:                  '/assets/videos/exercises/dips.mp4',
  barbellRow:            '/assets/videos/exercises/barbell_row.mp4',
  pullUps:               '/assets/videos/exercises/pull_ups.mp4',
  latPulldown:           '/assets/videos/exercises/lat_pulldown.mp4',
  cableRow:              '/assets/videos/exercises/cable_row.mp4',
  deadlift:              '/assets/videos/exercises/deadlift.mp4',
  romanianDeadlift:      '/assets/videos/exercises/romanian_deadlift.mp4',
  dumbbellRow:           '/assets/videos/exercises/dumbbell_row.mp4',
  barbellCurl:           '/assets/videos/exercises/barbell_curl.mp4',
  chinUps:               '/assets/videos/exercises/chin_ups.mp4',
  barbellSquat:          '/assets/videos/exercises/barbell_squat.mp4',
  legPress:              '/assets/videos/exercises/leg_press.mp4',
  legCurl:               '/assets/videos/exercises/leg_curl.mp4',
  calfRaises:            '/assets/videos/exercises/calf_raises.mp4',
  dumbbellLunges:        '/assets/videos/exercises/dumbbell_lunges.mp4',
  gobletSquat:           '/assets/videos/exercises/goblet_squat.mp4',
  jumpSquats:            '/assets/videos/exercises/jump_squats.mp4',
  plank:                 '/assets/videos/exercises/plank.mp4',
  crunches:              '/assets/videos/exercises/crunches.mp4',
  legRaises:             '/assets/videos/exercises/leg_raises.mp4',
  russianTwist:          '/assets/videos/exercises/russian_twist.mp4',
  mountainClimbers:      '/assets/videos/exercises/mountain_climbers.mp4',
  pushUps:               '/assets/videos/exercises/push_ups.mp4',
  pikePushUps:           '/assets/videos/exercises/pike_push_ups.mp4',
  burpees:               '/assets/videos/exercises/burpees.mp4',
  jumpingJacks:          '/assets/videos/exercises/jumping_jacks.mp4',
  dumbbellTricepKickback:'/assets/videos/exercises/dumbbell_tricep_kickback.mp4',
  treadmillRun:          '/assets/videos/exercises/treadmill_run.mp4',
  rowingMachine:         '/assets/videos/exercises/rowing_machine.mp4',
  hipThrust:             '/assets/videos/exercises/hip_thrust.mp4',
  dumbbellFly:           '/assets/videos/exercises/dumbbell_fly.mp4',
  cableLateralRaise:     '/assets/videos/exercises/cable_lateral_raise.mp4',
  dumbbellLateralRaise:  '/assets/videos/exercises/dumbbell_lateral_raise.mp4',
  cableFrontRaise:       '/assets/videos/exercises/cable_front_raise.mp4',
  uprightRow:            '/assets/videos/exercises/upright_row.mp4',
  shrugs:                '/assets/videos/exercises/shrugs.mp4',

  crossBodyMtnClimbers:  '/assets/videos/exercises/cross_body_mountain_climbers.mp4',
  threadTheNeedle:       '/assets/videos/exercises/thread_the_needle_stretch.mp4',
  hammerCurl:            '/assets/videos/exercises/hammer_curl.mp4',
  concentrationCurl:     '/assets/videos/exercises/concentration_curl.mp4',
  inclineDumbbellCurl:   '/assets/videos/exercises/incline_dumbbell_curl.mp4',

  ezBarCurl:             '/assets/videos/exercises/ez_bar_curl.mp4',
  reverseFly:            '/assets/videos/exercises/reverse_fly.mp4',

  jumpRope:              '/assets/videos/exercises/jump_rope.mp4',
  closeGripBench:        '/assets/videos/exercises/close_grip_bench_press.mp4',
  parallelBarDips:       '/assets/videos/exercises/parallel_bar_dips.mp4',
  chairDips:             '/assets/videos/exercises/chair_dips.mp4',
  floorPress:            '/assets/videos/exercises/floor_press.mp4',
  ropeTricepsPushdown:   '/assets/videos/exercises/rope_triceps_pushdown.mp4',

  cableOverheadTricep:   '/assets/videos/exercises/cable_overhead_triceps_extension.mp4',
  kickback:              '/assets/videos/exercises/kickback.mp4',

  frontSquat:            '/assets/videos/exercises/front_squat.mp4',
  lunges:                '/assets/videos/exercises/lunges.mp4',
  walkingLunges:         '/assets/videos/exercises/walking_lunges.mp4',
  bulgarianSplitSquat:   '/assets/videos/exercises/bulgarian_split_squat.mp4',
  jumpSquat:             '/assets/videos/exercises/jump_squat.mp4',
  boxJumps:              '/assets/videos/exercises/box_jumps.mp4',
  legExtension:          '/assets/videos/exercises/leg_extension.mp4',
  seatedLegCurl:         '/assets/videos/exercises/seated_leg_curl.mp4',
  seatedCalfRaise:       '/assets/videos/exercises/seated_calf_raise.mp4',
  gluteKickback:         '/assets/videos/exercises/glute_kickback.mp4',
  standingQuadStretch:   '/assets/videos/exercises/standing_quadriceps_stretch.mp4',
  hamstringStretch:      '/assets/videos/exercises/hamstring_stretch.mp4',
  seatedHamstringStr:    '/assets/videos/exercises/seated_hamstring_stretch.mp4',
  butterflyStretch:      '/assets/videos/exercises/butterfly_stretch.mp4',
  calfStretch:           '/assets/videos/exercises/calf_stretch.mp4',
  hipFlexorStretch:      '/assets/videos/exercises/hip_flexor_stretch.mp4',
  pigeonPoseStretch:     '/assets/videos/exercises/pigeon_pose_stretch.mp4',
  sideLungeStretch:      '/assets/videos/exercises/side_lunge_stretch.mp4',
  gluteBridge:           '/assets/videos/exercises/glute_bridge.mp4',
  kettlebellSwing:       '/assets/videos/exercises/kettlebell_swing.mp4',
  cableGluteKickback:    '/assets/videos/exercises/cable_glute_kickback.mp4',
  donkeyKicks:           '/assets/videos/exercises/donkey_kicks.mp4',
  hipAbductionMachine:   '/assets/videos/exercises/hip_abduction_machine.mp4',
  gluteKickbackMachine:  '/assets/videos/exercises/glute_kickback_machine.mp4',
  singleLegGluteBridge:  '/assets/videos/exercises/single_leg_glute_bridge.mp4',
  facePulls:             '/assets/videos/exercises/face_pulls.mp4',
  russianTwists:         '/assets/videos/exercises/russian_twists.mp4',
  plankJacks:            '/assets/videos/exercises/plank_jacks.mp4',
  bicycleCrunch:         '/assets/videos/exercises/bicycle_crunch.mp4',
  crunch:                '/assets/videos/exercises/crunch.mp4',
  sitUp:                 '/assets/videos/exercises/sit_up.mp4',
  hangingLegRaise:       '/assets/videos/exercises/hanging_leg_raise.mp4',
  lyingLegRaise:         '/assets/videos/exercises/lying_leg_raise.mp4',
  cableCrunch:           '/assets/videos/exercises/cable_crunch.mp4',
  reverseCrunch:         '/assets/videos/exercises/reverse_crunch.mp4',

  bentOverRow:           '/assets/videos/exercises/bent_over_row.mp4',
  seatedCableRow:        '/assets/videos/exercises/seated_cable_row.mp4',
  singleArmDbRow:        '/assets/videos/exercises/single_arm_dumbbell_row.mp4',
  wideGripLatPulldown:   '/assets/videos/exercises/wide_grip_lat_pulldown.mp4',
  cableRearDeltFly:      '/assets/videos/exercises/cable_rear_delt_fly.mp4',
  resistanceBandPull:    '/assets/videos/exercises/resistance_band_pull_apart.mp4',
  barbellBackSquat:      '/assets/videos/exercises/barbell_back_squat.mp4',
  snatch:                '/assets/videos/exercises/snatch.mp4',
  thruster:              '/assets/videos/exercises/thruster.mp4',

  wallSit:               '/assets/videos/exercises/wall_sit.mp4',
  inchwormWalk:          '/assets/videos/exercises/inchworm_walk.mp4',

  lateralLunge:          '/assets/videos/exercises/lateral_lunge.mp4',
  jogging:               '/assets/videos/exercises/jogging.mp4',
  sprint:                '/assets/videos/exercises/sprint.mp4',
  elliptical:            '/assets/videos/exercises/elliptical_training.mp4',
  skaterJump:            '/assets/videos/exercises/skater_jump.mp4',
  buttKicks:             '/assets/videos/exercises/butt_kicks.mp4',
  skipping:              '/assets/videos/exercises/skipping.mp4',

  jumpLunges:            '/assets/videos/exercises/jump_lunges.mp4',

  downwardDog:           '/assets/videos/exercises/downward_dog.mp4',
  standingForwardBend:   '/assets/videos/exercises/standing_forward_bend.mp4',
  seatedForwardFold:     '/assets/videos/exercises/seated_forward_fold.mp4',
  lyingSpinalTwist:      '/assets/videos/exercises/lying_spinal_twist.mp4',
  kneelingHipFlexor:     '/assets/videos/exercises/kneeling_hip_flexor_stretch.mp4',
  machineShoulderPress:  '/assets/videos/exercises/machine_shoulder_press.mp4',

  arnoldPress:           '/assets/videos/exercises/dumbbell_shoulder_press.mp4',  // arnold_press.mp4 missing, closest match
  preacherCurl:          '/assets/videos/exercises/incline_dumbbell_curl.mp4',   // preacher_curl.mp4 missing, closest match
  briskWalk:             '/assets/videos/exercises/jogging.mp4',                  // brisk_walk.mp4 missing, closest match
  shoulderStretch:       '/assets/videos/exercises/thread_the_needle_stretch.mp4', // shoulder_stretch.mp4 missing, closest match
};

// ── Batch 2: New exercise videos ──
const B = {
  smithBench:            '/assets/videos/exercises-batch2/smith_machine_bench_press.mp4',
  smithSquat:            '/assets/videos/exercises-batch2/smith_machine_squat.mp4',
  legExtMachine:         '/assets/videos/exercises-batch2/leg_extension_machine.mp4',
  legCurlMachine:        '/assets/videos/exercises-batch2/leg_curl_machine.mp4',
  pecDeckFly:            '/assets/videos/exercises-batch2/pec_deck_fly.mp4',
  latPullMachine:        '/assets/videos/exercises-batch2/lat_pulldown_machine.mp4',
  seatedRowMachine:      '/assets/videos/exercises-batch2/seated_row_machine.mp4',
  shoulderPressMach:     '/assets/videos/exercises-batch2/shoulder_press_machine.mp4',
  bicepCurlMachine:      '/assets/videos/exercises-batch2/bicep_curl_machine.mp4',
  tricepExtMachine:      '/assets/videos/exercises-batch2/tricep_extension_machine.mp4',
  cableFacePull:         '/assets/videos/exercises-batch2/cable_face_pull.mp4',

  romanChairExt:         '/assets/videos/exercises-batch2/roman_chair_back_extension.mp4',
  hyperextension:        '/assets/videos/exercises-batch2/hyperextension.mp4',
  tBarRow:               '/assets/videos/exercises-batch2/t_bar_row.mp4',
  declineBench:          '/assets/videos/exercises-batch2/decline_bench_press.mp4',
  inclineDbFly:          '/assets/videos/exercises-batch2/incline_dumbbell_fly.mp4',
  declineDbPress:        '/assets/videos/exercises-batch2/decline_dumbbell_press.mp4',
  cableBicepCurl:        '/assets/videos/exercises-batch2/cable_bicep_curl.mp4',

  standCableChestFly:    '/assets/videos/exercises-batch2/standing_cable_chest_fly.mp4',

  cableShrug:            '/assets/videos/exercises-batch2/cable_shrug.mp4',
  smithCalfRaise:        '/assets/videos/exercises-batch2/smith_machine_calf_raise.mp4',
  standCableCurl:        '/assets/videos/exercises-batch2/standing_cable_curl.mp4',
  birdDog:               '/assets/videos/exercises-batch2/bird_dog.mp4',

  supermanEx:            '/assets/videos/exercises-batch2/superman.mp4',

  bearCrawl:             '/assets/videos/exercises-batch2/bear_crawl.mp4',

  sidePlankDips:         '/assets/videos/exercises-batch2/side_plank_hip_dips.mp4',

  boxPushUps:            '/assets/videos/exercises-batch2/box_push_ups.mp4',
  inclinePushUps:        '/assets/videos/exercises-batch2/incline_push_ups.mp4',
  declinePushUps:        '/assets/videos/exercises-batch2/decline_push_ups.mp4',

  dbGobletSquat:         '/assets/videos/exercises-batch2/dumbbell_goblet_squat.mp4',
  dbRomanianDl:          '/assets/videos/exercises-batch2/dumbbell_romanian_deadlift.mp4',

  dbShrug:               '/assets/videos/exercises-batch2/dumbbell_shrug.mp4',
  dbFrontSquat:          '/assets/videos/exercises-batch2/dumbbell_front_squat.mp4',
  dbHammerCurl:          '/assets/videos/exercises-batch2/dumbbell_hammer_curl.mp4',
  dbCalfRaise:           '/assets/videos/exercises-batch2/dumbbell_calf_raise.mp4',
  dbWristCurl:           '/assets/videos/exercises-batch2/dumbbell_wrist_curl.mp4',
  dbWristExt:            '/assets/videos/exercises-batch2/dumbbell_wrist_extension.mp4',
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
  'Kickback':                        N.kickback,

  'Push-Up':                         N.pushUps,
  'Push-Ups':                        N.pushUps,
  'Push Ups':                        N.pushUps,
  'Pushup':                          N.pushUps,
  'Pushups':                         N.pushUps,
  'Diamond Push-Ups':                N.diamondPushUps,
  'Pike Push-Ups':                   N.pikePushUps,


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


  'Barbell Curls':                   N.barbellCurl,
  'Barbell Curl':                    N.barbellCurl,
  'EZ Bar Curl':                     N.ezBarCurl,
  'Incline Dumbbell Curl':           N.inclineDumbbellCurl,
  'Concentration Curl':              N.concentrationCurl,

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
  'Squats':                          N.barbellSquat,
  'Bodyweight Squats':               N.barbellSquat,

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

  'Wall Sit':                        N.wallSit,
  'Box Jumps':                       N.boxJumps,
  'Glute Kickback':                  N.gluteKickback,
  'Glute Kickback Machine':          N.gluteKickbackMachine,
  'Cable Glute Kickback':            N.cableGluteKickback,
  'Donkey Kicks':                    N.donkeyKicks,

  'Hip Abduction Machine':           N.hipAbductionMachine,
  'Kettlebell Swing':                N.kettlebellSwing,
  'Jump Lunges':                     N.jumpLunges,


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
  'Running':                         N.jogging,
  'Run':                             N.jogging,


  // ══════════════════════════════════════════════
  // ── Olympic / Functional ──
  // ══════════════════════════════════════════════
  'Snatch':                          N.snatch,
  'Thruster':                        N.thruster,
  'Inchworm Walk':                   N.inchwormWalk,

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

  // ══════════════════════════════════════════════
  // ── Batch 2: Gym Machines ──
  // ══════════════════════════════════════════════
  'Smith Machine Bench Press':       B.smithBench,
  'Smith Machine Squat':             B.smithSquat,
  'Leg Extension Machine':           B.legExtMachine,
  'Leg Curl Machine':                B.legCurlMachine,
  'Pec Deck Fly':                    B.pecDeckFly,
  'Lat Pulldown Machine':            B.latPullMachine,
  'Seated Row Machine':              B.seatedRowMachine,
  'Shoulder Press Machine':          B.shoulderPressMach,
  'Bicep Curl Machine':              B.bicepCurlMachine,
  'Tricep Extension Machine':        B.tricepExtMachine,
  'Cable Face Pull':                 B.cableFacePull,

  'Roman Chair Back Extension':      B.romanChairExt,
  'Hyperextension':                  B.hyperextension,
  'T-Bar Row':                       B.tBarRow,
  'Decline Bench Press':             B.declineBench,
  'Cable Bicep Curl':                B.cableBicepCurl,

  'Standing Cable Chest Fly':        B.standCableChestFly,

  'Cable Shrug':                     B.cableShrug,
  'Smith Machine Calf Raise':        B.smithCalfRaise,
  'Standing Cable Curl':             B.standCableCurl,

  // ══════════════════════════════════════════════
  // ── Batch 2: Chest (Dumbbell) ──
  // ══════════════════════════════════════════════
  'Incline Dumbbell Fly':            B.inclineDbFly,
  'Decline Dumbbell Press':          B.declineDbPress,


  // ══════════════════════════════════════════════
  // ── Batch 2: Bodyweight ──
  // ══════════════════════════════════════════════
  'Bird Dog':                        B.birdDog,

  'Superman':                        B.supermanEx,

  'Bear Crawl':                      B.bearCrawl,

  'Side Plank Hip Dips':             B.sidePlankDips,

  'Box Push-Ups':                    B.boxPushUps,
  'Incline Push-Ups':                B.inclinePushUps,
  'Decline Push-Ups':                B.declinePushUps,


  // ══════════════════════════════════════════════
  // ── Batch 2: Dumbbell / Kettlebell ──
  // ══════════════════════════════════════════════
  'Dumbbell Goblet Squat':           B.dbGobletSquat,
  'Dumbbell Romanian Deadlift':      B.dbRomanianDl,
  'Dumbbell Shrug':                  B.dbShrug,
  'Dumbbell Front Squat':            B.dbFrontSquat,
  'Dumbbell Hammer Curl':            B.dbHammerCurl,
  'Dumbbell Calf Raise':             B.dbCalfRaise,
  'Dumbbell Wrist Curl':             B.dbWristCurl,
  'Dumbbell Wrist Extension':        B.dbWristExt,
};

// Fix stale video paths from DB: /videos/... → /assets/videos/...
// This handles the migration where files moved from public/videos/ to public/assets/videos/
export function fixVideoPath(url: string): string {
  if (!url) return url;
  // Only fix local paths (not external URLs like Cloudinary)
  if (url.startsWith('/videos/')) return '/assets' + url;
  return url;
}

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
