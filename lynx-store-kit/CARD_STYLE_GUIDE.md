# GlowCard — Pixel-Perfect Style Specification

## ⚠️ IMPORTANT: Copy these values EXACTLY
Every color, size, shadow, and gradient listed here must be replicated precisely to match the Lynx AI store cards. This is a complete visual spec — no guesswork needed.

---

## 1. Category Accent Colors (`catColor`)
Each card section uses a different accent color. All gradients, borders, glows, and text colors reference `catColor`:
```ts
const CAT_COLORS = {
  border: '#705820',   // Dark warm gold
  theme:  '#8B5CF6',   // Purple/violet
  deals:  '#8d702d',   // Amber gold
  banner: '#06B6D4',   // Cyan
};
```

---

## 2. Card Shape — Clipped Corners (NOT border-radius)
The card uses a **polygon clip-path** with clipped top-right and bottom-left corners:
```ts
const chipSize = 14; // px — corner cut size

const clipPath = `polygon(
  0 0,
  calc(100% - ${chipSize}px) 0,
  100% ${chipSize}px,
  100% 100%,
  ${chipSize}px 100%,
  0 calc(100% - ${chipSize}px)
)`;
```

---

## 3. Full Card Structure (3 nested layers)

### Layer 1: Outer Glow Wrapper
```css
filter: drop-shadow(0 0 12px ${catColor}40) drop-shadow(0 4px 16px rgba(0,0,0,0.6));
```

### Layer 2: Gradient Border Frame (3px visible border)
```css
clip-path: /* same clipPath */;
padding: 3px;
background: linear-gradient(160deg, ${catColor}CC, ${catColor}50 40%, ${catColor}90 80%, ${catColor}CC);
```

### Layer 3: Inner Card Body
```css
clip-path: /* same clipPath */;
background: linear-gradient(160deg, ${catColor}40 0%, ${catColor}22 25%, #111828 55%, #0d1118 100%);
position: relative;
text-align: center;
padding: 16px 10px 14px;
min-height: 210px;
display: flex;
flex-direction: column;
align-items: center;
```

---

## 4. Diagonal Shine Streaks (3 layers, all inside inner card)

All shines share this container:
```css
position: absolute; top: 0; left: 0; right: 0; bottom: 0;
pointer-events: none; z-index: 1; overflow: hidden;
```

### Primary Shine (thickest, most visible)
```css
position: absolute; top: -80%; left: -25%;
width: 55%; height: 260%;
background: linear-gradient(72deg,
  transparent 36%,
  rgba(255,255,255,0.06) 42%,
  rgba(255,255,255,0.14) 46%,
  rgba(255,255,255,0.22) 48%,
  rgba(255,255,255,0.14) 50%,
  rgba(255,255,255,0.06) 54%,
  transparent 60%
);
transform: rotate(25deg);
```

### Secondary Shine
```css
position: absolute; top: -80%; left: 12%;
width: 40%; height: 260%;
background: linear-gradient(72deg,
  transparent 40%,
  rgba(255,255,255,0.04) 44%,
  rgba(255,255,255,0.12) 47%,
  rgba(255,255,255,0.18) 49%,
  rgba(255,255,255,0.12) 51%,
  rgba(255,255,255,0.04) 54%,
  transparent 58%
);
transform: rotate(25deg);
```

### Tertiary Shine (thinnest)
```css
position: absolute; top: -80%; left: 42%;
width: 28%; height: 260%;
background: linear-gradient(72deg,
  transparent 44%,
  rgba(255,255,255,0.03) 47%,
  rgba(255,255,255,0.08) 49%,
  rgba(255,255,255,0.03) 51%,
  transparent 54%
);
transform: rotate(25deg);
```

---

## 5. Top Edge Glow Line
```css
position: absolute; top: 0;
left: 14px;   /* chipSize */
right: 14px;  /* chipSize */
height: 1.5px;
background: linear-gradient(90deg, transparent, ${catColor}BB, transparent);
z-index: 2;
```

---

## 6. Discount Badge (top-left, only when discount exists)
```css
position: absolute; top: 8px; left: 8px; z-index: 3;
padding: 3px 8px;
border-radius: 6px;
background: #22C55E;
font-size: 9px;
font-weight: 900;
color: #000;
box-shadow: 0 0 10px rgba(34,197,94,0.5);
```
Text content: `-${discount}%`

---

## 7. Info Button (ⓘ) — top-right
```css
position: absolute; top: 8px; right: 8px; z-index: 3;
width: 22px; height: 22px;
border-radius: 6px;
background: ${catColor}30;
border: 1px solid ${catColor}50;
display: flex; align-items: center; justify-content: center;
font-size: 11px;
font-weight: 900;
color: ${catColor};
cursor: pointer;
```
Text content: `i`

---

## 8. Name & Category Text

### Item Name
```css
font-size: 15px;
font-weight: 900;
color: #fff;
line-height: 1.2;
margin-bottom: 3px;
text-shadow: 0 2px 8px rgba(0,0,0,0.5);
```
**Note:** When a discount badge exists, add `margin-top: 18px` to the text container to prevent overlap.

### Category Label
```css
font-size: 11px;
font-weight: 600;
color: ${catColor};
text-transform: capitalize;
opacity: 0.9;
```
Text content: `${tier} ${category}` (e.g., "epic border")

---

## 9. Preview Area (center of card)
```css
flex: 1;
display: flex; align-items: center; justify-content: center;
position: relative; z-index: 2;
width: 100%; min-height: 110px;
overflow: visible;
```

### Radial Glow Behind Preview
```css
position: absolute; top: 50%; left: 50%;
width: 110px; height: 110px;
border-radius: 50%;
background: radial-gradient(circle, ${catColor}25 0%, ${catColor}08 50%, transparent 70%);
transform: translate(-50%, -50%);
```

---

## 10. Border Preview Types

### A. PNG Image Border (most borders)
Container: `position: relative; width: 100px; height: 100px; overflow: visible;`

**Avatar circle (inside border):**
```css
position: absolute; top: 50%; left: 50%;
width: 64px; height: 64px;
border-radius: 50%;
background: radial-gradient(circle, #3a3a4a, #1a1a24);
transform: translate(-50%, -50%);
z-index: 1;
overflow: hidden;
```
Contains user avatar image or default silhouette SVG.

**Border image (overlay):**
```css
position: absolute; top: 50%; left: 50%;
width: ${(imageScale || 1) * 100}%;    /* e.g., 120% for scale 1.2 */
height: ${(imageScale || 1) * 100}%;
transform: translate(-50%, calc(-50% + ${imageOffsetY || 0}px));
object-fit: contain;
z-index: 2;
pointer-events: none;
```

**Animated borders:**
- Rotate: `animation: spin-clockwise 10s linear infinite;`
- Pulse: wrapped in div with `animation: border-breathe-centered 3s ease-in-out infinite;`

### B. CSS Aura Border
Container: `position: relative; width: 110px; height: 110px; overflow: visible;`

**Ambient glow:**
```css
position: absolute; top: 50%; left: 50%;
width: 120px; height: 120px;
border-radius: 50%;
background: radial-gradient(circle, ${colors[0]}30 0%, ${colors[1]}15 40%, transparent 70%);
transform: translate(-50%, -50%);
animation: pulse-glow ${pulseSpeed || 3}s ease-in-out infinite;  /* if animated */
```

**Main aura ring:**
```css
position: absolute; top: 50%; left: 50%;
width: 82px; height: 82px;
border-radius: 50%;
transform: translate(-50%, -50%);
border: 3px solid ${colors[0]}CC;
box-shadow:
  0 0 6px 2px ${colors[0]}AA,
  0 0 14px 4px ${colors[0]}70,
  0 0 24px 6px ${colors[1]}50,
  0 0 40px 10px ${colors[2] || colors[0]}35,
  0 0 60px 14px ${colors[3] || colors[1]}20,
  inset 0 0 10px 3px ${colors[0]}40,
  inset 0 0 20px 6px ${colors[1]}25;
animation: aura-rotate 8s linear infinite;  /* if animated */
z-index: 1;
```

**Outer glow ring:**
```css
position: absolute; top: 50%; left: 50%;
width: 90px; height: 90px;
border-radius: 50%;
transform: translate(-50%, -50%);
border: 1.5px solid ${colors[1]}50;
box-shadow: 0 0 12px 3px ${colors[1]}40, 0 0 30px 8px ${colors[2] || colors[0]}20;
animation: pulse-glow ${pulseSpeed || 3}s ease-in-out infinite;  /* if animated */
z-index: 1;
```

**Center avatar (inside aura):**
```css
position: absolute; top: 50%; left: 50%;
width: 72px; height: 72px;
border-radius: 50%;
background: radial-gradient(circle, #2a2a3a, #1a1a24);
transform: translate(-50%, -50%);
z-index: 3;
overflow: hidden;
box-shadow: 0 0 8px ${colors[0]}80, inset 0 0 6px ${colors[0]}30;
```

### C. SVG Border Ring
Uses `<BorderRing>` component with `size={90}`.

### D. Theme Swatch
```css
width: 90%; /* of card */
```
Three color bars side by side:
- Bar 1: `background: ${bg}` (darkest)
- Bar 2: `background: ${surface}` (medium)
- Bar 3: `background: linear-gradient(135deg, ${primary}, ${surface})`
- Accent dot: `position: absolute; bottom: 6px; right: 8px; width: 12px; height: 12px; border-radius: 50%; background: ${primary}; border: 2px solid rgba(255,255,255,0.2);`
- Container: `height: 48px; border-radius: 8px; overflow: hidden;`

---

## 11. Bottom Action Button

### Buy Button (not owned)
```css
display: inline-flex; align-items: center; gap: 5px;
padding: 8px 22px;
border-radius: 20px;
background: linear-gradient(135deg, ${catColor}35, ${catColor}15);  /* can afford */
           /* OR rgba(255,255,255,0.04) if can't afford */
border: 2px solid ${catColor}60;  /* can afford */
      /* OR 2px solid rgba(255,255,255,0.08) if can't */
color: #fff;  /* can afford */
     /* OR var(--text-muted) if can't */
font-size: 13px;
font-weight: 800;
box-shadow: 0 0 12px ${catColor}25;  /* can afford only */
transition: all 0.2s;
```

### Equip Button (owned)
```css
display: inline-flex; align-items: center; gap: 4px;
padding: 8px 24px;
border: none;
border-radius: 20px;
/* Equipped: */
background: linear-gradient(135deg, ${catColor}, ${catColor}CC);
color: #000;
box-shadow: 0 0 14px ${catColor}50;
/* Not equipped: */
background: rgba(255,255,255,0.08);
color: ${catColor};
font-size: 11px;
font-weight: 800;
letter-spacing: 0.5px;
```

### Owned Label (no equip)
```css
font-size: 11px;
font-weight: 700;
color: #22C55E;
```
Text: `✓ Owned`

---

## 12. Grid Layout
Cards are displayed in a 2-column grid:
```css
display: grid;
grid-template-columns: 1fr 1fr;
gap: 14px;
padding: 0 14px 120px;
```

---

## 13. Required CSS Keyframes
```css
@keyframes spin-clockwise {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to   { transform: translate(-50%, -50%) rotate(360deg); }
}
@keyframes border-breathe-centered {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50%      { transform: translate(-50%, -50%) scale(1.08); }
}
@keyframes pulse-glow {
  0%, 100% { opacity: 0.65; filter: brightness(0.9); }
  50%      { opacity: 1; filter: brightness(1.3); }
}
@keyframes aura-rotate {
  from { filter: hue-rotate(0deg) brightness(1.1); }
  to   { filter: hue-rotate(360deg) brightness(1.1); }
}
```

---

## 14. Default Avatar Silhouette SVG
When no user avatar is available:
```jsx
<svg width="46" height="46" viewBox="0 0 40 40">
  <circle cx="20" cy="16" r="7" fill="#555568" />
  <ellipse cx="20" cy="35" rx="13" ry="10" fill="#4a4a5a" />
</svg>
```
(Use `width="56" height="56"` for the aura variant which has a larger center.)

---

## 15. Quick Reference — Full Color Palette

| Element | Value |
|---------|-------|
| Card body dark | `#111828` → `#0d1118` |
| White shine peak | `rgba(255,255,255,0.22)` |
| Discount green | `#22C55E` |
| Discount glow | `rgba(34,197,94,0.5)` |
| Avatar bg (dark) | `radial-gradient(circle, #3a3a4a, #1a1a24)` |
| Avatar bg (aura) | `radial-gradient(circle, #2a2a3a, #1a1a24)` |
| Default head | `#555568` |
| Default body | `#4a4a5a` |
| Text primary | `#fff` |
| Text shadow | `0 2px 8px rgba(0,0,0,0.5)` |
| Rank badge bg | `rgba(0,0,0,0.85)` |
| Rank badge color | `#F59E0B` |
| Rank badge border | `1px solid rgba(245,158,11,0.3)` |
