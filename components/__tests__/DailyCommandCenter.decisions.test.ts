import { describe, it, expect } from 'vitest';
import { 
  isCustomQuest, 
  shouldSwitchOnManualCreate, 
  shouldSwitchOnGoalGenDone 
} from '../DailyCommandCenter';
import { Quest } from '../../types';

describe('Auto-Switch Quest Tab Decisions', () => {
  describe('isCustomQuest', () => {
    it('returns true if goalId is present', () => {
      const q = { id: '1', title: 'q1', isDaily: true, goalId: 'g1' } as Quest;
      expect(isCustomQuest(q)).toBe(true);
    });

    it('returns true if isDaily is false', () => {
      const q = { id: '2', title: 'q2', isDaily: false } as Quest;
      expect(isCustomQuest(q)).toBe(true);
    });

    it('returns false if isDaily is true and no goalId', () => {
      const q = { id: '3', title: 'q3', isDaily: true } as Quest;
      expect(isCustomQuest(q)).toBe(false);
    });
  });

  describe('shouldSwitchOnManualCreate', () => {
    it('returns true if currentTab is DEFAULT, not tutorial, and is custom quest', () => {
      const newQuest = { id: '1', title: 'q1', isDaily: false } as Quest;
      expect(shouldSwitchOnManualCreate({ newQuest, currentTab: 'DEFAULT', isTutorial: false })).toBe(true);
    });

    it('returns false if currentTab is CUSTOM', () => {
      const newQuest = { id: '1', title: 'q1', isDaily: false } as Quest;
      expect(shouldSwitchOnManualCreate({ newQuest, currentTab: 'CUSTOM', isTutorial: false })).toBe(false);
    });

    it('returns false if isTutorial is true', () => {
      const newQuest = { id: '1', title: 'q1', isDaily: false } as Quest;
      expect(shouldSwitchOnManualCreate({ newQuest, currentTab: 'DEFAULT', isTutorial: true })).toBe(false);
    });

    it('returns false if not custom quest', () => {
      const newQuest = { id: '1', title: 'q1', isDaily: true } as Quest;
      expect(shouldSwitchOnManualCreate({ newQuest, currentTab: 'DEFAULT', isTutorial: false })).toBe(false);
    });
  });

  describe('shouldSwitchOnGoalGenDone', () => {
    it('returns true if DONE, quests > 0, and currentTab DEFAULT', () => {
      expect(shouldSwitchOnGoalGenDone({ storeState: 'DONE', pendingFeedQuestsCount: 1, currentTab: 'DEFAULT' })).toBe(true);
    });

    it('returns false if not DONE', () => {
      expect(shouldSwitchOnGoalGenDone({ storeState: 'GENERATING', pendingFeedQuestsCount: 1, currentTab: 'DEFAULT' })).toBe(false);
    });

    it('returns false if no quests', () => {
      expect(shouldSwitchOnGoalGenDone({ storeState: 'DONE', pendingFeedQuestsCount: 0, currentTab: 'DEFAULT' })).toBe(false);
    });

    it('returns false if currentTab is CUSTOM', () => {
      expect(shouldSwitchOnGoalGenDone({ storeState: 'DONE', pendingFeedQuestsCount: 1, currentTab: 'CUSTOM' })).toBe(false);
    });
  });
});
