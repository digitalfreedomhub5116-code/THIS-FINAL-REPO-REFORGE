import { WorkoutDay, WorkoutPlan, Exercise } from '../types';
import { EXERCISE_VIDEOS } from './exerciseVideos';

// Re-export for backward compatibility
export { EXERCISE_VIDEOS };

// Helper to build exercise entries
// NOTE: videoUrl is intentionally omitted — the player resolves videos
// at runtime from EXERCISE_VIDEOS via getExerciseVideoUrl() (single source of truth)
const ex = (
  name: string,
  sets: number,
  reps: string,
  type: 'COMPOUND' | 'ACCESSORY' | 'CARDIO' | 'STRETCH',
  duration: number = 0,
  rest: number = 60,
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
});

// ─────────────────────────────────────────────
// Warmup & Cooldown templates
// ─────────────────────────────────────────────

const WARMUP_UPPER: Exercise[] = [
  ex('Jumping Jacks', 1, '2 min', 'CARDIO', 2, 15, true),
  ex('Inchworm Walk', 1, '5 reps', 'STRETCH', 2, 15, true),
  ex('Shoulder Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
];

const WARMUP_LOWER: Exercise[] = [
  ex('Jumping Jacks', 1, '2 min', 'CARDIO', 2, 15, true),
  ex('Hip Flexor Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
];

const WARMUP_FULL: Exercise[] = [
  ex('Jumping Jacks', 1, '2 min', 'CARDIO', 2, 15, true),
  ex('Inchworm Walk', 1, '5 reps', 'STRETCH', 2, 15, true),
];

const COOLDOWN_UPPER: Exercise[] = [
  ex('Shoulder Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
  ex('Standing Forward Bend', 1, '30s', 'STRETCH', 1, 15, true),
];

const COOLDOWN_UPPER_BACK: Exercise[] = [
  ex('Hamstring Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
  ex('Downward Dog', 1, '30s', 'STRETCH', 1, 15, true),
];

const COOLDOWN_LOWER: Exercise[] = [
  ex('Standing Quadriceps Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
  ex('Hamstring Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
  ex('Calf Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
];

const COOLDOWN_LOWER_FULL: Exercise[] = [
  ex('Standing Quadriceps Stretch', 1, '30s each side', 'STRETCH', 1, 15, true),
  ex('Butterfly Stretch', 1, '30s', 'STRETCH', 1, 15, true),
];

const COOLDOWN_GENERAL: Exercise[] = [
  ex('Downward Dog', 1, '30s', 'STRETCH', 1, 15, true),
  ex('Seated Forward Fold', 1, '30s', 'STRETCH', 1, 15, true),
];

// ═══════════════════════════════════════════════
// PLAN 1: Full Gym Access — Push/Pull/Legs
// ═══════════════════════════════════════════════
const gymPPLDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Push', totalDuration: 55, exercises: [
      ...WARMUP_UPPER,
      ex('Barbell Bench Press', 3, '10', 'COMPOUND', 6, 90),
      ex('Incline Dumbbell Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Cable Fly', 3, '12', 'ACCESSORY', 5, 60),
      ex('Overhead Barbell Press', 3, '8', 'COMPOUND', 6, 90),
      ex('Cable Lateral Raise', 3, '12', 'ACCESSORY', 5, 60),
      ex('Tricep Pushdown', 3, '12', 'ACCESSORY', 5, 60),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 2', focus: 'Pull', totalDuration: 55, exercises: [
      ...WARMUP_UPPER,
      ex('Barbell Row', 3, '10', 'COMPOUND', 6, 90),
      ex('Lat Pulldown', 3, '10', 'COMPOUND', 6, 75),
      ex('Seated Cable Row', 3, '12', 'ACCESSORY', 6, 60),
      ex('Face Pulls', 3, '15', 'ACCESSORY', 5, 60),
      ex('Barbell Curl', 3, '10', 'ACCESSORY', 5, 60),
      ex('EZ Bar Curl', 3, '12', 'ACCESSORY', 5, 60),
      ...COOLDOWN_UPPER_BACK,
    ],
  },
  {
    day: 'Day 3', focus: 'Legs', totalDuration: 55, exercises: [
      ...WARMUP_LOWER,
      ex('Barbell Squat', 3, '10', 'COMPOUND', 7, 120),
      ex('Leg Press', 3, '12', 'COMPOUND', 6, 90),
      ex('Romanian Deadlift', 3, '10', 'COMPOUND', 6, 90),
      ex('Leg Curl', 3, '12', 'ACCESSORY', 5, 60),
      ex('Calf Raises', 3, '15', 'ACCESSORY', 4, 45),
      ex('Hip Thrust', 3, '10', 'COMPOUND', 6, 75),
      ...COOLDOWN_LOWER,
    ],
  },
  {
    day: 'Day 4', focus: 'Push (Volume)', totalDuration: 55, exercises: [
      ...WARMUP_UPPER,
      ex('Close Grip Bench Press', 3, '10', 'COMPOUND', 6, 90),
      ex('Machine Shoulder Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Incline Dumbbell Press', 3, '12', 'COMPOUND', 6, 75),
      ex('Cable Fly', 3, '15', 'ACCESSORY', 5, 60),
      ex('Cable Overhead Triceps Extension', 3, '12', 'ACCESSORY', 5, 60),
      ex('Dumbbell Lateral Raise', 3, '15', 'ACCESSORY', 5, 45),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 5', focus: 'Pull (Volume)', totalDuration: 55, exercises: [
      ...WARMUP_UPPER,
      ex('Deadlift', 3, '6', 'COMPOUND', 8, 150),
      ex('Lat Pulldown', 3, '10', 'COMPOUND', 6, 75),
      ex('Dumbbell Row', 3, '10', 'COMPOUND', 6, 75),
      ex('Cable Rear Delt Fly', 3, '12', 'ACCESSORY', 5, 60),
      ex('Preacher Curl', 3, '10', 'ACCESSORY', 5, 60),
      ex('Hammer Curl', 3, '12', 'ACCESSORY', 5, 60),
      ...COOLDOWN_UPPER_BACK,
    ],
  },
  {
    day: 'Day 6', focus: 'Legs & Core', totalDuration: 55, exercises: [
      ...WARMUP_LOWER,
      ex('Front Squat', 3, '10', 'COMPOUND', 7, 120),
      ex('Walking Lunges', 3, '10 each', 'COMPOUND', 6, 75),
      ex('Leg Extension', 3, '12', 'ACCESSORY', 5, 60),
      ex('Seated Leg Curl', 3, '12', 'ACCESSORY', 5, 60),
      ex('Hanging Leg Raise', 3, '12', 'ACCESSORY', 5, 60),
      ex('Cable Crunch', 3, '15', 'ACCESSORY', 5, 60),
      ...COOLDOWN_LOWER_FULL,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Brisk Walk', 1, '20 min', 'CARDIO', 20),
    ],
  },
];

// ═══════════════════════════════════════════════
// PLAN 2: Dumbbells Only — Upper/Lower Split
// ═══════════════════════════════════════════════
const dumbbellDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Upper Push', totalDuration: 50, exercises: [
      ...WARMUP_UPPER,
      ex('Dumbbell Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Floor Press', 3, '12', 'COMPOUND', 6, 75),
      ex('Dumbbell Fly', 3, '12', 'ACCESSORY', 5, 60),
      ex('Dumbbell Shoulder Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Dumbbell Lateral Raise', 3, '12', 'ACCESSORY', 5, 45),
      ex('Dumbbell Tricep Kickback', 3, '12', 'ACCESSORY', 5, 45),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 2', focus: 'Upper Pull', totalDuration: 50, exercises: [
      ...WARMUP_UPPER,
      ex('Dumbbell Row', 3, '10', 'COMPOUND', 6, 75),
      ex('Single Arm Dumbbell Row', 3, '10 each', 'COMPOUND', 6, 75),
      ex('Reverse Fly', 3, '12', 'ACCESSORY', 5, 60),
      ex('Shrugs', 3, '12', 'ACCESSORY', 5, 45),
      ex('Hammer Curl', 3, '10', 'ACCESSORY', 5, 60),
      ex('Concentration Curl', 3, '10', 'ACCESSORY', 5, 60),
      ...COOLDOWN_UPPER_BACK,
    ],
  },
  {
    day: 'Day 3', focus: 'Lower Body', totalDuration: 50, exercises: [
      ...WARMUP_LOWER,
      ex('Goblet Squat', 3, '12', 'COMPOUND', 6, 75),
      ex('Romanian Deadlift', 3, '10', 'COMPOUND', 6, 90),
      ex('Dumbbell Lunges', 3, '10 each', 'COMPOUND', 6, 75),
      ex('Hip Thrust', 3, '12', 'COMPOUND', 6, 75),
      ex('Calf Raises', 3, '15', 'ACCESSORY', 4, 45),
      ex('Glute Bridge', 3, '12', 'ACCESSORY', 5, 60),
      ...COOLDOWN_LOWER,
    ],
  },
  {
    day: 'Day 4', focus: 'Upper Push (Volume)', totalDuration: 50, exercises: [
      ...WARMUP_UPPER,
      ex('Arnold Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Floor Press', 3, '10', 'COMPOUND', 6, 75),
      ex('Push-Ups', 3, '12', 'COMPOUND', 5, 60),
      ex('Dumbbell Fly', 3, '15', 'ACCESSORY', 5, 45),
      ex('Dumbbell Lateral Raise', 3, '15', 'ACCESSORY', 5, 45),
      ex('Diamond Push-Ups', 3, '10', 'COMPOUND', 5, 60),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 5', focus: 'Upper Pull & Core', totalDuration: 50, exercises: [
      ...WARMUP_UPPER,
      ex('Single Arm Dumbbell Row', 3, '12', 'COMPOUND', 6, 75),
      ex('Dumbbell Row', 3, '12', 'COMPOUND', 6, 75),
      ex('Reverse Fly', 3, '15', 'ACCESSORY', 5, 45),
      ex('Incline Dumbbell Curl', 3, '10', 'ACCESSORY', 5, 60),
      ex('Hammer Curl', 3, '12', 'ACCESSORY', 5, 60),
      ex('Bicycle Crunch', 3, '15', 'ACCESSORY', 5, 45),
      ...COOLDOWN_UPPER_BACK,
    ],
  },
  {
    day: 'Day 6', focus: 'Lower Body & Core', totalDuration: 50, exercises: [
      ...WARMUP_LOWER,
      ex('Goblet Squat', 3, '15', 'COMPOUND', 6, 75),
      ex('Bulgarian Split Squat', 3, '10 each', 'COMPOUND', 6, 75),
      ex('Romanian Deadlift', 3, '12', 'COMPOUND', 6, 90),
      ex('Lateral Lunge', 3, '10 each', 'COMPOUND', 6, 60),
      ex('Crunches', 3, '15', 'ACCESSORY', 4, 45),
      ex('Lying Leg Raise', 3, '12', 'ACCESSORY', 5, 45),
      ...COOLDOWN_LOWER_FULL,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Brisk Walk', 1, '20 min', 'CARDIO', 20),
    ],
  },
];

// ═══════════════════════════════════════════════
// PLAN 3: Bodyweight Only — Upper/Lower/HIIT
// ═══════════════════════════════════════════════
const bodyweightDays: WorkoutDay[] = [
  {
    day: 'Day 1', focus: 'Upper Push', totalDuration: 45, exercises: [
      ...WARMUP_UPPER,
      ex('Push-Ups', 3, '12', 'COMPOUND', 5, 60),
      ex('Diamond Push-Ups', 3, '8', 'COMPOUND', 5, 60),
      ex('Pike Push-Ups', 3, '8', 'COMPOUND', 5, 60),
      ex('Chair Dips', 3, '10', 'COMPOUND', 5, 60),
      ex('Plank', 3, '30s', 'ACCESSORY', 3, 30),
      ex('Mountain Climbers', 3, '30s', 'CARDIO', 3, 30),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 2', focus: 'Upper Pull & Core', totalDuration: 45, exercises: [
      ...WARMUP_UPPER,
      ex('Pull-Ups', 3, '6', 'COMPOUND', 5, 90),
      ex('Chin-Ups', 3, '6', 'COMPOUND', 5, 90),
      ex('Crunches', 3, '15', 'ACCESSORY', 4, 45),
      ex('Bicycle Crunch', 3, '12', 'ACCESSORY', 4, 45),
      ex('Lying Leg Raise', 3, '10', 'ACCESSORY', 4, 45),
      ex('Reverse Crunch', 3, '12', 'ACCESSORY', 4, 45),
      ...COOLDOWN_UPPER_BACK,
    ],
  },
  {
    day: 'Day 3', focus: 'Lower Body', totalDuration: 45, exercises: [
      ...WARMUP_LOWER,
      ex('Lunges', 3, '10 each', 'COMPOUND', 6, 60),
      ex('Bulgarian Split Squat', 3, '8 each', 'COMPOUND', 6, 75),
      ex('Glute Bridge', 3, '15', 'COMPOUND', 5, 60),
      ex('Single Leg Glute Bridge', 3, '10 each', 'COMPOUND', 5, 60),
      ex('Calf Raises', 3, '15', 'ACCESSORY', 4, 45),
      ex('Wall Sit', 3, '30s', 'ACCESSORY', 3, 30),
      ...COOLDOWN_LOWER,
    ],
  },
  {
    day: 'Day 4', focus: 'Full Body HIIT', totalDuration: 40, exercises: [
      ...WARMUP_FULL,
      ex('Burpees', 3, '8', 'CARDIO', 4, 45),
      ex('Mountain Climbers', 3, '30s', 'CARDIO', 3, 30),
      ex('Jump Squat', 3, '10', 'COMPOUND', 4, 45),
      ex('Push-Ups', 3, '10', 'COMPOUND', 4, 45),
      ex('Jumping Jacks', 3, '1 min', 'CARDIO', 3, 30),
      ex('Plank', 3, '30s', 'ACCESSORY', 3, 30),
      ...COOLDOWN_GENERAL,
    ],
  },
  {
    day: 'Day 5', focus: 'Upper Strength', totalDuration: 45, exercises: [
      ...WARMUP_UPPER,
      ex('Push-Ups', 3, '15', 'COMPOUND', 5, 60),
      ex('Pike Push-Ups', 3, '10', 'COMPOUND', 5, 60),
      ex('Pull-Ups', 3, '6', 'COMPOUND', 5, 90),
      ex('Chin-Ups', 3, '6', 'COMPOUND', 5, 90),
      ex('Diamond Push-Ups', 3, '10', 'COMPOUND', 5, 60),
      ex('Chair Dips', 3, '12', 'COMPOUND', 5, 60),
      ...COOLDOWN_UPPER,
    ],
  },
  {
    day: 'Day 6', focus: 'Lower & Core', totalDuration: 45, exercises: [
      ...WARMUP_LOWER,
      ex('Bulgarian Split Squat', 3, '10 each', 'COMPOUND', 6, 60),
      ex('Lateral Lunge', 3, '10 each', 'COMPOUND', 6, 60),
      ex('Donkey Kicks', 3, '12', 'ACCESSORY', 5, 45),
      ex('Glute Bridge', 3, '15', 'COMPOUND', 5, 60),
      ex('Reverse Crunch', 3, '15', 'ACCESSORY', 4, 45),
      ex('Mountain Climbers', 3, '30s', 'CARDIO', 3, 30),
      ...COOLDOWN_LOWER_FULL,
    ],
  },
  {
    day: 'Day 7', focus: 'Active Recovery', totalDuration: 30, isRecovery: true, exercises: [
      ex('Brisk Walk', 1, '20 min', 'CARDIO', 20),
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
    description: 'Push/Pull/Legs split for full gym access. Builds strength & muscle with barbells, cables, and machines.',
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
    name: 'Home Iron: Dumbbell Split',
    description: 'Upper/Lower split with dumbbells only. Perfect for home gym warriors building real muscle.',
    difficulty: 'BEGINNER',
    equipment: 'HOME_DUMBBELLS',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(dumbbellDays),
    is_active: true,
    display_order: 2,
  },
  {
    id: -3,
    name: 'No Excuses: Bodyweight',
    description: 'Zero equipment needed. Calisthenics-based program for fat loss and muscle building anywhere.',
    difficulty: 'BEGINNER',
    equipment: 'BODYWEIGHT',
    duration_weeks: 4,
    days_per_week: 6,
    days: expandToFourWeeks(bodyweightDays),
    is_active: true,
    display_order: 3,
  },
];

// Auto-select the best default plan based on user equipment
export function getRecommendedPlan(
  equipment: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT',
  split?: 'PPL' | 'CLASSIC'
): WorkoutPlan {
  const eqPlans = DEFAULT_PLANS.filter(p => p.equipment === equipment);
  if (eqPlans.length === 0) return DEFAULT_PLANS[2]; // fallback: bodyweight

  return eqPlans[0];
}
