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

import org.json.JSONObject;

/**
 * Capacitor Plugin that bridges JavaScript ↔ TrackingService.
 *
 * JavaScript API:
 *   TrackingPlugin.start({ questId, mode, reqSteps, reqDistanceKm, reqActiveMinutes, carrySteps, carryDistance, carryMinutes, carryMaxSpeed, startedAt })
 *   TrackingPlugin.stop()          → returns final snapshot
 *   TrackingPlugin.getSnapshot()   → returns current tracking data
 *   TrackingPlugin.isRunning()     → { running: boolean }
 *   TrackingPlugin.clear()         → clears persisted data
 */
@CapacitorPlugin(name = "TrackingPlugin")
public class TrackingPlugin extends Plugin {
    private static final String TAG = "TrackingPlugin";

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

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
        }

        Log.i(TAG, "Start tracking requested — quest=" + questId + " mode=" + mode);
        call.resolve(new JSObject().put("started", true));
    }

    @PluginMethod()
    public void stop(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(context, TrackingService.class);
        intent.setAction(TrackingService.ACTION_STOP);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(intent);
        } else {
            context.startService(intent);
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
