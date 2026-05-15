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

export const FORM_COACH_EXERCISES: FormCoachExercise[] = [
  {
    name: 'Barbell Squat',
    aliases: ['Back Squat','Squat','Goblet Squat','Bodyweight Squat','Air Squat'],
    viewAngle: 'side',
    primaryAngle: L_KNEE,
    repPhase: { bottomAngleMax: 100, topAngleMin: 160 },
    trackingMode: 'reps',
    formRules: [
      { id: 'squat_depth', label: 'Squat Depth', angle: L_KNEE, maxAngle: 110, errorMessage: 'Go deeper — aim for parallel', severity: 'warning' },
      { id: 'squat_back', label: 'Back Angle', angle: L_HIP, minAngle: 50, errorMessage: 'Keep your back more upright', severity: 'error' },
    ],
    setupTips: ['Stand sideways to the camera','Phone at waist height','Full body visible'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  {
    name: 'Push-Up',
    aliases: ['Push Up','Pushup','Push-Ups','Wide Push-Up','Diamond Push-Up'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 100, topAngleMin: 155 },
    trackingMode: 'reps',
    formRules: [
      { id: 'pushup_depth', label: 'Depth', angle: L_ELBOW, maxAngle: 100, errorMessage: 'Go lower — chest near ground', severity: 'warning' },
      { id: 'pushup_line', label: 'Body Line', angle: L_HIP, minAngle: 160, errorMessage: 'Keep body in a straight line', severity: 'error' },
    ],
    setupTips: ['Phone on floor, sideways','About 6 feet away','Full body visible'],
    requiredLandmarks: [11, 13, 15, 23, 25, 27],
  },
  {
    name: 'Deadlift',
    aliases: ['Conventional Deadlift','Barbell Deadlift','Romanian Deadlift','RDL'],
    viewAngle: 'side',
    primaryAngle: L_HIP,
    repPhase: { bottomAngleMax: 100, topAngleMin: 165 },
    trackingMode: 'reps',
    formRules: [
      { id: 'dl_back', label: 'Back Position', angle: L_HIP, minAngle: 40, errorMessage: "Keep your back straight", severity: 'error' },
      { id: 'dl_lockout', label: 'Full Lockout', angle: L_HIP, minAngle: 170, errorMessage: 'Stand fully upright at the top', severity: 'warning' },
    ],
    setupTips: ['Stand sideways to camera','Phone at waist height, 6-8 ft away'],
    requiredLandmarks: [11, 23, 25, 27],
  },
  {
    name: 'Overhead Press',
    aliases: ['OHP','Military Press','Shoulder Press','Standing Press'],
    viewAngle: 'side',
    primaryAngle: L_ELBOW,
    repPhase: { bottomAngleMax: 100, topAngleMin: 160 },
    trackingMode: 'reps',
    formRules: [
      { id: 'ohp_ext', label: 'Extension', angle: L_ELBOW, minAngle: 165, errorMessage: 'Fully extend arms overhead', severity: 'warning' },
      { id: 'ohp_lean', label: 'Back Lean', angle: L_HIP, minAngle: 165, errorMessage: "Don't lean back too much", severity: 'error' },
    ],
    setupTips: ['Stand sideways','Ensure overhead space visible','Phone at waist height'],
    requiredLandmarks: [11, 13, 15, 23],
  },
  {
    name: 'Lunge',
    aliases: ['Lunges','Walking Lunge','Forward Lunge','Reverse Lunge','Bulgarian Split Squat'],
    viewAngle: 'side',
    primaryAngle: L_KNEE,
    repPhase: { bottomAngleMax: 100, topAngleMin: 155 },
    trackingMode: 'reps',
    formRules: [
      { id: 'lunge_depth', label: 'Depth', angle: L_KNEE, maxAngle: 105, errorMessage: 'Bend front knee to 90°', severity: 'warning' },
      { id: 'lunge_torso', label: 'Torso', angle: L_HIP, minAngle: 150, errorMessage: 'Keep torso upright', severity: 'warning' },
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
      { id: 'plank_high', label: 'Hips High', angle: L_HIP, maxAngle: 190, errorMessage: "Lower your hips — don't pike", severity: 'warning' },
      { id: 'plank_sag', label: 'Hip Sag', angle: L_HIP, minAngle: 155, errorMessage: "Raise hips — don't sag", severity: 'error' },
    ],
    setupTips: ['Phone on floor, sideways','6-8 feet away','Head to feet visible'],
    requiredLandmarks: [11, 23, 25, 27],
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
