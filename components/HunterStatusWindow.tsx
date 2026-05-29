/**
 * HunterStatusWindow.tsx
 *
 * Solo Leveling–style "STATUS" panel rendered as a hybrid raster + HTML
 * overlay:
 *
 *   Layer 1 (back):  <img src="/assets/status-frame.jpg" />  (1024 × 583)
 *   Layer 2:         absolutely-positioned safe-zone overlay (insets 14/8/14/8 %)
 *   Layer 3 (front): STATUS title plate, LEVEL / STREAK row, XP bar,
 *                    6-stat grid (STR / INT, DIS / SOC, FOC / WIL).
 *
 * Stats render exclusively from the cumulative `player.stats` totals.
 * Daily / weekly / monthly stat slices are intentionally not consulted —
 * this is the universal hunter sheet.
 *
 * Reversibility: gated by HUNTER_STATUS_WINDOW_ENABLED in App.tsx. The
 * legacy PlayerStatusCard is left untouched, so flipping the flag back
 * to `false` restores the prior dashboard with no migration.
 *
 * The component is a single file. Component-scoped CSS lives in an
 * inline <style> tag emitted once on first mount; no companion .css /
 * .module.css file is created.
 */
import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { CoreStats, PlayerData } from '../types';

interface HunterStatusWindowProps {
  player: PlayerData;
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers (exported via test only — kept module-private at runtime).
// ────────────────────────────────────────────────────────────────────────────

function safeNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return value;
}

function formatNum(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  return Math.floor(n).toLocaleString();
}

interface ViewModel {
  level: number;
  currentXp: number;
  requiredXp: number;
  xpPct: number;
  streak: number;
  stats: CoreStats;
}

function deriveViewModel(player: PlayerData): ViewModel {
  const level = Math.max(1, safeNumber(player?.level, 1));
  const currentXp = Math.max(0, safeNumber(player?.currentXp, 0));
  const requiredXp = Math.max(1, safeNumber(player?.requiredXp, 100));
  const streak = Math.max(0, safeNumber(player?.streak, 0));
  const xpPct = Math.min(100, Math.round((currentXp / requiredXp) * 100));

  const raw = (player?.stats || {}) as Partial<CoreStats>;
  const stats: CoreStats = {
    strength: Math.max(0, safeNumber(raw.strength, 0)),
    intelligence: Math.max(0, safeNumber(raw.intelligence, 0)),
    discipline: Math.max(0, safeNumber(raw.discipline, 0)),
    social: Math.max(0, safeNumber(raw.social, 0)),
    focus: Math.max(0, safeNumber(raw.focus, 0)),
    willpower: Math.max(0, safeNumber(raw.willpower, 0)),
  };

  return { level, currentXp, requiredXp, xpPct, streak, stats };
}

// ────────────────────────────────────────────────────────────────────────────
// Stat metadata.
// ────────────────────────────────────────────────────────────────────────────

const STAT_LABEL: Record<keyof CoreStats, string> = {
  strength: 'STR',
  intelligence: 'INT',
  discipline: 'DIS',
  social: 'SOC',
  focus: 'FOC',
  willpower: 'WIL',
};

// Row-major 2x3 grid: STR/INT, DIS/SOC, FOC/WIL.
const STAT_ORDER: (keyof CoreStats)[] = [
  'strength',
  'intelligence',
  'discipline',
  'social',
  'focus',
  'willpower',
];

// ────────────────────────────────────────────────────────────────────────────
// Component-scoped CSS (single file constraint — emitted once on mount).
// ────────────────────────────────────────────────────────────────────────────

const STYLES_ID = 'hsw-component-styles';

const STYLES_CSS = `
.hsw-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1024 / 583;
  user-select: none;
  font-family: 'Rajdhani', 'Bai Jamjuree', monospace, sans-serif;
}
.hsw-motion {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  will-change: transform, filter;
}
.hsw-frame,
.hsw-frame-fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  pointer-events: none;
}
.hsw-frame { object-fit: fill; }
.hsw-frame-fallback {
  background: linear-gradient(180deg, #060d18 0%, #02060c 100%);
  border: 1.5px solid #00d4ff;
  box-shadow:
    0 0 18px rgba(0, 212, 255, 0.35),
    inset 0 0 16px rgba(0, 212, 255, 0.08);
}

.hsw-safezone {
  position: absolute;
  /* Tightened from 14/14 to 10/9 — the actual frame's decorative bands
     are narrower than the spec's worst-case padding, so we reclaim the
     vertical room here for the 3-row stats grid. */
  top: 10%;
  right: 8%;
  bottom: 9%;
  left: 8%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2px;
  padding: 4px 4px 2px;
  background: rgba(4, 10, 20, 0.55);
  backdrop-filter: blur(2px) saturate(110%);
  -webkit-backdrop-filter: blur(2px) saturate(110%);
  border-radius: 2px;
}

.hsw-title-plate {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 4px 18px;
  background: rgba(4, 10, 20, 0.92);
  border: 1.5px solid #00d4ff;
  border-radius: 2px;
  box-shadow:
    0 0 10px rgba(0, 212, 255, 0.35),
    inset 0 0 8px rgba(0, 212, 255, 0.18);
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.32em;
  color: #ffffff;
  text-shadow: 0 0 6px rgba(0, 212, 255, 0.55);
  white-space: nowrap;
  z-index: 2;
}

.hsw-row {
  display: flex;
  align-items: center;
}
.hsw-row-level {
  justify-content: space-between;
  gap: 12px;
  padding: 2px 4px 0;
}
.hsw-level-block { display: flex; align-items: baseline; gap: 8px; }
.hsw-streak-block { display: flex; align-items: baseline; gap: 8px; }
.hsw-level-num {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 36px;
  line-height: 1;
  color: #ffffff;
  text-shadow:
    0 0 14px rgba(0, 212, 255, 0.85),
    0 0 4px rgba(255, 255, 255, 0.5);
}
.hsw-level-label,
.hsw-streak-label {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.28em;
  color: rgba(220, 240, 250, 0.78);
}
.hsw-streak-num {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 18px;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.7);
}

.hsw-row-xp {
  display: grid;
  grid-template-columns: 22px 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}
.hsw-xp-label {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.24em;
  color: rgba(220, 240, 250, 0.78);
  text-align: center;
}
.hsw-xp-bar {
  position: relative;
  height: 10px;
  background: rgba(0, 212, 255, 0.06);
  border: 1px solid rgba(0, 212, 255, 0.55);
  border-radius: 2px;
  overflow: hidden;
  box-shadow: inset 0 0 8px rgba(0, 212, 255, 0.10);
}
.hsw-xp-bar-fill {
  position: absolute;
  inset: 0;
  width: var(--xp-pct, 0%);
  background: linear-gradient(
    90deg,
    rgba(0, 212, 255, 0.55) 0%,
    rgba(140, 230, 255, 0.95) 100%
  );
  box-shadow:
    0 0 12px rgba(0, 212, 255, 0.55),
    inset 0 0 6px rgba(255, 255, 255, 0.4);
  transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
}
.hsw-xp-bar-ticks {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent 0 16px,
    rgba(2, 8, 16, 0.55) 16px 17px
  );
  pointer-events: none;
}
.hsw-xp-readout {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 11px;
  text-align: right;
  white-space: nowrap;
}
.hsw-xp-current {
  color: #ffffff;
  text-shadow: 0 0 6px rgba(0, 212, 255, 0.6);
}
.hsw-xp-required {
  color: rgba(220, 240, 250, 0.55);
}

.hsw-divider {
  position: relative;
  height: 1px;
  margin: 2px 6px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(0, 212, 255, 0.55) 50%,
    transparent 100%
  );
}

.hsw-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: repeat(3, auto);
  column-gap: 22px;
  row-gap: 4px;
  padding: 2px 4px 0;
}
.hsw-stat-row {
  display: grid;
  grid-template-columns: 16px 1fr auto;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.hsw-stat-icon {
  width: 12px;
  height: 12px;
  flex: none;
}
.hsw-stat-label {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.2em;
  color: rgba(220, 240, 250, 0.78);
  white-space: nowrap;
}
.hsw-stat-value {
  font-family: 'Rajdhani', 'Bai Jamjuree', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.75);
  text-align: right;
  min-width: 28px;
}

/* Large phone */
@media (min-width: 480px) {
  .hsw-title-plate { font-size: 11px; padding: 5px 20px; }
  .hsw-level-num   { font-size: 42px; }
  .hsw-streak-num  { font-size: 22px; }
  .hsw-xp-bar      { height: 12px; }
  .hsw-stats-grid  { column-gap: 28px; row-gap: 6px; }
  .hsw-stat-icon   { width: 14px; height: 14px; }
  .hsw-stat-row    { grid-template-columns: 18px 1fr auto; }
  .hsw-stat-value  { font-size: 16px; }
}

/* Tablet */
@media (min-width: 768px) {
  .hsw-title-plate { font-size: 12px; padding: 6px 24px; }
  .hsw-level-num   { font-size: 56px; }
  .hsw-streak-num  { font-size: 26px; }
  .hsw-xp-bar      { height: 14px; }
  .hsw-stats-grid  { column-gap: 32px; row-gap: 8px; }
  .hsw-stat-icon   { width: 16px; height: 16px; }
  .hsw-stat-row    { grid-template-columns: 20px 1fr auto; }
  .hsw-stat-value  { font-size: 18px; }
}

/* Desktop */
@media (min-width: 1024px) {
  .hsw-level-num   { font-size: 64px; }
  .hsw-stats-grid  { column-gap: 40px; }
}

/* Reduced-motion: kill the XP fill transition (animation suppression on
   the motion wrapper is handled in JS via useReducedMotion). */
@media (prefers-reduced-motion: reduce) {
  .hsw-xp-bar-fill { transition: none !important; }
}
`;

function ensureStylesInjected(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLES_ID)) return;
  const style = document.createElement('style');
  style.id = STYLES_ID;
  style.textContent = STYLES_CSS;
  document.head.appendChild(style);
}

// ────────────────────────────────────────────────────────────────────────────
// Internal subcomponents.
// ────────────────────────────────────────────────────────────────────────────

const Divider: React.FC = () => <div className="hsw-divider" aria-hidden="true" />;

/**
 * Bold filled white SVG glyph with a soft white drop-shadow halo.
 * Per spec: fill: #ffffff, stroke: none. No outline-style icons.
 */
const StatIcon: React.FC<{ stat: keyof CoreStats }> = ({ stat }) => {
  const common = {
    className: 'hsw-stat-icon',
    viewBox: '0 0 24 24',
    fill: '#ffffff',
    stroke: 'none',
    filter: 'url(#hsw-icon-glow)',
    'aria-hidden': true as const,
  };

  switch (stat) {
    case 'strength':
      // Filled bolt — angular energy glyph.
      return (
        <svg {...common}>
          <path d="M12 2 L20 11 L14 11 L18 22 L4 12 L10 12 L6 2 Z" />
        </svg>
      );
    case 'intelligence':
      // Filled disc with cyan eye-dot (still purely filled, no stroke).
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="2.6" fill="#00d4ff" />
        </svg>
      );
    case 'discipline':
      // Filled shield.
      return (
        <svg {...common}>
          <path d="M12 2 L21 6 V12 C21 17 12 22 12 22 C12 22 3 17 3 12 V6 Z" />
        </svg>
      );
    case 'social':
      // Two overlapping filled circles.
      return (
        <svg {...common}>
          <circle cx="9" cy="10" r="5" />
          <circle cx="15" cy="14" r="5" />
        </svg>
      );
    case 'focus':
      // Filled bullseye — outer disc + cyan ring + center dot, all filled.
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="6" fill="#040a14" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'willpower':
      // Filled flame — broad teardrop with a curl.
      return (
        <svg {...common}>
          <path d="M12 22 C7 22 4 18 4 14 C4 10 7 7 8 3 C10 6 13 7 16 10 C19 13 19 18 16 20 C14 21.5 13 22 12 22 Z" />
        </svg>
      );
  }
};

const StatRow: React.FC<{ stat: keyof CoreStats; value: number }> = ({ stat, value }) => (
  <div className="hsw-stat-row">
    <StatIcon stat={stat} />
    <span className="hsw-stat-label">{STAT_LABEL[stat]}</span>
    <span className="hsw-stat-value">{formatNum(value)}</span>
  </div>
);

// ────────────────────────────────────────────────────────────────────────────
// Main component.
// ────────────────────────────────────────────────────────────────────────────

const HunterStatusWindow: React.FC<HunterStatusWindowProps> = ({ player }) => {
  const vm = deriveViewModel(player);
  const [frameLoaded, setFrameLoaded] = useState(true);
  const reduceMotion = useReducedMotion();
  const styleInjected = useRef(false);

  useEffect(() => {
    if (styleInjected.current) return;
    ensureStylesInjected();
    styleInjected.current = true;
  }, []);

  // Float keyframes — gentle Y bob plus a breathing cyan halo.
  const floatAnim = reduceMotion
    ? undefined
    : {
        y: [0, -3, 0, 3, 0],
        filter: [
          'drop-shadow(0 0 18px rgba(0, 212, 255, 0.22))',
          'drop-shadow(0 0 26px rgba(0, 212, 255, 0.55))',
          'drop-shadow(0 0 18px rgba(0, 212, 255, 0.22))',
        ],
      };

  const floatTransition = reduceMotion
    ? undefined
    : { duration: 6, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <div className="hsw-wrapper">
      {/* SVG <defs> for the filled-icon white glow filter — declared once. */}
      <svg
        width="0"
        height="0"
        style={{ position: 'absolute', width: 0, height: 0 }}
        aria-hidden="true"
      >
        <defs>
          <filter
            id="hsw-icon-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feFlood floodColor="#ffffff" floodOpacity="0.85" />
            <feComposite in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <motion.div
        className="hsw-motion"
        animate={floatAnim}
        transition={floatTransition}
      >
        {/* Layer 1: raster frame, or CSS fallback if the asset fails. */}
        {frameLoaded ? (
          <img
            className="hsw-frame"
            src="/assets/status-frame.jpg"
            alt=""
            aria-hidden="true"
            draggable={false}
            onError={() => setFrameLoaded(false)}
          />
        ) : (
          <div className="hsw-frame-fallback" aria-hidden="true" />
        )}

        {/* Layer 2: safe-zone overlay with translucent glass. */}
        <div className="hsw-safezone">
          <div className="hsw-title-plate">STATUS</div>

          {/* ── Row 1: LEVEL ‖ STREAK ── */}
          <div className="hsw-row hsw-row-level">
            <div className="hsw-level-block">
              <span className="hsw-level-num">{formatNum(vm.level)}</span>
              <span className="hsw-level-label">LEVEL</span>
            </div>
            <div className="hsw-streak-block">
              <span className="hsw-streak-label">STREAK</span>
              <span className="hsw-streak-num">{formatNum(vm.streak)}</span>
            </div>
          </div>

          <Divider />

          {/* ── Row 2: XP bar ── */}
          <div className="hsw-row-xp">
            <span className="hsw-xp-label">XP</span>
            <div
              className="hsw-xp-bar"
              role="progressbar"
              aria-valuenow={vm.xpPct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="XP progress"
              style={{ ['--xp-pct' as any]: `${vm.xpPct}%` }}
            >
              <div className="hsw-xp-bar-fill" />
              <div className="hsw-xp-bar-ticks" />
            </div>
            <span className="hsw-xp-readout">
              <span className="hsw-xp-current">{formatNum(vm.currentXp)}</span>
              <span className="hsw-xp-required"> / {formatNum(vm.requiredXp)}</span>
            </span>
          </div>

          <Divider />

          {/* ── Row 3: 6-stat grid (STR/INT, DIS/SOC, FOC/WIL) ── */}
          <div className="hsw-stats-grid">
            {STAT_ORDER.map((key) => (
              <StatRow key={key} stat={key} value={vm.stats[key]} />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HunterStatusWindow;
