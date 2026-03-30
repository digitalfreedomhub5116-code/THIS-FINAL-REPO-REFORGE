package com.reforge.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.util.Log;

/**
 * Uses the hardware TYPE_STEP_COUNTER sensor for accurate step counting.
 * This sensor uses the device's dedicated sensor hub — extremely accurate
 * and battery-efficient. It provides a cumulative step count since the
 * last device reboot, so we store a baseline to compute steps for each session.
 */
public class StepCounterHelper implements SensorEventListener {
    private static final String TAG = "StepCounterHelper";

    private final SensorManager sensorManager;
    private final Sensor stepSensor;
    private boolean isTracking = false;

    // The hardware counter value when tracking was started
    private float baselineSteps = -1;
    // Total steps recorded this session
    private int sessionSteps = 0;
    // Steps carried over from a previous resume (e.g. app backgrounded and returned)
    private int carryOverSteps = 0;

    private StepListener listener;

    public interface StepListener {
        void onStepUpdate(int totalSessionSteps);
    }

    public StepCounterHelper(Context context) {
        sensorManager = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        stepSensor = sensorManager != null
                ? sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
                : null;

        if (stepSensor == null) {
            Log.w(TAG, "Hardware step counter sensor not available on this device");
        } else {
            Log.i(TAG, "Hardware step counter sensor: " + stepSensor.getName());
        }
    }

    public boolean isAvailable() {
        return stepSensor != null;
    }

    public void setListener(StepListener listener) {
        this.listener = listener;
    }

    /**
     * Start counting steps from zero.
     * @param initialSteps Steps to carry over from a previous session (e.g., resumed tracking)
     */
    public void start(int initialSteps) {
        if (stepSensor == null || isTracking) return;

        this.carryOverSteps = initialSteps;
        this.baselineSteps = -1; // Will be set on first sensor event
        this.sessionSteps = initialSteps;
        this.isTracking = true;

        // SENSOR_DELAY_FASTEST for most responsive step updates
        // The step counter sensor is very battery-efficient regardless of delay
        boolean registered = sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_FASTEST);
        if (!registered) {
            Log.e(TAG, "FAILED to register step counter — ACTIVITY_RECOGNITION permission likely denied. " +
                    "Go to Settings → Apps → REFORGE → Permissions → Physical Activity → Allow");
            isTracking = false;
            return;
        }
        Log.i(TAG, "Step counter started with " + initialSteps + " carry-over steps");
    }

    public void stop() {
        if (!isTracking) return;
        isTracking = false;
        sensorManager.unregisterListener(this);
        Log.i(TAG, "Step counter stopped. Total session steps: " + sessionSteps);
    }

    public int getSessionSteps() {
        return sessionSteps;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (!isTracking || event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        float currentHardwareSteps = event.values[0];

        // On the very first event, record the baseline
        if (baselineSteps < 0) {
            baselineSteps = currentHardwareSteps;
            Log.d(TAG, "Baseline set to " + baselineSteps);
            return;
        }

        // Compute steps taken since tracking started
        int newSteps = (int) (currentHardwareSteps - baselineSteps);
        if (newSteps < 0) {
            // Device rebooted — reset baseline
            baselineSteps = currentHardwareSteps;
            newSteps = 0;
        }

        sessionSteps = carryOverSteps + newSteps;

        if (listener != null) {
            listener.onStepUpdate(sessionSteps);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not needed for step counter
    }
}
