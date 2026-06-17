package com.reforge.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Capacitor Plugin that bridges JavaScript ↔ TrackingService.
 *
 * JavaScript API:
 *   TrackingPlugin.ensurePermissions() → requests ACTIVITY_RECOGNITION + FINE_LOCATION at runtime
 *   TrackingPlugin.start({ questId, mode, reqSteps, reqDistanceKm, reqActiveMinutes, carrySteps, carryDistance, carryMinutes, carryMaxSpeed, startedAt })
 *   TrackingPlugin.stop()          → returns final snapshot
 *   TrackingPlugin.getSnapshot()   → returns current tracking data
 *   TrackingPlugin.isRunning()     → { running: boolean }
 *   TrackingPlugin.clear()         → clears persisted data
 */
@CapacitorPlugin(
    name = "TrackingPlugin",
    permissions = {
        @Permission(
            alias = "location",
            strings = { "android.permission.ACCESS_FINE_LOCATION" }
        ),
        @Permission(
            alias = "activity",
            strings = { "android.permission.ACTIVITY_RECOGNITION" }
        )
    }
)
public class TrackingPlugin extends Plugin {
    private static final String TAG = "TrackingPlugin";

    @PluginMethod()
    public void ensurePermissions(PluginCall call) {
        // On Android < 10, ACTIVITY_RECOGNITION doesn't exist as a runtime permission
        boolean locationOk = "granted".equals(getPermissionState("location"));
        boolean activityOk = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                || "granted".equals(getPermissionState("activity"));

        if (locationOk && activityOk) {
            Log.i(TAG, "All permissions already granted");
            JSObject result = new JSObject();
            result.put("location", true);
            result.put("activity", true);
            call.resolve(result);
            return;
        }

        Log.i(TAG, "Requesting missing permissions — location=" + locationOk + " activity=" + activityOk);
        requestAllPermissions(call, "permissionsCallback");
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        boolean locationGranted = "granted".equals(getPermissionState("location"));
        boolean activityGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                || "granted".equals(getPermissionState("activity"));

        Log.i(TAG, "Permissions result — location=" + locationGranted + " activity=" + activityGranted);

        JSObject result = new JSObject();
        result.put("location", locationGranted);
        result.put("activity", activityGranted);
        call.resolve(result);
    }

    @PluginMethod()
    public void start(PluginCall call) {
        Context context = getContext();
        String questId = call.getString("questId", "unknown");
        String mode = call.getString("mode", "TIME_ONLY");

        // ── Pre-flight check: the service is declared with foregroundServiceType="location"
        //    and Android 14+ hard-enforces that startForeground() can ONLY be called when
        //    the matching runtime permission is granted. If we let the service start
        //    without the permission, startForeground() throws SecurityException and the
        //    5-second foreground-deadline still fires, killing the entire app process.
        //    Refuse cleanly here so JS can fall back to the in-WebView Geolocation API. ──
        if ("FULL".equals(mode)) {
            boolean hasLocation = "granted".equals(getPermissionState("location"));
            if (!hasLocation) {
                Log.w(TAG, "start refused — FULL mode requires ACCESS_FINE_LOCATION at runtime");
                call.resolve(new JSObject().put("started", false).put("reason", "missing_location_permission"));
                return;
            }
        }

        Intent intent = new Intent(context, TrackingService.class);
        intent.setAction(TrackingService.ACTION_START);
        intent.putExtra("questId", questId);
        intent.putExtra("mode", mode);
        intent.putExtra("carrySteps", call.getInt("carrySteps", 0));
        intent.putExtra("carryDistance", call.getDouble("carryDistance", 0.0));
        intent.putExtra("carryMinutes", call.getInt("carryMinutes", 0));
        intent.putExtra("carryMaxSpeed", call.getDouble("carryMaxSpeed", 0.0));
        intent.putExtra("startedAt", call.getLong("startedAt", System.currentTimeMillis()));
        intent.putExtra("reqSteps", call.getInt("reqSteps", 0));
        intent.putExtra("reqDistanceKm", call.getDouble("reqDistanceKm", 0.0));
        intent.putExtra("reqActiveMinutes", call.getInt("reqActiveMinutes", 0));

        // Android 8+ requires startForegroundService and the service MUST call
        // startForeground() within 5s. Android 12+ additionally throws
        // ForegroundServiceStartNotAllowedException if we try to start while the
        // app is fully backgrounded — we catch that and resolve cleanly so the
        // WebView fallback can take over instead of crashing the process.
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "Start tracking requested — quest=" + questId + " mode=" + mode);
            call.resolve(new JSObject().put("started", true));
        } catch (Exception e) {
            // ForegroundServiceStartNotAllowedException, IllegalStateException,
            // or any subclass thereof. We don't crash; we tell JS that native
            // start failed so it can decide to fall back to the in-WebView
            // location/motion APIs.
            Log.w(TAG, "Start tracking refused by OS — falling back to WebView path", e);
            call.resolve(new JSObject().put("started", false).put("reason", "os_refused"));
        }
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, TrackingService.class);
        intent.setAction(TrackingService.ACTION_STOP);

        // IMPORTANT: use plain startService for ACTION_STOP, NOT startForegroundService.
        //
        // startForegroundService() requires the service to call startForeground()
        // within 5 seconds. Our STOP path immediately stops the service instead,
        // which trips android.app.RemoteServiceException$ForegroundServiceDidNotStartInTimeException
        // and force-kills the entire app.
        //
        // startService() is allowed for an already-running service (which is what
        // STOP targets), and Android does not impose the 5-second foreground rule.
        // This path falls through to TrackingService.onStartCommand → ACTION_STOP
        // → stopTrackingInternal() → stopForeground() → stopSelf(), which is the
        // intended sequence.
        try {
            context.startService(intent);
        } catch (IllegalStateException e) {
            // Service was already stopped or background-restricted on Android 12+.
            // The snapshot below is still valid because the WebView keeps its own
            // copy in localStorage, so we just log and proceed.
            Log.w(TAG, "stop: service start refused (already stopped or background-restricted)", e);
        }

        // Return the final snapshot
        JSONObject snapshot = TrackingService.readSnapshot(context);
        JSObject result = new JSObject();
        try {
            result.put("stepsRecorded", snapshot.getInt("stepsRecorded"));
            result.put("distanceRecorded", snapshot.getDouble("distanceRecorded"));
            result.put("activeMinutesRecorded", snapshot.getInt("activeMinutesRecorded"));
            result.put("maxSpeedKmh", snapshot.getDouble("maxSpeedKmh"));
            result.put("startedAt", snapshot.getLong("startedAt"));
            result.put("lastUpdate", snapshot.getLong("lastUpdate"));
            result.put("questId", snapshot.getString("questId"));
        } catch (Exception e) {
            Log.e(TAG, "Error reading snapshot", e);
        }

        Log.i(TAG, "Stop tracking requested");
        call.resolve(result);
    }

    @PluginMethod()
    public void getSnapshot(PluginCall call) {
        Context context = getContext();
        JSONObject snapshot = TrackingService.readSnapshot(context);
        JSObject result = new JSObject();
        try {
            result.put("stepsRecorded", snapshot.getInt("stepsRecorded"));
            result.put("distanceRecorded", snapshot.getDouble("distanceRecorded"));
            result.put("activeMinutesRecorded", snapshot.getInt("activeMinutesRecorded"));
            result.put("maxSpeedKmh", snapshot.getDouble("maxSpeedKmh"));
            result.put("startedAt", snapshot.getLong("startedAt"));
            result.put("lastUpdate", snapshot.getLong("lastUpdate"));
            result.put("questId", snapshot.getString("questId"));
            result.put("isRunning", snapshot.getBoolean("isRunning"));
            result.put("locationPath", snapshot.getJSONArray("locationPath"));
        } catch (Exception e) {
            Log.e(TAG, "Error reading snapshot", e);
        }
        call.resolve(result);
    }

    @PluginMethod()
    public void isRunning(PluginCall call) {
        Context context = getContext();
        JSONObject snapshot = TrackingService.readSnapshot(context);
        boolean running = false;
        try {
            running = snapshot.getBoolean("isRunning");
        } catch (Exception e) {
            // default false
        }
        call.resolve(new JSObject().put("running", running));
    }

    @PluginMethod()
    public void clear(PluginCall call) {
        TrackingService.clearSnapshot(getContext());
        call.resolve(new JSObject().put("cleared", true));
    }

    @PluginMethod()
    public void checkFocusShieldPermissions(PluginCall call) {
        boolean usageGranted = FocusShieldService.hasUsageStatsPermission(getContext());
        boolean overlayGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            overlayGranted = Settings.canDrawOverlays(getContext());
        }
        JSObject res = new JSObject();
        res.put("usageGranted", usageGranted);
        res.put("overlayGranted", overlayGranted);
        call.resolve(res);
    }

    @PluginMethod()
    public void requestUsagePermission(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod()
    public void requestOverlayPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, 
                Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod()
    public void startFocusShield(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FocusShieldService.class);
        intent.setAction(FocusShieldService.ACTION_START);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            call.resolve(new JSObject().put("started", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to start FocusShieldService", e);
            call.resolve(new JSObject().put("started", false).put("reason", e.getMessage()));
        }
    }

    @PluginMethod()
    public void stopFocusShield(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, FocusShieldService.class);
        intent.setAction(FocusShieldService.ACTION_STOP);
        try {
            context.startService(intent);
            call.resolve(new JSObject().put("stopped", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to stop FocusShieldService", e);
            call.resolve(new JSObject().put("stopped", false).put("reason", e.getMessage()));
        }
    }

    @PluginMethod()
    public void updateFocusShieldConfig(PluginCall call) {
        JSObject apps = call.getObject("lockedApps");
        if (apps != null) {
            SharedPreferences prefs = getContext().getSharedPreferences("reforge_focus_shield_prefs", Context.MODE_PRIVATE);
            prefs.edit().putString("locked_apps", apps.toString()).apply();
            call.resolve(new JSObject().put("success", true));
        } else {
            call.reject("lockedApps object is required");
        }
    }

    @PluginMethod()
    public void grantBypass(PluginCall call) {
        String pkg = call.getString("packageName");
        int mins = call.getInt("durationMinutes", 15);
        if (pkg != null) {
            SharedPreferences prefs = getContext().getSharedPreferences("reforge_focus_shield_prefs", Context.MODE_PRIVATE);
            String bypassJsonStr = prefs.getString("bypass_timestamps", "{}");
            try {
                JSONObject bypassObj = bypassJsonStr.isEmpty() ? new JSONObject() : new JSONObject(bypassJsonStr);
                long expiry = System.currentTimeMillis() + ((long) mins * 60 * 1000);
                bypassObj.put(pkg, expiry);
                prefs.edit().putString("bypass_timestamps", bypassObj.toString()).apply();
                call.resolve(new JSObject().put("success", true));
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        } else {
            call.reject("packageName is required");
        }
    }

    @PluginMethod()
    public void minimizeApp(PluginCall call) {
        Intent startMain = new Intent(Intent.ACTION_MAIN);
        startMain.addCategory(Intent.CATEGORY_HOME);
        startMain.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(startMain);
        call.resolve();
    }

    @PluginMethod()
    public void getActiveLockdown(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("reforge_focus_shield_prefs", Context.MODE_PRIVATE);
        boolean active = prefs.getBoolean("active_lockdown", false);
        String pkg = prefs.getString("lockdown_package", "");
        JSObject res = new JSObject();
        res.put("active", active);
        res.put("packageName", pkg);
        call.resolve(res);
    }

    @PluginMethod()
    public void clearActiveLockdown(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("reforge_focus_shield_prefs", Context.MODE_PRIVATE);
        prefs.edit()
            .putBoolean("active_lockdown", false)
            .putString("lockdown_package", "")
            .apply();
        call.resolve();
    }

    public void notifyFocusShieldLockdown(String packageName) {
        JSObject data = new JSObject();
        data.put("lockdown", true);
        data.put("packageName", packageName);
        notifyListeners("focusShieldLockdown", data);
    }

    @PluginMethod()
    public void getInstalledApps(PluginCall call) {
        try {
            PackageManager pm = getContext().getPackageManager();
            Intent intent = new Intent(Intent.ACTION_MAIN, null);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> list = pm.queryIntentActivities(intent, 0);

            // Polish: sort apps alphabetically by name
            Collections.sort(list, new Comparator<ResolveInfo>() {
                @Override
                public int compare(ResolveInfo o1, ResolveInfo o2) {
                    String name1 = o1.loadLabel(pm).toString();
                    String name2 = o2.loadLabel(pm).toString();
                    return name1.compareToIgnoreCase(name2);
                }
            });

            JSArray appsArray = new JSArray();
            String ourPkg = getContext().getPackageName();

            for (ResolveInfo info : list) {
                String appName = info.loadLabel(pm).toString();
                String pkgName = info.activityInfo.packageName;
                
                // Avoid monitoring our own app
                if (pkgName.equals(ourPkg)) {
                    continue;
                }

                JSObject appObj = new JSObject();
                appObj.put("appName", appName);
                appObj.put("packageName", pkgName);
                appsArray.put(appObj);
            }

            JSObject res = new JSObject();
            res.put("apps", appsArray);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error listing installed apps", e);
            call.reject("Failed to get installed apps: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void getAppUsageStats(PluginCall call) {
        try {
            Context context = getContext();

            // Check usage stats permission first
            if (!FocusShieldService.hasUsageStatsPermission(context)) {
                call.resolve(new JSObject().put("permitted", false).put("apps", new JSArray()));
                return;
            }

            android.app.usage.UsageStatsManager usm =
                (android.app.usage.UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);

            // Query usage since midnight today
            java.util.Calendar calendar = java.util.Calendar.getInstance();
            calendar.set(java.util.Calendar.HOUR_OF_DAY, 0);
            calendar.set(java.util.Calendar.MINUTE, 0);
            calendar.set(java.util.Calendar.SECOND, 0);
            calendar.set(java.util.Calendar.MILLISECOND, 0);
            long startTime = calendar.getTimeInMillis();
            long endTime = System.currentTimeMillis();

            java.util.Map<String, android.app.usage.UsageStats> stats =
                usm.queryAndAggregateUsageStats(startTime, endTime);

            // Build a map of packageName -> usage minutes
            java.util.Map<String, Long> usageMap = new java.util.HashMap<>();
            if (stats != null) {
                for (java.util.Map.Entry<String, android.app.usage.UsageStats> entry : stats.entrySet()) {
                    long ms = entry.getValue().getTotalTimeInForeground();
                    if (ms > 0) {
                        usageMap.put(entry.getKey(), ms / (1000 * 60));
                    }
                }
            }

            // Merge with installed launchable apps to get app names
            PackageManager pm = context.getPackageManager();
            Intent intent = new Intent(Intent.ACTION_MAIN, null);
            intent.addCategory(Intent.CATEGORY_LAUNCHER);
            List<ResolveInfo> launchable = pm.queryIntentActivities(intent, 0);

            JSArray appsArray = new JSArray();
            String ourPkg = context.getPackageName();

            for (ResolveInfo info : launchable) {
                String pkgName = info.activityInfo.packageName;
                if (pkgName.equals(ourPkg)) continue;

                Long minutes = usageMap.get(pkgName);
                if (minutes != null && minutes > 0) {
                    JSObject appObj = new JSObject();
                    appObj.put("packageName", pkgName);
                    appObj.put("appName", info.loadLabel(pm).toString());
                    appObj.put("usageMinutes", minutes);
                    appsArray.put(appObj);
                }
            }

            JSObject res = new JSObject();
            res.put("permitted", true);
            res.put("apps", appsArray);
            call.resolve(res);
        } catch (Exception e) {
            Log.e(TAG, "Error getting app usage stats", e);
            call.reject("Failed to get usage stats: " + e.getMessage());
        }
    }

    @PluginMethod()
    public void updateWidget(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, ReforgeWidgetProvider.class);
        intent.setAction(ReforgeWidgetProvider.ACTION_FORCE_UPDATE);
        context.sendBroadcast(intent);
        call.resolve();
    }

    // ─────────────────────────────────────────────────────────────
    //  BATTERY OPTIMIZATION / AUTO-START (keep the shield alive in background)
    // ─────────────────────────────────────────────────────────────

    @PluginMethod()
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        boolean ignoring = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            ignoring = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        call.resolve(new JSObject().put("ignoring", ignoring));
    }

    @PluginMethod()
    public void requestDisableBatteryOptimization(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }
            call.resolve(new JSObject().put("requested", true));
        } catch (Exception e) {
            Log.e(TAG, "Failed to request battery optimization exemption", e);
            // Fall back to the general battery optimization settings list.
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            } catch (Exception ignored) {}
            call.resolve(new JSObject().put("requested", false).put("reason", e.getMessage()));
        }
    }

    @PluginMethod()
    public void openAutoStartSettings(PluginCall call) {
        // Best-effort: open the OEM-specific auto-start / background-permission screen.
        // These component names are undocumented and vary by vendor, so we try several
        // and gracefully fall back to the app's system settings page.
        String[][] components = new String[][] {
            {"com.miui.securitycenter", "com.miui.permcenter.autostart.AutoStartManagementActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.permission.startup.StartupAppListActivity"},
            {"com.coloros.safecenter", "com.coloros.safecenter.startupapp.StartupAppListActivity"},
            {"com.oppo.safe", "com.oppo.safe.permission.startup.StartupAppListActivity"},
            {"com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.BgStartUpManagerActivity"},
            {"com.iqoo.secure", "com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity"},
            {"com.huawei.systemmanager", "com.huawei.systemmanager.optimize.process.ProtectActivity"},
            {"com.samsung.android.lool", "com.samsung.android.sm.ui.battery.BatteryActivity"}
        };

        for (String[] c : components) {
            try {
                Intent intent = new Intent();
                intent.setClassName(c[0], c[1]);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve(new JSObject().put("opened", true).put("vendor", c[0]));
                return;
            } catch (Exception ignored) {
                // try the next candidate
            }
        }

        // Fallback: open this app's details settings so the user can adjust manually.
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(new JSObject().put("opened", false).put("fallback", true));
        } catch (Exception e) {
            call.resolve(new JSObject().put("opened", false).put("reason", e.getMessage()));
        }
    }
}
