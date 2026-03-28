package com.reforge.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Android Foreground Service for background quest tracking.
 *
 * Two modes:
 *  - TIME_ONLY: Counts active minutes. Minimal battery.
 *  - FULL: Counts steps (hardware sensor), GPS distance, and active minutes.
 *
 * Saves data to SharedPreferences every update so the WebView can read it.
 * Shows a persistent notification with live progress.
 */
public class TrackingService extends Service implements StepCounterHelper.StepListener {
    private static final String TAG = "TrackingService";
    private static final String CHANNEL_ID = "reforge_tracking";
    private static final int NOTIFICATION_ID = 9001;
    private static final String PREFS_NAME = "reforge_tracking_data";

    // Intent action constants
    public static final String ACTION_START = "com.reforge.app.ACTION_START_TRACKING";
    public static final String ACTION_STOP = "com.reforge.app.ACTION_STOP_TRACKING";

    // Tracking state
    private boolean isRunning = false;
    private String mode = "TIME_ONLY"; // "TIME_ONLY" or "FULL"
    private String questId = "";

    // Sensor helpers
    private StepCounterHelper stepCounter;
    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;

    // Tracking data
    private int stepsRecorded = 0;
    private double distanceRecordedKm = 0;
    private int activeMinutesRecorded = 0;
    private double maxSpeedKmh = 0;
    private long startedAt = 0;
    private long lastUpdate = 0;

    // GPS state
    private Location lastLocation = null;

    // Timer for active minutes
    private Thread minuteTimerThread;
    private volatile boolean minuteTimerRunning = false;

    // Requirements (for notification display)
    private int reqSteps = 0;
    private double reqDistanceKm = 0;
    private int reqActiveMinutes = 0;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        stepCounter = new StepCounterHelper(this);
        stepCounter.setListener(this);
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_NOT_STICKY;

        String action = intent.getAction();
        if (ACTION_STOP.equals(action)) {
            stopTrackingInternal();
            return START_NOT_STICKY;
        }

        if (ACTION_START.equals(action) && !isRunning) {
            mode = intent.getStringExtra("mode");
            if (mode == null) mode = "TIME_ONLY";
            questId = intent.getStringExtra("questId");
            if (questId == null) questId = "unknown";

            // Carry-over data from previous session
            stepsRecorded = intent.getIntExtra("carrySteps", 0);
            distanceRecordedKm = intent.getDoubleExtra("carryDistance", 0);
            activeMinutesRecorded = intent.getIntExtra("carryMinutes", 0);
            maxSpeedKmh = intent.getDoubleExtra("carryMaxSpeed", 0);

            // Requirements for notification
            reqSteps = intent.getIntExtra("reqSteps", 0);
            reqDistanceKm = intent.getDoubleExtra("reqDistanceKm", 0);
            reqActiveMinutes = intent.getIntExtra("reqActiveMinutes", 0);

            startedAt = intent.getLongExtra("startedAt", System.currentTimeMillis());
            lastUpdate = System.currentTimeMillis();
            isRunning = true;

            // Start as foreground service
            Notification notification = buildNotification();
            startForeground(NOTIFICATION_ID, notification);

            // Start sensors based on mode
            if ("FULL".equals(mode)) {
                startStepCounter();
                startLocationTracking();
            }
            startMinuteTimer();

            saveSnapshot();
            Log.i(TAG, "Tracking started — mode=" + mode + " quest=" + questId);
        }

        return START_STICKY;
    }

    private void startStepCounter() {
        if (stepCounter.isAvailable()) {
            stepCounter.start(stepsRecorded);
        } else {
            Log.w(TAG, "Hardware step counter not available");
        }
    }

    private void startLocationTracking() {
        try {
            LocationRequest locationRequest = new LocationRequest.Builder(
                    Priority.PRIORITY_HIGH_ACCURACY, 5000) // 5s interval
                    .setMinUpdateDistanceMeters(10f) // 10m displacement filter
                    .setWaitForAccurateLocation(true)
                    .build();

            locationCallback = new LocationCallback() {
                @Override
                public void onLocationResult(LocationResult result) {
                    if (!isRunning || result == null) return;
                    Location location = result.getLastLocation();
                    if (location == null) return;
                    processLocation(location);
                }
            };

            fusedLocationClient.requestLocationUpdates(
                    locationRequest, locationCallback, Looper.getMainLooper());
            Log.i(TAG, "GPS tracking started with 10m displacement filter");
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission not granted", e);
        }
    }

    private void processLocation(Location location) {
        // Filter: reject bad accuracy (>30m)
        if (location.getAccuracy() > 30) {
            Log.d(TAG, "Rejected location — accuracy " + location.getAccuracy() + "m");
            return;
        }

        double speedKmh = 0;
        if (location.hasSpeed()) {
            speedKmh = location.getSpeed() * 3.6; // m/s to km/h
        }

        // Track max speed
        if (speedKmh > maxSpeedKmh) {
            maxSpeedKmh = speedKmh;
        }

        if (lastLocation != null) {
            float distanceM = lastLocation.distanceTo(location);
            double distanceKm = distanceM / 1000.0;

            // Filter: ignore GPS jitter (<10m) and teleports (>500m)
            if (distanceM >= 10 && distanceM < 500) {
                // Filter: ignore movement when speed < 0.5 m/s (standing still drift)
                if (location.hasSpeed() && location.getSpeed() < 0.5f) {
                    Log.d(TAG, "Ignored drift — speed " + location.getSpeed() + " m/s");
                } else {
                    distanceRecordedKm += distanceKm;
                }
            }
        }

        lastLocation = location;
        lastUpdate = System.currentTimeMillis();
        saveSnapshot();
        updateNotification();
    }

    @Override
    public void onStepUpdate(int totalSessionSteps) {
        stepsRecorded = totalSessionSteps;
        lastUpdate = System.currentTimeMillis();
        // Save less frequently for steps (every 10 steps) to reduce I/O
        if (stepsRecorded % 10 == 0) {
            saveSnapshot();
            updateNotification();
        }
    }

    private void startMinuteTimer() {
        minuteTimerRunning = true;
        minuteTimerThread = new Thread(() -> {
            while (minuteTimerRunning && isRunning) {
                try {
                    Thread.sleep(60_000); // 1 minute
                    if (isRunning) {
                        activeMinutesRecorded++;
                        lastUpdate = System.currentTimeMillis();
                        saveSnapshot();
                        updateNotification();
                    }
                } catch (InterruptedException e) {
                    break;
                }
            }
        });
        minuteTimerThread.setDaemon(true);
        minuteTimerThread.start();
    }

    private void stopTrackingInternal() {
        isRunning = false;
        minuteTimerRunning = false;

        if (stepCounter != null) {
            stepCounter.stop();
        }

        if (locationCallback != null && fusedLocationClient != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
        }

        if (minuteTimerThread != null) {
            minuteTimerThread.interrupt();
        }

        saveSnapshot();
        Log.i(TAG, "Tracking stopped. Steps=" + stepsRecorded +
                " Distance=" + String.format("%.3f", distanceRecordedKm) + "km" +
                " Minutes=" + activeMinutesRecorded);

        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    // ─── Persistence ───────────────────────────────────────────

    private void saveSnapshot() {
        SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putString("questId", questId)
                .putString("mode", mode)
                .putInt("stepsRecorded", stepsRecorded)
                .putFloat("distanceRecordedKm", (float) distanceRecordedKm)
                .putInt("activeMinutesRecorded", activeMinutesRecorded)
                .putFloat("maxSpeedKmh", (float) maxSpeedKmh)
                .putLong("startedAt", startedAt)
                .putLong("lastUpdate", lastUpdate)
                .putBoolean("isRunning", isRunning)
                .apply();
    }

    public static JSONObject readSnapshot(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        JSONObject obj = new JSONObject();
        try {
            obj.put("questId", prefs.getString("questId", ""));
            obj.put("mode", prefs.getString("mode", "TIME_ONLY"));
            obj.put("stepsRecorded", prefs.getInt("stepsRecorded", 0));
            obj.put("distanceRecorded", prefs.getFloat("distanceRecordedKm", 0));
            obj.put("activeMinutesRecorded", prefs.getInt("activeMinutesRecorded", 0));
            obj.put("maxSpeedKmh", prefs.getFloat("maxSpeedKmh", 0));
            obj.put("startedAt", prefs.getLong("startedAt", 0));
            obj.put("lastUpdate", prefs.getLong("lastUpdate", 0));
            obj.put("isRunning", prefs.getBoolean("isRunning", false));
            obj.put("locationPath", new JSONArray()); // Path stored separately if needed
        } catch (JSONException e) {
            Log.e(TAG, "Error building snapshot JSON", e);
        }
        return obj;
    }

    public static void clearSnapshot(Context context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().clear().apply();
    }

    // ─── Notification ──────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Quest Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Shows progress during active quest tracking");
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

        String title = "FULL".equals(mode)
                ? "🏃 REFORGE — Tracking Quest"
                : "⏱ REFORGE — Quest Active";

        String text = buildProgressText();

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .build();
    }

    private String buildProgressText() {
        StringBuilder sb = new StringBuilder();

        if ("FULL".equals(mode)) {
            if (reqSteps > 0) {
                sb.append(stepsRecorded).append("/").append(reqSteps).append(" steps");
            }
            if (reqDistanceKm > 0) {
                if (sb.length() > 0) sb.append(" • ");
                sb.append(String.format("%.1f", distanceRecordedKm))
                        .append("/").append(String.format("%.1f", reqDistanceKm)).append(" km");
            }
        }

        if (reqActiveMinutes > 0) {
            if (sb.length() > 0) sb.append(" • ");
            sb.append(activeMinutesRecorded).append("/")
                    .append(reqActiveMinutes).append(" min");
        }

        if (sb.length() == 0) {
            sb.append(activeMinutesRecorded).append(" min active");
        }

        return sb.toString();
    }

    private void updateNotification() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification());
        }
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
            stopTrackingInternal();
        }
    }
}
