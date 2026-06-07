// ── In-App Review helper ──────────────────────────────────────────────
// Tracks lifetime dungeon clears in localStorage and triggers the native
// Google Play In-App Review popup at the right moment.
//
// Uses @capawesome/capacitor-app-review on Android. Falls back to opening
// the Play Store URL in the browser on web/dev.

const STORAGE_KEY = 'reforge_review_state_v1';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.reforgesystem.app';

// Re-ask after this many days if the user dismissed/declined without leaving a review.
const RE_ASK_AFTER_DAYS = 60;
// Trigger after the user clears this many Daily Dungeons.
export const DUNGEON_CLEAR_THRESHOLD = 2;

export interface ReviewState {
  dungeonClears: number;
  hasBeenAsked: boolean;
  lastAskedAt: number | null;
  userDeclined: boolean;
  userLeftReview: boolean;
}

const DEFAULT_STATE: ReviewState = {
  dungeonClears: 0,
  hasBeenAsked: false,
  lastAskedAt: null,
  userDeclined: false,
  userLeftReview: false,
};

export function getReviewState(): ReviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function setReviewState(patch: Partial<ReviewState>): ReviewState {
  const next = { ...getReviewState(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function incrementDungeonClear(): number {
  const state = getReviewState();
  const nextCount = state.dungeonClears + 1;
  setReviewState({ dungeonClears: nextCount });
  return nextCount;
}

export function shouldTriggerReview(): boolean {
  const state = getReviewState();
  if (state.userLeftReview) return false;
  if (state.dungeonClears < DUNGEON_CLEAR_THRESHOLD) return false;
  if (state.userDeclined) return false;

  if (state.hasBeenAsked && state.lastAskedAt) {
    const daysSince =
      (Date.now() - state.lastAskedAt) / (1000 * 60 * 60 * 24);
    if (daysSince < RE_ASK_AFTER_DAYS) return false;
  }
  return true;
}

export function markAsked(): void {
  setReviewState({ hasBeenAsked: true, lastAskedAt: Date.now() });
}

export function markDeclined(): void {
  setReviewState({
    userDeclined: true,
    hasBeenAsked: true,
    lastAskedAt: Date.now(),
  });
}

export function markLeftReview(): void {
  setReviewState({
    userLeftReview: true,
    hasBeenAsked: true,
    lastAskedAt: Date.now(),
  });
}

/**
 * Launch the native Google Play In-App Review popup.
 * Returns true if the request was dispatched (does NOT guarantee the popup
 * actually displayed — Google may silently skip due to quota).
 * On web/dev, falls back to opening the Play Store listing in a new tab.
 */
export async function launchNativeReview(): Promise<boolean> {
  try {
    // Dynamic import so the plugin is only loaded when needed and the web
    // bundle does not break if the plugin isn't installed in dev.
    const mod: any = await import('@capawesome/capacitor-app-review').catch(
      () => null
    );
    const AppReview = mod?.AppReview;
    if (AppReview && typeof AppReview.requestReview === 'function') {
      await AppReview.requestReview();
      markLeftReview();
      return true;
    }
  } catch {
    // Fall through to web fallback
  }

  // Web / fallback path: open Play Store directly
  try {
    window.open(PLAY_STORE_URL, '_blank', 'noopener,noreferrer');
    markLeftReview();
    return true;
  } catch {
    return false;
  }
}

/**
 * Dispatch a window event to ask the app to show the review prompt sheet.
 * Mounted listener lives in <ReviewPromptSheet />.
 */
export function dispatchShowReviewPrompt(): void {
  try {
    window.dispatchEvent(new Event('reforge:show-review-prompt'));
  } catch {}
}
