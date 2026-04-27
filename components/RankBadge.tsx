
import React from 'react';
import { motion } from 'framer-motion';

export type RankType = 'UNRANKED' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S';

interface RankBadgeProps {
  rank: RankType;
  size?: number;
  animated?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const RANK_META: Record<RankType, {
  primary: string;
  secondary: string;
  letter: string;
  border: string;
  glow: string;
  bg: string;
  labelColor: string;
}> = {
  UNRANKED: {
    primary:    '#4a4a5a',
    secondary:  '#2a2a3a',
    letter:     '#6a6a7a',
    border:     '#3a3a4a',
    glow:       'rgba(74,74,90,0.0)',
    bg:         '#08080e',
    labelColor: '#5a5a6a',
  },
  E: {
    primary:    '#9eaabb',
    secondary:  '#5a6b80',
    letter:     '#dce4f0',
    border:     '#7a8a9e',
    glow:       'rgba(158,170,187,0.5)',
    bg:         '#0e0f14',
    labelColor: '#9eaabb',
  },
  D: {
    primary:    '#f5a623',
    secondary:  '#d4880a',
    letter:     '#fff2cc',
    border:     '#e8a317',
    glow:       'rgba(245,166,35,0.85)',
    bg:         '#1a0e00',
    labelColor: '#f5a623',
  },
  C: {
    primary:    '#7EB8D4',
    secondary:  '#5A9BB5',
    letter:     '#e0f5ff',
    border:     '#7EB8D4',
    glow:       'rgba(126,184,212,0.8)',
    bg:         '#001018',
    labelColor: '#7EB8D4',
  },
  B: {
    primary:    '#c96eff',
    secondary:  '#8b45f0',
    letter:     '#f8f0ff',
    border:     '#b860f8',
    glow:       'rgba(201,110,255,0.9)',
    bg:         '#0e0018',
    labelColor: '#c96eff',
  },
  A: {
    primary:    '#ff5722',
    secondary:  '#e53935',
    letter:     '#ffffff',
    border:     '#ff6644',
    glow:       'rgba(255,87,34,0.95)',
    bg:         '#1a0300',
    labelColor: '#ff6b3d',
  },
  S: {
    primary:    '#f084ff',
    secondary:  '#ffd700',
    letter:     '#ffffff',
    border:     '#e050ff',
    glow:       'rgba(240,132,255,1)',
    bg:         '#0f0018',
    labelColor: '#f0abfc',
  },
};

/* ─── Per-rank SVG badge renderers ─────────────────────────────────────────── */

const BadgeUnranked: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s / 2, cy = s / 2;
  const r = s * 0.42;
  const m = RANK_META.UNRANKED;
  const pts = hexPts(cx, cy, r, -30);
  const ptsInner = hexPts(cx, cy, r * 0.74, -30);

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible' }}>
      <defs>
        <radialGradient id="bg-unranked" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={m.primary} stopOpacity="0.1" />
          <stop offset="100%" stopColor="#000" stopOpacity="1" />
        </radialGradient>
        <filter id="glow-unranked" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        {animated && <style>{`
          @keyframes unranked-flicker { 0%,100%{opacity:0.6}30%{opacity:0.3}50%{opacity:0.7}70%{opacity:0.25}90%{opacity:0.55} }
          @keyframes unranked-crack { 0%,100%{opacity:0.15}50%{opacity:0.35} }
          .badge-unranked-letter{animation:unranked-flicker 3s infinite}
          .badge-unranked-crack{animation:unranked-crack 2s ease-in-out infinite}
        `}</style>}
      </defs>
      {/* Plate */}
      <polygon points={pts} fill="url(#bg-unranked)" stroke={m.border} strokeWidth={s * 0.028} opacity="0.6" />
      {/* Crack lines — unstable/shattered look */}
      <line className="badge-unranked-crack" x1={cx-r*0.6} y1={cy-r*0.4} x2={cx+r*0.2} y2={cy+r*0.65} stroke={m.primary} strokeWidth={s*0.02} opacity="0.25" strokeLinecap="round"/>
      <line className="badge-unranked-crack" x1={cx+r*0.45} y1={cy-r*0.6} x2={cx-r*0.15} y2={cy+r*0.35} stroke={m.primary} strokeWidth={s*0.016} opacity="0.2" strokeLinecap="round"/>
      <line className="badge-unranked-crack" x1={cx-r*0.2} y1={cy-r*0.65} x2={cx+r*0.5} y2={cy+r*0.25} stroke={m.primary} strokeWidth={s*0.014} opacity="0.18" strokeLinecap="round"/>
      {/* Inner ring — dashed, broken feel */}
      <polygon points={ptsInner} fill="none" stroke={m.primary} strokeWidth={s*0.014} opacity="0.15" strokeDasharray={`${s*0.06} ${s*0.04}`} />
      {/* Question mark letter */}
      <text className="badge-unranked-letter" x={cx} y={cy+s*0.15} textAnchor="middle" fontSize={s*0.44} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={m.letter} filter="url(#glow-unranked)" opacity="0.5">?</text>
    </svg>
  );
};

const BadgeE: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s/2, cy = s/2, r = s*0.44, m = RANK_META.E, id = `e-${s}`;
  const shield = `M${cx},${cy-r} C${cx-r*0.15},${cy-r*1.02} ${cx-r*0.85},${cy-r*0.7} ${cx-r*0.88},${cy-r*0.25} L${cx-r*0.82},${cy+r*0.35} C${cx-r*0.78},${cy+r*0.65} ${cx-r*0.35},${cy+r*0.92} ${cx},${cy+r*0.98} C${cx+r*0.35},${cy+r*0.92} ${cx+r*0.78},${cy+r*0.65} ${cx+r*0.82},${cy+r*0.35} L${cx+r*0.88},${cy-r*0.25} C${cx+r*0.85},${cy-r*0.7} ${cx+r*0.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const shieldInner = `M${cx},${cy-r*0.78} C${cx-r*0.12},${cy-r*0.8} ${cx-r*0.65},${cy-r*0.55} ${cx-r*0.68},${cy-r*0.18} L${cx-r*0.63},${cy+r*0.28} C${cx-r*0.6},${cy+r*0.52} ${cx-r*0.28},${cy+r*0.72} ${cx},${cy+r*0.77} C${cx+r*0.28},${cy+r*0.72} ${cx+r*0.6},${cy+r*0.52} ${cx+r*0.63},${cy+r*0.28} L${cx+r*0.68},${cy-r*0.18} C${cx+r*0.65},${cy-r*0.55} ${cx+r*0.12},${cy-r*0.8} ${cx},${cy-r*0.78}Z`;
  const gr = s*0.07;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#8a9bb0"/><stop offset="40%" stopColor="#556575"/><stop offset="100%" stopColor="#3a4a58"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stopColor="#3a4555"/><stop offset="50%" stopColor="#1a2230"/><stop offset="100%" stopColor="#0d1218"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#b0bec5"/><stop offset="50%" stopColor="#78909c"/><stop offset="100%" stopColor="#455a64"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e0e8f0"/><stop offset="100%" stopColor="#8a9bb0"/></linearGradient>
        <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated && <style>{`@keyframes ef{0%,100%{opacity:1}50%{opacity:.85}}.be-f{animation:ef 3s infinite}`}</style>}
      </defs>
      <path d={shield} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*0.05}/>
      <path d={shieldInner} fill="none" stroke="#6a7a8a" strokeWidth={s*0.015} opacity=".35"/>
      {[[-0.7,-0.1],[0.7,-0.1],[-0.55,0.5],[0.55,0.5]].map(([dx,dy],i)=><circle key={i} cx={cx+r*dx} cy={cy+r*dy} r={s*0.025} fill="#6a7a8a" stroke="#4a5868" strokeWidth={s*0.008}/>)}
      <path d={`M${cx},${cy-r*0.45-gr} L${cx+gr*0.7},${cy-r*0.45-gr*0.2} L${cx+gr*0.5},${cy-r*0.45+gr*0.4} L${cx},${cy-r*0.45+gr} L${cx-gr*0.5},${cy-r*0.45+gr*0.4} L${cx-gr*0.7},${cy-r*0.45-gr*0.2}Z`} fill={`url(#gem-${id})`} stroke="#90a4ae" strokeWidth={s*0.01}/>
      <line x1={cx} y1={cy-r*0.45-gr} x2={cx+gr*0.5} y2={cy-r*0.45+gr*0.4} stroke="#cfd8dc" strokeWidth={s*0.006} opacity=".5"/>
      <line x1={cx} y1={cy-r*0.45-gr} x2={cx-gr*0.5} y2={cy-r*0.45+gr*0.4} stroke="#cfd8dc" strokeWidth={s*0.006} opacity=".5"/>
      <text className="be-f" x={cx} y={cy+s*0.2} textAnchor="middle" fontSize={s*0.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#556575" strokeWidth={s*0.01}>E</text>
    </svg>
  );
};

const BadgeD: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx = s/2, cy = s/2, r = s*0.44, m = RANK_META.D, id = `d-${s}`;
  const shield = `M${cx},${cy-r} C${cx-r*0.15},${cy-r*1.02} ${cx-r*0.85},${cy-r*0.7} ${cx-r*0.88},${cy-r*0.25} L${cx-r*0.82},${cy+r*0.35} C${cx-r*0.78},${cy+r*0.65} ${cx-r*0.35},${cy+r*0.92} ${cx},${cy+r*0.98} C${cx+r*0.35},${cy+r*0.92} ${cx+r*0.78},${cy+r*0.65} ${cx+r*0.82},${cy+r*0.35} L${cx+r*0.88},${cy-r*0.25} C${cx+r*0.85},${cy-r*0.7} ${cx+r*0.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const si = `M${cx},${cy-r*0.78} C${cx-r*0.12},${cy-r*0.8} ${cx-r*0.65},${cy-r*0.55} ${cx-r*0.68},${cy-r*0.18} L${cx-r*0.63},${cy+r*0.28} C${cx-r*0.6},${cy+r*0.52} ${cx-r*0.28},${cy+r*0.72} ${cx},${cy+r*0.77} C${cx+r*0.28},${cy+r*0.72} ${cx+r*0.6},${cy+r*0.52} ${cx+r*0.63},${cy+r*0.28} L${cx+r*0.68},${cy-r*0.18} C${cx+r*0.65},${cy-r*0.55} ${cx+r*0.12},${cy-r*0.8} ${cx},${cy-r*0.78}Z`;
  const gr = s*0.08;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ overflow: 'visible', filter: `drop-shadow(0 0 ${s*0.1}px ${m.glow})` }}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8a317"/><stop offset="50%" stopColor="#b47a0a"/><stop offset="100%" stopColor="#8a5c00"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0.3" y2="1"><stop offset="0%" stopColor="#4a3510"/><stop offset="50%" stopColor="#2a1e08"/><stop offset="100%" stopColor="#1a0e00"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2="0.5" y2="1"><stop offset="0%" stopColor="#ffd54f"/><stop offset="40%" stopColor="#ff8f00"/><stop offset="100%" stopColor="#e65100"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fff8e1"/><stop offset="100%" stopColor="#f5a623"/></linearGradient>
        <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated && <style>{`@keyframes dg{0%,100%{filter:drop-shadow(0 0 ${s*0.1}px ${m.glow})}50%{filter:drop-shadow(0 0 ${s*0.2}px ${m.glow})}}.bd-g{animation:dg 2.4s ease-in-out infinite}`}</style>}
      </defs>
      <g className={animated?"bd-g":""}>
        <path d={shield} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*0.05}/>
        <path d={si} fill="none" stroke="#d4880a" strokeWidth={s*0.018} opacity=".45"/>
        {[[-0.7,-0.1],[0.7,-0.1],[-0.55,0.5],[0.55,0.5],[0,0.85],[-0.8,0.15]].map(([dx,dy],i)=><circle key={i} cx={cx+r*dx} cy={cy+r*dy} r={s*0.022} fill="#e8a317" stroke="#b47a0a" strokeWidth={s*0.007}/>)}
        <path d={`M${cx},${cy-r*0.45-gr} L${cx+gr*0.75},${cy-r*0.45-gr*0.15} L${cx+gr*0.55},${cy-r*0.45+gr*0.45} L${cx},${cy-r*0.45+gr} L${cx-gr*0.55},${cy-r*0.45+gr*0.45} L${cx-gr*0.75},${cy-r*0.45-gr*0.15}Z`} fill={`url(#gem-${id})`} stroke="#ffd54f" strokeWidth={s*0.01}/>
        <line x1={cx} y1={cy-r*0.45-gr} x2={cx+gr*0.55} y2={cy-r*0.45+gr*0.45} stroke="#fff8e1" strokeWidth={s*0.005} opacity=".6"/>
        <line x1={cx} y1={cy-r*0.45-gr} x2={cx-gr*0.55} y2={cy-r*0.45+gr*0.45} stroke="#fff8e1" strokeWidth={s*0.005} opacity=".6"/>
        <circle cx={cx} cy={cy-r*0.45} r={gr*0.2} fill="#fff8e1" opacity=".4"/>
        <text x={cx} y={cy+s*0.2} textAnchor="middle" fontSize={s*0.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#b47a0a" strokeWidth={s*0.01}>D</text>
      </g>
    </svg>
  );
};

const BadgeC: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx=s/2,cy=s/2,r=s*0.44,m=RANK_META.C,id=`c-${s}`,gr=s*0.09;
  const sh=`M${cx},${cy-r} C${cx-r*.15},${cy-r*1.02} ${cx-r*.85},${cy-r*.7} ${cx-r*.88},${cy-r*.25} L${cx-r*.82},${cy+r*.35} C${cx-r*.78},${cy+r*.65} ${cx-r*.35},${cy+r*.92} ${cx},${cy+r*.98} C${cx+r*.35},${cy+r*.92} ${cx+r*.78},${cy+r*.65} ${cx+r*.82},${cy+r*.35} L${cx+r*.88},${cy-r*.25} C${cx+r*.85},${cy-r*.7} ${cx+r*.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const si=`M${cx},${cy-r*.78} C${cx-r*.12},${cy-r*.8} ${cx-r*.65},${cy-r*.55} ${cx-r*.68},${cy-r*.18} L${cx-r*.63},${cy+r*.28} C${cx-r*.6},${cy+r*.52} ${cx-r*.28},${cy+r*.72} ${cx},${cy+r*.77} C${cx+r*.28},${cy+r*.72} ${cx+r*.6},${cy+r*.52} ${cx+r*.63},${cy+r*.28} L${cx+r*.68},${cy-r*.18} C${cx+r*.65},${cy-r*.55} ${cx+r*.12},${cy-r*.8} ${cx},${cy-r*.78}Z`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow:'visible',filter:`drop-shadow(0 0 ${s*.12}px ${m.glow})`}}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#a8d8ea"/><stop offset="50%" stopColor="#7EB8D4"/><stop offset="100%" stopColor="#4a8a9e"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stopColor="#1a3040"/><stop offset="50%" stopColor="#0d1e2a"/><stop offset="100%" stopColor="#081418"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#b3e5fc"/><stop offset="40%" stopColor="#4fc3f7"/><stop offset="100%" stopColor="#0277bd"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e0f7fa"/><stop offset="100%" stopColor="#7EB8D4"/></linearGradient>
        <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated&&<style>{`@keyframes cp{0%,100%{opacity:.7}50%{opacity:1}}.bc-p{animation:cp 1.8s ease-in-out infinite}`}</style>}
      </defs>
      <path d={sh} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*.05}/>
      <path className="bc-p" d={si} fill="none" stroke="#7EB8D4" strokeWidth={s*.018} opacity=".5"/>
      {[[-0.7,-0.1],[0.7,-0.1],[-0.55,0.5],[0.55,0.5]].map(([dx,dy],i)=><circle key={i} cx={cx+r*dx} cy={cy+r*dy} r={s*.022} fill="#7EB8D4" stroke="#4a8a9e" strokeWidth={s*.007}/>)}
      <line x1={cx-s*.22} y1={cy-s*.12} x2={cx+s*.22} y2={cy-s*.12} stroke="#7EB8D4" strokeWidth={s*.02} opacity=".5" strokeLinecap="round"/>
      <line x1={cx-s*.22} y1={cy+s*.28} x2={cx+s*.22} y2={cy+s*.28} stroke="#7EB8D4" strokeWidth={s*.02} opacity=".5" strokeLinecap="round"/>
      <path d={`M${cx},${cy-r*.42-gr} L${cx+gr*.75},${cy-r*.42-gr*.15} L${cx+gr*.55},${cy-r*.42+gr*.45} L${cx},${cy-r*.42+gr} L${cx-gr*.55},${cy-r*.42+gr*.45} L${cx-gr*.75},${cy-r*.42-gr*.15}Z`} fill={`url(#gem-${id})`} stroke="#4fc3f7" strokeWidth={s*.01}/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx+gr*.55} y2={cy-r*.42+gr*.45} stroke="#e0f7fa" strokeWidth={s*.005} opacity=".6"/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx-gr*.55} y2={cy-r*.42+gr*.45} stroke="#e0f7fa" strokeWidth={s*.005} opacity=".6"/>
      <circle cx={cx} cy={cy-r*.42} r={gr*.22} fill="#e0f7fa" opacity=".45"/>
      <text x={cx} y={cy+s*.2} textAnchor="middle" fontSize={s*.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#4a8a9e" strokeWidth={s*.01}>C</text>
    </svg>);
};

const BadgeB: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx=s/2,cy=s/2,r=s*0.44,m=RANK_META.B,id=`b-${s}`,gr=s*0.09;
  const sh=`M${cx},${cy-r} C${cx-r*.15},${cy-r*1.02} ${cx-r*.85},${cy-r*.7} ${cx-r*.88},${cy-r*.25} L${cx-r*.82},${cy+r*.35} C${cx-r*.78},${cy+r*.65} ${cx-r*.35},${cy+r*.92} ${cx},${cy+r*.98} C${cx+r*.35},${cy+r*.92} ${cx+r*.78},${cy+r*.65} ${cx+r*.82},${cy+r*.35} L${cx+r*.88},${cy-r*.25} C${cx+r*.85},${cy-r*.7} ${cx+r*.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const si=`M${cx},${cy-r*.78} C${cx-r*.12},${cy-r*.8} ${cx-r*.65},${cy-r*.55} ${cx-r*.68},${cy-r*.18} L${cx-r*.63},${cy+r*.28} C${cx-r*.6},${cy+r*.52} ${cx-r*.28},${cy+r*.72} ${cx},${cy+r*.77} C${cx+r*.28},${cy+r*.72} ${cx+r*.6},${cy+r*.52} ${cx+r*.63},${cy+r*.28} L${cx+r*.68},${cy-r*.18} C${cx+r*.65},${cy-r*.55} ${cx+r*.12},${cy-r*.8} ${cx},${cy-r*.78}Z`;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow:'visible',filter:`drop-shadow(0 0 ${s*.14}px ${m.glow})`}}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#d8a0ff"/><stop offset="50%" stopColor="#9c27b0"/><stop offset="100%" stopColor="#6a1b9a"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stopColor="#2d1050"/><stop offset="50%" stopColor="#180830"/><stop offset="100%" stopColor="#0e0018"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#e1bee7"/><stop offset="40%" stopColor="#ab47bc"/><stop offset="100%" stopColor="#6a1b9a"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f8f0ff"/><stop offset="100%" stopColor="#c96eff"/></linearGradient>
        <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated&&<style>{`@keyframes ba{0%,100%{opacity:0;stroke-dashoffset:0}40%{opacity:.8}100%{stroke-dashoffset:60}}.bb-a{animation:ba 2s ease-in-out infinite;stroke-dasharray:30 60}@keyframes bg2{0%,100%{opacity:.8}50%{opacity:1}}.bb-g{animation:bg2 1.6s ease-in-out infinite}`}</style>}
      </defs>
      <path d={sh} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*.05}/>
      <path d={si} fill="none" stroke="#c96eff" strokeWidth={s*.02} opacity=".5"/>
      <path className="bb-a" d={si} fill="none" stroke="#f8f0ff" strokeWidth={s*.016}/>
      {[[-0.7,-0.1],[0.7,-0.1],[0,0.85]].map(([dx,dy],i)=><circle className="bb-g" key={i} cx={cx+r*dx} cy={cy+r*dy} r={s*.03} fill="#ab47bc" stroke="#f8f0ff" strokeWidth={s*.01}/>)}
      <path d={`M${cx},${cy-r*.42-gr} L${cx+gr*.75},${cy-r*.42-gr*.15} L${cx+gr*.55},${cy-r*.42+gr*.45} L${cx},${cy-r*.42+gr} L${cx-gr*.55},${cy-r*.42+gr*.45} L${cx-gr*.75},${cy-r*.42-gr*.15}Z`} fill={`url(#gem-${id})`} stroke="#e1bee7" strokeWidth={s*.01}/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx+gr*.55} y2={cy-r*.42+gr*.45} stroke="#f3e5f5" strokeWidth={s*.005} opacity=".6"/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx-gr*.55} y2={cy-r*.42+gr*.45} stroke="#f3e5f5" strokeWidth={s*.005} opacity=".6"/>
      <circle cx={cx} cy={cy-r*.42} r={gr*.22} fill="#f3e5f5" opacity=".5"/>
      <text x={cx} y={cy+s*.2} textAnchor="middle" fontSize={s*.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#6a1b9a" strokeWidth={s*.01}>B</text>
    </svg>);
};

const BadgeA: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx=s/2,cy=s/2,r=s*0.44,m=RANK_META.A,id=`a-${s}`,gr=s*0.1;
  const sh=`M${cx},${cy-r} C${cx-r*.15},${cy-r*1.02} ${cx-r*.85},${cy-r*.7} ${cx-r*.88},${cy-r*.25} L${cx-r*.82},${cy+r*.35} C${cx-r*.78},${cy+r*.65} ${cx-r*.35},${cy+r*.92} ${cx},${cy+r*.98} C${cx+r*.35},${cy+r*.92} ${cx+r*.78},${cy+r*.65} ${cx+r*.82},${cy+r*.35} L${cx+r*.88},${cy-r*.25} C${cx+r*.85},${cy-r*.7} ${cx+r*.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const si=`M${cx},${cy-r*.78} C${cx-r*.12},${cy-r*.8} ${cx-r*.65},${cy-r*.55} ${cx-r*.68},${cy-r*.18} L${cx-r*.63},${cy+r*.28} C${cx-r*.6},${cy+r*.52} ${cx-r*.28},${cy+r*.72} ${cx},${cy+r*.77} C${cx+r*.28},${cy+r*.72} ${cx+r*.6},${cy+r*.52} ${cx+r*.63},${cy+r*.28} L${cx+r*.68},${cy-r*.18} C${cx+r*.65},${cy-r*.55} ${cx+r*.12},${cy-r*.8} ${cx},${cy-r*.78}Z`;
  const gems=Array.from({length:6},(_,i)=>{const a=(Math.PI/180)*(60*i-30);return{x:cx+r*.72*Math.cos(a),y:cy+r*.72*Math.sin(a)};});
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow:'visible',filter:`drop-shadow(0 0 ${s*.16}px ${m.glow})`}}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#ff8a65"/><stop offset="50%" stopColor="#e53935"/><stop offset="100%" stopColor="#b71c1c"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stopColor="#4a1510"/><stop offset="50%" stopColor="#2a0a08"/><stop offset="100%" stopColor="#1a0300"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#ff8a80"/><stop offset="40%" stopColor="#f44336"/><stop offset="100%" stopColor="#b71c1c"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffd700"/><stop offset="100%" stopColor="#ff6b3d"/></linearGradient>
        <filter id={`gl-${id}`} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="4"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated&&<style>{`@keyframes ab{0%,100%{filter:drop-shadow(0 0 ${s*.16}px ${m.glow})}50%{filter:drop-shadow(0 0 ${s*.28}px ${m.glow})}}.ba-o{animation:ab 1.2s ease-in-out infinite}@keyframes at{0%,100%{opacity:.5}50%{opacity:1}}.ba-t{animation:at 1.4s ease-in-out infinite}`}</style>}
      </defs>
      <g className={animated?"ba-o":""}>
        <path d={sh} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*.05}/>
        <path d={si} fill="none" stroke="#ff5722" strokeWidth={s*.024} opacity=".6"/>
        <polygon className="ba-t" points={`${cx},${cy-s*.15} ${cx+s*.14},${cy+s*.12} ${cx-s*.14},${cy+s*.12}`} fill="none" stroke="#ff5722" strokeWidth={s*.02}/>
        {gems.map((g,i)=><circle key={i} cx={g.x} cy={g.y} r={s*.028} fill="#e53935" stroke="#ff8a65" strokeWidth={s*.01} opacity=".9"/>)}
        <path d={`M${cx},${cy-r*.42-gr} L${cx+gr*.75},${cy-r*.42-gr*.15} L${cx+gr*.55},${cy-r*.42+gr*.45} L${cx},${cy-r*.42+gr} L${cx-gr*.55},${cy-r*.42+gr*.45} L${cx-gr*.75},${cy-r*.42-gr*.15}Z`} fill={`url(#gem-${id})`} stroke="#ff8a80" strokeWidth={s*.012}/>
        <line x1={cx} y1={cy-r*.42-gr} x2={cx+gr*.55} y2={cy-r*.42+gr*.45} stroke="#ffcdd2" strokeWidth={s*.006} opacity=".6"/>
        <line x1={cx} y1={cy-r*.42-gr} x2={cx-gr*.55} y2={cy-r*.42+gr*.45} stroke="#ffcdd2" strokeWidth={s*.006} opacity=".6"/>
        <circle cx={cx} cy={cy-r*.42} r={gr*.25} fill="#ffcdd2" opacity=".5"/>
        <text x={cx} y={cy+s*.2} textAnchor="middle" fontSize={s*.42} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#b71c1c" strokeWidth={s*.012}>A</text>
      </g>
    </svg>);
};

const BadgeS: React.FC<{ s: number; animated: boolean }> = ({ s, animated }) => {
  const cx=s/2,cy=s/2,r=s*0.44,m=RANK_META.S,id=`s-${s}`,gr=s*0.11;
  const sh=`M${cx},${cy-r} C${cx-r*.15},${cy-r*1.02} ${cx-r*.85},${cy-r*.7} ${cx-r*.88},${cy-r*.25} L${cx-r*.82},${cy+r*.35} C${cx-r*.78},${cy+r*.65} ${cx-r*.35},${cy+r*.92} ${cx},${cy+r*.98} C${cx+r*.35},${cy+r*.92} ${cx+r*.78},${cy+r*.65} ${cx+r*.82},${cy+r*.35} L${cx+r*.88},${cy-r*.25} C${cx+r*.85},${cy-r*.7} ${cx+r*.15},${cy-r*1.02} ${cx},${cy-r}Z`;
  const si=`M${cx},${cy-r*.78} C${cx-r*.12},${cy-r*.8} ${cx-r*.65},${cy-r*.55} ${cx-r*.68},${cy-r*.18} L${cx-r*.63},${cy+r*.28} C${cx-r*.6},${cy+r*.52} ${cx-r*.28},${cy+r*.72} ${cx},${cy+r*.77} C${cx+r*.28},${cy+r*.72} ${cx+r*.6},${cy+r*.52} ${cx+r*.63},${cy+r*.28} L${cx+r*.68},${cy-r*.18} C${cx+r*.65},${cy-r*.55} ${cx+r*.12},${cy-r*.8} ${cx},${cy-r*.78}Z`;
  const gems=Array.from({length:6},(_,i)=>{const a=(Math.PI/180)*(60*i-30);return{x:cx+r*.72*Math.cos(a),y:cy+r*.72*Math.sin(a),gold:i%2===0};});
  const outerR=r*1.12;
  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{overflow:'visible',filter:`drop-shadow(0 0 ${s*.2}px ${m.glow})`}}>
      <defs>
        <linearGradient id={`bdr-${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f084ff"/><stop offset="50%" stopColor="#e050ff"/><stop offset="100%" stopColor="#9c27b0"/></linearGradient>
        <linearGradient id={`bg-${id}`} x1="0" y1="0" x2=".3" y2="1"><stop offset="0%" stopColor="#2d0848"/><stop offset="50%" stopColor="#180030"/><stop offset="100%" stopColor="#0f0018"/></linearGradient>
        <linearGradient id={`gem-${id}`} x1="0" y1="0" x2=".5" y2="1"><stop offset="0%" stopColor="#f8bbd0"/><stop offset="30%" stopColor="#f084ff"/><stop offset="70%" stopColor="#ffd700"/><stop offset="100%" stopColor="#9c27b0"/></linearGradient>
        <linearGradient id={`ltr-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ffffff"/><stop offset="100%" stopColor="#f0abfc"/></linearGradient>
        <filter id={`gl-${id}`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="5"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        {animated&&<style>{`@keyframes sr{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}.bs-r{animation:sr 6s linear infinite;transform-origin:${cx}px ${cy}px}@keyframes sg{0%,100%{opacity:.6;filter:drop-shadow(0 0 ${s*.18}px ${m.glow})}50%{opacity:1;filter:drop-shadow(0 0 ${s*.32}px ${m.glow})}}.bs-o{animation:sg 1.8s ease-in-out infinite}@keyframes sgm{0%,100%{opacity:.85}50%{opacity:1}}.bs-g{animation:sgm 1.3s ease-in-out infinite}`}</style>}
      </defs>
      <circle className="bs-r" cx={cx} cy={cy} r={outerR} fill="none" stroke="#ffd700" strokeWidth={s*.015} strokeDasharray={`${s*.08} ${s*.04}`} opacity=".6"/>
      <g className={animated?"bs-o":""}>
        <path d={sh} fill={`url(#bg-${id})`} stroke={`url(#bdr-${id})`} strokeWidth={s*.055}/>
      </g>
      <path d={si} fill="none" stroke="#f084ff" strokeWidth={s*.022} opacity=".6"/>
      {gems.map((g,i)=><circle className="bs-g" key={i} cx={g.x} cy={g.y} r={s*.032} fill={g.gold?"#ffd700":"#f084ff"} stroke="#fff" strokeWidth={s*.01}/>)}
      {Array.from({length:8},(_,i)=>{const a=(Math.PI/4)*i;return <line key={i} x1={cx+Math.cos(a)*s*.05} y1={cy+Math.sin(a)*s*.05} x2={cx+Math.cos(a)*s*.18} y2={cy+Math.sin(a)*s*.18} stroke={i%2===0?"#f084ff":"#ffd700"} strokeWidth={s*.018} opacity=".45" strokeLinecap="round"/>;})}
      <path d={`M${cx},${cy-r*.42-gr} L${cx+gr*.8},${cy-r*.42-gr*.1} L${cx+gr*.6},${cy-r*.42+gr*.5} L${cx},${cy-r*.42+gr*1.05} L${cx-gr*.6},${cy-r*.42+gr*.5} L${cx-gr*.8},${cy-r*.42-gr*.1}Z`} fill={`url(#gem-${id})`} stroke="#f8bbd0" strokeWidth={s*.012}/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx+gr*.6} y2={cy-r*.42+gr*.5} stroke="#fff" strokeWidth={s*.006} opacity=".65"/>
      <line x1={cx} y1={cy-r*.42-gr} x2={cx-gr*.6} y2={cy-r*.42+gr*.5} stroke="#fff" strokeWidth={s*.006} opacity=".65"/>
      <circle cx={cx} cy={cy-r*.42} r={gr*.28} fill="#fff" opacity=".45"/>
      <text x={cx} y={cy+s*.2} textAnchor="middle" fontSize={s*.44} fontWeight="900" fontFamily="'Arial Black',sans-serif" fill={`url(#ltr-${id})`} filter={`url(#gl-${id})`} stroke="#ffd700" strokeWidth={s*.014}>S</text>
    </svg>);
};

/* ─── Utility ───────────────────────────────────────────────────────────────── */

function hexPts(cx: number, cy: number, r: number, offsetDeg = 0): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i + offsetDeg);
    return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`;
  }).join(' ');
}


/* ─── Main export ───────────────────────────────────────────────────────────── */

const BADGE_COMPONENTS: Record<RankType, React.FC<{ s: number; animated: boolean }>> = {
  UNRANKED: BadgeUnranked,
  E: BadgeE,
  D: BadgeD,
  C: BadgeC,
  B: BadgeB,
  A: BadgeA,
  S: BadgeS,
};

const RankBadge: React.FC<RankBadgeProps> = ({
  rank,
  size = 56,
  animated = true,
  showLabel = false,
  className = '',
}) => {
  const meta = RANK_META[rank];
  const BadgeComp = BADGE_COMPONENTS[rank];

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      whileHover={{ scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
    >
      <BadgeComp s={size} animated={animated} />
      {showLabel && (
        <div
          className="mt-1 text-[9px] font-black tracking-[0.22em] font-mono uppercase"
          style={{ color: meta.labelColor, textShadow: `0 0 8px ${meta.glow}` }}
        >
          {rank === 'UNRANKED' ? 'UNRANKED' : `${rank}-RANK`}
        </div>
      )}
    </motion.div>
  );
};

export default RankBadge;

