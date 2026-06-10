import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getReviewState,
  incrementDungeonClear,
  shouldTriggerReview,
  launchNativeReview,
  DUNGEON_CLEAR_THRESHOLD,
} from '../appReview';
import { AppReview } from '@capawesome/capacitor-app-review';
import { Capacitor } from '@capacitor/core';

vi.mock('@capawesome/capacitor-app-review', () => {
  return {
    AppReview: {
      requestReview: vi.fn(),
      openAppStore: vi.fn(),
    },
  };
});

vi.mock('@capacitor/core', () => {
  return {
    Capacitor: {
      isNativePlatform: vi.fn(() => false),
      getPlatform: vi.fn(() => 'web'),
    },
  };
});

describe('appReview', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize default state correctly', () => {
    const state = getReviewState();
    expect(state.dungeonClears).toBe(0);
    expect(state.hasBeenAsked).toBe(false);
  });

  it('should increment dungeon clear count', () => {
    incrementDungeonClear();
    const state = getReviewState();
    expect(state.dungeonClears).toBe(1);
  });

  it('should trigger review if clear threshold met and not asked', () => {
    expect(shouldTriggerReview()).toBe(false);

    // Increment to threshold
    for (let i = 0; i < DUNGEON_CLEAR_THRESHOLD; i++) {
      incrementDungeonClear();
    }
    expect(shouldTriggerReview()).toBe(true);
  });

  it('should fallback to window.open on web', async () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    const result = await launchNativeReview();
    expect(result).toBe(true);
    expect(window.open).toHaveBeenCalledWith(
      'https://play.google.com/store/apps/details?id=com.reforge.app',
      '_blank',
      'noopener,noreferrer'
    );

    window.open = originalOpen;
  });

  it('should call native requestReview on native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(AppReview.requestReview).mockResolvedValue(undefined as never);

    const result = await launchNativeReview();
    expect(result).toBe(true);
    expect(AppReview.requestReview).toHaveBeenCalled();
  });

  it('should call native openAppStore if requestReview throws error on native', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(AppReview.requestReview).mockRejectedValue(new Error('Quota limit') as never);
    vi.mocked(AppReview.openAppStore).mockResolvedValue(undefined as never);

    const result = await launchNativeReview();
    expect(result).toBe(true);
    expect(AppReview.requestReview).toHaveBeenCalled();
    expect(AppReview.openAppStore).toHaveBeenCalled();
  });
});
