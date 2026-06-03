package com.reforge.app;

import android.app.AppOpsManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.Iterator;
import java.util.List;

/**
 * Focus Shield Background Service (Android Foreground Service).
 * Monitors foreground app package name and screen time against user-defined daily limits.
 * Exceeding the limit forces the Capacitor app into Lockdown Mode.
 */
public class FocusShieldService extends Service {
    private static final String TAG = "FocusShieldService";
    private static final String CHANNEL_ID = "reforge_focus_shield";
    private static final int NOTIFICATION_ID = 9002;
    private static final String PREFS_NAME = "reforge_focus_shield_prefs";

    public static final String ACTION_START = "com.reforge.app.ACTION_START_SHIELD";
    public static final String ACTION_STOP = "com.reforge.app.ACTION_STOP_SHIELD";

    private boolean isRunning = false;
    private Thread monitorThread;
    private volatile boolean monitorRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();

        if (ACTION_STOP.equals(action)) {
            stopShieldInternal();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action)) {
            if (isRunning) {
                Log.i(TAG, "Focus Shield already running, reloading settings...");
                return START_STICKY;
            }

            try {
                startForeground(NOTIFICATION_ID, buildNotification());
            } catch (Exception e) {
                Log.e(TAG, "Failed to start foreground service", e);
                stopSelf();
                return START_NOT_STICKY;
            }

            isRunning = true;
            startMonitoring();
            Log.i(TAG, "Focus Shield Service successfully started in foreground.");
            return START_STICKY;
        }

        return START_NOT_STICKY;
    }

    private void startMonitoring() {
        monitorRunning = true;
        monitorThread = new Thread(() -> {
            UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
            
            while (monitorRunning && isRunning) {
                try {
                    Thread.sleep(2500); // Check every 2.5 seconds (battery friendly)
                    
                    if (!hasUsageStatsPermission(this)) {
                        continue;
                    }

                    // 1. Get current foreground app package name
                    String activePackage = getActiveForegroundPackage(usm);
                    if (activePackage == null || activePackage.isEmpty()) {
                        continue;
                    }

                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    String ourPkg = getPackageName();

                    // If user is actively inside our app (doing pushups/bypass), preserve the state as-is
                    if (activePackage.equals(ourPkg)) {
                        continue;
                    }

                    // 2. Check if activePackage is a locked app in our preferences
                    String lockedJsonStr = prefs.getString("locked_apps", "{}");
                    JSONObject lockedApps = new JSONObject(lockedJsonStr);

                    boolean shouldLock = false;
                    if (lockedApps.has(activePackage)) {
                        int limitMinutes = lockedApps.getInt(activePackage);
                        
                        // 3. Query total usage minutes today since midnight
                        long usageMs = getUsageTodayMs(usm, activePackage);
                        int usageMinutes = (int) (usageMs / (1000 * 60));
                        
                        Log.d(TAG, "Monitored app: " + activePackage + " | limit: " + limitMinutes + "m | usage: " + usageMinutes + "m");

                        if (usageMinutes >= limitMinutes) {
                            // 4. Check if a bypass/unlock window is active for this package
                            String bypassJsonStr = prefs.getString("bypass_timestamps", "{}");
                            JSONObject bypassTimestamps = new JSONObject(bypassJsonStr);
                            long bypassExpiry = bypassTimestamps.optLong(activePackage, 0);

                            if (System.currentTimeMillis() > bypassExpiry) {
                                shouldLock = true;
                            }
                        }
                    }

                    if (shouldLock) {
                        boolean alreadyLocked = prefs.getBoolean("active_lockdown", false);
                        String currentLockedPkg = prefs.getString("lockdown_package", "");
                        
                        if (!alreadyLocked || !activePackage.equals(currentLockedPkg)) {
                            Log.i(TAG, "LOCKDOWN TRIGGERED: " + activePackage);
                            prefs.edit()
                                .putBoolean("active_lockdown", true)
                                .putString("lockdown_package", activePackage)
                                .apply();
                            triggerLockdown(activePackage);
                        }
                    } else {
                        // User is on the launcher, settings, or another safe app (and not our app)
                        // Clear the lockdown state so they are not blocked when they open Reforge manually
                        boolean alreadyLocked = prefs.getBoolean("active_lockdown", false);
                        if (alreadyLocked) {
                            Log.i(TAG, "Clearing active lockdown because user switched to safe package: " + activePackage);
                            prefs.edit()
                                .putBoolean("active_lockdown", false)
                                .putString("lockdown_package", "")
                                .apply();
                        }
                    }
                } catch (InterruptedException e) {
                    break;
                } catch (Exception e) {
                    Log.e(TAG, "Error in monitoring loop", e);
                }
            }
        });
        monitorThread.setDaemon(true);
        monitorThread.start();
    }

    private String getActiveForegroundPackage(UsageStatsManager usm) {
        long time = System.currentTimeMillis();
        // Query recent usage stats from last 1 minute
        List<UsageStats> appList = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, time - 1000 * 60, time);
        if (appList != null && !appList.isEmpty()) {
            UsageStats recentStats = null;
            for (UsageStats usageStats : appList) {
                if (recentStats == null || usageStats.getLastTimeUsed() > recentStats.getLastTimeUsed()) {
                    recentStats = usageStats;
                }
            }
            if (recentStats != null) {
                return recentStats.getPackageName();
            }
        }
        return null;
    }

    private long getUsageTodayMs(UsageStatsManager usm, String packageName) {
        Calendar calendar = Calendar.getInstance();
        calendar.set(Calendar.HOUR_OF_DAY, 0);
        calendar.set(Calendar.MINUTE, 0);
        calendar.set(Calendar.SECOND, 0);
        calendar.set(Calendar.MILLISECOND, 0);
        long startTime = calendar.getTimeInMillis();
        long endTime = System.currentTimeMillis();

        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
        if (stats != null) {
            for (UsageStats usageStats : stats) {
                if (usageStats.getPackageName().equals(packageName)) {
                    return usageStats.getTotalTimeInForeground();
                }
            }
        }
        return 0;
    }

    private void triggerLockdown(String targetPackage) {
        Intent lockIntent = new Intent(this, MainActivity.class);
        lockIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        lockIntent.putExtra("focus_shield_lockdown", true);
        lockIntent.putExtra("focus_shield_package", targetPackage);
        startActivity(lockIntent);
    }

    private void stopShieldInternal() {
        isRunning = false;
        monitorRunning = false;
        if (monitorThread != null) {
            monitorThread.interrupt();
        }
        Log.i(TAG, "Focus Shield Service stopped.");
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    public static boolean hasUsageStatsPermission(Context context) {
        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Focus Shield Guardian",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Ensures your digital shields remain active");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification() {
        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, openIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("Focus Shield Active")
                .setContentText("Guarding against digital distractions")
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (isRunning) {
            stopShieldInternal();
        }
    }
}
