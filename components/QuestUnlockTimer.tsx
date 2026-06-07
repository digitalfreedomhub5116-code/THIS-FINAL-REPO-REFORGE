/**
 * QuestUnlockTimer.tsx
 *
 * Cyan glowing reverse countdown to the next local-midnight reset.
 * Header reads "NEXT QUEST UNLOCKS IN", time renders as HH:MM:SS.
 *
 * Implementation notes:
 *  - Recomputes the target each tick so daylight-savings transitions never
 *    leave the timer stuck.
 *  - Uses a single `setInterval(1000)` and a `useState` string so the entire
 *    parent tree only re-renders the displayed text (digits change, layout
 *    stays stable thanks to `tabular-nums`).
 *  - When the countdown crosses zero, it briefly shows `00:00:00` and the
 *    next tick advances to the new midnight 23:59:59.
 *  - Self-contained — no new dependencies, all styles inline.
 */
import React, { useEffect, useState } from 'react';

const CYAN = '#00d4ff';
const CYAN_DIM = 'rgba(0, 212, 255, 0.55)';
const CYAN_FAINT = 'rgba(0, 212, 255, 0.18)';

function nextLocalMidnight(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 1);
  return d;
}

function formatHMS(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

interface QuestUnlockTimerProps {
  /** Override the target for tests; defaults to the next local midnight. */
  targetAt?: Date;
}

const QuestUnlockTimer: React.FC<QuestUnlockTimerProps> = ({ targetAt }) => {
  const [label, setLabel] = useState<string>(() => {
    const target = targetAt ?? nextLocalMidnight();
    return formatHMS(target.getTime() - Date.now());
  });

  useEffect(() => {
    const tick = () => {
      const target = targetAt ?? nextLocalMidnight();
      setLabel(formatHMS(target.getTime() - Date.now()));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [targetAt]);

  return (
    <div
      role="timer"
      aria-label="Time until next quest reset"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px 8px 12px',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontFamily: 'Rajdhani, "Bai Jamjuree", "Inter", sans-serif',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.32em',
          color: 'rgba(220, 240, 250, 0.65)',
          marginBottom: 6,
          textTransform: 'uppercase',
        }}
      >
        Next Quest Unlocks In
      </span>
      <span
        style={{
          fontFamily: 'Rajdhani, "Bai Jamjuree", "Inter", sans-serif',
          fontSize: 'clamp(28px, 8vw, 40px)',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: CYAN,
          textShadow: `0 0 12px ${CYAN_DIM}, 0 0 22px ${CYAN_FAINT}`,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export default QuestUnlockTimer;
