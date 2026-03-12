import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  color?: string;
}

function lighten(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * t));
  const ng = Math.min(255, Math.round(g + (255 - g) * t));
  const nb = Math.min(255, Math.round(b + (255 - b) * t));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

function darken(hex: string, t: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.max(0, Math.round(r * (1 - t)));
  const ng = Math.max(0, Math.round(g * (1 - t)));
  const nb = Math.max(0, Math.round(b * (1 - t)));
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

export const AttackIcon: React.FC<IconProps> = ({ size = 28, className = '', color = '#935251' }) => {
  const mid = color;
  const light = lighten(color, 0.55);
  const dark = darken(color, 0.35);
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="atk-blade1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="atk-blade2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="atk-guard1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <filter id="atk-glow">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g transform="rotate(-45, 14, 14)" filter="url(#atk-glow)">
        <polygon points="14,2 15.2,12 14,13.5 12.8,12" fill="url(#atk-blade1)" />
        <polygon points="14,2 14.5,4 14,5 13.5,4" fill="white" opacity="0.8" />
        <rect x="10.5" y="12.5" width="7" height="1.8" rx="0.5" fill="url(#atk-guard1)" />
        <rect x="13.2" y="14.3" width="1.6" height="6" rx="0.6" fill={dark} />
        <ellipse cx="14" cy="20.8" rx="1.4" ry="1" fill={darken(color, 0.5)} />
      </g>
      <g transform="rotate(45, 14, 14)" filter="url(#atk-glow)">
        <polygon points="14,2 15.2,12 14,13.5 12.8,12" fill="url(#atk-blade2)" />
        <polygon points="14,2 14.5,4 14,5 13.5,4" fill="white" opacity="0.8" />
        <rect x="10.5" y="12.5" width="7" height="1.8" rx="0.5" fill="url(#atk-guard1)" />
        <rect x="13.2" y="14.3" width="1.6" height="6" rx="0.6" fill={dark} />
        <ellipse cx="14" cy="20.8" rx="1.4" ry="1" fill={darken(color, 0.5)} />
      </g>
      <polygon points="14,11.5 15,13 14,14.5 13,13" fill={light} opacity="0.9" />
    </svg>
  );
};

export const BoostIcon: React.FC<IconProps> = ({ size = 28, className = '', color = '#7F61A4' }) => {
  const light = lighten(color, 0.55);
  const mid = color;
  const dark = darken(color, 0.35);
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bst-key" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id="bst-arrow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={mid} />
          <stop offset="100%" stopColor={light} />
        </linearGradient>
        <filter id="bst-glow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="10" cy="10" r="5" stroke="url(#bst-key)" strokeWidth="2.5" fill="none" />
      <circle cx="10" cy="10" r="1.6" fill={dark} opacity="0.6" />
      <rect x="13.5" y="9.2" width="8" height="1.6" rx="0.6" fill="url(#bst-key)" />
      <rect x="17" y="10.8" width="1.2" height="2" rx="0.3" fill="url(#bst-key)" />
      <rect x="19.5" y="10.8" width="1.2" height="2.5" rx="0.3" fill="url(#bst-key)" />
      <line x1="8.5" y1="8.5" x2="9.5" y2="9.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
      <g filter="url(#bst-glow)">
        <polygon points="22,17 25,22 23.2,22 23.2,27 20.8,27 20.8,22 19,22" fill="url(#bst-arrow)" />
      </g>
      <circle cx="22" cy="16.5" r="1.5" fill={mid} opacity="0.5" />
    </svg>
  );
};

export const ExtractIcon: React.FC<IconProps> = ({ size = 28, className = '', color = '#595F9C' }) => {
  const light = lighten(color, 0.55);
  const mid = color;
  const dark = darken(color, 0.4);
  const vdark = darken(color, 0.65);
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ext-outer" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="40%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id="ext-inner" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={vdark} />
          <stop offset="50%" stopColor={dark} />
          <stop offset="100%" stopColor={darken(color, 0.75)} />
        </linearGradient>
        <filter id="ext-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#ext-glow)">
        <path
          d="M14 26 C8 26 5 21 5 17 C5 12 8 9 10 7 C10 10 11 11 12 10 C12 7 13 4 14 2 C15 4 15.5 7 15 10 C17 9 17.5 8 17 6 C19 8 23 12 23 17 C23 21 20 26 14 26Z"
          fill="url(#ext-outer)"
        />
      </g>
      <path
        d="M14 24 C10 24 8 20 8 17 C8 14 10 11.5 11.5 10 C11.5 12 12 13 13 12.5 C13 10.5 13.5 8.5 14 7 C14.5 8.5 14.5 11 14 12.5 C15 12.5 16 11.5 15.5 9.5 C17 11 20 14 20 17 C20 20 18 24 14 24Z"
        fill="url(#ext-inner)"
      />
      <path
        d="M14 22 C12 22 11 19.5 11 17.5 C11 15.5 12.5 13.5 14 13 C15.5 13.5 17 15.5 17 17.5 C17 19.5 16 22 14 22Z"
        fill={light}
        opacity="0.5"
      />
      <circle cx="14" cy="17.5" r="2" fill={lighten(color, 0.7)} opacity="0.8" />
      <line x1="12" y1="14" x2="10.5" y2="12.5" stroke={light} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
      <line x1="16" y1="14" x2="17.5" y2="12.5" stroke={light} strokeWidth="0.8" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
};

export const UltimateIcon: React.FC<IconProps> = ({ size = 28, className = '', color = '#9F8232' }) => {
  const light = lighten(color, 0.55);
  const mid = color;
  const dark = darken(color, 0.35);
  const vlight = lighten(color, 0.75);
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ult-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={mid} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
        <linearGradient id="ult-inner" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={vlight} />
          <stop offset="100%" stopColor={light} />
        </linearGradient>
        <filter id="ult-glow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <g filter="url(#ult-glow)">
        <circle cx="14" cy="14" r="12" stroke="url(#ult-ring)" strokeWidth="1.5" fill="none" strokeDasharray="4 2" />
      </g>
      <circle cx="14" cy="14" r="8.5" stroke={mid} strokeWidth="1" fill="none" opacity="0.7" />
      <rect x="13.3" y="2.5" width="1.4" height="3" rx="0.4" fill={vlight} />
      <rect x="13.3" y="22.5" width="1.4" height="3" rx="0.4" fill={vlight} />
      <rect x="2.5" y="13.3" width="3" height="1.4" rx="0.4" fill={vlight} />
      <rect x="22.5" y="13.3" width="3" height="1.4" rx="0.4" fill={vlight} />
      <rect x="5.8" y="5.1" width="1.2" height="2.5" rx="0.3" fill={light} transform="rotate(45,6.4,6.35)" />
      <rect x="20.5" y="5.1" width="1.2" height="2.5" rx="0.3" fill={light} transform="rotate(-45,21.1,6.35)" />
      <rect x="5.8" y="20.4" width="1.2" height="2.5" rx="0.3" fill={light} transform="rotate(-45,6.4,21.65)" />
      <rect x="20.5" y="20.4" width="1.2" height="2.5" rx="0.3" fill={light} transform="rotate(45,21.1,21.65)" />
      <g filter="url(#ult-glow)">
        <polygon points="14,7 15,12 18,12 15.5,15 16.5,20 14,17 11.5,20 12.5,15 10,12 13,12" fill="url(#ult-inner)" />
      </g>
      <circle cx="14" cy="14" r="2.5" fill={vlight} />
      <circle cx="13.2" cy="13.2" r="0.8" fill="white" opacity="0.8" />
      <polygon points="3,3 3.8,3 3.4,2.2" fill={vlight} opacity="0.8" />
      <polygon points="25,3 25.8,3 25.4,2.2" fill={vlight} opacity="0.8" />
      <polygon points="3,25 3.8,25 3.4,25.8" fill={vlight} opacity="0.8" />
      <polygon points="25,25 25.8,25 25.4,25.8" fill={vlight} opacity="0.8" />
    </svg>
  );
};
