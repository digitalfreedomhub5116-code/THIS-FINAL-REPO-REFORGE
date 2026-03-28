/**
 * useLocalNotifications.ts
 * 
 * Schedules and manages local notifications for:
 * - 6 AM Dusk morning motivation messages (rotating)
 * - Streak warning at 8 PM if no activity
 * - Quest deadline reminders (1 hour before expiry)
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

// ─── Dusk Morning Messages ───────────────────────────────────

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

// ─── Notification IDs (stable, unique per category) ──────────

const NOTIFICATION_IDS = {
  MORNING_DUSK: 6001,
  STREAK_WARNING: 6002,
  QUEST_DEADLINE_BASE: 7000, // 7001, 7002, etc. per quest
};

// ─── Permission Check ────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'granted') return true;
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  } catch {
    return false;
  }
}

// ─── Morning Dusk (daily 6 AM) ───────────────────────────────

export async function scheduleMorningDusk(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Cancel existing morning notification first
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS.MORNING_DUSK }] });

    // Pick a random message for today
    const msgIndex = Math.floor(Math.random() * DUSK_MESSAGES.length);
    const message = DUSK_MESSAGES[msgIndex];

    // Schedule for next 6 AM that hasn't passed yet
    const now = new Date();
    const next6AM = new Date(now);
    next6AM.setHours(6, 0, 0, 0);
    if (now >= next6AM) {
      next6AM.setDate(next6AM.getDate() + 1);
    }

    const options: ScheduleOptions = {
      notifications: [
        {
          id: NOTIFICATION_IDS.MORNING_DUSK,
          title: '⚔️ DUSK',
          body: message,
          schedule: {
            at: next6AM,
            every: 'day',
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_notification',
          largeIcon: 'ic_launcher',
          sound: undefined, // default system sound
          channelId: 'reforge_dusk',
        },
      ],
    };

    await LocalNotifications.schedule(options);
    console.log('[Notifications] Morning Dusk scheduled for', next6AM.toLocaleString());
  } catch (err) {
    console.warn('[Notifications] Failed to schedule morning Dusk:', err);
  }
}

// ─── Streak Warning (daily 8 PM) ────────────────────────────

export async function scheduleStreakReminder(currentStreak: number): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (currentStreak < 2) return; // Don't remind for low streaks

  try {
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS.STREAK_WARNING }] });

    const now = new Date();
    const next8PM = new Date(now);
    next8PM.setHours(20, 0, 0, 0);
    if (now >= next8PM) {
      next8PM.setDate(next8PM.getDate() + 1);
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          id: NOTIFICATION_IDS.STREAK_WARNING,
          title: '🔥 Streak Alert',
          body: `Your ${currentStreak}-day streak expires at midnight. One quest to save it.`,
          schedule: {
            at: next8PM,
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_notification',
          channelId: 'reforge_streak',
        },
      ],
    });
    console.log('[Notifications] Streak reminder scheduled for', next8PM.toLocaleString());
  } catch (err) {
    console.warn('[Notifications] Failed to schedule streak reminder:', err);
  }
}

// ─── Quest Deadline (1 hour before expiry) ───────────────────

export async function scheduleQuestDeadline(
  questId: string,
  questTitle: string,
  deadlineMs: number
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Generate a stable ID from questId
    const notifId = NOTIFICATION_IDS.QUEST_DEADLINE_BASE + hashCode(questId);

    // Schedule for 1 hour before deadline
    const reminderTime = new Date(deadlineMs - 60 * 60 * 1000);
    if (reminderTime <= new Date()) return; // Already past

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: '⚔️ Quest Expiring Soon',
          body: `"${questTitle}" expires in 1 hour. Complete it now!`,
          schedule: {
            at: reminderTime,
            allowWhileIdle: true,
          },
          smallIcon: 'ic_stat_notification',
          channelId: 'reforge_quests',
        },
      ],
    });
    console.log('[Notifications] Quest deadline scheduled for', questTitle);
  } catch (err) {
    console.warn('[Notifications] Failed to schedule quest deadline:', err);
  }
}

// ─── Cancel All ──────────────────────────────────────────────

export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
    console.log('[Notifications] All notifications cancelled');
  } catch (err) {
    console.warn('[Notifications] Failed to cancel:', err);
  }
}

// ─── Helpers ─────────────────────────────────────────────────

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash % 1000); // Keep in a safe range
}
