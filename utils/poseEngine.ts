/**
 * poseEngine.ts — MediaPipe Pose Estimation Engine
 * Handles initialization, angle calculation, rep detection, and form scoring.
 */

import type { AngleDef, FormCoachExercise, FormRule } from '../lib/formCoachConfig';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Point3D {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type RepState = 'IDLE' | 'ECCENTRIC' | 'BOTTOM' | 'CONCENTRIC' | 'TOP';

export interface FormViolation {
  ruleId: string;
  message: string;
  severity: 'warning' | 'error';
  timestamp: number;
}

export interface RepResult {
  repNumber: number;
  formScore: number; // 0-100
  violations: FormViolation[];
  timestamp: number;
}

export interface FormCoachState {
  repCount: number;
  repState: RepState;
  currentAngle: number;
  formScore: number; // running average 0-100
  currentViolations: FormViolation[];
  repResults: RepResult[];
  isTracking: boolean;
  confidence: number; // 0-1, average landmark confidence
  landmarks: Point3D[] | null;
}

// ── Math Helpers ──────────────────────────────────────────────────────────────

/** Calculate the angle at point B formed by vectors BA and BC (in degrees) */
export function calculateAngle(a: Point3D, b: Point3D, c: Point3D): number {
  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x ** 2 + ba.y ** 2 + ba.z ** 2);
  const magBC = Math.sqrt(bc.x ** 2 + bc.y ** 2 + bc.z ** 2);

  if (magBA === 0 || magBC === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/** Get the angle for a given AngleDef from landmarks */
export function getAngle(landmarks: Point3D[], def: AngleDef): number {
  const a = landmarks[def.a];
  const b = landmarks[def.b];
  const c = landmarks[def.c];
  if (!a || !b || !c) return 0;
  return calculateAngle(a, b, c);
}

/** Check average confidence for required landmarks */
export function getConfidence(landmarks: Point3D[], required: number[]): number {
  if (!landmarks || landmarks.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (const idx of required) {
    if (landmarks[idx]) {
      sum += landmarks[idx].visibility;
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

// ── OneEuroFilter (jitter reduction) ──────────────────────────────────────────

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev: number = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const te = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + te / dt);
  }

  filter(x: number, t: number): number {
    if (this.tPrev === null || this.xPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      return x;
    }

    const dt = t - this.tPrev;
    if (dt <= 0) return this.xPrev;

    const dx = (x - this.xPrev) / dt;
    const edx = this.alpha(this.dCutoff, dt) * dx + (1 - this.alpha(this.dCutoff, dt)) * this.dxPrev;
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    const filtered = this.alpha(cutoff, dt) * x + (1 - this.alpha(cutoff, dt)) * this.xPrev;

    this.xPrev = filtered;
    this.dxPrev = edx;
    this.tPrev = t;

    return filtered;
  }

  reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

// ── Rep Detection Engine (Adaptive Calibration) ──────────────────────────────

export class RepDetector {
  private state: RepState = 'IDLE';
  private repCount = 0;
  private maxReps: number = 0; // 0 = no limit
  private angleFilter = new OneEuroFilter(1.5, 0.01);
  private frameViolations: FormViolation[] = [];
  private repViolations: FormViolation[] = [];
  private repScoreFrames: number[] = [];
  private repResults: RepResult[] = [];
  private lastAlertTime = 0;

  // ── Adaptive calibration ──
  private calibrated = false;
  private calibrationAngles: number[] = []; // all angles observed during first N reps
  private adaptiveBottom: number;  // calibrated bottom threshold
  private adaptiveTop: number;    // calibrated top threshold
  private readonly CALIBRATION_REPS = 2; // learn from first 2 reps

  // ── Smart debouncing ──
  private violationFrameCounts: Map<string, number> = new Map(); // ruleId → consecutive frame count
  private ruleAlertCounts: Map<string, number> = new Map(); // ruleId → alerts fired this set
  private readonly SUSTAINED_FRAMES = 15; // ~0.5s at 30fps before warning
  private readonly MAX_ALERTS_PER_RULE = 2; // max warnings per rule per set
  private readonly ALERT_COOLDOWN_MS = 8000; // 8 seconds between any alert

  constructor(private exercise: FormCoachExercise) {
    // Start with the config defaults (widened values)
    this.adaptiveBottom = exercise.repPhase.bottomAngleMax;
    this.adaptiveTop = exercise.repPhase.topAngleMin;
  }

  /** Set the maximum rep count — once reached, no more reps are counted */
  setMaxReps(max: number): void {
    this.maxReps = max;
  }

  /** Process a single frame of landmarks, returns updated state */
  processFrame(landmarks: Point3D[], timestamp: number): FormCoachState {
    const confidence = getConfidence(landmarks, this.exercise.requiredLandmarks);

    // Skip low-confidence frames
    if (confidence < 0.65) {
      return this.getState(0, confidence, landmarks);
    }

    const rawAngle = getAngle(landmarks, this.exercise.primaryAngle);
    const angle = this.angleFilter.filter(rawAngle, timestamp / 1000);

    // Collect calibration data
    if (!this.calibrated) {
      this.calibrationAngles.push(angle);
    }

    // Check form rules (only after calibration grace period, and only during active rep phases)
    this.frameViolations = [];
    let frameScore = 100;
    const inActivePhase = this.state === 'ECCENTRIC' || this.state === 'BOTTOM' || this.state === 'CONCENTRIC';
    const pastGracePeriod = this.repCount >= this.CALIBRATION_REPS;

    if (pastGracePeriod && inActivePhase) {
      for (const rule of this.exercise.formRules) {
        const ruleAngle = getAngle(landmarks, rule.angle);
        let violated = false;
        if (rule.minAngle !== undefined && ruleAngle < rule.minAngle) violated = true;
        if (rule.maxAngle !== undefined && ruleAngle > rule.maxAngle) violated = true;

        if (violated) {
          // Track consecutive frames for this violation
          const count = (this.violationFrameCounts.get(rule.id) || 0) + 1;
          this.violationFrameCounts.set(rule.id, count);

          // Only count as actual violation if sustained for enough frames
          if (count >= this.SUSTAINED_FRAMES) {
            frameScore -= rule.severity === 'error' ? 30 : 15;
            this.frameViolations.push({
              ruleId: rule.id,
              message: rule.errorMessage,
              severity: rule.severity,
              timestamp,
            });
          }
        } else {
          // Reset consecutive count when form is correct
          this.violationFrameCounts.set(rule.id, 0);
        }
      }
    }
    frameScore = Math.max(0, frameScore);

    // Rep detection (only for 'reps' mode, and only if we haven't hit the cap)
    if (this.exercise.trackingMode === 'reps') {
      if (this.maxReps <= 0 || this.repCount < this.maxReps) {
        this.detectRep(angle, frameScore, timestamp);
      }
    }

    return this.getState(angle, confidence, landmarks);
  }

  private detectRep(angle: number, frameScore: number, timestamp: number): void {
    const bottom = this.adaptiveBottom;
    const top = this.adaptiveTop;

    switch (this.state) {
      case 'IDLE':
      case 'TOP':
        if (angle < top - 5) {
          this.state = 'ECCENTRIC';
          this.repViolations = [];
          this.repScoreFrames = [];
        }
        break;

      case 'ECCENTRIC':
        this.repScoreFrames.push(frameScore);
        this.repViolations.push(...this.frameViolations);
        if (angle <= bottom) {
          this.state = 'BOTTOM';
        }
        // If angle goes back up without reaching bottom
        if (angle >= top) {
          this.state = 'TOP';
        }
        break;

      case 'BOTTOM':
        this.repScoreFrames.push(frameScore);
        this.repViolations.push(...this.frameViolations);
        if (angle > bottom + 10) {
          this.state = 'CONCENTRIC';
        }
        break;

      case 'CONCENTRIC':
        this.repScoreFrames.push(frameScore);
        this.repViolations.push(...this.frameViolations);
        if (angle >= top) {
          // Rep completed!
          this.repCount++;
          const avgScore = this.repScoreFrames.length > 0
            ? this.repScoreFrames.reduce((a, b) => a + b, 0) / this.repScoreFrames.length
            : 100;

          // Deduplicate violations
          const uniqueViolations = this.dedupeViolations(this.repViolations);

          this.repResults.push({
            repNumber: this.repCount,
            formScore: Math.round(avgScore),
            violations: uniqueViolations,
            timestamp,
          });

          this.state = 'TOP';
          this.repViolations = [];
          this.repScoreFrames = [];

          // Adaptive calibration: after N reps, compute personalized thresholds
          if (this.repCount === this.CALIBRATION_REPS && !this.calibrated) {
            this.calibrate();
          }
        }
        break;
    }
  }

  /** Compute adaptive thresholds from observed angle data */
  private calibrate(): void {
    if (this.calibrationAngles.length < 20) return; // not enough data

    // Find the user's actual observed range
    const sorted = [...this.calibrationAngles].sort((a, b) => a - b);
    // Use 5th/95th percentile to ignore outliers
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const range = p95 - p5;

    if (range > 20) { // Only calibrate if we see a meaningful range of motion
      // Bottom = 25% up from the observed minimum
      // Top = 25% down from the observed maximum
      this.adaptiveBottom = p5 + range * 0.3;
      this.adaptiveTop = p95 - range * 0.25;
      this.calibrated = true;
      console.log(`[FormCoach] Calibrated: bottom=${this.adaptiveBottom.toFixed(0)}° top=${this.adaptiveTop.toFixed(0)}° (observed ${p5.toFixed(0)}°–${p95.toFixed(0)}°)`);
    }
  }

  private dedupeViolations(violations: FormViolation[]): FormViolation[] {
    const seen = new Set<string>();
    return violations.filter(v => {
      if (seen.has(v.ruleId)) return false;
      seen.add(v.ruleId);
      return true;
    });
  }

  /** Get throttled violation for audio/visual alert (max per rule per set, with cooldown) */
  getAlertViolation(timestamp: number): FormViolation | null {
    if (this.frameViolations.length === 0) return null;
    if (timestamp - this.lastAlertTime < this.ALERT_COOLDOWN_MS) return null;

    // Filter out rules that have already hit their alert limit
    const eligible = this.frameViolations.filter(v => {
      const count = this.ruleAlertCounts.get(v.ruleId) || 0;
      return count < this.MAX_ALERTS_PER_RULE;
    });

    if (eligible.length === 0) return null;

    this.lastAlertTime = timestamp;
    // Prioritize errors over warnings
    const chosen = eligible.find(v => v.severity === 'error') || eligible[0];
    // Increment alert count for this rule
    this.ruleAlertCounts.set(chosen.ruleId, (this.ruleAlertCounts.get(chosen.ruleId) || 0) + 1);
    return chosen;
  }

  private getState(angle: number, confidence: number, landmarks: Point3D[]): FormCoachState {
    const avgFormScore = this.repResults.length > 0
      ? Math.round(this.repResults.reduce((a, r) => a + r.formScore, 0) / this.repResults.length)
      : 100;

    return {
      repCount: this.repCount,
      repState: this.state,
      currentAngle: Math.round(angle),
      formScore: avgFormScore,
      currentViolations: [...this.frameViolations],
      repResults: [...this.repResults],
      isTracking: true,
      confidence,
      landmarks,
    };
  }

  reset(): void {
    this.state = 'IDLE';
    this.repCount = 0;
    this.angleFilter.reset();
    this.frameViolations = [];
    this.repViolations = [];
    this.repScoreFrames = [];
    this.repResults = [];
    this.lastAlertTime = 0;
    // Reset calibration
    this.calibrated = false;
    this.calibrationAngles = [];
    this.adaptiveBottom = this.exercise.repPhase.bottomAngleMax;
    this.adaptiveTop = this.exercise.repPhase.topAngleMin;
    // Reset debouncing
    this.violationFrameCounts.clear();
    this.ruleAlertCounts.clear();
  }

  getRepCount(): number { return this.repCount; }
  getRepResults(): RepResult[] { return [...this.repResults]; }
}

// ── Skeleton Drawing ──────────────────────────────────────────────────────────

const SKELETON_CONNECTIONS: [number, number][] = [
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  [11, 12],           // Shoulders
  [11, 23], [12, 24], // Torso
  [23, 24],           // Hips
  [23, 25], [25, 27], // Left leg
  [24, 26], [26, 28], // Right leg
];

/**
 * Draw skeleton overlay on a canvas from pose landmarks.
 * @param ctx Canvas 2D context
 * @param landmarks Array of 33 landmarks
 * @param width Canvas width
 * @param height Canvas height
 * @param violations Current form violations (to color-code joints)
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Point3D[],
  width: number,
  height: number,
  violations: FormViolation[] = [],
): void {
  ctx.clearRect(0, 0, width, height);

  const hasError = violations.some(v => v.severity === 'error');
  const hasWarning = violations.some(v => v.severity === 'warning');
  const lineColor = hasError ? '#ef4444' : hasWarning ? '#f59e0b' : '#00d4ff';
  const dotColor = hasError ? '#ef4444' : hasWarning ? '#f59e0b' : '#22c55e';

  // Draw connections
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.shadowColor = lineColor;
  ctx.shadowBlur = 8;

  for (const [a, b] of SKELETON_CONNECTIONS) {
    const la = landmarks[a];
    const lb = landmarks[b];
    if (!la || !lb || la.visibility < 0.5 || lb.visibility < 0.5) continue;

    ctx.beginPath();
    ctx.moveTo(la.x * width, la.y * height);
    ctx.lineTo(lb.x * width, lb.y * height);
    ctx.stroke();
  }

  // Draw joints
  ctx.shadowBlur = 0;
  const jointIndices = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  for (const idx of jointIndices) {
    const l = landmarks[idx];
    if (!l || l.visibility < 0.5) continue;

    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(l.x * width, l.y * height, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
}
