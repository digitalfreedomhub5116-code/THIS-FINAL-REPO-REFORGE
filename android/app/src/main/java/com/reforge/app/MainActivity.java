package com.reforge.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.IntentSender;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import androidx.annotation.RequiresApi;
import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.InstallStateUpdatedListener;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "ReforgeUpdate";
    private static final int UPDATE_REQUEST_CODE = 9001;

    private AppUpdateManager appUpdateManager;
    private InstallStateUpdatedListener installStateListener;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(TrackingPlugin.class);
        super.onCreate(savedInstanceState);
        createNotificationChannels();

        // Initialize In-App Update check
        appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForAppUpdate();
    }

    // ═══════════════════════════════════════════════════════════════
    //  GOOGLE PLAY IN-APP UPDATES
    //
    //  Strategy: flexible by default, immediate (forced) when Play tells us
    //  the release is high-priority OR when the user is many versions behind.
    //
    //  In Play Console, when you publish a release you can set:
    //    - "Update priority" (0–5). Anything >= IMMEDIATE_PRIORITY_THRESHOLD
    //      triggers a forced full-screen update on old clients.
    //    - "Client version staleness" picks itself up via Play Core; older
    //      builds past STALENESS_DAYS_THRESHOLD also force-update.
    //  Otherwise we run a flexible update (background download + restart
    //  prompt) so users on minor patches aren't blocked.
    //
    //  Note: when the user accepts a flexible update, Play downloads the new
    //  APK in the background while the app keeps running. We listen for
    //  InstallStatus.DOWNLOADED and call completeUpdate() to trigger the
    //  "Restart now" UI; without that the user would never finish installing.
    // ═══════════════════════════════════════════════════════════════

    private static final int IMMEDIATE_PRIORITY_THRESHOLD = 4;   // 4 or 5 → forced
    private static final int STALENESS_DAYS_THRESHOLD     = 60;  // > 2 months stale → forced

    private void checkForAppUpdate() {
        Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();

        appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
            int availability = appUpdateInfo.updateAvailability();

            // Resume any forced update that the user backgrounded mid-install.
            if (availability == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                Log.d(TAG, "Update already in progress — resuming.");
                triggerImmediateUpdate(appUpdateInfo);
                return;
            }

            if (availability != UpdateAvailability.UPDATE_AVAILABLE) {
                Log.d(TAG, "No update available. Availability: " + availability);
                return;
            }

            // Decide forced vs flexible based on Play release priority and staleness.
            int priority = appUpdateInfo.updatePriority();
            Integer staleness = appUpdateInfo.clientVersionStalenessDays(); // null on fresh installs
            boolean isHighPriority = priority >= IMMEDIATE_PRIORITY_THRESHOLD;
            boolean isVeryStale    = staleness != null && staleness >= STALENESS_DAYS_THRESHOLD;

            if ((isHighPriority || isVeryStale)
                    && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                Log.d(TAG, "Forced update triggered. priority=" + priority
                        + " stalenessDays=" + staleness);
                triggerImmediateUpdate(appUpdateInfo);
                return;
            }

            if (appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)) {
                Log.d(TAG, "Flexible update triggered. priority=" + priority
                        + " stalenessDays=" + staleness);
                triggerFlexibleUpdate(appUpdateInfo);
                return;
            }

            // Neither flexible nor immediate is allowed by Play (rare). Log and skip.
            Log.d(TAG, "Update available but neither FLEXIBLE nor IMMEDIATE allowed.");
        });

        appUpdateInfoTask.addOnFailureListener(e -> {
            // Non-fatal: user is offline or Play Store unavailable
            Log.w(TAG, "Update check failed (offline or Play Store unavailable)", e);
        });
    }

    private void triggerImmediateUpdate(AppUpdateInfo info) {
        try {
            appUpdateManager.startUpdateFlowForResult(
                    info,
                    this,
                    AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
                    UPDATE_REQUEST_CODE
            );
        } catch (IntentSender.SendIntentException e) {
            Log.e(TAG, "Failed to start IMMEDIATE update flow", e);
        }
    }

    private void triggerFlexibleUpdate(AppUpdateInfo info) {
        // Listen for the background download to finish so we can prompt the
        // user to restart. The listener is registered once and unregistered
        // when the install completes.
        if (installStateListener == null) {
            installStateListener = state -> {
                if (state.installStatus() == InstallStatus.DOWNLOADED) {
                    Log.d(TAG, "Flexible update downloaded — completing install.");
                    appUpdateManager.completeUpdate();
                } else if (state.installStatus() == InstallStatus.FAILED) {
                    Log.w(TAG, "Flexible update install failed: " + state.installErrorCode());
                }
            };
            appUpdateManager.registerListener(installStateListener);
        }

        try {
            appUpdateManager.startUpdateFlowForResult(
                    info,
                    this,
                    AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(),
                    UPDATE_REQUEST_CODE
            );
        } catch (IntentSender.SendIntentException e) {
            Log.e(TAG, "Failed to start FLEXIBLE update flow", e);
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager == null) return;

        // Re-check on resume so two situations are handled:
        //   1. A forced update that the user backgrounded — re-trigger it.
        //   2. A flexible update whose download finished while the app was in
        //      the background — prompt the user to install it now.
        appUpdateManager.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                Log.d(TAG, "onResume: forced update still in progress — re-triggering.");
                triggerImmediateUpdate(info);
                return;
            }
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                Log.d(TAG, "onResume: flexible update finished downloading — completing.");
                appUpdateManager.completeUpdate();
            }
        });
    }

    @Override
    public void onDestroy() {
        if (appUpdateManager != null && installStateListener != null) {
            appUpdateManager.unregisterListener(installStateListener);
            installStateListener = null;
        }
        super.onDestroy();
    }

    // ═══════════════════════════════════════════════════════════════
    //  NOTIFICATION CHANNELS
    // ═══════════════════════════════════════════════════════════════

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

    @RequiresApi(api = Build.VERSION_CODES.O)
    private NotificationChannel makeChannel(String id, String name, String desc, int importance) {
        NotificationChannel channel = new NotificationChannel(id, name, importance);
        channel.setDescription(desc);
        channel.setShowBadge(true);
        return channel;
    }
}
