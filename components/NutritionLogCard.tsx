/**
 * NutritionLogCard.tsx
 *
 * Dashboard nutrition widget that lives directly under HunterStatusWindow.
 *
 * Layout (matches the reference mockup):
 *   ┌────────────────────────────────────────────────────────┐
 *   │ ● NUTRITION                                  ACTIVE     │   ← header strip
 *   │ ┌────────────────────────────────────────────────────┐ │
 *   │ │  ◯◯◯  1,250            • CARBS    150g             │ │   ← rings + macros
 *   │ │       /2,500 KCAL      • PROTEIN  120g             │ │
 *   │ │                        • FATS      60g             │ │
 *   │ └────────────────────────────────────────────────────┘ │
 *   │ ┌────────────────────────────────────────────────────┐ │
 *   │ │ [img] Grilled Chicken Salad     450 KCAL · 45g  ❯  │ │   ← latest 2 logs
 *   │ ├────────────────────────────────────────────────────┤ │
 *   │ │ [img] Protein Shake             220 KCAL · 30g  ❯  │ │
 *   │ └────────────────────────────────────────────────────┘ │
 *   │              VIEW MORE  (only if > 2 logs)              │
 *   │ ┌────────────────────────────────────────────────────┐ │
 *   │ │              ◎  SCAN FOOD                            │ │   ← scan trigger
 *   │ └────────────────────────────────────────────────────┘ │
 *   └────────────────────────────────────────────────────────┘
 *
 * Reuses the existing nutrition machinery — no schema changes:
 *   • playerData.nutritionLogs   (read)
 *   • onLogMeal(meal: MealLog)   (write — wires to logMeal in useSystem)
 *   • onSaveProfile(profile)     (write — wires to saveHealthProfile)
 *   • POST /api/nutrition/analyze (server enforces 1-key gate atomically)
 *
 * The scan flow is intentionally self-contained: native camera on
 * Capacitor, file input fallback on web. On success the new MealLog is
 * passed to onLogMeal, which prepends it to nutritionLogs — newest entries
 * naturally bubble to the top because we sort descending by timestamp.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanLine, ChevronRight, Settings, X, Camera as CameraIcon, Image as ImageIcon, Loader2, Lock } from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

import type { FoodItem, HealthProfile, MealLog, MealType, PlayerData } from '../types';
import { API_BASE } from '../lib/apiConfig';
import { authenticatedFetch, getPlayerAuthHeaders } from '../lib/playerApi';
import HudButton from './HudButton';

// ────────────────────────────────────────────────────────────────────────────
// Theme — exact colors taken from the reference image.
// ────────────────────────────────────────────────────────────────────────────

const COLOR = {
  panel:        '#0B1015',
  panelInner:   '#0E1520',
  border:       'rgba(0, 212, 255, 0.18)',
  borderSoft:   'rgba(255, 255, 255, 0.05)',
  cyan:         '#00d4ff',
  cyanBright:   '#7DF9FF',
  cyanDim:      'rgba(0, 212, 255, 0.45)',
  ringTrack:    'rgba(255, 255, 255, 0.06)',
  carb:         '#9CA3AF',
  protein:      '#00d4ff',
  fat:          '#3B82F6',
  textHi:       '#FFFFFF',
  textLo:       'rgba(220, 240, 250, 0.62)',
  textMute:     '#5B6776',
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Concentric rings — pure SVG, one per macro.
// Radii are spaced so all three rings are clearly visible inside the same disc.
// ────────────────────────────────────────────────────────────────────────────

interface RingProps {
  size: number;            // outer canvas in px
  consumed: number;        // current kcal
  target: number;          // target kcal
  carbsPct: number;        // 0..1
  proteinPct: number;      // 0..1
  fatsPct: number;         // 0..1
}

const ConcentricRings: React.FC<RingProps> = ({ size, consumed, target, carbsPct, proteinPct, fatsPct }) => {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = Math.max(4, Math.round(size * 0.055));
  // Outer = carbs, middle = protein, inner = fats — visually matches the mockup
  // where the brightest ring sits a hair inside the dimmest one.
  const rOuter = (size / 2) - stroke * 0.7;
  const rMid   = rOuter - stroke - 2;
  const rIn    = rMid   - stroke - 2;

  const ring = (r: number, color: string, pct: number, glow: boolean) => {
    const c = 2 * Math.PI * r;
    const dash = Math.max(0, Math.min(1, pct)) * c;
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} stroke={COLOR.ringTrack} strokeWidth={stroke} fill="none" />
        <circle
          cx={cx} cy={cy} r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          /* Start at 12 o'clock and sweep clockwise */
          transform={`rotate(-90 ${cx} ${cy})`}
          style={glow ? { filter: `drop-shadow(0 0 6px ${color}aa) drop-shadow(0 0 14px ${color}55)` } : undefined}
        />
      </g>
    );
  };

  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {ring(rOuter, COLOR.carb,    carbsPct,   false)}
        {ring(rMid,   COLOR.protein, proteinPct, true )}
        {ring(rIn,    COLOR.fat,     fatsPct,    false)}
      </svg>
      {/* Centred kcal stack */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
          color: COLOR.textHi,
          textShadow: `0 0 10px ${COLOR.cyanDim}`,
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        <div style={{ fontSize: Math.round(size * 0.20), fontWeight: 700 }}>
          {Math.round(consumed).toLocaleString()}
        </div>
        <div style={{ fontSize: Math.round(size * 0.085), color: COLOR.textLo, marginTop: 2 }}>
          / {Math.round(target).toLocaleString()}
        </div>
        <div style={{ fontSize: Math.round(size * 0.08), color: COLOR.textLo, letterSpacing: '0.18em', marginTop: 2 }}>
          KCAL
        </div>
      </div>
    </div>
  );
};

// ────────────────────────────────────────────────────────────────────────────
// Macro row with bullet, label, value.
// ────────────────────────────────────────────────────────────────────────────

const MacroRow: React.FC<{ color: string; label: string; valueG: number }> = ({ color, label, valueG }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <span style={{
      width: 7, height: 7, borderRadius: '50%',
      background: color,
      boxShadow: `0 0 6px ${color}99`,
      flex: 'none',
    }} />
    <span style={{
      fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.22em',
      color: COLOR.textLo,
      flex: 1,
    }}>{label}</span>
    <span style={{
      fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
      fontWeight: 700,
      fontSize: 14,
      color: COLOR.textHi,
      letterSpacing: '0.04em',
      textShadow: `0 0 8px ${COLOR.cyanDim}`,
    }}>{valueG}g</span>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Meal log row — image thumb + name + kcal/protein readout + chevron.
// ────────────────────────────────────────────────────────────────────────────

const LogRow: React.FC<{ log: MealLog; onClick: () => void }> = ({ log, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      width: '100%',
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px',
      background: 'transparent',
      border: `1px solid ${COLOR.border}`,
      borderRadius: 14,
      cursor: 'pointer',
      textAlign: 'left',
      transition: 'background 160ms ease, border-color 160ms ease',
    }}
    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 212, 255, 0.04)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
  >
    {/* thumb */}
    <div
      style={{
        width: 44, height: 44, borderRadius: 10,
        background: COLOR.panelInner,
        border: `1px solid ${COLOR.borderSoft}`,
        overflow: 'hidden', flex: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {log.imageUrl ? (
        <img src={log.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }} />
      ) : (
        <ImageIcon size={18} color={COLOR.textMute} />
      )}
    </div>
    {/* text */}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
        fontWeight: 700, fontSize: 14, color: COLOR.textHi,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {log.label}
      </div>
      <div style={{
        fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
        fontWeight: 700, fontSize: 11, letterSpacing: '0.2em',
        color: COLOR.cyan, marginTop: 2,
      }}>
        {log.totalCalories} KCAL · {log.totalProtein}g PRO
      </div>
    </div>
    <ChevronRight size={18} color={COLOR.cyan} style={{ flex: 'none' }} />
  </button>
);

// ────────────────────────────────────────────────────────────────────────────
// Daily target derivation — same formula HealthView uses, kept private to
// avoid pulling in the giant HealthView module.
// ────────────────────────────────────────────────────────────────────────────

interface DailyTargets {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

function deriveDailyTargets(profile: HealthProfile | undefined): DailyTargets {
  if (!profile) {
    return { calories: 2000, protein: 100, carbs: 250, fats: 65 };
  }

  let bmr = 0;
  if (profile.weight && profile.height && profile.age) {
    bmr = profile.gender === 'MALE'
      ? (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) + 5
      : (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 161;
  } else {
    bmr = profile.bmr || 1800;
  }

  const mult: Record<string, number> = {
    SEDENTARY: 1.2, LIGHT: 1.375, MODERATE: 1.55, VERY_ACTIVE: 1.725,
  };
  let calories = Math.round(bmr * (mult[profile.activityLevel] || 1.55));
  if (profile.goal === 'LOSE_WEIGHT')   calories = Math.max(1200, calories - 500);
  if (profile.goal === 'BUILD_MUSCLE')  calories += 300;

  if (profile.customCalorieLimit && profile.customCalorieLimit > 0) {
    calories = profile.customCalorieLimit;
  }

  // Macros: P 30% / C 40% / F 30% by calories (4-4-9 kcal/g).
  const protein = Math.round((calories * 0.30) / 4);
  const carbs   = Math.round((calories * 0.40) / 4);
  const fats    = Math.round((calories * 0.30) / 9);
  return { calories, protein, carbs, fats };
}

function todayStartMs(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

async function compressImage(dataUrl: string, maxWidth = 640): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const w = Math.round(img.width * ratio);
      const h = Math.round(img.height * ratio);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Main component.
// ────────────────────────────────────────────────────────────────────────────

interface NutritionLogCardProps {
  player: PlayerData;
  onLogMeal: (meal: MealLog) => void;
  onSaveProfile: (profile: HealthProfile, identity: string) => void;
  /**
   * Optional — open the deep-dive Health/Nutrition tab when the user wants
   * full controls. If omitted, "View More" stays inside the in-card modal.
   */
  onOpenFullNutrition?: () => void;
  onToggleNav?: (show: boolean) => void;
}

type ScanPhase = 'IDLE' | 'PICKING' | 'SCANNING' | 'ERROR';

const NutritionLogCard: React.FC<NutritionLogCardProps> = ({
  player, onLogMeal, onSaveProfile, onOpenFullNutrition, onToggleNav,
}) => {
  const profile = player.healthProfile;

  // ── Today's intake (sum of nutritionLogs whose timestamp >= today 00:00) ──
  const dailyIntake = useMemo(() => {
    const start = todayStartMs();
    return (player.nutritionLogs || [])
      .filter(l => l.timestamp >= start)
      .reduce((acc, l) => ({
        calories: acc.calories + (l.totalCalories || 0),
        protein:  acc.protein  + (l.totalProtein  || 0),
        carbs:    acc.carbs    + (l.totalCarbs    || 0),
        fats:     acc.fats     + (l.totalFats     || 0),
      }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
  }, [player.nutritionLogs]);

  const targets = useMemo(() => deriveDailyTargets(profile), [profile]);

  const carbsPct   = targets.carbs   ? dailyIntake.carbs   / targets.carbs   : 0;
  const proteinPct = targets.protein ? dailyIntake.protein / targets.protein : 0;
  const fatsPct    = targets.fats    ? dailyIntake.fats    / targets.fats    : 0;

  // ── Recent logs (newest first) ──
  const recentLogs = useMemo(() => {
    return [...(player.nutritionLogs || [])].sort((a, b) => b.timestamp - a.timestamp);
  }, [player.nutritionLogs]);

  const visibleLogs = recentLogs.slice(0, 2);
  const hiddenCount = Math.max(0, recentLogs.length - 2);

  // ── Modal state ──
  const [showAllLogs, setShowAllLogs]     = useState(false);
  const [selectedLog, setSelectedLog]     = useState<MealLog | null>(null);
  const [showLimitEditor, setShowLimitEditor] = useState(false);
  const [limitInput, setLimitInput]       = useState('');
  const [showScanSheet, setShowScanSheet] = useState(false);
  const [showKeysAlert, setShowKeysAlert] = useState(false);

  // Toggle navigation visibility when scan sheet is open to prevent layout overlap
  useEffect(() => {
    if (onToggleNav) {
      onToggleNav(!showScanSheet);
    }
    return () => {
      if (onToggleNav) {
        onToggleNav(true);
      }
    };
  }, [showScanSheet, onToggleNav]);

  // ── Scan state ──
  const [scanPhase, setScanPhase]   = useState<ScanPhase>('IDLE');
  const [scanError, setScanError]   = useState<string | null>(null);
  const [scanImage, setScanImage]   = useState<string | null>(null);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  // Reset scan if component re-receives logs (e.g. cloud sync) so a stale
  // SCANNING phase doesn't get stuck.
  useEffect(() => {
    if (scanPhase === 'SCANNING') return; // don't interrupt active scan
    setScanError(null);
  }, [player.nutritionLogs?.length, scanPhase]);

  // ── Limit editor handlers ──
  const openLimitEditor = useCallback(() => {
    setLimitInput(profile?.customCalorieLimit ? String(profile.customCalorieLimit) : '');
    setShowLimitEditor(true);
  }, [profile?.customCalorieLimit]);

  const setCustomLimit = useCallback(() => {
    const val = parseInt(limitInput, 10);
    if (!profile || !Number.isFinite(val) || val < 800 || val > 10000) return;
    onSaveProfile({ ...profile, customCalorieLimit: val }, profile.category || 'Hunter');
    setShowLimitEditor(false);
  }, [limitInput, profile, onSaveProfile]);

  const resetCustomLimit = useCallback(() => {
    if (!profile) return;
    onSaveProfile({ ...profile, customCalorieLimit: undefined }, profile.category || 'Hunter');
    setShowLimitEditor(false);
  }, [profile, onSaveProfile]);

  // ── Scan flow ──────────────────────────────────────────────────────────
  // Mirrors HealthView's two-path scanner: native CapCamera on Capacitor,
  // hidden <input type=file> on web. Server enforces the 1-key gate; we do
  // a pre-check purely for UX so we don't open the camera with no keys.
  // ───────────────────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async (compressedDataUrl: string) => {
    setScanPhase('SCANNING');
    setScanImage(compressedDataUrl);
    setScanError(null);
    try {
      const imageBase64 = compressedDataUrl.split(',')[1];
      const res = await authenticatedFetch(`${API_BASE}/api/nutrition/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getPlayerAuthHeaders() },
        body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Analyze failed (${res.status})`);
      }
      const { data } = await res.json();
      const food: FoodItem = {
        id: 'scan_' + Date.now(),
        name: data.name || 'Analyzed Meal',
        calories: Math.round(data.calories || 0),
        protein:  Math.round(data.protein_g || 0),
        carbs:    Math.round(data.carbs_g   || 0),
        fats:     Math.round(data.fats_g    || 0),
        servingSize: data.serving_size || '1 meal',
      };
      const hour = new Date().getHours();
      const mealType: MealType =
        hour < 11 ? 'BREAKFAST' :
        hour < 15 ? 'LUNCH'     :
        hour < 18 ? 'SNACK'     : 'DINNER';

      onLogMeal({
        id: Math.random().toString(36).slice(2, 11),
        label: food.name,
        items: [{ ...food, quantity: 1 }],
        totalCalories: food.calories,
        totalProtein:  food.protein,
        totalCarbs:    food.carbs,
        totalFats:     food.fats,
        timestamp: Date.now(),
        imageUrl: compressedDataUrl,
        mealType,
      });
      setScanPhase('IDLE');
      setScanImage(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed';
      console.error('[NutritionLogCard scan]', msg);
      setScanError(msg);
      setScanPhase('ERROR');
    }
  }, [onLogMeal]);

  const startCameraScan = useCallback(async () => {
    if ((player.keys ?? 0) < 1) { setShowKeysAlert(true); return; }
    setShowScanSheet(false);
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 800,
      });
      if (!photo.dataUrl) return;
      const compressed = await compressImage(photo.dataUrl);
      await runAnalysis(compressed);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e?.message?.includes('not implemented') || e?.message?.includes('not available') || e?.code === 'UNIMPLEMENTED') {
        // Web — fall back to file input.
        fileInputRef.current?.click();
        return;
      }
      if (e?.message?.includes('cancel')) return; // user dismissed picker
      setScanError(e?.message || 'Camera unavailable');
      setScanPhase('ERROR');
    }
  }, [player.keys, runAnalysis]);

  const startGalleryScan = useCallback(async () => {
    if ((player.keys ?? 0) < 1) { setShowKeysAlert(true); return; }
    setShowScanSheet(false);
    try {
      const photo = await CapCamera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
        width: 800,
      });
      if (!photo.dataUrl) return;
      const compressed = await compressImage(photo.dataUrl);
      await runAnalysis(compressed);
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e?.message?.includes('not implemented') || e?.message?.includes('not available') || e?.code === 'UNIMPLEMENTED') {
        fileInputRef.current?.click();
        return;
      }
      if (e?.message?.includes('cancel')) return;
      setScanError(e?.message || 'Gallery unavailable');
      setScanPhase('ERROR');
    }
  }, [player.keys, runAnalysis]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if ((player.keys ?? 0) < 1) { setShowKeysAlert(true); return; }
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const compressed = await compressImage(dataUrl);
      await runAnalysis(compressed);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setScanError(msg);
      setScanPhase('ERROR');
    }
  }, [player.keys, runAnalysis]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <section
        aria-label="Nutrition"
        style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        {/* HEADER — NUTRITION ●  ACTIVE  + reset-limit gear */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 4px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: COLOR.cyanBright,
              boxShadow: `0 0 8px ${COLOR.cyan}`,
            }} />
            <span style={{
              fontWeight: 700, fontSize: 11,
              letterSpacing: '0.32em',
              color: COLOR.cyan,
              textShadow: `0 0 6px ${COLOR.cyanDim}`,
            }}>NUTRITION</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
              fontWeight: 700, fontSize: 11,
              letterSpacing: '0.32em',
              color: COLOR.textMute,
            }}>ACTIVE</span>
            <button
              type="button"
              onClick={openLimitEditor}
              aria-label="Reset calorie limit"
              title="Reset calorie limit"
              style={{
                width: 22, height: 22, borderRadius: 6,
                background: 'transparent',
                border: `1px solid ${COLOR.borderSoft}`,
                color: COLOR.textMute,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Settings size={11} />
            </button>
          </div>
        </div>

        {/* RING + MACROS CARD */}
        <div style={{
          background: COLOR.panel,
          border: `1px solid ${COLOR.border}`,
          borderRadius: 16,
          padding: '18px 18px',
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <ConcentricRings
            size={140}
            consumed={dailyIntake.calories}
            target={targets.calories}
            carbsPct={carbsPct}
            proteinPct={proteinPct}
            fatsPct={fatsPct}
          />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <MacroRow color={COLOR.carb}    label="CARBS"   valueG={dailyIntake.carbs}   />
            <MacroRow color={COLOR.protein} label="PROTEIN" valueG={dailyIntake.protein} />
            <MacroRow color={COLOR.fat}     label="FATS"    valueG={dailyIntake.fats}    />
          </div>
        </div>

        {/* INLINE LIMIT EDITOR */}
        <AnimatePresence>
          {showLimitEditor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: COLOR.panel,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 14,
                padding: 14,
              }}>
                <div style={{
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 10, letterSpacing: '0.28em',
                  color: COLOR.cyan, marginBottom: 8,
                }}>CUSTOM CALORIE LIMIT</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    placeholder={String(targets.calories)}
                    min={800}
                    max={10000}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.5)',
                      border: `1px solid ${COLOR.borderSoft}`,
                      borderRadius: 10,
                      padding: '8px 12px',
                      color: COLOR.textHi,
                      fontFamily: 'monospace',
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={setCustomLimit}
                    style={{
                      padding: '8px 14px', borderRadius: 10,
                      background: 'rgba(0,212,255,0.12)',
                      border: `1px solid ${COLOR.border}`,
                      color: COLOR.cyan,
                      fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                      fontWeight: 700, fontSize: 11, letterSpacing: '0.22em',
                      cursor: 'pointer', whiteSpace: 'nowrap',
                    }}
                  >SET</button>
                </div>
                {profile?.customCalorieLimit && (
                  <button
                    type="button"
                    onClick={resetCustomLimit}
                    style={{
                      marginTop: 8, width: '100%',
                      padding: '7px 0', borderRadius: 10,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${COLOR.borderSoft}`,
                      color: COLOR.textMute,
                      fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                      fontWeight: 700, fontSize: 10, letterSpacing: '0.22em',
                      cursor: 'pointer',
                    }}
                  >RESET TO AUTO</button>
                )}
                <div style={{
                  marginTop: 8, fontSize: 9, color: COLOR.textMute,
                  fontFamily: 'monospace',
                }}>Min 800 · Max 10,000 kcal</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SCANNING STATE INLINE — shows a live preview while waiting */}
        <AnimatePresence>
          {scanPhase === 'SCANNING' && scanImage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              style={{
                position: 'relative',
                background: '#000',
                border: `1px solid ${COLOR.cyan}`,
                borderRadius: 14,
                overflow: 'hidden',
                aspectRatio: '4 / 3',
                boxShadow: `0 0 24px rgba(0, 212, 255, 0.25)`,
              }}
            >
              <img src={scanImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
              <motion.div
                aria-hidden="true"
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
                style={{
                  position: 'absolute', left: 0, right: 0, height: 2,
                  background: COLOR.cyan,
                  boxShadow: `0 0 14px ${COLOR.cyan}, 0 0 8px #fff`,
                }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.7)',
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: 10,
                  padding: '8px 14px',
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: COLOR.cyan,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.28em',
                }}>
                  <Loader2 size={14} className="animate-spin" />
                  SCANNING FOOD
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {scanPhase === 'ERROR' && scanError && (
          <div style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.35)',
            borderRadius: 12,
            padding: '8px 12px',
            color: '#fca5a5',
            fontFamily: 'monospace', fontSize: 11,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            <span style={{ flex: 1 }}>{scanError}</span>
            <button
              type="button"
              onClick={() => { setScanPhase('IDLE'); setScanError(null); setScanImage(null); }}
              style={{
                background: 'transparent', border: 'none', color: '#fca5a5',
                cursor: 'pointer', padding: 4,
              }}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* RECENT LOGS */}
        {visibleLogs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleLogs.map(l => (
              <LogRow key={l.id} log={l} onClick={() => setSelectedLog(l)} />
            ))}
            {hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllLogs(true)}
                style={{
                  background: 'transparent',
                  border: `1px solid ${COLOR.borderSoft}`,
                  borderRadius: 12,
                  padding: '8px 0',
                  color: COLOR.cyan,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.28em',
                  cursor: 'pointer',
                }}
              >VIEW MORE ({hiddenCount})</button>
            )}
          </div>
        )}

        {/* SCAN FOOD trigger — HUD-style chamfered plate (matches Enter Dungeon).
            Full width to match the dungeon button style. */}
        <div style={{
          width: '100%',
          margin: '2px 0 0',
          opacity: scanPhase === 'SCANNING' ? 0.55 : 1,
          pointerEvents: scanPhase === 'SCANNING' ? 'none' : 'auto',
        }}>
          <HudButton
            label="SCAN FOOD"
            icon={<ScanLine size={16} strokeWidth={2.2} />}
            onClick={() => setShowScanSheet(true)}
            ratio={5.5}
            ariaLabel="Scan food"
          />
        </div>

        {/* Hidden file input — web fallback when CapCamera is unavailable */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </section>

      {/* ── Scan source action sheet ─────────────────────────────────── */}
      <AnimatePresence>
        {showScanSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowScanSheet(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9990,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0,  opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420,
                background: COLOR.panel,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 18,
                padding: 18,
                display: 'flex', flexDirection: 'column', gap: 10,
                boxShadow: '0 -10px 40px rgba(0, 212, 255, 0.18)',
              }}
            >
              <div style={{
                fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                fontWeight: 700, fontSize: 11, letterSpacing: '0.32em',
                color: COLOR.cyan, marginBottom: 4, textAlign: 'center',
              }}>SCAN FOOD · 1 KEY</div>
              <button
                type="button"
                onClick={startCameraScan}
                style={{
                  width: '100%', padding: '14px 0',
                  background: 'rgba(0,212,255,0.06)',
                  border: `1px solid ${COLOR.cyan}`,
                  borderRadius: 12,
                  color: COLOR.cyan,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 14, letterSpacing: '0.24em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  cursor: 'pointer',
                }}
              >
                <CameraIcon size={18} /> OPEN CAMERA
              </button>
              <button
                type="button"
                onClick={startGalleryScan}
                style={{
                  width: '100%', padding: '14px 0',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${COLOR.borderSoft}`,
                  borderRadius: 12,
                  color: COLOR.textHi,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 14, letterSpacing: '0.24em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={18} /> UPLOAD IMAGE
              </button>
              <button
                type="button"
                onClick={() => setShowScanSheet(false)}
                style={{
                  width: '100%', padding: '12px 0', marginTop: 4,
                  background: 'transparent',
                  border: 'none',
                  color: COLOR.textMute,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 11, letterSpacing: '0.28em',
                  cursor: 'pointer',
                }}
              >CANCEL</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── No-keys alert ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showKeysAlert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowKeysAlert(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9995,
              background: 'rgba(0,0,0,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 24,
            }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 360,
                background: COLOR.panel,
                border: `1px solid ${COLOR.cyan}`,
                borderRadius: 18,
                padding: 28,
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.3)',
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: '#000',
                border: `1px solid ${COLOR.cyan}`,
                margin: '0 auto 18px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 20px rgba(0, 212, 255, 0.4)',
              }}>
                <Lock size={26} color={COLOR.cyan} />
              </div>
              <div style={{
                fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                fontWeight: 700, fontSize: 16, letterSpacing: '0.18em',
                color: COLOR.textHi, marginBottom: 6,
              }}>KEYS DEPLETED</div>
              <div style={{
                fontFamily: 'monospace', fontSize: 11,
                color: COLOR.textLo, lineHeight: 1.6, marginBottom: 18,
              }}>
                Insufficient keys for food scan.<br />
                Earn more from quests or buy in the store.
              </div>
              <button
                type="button"
                onClick={() => setShowKeysAlert(false)}
                style={{
                  width: '100%', padding: '12px 0',
                  background: COLOR.cyan, color: '#000',
                  border: 'none', borderRadius: 10,
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.28em',
                  cursor: 'pointer',
                }}
              >ACKNOWLEDGE</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All logs modal (View More) ───────────────────────────────── */}
      <AnimatePresence>
        {showAllLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAllLogs(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9990,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 420,
                maxHeight: '80vh',
                background: COLOR.panel,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 18,
                padding: 18,
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.2)',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 12,
              }}>
                <div style={{
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 12, letterSpacing: '0.32em',
                  color: COLOR.cyan,
                }}>ALL FOOD LOGS</div>
                <button
                  type="button"
                  onClick={() => setShowAllLogs(false)}
                  aria-label="Close"
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${COLOR.borderSoft}`,
                    color: COLOR.textLo,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{
                overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10,
                paddingRight: 4,
              }}>
                {recentLogs.length === 0 ? (
                  <div style={{ textAlign: 'center', color: COLOR.textMute, padding: 32, fontFamily: 'monospace', fontSize: 12 }}>
                    No food logs yet.
                  </div>
                ) : recentLogs.map(l => (
                  <LogRow key={l.id} log={l} onClick={() => { setShowAllLogs(false); setSelectedLog(l); }} />
                ))}
              </div>
              {onOpenFullNutrition && (
                <button
                  type="button"
                  onClick={() => { setShowAllLogs(false); onOpenFullNutrition(); }}
                  style={{
                    marginTop: 12, padding: '10px 0',
                    background: 'transparent',
                    border: `1px solid ${COLOR.borderSoft}`,
                    borderRadius: 12,
                    color: COLOR.textLo,
                    fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                    fontWeight: 700, fontSize: 10, letterSpacing: '0.28em',
                    cursor: 'pointer',
                  }}
                >OPEN FULL NUTRITION VIEW</button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Single-log details modal ─────────────────────────────────── */}
      <AnimatePresence>
        {selectedLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedLog(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 9992,
              background: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 380,
                background: COLOR.panel,
                border: `1px solid ${COLOR.border}`,
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 0 40px rgba(0, 212, 255, 0.22)',
              }}
            >
              {selectedLog.imageUrl && (
                <div style={{ position: 'relative', height: 160 }}>
                  <img src={selectedLog.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `linear-gradient(to top, ${COLOR.panel} 0%, transparent 70%)`,
                  }} />
                </div>
              )}
              <div style={{ padding: 22 }}>
                <div style={{
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontSize: 10, letterSpacing: '0.3em', color: COLOR.cyan,
                  fontWeight: 700, marginBottom: 4,
                }}>
                  {new Date(selectedLog.timestamp).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
                <div style={{
                  fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                  fontWeight: 700, fontSize: 20, color: COLOR.textHi,
                  marginBottom: 18, lineHeight: 1.2,
                }}>{selectedLog.label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 18 }}>
                  {[
                    { l: 'KCAL',  v: selectedLog.totalCalories, c: COLOR.cyan },
                    { l: 'PRO',   v: selectedLog.totalProtein,  c: COLOR.protein },
                    { l: 'CARB',  v: selectedLog.totalCarbs,    c: COLOR.carb },
                    { l: 'FAT',   v: selectedLog.totalFats,     c: COLOR.fat },
                  ].map(m => (
                    <div key={m.l} style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${COLOR.borderSoft}`,
                      borderRadius: 10, padding: '10px 4px',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        fontFamily: 'monospace', fontSize: 9,
                        color: COLOR.textMute, marginBottom: 4,
                      }}>{m.l}</div>
                      <div style={{
                        fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                        fontWeight: 700, fontSize: 16, color: m.c,
                      }}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  style={{
                    width: '100%', padding: '12px 0',
                    background: 'rgba(0,212,255,0.08)',
                    border: `1px solid ${COLOR.border}`,
                    borderRadius: 10,
                    color: COLOR.cyan,
                    fontFamily: "'Rajdhani', 'Bai Jamjuree', sans-serif",
                    fontWeight: 700, fontSize: 12, letterSpacing: '0.28em',
                    cursor: 'pointer',
                  }}
                >CLOSE</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NutritionLogCard;
