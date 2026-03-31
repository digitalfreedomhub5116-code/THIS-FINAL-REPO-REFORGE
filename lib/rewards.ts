import { DailyReward } from '../types';

export const DAILY_REWARDS_ENABLED = false;
export const SKILLS_ENABLED = false;

export const REWARD_SCHEDULE: DailyReward[] = [
  { type: 'NONE', amount: 0, message: 'Day 1: Focus on the start' },
  { type: 'GOLD', amount: 300, message: 'Day 2: 300 Gold' },
  { type: 'NONE', amount: 0, message: 'Day 3: Keep pushing' },
  { type: 'VENUS_SHARDS', amount: 30, message: 'Day 4: 30 Venus Shards' },
  { type: 'GOLD', amount: 450, message: 'Day 5: 450 Gold' },
  { type: 'CHEST_LEGENDARY', amount: 1, message: 'Day 6: Legendary Chest' },
  { type: 'KEYS', amount: 1, message: 'Day 7: 1 Key & Legendary Chest' }, // The system will award both in the claim logic
];
