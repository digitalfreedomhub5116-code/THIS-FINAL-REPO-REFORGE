import { useState, useRef, useCallback, useEffect } from 'react';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Motion } from '@capacitor/motion';

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

function loadSession(questId: string): SensorSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + questId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(questId: string, data: SensorSnapshot) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + questId, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

function clearSession(questId: string) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + questId);
  } catch { /* ignore */ }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSensors() {
  const [permissions, setPermissions] = useState<SensorPermissions>({ location: false, motion: false });
  const [tracking, setTracking] = useState(false);
  const [activeQuestId, setActiveQuestId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SensorSnapshot | null>(null);

  const geoWatchId = useRef<string | null>(null);
  const motionListener = useRef<any>(null);
  const stepState = useRef<StepState>({ lastMag: 0, lastPeakTime: 0, isStepping: false });
  const snapshotRef = useRef<SensorSnapshot | null>(null);
  const activeMinutesTimer = useRef<ReturnType<typeof setInterval> | null>(null);
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
      // but on Android ACTIVITY_RECOGNITION is requested at runtime via the OS
      // We'll try to read a single event to trigger the permission dialog
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { resolve(); }, 2000);
        Motion.addListener('accel', () => {
          clearTimeout(timeout);
          resolve();
        }).catch(() => { clearTimeout(timeout); resolve(); });
        // Remove after first event
        setTimeout(() => { Motion.removeAllListeners(); }, 2100);
      });
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

  const startTracking = useCallback(async (questId: string): Promise<boolean> => {
    if (tracking) return false;

    // Try to resume an existing session
    const existing = loadSession(questId);
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

    // GPS watch
    try {
      const id = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
        (pos: Position | null, err?: any) => {
          if (!pos || !isMounted.current) return;
          const { latitude, longitude, speed } = pos.coords;
          const speedKmh = (speed ?? 0) * 3.6;

          setSnapshot(prev => {
            if (!prev) return prev;
            const path = [...prev.locationPath];
            let dist = prev.distanceRecorded;
            let maxSpd = prev.maxSpeedKmh;

            if (path.length > 0) {
              const [lastLat, lastLng] = path[path.length - 1];
              const segmentKm = haversineKm(lastLat, lastLng, latitude, longitude);
              // Ignore GPS jitter (< 3m) and teleports (> 0.5km in one update)
              if (segmentKm > 0.003 && segmentKm < 0.5) {
                dist += segmentKm;
              }
            }

            if (speedKmh > maxSpd) maxSpd = speedKmh;

            path.push([latitude, longitude]);
            // Keep path manageable — max 500 breadcrumbs
            if (path.length > 500) path.splice(0, path.length - 500);

            const updated: SensorSnapshot = { ...prev, locationPath: path, distanceRecorded: Math.round(dist * 1000) / 1000, maxSpeedKmh: Math.round(maxSpd * 10) / 10, lastUpdate: Date.now() };
            saveSession(questId, updated);
            return updated;
          });
        }
      );
      geoWatchId.current = id;
    } catch (e) {
      console.warn('[Sensors] Geolocation watch failed:', e);
    }

    // Accelerometer for step counting
    try {
      motionListener.current = await Motion.addListener('accel', (event) => {
        if (!isMounted.current) return;
        const { x, y, z } = event.acceleration || { x: 0, y: 0, z: 0 };
        const mag = Math.sqrt(x * x + y * y + z * z);
        const now = Date.now();
        const ss = stepState.current;

        // Simple peak-detection step counter
        // Threshold: acceleration magnitude spike > 1.2g, min 300ms between steps
        const THRESHOLD = 11.8; // ~1.2g in m/s²
        const MIN_STEP_INTERVAL = 300; // ms

        if (mag > THRESHOLD && ss.lastMag <= THRESHOLD && now - ss.lastPeakTime > MIN_STEP_INTERVAL) {
          ss.lastPeakTime = now;
          setSnapshot(prev => {
            if (!prev) return prev;
            const updated = { ...prev, stepsRecorded: prev.stepsRecorded + 1, lastUpdate: now };
            saveSession(questId, updated);
            return updated;
          });
        }
        ss.lastMag = mag;
      });
    } catch (e) {
      console.warn('[Sensors] Motion listener failed:', e);
    }

    // Active minutes timer — increment every 60s while tracking
    activeMinutesTimer.current = setInterval(() => {
      if (!isMounted.current) return;
      setSnapshot(prev => {
        if (!prev) return prev;
        const updated = { ...prev, activeMinutesRecorded: prev.activeMinutesRecorded + 1, lastUpdate: Date.now() };
        saveSession(questId, updated);
        return updated;
      });
    }, 60_000);

    return true;
  }, [tracking]);

  // ─── Stop Tracking ───────────────────────────────────────────────────────

  const stopTracking = useCallback((): SensorSnapshot | null => {
    if (geoWatchId.current) {
      Geolocation.clearWatch({ id: geoWatchId.current }).catch(() => {});
      geoWatchId.current = null;
    }

    if (motionListener.current) {
      motionListener.current.remove?.();
      Motion.removeAllListeners().catch(() => {});
      motionListener.current = null;
    }

    if (activeMinutesTimer.current) {
      clearInterval(activeMinutesTimer.current);
      activeMinutesTimer.current = null;
    }

    stepState.current = { lastMag: 0, lastPeakTime: 0, isStepping: false };

    const finalSnapshot = snapshotRef.current;
    setTracking(false);

    // Don't clear session yet — let the caller decide
    return finalSnapshot;
  }, []);

  // ─── Finalize (clear stored session) ─────────────────────────────────────

  const finalizeTracking = useCallback((questId: string) => {
    clearSession(questId);
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
      Motion.removeAllListeners().catch(() => {});
      if (activeMinutesTimer.current) clearInterval(activeMinutesTimer.current);
    };
  }, []);

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
    validateCompletion,
  };
}
