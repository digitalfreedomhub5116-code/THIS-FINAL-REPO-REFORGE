/**
 * dungeonGoalQuest — Synthesize a single "Enter Today's Dungeon" quest
 * for a fitness goal, replacing AI-generated workout quests.
 *
 * The quest carries `isDungeonQuest: true` and `dungeonEquipment` so the
 * feed renderer can show an "Enter Dungeon" CTA that opens the dungeon
 * with the right equipment-specific plan.
 */

import { Goal, Quest, GoalDailyTask, Rank } from '../types';

function addMinsToHHMM(time: string, mins: number): string {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function getEquipmentLabel(eq?: 'GYM' | 'HOME_DUMBBELLS' | 'BODYWEIGHT'): string {
  switch (eq) {
    case 'GYM': return 'Gym Dungeon';
    case 'HOME_DUMBBELLS': return 'Dumbbell Dungeon';
    case 'BODYWEIGHT':
    default: return 'Bodyweight Dungeon';
  }
}

/**
 * Build a single Quest object that links to the daily dungeon.
 * Used by both GoalDetailView (manual generate) and GoalsView (auto-gen).
 */
export function buildDungeonGoalQuest(params: {
  goal: Goal;
  todayStr: string;
  currentTime?: string;
}): Quest {
  const { goal, todayStr, currentTime } = params;
  const equipment = goal.equipment || 'BODYWEIGHT';
  const planLabel = getEquipmentLabel(equipment);
  const baseTime = currentTime || nowHHMM();
  const scheduledTime = addMinsToHHMM(baseTime, 15);

  return {
    id: `dungeon-quest-${goal.id}-${todayStr}`,
    title: `Enter Today's Dungeon — ${planLabel}`,
    description: `Your daily training, calibrated for your equipment. Tap "Enter Dungeon" to begin.`,
    rank: 'C' as Rank,
    priority: 'HIGH' as any,
    category: 'strength' as any,
    categories: ['strength'] as any,
    xpReward: 80,
    isCompleted: false,
    createdAt: Date.now(),
    isDaily: true,
    estimatedDuration: 30,
    aiReasoning: 'Fitness goal — completing the daily dungeon counts as your workout.',
    goalId: goal.id,
    goalTitle: goal.title,
    goalQuestResources: [],
    goalQuestSteps: [
      'Tap "Enter Dungeon" below to begin.',
      'Watch the rewarded ad.',
      'Complete the workout in the dungeon player.',
    ],
    scheduledTime,
    isDungeonQuest: true,
    dungeonEquipment: equipment,
  } as Quest;
}

/**
 * Build a GoalDailyTask wrapping the dungeon quest, so it shows up
 * inside the goal-detail "Today's Tasks" list as well.
 */
export function buildDungeonGoalDailyTask(params: {
  goal: Goal;
  todayStr: string;
  dayNumber: number;
  currentTime?: string;
}): GoalDailyTask {
  const { goal, todayStr, dayNumber } = params;
  const equipment = goal.equipment || 'BODYWEIGHT';
  const planLabel = getEquipmentLabel(equipment);

  return {
    id: `dt-${goal.id}-${todayStr}`,
    goalId: goal.id,
    date: todayStr,
    dayNumber,
    quests: [{
      id: `dungeon-task-${goal.id}-${todayStr}`,
      title: `Enter Today's Dungeon — ${planLabel}`,
      estimatedDuration: 30,
      categories: ['strength'],
      rank: 'C',
      xp: 80,
      reasoning: 'Fitness goal — completing the daily dungeon counts as your workout.',
      stepByStep: [
        'Tap "Enter Dungeon" to begin.',
        'Watch the rewarded ad.',
        'Complete the workout in the dungeon player.',
      ],
      resources: [],
      completed: false,
      isDungeonQuest: true,
      dungeonEquipment: equipment,
    }] as any,
    completedCount: 0,
    totalCount: 1,
    dailyNote: 'Your dungeon is your workout today. Tap to enter.',
    progressUpdate: '',
    createdAt: Date.now(),
  };
}
