package com.reforge.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(TrackingPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null) return;

        // Morning Dusk messages (low importance — silent)
        nm.createNotificationChannel(makeChannel(
            "reforge_dusk",
            "Daily Motivation",
            "Morning message from Dusk",
            NotificationManager.IMPORTANCE_DEFAULT
        ));

        // Streak at-risk warning (default importance — makes sound)
        nm.createNotificationChannel(makeChannel(
            "reforge_streak",
            "Streak Reminder",
            "Alert when your streak is at risk of breaking",
            NotificationManager.IMPORTANCE_DEFAULT
        ));

        // Quest deadline reminders
        nm.createNotificationChannel(makeChannel(
            "reforge_quests",
            "Quest Alerts",
            "Reminders for expiring quests",
            NotificationManager.IMPORTANCE_DEFAULT
        ));

        // Workout reminder (afternoon nudge)
        nm.createNotificationChannel(makeChannel(
            "reforge_workout",
            "Workout Reminder",
            "Reminder to complete your daily workout",
            NotificationManager.IMPORTANCE_DEFAULT
        ));

        // Comeback / inactivity ping
        nm.createNotificationChannel(makeChannel(
            "reforge_comeback",
            "Activity Reminder",
            "Reminder when you haven't opened the app in a while",
            NotificationManager.IMPORTANCE_DEFAULT
        ));

        // Leaderboard nudge before midnight reset
        nm.createNotificationChannel(makeChannel(
            "reforge_leaderboard",
            "Leaderboard",
            "Reminder before the daily leaderboard resets at midnight",
            NotificationManager.IMPORTANCE_DEFAULT
        ));
    }

    private NotificationChannel makeChannel(String id, String name, String desc, int importance) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(desc);
        channel.setShowBadge(true);
        return channel;
    }
}
