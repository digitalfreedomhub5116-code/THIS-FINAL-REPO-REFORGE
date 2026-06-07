import { useState, useRef, useCallback, useEffect } from 'react';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';
import { Capacitor, registerPlugin } from '@capacitor/core';

// ─── Native Plugin Interface ──────────────────────────────────────────────────

interface TrackingPluginInterface {
  start(options: {
    questId: string;
    mode: string;
    reqSteps?: number;
    reqDistanceKm?: number;
    reqActiveMinutes?: number;
    carrySteps?: number;
    carryDistance?: number;
    carryMinutes?: number;
    carryMaxSpeed?: number;
    startedAt?: number;
  }): Promise<{ started: boolean }>;
  stop(): Promise<{
    stepsRecorded: number;
    distanceRecorded: number;
    activeMinutesRecorded: number;
    maxSpeedKmh: number;
    startedAt: number;
    lastUpdate: number;
    questId: string;
  }>;
  getSnapshot(): Promise<{
    stepsRecorded: number;
    distanceRecorded: number;
    activeMinutesRecorded: number;
    maxSpeedKmh: number;
    startedAt: number;
    lastUpdate: number;
    questId: string;
    isRunning: boolean;
    locationPath: any[];
  }>;
  isRunning(): Promise<{ running: boolean }>;
  clear(): Promise<{ cleared: boolean }>;
  ensurePermissions(): Promise<{ location: boolean; activity: boolean }>;
}

// Register the native plugin — only available on Android
const NativeTracking = Capacitor.isNativePlatform()
  ? registerPlugin<TrackingPluginInterface>('TrackingPlugin')
  : null;

const isNative = () => Capacitor.isNativePlatform() && NativeTracking !== null;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SensorRequirements {
  steps?: number;
  distanceKm?: number;
  activeMinutes?: number;
}

export interface SensorSnapshot {
  stepsRecorded: number;
  distanceRecorded: number;       // km
  activeMinutesRecorded: number;
  locationPath: [number, number][]; // [lat, lng] breadcrumbs
  maxSpeedKmh: number;
  startedAt: number;
  lastUpdate: number;
}

export interface SensorPermissions {
  location: boolean;
  motion: boolean;
}

interface StepState {
  lastMag: number;
  lastPeakTime: number;
  isStepping: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = 'reforge_sensor_';

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function loadSession(questId: string, userId: string): SensorSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId + '_' + questId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(questId: string, userId: string, data: SensorSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId + '_' + questId, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function clearSession(questId: string, userId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + userId + '_' + questId);
  } catch { /* ignore */ }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSensors(userId: string = 'local') {
  const [permissions, setPermissions] = useState<SensorPermissions>({ location: false, motion: false });
  const [tracking, setTracking] = useState(false);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SensorSnapshot | null>(null);

  const geoWatchId = useRef<string | null>(null);
  const motionListener = useRef<any>(null);
  const stepState = useRef<StepState>({ lastMag: 0, lastPeakTime: 0, isStepping: false });
  const snapshotRef = useRef<SensorSnapshot | null>(null);
  const activeMinutesTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativePollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Keep ref in sync
  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  // ─── Permission Requests ─────────────────────────────────────────────────

  const requestPermissions = useCallback(async (): Promise<SensorPermissions> => {
    let locationGranted = false;
    let motionGranted = false;

    try {
      const locPerm = await Geolocation.requestPermissions();
      locationGranted = locPerm.location === 'granted' || locPerm.coarseLocation === 'granted';
    } catch {
      locationGranted = false;
    }

    try {
      // Motion plugin doesn't have a formal permission API on web,
      // but on Android ACTIVITY_RECOGNITION is requested at runtime via the OS.
      // We trigger the permission dialog by registering a temporary listener,
      // then remove ONLY that handle (never call Motion.removeAllListeners()
      // globally — that would yank listeners owned by other useSensors callers).
      let probeHandle: any = null;
      try {
        probeHandle = await Motion.addListener('accel', () => {});
      } catch { probeHandle = null; }
      // Wait briefly for the OS dialog to settle, then drop our handle.
      await new Promise<void>((resolve) => setTimeout(resolve, 800));
      try {
        if (probeHandle && typeof probeHandle.remove === 'function') {
          await probeHandle.remove();
        }
      } catch { /* listener may already be gone */ }
      motionGranted = true;
    } catch {
      motionGranted = false;
    }

    const result = { location: locationGranted, motion: motionGranted };
    setPermissions(result);
    return result;
  }, []);

  const checkPermissions = useCallback(async (): Promise<SensorPermissions> => {
    let locationGranted = false;
    let motionGranted = false;
    try {
      const locPerm = await Geolocation.checkPermissions();
      locationGranted = locPerm.location === 'granted' || locPerm.coarseLocation === 'granted';
    } catch { /* ignore */ }
    // Motion doesn't have checkPermissions — assume granted if we got it before
    motionGranted = permissions.motion;
    const result = { location: locationGranted, motion: motionGranted };
    setPermissions(result);
    return result;
  }, [permissions.motion]);

  // ─── Start Tracking ──────────────────────────────────────────────────────

  const startTracking = useCallback(async (
    questId: string,
    requirements?: SensorRequirements,
    options?: { freshStart?: boolean }
  ): Promise<boolean> => {
    if (tracking) return false;

    // freshStart=true wipes any persisted snapshot for this questId so the
    // session starts at zero. Used by the dungeon run so leftover distance
    // from a previous session never bleeds into the new one.
    if (options?.freshStart) {
      clearSession(questId, userId);
    }

    // Try to resume an existing session
    const existing = options?.freshStart ? null : loadSession(questId, userId);
    const now = Date.now();
    const initial: SensorSnapshot = existing || {
      stepsRecorded: 0,
      distanceRecorded: 0,
      activeMinutesRecorded: 0,
      locationPath: [],
      maxSpeedKmh: 0,
      startedAt: now,
      lastUpdate: now,
    };

    setSnapshot(initial);
    snapshotRef.current = initial;
    setActiveQuestId(questId);
    setTracking(true);

    // ─── NATIVE PATH (Android Foreground Service) ───────────────────────
    if (isNative() && NativeTracking) {
      try {
        // Request ACTIVITY_RECOGNITION + FINE_LOCATION at runtime.
        // On Android 10+ ACTIVITY_RECOGNITION is a dangerous permission that
        // defaults to "denied" unless explicitly requested via a dialog.
        try {
          const nativePerms = await NativeTracking.ensurePermissions();
          console.log('[Sensors] Native permissions — location:', nativePerms.location, 'activity:', nativePerms.activity);
        } catch (permErr) {
          console.warn('[Sensors] ensurePermissions failed (non-fatal):', permErr);
        }

        // Determine mode: FULL if quest needs steps/distance, TIME_ONLY otherwise
        const needsFullTracking = !!(requirements?.steps || requirements?.distanceKm);
        const mode = needsFullTracking ? 'FULL' : 'TIME_ONLY';

        const startResp = await NativeTracking.start({
          questId,
          mode,
          reqSteps: requirements?.steps || 0,
          reqDistanceKm: requirements?.distanceKm || 0,
          reqActiveMinutes: requirements?.activeMinutes || 0,
          carrySteps: initial.stepsRecorded,
          carryDistance: initial.distanceRecorded,
          carryMinutes: initial.activeMinutesRecorded,
          carryMaxSpeed: initial.maxSpeedKmh,
          startedAt: initial.startedAt,
        });

        // Native plugin can refuse the start (Android 14+ missing FGS permission,
        // Android 12+ background restriction, etc). When that happens it returns
        // `started: false` instead of throwing — we honour that and fall back to
        // the WebView geolocation/motion path below.
        if (!startResp || (startResp as any).started === false) {
          console.warn('[Sensors] Native start refused — falling back to WebView path');
          // Fall through to the WebView fallback below — don't return early.
        } else {
          // Native succeeded — set up the polling loop and return.
          // Poll native service for updates every 3 seconds
          nativePollingTimer.current = setInterval(async () => {
          if (!isMounted.current || !NativeTracking) return;
          try {
            const snap = await NativeTracking.getSnapshot();
            // Compute elapsed minutes from startedAt as a fallback 
            // (native timer only increments after full 60s)
            const elapsedMs = Date.now() - (snap.startedAt || initial.startedAt);
            const elapsedMinutes = Math.floor(elapsedMs / 60_000);
            const nativeMinutes = snap.activeMinutesRecorded || 0;
            const updated: SensorSnapshot = {
              stepsRecorded: snap.stepsRecorded || 0,
              distanceRecorded: Math.round((snap.distanceRecorded || 0) * 1000) / 1000,
              activeMinutesRecorded: Math.max(nativeMinutes, elapsedMinutes),
              locationPath: [], // Native doesn't store full path in SharedPrefs
              maxSpeedKmh: Math.round((snap.maxSpeedKmh || 0) * 10) / 10,
              startedAt: snap.startedAt || initial.startedAt,
              lastUpdate: snap.lastUpdate || Date.now(),
            };
            setSnapshot(updated);
            snapshotRef.current = updated;
            saveSession(questId, userId, updated);
          } catch { /* ignore polling errors */ }
          }, 3000);

          console.log('[Sensors] Native tracking started — mode:', mode);
          return true;
        }
      } catch (e) {
        console.warn('[Sensors] Native tracking failed, falling back to web:', e);
        // Fall through to web-based tracking
      }
    }

    // ─── WEB FALLBACK PATH ──────────────────────────────────────────────

    // GPS watch
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        (pos: Position | null, err?: any) => {
          if (!pos || !isMounted.current) return;
          const { latitude, longitude, speed, accuracy } = pos.coords;
          const speedKmh = (speed ?? 0) * 3.6;

          setSnapshot(prev => {
            if (!prev) return prev;
            const path = [...prev.locationPath];
            let dist = prev.distanceRecorded;
            let maxSpd = prev.maxSpeedKmh;

            // Filter: reject bad accuracy (>30m)
            if (accuracy !== null && accuracy > 30) return prev;

            if (path.length > 0) {
              const [lastLat, lastLng] = path[path.length - 1];
              const segmentKm = haversineKm(lastLat, lastLng, latitude, longitude);
              // Improved filters: 10m min (was 3m), 500m max, speed > 0.5 m/s
              const segmentM = segmentKm * 1000;
              
              if (segmentM >= 10 && segmentM < 500) {
                // Ignore standing-still drift
                if (speed !== null && speed >= 0.5) {
                  dist += segmentKm;
                  path.push([latitude, longitude]);
                } else if (speed === null) {
                  dist += segmentKm; // No speed data, trust distance
                  path.push([latitude, longitude]);
                }
              } else if (segmentM >= 500) {
                // GPS jump, don't add distance but reset reference point
                path.push([latitude, longitude]);
              }
              // If segmentM < 10, we do NOT push to path, so we can accumulate distance over multiple small updates
            } else {
              // First point
              path.push([latitude, longitude]);
            }

            if (speedKmh > maxSpd) maxSpd = speedKmh;
            if (path.length > 500) path.splice(0, path.length - 500);

            const updated: SensorSnapshot = { ...prev, locationPath: path, distanceRecorded: Math.round(dist * 1000) / 1000, maxSpeedKmh: Math.round(maxSpd * 10) / 10, lastUpdate: Date.now() };
            saveSession(questId, userId, updated);
            return updated;
          });
        }
      );
      geoWatchId.current = id;
    } catch (e) {
      console.warn('[Sensors] Geolocation watch failed:', e);
    }

    // Accelerometer for step counting (web fallback only)
    try {
      motionListener.current = await Motion.addListener('accel', (event: any) => {
        if (!isMounted.current) return;
        
        // Capacitor Motion API may provide acceleration (without gravity) or accelerationIncludingGravity
        const hasGravity = !!event.accelerationIncludingGravity;
        const accel = event.accelerationIncludingGravity || event.acceleration || { x: 0, y: 0, z: 0 };
        const { x, y, z } = accel;
        const mag = Math.sqrt(x * x + y * y + z * z);
        
        const now = Date.now();
        const ss = stepState.current;

        // If it includes gravity, base magnitude is ~9.8, so threshold is ~11.5 (approx +1.7 m/s^2)
        // If it excludes gravity, base magnitude is 0, so threshold is ~2.5 m/s^2
        const THRESHOLD = hasGravity ? 11.5 : 2.5;
        const MIN_STEP_INTERVAL = 300;

        if (mag > THRESHOLD && ss.lastMag <= THRESHOLD && now - ss.lastPeakTime > MIN_STEP_INTERVAL) {
          ss.lastPeakTime = now;
          setSnapshot(prev => {
            if (!prev) return prev;
            const updated = { ...prev, stepsRecorded: prev.stepsRecorded + 1, lastUpdate: now };
            saveSession(questId, userId, updated);
            return updated;
          });
        }
        ss.lastMag = mag;
      });
    } catch (e) {
      console.warn('[Sensors] Motion listener failed:', e);
    }

    // Active minutes timer — compute from elapsed time every 10s for responsive UI
    activeMinutesTimer.current = setInterval(() => {
      if (!isMounted.current) return;
      setSnapshot((prev: SensorSnapshot | null) => {
        if (!prev) return prev;
        const elapsedMs = Date.now() - prev.startedAt;
        const elapsedMinutes = Math.floor(elapsedMs / 60_000);
        if (elapsedMinutes <= prev.activeMinutesRecorded) return prev;
        const updated = { ...prev, activeMinutesRecorded: elapsedMinutes, lastUpdate: Date.now() };
        saveSession(questId, userId, updated);
        return updated;
      });
    }, 10_000);

    return true;
  }, [tracking]);

  // ─── Stop Tracking ───────────────────────────────────────────────────────

  const stopTracking = useCallback(async (): Promise<SensorSnapshot | null> => {
    // ─── NATIVE PATH ──────────────────────────────────────────────
    if (isNative() && NativeTracking) {
      if (nativePollingTimer.current) {
        clearInterval(nativePollingTimer.current);
        nativePollingTimer.current = null;
      }
      try {
        const result = await NativeTracking.stop();
        const finalSnap: SensorSnapshot = {
          stepsRecorded: result.stepsRecorded || 0,
          distanceRecorded: Math.round((result.distanceRecorded || 0) * 1000) / 1000,
          activeMinutesRecorded: result.activeMinutesRecorded || 0,
          locationPath: [],
          maxSpeedKmh: Math.round((result.maxSpeedKmh || 0) * 10) / 10,
          startedAt: result.startedAt || 0,
          lastUpdate: result.lastUpdate || Date.now(),
        };
        setSnapshot(finalSnap);
        snapshotRef.current = finalSnap;
        setTracking(false);
        console.log('[Sensors] Native tracking stopped. Steps:', finalSnap.stepsRecorded, 'Distance:', finalSnap.distanceRecorded);
        return finalSnap;
      } catch (e) {
        console.warn('[Sensors] Native stop failed:', e);
      }
    }

    // ─── WEB FALLBACK ─────────────────────────────────────────────
    if (geoWatchId.current) {
      Geolocation.clearWatch({ id: geoWatchId.current }).catch(() => {});
      geoWatchId.current = null;
    }

    if (motionListener.current) {
      try { await motionListener.current.remove?.(); } catch { /* ignore */ }
      motionListener.current = null;
    }

    if (activeMinutesTimer.current) {
      clearInterval(activeMinutesTimer.current);
      activeMinutesTimer.current = null;
    }

    stepState.current = { lastMag: 0, lastPeakTime: 0, isStepping: false };

    const finalSnapshot = snapshotRef.current;
    setTracking(false);
    return finalSnapshot;
  }, []);

  // ─── Finalize (clear stored session) ─────────────────────────────────────

  const finalizeTracking = useCallback((questId: string) => {
    clearSession(questId, userId);
    setActiveQuestId(null);
    setSnapshot(null);
    snapshotRef.current = null;
  }, []);

  // ─── Anti-Cheat Validation ───────────────────────────────────────────────

  const validateCompletion = useCallback((
    requirements: SensorRequirements,
    data: SensorSnapshot
  ): { valid: boolean; flags: string[] } => {
    const flags: string[] = [];

    // Check step requirement
    if (requirements.steps && data.stepsRecorded < requirements.steps * 0.8) {
      flags.push(`Steps insufficient: ${data.stepsRecorded}/${requirements.steps}`);
    }

    // Check distance requirement
    if (requirements.distanceKm && data.distanceRecorded < requirements.distanceKm * 0.8) {
      flags.push(`Distance insufficient: ${data.distanceRecorded.toFixed(2)}/${requirements.distanceKm} km`);
    }

    // Check active minutes requirement
    if (requirements.activeMinutes && data.activeMinutesRecorded < requirements.activeMinutes * 0.7) {
      flags.push(`Active time insufficient: ${data.activeMinutesRecorded}/${requirements.activeMinutes} min`);
    }

    // Speed anomaly: > 50km/h during a walking/running quest = likely in vehicle
    if ((requirements.steps || requirements.distanceKm) && data.maxSpeedKmh > 50) {
      flags.push(`Speed anomaly detected: ${data.maxSpeedKmh} km/h (likely vehicle)`);
    }

    // Step cadence anomaly: if steps > 0 but duration is very short relative to steps
    if (requirements.steps && data.stepsRecorded > 0) {
      const durationSec = (data.lastUpdate - data.startedAt) / 1000;
      const cadence = data.stepsRecorded / durationSec;
      if (cadence > 4) {
        flags.push(`Step cadence anomaly: ${cadence.toFixed(1)} steps/sec (likely phone shaking)`);
      }
    }

    // Location teleportation check: if path has points > 1km apart consecutively
    if (data.locationPath.length > 1) {
      for (let i = 1; i < data.locationPath.length; i++) {
        const [lat1, lng1] = data.locationPath[i - 1];
        const [lat2, lng2] = data.locationPath[i];
        const d = haversineKm(lat1, lng1, lat2, lng2);
        if (d > 1) {
          flags.push(`GPS teleport detected: ${d.toFixed(2)}km jump between points`);
          break;
        }
      }
    }

    return { valid: flags.length === 0, flags };
  }, []);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (geoWatchId.current) {
        Geolocation.clearWatch({ id: geoWatchId.current }).catch(() => {});
      }
      // Remove only our own motion listener (never call removeAllListeners
      // globally — that would yank handles owned by other useSensors callers).
      if (motionListener.current) {
        try { motionListener.current.remove?.(); } catch { /* ignore */ }
        motionListener.current = null;
      }
      if (activeMinutesTimer.current) clearInterval(activeMinutesTimer.current);
      if (nativePollingTimer.current) clearInterval(nativePollingTimer.current);
    };
  }, []);

  // Hand-clear stored session for a questId without touching tracking state.
  // Useful when a caller wants to guarantee a fresh start before startTracking.
  const clearStoredSession = useCallback((questId: string) => {
    clearSession(questId, userId);
  }, [userId]);

  return {
    // State
    permissions,
    tracking,
    activeQuestId,
    snapshot,

    // Actions
    requestPermissions,
    checkPermissions,
    startTracking,
    stopTracking,
    finalizeTracking,
    clearStoredSession,
    validateCompletion,
  };
}
