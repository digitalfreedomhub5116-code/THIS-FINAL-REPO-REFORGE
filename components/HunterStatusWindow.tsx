/**
 * HunterStatusWindow.tsx
 *
 * A faithful Solo Leveling "STATUS" window — the floating cyan frame that
 * pops up in the show when a hunter checks their stat sheet. Used as a
 * drop-in replacement for the Growth Terminal at the top of the dashboard.
 *
 * Design checklist (matched against the reference still):
 *   • Outer rectangle frame with notched/chipped corners (rendered in SVG so
 *     the notches are pixel-perfect at any scale).
 *   • L-bracket alignment ticks at all 4 corners and at midpoints — these are
 *     the small offset rectangles that float just outside the main border.
 *   • Cyan stroke + soft outer glow filter so the frame reads as energy
 *     emission, not just a flat 1px outline.
 *   • Inset gritty diagonal scratch texture (faint white lines) for the
 *     screen-interference look.
 *   • Centered "STATUS" title plate that overlaps the top edge.
 *   • Three sections divided by hairline cyan rules with a small rotated
 *     square as a midpoint marker.
 *   • Subtle floating animation (~4px translate, 6s loop) and pulsing outer
 *     drop-shadow.
 *
 * Data shown (per the spec confirmed with the user):
 *   • Big LEVEL number on the left
 *   • Streak count on the right (no fire emoji)
 *   • Single XP bar with current/required readout
 *   • 6-stat grid: STR INT / DIS SOC / FOC WIL — these are the cumulative
 *     `player.stats` (universal totals, increase per quest/workout)
 *
 * No HP/MP bars, no "Job"/"Title" rows, no toggle.
 *
 * The component is fully self-contained (no external state, no plug-ins).
 * To revert the dashboard to the old Growth Terminal, flip the
 * HUNTER_STATUS_WINDOW_ENABLED feature flag in App.tsx — the old
 * PlayerStatusCard is left untouched.
 */
import React from 'react';
import { motion } from 'framer-motion';
import type { PlayerData } from '../types';

interface HunterStatusWindowProps {
  player: PlayerData;
}

// ── Theme tokens ────────────────────────────────────────────────────────────
const CYAN = '#00d4ff';
const CYAN_DIM = 'rgba(0, 212, 255, 0.55)';
const CYAN_FAINT = 'rgba(0, 212, 255, 0.22)';
const FRAME_BG = 'rgba(6, 12, 22, 0.92)';
const TEXT_PRIMARY = '#dff5ff';
const TEXT_DIM = 'rgba(196, 226, 240, 0.65)';
const TEXT_LABEL = 'rgba(174, 218, 235, 0.78)';

// Stat row config — order matches the SL window's left/right pairing.
const STAT_ROWS: { left: keyof PlayerData['stats']; right: keyof PlayerData['stats'] }[] = [
  { left: 'strength', right: 'intelligence' },
  { left: 'discipline', right: 'social' },
  { left: 'focus', right: 'willpower' },
];

const STAT_LABEL: Record<keyof PlayerData['stats'], string> = {
  strength: 'STR',
  intelligence: 'INT',
  discipline: 'DIS',
  social: 'SOC',
  focus: 'FOC',
  willpower: 'WIL',
};

// Tiny SVG icons next to each stat value — kept abstract on purpose, just
// enough to mimic the SL "icon + label : number" pattern without committing
// to a literal sword/heart that would feel off in a habit-tracking app.
const StatIcon: React.FC<{ stat: keyof PlayerData['stats'] }> = ({ stat }) => {
  const common = { stroke: CYAN, strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (stat) {
    case 'strength':
      // crossed energy lines
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M2 8 L14 8" {...common} />
          <path d="M5 5 L11 11 M11 5 L5 11" {...common} />
        </svg>
      );
    case 'intelligence':
      // brain dot cluster
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <circle cx="8" cy="8" r="5" {...common} />
          <circle cx="8" cy="8" r="1.5" stroke="none" fill={CYAN} />
        </svg>
      );
    case 'discipline':
      // shield outline
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 2 L13 4 V8 C13 11 8 14 8 14 C8 14 3 11 3 8 V4 Z" {...common} />
        </svg>
      );
    case 'social':
      // two arcs
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <circle cx="6" cy="6" r="2.5" {...common} />
          <circle cx="10" cy="10" r="2.5" {...common} />
        </svg>
      );
    case 'focus':
      // crosshair
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <circle cx="8" cy="8" r="4" {...common} />
          <path d="M8 1 V4 M8 12 V15 M1 8 H4 M12 8 H15" {...common} />
        </svg>
      );
    case 'willpower':
      // flame
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 14 C5 14 3 11.5 3 9 C3 6 5.5 4 6 1 C7 3.5 9 4.5 11 6.5 C13 8.5 13 12 11 13 C9.5 14 9 14 8 14 Z" {...common} />
        </svg>
      );
  }
};

const formatNum = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  return Math.max(0, Math.floor(n)).toLocaleString();
};

const HunterStatusWindow: React.FC<HunterStatusWindowProps> = ({ player }) => {
  const level = Math.max(1, player.level || 1);
  const currentXp = Math.max(0, player.currentXp || 0);
  const requiredXp = Math.max(1, player.requiredXp || 100);
  const xpPct = Math.min(100, Math.round((currentXp / requiredXp) * 100));
  const streak = Math.max(0, player.streak || 0);
  const stats = player.stats || ({} as PlayerData['stats']);

  return (
    <div
      className="relative w-full"
      style={{
        // Reserve a touch of vertical room above the frame for the floating
        // L-brackets and the STATUS title plate that overhangs the top edge.
        paddingTop: 14,
        paddingBottom: 10,
      }}
    >
      <motion.div
        // Subtle floating animation — small Y-bob + breathing glow.
        animate={{
          y: [0, -3, 0, 3, 0],
          filter: [
            `drop-shadow(0 0 18px ${CYAN_FAINT}) drop-shadow(0 8px 32px rgba(0,0,0,0.6))`,
            `drop-shadow(0 0 26px ${CYAN_DIM}) drop-shadow(0 12px 36px rgba(0,0,0,0.6))`,
            `drop-shadow(0 0 18px ${CYAN_FAINT}) drop-shadow(0 8px 32px rgba(0,0,0,0.6))`,
          ],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        style={{ position: 'relative' }}
      >
        {/* ── SVG frame ─────────────────────────────────────────────────── */}
        {/* viewBox is 100×100 but we use vector-effect=non-scaling-stroke
            so strokes stay crisp regardless of CSS width. The path is
            declared as a single closed shape with notched corners. */}
        <svg
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }}
          aria-hidden
        >
          <defs>
            {/* Inner gradient fill (deep navy → black) */}
            <linearGradient id="hsw-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#081420" stopOpacity="0.96" />
              <stop offset="0.6" stopColor="#040a14" stopOpacity="0.96" />
              <stop offset="1" stopColor="#020610" stopOpacity="0.98" />
            </linearGradient>

            {/* Cyan emission glow filter for the stroke */}
            <filter id="hsw-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Diagonal scratch texture pattern */}
            <pattern id="hsw-scratch" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse" patternTransform="rotate(-22)">
              <line x1="0" y1="0" x2="0" y2="80" stroke="rgba(180, 220, 240, 0.045)" strokeWidth="0.6" />
              <line x1="14" y1="0" x2="14" y2="80" stroke="rgba(180, 220, 240, 0.025)" strokeWidth="0.4" />
              <line x1="33" y1="0" x2="33" y2="80" stroke="rgba(180, 220, 240, 0.06)" strokeWidth="0.5" />
              <line x1="55" y1="0" x2="55" y2="80" stroke="rgba(180, 220, 240, 0.03)" strokeWidth="0.45" />
            </pattern>
          </defs>

          {/* Notched-corner frame — single closed path. The `c` value
              controls how big each corner notch is. */}
          {(() => {
            const W = 1000;
            const H = 600;
            const c = 18; // notch size
            const path = [
              `M ${c},0`,
              `L ${W - c},0`,
              `L ${W},${c}`,
              `L ${W},${H - c}`,
              `L ${W - c},${H}`,
              `L ${c},${H}`,
              `L 0,${H - c}`,
              `L 0,${c}`,
              'Z',
            ].join(' ');
            return (
              <>
                {/* fill */}
                <path d={path} fill="url(#hsw-fill)" />
                {/* scratch texture overlay */}
                <path d={path} fill="url(#hsw-scratch)" />
                {/* stroke + glow */}
                <path
                  d={path}
                  fill="none"
                  stroke={CYAN}
                  strokeWidth="2"
                  strokeOpacity="0.9"
                  vectorEffect="non-scaling-stroke"
                  filter="url(#hsw-glow)"
                />
                {/* second softer outer stroke for the energy halo */}
                <path
                  d={path}
                  fill="none"
                  stroke={CYAN}
                  strokeWidth="0.8"
                  strokeOpacity="0.45"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            );
          })()}

          {/* ── L-bracket alignment ticks (the floating little marks) ──
              Four corners + 4 edge midpoints. Drawn as small open rectangles
              offset slightly outside the main frame. */}
          {(() => {
            const W = 1000;
            const H = 600;
            const off = 9;        // distance outside the frame
            const arm = 28;       // length of each L arm
            const sw = 1.6;
            const stroke = { stroke: CYAN, strokeWidth: sw, fill: 'none', strokeOpacity: 0.85, vectorEffect: 'non-scaling-stroke' as const };

            const corner = (cx: number, cy: number, hx: number, hy: number) => {
              // hx/hy are signs (+1/-1) indicating which way the L opens.
              const x1 = cx;
              const y1 = cy;
              const x2 = cx + hx * arm;
              const y2 = cy;
              const x3 = cx;
              const y3 = cy + hy * arm;
              return <path key={`c-${cx}-${cy}`} d={`M ${x2} ${y2} L ${x1} ${y1} L ${x3} ${y3}`} {...stroke} />;
            };

            return (
              <g>
                {/* corners */}
                {corner(-off, -off, +1, +1)}
                {corner(W + off, -off, -1, +1)}
                {corner(-off, H + off, +1, -1)}
                {corner(W + off, H + off, -1, -1)}
                {/* edge midpoint dashes */}
                <line x1={W / 2 - 18} y1={-off} x2={W / 2 + 18} y2={-off} {...stroke} />
                <line x1={W / 2 - 18} y1={H + off} x2={W / 2 + 18} y2={H + off} {...stroke} />
                <line x1={-off} y1={H / 2 - 18} x2={-off} y2={H / 2 + 18} {...stroke} />
                <line x1={W + off} y1={H / 2 - 18} x2={W + off} y2={H / 2 + 18} {...stroke} />
              </g>
            );
          })()}
        </svg>

        {/* ── HTML content layer ────────────────────────────────────────── */}
        <div className="relative" style={{ padding: '34px 22px 26px' }}>
          {/* STATUS title plate — overlaps the top frame edge */}
          <div
            style={{
              position: 'absolute',
              top: -2,
              left: '50%',
              transform: 'translate(-50%, -50%)',
              padding: '6px 22px',
              background: '#040a14',
              border: `1.5px solid ${CYAN}`,
              borderRadius: 2,
              boxShadow: `0 0 14px ${CYAN_FAINT}, inset 0 0 8px rgba(0, 212, 255, 0.18)`,
              letterSpacing: '0.32em',
              fontWeight: 800,
              fontSize: 12,
              color: TEXT_PRIMARY,
              textShadow: `0 0 6px ${CYAN_DIM}`,
              fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
            }}
          >
            STATUS
          </div>

          {/* ── ROW 1: LEVEL (left) and STREAK (right) ─────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 44,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: TEXT_PRIMARY,
                  textShadow: `0 0 14px ${CYAN_DIM}, 0 0 4px rgba(255,255,255,0.4)`,
                  fontFamily: 'Rajdhani, "Bai Jamjuree", monospace, sans-serif',
                }}
              >
                {level}
              </span>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.28em',
                  color: TEXT_LABEL,
                  fontWeight: 700,
                  fontFamily: 'Rajdhani, monospace, sans-serif',
                }}
              >
                LEVEL
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: '0.28em',
                  color: TEXT_LABEL,
                  fontWeight: 700,
                  fontFamily: 'Rajdhani, monospace, sans-serif',
                }}
              >
                STREAK
              </span>
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1,
                  color: TEXT_PRIMARY,
                  textShadow: `0 0 10px ${CYAN_DIM}`,
                  fontFamily: 'Rajdhani, monospace, sans-serif',
                }}
              >
                {formatNum(streak)}
              </span>
            </div>
          </div>

          {/* hairline divider with diamond marker */}
          <Divider />

          {/* ── ROW 2: XP BAR ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px 12px' }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.24em',
                color: TEXT_LABEL,
                fontWeight: 700,
                fontFamily: 'Rajdhani, monospace, sans-serif',
                width: 26,
                textAlign: 'center',
              }}
              aria-label="XP"
            >
              XP
            </div>
            <div
              style={{
                flex: 1,
                position: 'relative',
                height: 14,
                background: 'rgba(0, 212, 255, 0.06)',
                border: `1px solid ${CYAN_DIM}`,
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: `inset 0 0 8px rgba(0, 212, 255, 0.1)`,
              }}
            >
              {/* Filled portion */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: `${xpPct}%`,
                  background: `linear-gradient(90deg, rgba(0, 212, 255, 0.55), rgba(140, 230, 255, 0.95))`,
                  boxShadow: `0 0 12px ${CYAN_DIM}, inset 0 0 6px rgba(255,255,255,0.4)`,
                  transition: 'width 600ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
              {/* Subtle tick segments for the SL "segmented bar" feel */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(90deg, transparent 0 18px, rgba(2, 8, 16, 0.55) 18px 19px)',
                  pointerEvents: 'none',
                }}
              />
            </div>
            <div
              style={{
                fontSize: 11,
                color: TEXT_DIM,
                letterSpacing: '0.04em',
                fontFamily: 'Rajdhani, monospace, sans-serif',
                fontWeight: 600,
                minWidth: 78,
                textAlign: 'right',
              }}
            >
              <span style={{ color: TEXT_PRIMARY, textShadow: `0 0 6px ${CYAN_DIM}` }}>{formatNum(currentXp)}</span>
              <span style={{ opacity: 0.55 }}> / {formatNum(requiredXp)}</span>
            </div>
          </div>

          {/* hairline divider with diamond marker */}
          <Divider />

          {/* ── ROW 3: STATS GRID ─────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 26px',
              padding: '14px 8px 4px',
            }}
          >
            {STAT_ROWS.map((row, i) => (
              <React.Fragment key={i}>
                <StatRow stat={row.left} value={(stats as any)[row.left] ?? 0} />
                <StatRow stat={row.right} value={(stats as any)[row.right] ?? 0} />
              </React.Fragment>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ── Internal subcomponents ──────────────────────────────────────────────────

const Divider: React.FC = () => (
  <div
    style={{
      position: 'relative',
      height: 1,
      margin: '4px 6px',
      background: `linear-gradient(90deg, transparent, ${CYAN_DIM}, transparent)`,
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: -3,
        left: '50%',
        transform: 'translateX(-50%) rotate(45deg)',
        width: 6,
        height: 6,
        background: CYAN,
        boxShadow: `0 0 8px ${CYAN}`,
      }}
    />
  </div>
);

const StatRow: React.FC<{ stat: keyof PlayerData['stats']; value: number }> = ({ stat, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '2px 0' }}>
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18 }}>
      <StatIcon stat={stat} />
    </span>
    <span
      style={{
        fontSize: 12,
        letterSpacing: '0.18em',
        color: TEXT_LABEL,
        fontWeight: 700,
        fontFamily: 'Rajdhani, monospace, sans-serif',
        flex: 1,
      }}
    >
      {STAT_LABEL[stat]}
    </span>
    <span style={{ color: TEXT_DIM, fontFamily: 'Rajdhani, monospace, sans-serif', fontWeight: 600 }}>:</span>
    <span
      style={{
        fontSize: 16,
        fontWeight: 800,
        color: TEXT_PRIMARY,
        textShadow: `0 0 10px ${CYAN_DIM}`,
        fontFamily: 'Rajdhani, monospace, sans-serif',
        minWidth: 30,
        textAlign: 'right',
      }}
    >
      {formatNum(value)}
    </span>
  </div>
);

export default HunterStatusWindow;
