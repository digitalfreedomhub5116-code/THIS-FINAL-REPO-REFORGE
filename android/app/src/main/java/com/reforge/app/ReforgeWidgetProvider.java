package com.reforge.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.RemoteViews;

/**
 * Android Home Screen Widget Provider.
 * Fetches stats from 'CapacitorStorage' SharedPreferences and updates the status frame layout.
 */
public class ReforgeWidgetProvider extends AppWidgetProvider {
    private static final String TAG = "ReforgeWidgetProvider";
    public static final String ACTION_FORCE_UPDATE = "com.reforge.app.ACTION_FORCE_UPDATE";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_FORCE_UPDATE.equals(intent.getAction()) || Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            AppWidgetManager mgr = AppWidgetManager.getInstance(context);
            int[] ids = mgr.getAppWidgetIds(new ComponentName(context, ReforgeWidgetProvider.class));
            onUpdate(context, mgr, ids);
            Log.d(TAG, "Forced widget update broadcast handled for " + ids.length + " widgets");
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.reforge_widget);

        // Fetch values from Capacitor Preferences Storage (default file name is 'CapacitorStorage')
        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);

        String lvl = prefs.getString("widget_level", "1");
        String streak = prefs.getString("widget_streak", "0");
        String curXpStr = prefs.getString("widget_currentXp", "0");
        String reqXpStr = prefs.getString("widget_requiredXp", "100");

        String str = prefs.getString("widget_strength", "0");
        String intel = prefs.getString("widget_intelligence", "0");
        String disc = prefs.getString("widget_discipline", "0");
        String soc = prefs.getString("widget_social", "0");
        String foc = prefs.getString("widget_focus", "0");
        String wil = prefs.getString("widget_willpower", "0");

        // Format numerical display readouts
        double curXp = 0;
        double reqXp = 100;
        try {
            curXp = Double.parseDouble(curXpStr);
            reqXp = Double.parseDouble(reqXpStr);
        } catch (NumberFormatException e) {
            Log.e(TAG, "Error parsing XP bounds", e);
        }

        int xpProgress = (int) Math.min(100, Math.max(0, (curXp / reqXp) * 100));

        // Update Text Fields
        views.setTextViewText(R.id.widget_level_num, lvl);
        views.setTextViewText(R.id.widget_streak_num, streak);
        views.setTextViewText(R.id.widget_xp_text, String.format("%,d / %,d", (int) curXp, (int) reqXp));
        views.setProgressBar(R.id.widget_xp_progress, 100, xpProgress, false);

        views.setTextViewText(R.id.widget_stat_str, str);
        views.setTextViewText(R.id.widget_stat_int, intel);
        views.setTextViewText(R.id.widget_stat_dis, disc);
        views.setTextViewText(R.id.widget_stat_soc, soc);
        views.setTextViewText(R.id.widget_stat_foc, foc);
        views.setTextViewText(R.id.widget_stat_wil, wil);

        // Click Intent to launch MainActivity and bring Reforge to the foreground
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root, pendingIntent);

        // Update active widget layout instance
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
