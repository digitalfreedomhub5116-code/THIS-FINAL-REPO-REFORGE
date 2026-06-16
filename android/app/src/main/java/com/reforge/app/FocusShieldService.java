package com.reforge.app;

import android.app.AlarmManager;
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
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

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
    public static final String ACTION_RESTART = "com.reforge.app.ACTION_RESTART_SHIELD";

    // Persisted flag so the service (and BootReceiver / watchdog alarm) know whether
    // the user actually wants the shield active before self-restarting.
    public static final String KEY_SHIELD_ENABLED = "is_shield_enabled";
    private static final int RESTART_ALARM_REQUEST = 9100;

    private boolean isRunning = false;
    private Thread monitorThread;
    private volatile boolean monitorRunning = false;

    // System overlay (lock screen drawn on top of the blocked app)
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private WindowManager windowManager;
    private View overlayView;
    private volatile boolean overlayShown = false;
    private volatile String overlayPackage = null;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(Context.WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // CRITICAL: When the OS recreates a START_STICKY service after the process was
        // killed (e.g. user swiped the app from recents), it redelivers a NULL intent.
        // Previously we bailed out here, so monitoring never resumed. Instead, treat a
        // null intent (or our RESTART action) as a request to resume the shield, but
        // only if the user actually had it enabled.
        String action = intent != null ? intent.getAction() : null;

        if (ACTION_STOP.equals(action)) {
            stopShieldInternal();
            return START_NOT_STICKY;
        }

        boolean wantsStart = ACTION_START.equals(action)
                || ACTION_RESTART.equals(action)
                || action == null; // system restart after kill

        if (wantsStart) {
            // For system/watchdog restarts, respect the persisted user preference.
            if (action == null || ACTION_RESTART.equals(action)) {
                if (!isShieldEnabled(this)) {
                    Log.i(TAG, "System restart requested but shield is disabled. Stopping.");
                    stopSelf();
                    return START_NOT_STICKY;
                }
            } else {
                // Explicit user start: persist the enabled flag.
                setShieldEnabled(this, true);
            }

            try {
                startForeground(NOTIFICATION_ID, buildNotification());
            } catch (Exception e) {
                Log.e(TAG, "Failed to start foreground service", e);
                stopSelf();
                return START_NOT_STICKY;
            }

            if (isRunning) {
                Log.i(TAG, "Focus Shield already running, foreground refreshed.");
                return START_STICKY;
            }

            isRunning = true;
            startMonitoring();
            Log.i(TAG, "Focus Shield Service started in foreground (action=" + action + ").");
            return START_STICKY;
        }

        return START_STICKY;
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

                    // If user is actively inside our app (doing pushups/bypass), tear down the
                    // overlay so it doesn't sit on top of the Reforge quest screen.
                    if (activePackage.equals(ourPkg)) {
                        removeOverlay();
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
                        Log.i(TAG, "LOCKDOWN TRIGGERED/ENFORCED: " + activePackage);
                        prefs.edit()
                            .putBoolean("active_lockdown", true)
                            .putString("lockdown_package", activePackage)
                            .apply();
                        // Draw a blocking system overlay directly from the service. This works
                        // even when the Capacitor UI process is dead, unlike a background
                        // startActivity() which Android 12+/14+ heavily restricts.
                        showOverlay(activePackage);
                    } else {
                        // Foreground app is not locked (or has an active bypass): remove overlay.
                        removeOverlay();
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

    private void launchReforgeQuest(String targetPackage) {
        Intent lockIntent = new Intent(this, MainActivity.class);
        lockIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        lockIntent.putExtra("focus_shield_lockdown", true);
        lockIntent.putExtra("focus_shield_package", targetPackage);
        try {
            startActivity(lockIntent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch Reforge quest activity", e);
        }
    }

    // ─────────────────────────────────────────────────────────────
    //  SYSTEM OVERLAY (blocking lock screen drawn over the target app)
    // ─────────────────────────────────────────────────────────────

    private void showOverlay(final String targetPackage) {
        mainHandler.post(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
                // No overlay permission: fall back to launching the Reforge activity.
                launchReforgeQuest(targetPackage);
                return;
            }
            if (overlayShown && targetPackage.equals(overlayPackage)) {
                return; // Already showing for this app.
            }
            if (overlayShown) {
                removeOverlayInternal();
            }
            try {
                overlayView = buildOverlayView(targetPackage);
                int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.MATCH_PARENT,
                        WindowManager.LayoutParams.MATCH_PARENT,
                        type,
                        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                                | WindowManager.LayoutParams.FLAG_LAYOUT_INSET_DECOR,
                        PixelFormat.OPAQUE);
                params.gravity = Gravity.CENTER;
                windowManager.addView(overlayView, params);
                overlayShown = true;
                overlayPackage = targetPackage;
                Log.i(TAG, "Overlay shown over " + targetPackage);
            } catch (Exception e) {
                Log.e(TAG, "Failed to add overlay, falling back to activity", e);
                launchReforgeQuest(targetPackage);
            }
        });
    }

    private void removeOverlay() {
        if (!overlayShown) return;
        mainHandler.post(this::removeOverlayInternal);
    }

    private void removeOverlayInternal() {
        if (overlayView != null) {
            try {
                windowManager.removeView(overlayView);
            } catch (Exception e) {
                Log.w(TAG, "Overlay already removed", e);
            }
        }
        overlayView = null;
        overlayShown = false;
        overlayPackage = null;
    }

    private View buildOverlayView(final String targetPackage) {
        String appName = resolveAppName(targetPackage);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(Color.parseColor("#0B1120"));
        int pad = dp(28);
        root.setPadding(pad, pad, pad, pad);
        // Capture every touch so the blocked app underneath stays inaccessible.
        root.setClickable(true);
        root.setFocusable(true);

        TextView badge = new TextView(this);
        badge.setText("FOCUS SHIELD");
        badge.setTextColor(Color.parseColor("#22D3EE"));
        badge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        badge.setLetterSpacing(0.25f);
        badge.setGravity(Gravity.CENTER);
        root.addView(badge);

        TextView title = new TextView(this);
        title.setText("DAILY LIMIT REACHED");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
        title.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        titleLp.topMargin = dp(12);
        title.setLayoutParams(titleLp);
        root.addView(title);

        TextView subtitle = new TextView(this);
        subtitle.setText(appName + " is locked. Complete your quest in Reforge to continue.");
        subtitle.setTextColor(Color.parseColor("#94A3B8"));
        subtitle.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        subtitle.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams subLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        subLp.topMargin = dp(10);
        subtitle.setLayoutParams(subLp);
        root.addView(subtitle);

        Button openBtn = new Button(this);
        openBtn.setText("COMPLETE QUEST IN REFORGE");
        openBtn.setAllCaps(true);
        openBtn.setTextColor(Color.WHITE);
        openBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        openBtn.setTypeface(android.graphics.Typeface.create("sans-serif-condensed", android.graphics.Typeface.BOLD));
        
        android.graphics.drawable.GradientDrawable btnBg = new android.graphics.drawable.GradientDrawable();
        btnBg.setColor(Color.parseColor("#2563EB"));
        btnBg.setCornerRadius(dp(10));
        openBtn.setBackground(btnBg);
        openBtn.setPadding(dp(24), dp(12), dp(24), dp(12));

        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        btnLp.topMargin = dp(28);
        openBtn.setLayoutParams(btnLp);
        openBtn.setOnClickListener(v -> launchReforgeQuest(targetPackage));
        root.addView(openBtn);

        Button homeBtn = new Button(this);
        homeBtn.setText("CLOSE APP");
        homeBtn.setAllCaps(true);
        homeBtn.setTextColor(Color.parseColor("#94A3B8"));
        homeBtn.setBackgroundColor(Color.TRANSPARENT);
        LinearLayout.LayoutParams homeLp = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        homeLp.topMargin = dp(8);
        homeBtn.setLayoutParams(homeLp);
        homeBtn.setOnClickListener(v -> {
            removeOverlay();
            Intent home = new Intent(Intent.ACTION_MAIN);
            home.addCategory(Intent.CATEGORY_HOME);
            home.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(home);
        });
        root.addView(homeBtn);

        return root;
    }

    private String resolveAppName(String packageName) {
        try {
            android.content.pm.PackageManager pm = getPackageManager();
            android.content.pm.ApplicationInfo ai = pm.getApplicationInfo(packageName, 0);
            return pm.getApplicationLabel(ai).toString();
        } catch (Exception e) {
            return "This app";
        }
    }

    private int dp(int value) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value,
                getResources().getDisplayMetrics());
    }

    // ─────────────────────────────────────────────────────────────
    //  RESTART WATCHDOG (survive swipe-from-recents kill)
    // ─────────────────────────────────────────────────────────────

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // User swiped Reforge from recents. If the shield is enabled, schedule a quick
        // alarm to restart the service after the process is torn down.
        if (isShieldEnabled(this)) {
            scheduleRestart(this);
        }
        super.onTaskRemoved(rootIntent);
    }

    public static void scheduleRestart(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, BootReceiver.class);
            intent.setAction(BootReceiver.ACTION_RESTART_SHIELD);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pi = PendingIntent.getBroadcast(context, RESTART_ALARM_REQUEST, intent, flags);
            long triggerAt = System.currentTimeMillis() + 1500;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule shield restart", e);
        }
    }

    public static boolean isShieldEnabled(Context context) {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .getBoolean(KEY_SHIELD_ENABLED, false);
    }

    public static void setShieldEnabled(Context context, boolean enabled) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putBoolean(KEY_SHIELD_ENABLED, enabled).apply();
    }

    /** Explicit user stop: clears the enabled flag so it never auto-restarts. */
    private void stopShieldInternal() {
        setShieldEnabled(this, false);
        teardownResources();
        Log.i(TAG, "Focus Shield Service stopped by user.");
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    /** Releases runtime resources WITHOUT touching the persisted enabled flag. */
    private void teardownResources() {
        isRunning = false;
        monitorRunning = false;
        if (monitorThread != null) {
            monitorThread.interrupt();
            monitorThread = null;
        }
        removeOverlay();
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
        // The system is tearing us down (low memory, OEM kill, etc.). Release runtime
        // resources but DO NOT clear the enabled flag — if the user still wants the
        // shield active, schedule a restart so monitoring resumes shortly.
        teardownResources();
        if (isShieldEnabled(this)) {
            scheduleRestart(this);
        }
        super.onDestroy();
    }
}
