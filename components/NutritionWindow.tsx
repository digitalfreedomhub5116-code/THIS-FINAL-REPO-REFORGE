/**
 * NutritionWindow.tsx
 *
 * Futuristic dashboard tile that gamifies food logging:
 *   ┌─ Today's Nutrition ─────────────────────────────────┐
 *   │  Breakfast    [ Log food ] / [ ✓ 480 kcal ]         │
 *   │  Lunch        [ Log food ] / [ ✓ 720 kcal ]         │
 *   │  Dinner       [ Log food ] / [ ✓ 610 kcal ]         │
 *   │  Total: 1810 / 2400 kcal      Today's XP: +90       │
 *   └─────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *  - "Log food" opens the existing food scanner (HEALTH → NUTRITION sub-tab).
 *    The scanner is the single source of truth for a logged meal — when it
 *    fires `meal:logged`, the matching slot here flips to "logging" (dramatic
 *    cyan progress sweep), then to ✓ checked + kcal.
 *  - +30 XP per scanned food. +50 bonus XP if the meal stays at-or-under its
 *    per-meal cap derived from `player.healthProfile.macros.calories`
 *    (default split 30/40/30 for breakfast/lunch/dinner).
 *  - All XP runs through the shared `addRewards` pipeline, so it counts
 *    toward level / daily XP exactly like a workout or quest.
 *  - The slot's tick + kcal mirror the real `nutritionLogs` array, so closing
 *    the app and re-opening still shows today's progress correctly.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MealLog, MealType, PlayerData } from '../types';

interface NutritionWindowProps {
  player: PlayerData;
  /** Open the existing scanner inside the Health/Nutrition sub-tab. */
  onOpenScanner: (slot: MealType) => void;
  /** Award XP through the shared pipeline so it counts toward level/daily XP. */
  onAddRewards: (gold: number, xp: number) => void;
}

const CYAN = '#00d4ff';
const CYAN_DIM = 'rgba(0, 212, 255, 0.55)';
const CYAN_FAINT = 'rgba(0, 212, 255, 0.18)';

const SLOTS: { key: MealType; label: string }[] = [
  { key: 'BREAKFAST', label: 'Breakfast' },
  { key: 'LUNCH', label: 'Lunch' },
  { key: 'DINNER', label: 'Dinner' },
];

// Default per-meal share of the daily calorie target.
// Overridden by HealthView's own per-meal target if set elsewhere.
const PER_MEAL_SHARE: Record<MealType, number> = {
  BREAKFAST: 0.30,
  LUNCH: 0.40,
  DINNER: 0.30,
  SNACK: 0.10,
};

const todayLocalDate = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

interface SlotState {
  meal: MealLog | null; // most-recent meal logged for this slot today
  loading: boolean;     // dramatic loading sweep in progress
}

const NutritionWindow: React.FC<NutritionWindowProps> = ({ player, onOpenScanner, onAddRewards }) => {
  const todayStr = todayLocalDate(Date.now());

  // ── Per-meal calorie cap (threshold for the +50 bonus) ─────────────────
  const dailyCap = Math.max(0, player.healthProfile?.macros?.calories || 0);
  const slotCap = (slot: MealType) => Math.round(dailyCap * (PER_MEAL_SHARE[slot] || 0.3));

  // ── Today's logged meals, indexed by slot (latest wins) ────────────────
  const todaysBySlot = useMemo(() => {
    const out: Partial<Record<MealType, MealLog>> = {};
    for (const m of player.nutritionLogs || []) {
      if (todayLocalDate(m.timestamp) !== todayStr) continue;
      const slot = (m.mealType || inferSlotFromTime(m.timestamp)) as MealType;
      const prev = out[slot];
      if (!prev || m.timestamp > prev.timestamp) out[slot] = m;
    }
    return out;
  }, [player.nutritionLogs, todayStr]);

  // ── Local UI state for the dramatic loading sweep ──────────────────────
  const [pending, setPending] = useState<Partial<Record<MealType, boolean>>>({});
  const seenMealIdsRef = useRef<Set<string>>(new Set(
    (player.nutritionLogs || []).map(m => m.id),
  ));
  // Track which meals we've already paid out for (one award per meal id).
  const awardedRef = useRef<Set<string>>(new Set());

  // Listen for the global `meal:logged` event the App-level wrapper dispatches.
  // The single dashboard listener handles the loading→ack transition for any
  // slot, and triggers the XP award through the shared pipeline.
  useEffect(() => {
    const onMealLogged = (e: Event) => {
      const meal = (e as CustomEvent<MealLog>).detail;
      if (!meal) return;
      const slot = (meal.mealType || inferSlotFromTime(meal.timestamp)) as MealType;
      // Show the dramatic sweep for ~900ms before the tick lands.
      setPending(prev => ({ ...prev, [slot]: true }));
      window.setTimeout(() => {
        setPending(prev => ({ ...prev, [slot]: false }));
      }, 900);

      // Pay XP exactly once per meal id.
      if (!awardedRef.current.has(meal.id)) {
        awardedRef.current.add(meal.id);
        const cap = slotCap(slot);
        const baseXp = 30;
        const bonusXp = cap > 0 && meal.totalCalories <= cap ? 50 : 0;
        onAddRewards(0, baseXp + bonusXp);
      }
      seenMealIdsRef.current.add(meal.id);
    };
    window.addEventListener('meal:logged', onMealLogged as EventListener);
    return () => window.removeEventListener('meal:logged', onMealLogged as EventListener);
  }, [onAddRewards]);

  // Aggregate totals
  const todayTotalKcal = SLOTS.reduce((sum, s) => sum + (todaysBySlot[s.key]?.totalCalories || 0), 0);
  const todayXp = SLOTS.reduce((sum, s) => {
    const m = todaysBySlot[s.key];
    if (!m) return sum;
    const cap = slotCap(s.key);
    const bonus = cap > 0 && m.totalCalories <= cap ? 50 : 0;
    return sum + 30 + bonus;
  }, 0);

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 14,
        padding: '14px 14px 12px',
        background:
          'linear-gradient(180deg, rgba(4,10,20,0.92) 0%, rgba(2,6,12,0.94) 100%)',
        border: `1.5px solid ${CYAN_DIM}`,
        boxShadow:
          `0 0 18px ${CYAN_FAINT}, inset 0 0 14px rgba(0, 212, 255, 0.05)`,
        overflow: 'hidden',
      }}
    >
      {/* corner ticks for the futuristic chrome look */}
      <CornerTicks />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <span
          style={{
            fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '0.22em',
            color: '#ffffff',
            textShadow: `0 0 6px ${CYAN_DIM}`,
          }}
        >
          TODAY'S NUTRITION
        </span>
        <span
          style={{
            fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.2em',
            color: CYAN,
            textShadow: `0 0 6px ${CYAN_DIM}`,
          }}
        >
          +{todayXp} XP
        </span>
      </div>

      {/* Slot rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {SLOTS.map(slot => {
          const meal = todaysBySlot[slot.key] || null;
          const loading = !!pending[slot.key];
          return (
            <NutritionRow
              key={slot.key}
              label={slot.label}
              kcal={meal?.totalCalories ?? null}
              cap={slotCap(slot.key)}
              loading={loading}
              ackBonus={!!meal && slotCap(slot.key) > 0 && meal.totalCalories <= slotCap(slot.key)}
              onLog={() => onOpenScanner(slot.key)}
            />
          );
        })}
      </div>

      {/* Footer total */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${CYAN_FAINT}`,
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
        }}
      >
        <span style={{ fontSize: 11, letterSpacing: '0.2em', color: 'rgba(220,240,250,0.65)', fontWeight: 700 }}>
          DAILY TOTAL
        </span>
        <span style={{ fontSize: 13, color: '#ffffff', fontWeight: 700, textShadow: `0 0 6px ${CYAN_DIM}` }}>
          {todayTotalKcal.toLocaleString()}{' '}
          <span style={{ color: 'rgba(220,240,250,0.55)', fontWeight: 600 }}>
            / {dailyCap > 0 ? dailyCap.toLocaleString() : '—'} kcal
          </span>
        </span>
      </div>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers + sub-components
// ──────────────────────────────────────────────────────────────────────────

function inferSlotFromTime(ts: number): MealType {
  const h = new Date(ts).getHours();
  if (h >= 5 && h < 11) return 'BREAKFAST';
  if (h >= 11 && h < 16) return 'LUNCH';
  if (h >= 16 && h < 23) return 'DINNER';
  return 'SNACK';
}

const CornerTicks: React.FC = () => {
  const tickStyle = (extra: React.CSSProperties): React.CSSProperties => ({
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: CYAN,
    pointerEvents: 'none',
    ...extra,
  });
  return (
    <>
      <span style={tickStyle({ top: 6, left: 6, borderTop: `1.5px solid ${CYAN}`, borderLeft: `1.5px solid ${CYAN}` })} />
      <span style={tickStyle({ top: 6, right: 6, borderTop: `1.5px solid ${CYAN}`, borderRight: `1.5px solid ${CYAN}` })} />
      <span style={tickStyle({ bottom: 6, left: 6, borderBottom: `1.5px solid ${CYAN}`, borderLeft: `1.5px solid ${CYAN}` })} />
      <span style={tickStyle({ bottom: 6, right: 6, borderBottom: `1.5px solid ${CYAN}`, borderRight: `1.5px solid ${CYAN}` })} />
    </>
  );
};

interface NutritionRowProps {
  label: string;
  kcal: number | null;
  cap: number;
  loading: boolean;
  ackBonus: boolean;
  onLog: () => void;
}

const NutritionRow: React.FC<NutritionRowProps> = ({ label, kcal, cap, loading, ackBonus, onLog }) => {
  const isLogged = kcal !== null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '8px 10px',
        background: 'rgba(0, 212, 255, 0.04)',
        border: `1px solid ${CYAN_FAINT}`,
        borderRadius: 8,
      }}
    >
      {/* Cyan tick / empty checkbox */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          border: `1.5px solid ${isLogged ? CYAN : CYAN_DIM}`,
          background: isLogged ? CYAN : 'transparent',
          boxShadow: isLogged ? `0 0 10px ${CYAN_DIM}` : 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 240ms ease',
        }}
        aria-hidden="true"
      >
        <AnimatePresence>
          {isLogged && (
            <motion.svg
              key="tick"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path d="M5 12.5 L10 17 L19 7" stroke="#040a14" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.16em',
            color: '#ffffff',
          }}
        >
          {label.toUpperCase()}
        </span>
        {isLogged && (
          <span
            style={{
              fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(220,240,250,0.6)',
              letterSpacing: '0.06em',
              marginTop: 1,
            }}
          >
            {kcal!.toLocaleString()} kcal
            {cap > 0 && ackBonus && <span style={{ color: CYAN, marginLeft: 6, fontWeight: 700 }}>+50 bonus</span>}
          </span>
        )}
      </div>

      {/* Right side: action button OR loading sweep OR done badge */}
      <div style={{ minWidth: 96, display: 'flex', justifyContent: 'flex-end' }}>
        {loading ? (
          <LoadingSweep />
        ) : isLogged ? (
          <DoneBadge />
        ) : (
          <button
            type="button"
            onClick={onLog}
            style={{
              fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.18em',
              color: CYAN,
              background: 'rgba(0, 212, 255, 0.08)',
              border: `1px solid ${CYAN_DIM}`,
              borderRadius: 6,
              padding: '6px 12px',
              cursor: 'pointer',
              boxShadow: `0 0 8px ${CYAN_FAINT}`,
              textTransform: 'uppercase',
            }}
          >
            Log food
          </button>
        )}
      </div>
    </div>
  );
};

const LoadingSweep: React.FC = () => (
  <div
    style={{
      width: 90,
      height: 28,
      position: 'relative',
      borderRadius: 6,
      border: `1px solid ${CYAN_DIM}`,
      overflow: 'hidden',
      background: 'rgba(0, 212, 255, 0.06)',
    }}
    aria-label="Logging meal"
  >
    <motion.div
      initial={{ x: '-100%' }}
      animate={{ x: '100%' }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(90deg, transparent 0%, ${CYAN} 50%, transparent 100%)`,
        opacity: 0.45,
      }}
    />
    <span
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
        fontSize: 10,
        letterSpacing: '0.22em',
        color: CYAN,
        fontWeight: 700,
      }}
    >
      LOGGING…
    </span>
  </div>
);

const DoneBadge: React.FC = () => (
  <span
    style={{
      fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
      fontSize: 10,
      letterSpacing: '0.22em',
      color: CYAN,
      fontWeight: 700,
      padding: '4px 10px',
      border: `1px solid ${CYAN_DIM}`,
      borderRadius: 6,
      background: 'rgba(0, 212, 255, 0.08)',
      textShadow: `0 0 6px ${CYAN_DIM}`,
    }}
  >
    LOGGED
  </span>
);

export default NutritionWindow;
