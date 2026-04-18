# Unified Daily Command Center — Schedule + Goals + Quests on One Screen

## The Core Problem You've Identified

Right now, the user's day is scattered across **3 separate interfaces**:

| Feature | Location | Problem |
|---------|----------|---------|
| **Schedule** (TodayProtocol) | Dashboard widget | Shows time blocks but is just a tiny card preview |
| **Goals** | Quests tab → Goals sub-tab → Goal Detail → "Generate Quests" | 3 clicks deep just to generate today's tasks |
| **Quests** | Quests tab → Quests sub-tab | Manual quest log with calendar, no time anchoring |

The **key issue** you've identified: **Goal quests have no execution time anchor.** A "Read 4 pages of biology" quest gets generated at 8 AM but the user studies at 4 PM. There's no accountability because they can click "complete" any time — the system doesn't know when they're *actually* doing it.

---

## How the System Currently Works (Data Flow)

```
ScheduleProfile ──generates──▶ DailySchedule ──renders──▶ TodayProtocol (Dashboard widget)
                                     ▲
Goal ──AI generates──▶ GoalDailyTask ─┘──injects──▶ Quest Feed
                                                        │
Manual Quest ──ForgeGuard──▶ Quest Feed ────renders────▶ QuestsView (Quests tab)

TodayProtocol ──"Go to Quest" button──▶ QuestsView
```

The problem is clear: **Schedule and Goals already produce quest data that flows into the same quest feed**, but the **UI splits them into 3 separate screens** so the user never sees the unified picture.

---

## Proposed Design: "Daily Command Center"

Replace the current `QUESTS` tab with a **single unified timeline view** that merges all three systems:

### The Timeline Concept

Think of it as the user's day rendered as a **vertical scrollable timeline** from wake-up to bedtime. Every item on this timeline is one of:

| Item Type | Source | Visual | Interaction |
|-----------|--------|--------|-------------|
| 🔒 **Fixed Block** | Schedule (school/work/meals) | Greyed card, locked | No action needed |
| ⚡ **Goal Quest** | AI-generated from Goal | Cyan-bordered card with goal badge | Timer starts at scheduled time, complete via ForgeGuard |
| 🎯 **Manual Quest** | User-created | Blue-bordered card | Timer starts at scheduled time, complete via ForgeGuard |
| 🏋️ **Workout Slot** | Schedule + Health profile | Red-bordered card | Tap to open workout player |
| 💤 **Routine** | Schedule (routine/wind-down) | Dim card | Soft indicator |
| ⬚ **Free Slot** | Gap between blocks | Dashed outline | "Add Quest" button inside |

### Visual Layout (Top to Bottom)

```
┌─────────────────────────────────────┐
│  📅 Weekly Calendar Pills (keep)     │  ← Pill-day strip with completion fill
├─────────────────────────────────────┤
│  FRIDAY, 18 APR       ☀️ 11:45 AM   │
│  ▓▓▓▓▓▓▓▓░░░░ 4/8 tasks            │
├─────────────────────────────────────┤
│                                     │
│  06:30  ☕ Morning Routine          │  ← Schedule (dimmed, past)
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  07:00  📖 Read 4 pages Biology    │  ← Goal Quest (completed ✓)
│         🏷️ "Master Biology" goal    │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  08:00  🏫 School / College        │  ← Fixed Block (locked)
│         until 2:30 PM              │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  14:30  ⬚ Free Slot               │  ← "Add Quest" button
│         [+ Add Quest Here]          │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  15:00  🧮 Solve 10 math problems  │  ← Goal Quest (current → GLOWING)
│         🏷️ "JEE Prep" goal         │
│         ⏱️ Timer: 12:34 remaining   │  ← Live timer!
│         [Complete] [Skip] [Defer]   │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  16:00  📐 Coaching / Tuition      │  ← Fixed Block
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  18:00  🎯 Run 30 minutes          │  ← Manual Quest
│         ⏱️ Starts in 6h 15m        │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  19:00  🏋️ Workout Session          │  ← Workout Slot
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  20:30  🍽️ Dinner                   │  ← Meal
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  23:00  🌙 Wind Down → Sleep        │  ← Routine
│                                     │
├─────────────────────────────────────┤
│  Active Goals (2)                    │
│  ┌─ Master Biology ──── Day 14/60 ─┐│
│  │ Phase 2: Ecosystem chapter       ││
│  │ ▓▓▓▓▓▓░░░░ 23%    🔥 5 streak  ││
│  └──────────────────────────────────┘│
│  ┌─ JEE Prep ──────── Day 7/120 ──┐│
│  │ Phase 1: Algebra foundations     ││
│  │ ▓▓░░░░░░░░ 6%     🔥 3 streak  ││
│  └──────────────────────────────────┘│
│  [+ Create New Goal]                 │
├─────────────────────────────────────┤
│         [+ Add Manual Quest]         │  ← FAB at bottom
└─────────────────────────────────────┘
```

---

## Key Design Decisions (YOUR ANSWERS)

### 1. ✅ Weekly Calendar Pills — KEEP at top
The floating pill-day calendar strip with water-fill animations stays at the very top of the unified view.

### 2. ✅ Dashboard "Next Up" Mini-Card — KEEP
TodayProtocol widget on Dashboard gets replaced with a compact "Next Up" card showing just the current + next scheduled slot. Tapping it navigates to the QUESTS (Command Center) tab.

### 3. ✅ Smart Time-Lock with 60% Threshold

**Your timer logic:**

```
Quest: "Solve 10 math problems"
Scheduled Time: 5:00 PM
Estimated Duration: 20 mins (from ForgeGuard AI)

WINDOW CALCULATION:
├── Activation:   4:50 PM  (10 min BEFORE scheduled time)
├── Scheduled:    5:00 PM
├── Deadline:     5:20 PM  (scheduled + estimated duration)
└── Hard Cutoff:  5:30 PM  (10 min grace after deadline)

TIMER STATES:
  Before 4:50 PM  → LOCKED   "Starts in 2h 10m" (grey, no button)
  4:50 - 5:20 PM  → ACTIVE   Timer counting down from 30 min
  5:20 - 5:30 PM  → OVERTIME "Overtime! +2:30" (orange warning)
  After 5:30 PM   → EXPIRED  Quest auto-fails or gets deferred

60% THRESHOLD:
  The user must spend at least 60% of estimated time (12 min out of 20)
  to be allowed to mark it as complete.

  If they try to complete at the 8 min mark (40%):
  ❌ "You need at least 12 minutes. 4 more minutes required."

  If they complete at the 13 min mark (65%):
  ✅ Quest completes normally with full XP.
```

**Why this is smart:**
- **10 min early activation** = flexibility for users who start a bit early
- **60% threshold** = prevents "instant complete" cheating
- **10 min grace overtime** = doesn't punish users who run slightly over
- **Auto-fail after grace** = real accountability

---

## What Changes vs What Stays

### ✅ Stays the Same (Reuse Existing Code)
- **ForgeGuard quest analysis** (entire backend + modal)
- **Quest completion flow** (timer, pact, XP reward)
- **Goal creation flow** (GoalCreationFlow component)
- **Goal detail view** (GoalDetailView component)
- **Schedule setup flow** (ScheduleSetupFlow component)
- **Quest card design** (QuestCard component)
- **All backend APIs** — zero server changes

### 🔄 Changes
- **QuestsView.tsx** → Becomes the new `DailyCommandCenter.tsx` component
  - Remove the QUESTS/GOALS sub-tab switcher
  - Integrate timeline rendering (borrow from TodayProtocol)
  - Show goal summary cards below timeline
- **TodayProtocol.tsx** → Shrink to a mini "Next Up" card for Dashboard
- **App.tsx** — The `QUESTS` tab renders `DailyCommandCenter` instead of `QuestsView`
- **Dashboard** — Replace full TodayProtocol with mini "Next Up" card

### 🆕 New
- `DailyCommandCenter.tsx` — The unified component (~500-700 lines)
- Time-lock + 60% threshold logic (small client-side utility)
- "Add quest to slot" contextual button in free time gaps
- Mini "Next Up" card component for Dashboard

---

## Implementation Steps

1. Create `DailyCommandCenter.tsx` with:
   - Weekly calendar pills at top (copy from QuestsView)
   - Timeline renderer merging schedule slots + quests (from TodayProtocol + QuestsView)
   - Goal summary section at bottom (from GoalsView)
   - FAB for manual quest creation

2. Add time-lock utility:
   - Calculate activation window (scheduled - 10 min)
   - Track elapsed time when quest is active
   - Enforce 60% threshold before allowing completion
   - Handle overtime + auto-fail states

3. Create `NextUpCard.tsx` for Dashboard:
   - Shows current slot + next slot
   - Tap navigates to QUESTS tab

4. Wire into App.tsx:
   - Replace QuestsView with DailyCommandCenter in QUESTS tab
   - Replace TodayProtocol with NextUpCard on Dashboard

5. Test the full flow:
   - Schedule generates timeline
   - Goal quests slot into timeline
   - Manual quests slot into timeline
   - Timer activates at the right time
   - 60% threshold blocks early completion
   - "Next Up" card works on Dashboard
