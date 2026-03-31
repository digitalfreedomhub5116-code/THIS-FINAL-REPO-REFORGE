/**
 * Recolor legendary_chest.json → daily_chest.json (cyan) & alliance_chest.json (purple)
 *
 * Lottie stores colours as [r,g,b] with values 0-1.
 * We convert to HSL, shift the hue, adjust saturation/lightness, then write back.
 */
const fs = require('fs');
const path = require('path');

// ── helpers ──────────────────────────────────────────────────────────────
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue2rgb(p, q, h + 1/3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1/3)];
}

function clamp(v) { return Math.round(Math.min(1, Math.max(0, v)) * 1000) / 1000; }

/**
 * Shift a colour [r,g,b] (0-1) by the given hue offset (0-1) and
 * optionally tweak saturation multiplier and lightness offset.
 */
function shiftColor(rgb, hueTarget, satMul = 1, lightOff = 0) {
  const [r, g, b] = rgb;
  // Skip near-black, near-white, or very desaturated colours (UI chrome)
  let [h, s, l] = rgbToHsl(r, g, b);
  if (s < 0.08 || l < 0.04 || l > 0.96) return rgb; // leave greys alone

  // Map the hue to the target hue range
  h = hueTarget + (h - h) * 0.15; // mostly override hue, keep tiny variation
  // Add slight hue variation based on original to keep depth
  const origH = rgbToHsl(r, g, b)[0];
  h = hueTarget + (origH - 0.1) * 0.08;

  s = clamp(s * satMul);
  l = clamp(l + lightOff);

  const [nr, ng, nb] = hslToRgb(h % 1, s, l);
  return [clamp(nr), clamp(ng), clamp(nb)];
}

/**
 * Recursively walk the Lottie JSON tree and recolor every colour value.
 * Lottie colour locations:
 *  - Fill/Stroke: obj.c.k = [r,g,b] or obj.c.k = [{s:[r,g,b], ...}, ...]
 *  - Gradient stops also live under k arrays
 */
function walkAndRecolor(obj, hueTarget, satMul, lightOff) {
  if (Array.isArray(obj)) {
    obj.forEach(item => walkAndRecolor(item, hueTarget, satMul, lightOff));
    return;
  }
  if (obj === null || typeof obj !== 'object') return;

  // Check if this node is a colour property (ty: "fl" or "st" with a "c" child)
  if (obj.c && typeof obj.c === 'object') {
    const c = obj.c;
    if (c.k) {
      // Static colour: c.k = [r, g, b] or [r, g, b, a]
      if (Array.isArray(c.k) && c.k.length >= 3 && c.k.length <= 4 && typeof c.k[0] === 'number') {
        const shifted = shiftColor([c.k[0], c.k[1], c.k[2]], hueTarget, satMul, lightOff);
        c.k[0] = shifted[0];
        c.k[1] = shifted[1];
        c.k[2] = shifted[2];
      }
      // Animated colour: c.k = [{ s:[r,g,b], e:[r,g,b], t:... }, ...]
      if (Array.isArray(c.k) && c.k.length > 0 && typeof c.k[0] === 'object') {
        c.k.forEach(kf => {
          if (kf.s && Array.isArray(kf.s) && kf.s.length >= 3 && typeof kf.s[0] === 'number') {
            const shifted = shiftColor([kf.s[0], kf.s[1], kf.s[2]], hueTarget, satMul, lightOff);
            kf.s[0] = shifted[0]; kf.s[1] = shifted[1]; kf.s[2] = shifted[2];
          }
          if (kf.e && Array.isArray(kf.e) && kf.e.length >= 3 && typeof kf.e[0] === 'number') {
            const shifted = shiftColor([kf.e[0], kf.e[1], kf.e[2]], hueTarget, satMul, lightOff);
            kf.e[0] = shifted[0]; kf.e[1] = shifted[1]; kf.e[2] = shifted[2];
          }
        });
      }
    }
  }

  // Also handle gradient colour stops (ty: "gf" or "gs")
  // Gradient stops are in g.k.k array as flat [offset, r, g, b, offset, r, g, b, ...]
  if (obj.g && typeof obj.g === 'object' && obj.g.k && typeof obj.g.k === 'object') {
    const gk = obj.g.k;
    const recolorStops = (arr) => {
      if (!Array.isArray(arr)) return;
      // Gradient stops: [pos, r, g, b, pos, r, g, b, ...]
      const p = obj.g.p || 0; // number of colour stops
      for (let i = 0; i < p && (i * 4 + 3) < arr.length; i++) {
        const base = i * 4;
        const r = arr[base + 1], g = arr[base + 2], b = arr[base + 3];
        if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
          const shifted = shiftColor([r, g, b], hueTarget, satMul, lightOff);
          arr[base + 1] = shifted[0];
          arr[base + 2] = shifted[1];
          arr[base + 3] = shifted[2];
        }
      }
    };
    if (Array.isArray(gk.k)) {
      if (typeof gk.k[0] === 'number') {
        recolorStops(gk.k);
      } else {
        gk.k.forEach(kf => {
          if (kf.s) recolorStops(kf.s);
          if (kf.e) recolorStops(kf.e);
        });
      }
    }
  }

  // Recurse into all child properties
  for (const key of Object.keys(obj)) {
    if (key === 'c' || key === 'g') continue; // already handled above
    walkAndRecolor(obj[key], hueTarget, satMul, lightOff);
  }
}

// ── main ─────────────────────────────────────────────────────────────────
const srcPath = path.join(__dirname, '..', 'public', 'assets', 'lottie', 'legendary_chest.json');
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

// Daily Chest → Cyan (hue ~0.52)
const daily = JSON.parse(JSON.stringify(src));
walkAndRecolor(daily, 0.52, 1.15, 0.02);
daily.nm = 'Daily Chest';
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'assets', 'lottie', 'daily_chest.json'),
  JSON.stringify(daily)
);
console.log('✅ daily_chest.json written');

// Alliance Chest → Purple (hue ~0.78)
const alliance = JSON.parse(JSON.stringify(src));
walkAndRecolor(alliance, 0.78, 1.2, -0.02);
alliance.nm = 'Alliance Chest';
fs.writeFileSync(
  path.join(__dirname, '..', 'public', 'assets', 'lottie', 'alliance_chest.json'),
  JSON.stringify(alliance)
);
console.log('✅ alliance_chest.json written');
