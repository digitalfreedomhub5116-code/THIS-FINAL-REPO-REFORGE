# Lynx AI Store Kit — Complete Reference Package

## What Is This?
This is a self-contained reference package containing ALL files, assets, and code needed to replicate the Lynx AI premium store system in another app.

## File Structure
```
lynx-store-kit/
├── README.md                    ← This file
├── assets/
│   ├── banners/                 ← 7 banner images (JPG)
│   │   ├── default.jpg          ← Default banner
│   │   ├── banner1.jpg          ← McLaren
│   │   ├── banner2.jpg          ← Hot Looks
│   │   ├── banner3.jpg          ← No Enemies
│   │   ├── banner4.jpg          ← Porsche 911 JDM
│   │   ├── banner5.jpg          ← Fine Shyt
│   │   └── banner6.jpg          ← Model of the Year (Chico)
│   └── borders/                 ← 13 border assets (PNG + Lottie)
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
│       ├── lottie-border.json    ← Animated Lottie border
│       ├── purple.png
│       └── rotate.png            ← Star Crown (pulse animated)
└── src/
    ├── Store.tsx                 ← Main Store page (1317 lines)
    ├── storeItems.ts             ← All item data: borders, themes, banners
    ├── StoreComponents.tsx       ← Reusable components: LynxCoin, BorderRing, ThemeSwatch
    ├── economy.ts                ← Economy engine: coins, credits, purchases, streaks
    └── store-animations.css      ← All required CSS keyframe animations
```

## Dependencies
The Store uses these npm packages:
- `react` (v18+)
- `lucide-react` (icons)
- `lottie-react` (animated borders)

## How to Integrate

### Step 1: Copy Assets
Copy the `assets/banners/` and `assets/borders/` folders into your project's `public/` directory:
```
your-app/public/banners/   ← all .jpg files
your-app/public/borders/   ← all .png + .json files
```

### Step 2: Copy Source Files
Place these files in your source directory:
- `Store.tsx` → your pages folder
- `storeItems.ts` → your data folder
- `StoreComponents.tsx` → your components folder
- `economy.ts` → your lib folder

### Step 3: Add CSS Animations
Copy the contents of `store-animations.css` into your app's main CSS file.

### Step 4: Update Imports
The Store.tsx file imports from these relative paths — update them to match your project structure:
```tsx
// In Store.tsx, update these imports:
import { ALL_STORE_ITEMS, getItemsByCategory, getTodaysDeals, type StoreItem, type StoreCategory } from '../data/storeItems';
import { getEconomy, purchaseItem, equipItem, grantFreeCredits, applyThemeVars, DEV_UNLOCK_ALL, type EquippedItems, type PlanTier, PLAN_CONFIG } from '../lib/economy';
import { LynxCoin, BorderRing, TitleBadge, ThemeSwatch } from '../components/StoreComponents';
```

### Step 5: Remove App-Specific Code
The Store.tsx has one import you should remove/replace:
```tsx
// REMOVE THIS (Lynx-specific leaderboard sync):
import { syncBorderToLeaderboard } from '../lib/leaderboard';

// And remove the syncBorderToLeaderboard() call in handleEquip()
```

### Step 6: CSS Variables
The Store uses these CSS custom properties. Set them on your `:root`:
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

## Feature Summary

### Store Sections
1. **Deals** — Rotating discounted items with countdown timer
2. **Borders** — 15+ avatar border styles (SVG, PNG, Lottie, CSS Aura)
3. **Themes** — 20+ color themes with live preview (Home + Workout mockups)
4. **Banners** — 7 profile banners

### Border Types
| Type | How it works | Examples |
|------|-------------|----------|
| SVG BorderConfig | Gradient ring around avatar | Basic borders |
| PNG imageBorder | Full PNG overlay on avatar | Dragon, Phoenix, Star Crown |
| Lottie animation | Animated JSON overlay | Celestial border |
| CSS Aura | box-shadow + glow effects | Shadow Throne |

### Border Animations
| Animation | Property | Effect |
|-----------|----------|--------|
| `rotate` | `imageAnimationType: 'rotate'` | Spins the border image |
| `pulse` | `imageAnimationType: 'pulse'` | Smooth scale in/out breathing |
| `hue-rotate` | CSS aura animated | Color shifting glow |

### Info Button (ⓘ) Modals
- **Borders**: Fullscreen preview with large avatar + border + animations
- **Themes**: Mockup previews of Home and Workout pages in theme colors

### Economy System
- **Lynx Coins (LC)**: In-app currency for purchasing cosmetics
- **AI Credits**: For scans and chats (plan-dependent costs)
- **Streak System**: Daily login tracking with milestone rewards
- **Plans**: Free → Basic → Pro → Ultra subscription tiers

## Usage
```tsx
import Store from './pages/Store';

// Render the store page
<Store user={currentUser} initialShowPlans={false} />

// Props:
// - user: Supabase auth user object (for avatar_url)
// - initialShowPlans: if true, opens plan modal on mount
```

## Key Config: DEV_UNLOCK_ALL
In `economy.ts`, there's a flag:
```ts
export const DEV_UNLOCK_ALL = true; // Set to false in production
```
When `true`, all items appear as "owned" — useful for development/testing.
