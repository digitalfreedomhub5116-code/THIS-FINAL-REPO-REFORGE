/**
 * formCoachConfig.ts — Configuration for AI Motion Coach (Form Correction)
 * Supported exercises, landmarks, angle defs, rep detection, form rules.
 */

// MediaPipe BlazePose 33 landmark indices
export const LANDMARKS = {
  NOSE: 0, LEFT_EYE_INNER: 1, LEFT_EYE: 2, LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4, RIGHT_EYE: 5, RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7, RIGHT_EAR: 8, MOUTH_LEFT: 9, MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
  LEFT_WRIST: 15, RIGHT_WRIST: 16,
  LEFT_PINKY: 17, RIGHT_PINKY: 18,
  LEFT_INDEX: 19, RIGHT_INDEX: 20,
  LEFT_THUMB: 21, RIGHT_THUMB: 22,
  LEFT_HIP: 23, RIGHT_HIP: 24,
  LEFT_KNEE: 25, RIGHT_KNEE: 26,
  LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
  LEFT_HEEL: 29, RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31, RIGHT_FOOT_INDEX: 32,
} as const;

export type LandmarkIndex = typeof LANDMARKS[keyof typeof LANDMARKS];

export interface AngleDef {
  name: string;
  a: LandmarkIndex;
  b: LandmarkIndex;
  c: LandmarkIndex;
}

export interface RepPhase {
  bottomAngleMax: number;
  topAngleMin: number;
}

export interface FormRule {
  id: string;
  label: string;
  angle: AngleDef;
  minAngle?: number;
  maxAngle?: number;
  errorMessage: string;
  severity: 'warning' | 'error';
}

export interface FormCoachExercise {
  name: string;
  aliases: string[];
  viewAngle: 'side' | 'front' | 'any';
  primaryAngle: AngleDef;
  repPhase: RepPhase;
  trackingMode: 'reps' | 'hold';
  formRules: FormRule[];
  setupTips: string[];
  requiredLandmarks: LandmarkIndex[];
}

// Common angle defs
const L_KNEE: AngleDef = { name: 'Left Knee', a: 23, b: 25, c: 27 };
const L_HIP: AngleDef = { name: 'Left Hip', a: 11, b: 23, c: 25 };
const L_ELBOW: AngleDef = { name: 'Left Elbow', a: 11, b: 13, c: 15 };
const L_SHOULDER: AngleDef = { name: 'Left Shoulder', a: 13, b: 11, c: 23 };

export const FORM_COACH_EXERCISES: FormCoachExercise[] = [
  {
    name: 'Barbell Squat',
    aliases: ['Back Squat','Squat','Goblet Squat','Bodyweight Squat','Air Squat','Front Squat','Sumo Squat','Dumbbell Squat'],
    viewAngle: 'side',
    primaryAngle: L_KNEE,
    repPhase: { bottomAngleMax: 130, topAngleMin: 145 },
    trackingMode: 'reps',
    formRules: [
      { id: 'squat_depth', label: 'Squat Depth', angle: L_KNEE, maxAngle: 140, errorMessage: 'Try going a bit deeper', severity: 'warning' },
      { id: 'squat_back', label: 'Back Angle', angle: L_HIP, minAngle: 35, errorMessage: 'Keep your back more upright', severity: 'warning' },
    ],
    setupTips: ['Stand sideways to the camera','Phone at waist height','Full body visible'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  {
    name: 'Push-Up',
    aliases: ['Push Up','Pushup','Push-Ups','Pushups','Wide Push-Up','Wide Push-Ups','Diamond Push-Up','Diamond Push-Ups','Pike Push-Up','Pike Push-Ups','Knee Push-Up','Knee Push-Ups'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 130, topAngleMin: 140 },
    trackingMode: 'reps',
    formRules: [
      { id: 'pushup_depth', label: 'Depth', angle: L_ELBOW, maxAngle: 135, errorMessage: 'Try going a bit lower', severity: 'warning' },
      { id: 'pushup_line', label: 'Body Line', angle: L_HIP, minAngle: 145, errorMessage: 'Keep body in a straight line', severity: 'warning' },
    ],
    setupTips: ['Phone on floor, sideways','About 6 feet away','Full body visible'],
    requiredLandmarks: [11, 13, 15, 23, 25, 27],
  },
  {
    name: 'Deadlift',
    aliases: ['Conventional Deadlift','Barbell Deadlift','Romanian Deadlift','RDL','Dumbbell Deadlift','Stiff Leg Deadlift','Sumo Deadlift'],
    viewAngle: 'side',
    primaryAngle: L_HIP,
    repPhase: { bottomAngleMax: 130, topAngleMin: 150 },
    trackingMode: 'reps',
    formRules: [
      { id: 'dl_back', label: 'Back Position', angle: L_HIP, minAngle: 30, errorMessage: 'Keep your back straight', severity: 'warning' },
      { id: 'dl_lockout', label: 'Full Lockout', angle: L_HIP, minAngle: 160, errorMessage: 'Stand fully upright at the top', severity: 'warning' },
    ],
    setupTips: ['Stand sideways to camera','Phone at waist height, 6-8 ft away'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  {
    name: 'Overhead Press',
    aliases: ['OHP','Military Press','Shoulder Press','Standing Press','Dumbbell Shoulder Press','Arnold Press','Barbell Press','Machine Shoulder Press','Overhead Barbell Press'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 130, topAngleMin: 145 },
    trackingMode: 'reps',
    formRules: [
      { id: 'ohp_ext', label: 'Extension', angle: L_ELBOW, minAngle: 155, errorMessage: 'Fully extend arms overhead', severity: 'warning' },
      { id: 'ohp_lean', label: 'Back Lean', angle: L_HIP, minAngle: 155, errorMessage: "Don't lean back too much", severity: 'warning' },
    ],
    setupTips: ['Stand sideways','Ensure overhead space visible','Phone at waist height'],
    requiredLandmarks: [11, 13, 15, 23],
  },
  {
    name: 'Lunge',
    aliases: ['Lunges','Walking Lunge','Walking Lunges','Forward Lunge','Reverse Lunge','Reverse Lunges','Bulgarian Split Squat','Split Squat','Dumbbell Lunge','Dumbbell Lunges'],
    viewAngle: 'side',
    primaryAngle: L_KNEE,
    repPhase: { bottomAngleMax: 130, topAngleMin: 140 },
    trackingMode: 'reps',
    formRules: [
      { id: 'lunge_depth', label: 'Depth', angle: L_KNEE, maxAngle: 135, errorMessage: 'Try bending a bit more', severity: 'warning' },
      { id: 'lunge_torso', label: 'Torso', angle: L_HIP, minAngle: 140, errorMessage: 'Keep torso upright', severity: 'warning' },
    ],
    setupTips: ['Stand sideways','Leave room to step forward','Full body visible'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  {
    name: 'Plank',
    aliases: ['Forearm Plank','High Plank','Elbow Plank'],
    viewAngle: 'side',
    primaryAngle: L_HIP,
    repPhase: { bottomAngleMax: 0, topAngleMin: 0 },
    trackingMode: 'hold',
    formRules: [
      { id: 'plank_high', label: 'Hips High', angle: L_HIP, maxAngle: 195, errorMessage: "Lower your hips — don't pike", severity: 'warning' },
      { id: 'plank_sag', label: 'Hip Sag', angle: L_HIP, minAngle: 145, errorMessage: "Raise hips — don't sag", severity: 'warning' },
    ],
    setupTips: ['Phone on floor, sideways','6-8 feet away','Head to feet visible'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  // ── NEW EXERCISES ──
  {
    name: 'Bicep Curl',
    aliases: ['Bicep Curls','Dumbbell Curl','Dumbbell Curls','Dumbbell Bicep Curl','Dumbbell Bicep Curls','Barbell Curl','Barbell Curls','Hammer Curl','Hammer Curls','Cable Curl','Cable Curls','Concentration Curl','EZ Bar Curl','Preacher Curl'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 80, topAngleMin: 125 },
    trackingMode: 'reps',
    formRules: [
      { id: 'curl_swing', label: 'Body Swing', angle: L_HIP, minAngle: 155, errorMessage: "Don't swing your body", severity: 'warning' },
      { id: 'curl_range', label: 'Full Range', angle: L_ELBOW, minAngle: 140, errorMessage: 'Try extending a bit more', severity: 'warning' },
    ],
    setupTips: ['Stand sideways to camera','Keep upper arm pinned to side','Full arm visible'],
    requiredLandmarks: [11, 13, 15, 23],
  },
  {
    name: 'Lateral Raise',
    aliases: ['Lateral Raises','Dumbbell Lateral Raise','Dumbbell Lateral Raises','Cable Lateral Raise','Cable Lateral Raises','Side Raise','Side Raises','Side Lateral Raise'],
    viewAngle: 'front',
    primaryAngle: L_SHOULDER,
    repPhase: { bottomAngleMax: 45, topAngleMin: 55 },
    trackingMode: 'reps',
    formRules: [
      { id: 'lat_height', label: 'Raise Height', angle: L_SHOULDER, minAngle: 60, errorMessage: 'Raise arms to shoulder height', severity: 'warning' },
      { id: 'lat_lean', label: 'Body Lean', angle: L_HIP, minAngle: 155, errorMessage: "Don't lean to the side", severity: 'warning' },
    ],
    setupTips: ['Face the camera','Arms visible from side','Stand 6-8 ft away'],
    requiredLandmarks: [11, 13, 15, 23],
  },
  {
    name: 'Bench Press',
    aliases: ['Barbell Bench Press','Flat Bench Press','Dumbbell Bench Press','Dumbbell Press','Flat Dumbbell Press','Incline Bench Press','Incline Dumbbell Press','Decline Bench Press','Close Grip Bench Press','Floor Press'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 120, topAngleMin: 140 },
    trackingMode: 'reps',
    formRules: [
      { id: 'bench_depth', label: 'Depth', angle: L_ELBOW, maxAngle: 130, errorMessage: 'Lower the bar to chest level', severity: 'warning' },
      { id: 'bench_lockout', label: 'Lockout', angle: L_ELBOW, minAngle: 150, errorMessage: 'Fully extend arms at the top', severity: 'warning' },
    ],
    setupTips: ['Camera from the side','Bench and arms visible','Phone at bench height'],
    requiredLandmarks: [11, 13, 15],
  },
  {
    name: 'Dip',
    aliases: ['Dips','Tricep Dip','Tricep Dips','Parallel Bar Dips','Chair Dips','Bench Dips','Ring Dips'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 125, topAngleMin: 140 },
    trackingMode: 'reps',
    formRules: [
      { id: 'dip_depth', label: 'Depth', angle: L_ELBOW, maxAngle: 130, errorMessage: 'Try going a bit deeper', severity: 'warning' },
      { id: 'dip_lean', label: 'Forward Lean', angle: L_HIP, minAngle: 130, errorMessage: 'Control your forward lean', severity: 'warning' },
    ],
    setupTips: ['Camera from the side','Upper body fully visible','Phone at chest height'],
    requiredLandmarks: [11, 13, 15, 23],
  },
  {
    name: 'Bent-Over Row',
    aliases: ['Bent Over Row','Barbell Row','Dumbbell Row','Dumbbell Rows','Pendlay Row','T-Bar Row','Cable Row','Seated Cable Row','One Arm Row','Single Arm Row'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 130, topAngleMin: 140 },
    trackingMode: 'reps',
    formRules: [
      { id: 'row_back', label: 'Back Position', angle: L_HIP, minAngle: 45, maxAngle: 145, errorMessage: 'Keep back flat and hinged', severity: 'warning' },
      { id: 'row_pull', label: 'Full Pull', angle: L_ELBOW, maxAngle: 65, errorMessage: 'Pull elbows back further', severity: 'warning' },
    ],
    setupTips: ['Stand sideways to camera','Keep back flat','Full body visible'],
    requiredLandmarks: [11, 13, 15, 23, 25],
  },
  {
    name: 'Tricep Extension',
    aliases: ['Tricep Extensions','Overhead Tricep Extension','Cable Overhead Triceps Extension','Dumbbell Triceps Extension','Skull Crusher','Skull Crushers','Tricep Pushdown','Tricep Pushdowns','Rope Triceps Pushdown','Cable Tricep Extension'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 90, topAngleMin: 135 },
    trackingMode: 'reps',
    formRules: [
      { id: 'tri_elbow', label: 'Elbow Position', angle: L_SHOULDER, minAngle: 140, errorMessage: 'Keep elbows close to head', severity: 'warning' },
      { id: 'tri_range', label: 'Full Extension', angle: L_ELBOW, minAngle: 145, errorMessage: 'Fully extend at the top', severity: 'warning' },
    ],
    setupTips: ['Stand sideways','Arms overhead visible','Phone at waist height'],
    requiredLandmarks: [11, 13, 15],
  },
];

export function findFormCoachExercise(name: string): FormCoachExercise | null {
  const lower = name.toLowerCase().trim();
  for (const ex of FORM_COACH_EXERCISES) {
    if (ex.name.toLowerCase() === lower) return ex;
    for (const a of ex.aliases) { if (a.toLowerCase() === lower) return ex; }
  }
  for (const ex of FORM_COACH_EXERCISES) {
    if (lower.includes(ex.name.toLowerCase())) return ex;
    for (const a of ex.aliases) { if (lower.includes(a.toLowerCase())) return ex; }
  }
  return null;
}

export function isFormCoachSupported(name: string): boolean {
  return findFormCoachExercise(name) !== null;
}
