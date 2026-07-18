# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# CAPACITOR KEEP RULES
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**

# ── Keep every Capacitor plugin (loaded by reflection at bridge startup) ──
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class * extends com.getcapacitor.Plugin { *; }

# ── Third-party Capacitor plugins (not under com.getcapacitor.*) ──
-keep class com.codetrixstudio.capacitor.GoogleAuth.** { *; }
-keep class io.capawesome.capacitorjs.plugins.** { *; }
-keep class com.revenuecat.purchases.** { *; }
-keep class com.getcapacitor.community.** { *; }
-dontwarn com.codetrixstudio.capacitor.GoogleAuth.**
-dontwarn io.capawesome.capacitorjs.plugins.**
-dontwarn com.revenuecat.purchases.**

# ── App's own native plugins/services/receivers (manifest + reflection) ──
-keep class com.reforge.app.** { *; }

# ── Google Play Core (in-app updates) + GMS tasks/ads/location ──
-keep class com.google.android.play.core.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.play.core.**
-dontwarn com.google.android.gms.**

# ── MediaPipe (AI form coach) ──
-keep class com.google.mediapipe.** { *; }
-dontwarn com.google.mediapipe.**

# ── Gson / annotations used by Capacitor plugin (de)serialization ──
-keepattributes Signature, *Annotation*, InnerClasses, EnclosingMethod
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# ── Keep JS-facing annotated members and native-bridge method names ──
-keepclassmembers class * {
    @com.getcapacitor.annotation.CapacitorPlugin *;
    @com.getcapacitor.PluginMethod public *;
}
