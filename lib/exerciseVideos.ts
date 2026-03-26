// ── Cloudinary exercise video map ─────────────────────────────────────────────
// Maps exercise names → Cloudinary demo video URLs
// Keys MUST match exact DB exercise library names
// Used by: ActiveWorkoutPlayer, WorkoutOverview, Admin ExerciseLibrary, defaultPlans
//
// Auto-populated from MuscleWiki API (135 exercises) on 2026-03-26
// Fallback URLs (F.*) used for unmatched exercises

// ── New MuscleWiki-sourced URLs ──
const N = {
  barbellBenchPress:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515211/workout_exercises/barbell_bench_press.mp4',
  inclineDumbbellPress:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515217/workout_exercises/incline_dumbbell_press.mp4',
  cableFly:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515221/workout_exercises/cable_fly.mp4',
  dumbbellPress:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515226/workout_exercises/dumbbell_press.mp4',
  overheadBarbellPress:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515232/workout_exercises/overhead_barbell_press.mp4',
  lateralRaises:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515236/workout_exercises/lateral_raises.mp4',
  dumbbellShoulderPress: 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515240/workout_exercises/dumbbell_shoulder_press.mp4',
  tricepPushdown:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515245/workout_exercises/tricep_pushdown.mp4',
  diamondPushUps:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515250/workout_exercises/diamond_push_ups.mp4',
  dips:                  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515254/workout_exercises/dips.mp4',
  barbellRow:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515258/workout_exercises/barbell_row.mp4',
  pullUps:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515262/workout_exercises/pull_ups.mp4',
  latPulldown:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515268/workout_exercises/lat_pulldown.mp4',
  cableRow:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515273/workout_exercises/cable_row.mp4',
  deadlift:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515278/workout_exercises/deadlift.mp4',
  romanianDeadlift:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515282/workout_exercises/romanian_deadlift.mp4',
  dumbbellRow:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515285/workout_exercises/dumbbell_row.mp4',
  barbellCurl:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515290/workout_exercises/barbell_curl.mp4',
  chinUps:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515295/workout_exercises/chin_ups.mp4',
  barbellSquat:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515301/workout_exercises/barbell_squat.mp4',
  legPress:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515306/workout_exercises/leg_press.mp4',
  legCurl:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515312/workout_exercises/leg_curl.mp4',
  calfRaises:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515317/workout_exercises/calf_raises.mp4',
  dumbbellLunges:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515321/workout_exercises/dumbbell_lunges.mp4',
  gobletSquat:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515326/workout_exercises/goblet_squat.mp4',
  jumpSquats:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515332/workout_exercises/jump_squats.mp4',
  plank:                 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515345/workout_exercises/plank.mp4',
  crunches:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515348/workout_exercises/crunches.mp4',
  legRaises:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515353/workout_exercises/leg_raises.mp4',
  russianTwist:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515357/workout_exercises/russian_twist.mp4',
  mountainClimbers:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515363/workout_exercises/mountain_climbers.mp4',
  pushUps:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515371/workout_exercises/push_ups.mp4',
  pikePushUps:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515391/workout_exercises/pike_push_ups.mp4',
  burpees:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515396/workout_exercises/burpees.mp4',
  jumpingJacks:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515403/workout_exercises/jumping_jacks.mp4',
  dumbbellTricepKickback:'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515407/workout_exercises/dumbbell_tricep_kickback.mp4',
  treadmillRun:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515412/workout_exercises/treadmill_run.mp4',
  rowingMachine:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515419/workout_exercises/rowing_machine.mp4',
  hipThrust:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515424/workout_exercises/hip_thrust.mp4',
  dumbbellFly:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515429/workout_exercises/dumbbell_fly.mp4',
  cableLateralRaise:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515433/workout_exercises/cable_lateral_raise.mp4',
  dumbbellLateralRaise:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515437/workout_exercises/dumbbell_lateral_raise.mp4',
  cableFrontRaise:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515442/workout_exercises/cable_front_raise.mp4',
  uprightRow:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515446/workout_exercises/upright_row.mp4',
  shrugs:                'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515450/workout_exercises/shrugs.mp4',
  externalRotation:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515454/workout_exercises/external_rotation.mp4',
  crossBodyMtnClimbers:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515460/workout_exercises/cross_body_mountain_climbers.mp4',
  threadTheNeedle:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515477/workout_exercises/thread_the_needle_stretch.mp4',
  hammerCurl:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515488/workout_exercises/hammer_curl.mp4',
  concentrationCurl:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515494/workout_exercises/concentration_curl.mp4',
  inclineDumbbellCurl:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515500/workout_exercises/incline_dumbbell_curl.mp4',
  spiderCurl:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515504/workout_exercises/spider_curl.mp4',
  ezBarCurl:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515508/workout_exercises/ez_bar_curl.mp4',
  reverseFly:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515511/workout_exercises/reverse_fly.mp4',
  zottmanCurl:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515516/workout_exercises/zottman_curl.mp4',
  jumpRope:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515521/workout_exercises/jump_rope.mp4',
  closeGripBench:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515526/workout_exercises/close_grip_bench_press.mp4',
  parallelBarDips:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515530/workout_exercises/parallel_bar_dips.mp4',
  chairDips:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515533/workout_exercises/chair_dips.mp4',
  floorPress:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515537/workout_exercises/floor_press.mp4',
  ropeTricepsPushdown:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515541/workout_exercises/rope_triceps_pushdown.mp4',
  skullCrusher:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515545/workout_exercises/skull_crusher.mp4',
  cableOverheadTricep:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515551/workout_exercises/cable_overhead_triceps_extension.mp4',
  kickback:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515555/workout_exercises/kickback.mp4',
  singleArmCablePush:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515558/workout_exercises/single_arm_cable_pushdown.mp4',
  reverseGripPushdown:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515562/workout_exercises/reverse_grip_triceps_pushdown.mp4',
  frontSquat:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515567/workout_exercises/front_squat.mp4',
  lunges:                'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515570/workout_exercises/lunges.mp4',
  walkingLunges:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515575/workout_exercises/walking_lunges.mp4',
  bulgarianSplitSquat:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515581/workout_exercises/bulgarian_split_squat.mp4',
  jumpSquat:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515586/workout_exercises/jump_squat.mp4',
  boxJumps:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515592/workout_exercises/box_jumps.mp4',
  legExtension:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515598/workout_exercises/leg_extension.mp4',
  seatedLegCurl:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515607/workout_exercises/seated_leg_curl.mp4',
  seatedCalfRaise:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515614/workout_exercises/seated_calf_raise.mp4',
  donkeyCalfRaise:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515619/workout_exercises/donkey_calf_raise.mp4',
  gluteKickback:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515622/workout_exercises/glute_kickback.mp4',
  cableHipAbduction:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515626/workout_exercises/cable_hip_abduction.mp4',
  cableHipAdduction:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515630/workout_exercises/cable_hip_adduction.mp4',
  standingQuadStretch:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515635/workout_exercises/standing_quadriceps_stretch.mp4',
  hamstringStretch:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515639/workout_exercises/hamstring_stretch.mp4',
  seatedHamstringStr:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515644/workout_exercises/seated_hamstring_stretch.mp4',
  butterflyStretch:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515649/workout_exercises/butterfly_stretch.mp4',
  calfStretch:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515653/workout_exercises/calf_stretch.mp4',
  hipFlexorStretch:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515657/workout_exercises/hip_flexor_stretch.mp4',
  pigeonPoseStretch:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515671/workout_exercises/pigeon_pose_stretch.mp4',
  sideLungeStretch:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515684/workout_exercises/side_lunge_stretch.mp4',
  gluteBridge:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515688/workout_exercises/glute_bridge.mp4',
  kettlebellSwing:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515695/workout_exercises/kettlebell_swing.mp4',
  cableGluteKickback:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515711/workout_exercises/cable_glute_kickback.mp4',
  donkeyKicks:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515715/workout_exercises/donkey_kicks.mp4',
  hipAbductionMachine:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515718/workout_exercises/hip_abduction_machine.mp4',
  gluteKickbackMachine:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515724/workout_exercises/glute_kickback_machine.mp4',
  singleLegGluteBridge:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515727/workout_exercises/single_leg_glute_bridge.mp4',
  facePulls:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515730/workout_exercises/face_pulls.mp4',
  russianTwists:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515734/workout_exercises/russian_twists.mp4',
  plankJacks:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515738/workout_exercises/plank_jacks.mp4',
  bicycleCrunch:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515744/workout_exercises/bicycle_crunch.mp4',
  crunch:                'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515748/workout_exercises/crunch.mp4',
  sitUp:                 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515753/workout_exercises/sit_up.mp4',
  hangingLegRaise:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515758/workout_exercises/hanging_leg_raise.mp4',
  lyingLegRaise:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515763/workout_exercises/lying_leg_raise.mp4',
  cableCrunch:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515768/workout_exercises/cable_crunch.mp4',
  reverseCrunch:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515773/workout_exercises/reverse_crunch.mp4',
  seatedSpinalTwist:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515782/workout_exercises/seated_spinal_twist.mp4',
  bentOverRow:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515792/workout_exercises/bent_over_row.mp4',
  seatedCableRow:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515796/workout_exercises/seated_cable_row.mp4',
  singleArmDbRow:        'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515801/workout_exercises/single_arm_dumbbell_row.mp4',
  wideGripLatPulldown:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515805/workout_exercises/wide_grip_lat_pulldown.mp4',
  cableRearDeltFly:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515812/workout_exercises/cable_rear_delt_fly.mp4',
  resistanceBandPull:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515816/workout_exercises/resistance_band_pull_apart.mp4',
  barbellBackSquat:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515820/workout_exercises/barbell_back_squat.mp4',
  snatch:                'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515825/workout_exercises/snatch.mp4',
  thruster:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515829/workout_exercises/thruster.mp4',
  kettlebellSnatch:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515834/workout_exercises/kettlebell_snatch.mp4',
  wallSit:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515838/workout_exercises/wall_sit.mp4',
  inchwormWalk:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515842/workout_exercises/inchworm_walk.mp4',
  windmill:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515847/workout_exercises/windmill.mp4',
  lateralLunge:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515851/workout_exercises/lateral_lunge.mp4',
  jogging:               'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515856/workout_exercises/jogging.mp4',
  sprint:                'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515860/workout_exercises/sprint.mp4',
  elliptical:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515865/workout_exercises/elliptical_training.mp4',
  skaterJump:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515871/workout_exercises/skater_jump.mp4',
  buttKicks:             'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515876/workout_exercises/butt_kicks.mp4',
  skipping:              'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515881/workout_exercises/skipping.mp4',
  cariocaDrill:          'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515888/workout_exercises/carioca_drill.mp4',
  jumpLunges:            'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515894/workout_exercises/jump_lunges.mp4',
  dynamicSideShuffle:    'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515898/workout_exercises/dynamic_side_shuffle.mp4',
  downwardDog:           'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515906/workout_exercises/downward_dog.mp4',
  standingForwardBend:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515918/workout_exercises/standing_forward_bend.mp4',
  seatedForwardFold:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515927/workout_exercises/seated_forward_fold.mp4',
  lyingSpinalTwist:      'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515944/workout_exercises/lying_spinal_twist.mp4',
  kneelingHipFlexor:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515955/workout_exercises/kneeling_hip_flexor_stretch.mp4',
  machineShoulderPress:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515959/workout_exercises/machine_shoulder_press.mp4',
  gluteActivationWalk:   'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774515964/workout_exercises/glute_activation_walk.mp4',
};

// ── Fallback URLs for unmatched exercises (old user-provided) ──
const F = {
  dynamicStretching: 'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/leg_stretching_wfooqj.mp4',
  staticStretching:  'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/stretching_sgedzx.mp4',
  briskWalk:         'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029203/brisk_walk_gjazf1.mp4',
  arnoldPress:       'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/arnoldpress_inkrme.mp4',
  preacherCurls:     'https://res.cloudinary.com/dkygyxsdw/video/upload/v1774029197/ezbarpreacher_curls_pptp11.mp4',
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
  'Arnold Press':                    F.arnoldPress,
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
  'Archer Pushups':                  N.pushUps,
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
  'Preacher Curls':                  F.preacherCurls,
  'Preacher Curl':                   F.preacherCurls,

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
  'Slow Walk':                       F.briskWalk,
  'Brisk Walk / Light Jog':          F.briskWalk,
  'Brisk Walk':                      F.briskWalk,
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
  'Dynamic Stretching':              F.dynamicStretching,
  'Static Stretching':               F.staticStretching,
  'Shoulder Stretch':                F.staticStretching,
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
  'Arm Circles':                     F.staticStretching,
  'Leg Swings':                      F.dynamicStretching,
  'Hip Circles':                     F.dynamicStretching,
  'Shoulder Rolls':                  F.staticStretching,
  'Shoulder CARs':                   F.staticStretching,
  'Cross Body Arm Stretch':          F.staticStretching,
  'Overhead Triceps Stretch':        F.staticStretching,
  'Standing Biceps Stretch':         F.staticStretching,
  'Wall Biceps Stretch':             F.staticStretching,
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
