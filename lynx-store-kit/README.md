# Lynx AI Store Kit — Integration Reference Package

## ⚠️ CRITICAL: DO NOT REPLACE THE EXISTING STORE
This kit is meant to **ADD new sections** to an existing store page. The target app already has a store with an **"Outfit" section** — **DO NOT touch, modify, or remove the Outfit section**. You must merge the new sections (Borders, Themes, Banners, Deals) alongside the existing Outfit tab.

## What This Kit Adds
These are the NEW store sections to integrate into the existing store:

1. **Deals Tab** — Rotating daily discounts with countdown timer
2. **Borders Tab** — 15+ avatar border styles (SVG rings, PNG overlays, Lottie animations, CSS aura glows)
3. **Themes Tab** — 20+ app color themes that change the entire UI palette
4. **Banners Tab** — 7 profile banners

**The existing Outfit section must remain untouched and continue working as before.**

## Integration Strategy

### What TO DO:
- Add new tab buttons (Deals, Borders, Themes, Banners) next to the existing Outfit tab
- Add the rendering logic for the new sections when those tabs are selected
- Copy the assets (banners, borders) into `public/`
- Add the CSS keyframe animations from `store-animations.css`
- Import the item data from `storeItems.ts`
- Import the economy functions from `economy.ts`
- Import the reusable components from `StoreComponents.tsx`

### What NOT TO DO:
- ❌ Do NOT replace the existing Store component
- ❌ Do NOT remove or modify the Outfit section
- ❌ Do NOT change how outfits are rendered, purchased, or equipped
- ❌ Do NOT restructure the existing store layout
- ❌ Do NOT remove any existing tab or section

## File Structure
```
lynx-store-kit/
├── README.md                    ← This file (integration guide)
├── assets/
│   ├── banners/                 ← 7 banner images (copy to public/banners/)
│   │   ├── default.jpg
│   │   ├── banner1.jpg          ← McLaren
│   │   ├── banner2.jpg          ← Hot Looks
│   │   ├── banner3.jpg          ← No Enemies
│   │   ├── banner4.jpg          ← Porsche 911 JDM
│   │   ├── banner5.jpg          ← Fine Shyt
│   │   └── banner6.jpg          ← Model of the Year
│   └── borders/                 ← 13 border assets (copy to public/borders/)
│       ├── border-eagle.png
│       ├── border-frost-tech.png
│       ├── border-golddragon.png
│       ├── border-goldlion.png
│       ├── border-mixed.png
│       ├── border-phoenix.png
│       ├── border-stitched-dragon.png
│       ├── dragon.png
│       ├── ice-transparent.png
│       ├── lightning-transparent.png
│       ├── lottie-border.json    ← Animated Lottie border (8.5MB)
│       ├── purple.png
│       └── rotate.png            ← Star Crown (pulse animated)
└── src/
    ├── Store.tsx                 ← REFERENCE ONLY — do NOT paste this wholesale
    ├── storeItems.ts             ← Item catalog: all borders, themes, banners
    ├── StoreComponents.tsx       ← Reusable: LynxCoin, BorderRing, ThemeSwatch
    ├── economy.ts                ← Economy engine: coins, credits, purchases
    └── store-animations.css      ← Required CSS keyframe animations
```

## Dependencies (npm)
Make sure these are installed:
- `lucide-react` (for icons: ShoppingBag, Lock, Flame, Zap, Star, etc.)
- `lottie-react` (for animated Lottie borders)

## Step-by-Step Integration

### Step 1: Copy Assets
```
Copy assets/banners/* → your-app/public/banners/
Copy assets/borders/* → your-app/public/borders/
```

### Step 2: Add Source Files
Place these as NEW files (don't overwrite anything):
- `storeItems.ts` → your data/lib folder
- `StoreComponents.tsx` → your components folder  
- `economy.ts` → your lib folder

### Step 3: Add CSS Animations
Append the contents of `store-animations.css` to your existing main CSS file. These are all the `@keyframes` used by border animations, card effects, and modals.

### Step 4: Merge Into Existing Store
Open your existing Store component and:

1. **Add new tab buttons** alongside "Outfit":
   - Deals, Borders, Themes, Banners
   
2. **Add conditional rendering** for each new section. Reference `Store.tsx` for the exact JSX — look for these sections:
   - `{shopSection === 'deals' && ( ... )}` — Deals grid with GlowCard
   - `{shopSection === 'border' && ( ... )}` — Border cards with avatar preview
   - `{shopSection === 'theme' && ( ... )}` — Theme swatch cards
   - `{shopSection === 'banner' && ( ... )}` — Banner image cards

3. **Add the GlowCard component** — This is the premium card used for all items. It's defined as a function inside `Store.tsx` (search for `function GlowCard`).

4. **Add the Preview Modals** — Two modals for the "ⓘ" info button:
   - `BorderPreviewModal` — fullscreen avatar + border preview
   - `ThemePreviewModal` — mockup of Home + Workout pages in theme colors

### Step 5: Adapt Economy
The economy system (`economy.ts`) uses localStorage. If your app already has a currency system, you may want to:
- Map `Lynx Coins` → your existing currency (e.g., gold, crystals)
- Keep the `equipped` state management (border, theme, banner slots)
- Keep `applyThemeVars()` — it sets CSS variables on `document.documentElement`

### Step 6: Remove Lynx-Specific Code
In `Store.tsx`, remove this import and its usage:
```tsx
// REMOVE:
import { syncBorderToLeaderboard } from '../lib/leaderboard';
```

### Step 7: CSS Variables
The store uses these CSS custom properties. Add them to your `:root` or adapt to your existing variables:
```css
:root {
  --primary: #C8A84E;
  --primary-rgb: 200,168,78;
  --surface: #12141a;
  --bg: #0a0a0f;
  --border: rgba(200,168,78,0.08);
  --text-muted: rgba(255,255,255,0.5);
}
```

## Feature Details

### GlowCard Component
The main card for displaying purchasable items. Props:
```tsx
interface GlowCardProps {
  item: StoreItem;          // The item data
  discount?: number;        // Optional discount percentage
  owned?: boolean;          // Whether user owns it
  equipped?: boolean;       // Whether currently equipped
  canAfford: boolean;       // Has enough coins
  onBuy: () => void;        // Purchase handler
  onEquip?: () => void;     // Equip handler
  onInfo?: () => void;      // Opens preview modal
  avatarUrl?: string;       // User's profile picture URL
}
```

### Border Types (4 kinds)
| Type | Data Properties | Visual |
|------|----------------|--------|
| **SVG Ring** | `borderConfig: { colors, strokeWidth, ... }` | Gradient ring around avatar |
| **PNG Overlay** | `imageBorder: '/borders/file.png'` | Full PNG image over avatar |
| **Lottie** | `lottieBorder: '/borders/lottie-border.json'` | Animated JSON overlay |
| **CSS Aura** | `auraConfig: { colors, animated }` | Glowing box-shadow ring |

### PNG Border Animations
| Animation | Config | Effect |
|-----------|--------|--------|
| Rotate | `imageAnimated: true, imageAnimationType: 'rotate'` | Spins continuously |
| Pulse/Breathe | `imageAnimated: true, imageAnimationType: 'pulse'` | Smooth scale in/out |
| Static | `imageAnimated: false` | No animation |

### Theme System
Each theme has `themeVars` — a dictionary of CSS variable overrides:
```ts
themeVars: {
  '--primary': '#DC2626',
  '--primary-rgb': '220,38,38',
  '--surface': '#1a0808',
  '--bg': '#0a0000',
  '--border': 'rgba(220,38,38,0.15)'
}
```
Apply with: `applyThemeVars(item.themeVars)` — sets values on `document.documentElement.style`.

### Info Modal Previews
- **Border ⓘ**: Shows large avatar with border overlay, glow, and animations
- **Theme ⓘ**: Shows mockup of Home page (score, features, streak) and Workout page (exercises, progress) in the theme's colors

## Usage
```tsx
// The Store is used as a page component:
<Store user={currentUser} initialShowPlans={false} />
```

## Key Config
In `economy.ts`:
```ts
export const DEV_UNLOCK_ALL = true;  // true = all items show as owned (dev mode)
```
Set to `false` in production to require actual purchases.
