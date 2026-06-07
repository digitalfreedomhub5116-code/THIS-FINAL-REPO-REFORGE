package com.reforge.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * Restarts the Focus Shield foreground service after:
 *   1. Device reboot (BOOT_COMPLETED / QUICKBOOT_POWERON).
 *   2. The restart watchdog alarm scheduled in FocusShieldService.onTaskRemoved
 *      (i.e. the user swiped Reforge away from recents).
 *
 * The service is only restarted when the user actually had the shield enabled,
 * tracked via FocusShieldService.isShieldEnabled().
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    public static final String ACTION_RESTART_SHIELD = "com.reforge.app.ACTION_RESTART_SHIELD_WATCHDOG";
    private static final String ACTION_QUICKBOOT = "android.intent.action.QUICKBOOT_POWERON";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        Log.i(TAG, "Received broadcast: " + action);

        boolean isBoot = Intent.ACTION_BOOT_COMPLETED.equals(action)
                || ACTION_QUICKBOOT.equals(action);
        boolean isRestart = ACTION_RESTART_SHIELD.equals(action);

        if (!isBoot && !isRestart) {
            return;
        }

        if (!FocusShieldService.isShieldEnabled(context)) {
            Log.i(TAG, "Shield disabled by user. Not restarting.");
            return;
        }

        try {
            Intent serviceIntent = new Intent(context, FocusShieldService.class);
            serviceIntent.setAction(FocusShieldService.ACTION_RESTART);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.i(TAG, "Focus Shield service restart requested.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to restart Focus Shield service", e);
        }
    }
}
