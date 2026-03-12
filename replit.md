# REFORGE — The System

A gamified fitness/productivity RPG. Players complete quests, track health, log workouts, and level up 4 core real-world stats.

## Core Stats (4)

| Stat | Color | Icon |
|------|-------|------|
| STRENGTH | Red | Dumbbell |
| INTELLIGENCE | Blue | Brain |
| DISCIPLINE | Purple | Shield |
| SOCIAL | Amber | Users |

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite 5**
- **Tailwind CSS** (PostCSS pipeline — NOT CDN)
- **Framer Motion** (animations + swipe navigation)
- **Three.js** + @react-three/fiber + @react-three/drei (Demon Castle 3D)
- **Recharts** (StatsLineChart — line charts per stat)
- **Lucide React** (icons)

### Backend
- **Express.js** API server (port 8000, proxied by Vite)
- **Replit Auth** (Google Sign-in via OIDC/blueprint)
- **Replit PostgreSQL** database (via `pg` pool)
- **Google Gemini API** (`@google/generative-ai`) — all AI calls server-side only

## Project Layout

```
/
├── App.tsx                  # Root app — onboarding phase machine + 5-tab routing
├── index.tsx                # React entry point
├── index.html               # Clean HTML — no CDN scripts
├── index.css                # Tailwind + custom keyframes (chestGlow, crystalBurst, etc.)
├── tailwind.config.js       # Full Tailwind config with custom design tokens
├── postcss.config.js        # PostCSS pipeline
├── vite.config.ts           # Vite (port 5000, proxy /api → :8000)
├── types.ts                 # All shared TypeScript types
├── components/
│   ├── AuthView.tsx              # Google Sign-in screen (unchanged)
│   ├── Layout.tsx                # Persistent top bar
│   ├── Navigation.tsx            # 5-tab pill nav (DASHBOARD/HEALTH/QUESTS/ARMORY/ALLIANCE)
│   ├── SystemAgreement.tsx       # Onboarding: Terms screen
│   ├── NameOnboarding.tsx        # Onboarding: Codename + country/timezone picker
│   ├── CalibrationFlow.tsx       # Onboarding: Health profile + 4-stat AwakeningOverlay
│   ├── AvatarGenerator.tsx       # Onboarding: Selfie → cartoonified avatar (Gemini backend)
│   ├── HunterCommandDeck.tsx     # Dashboard hero — 4-stat RadarChart + video bg
│   ├── LevelProgressCard.tsx     # XP bar (current/next level, fill animation) + dark "Your Plan" workout cards
│   ├── UpcomingQuests.tsx        # Dashboard upcoming active quests list with rank/category/XP display
│   ├── DashboardWidgets.tsx      # 3-column chest grid (Daily/Legendary/Alliance) + Dusk widget
│   ├── RankRoadmap.tsx           # Rank progression (E→S) visual
│   ├── QuestsView.tsx            # Quest list + ForgeGuard AI analysis form
│   ├── ArmoryView.tsx            # Monarch's Wardrobe — cinematic outfit showcase, circular stat rings, horizontal selector rail
│   ├── GuildsView.tsx            # Alliance/clan view
│   ├── DuskChat.tsx              # Dusk AI companion chat (Gemini backend)
│   ├── XpCollectionOverlay.tsx   # Crystal particle XP animation overlay
│   ├── CheatWarningModal.tsx     # Anti-cheat strike warning + ticket submission
│   ├── LevelDownCinematic.tsx    # Cinematic for XP deduction/level down
│   ├── BanScreen.tsx             # Full-screen ban UI
│   ├── MobileFloatingMenu.tsx    # Floating gold/key + dungeon button (dashboard)
│   ├── HealthView.tsx            # Workout & health logging; PLAN_SELECT viewMode → PlanSelector → MAP; redesigned WORKOUT tab (fire streak hero, week counter, premade carousel, FAB)
│   ├── PlanSelector.tsx          # Plan chooser (premade cards + AI generate) used in HealthView
│   ├── CustomPlanBuilder.tsx     # Fullscreen custom workout builder (exercise search, set/reps editor, save + start)
│   ├── admin/
│   │   ├── ExerciseLibrary.tsx   # Admin CRUD for workout_exercises table
│   │   └── PlanBuilder.tsx       # Admin CRUD for workout_plans with day/exercise editor (supports image_url)
│   ├── GrowthView.tsx            # Growth & settings
│   ├── ShopView.tsx              # System Store (REWARDS tab) — Dungeon Tower banner, 3 consumables, custom rewards
│   ├── RankingView.tsx           # Leaderboard
│   ├── DemonCastle.tsx           # 3D dungeon (Three.js)
│   └── ErrorBoundary.tsx         # Class-based error boundary
├── hooks/
│   └── useSystem.ts         # Core state + all player actions (including anti-cheat, outfits, Dusk)
├── utils/
│   ├── ai.ts                # Thin fetch wrappers → /api/forge-guard/* (no client-side AI)
│   ├── gameData.ts          # OUTFITS, TIERS, SHADOWS, calculateStat exports
│   └── soundEngine.ts       # Audio effects
└── server/                  # Express.js backend
    ├── index.ts             # Server entry, migrations, route registration
    ├── replitAuth.ts        # Replit Auth middleware + session store
    ├── db/pool.ts           # PostgreSQL connection pool
    └── routes/
        ├── player.ts        # GET/PUT /api/player/:id (all player fields including new ones)
        ├── forgeguard.ts    # POST /api/forge-guard/analyze-quest, /verify-proof (Gemini)
        ├── avatar.ts        # POST /api/avatar/generate (Gemini Vision cartoonification)
        ├── dusk.ts          # POST /api/dusk/chat (Dusk AI companion via Gemini)
        ├── leaderboard.ts   # GET /api/leaderboard
        ├── videos.ts        # GET/PUT /api/videos
        ├── admin.ts         # Admin: users, exercises CRUD, plans CRUD, usage (INR, period filter, timeSeries, recharts)
        └── workout.ts       # GET /api/workout/plans (public), POST /api/workout/generate (AI using exercise library)
```

## Onboarding Flow (New Users Only)

```
SPLASH → AGREEMENT → NAMING → CALIBRATION → AUTH (Google OAuth) → AVATAR → APP
```

- **SPLASH**: Loading cinematic with 4-stat display
- **AGREEMENT**: Terms and system rules scroll
- **NAMING**: Codename input (debounced validation) + country/timezone
- **CALIBRATION**: Multi-step health profile form → AwakeningOverlay (4-stat radar)
- **AUTH**: Existing Google OAuth (unchanged — `AuthView.tsx`)
- **AVATAR**: Upload selfie → Gemini generates cartoonified avatar
- **APP**: Main app (returning users skip directly here)

## Auth Flow

1. App loads → `AuthView.tsx` calls `GET /api/auth/whoami`
2. If session exists → auto-login with Replit user profile
3. If no session → "Continue with Google" button → `GET /api/login` (Replit Auth OIDC)
4. On success → session stored in PostgreSQL `sessions` table → redirect back to app
5. Logout → `GET /api/logout` → clears session → shows AuthView

## Database Schema (Replit PostgreSQL)

- `sessions` — express-session store (Replit Auth)
- `users` — Replit Auth user profiles
- `players` — core player data including new REFORGE columns:
  - `avatar_url`, `original_selfie_url` — avatar images
  - `cheat_strikes`, `is_banned`, `trust_score` — anti-cheat
  - `country`, `timezone` — from NAMING onboarding
  - `dusk_unread_count` — Dusk chat badge
  - `alliance_id` — guild membership
  - `equipped_outfit_id`, `calibration_data` — armory + calibration
  - `start_date` — onboarding date
- `quests` — player quests
- `nutrition_logs` — meal logs
- `activity_logs` — XP/level-up events
- `global_videos` — exercise video URLs (admin-editable)
- `leaderboard_cache` — pre-aggregated leaderboard

## AI Features (all server-side via GEMINI_API_KEY)

| Feature | Route | Model |
|---------|-------|-------|
| Quest Analysis (ForgeGuard) | `POST /api/forge-guard/analyze-quest` | gemini-2.0-flash → 1.5-flash fallback |
| Proof Verification (Anti-Cheat) | `POST /api/forge-guard/verify-proof` | gemini-1.5-flash (Vision) |
| Avatar Cartoonification | `POST /api/avatar/generate` | gemini-2.0-flash → 1.5-flash fallback |
| Dusk AI Chat | `POST /api/dusk/chat` | gemini-1.5-flash |

## Navigation (5 Tabs)

| Tab | Icon | Component |
|-----|------|-----------|
| DASHBOARD | LayoutGrid | HunterCommandDeck + DashboardWidgets + RankRoadmap |
| HEALTH | Activity | HealthView |
| QUESTS | Swords | QuestsView (with ForgeGuard AI form) |
| ARMORY | ShoppingBag | ArmoryView (Monarch's Wardrobe — cinematic character showcase, 6 outfits E→S) |
| ALLIANCE | Users | GuildsView |

## Anti-Cheat System

- `recordStrike()`: Increments cheat strikes. 3+ = 10% XP deduction. 6+ = 20%. 10 = BAN.
- `CheatWarningModal`: Shows strike count + ticket submission (photo proof → `/verify-proof`)
- `verifyTicket()`: Calls Gemini Vision to assess photo proof. APPROVED → `removeStrike()`
- Fast-completion detection in `handleQuestComplete()` (uses `quest.estimatedDuration`)

## Environment Variables

| Key | Description |
|-----|-------------|
| `DATABASE_URL` | Replit PostgreSQL connection string |
| `SESSION_SECRET` | Express session secret |
| `REPL_ID` | Replit project ID (used by Auth blueprint) |
| `ADMIN_SECRET` | Admin panel access token |
| `GEMINI_API_KEY` | Google Gemini API key (all AI features) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (Replit Auth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (Replit Auth) |

## Development

```bash
npm run dev     # Frontend dev server (port 5000)
npm run server  # Backend API server (port 8000)
npm run build   # Production build
```

## Architecture Notes

- **Replit Auth** handles Google Sign-in — no Supabase dependency
- **Auth domain fix**: `replitAuth.ts` uses `REPLIT_DOMAINS` env var for OAuth callback URL
- Player's Replit user ID stored in `players.supabase_id` (TEXT column, backward-compatible)
- All components are **lazy-loaded** via `React.lazy`
- **ErrorBoundary** wraps all tabs — crashes in one tab don't take down the app
- All Gemini/AI calls are **server-side only** — API key never exposed to frontend
- Clan chest cooldowns stored in `localStorage` (no server round-trip needed)
- `forgeResult.estimatedDuration` stored on Quest for timing anti-cheat detection
- **Tutorial system**: 14-step onboarding (TutorialOverlay.tsx steps 0–13); `tutorialComplete` defaults to `false` in `DEFAULT_PLAYER` and preserved correctly from DB; anchor IDs: `tut-stats`, `tut-rank`, `tut-gold-display`, `tut-nav-mobile`, `tut-quest-category`, `tut-store`, `tut-health`; tab auto-switches at steps 5 (QUESTS), 11 (STORE), 12 (HEALTH); mobile dialog positioned at `bottom-24` to clear nav bar

## Workout Plan System

- **MobileFloatingMenu** (cache chest + demon tower) is **only rendered when `activeTab === 'DASHBOARD'`** in App.tsx — completely unmounted on all other pages to prevent button interception
- **AI Plan Generation** uses a 3-step modal: Step 1 (days/week, 1–7), Step 2 (session duration, 30/45/60/90 min), Step 3 (confirm). Values saved to healthProfile and sent to `/api/workout/generate-ai`
- **AI plan persistence**: stored as `aiGeneratedPlan` and `aiGeneratedPlanName` on healthProfile so switching to premade plans never erases the AI plan. AI plan card always shows in horizontal list when `aiPlanUsed=true`
- **Custom plans** from `user_custom_plans` table are fetched and displayed as cards in the horizontal plan list. Plans with `plan_type='AI'` shown separately as the AI card
- **Workout generation server** (`server/routes/workout.ts`): fetches exercises from admin `workout_exercises` table only, generates 1-week template via Gemini, expands to 4 weeks server-side with progressive overload (week 1: 12,10,8 → week 2: 10,8,6 → week 3: 8,6,5 → week 4: 3x5)
- **Browse Plans button removed** — all plans visible in horizontal scroll list
- `HealthProfile` type extended with `aiGeneratedPlan: WorkoutDay[]`, `aiGeneratedPlanName: string`, `selectedPlanId: number | string`
