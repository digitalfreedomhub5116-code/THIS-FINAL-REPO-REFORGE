
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─────────────────────────────────────────────────────────────────────────
   Pseudo-isometric 3D depth constants
   Depth extends DX pixels right, DY pixels upward from the right edge
──────────────────────────────────────────────────────────────────────────── */
const DX = 16;
const DY = 10;

/* Pre-computed polygon point strings
   Body front  : rect(35,104, 130×62) — right edge at x=165, bottom at y=166
   Lid front   : rect(30, 52, 140×52) — right edge at x=170, bottom at y=104
*/
const BODY_SIDE = `165,104 ${165+DX},${104-DY} ${165+DX},${166-DY} 165,166`;
const LID_TOP   = `30,52 ${30+DX},${52-DY} ${170+DX},${52-DY} 170,52`;
const LID_SIDE  = `170,52 ${170+DX},${52-DY} ${170+DX},${104-DY} 170,104`;

interface ChestAnimProps {
  isLocked: boolean;
  size?: number;
}

interface OpeningAnimProps {
  color: string;
  glowColor: string;
  onComplete: () => void;
}

/* ─────────────────────────────────────────────────────────────────────────
   Reusable 3D body — front face + right depth face
   fillId / sideId reference gradient IDs defined in the parent <defs>
──────────────────────────────────────────────────────────────────────────── */
interface Body3DProps {
  color: string;
  fillId: string;
  sideId: string;
  op?: number;
}
const Body3D: React.FC<Body3DProps> = ({ color, fillId, sideId, op = 0.38 }) => (
  <>
    {/* Bottom edge face for grounding */}
    <polygon points={`35,166 ${35+DX},${166-DY} ${165+DX},${166-DY} 165,166`}
      fill="#020206" stroke={color} strokeWidth={0.8} opacity={0.6} />
    <polygon points={BODY_SIDE}
      fill={`url(#${sideId})`} stroke={color} strokeWidth={1.2} opacity={0.92} />
    <rect x={35} y={104} width={130} height={62} rx={4}
      fill={`url(#${fillId})`} stroke={color} strokeWidth={2.2} />
    {/* Inner shadow at top of body */}
    <rect x={36} y={105} width={128} height={14} rx={3}
      fill="#000" opacity={0.22} />
    {/* Metallic bands */}
    <rect x={35} y={120} width={130} height={5}  fill={color} opacity={op} />
    <rect x={35} y={143} width={130} height={5}  fill={color} opacity={op} />
    {/* Rim highlight on top edge */}
    <line x1={36} y1={104} x2={164} y2={104} stroke="#fff" strokeWidth={0.7} opacity={0.14} />
    {/* Corner rivets with highlight */}
    <circle cx={44}  cy={114} r={3.5} fill={color} opacity={0.72} />
    <circle cx={44}  cy={114} r={1.5} fill="#fff" opacity={0.18} />
    <circle cx={156} cy={114} r={3.5} fill={color} opacity={0.72} />
    <circle cx={156} cy={114} r={1.5} fill="#fff" opacity={0.18} />
    <circle cx={44}  cy={160} r={3.5} fill={color} opacity={0.72} />
    <circle cx={44}  cy={160} r={1.5} fill="#fff" opacity={0.18} />
    <circle cx={156} cy={160} r={3.5} fill={color} opacity={0.72} />
    <circle cx={156} cy={160} r={1.5} fill="#fff" opacity={0.18} />
    {/* Bottom edge highlight */}
    <line x1={36} y1={166} x2={164} y2={166} stroke={color} strokeWidth={0.6} opacity={0.25} />
  </>
);

/* ─────────────────────────────────────────────────────────────────────────
   Reusable 3D lid — top face + right depth face + front face
──────────────────────────────────────────────────────────────────────────── */
interface Lid3DProps {
  color: string;
  fillId: string;
  topId:  string;
  sideId: string;
  op?: number;
}
const Lid3D: React.FC<Lid3DProps> = ({ color, fillId, topId, sideId, op = 0.38 }) => (
  <>
    <polygon points={LID_TOP}
      fill={`url(#${topId})`} stroke={color} strokeWidth={1.2} opacity={0.96} />
    <polygon points={LID_SIDE}
      fill={`url(#${sideId})`} stroke={color} strokeWidth={1.2} opacity={0.9} />
    <rect x={30} y={52} width={140} height={52} rx={6}
      fill={`url(#${fillId})`} stroke={color} strokeWidth={2.2} />
    {/* Inner shadow at bottom of lid */}
    <rect x={31} y={92} width={138} height={11} rx={3}
      fill="#000" opacity={0.18} />
    {/* Center band with subtle gradient */}
    <rect x={30} y={71} width={140} height={6}  fill={color} opacity={op} />
    {/* Corner rivets with highlight */}
    <circle cx={44}  cy={62}  r={3.5} fill={color} opacity={0.72} />
    <circle cx={44}  cy={62}  r={1.5} fill="#fff" opacity={0.15} />
    <circle cx={156} cy={62}  r={3.5} fill={color} opacity={0.72} />
    <circle cx={156} cy={62}  r={1.5} fill="#fff" opacity={0.15} />
    <circle cx={44}  cy={100} r={3.5} fill={color} opacity={0.72} />
    <circle cx={44}  cy={100} r={1.5} fill="#fff" opacity={0.15} />
    <circle cx={156} cy={100} r={3.5} fill={color} opacity={0.72} />
    <circle cx={156} cy={100} r={1.5} fill="#fff" opacity={0.15} />
    {/* Rim highlight along the front-top edge */}
    <line x1={30} y1={52} x2={170} y2={52} stroke="#fff" strokeWidth={0.9} opacity={0.18} />
    {/* Subtle specular gloss band near top */}
    <rect x={40} y={55} width={120} height={8} rx={4}
      fill="#fff" opacity={0.04} />
  </>
);

/* ─────────────────────────────────────────────────────────────────────────
   DAILY CHEST — Ice / Cyan  #00d4ff
──────────────────────────────────────────────────────────────────────────── */
export const DailyChestAnim: React.FC<ChestAnimProps> = ({ isLocked, size = 180 }) => {
  const C        = '#00d4ff';
  const lockFill = '#062030';

  const shards = Array.from({ length: 6 }, (_, i) => {
    const a = (i * 60 * Math.PI) / 180;
    return { x: 100 + 70 * Math.cos(a), y: 107 + 70 * Math.sin(a) };
  });

  return (
    <svg
      width={size} height={size} viewBox="0 0 200 200"
      style={{ overflow: 'visible', filter: isLocked ? 'none' : `drop-shadow(0 0 14px ${C}66)` }}
      opacity={isLocked ? 0.45 : 1}
    >
      <defs>
        <radialGradient id="daily-bg" cx="50%" cy="55%" r="50%">
          <stop offset="0%"   stopColor={C}    stopOpacity="0.22" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <filter id="daily-glow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <linearGradient id="daily-gfront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#062535" />
          <stop offset="100%" stopColor="#03131c" />
        </linearGradient>
        <linearGradient id="daily-gtop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#0d5068" />
          <stop offset="100%" stopColor="#073a4e" />
        </linearGradient>
        <linearGradient id="daily-gside" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#021018" />
          <stop offset="100%" stopColor="#010b12" />
        </linearGradient>
        <style>{`
          @keyframes daily-frost { 0%,100%{opacity:0.18} 50%{opacity:0.55} }
          .daily-frost { animation: daily-frost 2.6s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Background glow */}
      <motion.ellipse
        cx={100} cy={107} rx={80} ry={70}
        fill="url(#daily-bg)"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbiting ice crystal shards */}
      <motion.g
        style={{ transformOrigin: '100px 107px' }}
        animate={isLocked ? {} : { rotate: 360 }}
        transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
      >
        {shards.map((s, i) => (
          <g key={i} transform={`translate(${s.x},${s.y})`}>
            <polygon points="0,-7 4,0 0,7 -4,0" fill={C} opacity={i % 2 === 0 ? 0.85 : 0.55} />
            <polygon points="0,-4 2,0 0,4 -2,0" fill="#fff" opacity={0.4} />
          </g>
        ))}
      </motion.g>

      {/* Inner frost ring counter-rotate */}
      <motion.g
        style={{ transformOrigin: '100px 107px' }}
        animate={isLocked ? {} : { rotate: -360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        {[0,1,2,3].map(i => {
          const a = (i * 90 * Math.PI) / 180;
          return (
            <circle key={i}
              cx={100 + 42 * Math.cos(a)} cy={107 + 42 * Math.sin(a)}
              r={3} fill={C} opacity={0.5}
            />
          );
        })}
      </motion.g>

      {/* Whole chest floats */}
      <motion.g
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ground shadow */}
        <ellipse cx={100} cy={170} rx={68} ry={6} fill="#000" opacity={0.28} />

        <Body3D color={C} fillId="daily-gfront" sideId="daily-gside" />

        {/* Frost texture lines on body */}
        <line x1={55}  y1={108} x2={70}  y2={128} stroke={C} strokeWidth={0.8} className="daily-frost" />
        <line x1={130} y1={108} x2={118} y2={135} stroke={C} strokeWidth={0.8} className="daily-frost" opacity={0.6} />
        <line x1={80}  y1={155} x2={95}  y2={140} stroke={C} strokeWidth={0.7} className="daily-frost" />

        {/* Ice snowflake lock */}
        <circle cx={100} cy={132} r={13} fill={lockFill} stroke={C} strokeWidth={1.8} />
        {[0,60,120].map(deg => {
          const a = (deg * Math.PI) / 180;
          return (
            <g key={deg}>
              <line x1={100 + 8*Math.cos(a)} y1={132 + 8*Math.sin(a)}
                    x2={100 - 8*Math.cos(a)} y2={132 - 8*Math.sin(a)}
                    stroke={C} strokeWidth={1.4} strokeLinecap="round" />
            </g>
          );
        })}
        <circle cx={100} cy={132} r={2.5} fill={C} opacity={0.9} />

        <Lid3D color={C} fillId="daily-gfront" topId="daily-gtop" sideId="daily-gside" />

        {/* Frost gloss sweep */}
        <motion.rect x={38} y={58} width={124} height={10} rx={4}
          fill="#fff" opacity={0}
          animate={{ opacity: [0, 0.07, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
        />
      </motion.g>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   LEGENDARY CHEST — Gold / Amber  #f59e0b
──────────────────────────────────────────────────────────────────────────── */
export const LegendaryChestAnim: React.FC<ChestAnimProps> = ({ isLocked, size = 180 }) => {
  const C        = '#f59e0b';
  const lockFill = '#1e1500';

  const sparkles = [
    { x: 60,  delay: 0 },   { x: 75,  delay: 0.3 }, { x: 93,  delay: 0.6 },
    { x: 112, delay: 0.15 },{ x: 128, delay: 0.45 },{ x: 145, delay: 0.75 },
    { x: 50,  delay: 0.9 }, { x: 155, delay: 1.1 },
  ];

  const bandGems = [
    { x: 62,  y: 123 }, { x: 100, y: 123 }, { x: 138, y: 123 },
    { x: 62,  y: 146 }, { x: 100, y: 146 }, { x: 138, y: 146 },
  ];

  return (
    <svg
      width={size} height={size} viewBox="0 0 200 200"
      style={{ overflow: 'visible', filter: isLocked ? 'none' : `drop-shadow(0 0 18px ${C}55)` }}
      opacity={isLocked ? 0.45 : 1}
    >
      <defs>
        <radialGradient id="leg-bg" cx="50%" cy="55%" r="55%">
          <stop offset="0%"   stopColor={C}    stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="leg-inner" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#fff8e0" stopOpacity="0.6" />
          <stop offset="100%" stopColor={C}        stopOpacity="0" />
        </radialGradient>
        <linearGradient id="leg-gfront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#1c1200" />
          <stop offset="100%" stopColor="#110d00" />
        </linearGradient>
        <linearGradient id="leg-gtop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#2e2004" />
          <stop offset="100%" stopColor="#1e1500" />
        </linearGradient>
        <linearGradient id="leg-gside" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#0e0a00" />
          <stop offset="100%" stopColor="#080600" />
        </linearGradient>
      </defs>

      {/* Background glow pulse */}
      <motion.ellipse cx={100} cy={110} rx={85} ry={72}
        fill="url(#leg-bg)"
        animate={{ opacity: [0.5, 1, 0.5], scaleX: [1, 1.06, 1] }}
        transition={{ duration: 2.0, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '100px 110px' }}
      />

      {/* Rotating golden rays */}
      <motion.g
        style={{ transformOrigin: '100px 107px' }}
        animate={isLocked ? {} : { rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={100 + 28 * Math.cos(a)} y1={107 + 28 * Math.sin(a)}
              x2={100 + 88 * Math.cos(a)} y2={107 + 88 * Math.sin(a)}
              stroke={C} strokeWidth={i % 2 === 0 ? 2.5 : 1.2}
              opacity={i % 2 === 0 ? 0.32 : 0.18} strokeLinecap="round"
            />
          );
        })}
      </motion.g>

      {/* Rising sparkle particles */}
      {!isLocked && sparkles.map((sp, i) => (
        <motion.g key={i}
          animate={{ y: [0, -45], opacity: [0, 1, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: sp.delay, ease: 'easeOut' }}
        >
          <polygon points={`${sp.x},-3 ${sp.x+2},0 ${sp.x},3 ${sp.x-2},0`}
            fill={C} opacity={0.9} />
        </motion.g>
      ))}

      {/* Whole chest floats */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ground shadow */}
        <ellipse cx={100} cy={170} rx={68} ry={6} fill="#000" opacity={0.3} />

        <Body3D color={C} fillId="leg-gfront" sideId="leg-gside" op={0.28} />

        {/* Ornate band gems */}
        {bandGems.map((g, i) => (
          <circle key={i} cx={g.x} cy={g.y} r={3.5}
            fill={i < 3 ? '#fde68a' : C} stroke={C} strokeWidth={0.8} opacity={0.9}
          />
        ))}

        {/* Sun medallion lock */}
        <circle cx={100} cy={132} r={14} fill={lockFill} stroke={C} strokeWidth={2} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={100 + 6*Math.cos(a)}  y1={132 + 6*Math.sin(a)}
              x2={100 + 11*Math.cos(a)} y2={132 + 11*Math.sin(a)}
              stroke={C} strokeWidth={1.6} strokeLinecap="round"
            />
          );
        })}
        <circle cx={100} cy={132} r={4} fill={C} opacity={0.95} />

        <Lid3D color={C} fillId="leg-gfront" topId="leg-gtop" sideId="leg-gside" op={0.28} />

        {/* Crown ornament on lid top */}
        <polygon points="88,50 100,36 112,50" fill="none" stroke={C} strokeWidth={1.6} opacity={0.7} />
        <polygon points="92,50 100,40 108,50" fill={C} opacity={0.25} />
        <circle cx={100} cy={42} r={3} fill="#fde68a" stroke={C} strokeWidth={0.8} opacity={0.9} />
        <circle cx={92} cy={49} r={1.8} fill="#fde68a" opacity={0.7} />
        <circle cx={108} cy={49} r={1.8} fill="#fde68a" opacity={0.7} />

        {/* Decorative corner gems on lid */}
        <motion.circle cx={80} cy={74} r={2.5} fill="#fde68a" opacity={0.85}
          animate={{ opacity: [0.85, 0.4, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.circle cx={120} cy={74} r={2.5} fill="#fde68a" opacity={0.85}
          animate={{ opacity: [0.85, 0.4, 0.85] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 0.9 }}
        />

        {/* Gold filigree lines on body */}
        <path d="M 50 112 Q 70 108 80 115" fill="none" stroke={C} strokeWidth={0.7} opacity={0.3} />
        <path d="M 150 112 Q 130 108 120 115" fill="none" stroke={C} strokeWidth={0.7} opacity={0.3} />
        <path d="M 50 155 Q 70 151 80 158" fill="none" stroke={C} strokeWidth={0.7} opacity={0.25} />
        <path d="M 150 155 Q 130 151 120 158" fill="none" stroke={C} strokeWidth={0.7} opacity={0.25} />

        {/* Gold sheen sweep */}
        <motion.rect x={30} y={52} width={140} height={52} rx={6}
          fill="url(#leg-inner)" opacity={0}
          animate={{ opacity: [0, 0.25, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
        />
      </motion.g>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   ALLIANCE CHEST — Arcane / Purple  #bf5eff
──────────────────────────────────────────────────────────────────────────── */
export const AllianceChestAnim: React.FC<ChestAnimProps> = ({ isLocked, size = 180 }) => {
  const C        = '#bf5eff';
  const lockFill = '#130025';

  const RUNES    = ['ᚠ', 'ᚢ', 'ᚦ', 'ᚨ', 'ᚱ', 'ᚲ'];
  const CIRCLE_CY = 163;
  const CIRCLE_R  = 52;

  return (
    <svg
      width={size} height={size} viewBox="0 0 200 200"
      style={{ overflow: 'visible', filter: isLocked ? 'none' : `drop-shadow(0 0 16px ${C}55)` }}
      opacity={isLocked ? 0.45 : 1}
    >
      <defs>
        <radialGradient id="all-bg" cx="50%" cy="55%" r="55%">
          <stop offset="0%"   stopColor={C}    stopOpacity="0.25" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="all-eye" cx="50%" cy="35%" r="55%">
          <stop offset="0%"   stopColor="#fff"  stopOpacity="0.8" />
          <stop offset="100%" stopColor={C}      stopOpacity="0.2" />
        </radialGradient>
        <linearGradient id="all-gfront" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#140028" />
          <stop offset="100%" stopColor="#0a0018" />
        </linearGradient>
        <linearGradient id="all-gtop" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#220048" />
          <stop offset="100%" stopColor="#160030" />
        </linearGradient>
        <linearGradient id="all-gside" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#09001c" />
          <stop offset="100%" stopColor="#060012" />
        </linearGradient>
        <style>{`
          @keyframes all-wisp-l { 0%{stroke-dashoffset:0}100%{stroke-dashoffset:-160} }
          @keyframes all-wisp-r { 0%{stroke-dashoffset:0}100%{stroke-dashoffset:-160} }
          .all-wisp-l { stroke-dasharray:30 130; animation: all-wisp-l 2.8s linear infinite; }
          .all-wisp-r { stroke-dasharray:30 130; animation: all-wisp-r 2.8s linear infinite; animation-delay:0.7s; }
          @keyframes all-rune-pulse { 0%,100%{opacity:0.45} 50%{opacity:0.85} }
          .all-rune { animation: all-rune-pulse 2s ease-in-out infinite; }
        `}</style>
      </defs>

      {/* Background glow */}
      <motion.ellipse cx={100} cy={110} rx={82} ry={70}
        fill="url(#all-bg)"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 3.0, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Magic rune circle */}
      <motion.g
        style={{ transformOrigin: `100px ${CIRCLE_CY}px` }}
        animate={isLocked ? {} : { rotate: 360 }}
        transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}
      >
        <circle cx={100} cy={CIRCLE_CY} r={CIRCLE_R}
          fill="none" stroke={C} strokeWidth={1.2} opacity={0.5} strokeDasharray="5 4" />
        <circle cx={100} cy={CIRCLE_CY} r={CIRCLE_R - 8}
          fill="none" stroke={C} strokeWidth={0.8} opacity={0.3} />
        {[0, 60, 120].map(deg => {
          const a = (deg * Math.PI) / 180;
          return (
            <line key={deg}
              x1={100 + (CIRCLE_R - 8) * Math.cos(a)} y1={CIRCLE_CY + (CIRCLE_R - 8) * Math.sin(a)}
              x2={100 - (CIRCLE_R - 8) * Math.cos(a)} y2={CIRCLE_CY - (CIRCLE_R - 8) * Math.sin(a)}
              stroke={C} strokeWidth={0.7} opacity={0.3}
            />
          );
        })}
        {RUNES.map((rune, i) => {
          const a = (i * 60 * Math.PI) / 180;
          return (
            <text key={i} className="all-rune"
              x={100 + CIRCLE_R * Math.cos(a)} y={CIRCLE_CY + CIRCLE_R * Math.sin(a)}
              fill={C} fontSize={9} textAnchor="middle" dominantBaseline="middle"
              fontWeight="bold"
            >{rune}</text>
          );
        })}
      </motion.g>

      {/* Wisps */}
      {!isLocked && (
        <path className="all-wisp-l"
          d="M 60 165 C 48 145 68 125 55 105 C 42 85 62 65 50 45"
          fill="none" stroke={C} strokeWidth={2.5} opacity={0.55}
        />
      )}
      {!isLocked && (
        <path className="all-wisp-r"
          d="M 140 165 C 152 145 132 125 145 105 C 158 85 138 65 150 45"
          fill="none" stroke={C} strokeWidth={2.5} opacity={0.55}
        />
      )}

      {/* Whole chest floats */}
      <motion.g
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Ground shadow */}
        <ellipse cx={100} cy={170} rx={68} ry={6} fill="#000" opacity={0.28} />

        <Body3D color={C} fillId="all-gfront" sideId="all-gside" op={0.32} />

        {/* Rune etchings on body front */}
        <line x1={52}  y1={110} x2={62}  y2={126} stroke={C} strokeWidth={0.9} opacity={0.35} />
        <line x1={58}  y1={110} x2={68}  y2={126} stroke={C} strokeWidth={0.9} opacity={0.25} />
        <line x1={148} y1={110} x2={138} y2={126} stroke={C} strokeWidth={0.9} opacity={0.35} />
        <line x1={142} y1={110} x2={132} y2={126} stroke={C} strokeWidth={0.9} opacity={0.25} />

        {/* Arcane eye lock */}
        <ellipse cx={100} cy={132} rx={13} ry={9} fill={lockFill} stroke={C} strokeWidth={1.8} />
        <ellipse cx={100} cy={132} rx={6}  ry={8} fill={C}        opacity={0.85} />
        <ellipse cx={100} cy={132} rx={2}  ry={6} fill="#0c0018" />
        <motion.ellipse cx={100} cy={132} rx={6} ry={8}
          fill={C} opacity={0}
          animate={{ opacity: [0, 0.45, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <Lid3D color={C} fillId="all-gfront" topId="all-gtop" sideId="all-gside" op={0.32} />

        {/* Lid rune marks — drawn on top of lid front face */}
        <line x1={55}  y1={60} x2={65}  y2={75} stroke={C} strokeWidth={0.9} opacity={0.3} />
        <line x1={145} y1={60} x2={135} y2={75} stroke={C} strokeWidth={0.9} opacity={0.3} />
        <line x1={88}  y1={57} x2={88}  y2={72} stroke={C} strokeWidth={0.9} opacity={0.25} />
        <line x1={112} y1={57} x2={112} y2={72} stroke={C} strokeWidth={0.9} opacity={0.25} />

        {/* Arcane shimmer */}
        <motion.rect x={30} y={52} width={140} height={52} rx={6}
          fill={C} opacity={0}
          animate={{ opacity: [0, 0.06, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: 1.0 }}
        />
      </motion.g>
    </svg>
  );
};

/* ─────────────────────────────────────────────────────────────────────────
   CHEST OPENING ANIMATION — Hinge-tilt version
──────────────────────────────────────────────────────────────────────────── */
export const ChestOpeningAnim: React.FC<OpeningAnimProps> = ({ color, glowColor, onComplete }) => {
  const [phase, setPhase] = useState<'shaking' | 'opening' | 'burst'>('shaking');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('opening'), 700);
    const t2 = setTimeout(() => setPhase('burst'),   1400);
    const t3 = setTimeout(() => onComplete(),         2300);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isOpen    = phase === 'opening' || phase === 'burst';
  const glowOp    = phase === 'burst' ? 1 : phase === 'opening' ? 0.65 : 0.15;
  const glowScale = phase === 'burst' ? 2.2 : phase === 'opening' ? 1.3 : 0.7;

  const darkFill = '#0a0a14';
  const sideFill = '#060610';
  const topFill  = color + '1a';

  const particles = Array.from({ length: 18 }, (_, i) => {
    const a = (i * (360 / 18) * Math.PI) / 180;
    const dist = 55 + (i % 3) * 20;
    return { tx: Math.cos(a) * dist, ty: Math.sin(a) * dist - 15 };
  });

  return (
    <div className="relative flex items-center justify-center" style={{ height: 300 }}>
      {/* Radial glow behind */}
      <motion.div
        className="absolute pointer-events-none rounded-full"
        style={{ width: 200, height: 200, background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)` }}
        animate={{ opacity: glowOp, scale: glowScale }}
        transition={{ duration: 0.4 }}
      />

      <motion.svg
        width={180} height={180} viewBox="0 0 200 200"
        style={{ overflow: 'visible', position: 'relative', zIndex: 2 }}
        animate={phase === 'shaking' ? { x: [-4, 4, -6, 6, -3, 3, -1, 0], y: [0, -1, 0, -2, 0, -1, 0] } : { x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      >
        <defs>
          <radialGradient id="open-inner-glow" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="40%" stopColor={color} stopOpacity="0.5" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Inner treasure glow visible through the gap */}
        <motion.ellipse cx={100} cy={98} rx={55} ry={18}
          fill="url(#open-inner-glow)"
          animate={{ opacity: isOpen ? 0.9 : 0, scaleY: phase === 'burst' ? 2 : 1, scaleX: phase === 'burst' ? 1.3 : 1 }}
          transition={{ duration: 0.35 }}
          style={{ transformOrigin: '100px 98px' }}
        />

        {/* Upward light rays from opening */}
        {isOpen && [60, 75, 90, 100, 110, 125, 140].map((x, i) => (
          <motion.line key={`ray-${i}`}
            x1={x} y1={104}
            x2={x + (x < 100 ? -(100 - x) * 0.3 : (x - 100) * 0.3)} y2={15 - i * 2}
            stroke={color} strokeWidth={i === 3 ? 3.5 : 1.5 + (i % 2) * 0.5}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'burst' ? [0.7, 0] : [0, 0.2 + (i === 3 ? 0.15 : 0), 0.12] }}
            transition={{ duration: phase === 'burst' ? 0.5 : 0.7, delay: i * 0.04 }}
          />
        ))}

        {/* BODY — 3D: side then front */}
        <polygon points={BODY_SIDE} fill={sideFill} stroke={color} strokeWidth={1.5} opacity={0.9} />
        <rect x={35} y={104} width={130} height={62} rx={4}
          fill={darkFill} stroke={color} strokeWidth={2.5} />
        {/* Metallic bands */}
        <rect x={35} y={120} width={130} height={5} fill={color} opacity={0.35} />
        <rect x={35} y={143} width={130} height={5} fill={color} opacity={0.35} />
        {/* Rim highlight on body top edge */}
        <line x1={36} y1={104} x2={164} y2={104} stroke="#fff" strokeWidth={0.8} opacity={0.12} />
        {/* Corner rivets */}
        <circle cx={44}  cy={114} r={3.5} fill={color} opacity={0.8} />
        <circle cx={156} cy={114} r={3.5} fill={color} opacity={0.8} />
        <circle cx={44}  cy={160} r={3.5} fill={color} opacity={0.8} />
        <circle cx={156} cy={160} r={3.5} fill={color} opacity={0.8} />
        {/* Inner shadow gradient on body */}
        <rect x={36} y={105} width={128} height={20} fill="url(#open-inner-glow)" opacity={isOpen ? 0.4 : 0} rx={2} />

        {/* Lock */}
        <circle cx={100} cy={132} r={12} fill={darkFill} stroke={color} strokeWidth={2} />
        <motion.circle cx={100} cy={132} r={5} fill={color}
          animate={{ opacity: phase === 'burst' ? [1, 0] : 1 }}
          transition={{ duration: 0.4 }}
        />

        {/* LID — floats up and tilts backward to simulate hinge opening */}
        <motion.g
          animate={{
            y: phase === 'burst' ? -48 : phase === 'opening' ? -36 : 0,
            scaleY: phase === 'burst' ? 0.55 : phase === 'opening' ? 0.7 : 1,
            rotate: phase === 'burst' ? -8 : phase === 'opening' ? -5 : 0,
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: '100px 104px' }}
        >
          <polygon points={LID_TOP}  fill={topFill}  stroke={color} strokeWidth={1.2} opacity={0.9} />
          <polygon points={LID_SIDE} fill={sideFill} stroke={color} strokeWidth={1.2} opacity={0.9} />
          <rect x={30}  y={52} width={140} height={52} rx={6}
            fill={darkFill} stroke={color} strokeWidth={2.5} />
          <rect x={30}  y={71} width={140} height={6}  fill={color} opacity={0.35} />
          <circle cx={44}  cy={62}  r={3.5} fill={color} opacity={0.8} />
          <circle cx={156} cy={62}  r={3.5} fill={color} opacity={0.8} />
          <circle cx={44}  cy={100} r={3.5} fill={color} opacity={0.8} />
          <circle cx={156} cy={100} r={3.5} fill={color} opacity={0.8} />
          <line x1={30} y1={52} x2={170} y2={52} stroke="#fff" strokeWidth={1} opacity={0.15} />
        </motion.g>

        {/* Burst particles — shoot outward and upward */}
        <AnimatePresence>
          {phase === 'burst' && particles.map((p, i) => (
            <motion.circle key={i} cx={100} cy={100}
              r={i % 4 === 0 ? 5 : i % 3 === 0 ? 3.5 : 2} fill={i % 5 === 0 ? '#fff' : color}
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{ x: p.tx, y: p.ty, opacity: 0, scale: 0.2 }}
              transition={{ duration: 0.9, delay: i * 0.03, ease: 'easeOut' }}
            />
          ))}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
};
