/**
 * useLocalNotifications.ts
 *
 * Schedules and manages Android local notifications for:
 * - 6 AM Dusk morning motivation (daily)
 * - 5 PM workout reminder (only if no workout today)
 * - 8 PM streak at-risk warning (only if no workout today)
 * - 9 PM leaderboard nudge before midnight reset (only if user has daily XP)
 * - 48h comeback ping after inactivity
 * - Quest deadline reminder (1h before quest expiry)
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

// ─── Dusk Morning Messages ────────────────────────────────────

const DUSK_MESSAGES = [
  "The weak version of you is watching. Don't disappoint them.",
  "Another sunrise. Another chance to level up. Don't waste it.",
  "I analyzed your patterns. You're capable of more. Prove it.",
  "The System doesn't care about motivation. It cares about discipline.",
  "Your rivals trained while you slept. Time to close the gap.",
  "6:00 AM. The grind protocol initiates now.",
  "I've prepared today's quests. Open the app to accept them.",
  "Warning — stagnation detected. Immediate action recommended.",
  "Every day you skip is a day you drift further from the version of you that wins.",
  "Discipline beats motivation. Every. Single. Time.",
  "I scanned your progress. You're behind schedule. Fix it today.",
  "The strongest hunters aren't born. They're forged through consistency.",
  "Another hunter just surpassed you on the leaderboard. Will you allow that?",
  "The penalty zone doesn't discriminate. Neither should your effort.",
  "You have 24 hours. Make them count. DUSK out.",
];

const WORKOUT_MESSAGES = [
  "You haven't trained today. Even 15 minutes counts. Don't break the chain.",
  "Your body is waiting. No workout logged yet.",
  "The grind doesn't pause. Your workout window is closing.",
  "Every skipped session is a gift to your rivals. Train now.",
  "No pain logged yet today. The System is watching.",
];

const COMEBACK_MESSAGES = [
  "It's been a while. Your rivals are pulling ahead. Return to the grind.",
  "Absence detected. The System has been waiting for you.",
  "Your quests are expiring and your rivals are training. Open the app.",
  "2 days offline. The gap is growing. Come back and close it.",
];

// ─── Stable Notification IDs ─────────────────────────────────

const NOTIF_IDS = {
  MORNING_DUSK:       6001,
  STREAK_WARNING:     6002,
  WORKOUT_REMINDER:   6003,
  LEADERBOARD_NUDGE:  6004,
  COMEBACK_PING:      6005,
  QUEST_DEADLINE_BASE: 7000, // +hash(questId) per quest
};

// ─── Helpers ─────────────────────────────────────────────────

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** Compute next occurrence of a given hour today; if already past, use tomorrow */
function nextTimeAt(hour: number, minute = 0): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  if (Date.now() >= d.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  }
  return Math.abs(h % 1000);
}

// ─── Permission ──────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

// ─── Morning Dusk (6 AM, one-shot, re-scheduled each app open) ──

export async function scheduleMorningDusk(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.MORNING_DUSK }] });
    const at = nextTimeAt(6, 0);
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_IDS.MORNING_DUSK,
        title: '⚔️ Message from Dusk',
        body: pick(DUSK_MESSAGES),
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_dusk',
      }],
    });
    console.log('[Notif] Morning Dusk →', at.toLocaleTimeString());
  } catch (err) {
    console.warn('[Notif] scheduleMorningDusk failed:', err);
  }
}

// ─── Workout Reminder (5 PM, only if no workout today) ───────

export async function scheduleWorkoutReminder(hasWorkedOutToday: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.WORKOUT_REMINDER }] });
    if (hasWorkedOutToday) return; // Already trained — don't nag
    const at = nextTimeAt(17, 0);
    // Only schedule for today (not tomorrow) — next app open will re-evaluate
    if (at.getDate() !== new Date().getDate()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_IDS.WORKOUT_REMINDER,
        title: '💪 No workout logged yet',
        body: pick(WORKOUT_MESSAGES),
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_workout',
      }],
    });
    console.log('[Notif] Workout reminder →', at.toLocaleTimeString());
  } catch (err) {
    console.warn('[Notif] scheduleWorkoutReminder failed:', err);
  }
}

// ─── Streak At-Risk Warning (8 PM, only if no workout today) ─

export async function scheduleStreakReminder(currentStreak: number, hasWorkedOutToday: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.STREAK_WARNING }] });
    if (hasWorkedOutToday || currentStreak < 1) return;
    const at = nextTimeAt(20, 0);
    if (at.getDate() !== new Date().getDate()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_IDS.STREAK_WARNING,
        title: '🔥 Streak in danger!',
        body: `Your ${currentStreak}-day streak ends at midnight. One workout saves it.`,
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_streak',
      }],
    });
    console.log('[Notif] Streak reminder →', at.toLocaleTimeString());
  } catch (err) {
    console.warn('[Notif] scheduleStreakReminder failed:', err);
  }
}

// ─── Leaderboard Nudge (9 PM, only if user has daily XP today) ──

export async function scheduleLeaderboardNudge(hasDailyXp: boolean): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.LEADERBOARD_NUDGE }] });
    if (!hasDailyXp) return; // No activity today — no point showing leaderboard notif
    const at = nextTimeAt(21, 0);
    if (at.getDate() !== new Date().getDate()) return;
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_IDS.LEADERBOARD_NUDGE,
        title: '� Leaderboard resets at midnight',
        body: 'Top 5 earn Gold + XP + Keys. Check your rank and push for rewards before reset!',
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_leaderboard',
      }],
    });
    console.log('[Notif] Leaderboard nudge →', at.toLocaleTimeString());
  } catch (err) {
    console.warn('[Notif] scheduleLeaderboardNudge failed:', err);
  }
}

// ─── Comeback Ping (48h after now, one-shot) ─────────────────

export async function scheduleComebackPing(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIF_IDS.COMEBACK_PING }] });
    const at = new Date(Date.now() + 48 * 60 * 60 * 1000);
    await LocalNotifications.schedule({
      notifications: [{
        id: NOTIF_IDS.COMEBACK_PING,
        title: '🗡️ The System noticed your absence',
        body: pick(COMEBACK_MESSAGES),
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_comeback',
      }],
    });
    console.log('[Notif] Comeback ping → 48h from now');
  } catch (err) {
    console.warn('[Notif] scheduleComebackPing failed:', err);
  }
}

// ─── Cancel Daily Reminders (call after workout completion) ───
// Cancels workout, streak, and leaderboard reminders for today.
// Morning Dusk and comeback ping are intentionally NOT cancelled.

export async function cancelDailyReminders(): Promise<void> {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: NOTIF_IDS.WORKOUT_REMINDER },
        { id: NOTIF_IDS.STREAK_WARNING },
        { id: NOTIF_IDS.LEADERBOARD_NUDGE },
      ],
    });
    console.log('[Notif] Daily reminders cancelled (workout done)');
  } catch (err) {
    console.warn('[Notif] cancelDailyReminders failed:', err);
  }
}

// ─── Quest Deadline (1h before quest expiry) ─────────────────

export async function scheduleQuestDeadline(
  questId: string,
  questTitle: string,
  deadlineMs: number
): Promise<void> {
  if (!isNative()) return;
  try {
    const notifId = NOTIF_IDS.QUEST_DEADLINE_BASE + hashCode(questId);
    const reminderTime = new Date(deadlineMs - 60 * 60 * 1000);
    if (reminderTime <= new Date()) return; // Already past
    await LocalNotifications.schedule({
      notifications: [{
        id: notifId,
        title: '⏳ Quest expiring soon',
        body: `"${questTitle}" expires in 1 hour. Complete it now!`,
        schedule: { at: reminderTime, allowWhileIdle: true },
        smallIcon: 'ic_stat_notification',
        channelId: 'reforge_quests',
      }],
    });
    console.log('[Notif] Quest deadline scheduled for', questTitle);
  } catch (err) {
    console.warn('[Notif] scheduleQuestDeadline failed:', err);
  }
}

// ─── Cancel All (on logout / account reset) ──────────────────

export async function cancelAllNotifications(): Promise<void> {
  if (!isNative()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    console.log('[Notif] All notifications cancelled');
  } catch (err) {
    console.warn('[Notif] cancelAllNotifications failed:', err);
  }
}
