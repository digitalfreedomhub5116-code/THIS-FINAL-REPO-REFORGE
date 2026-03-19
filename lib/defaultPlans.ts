import { WorkoutDay, WorkoutPlan, Exercise } from '../types';

// Helper to build exercise entries
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
