package com.reforge.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONObject;

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
            call.resolve(new JSObject().put("started", false));
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
}
