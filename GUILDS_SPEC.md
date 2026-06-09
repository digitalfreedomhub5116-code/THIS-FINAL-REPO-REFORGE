# 🏰 GUILDS SYSTEM — Simplified Spec (Chat-First Community)

## CORE PHILOSOPHY
**"Chat-first community with competitive elements."**

Guilds are where hunters gather, support each other, share victories, and compete together. The focus is on **real-time connection** and **collective achievement**, not complex management systems.

---

## 🚀 DEVIN IMPLEMENTATION PROMPT

Build a Guilds system for Reforge app with the following requirements:

### **WHAT TO BUILD:**

1. **Guild Portal Navigation**
   - When user taps GUILDS in main navbar AND user is already in a guild → hide main bottom navbar, show guild-specific bottom navbar, display guild content
   - When user is NOT in a guild → show guild rankings/browser to join guilds
   - Guild portal has its own navigation with 5 tabs: Info, Gates, Chat, War, Vault
   - Chat tab is the default/center tab
   - Top bar inside guild portal has: back arrow (left), guild name + icon (center), notifications + settings icons (right)
   - Back arrow exits guild portal and returns to main app

2. **Database Tables (Supabase)**
   - `guilds` table: stores guild name, motto, icon, banner, type (OPEN/INVITE_ONLY), guild master, vice master, glory points, vault balance, member count
   - `guild_members` table: links players to guilds with roles (GUILD_MASTER, VICE_MASTER, MEMBER)
   - `guild_join_requests` table: stores pending join requests for INVITE_ONLY guilds
   - `guild_chat` table: stores messages with type (USER, SYSTEM, WORKOUT), content, metadata
   - `guild_missions` table: stores daily collective missions with progress tracking
   - `guild_wars` table: stores weekly Thu-Sat battles between 2 guilds with scores
   - `guild_vault_transactions` table: stores donations and purchases

3. **Guild Info Screen**
   - Display guild banner image at top
   - Show guild icon (large, overlapping banner)
   - Display guild name, motto, stats (rank, glory points, member count)
   - List all members with roles (crown icon for master, sword for vice, shield for members)
   - Show action buttons based on role (Leave Guild for members, Manage Members for master/vice)
   - Tap any member to view their profile (avatar, rank, level, streak, outfit, banner)

4. **Guild Chat Screen** (PRIMARY FEATURE)
   - Real-time message feed using Supabase Realtime subscriptions
   - Three message types:
     - User messages: avatar + username + text + timestamp
     - System messages: centered cyan text with glow (joins, promotions, donations)
     - Workout posts: special card with neon blue border showing username, XP earned, streak, rank, level
   - Message input at bottom
   - After every workout completion, show toast "Share with Guild?" → if yes, auto-post workout card to chat
   - Load last 500 messages on open, infinite scroll for older messages

5. **Guild Gates Screen** (Daily Missions)
   - Display today's mission card: title, progress bar, time remaining, rewards preview
   - Mission types: "Complete X workouts collectively", "Earn X XP as guild", "Combined streak total"
   - Show completion confetti animation when mission completes
   - Display last 7 days of completed missions (collapsible history)

6. **Guild War Screen** (Thu-Sat only)
   - Show split-screen: your guild (left, cyan accent) vs opponent guild (right, red accent)
   - Display live war points as large glowing numbers
   - Show VS divider with lightning effects in center
   - List top 3 contributors from each guild
   - Show countdown timer to war end
   - Display rewards preview at bottom
   - Hide this tab entirely Mon-Wed

7. **Guild Vault Screen**
   - Show vault balance prominently at top with gold coin icon
   - Donate button for all members (tap → enter amount → confirm)
   - Shop grid (2 columns mobile) showing purchasable items: banners, icons, titles, XP boosts, GP boosts
   - Each item shows icon, name, price, and Buy/Owned status
   - Only Guild Master and Vice Master can purchase items
   - Transaction history feed showing last 20 donations/purchases

8. **Guild Rankings/Browser** (when NOT in guild)
   - List all guilds (20 per page, paginated)
   - Each guild card shows: icon, name, motto, member count, global rank, glory points, type badge (OPEN/CLOSED)
   - OPEN guilds: tap JOIN → instant join → navigate to guild chat
   - INVITE_ONLY guilds: tap REQUEST → send request → Guild Master gets notification to approve
   - Search and filter options (by type, by rank range)

9. **Guild Creation**
   - Free users: cannot create guilds (show PRO upsell)
   - PRO users: tap Create Guild → enter name, motto, choose icon, choose type → create
   - Creator automatically becomes Guild Master

10. **Guild Management**
    - Guild Master can: promote/demote members, transfer master role, approve join requests, kick members, disband guild
    - Vice Master can: approve join requests, kick members
    - Members can: leave guild (show confirmation)

11. **Daily Missions System (Server-Side)**
    - Generate 1 mission per guild per day at midnight UTC
    - Track collective progress (sum of all member contributions)
    - Award rewards when mission completes: +500 GP to guild, +100 gold to each participant, +50 XP to each participant

12. **Guild Wars System (Server-Side)**
    - Every Thursday 00:00 UTC: auto-match guilds with similar glory points
    - Track war points from Thu-Sat: workouts = 10 WP, quests = 5 WP, daily dungeon = 15 WP, 100 XP = 1 WP
    - Sunday 00:00 UTC: calculate winner, distribute rewards
    - Winners: +2000 GP, +300 gold, +200 XP, 1 legendary chest per member
    - Losers: +500 GP, +100 gold per member

13. **Styling Requirements**
    - Dark theme (black/charcoal backgrounds)
    - Neon cyan accents (#00d4ff) for interactive elements
    - Glass morphism effects (backdrop-blur, translucent cards)
    - Solo Leveling anime aesthetic (sleek, modern, high-tech)
    - Smooth animations (0.3s transitions, fade + slide effects)
    - Responsive design (mobile-first, then desktop)

14. **Integration Points**
    - Replace "PRO" tab in Navigation.tsx with "GUILDS" tab
    - Update types.ts to add GUILDS tab type
    - After workout completion in HealthView.tsx, trigger guild share toast
    - Use player.userId from useSystem hook for guild membership checks
    - Use Supabase for all database operations
    - Use RevenueCat isPremium flag to gate guild creation

15. **Edge Cases to Handle**
    - User leaves guild while in guild portal → exit portal, show "You left the guild" message
    - Guild is disbanded while user is inside → exit portal, show "Guild was disbanded" message
    - User gets kicked while in guild portal → exit portal, show "You were removed from the guild" message
    - Network errors during chat → show "Reconnecting..." banner
    - Empty states: no messages in chat, no missions today, no active war

### **WHAT NOT TO BUILD:**
- Voice chat
- Image uploads in chat (text only for now)
- Guild leveling system (guilds don't level up, just earn glory points)
- Multiple vice masters (only 1 vice master allowed)
- Guild achievements/badges
- Private messaging between members
- Guild events calendar
- Guild bank (just vault with donations)

### **SUCCESS CRITERIA:**
- User can browse guilds, join OPEN guild instantly, request to join INVITE_ONLY guild
- User in guild sees guild portal with 5-tab navigation when tapping GUILDS in main nav
- Chat works in real-time with Supabase Realtime
- Workout posts appear as special cards in chat after workout completion
- Daily missions track collective progress and award rewards
- Guild wars run Thu-Sat with live leaderboard
- Guild Master can manage members and approve join requests
- Vault allows donations from all members, purchases by master/vice only
- All screens follow Solo Leveling dark aesthetic with cyan accents
- Smooth transitions between main app and guild portal

---

## 🎯 CORE FEATURES (MVP)

### 1. **GUILD DISCOVERY & JOINING**

#### Guild Browser
- List view of all guilds (paginated, 20 per page)
- Each guild card shows:
  - **Guild Name** (e.g., "Shadow Monarchs")
  - **Guild Icon** (customizable, default provided)
  - **Vision/Motto** (1-line description, max 60 chars)
  - **Member Count** (e.g., "24/50 members")
  - **Global Rank** (e.g., "#47")
  - **Glory Points** (guild currency/score, e.g., "12,450 GP")
  - **Type Badge**: 🔓 OPEN or 🔒 INVITE-ONLY

#### Guild Types
1. **OPEN** — Anyone can join instantly
2. **INVITE-ONLY** — Join requests require Guild Master approval

#### Joining Flow
- **OPEN guilds**: Tap "JOIN" → instant join → navigate to guild chat
- **INVITE-ONLY guilds**: Tap "REQUEST" → request sent → notification to Guild Master → approval flow

---

### 2. **GUILD ROLES (3 Tiers Only)**

| Role | Count | Permissions |
|------|-------|-------------|
| **🔱 GUILD MASTER** | 1 | Create guild, approve joins, promote/demote members, manage vault, disband guild |
| **⚔️ VICE MASTER** | 1 | Approve joins, kick members, manage vault |
| **🛡️ MEMBER** | Unlimited | Chat, complete missions, donate to vault, participate in wars |

#### Promotion System
- Guild Master can promote any member to Vice Master (demotes current Vice Master automatically)
- Vice Master can be demoted back to Member
- Guild Master role can be transferred (requires confirmation)

---

### 3. **GUILD CHAT (Primary Feature)**

#### Chat Interface
**Design**: Solo Leveling aesthetic — dark, sleek, glowing accents
- **Message types**:
  1. **User messages** (white/gray text bubbles)
  2. **System messages** (cyan glow, automated)
  3. **Workout posts** (special card format with stats)

#### Real-Time Chat
- Live updates (WebSocket or Supabase Realtime)
- Message history (last 500 messages loaded on open, infinite scroll for older)
- Typing indicators (optional)
- Message timestamps (relative: "2m ago", "1h ago")

#### Workout Post Integration
**After every workout completion:**
- Toast notification: **"Share with Guild?"** [YES] [NO]
- If YES → automated post to guild chat with special format:

```
┌─────────────────────────────────────┐
│ 💪 [USERNAME] completed Daily Dungeon!
│ ⚡ +450 XP earned today
│ 🔥 7-day streak maintained
│ 🏆 Rank: B (Level 42)
└─────────────────────────────────────┘
```

- Styled with **neon blue border**, **darker background**, **icons**
- Tapping the card opens the user's profile

#### Profile Viewing
- Tap any username in chat → **Mini Profile Card** (overlay)
- Shows:
  - Avatar with equipped border
  - Username + Rank badge (S/A/B/C/D/E)
  - Level + XP bar
  - Streak counter
  - Equipped outfit preview (small 3D model or image)
  - Equipped banner (background image)
  - **[VIEW FULL PROFILE]** button → navigates to their full ProfileView

---

### 4. **GUILD MISSIONS (Daily Collective Goals)**

#### Mission Structure
- **1 mission per day** (resets at midnight UTC)
- Guild members contribute **individually** → progress adds to **collective total**

#### Example Missions:
- "Complete 50 workouts collectively" (progress: 24/50)
- "Earn 10,000 XP as a guild" (progress: 6,420/10,000)
- "Maintain a combined 100-day streak" (sum of all member streaks)

#### Rewards on Completion:
- **+500 Glory Points** to guild
- **+100 gold** to each active participant
- **+50 XP bonus** to each active participant

#### UI Element:
- Small banner at top of Guild Chat showing today's mission progress
- Confetti animation when mission completes

---

### 5. **GUILD WARS (Thu/Fri/Sat Weekly Event)**

#### War Schedule
- **Duration**: Thursday 00:00 UTC → Saturday 23:59 UTC (72 hours)
- **Frequency**: Every week
- **Matchmaking**: Auto-pair guilds with similar Glory Points (±20% range)

#### War Mechanics
**Objective**: Earn more **War Points** than the opposing guild

**War Points Earned By:**
- Completing a workout = **10 WP**
- Completing a quest = **5 WP**
- Completing daily dungeon = **15 WP**
- Daily XP earned = **1 WP per 100 XP**

**Live Leaderboard:**
- Shows both guilds side-by-side
- Real-time score updates
- Top 3 contributors from each guild highlighted

#### War Rewards
**Winning Guild:**
- **+2,000 Glory Points**
- **+300 gold per member**
- **+200 XP per member**
- **1 Legendary Chest per member**

**Losing Guild:**
- **+500 Glory Points** (participation reward)
- **+100 gold per member**

#### War UI
- **Banner notification** in guild chat when war starts
- **War tab** appears in guild view (only during Thu-Sat)
- Shows opponent guild info, live scores, top contributors

---

### 6. **GUILD VAULT (Collective Treasury)**

#### Vault System
- Each guild has a shared **Gold Vault**
- Members can **donate gold** → adds to vault balance
- Vault balance shown in guild header (e.g., "💰 12,450 G")

#### Donations
- Tap **[DONATE]** button in guild view
- Enter amount (min 100, max 10,000 per donation)
- Donation appears in chat as system message: *"[USERNAME] donated 500 gold to the vault!"*

#### Vault Purchases (Guild Master + Vice Master only)
**Available Items:**
1. **Guild Banner** (background image for guild page) — 5,000G
2. **Guild Icon** (custom icon from preset library) — 3,000G
3. **Guild Title** (special role badge, e.g., "Elite Squad") — 10,000G
4. **Glory Point Boost** (2× GP for 7 days) — 15,000G
5. **XP Boost for Guild** (1.5× XP for all members for 3 days) — 20,000G

---

### 7. **GUILD RANKS (Global Leaderboard)**

#### Ranking Criteria
Guilds ranked by **Glory Points (GP)**

**GP Sources:**
- Daily mission completion: **+500 GP**
- Guild war victory: **+2,000 GP**
- Guild war loss: **+500 GP**
- Member level-ups: **+50 GP per level**

#### Rank Display
- Global rank shown on guild card (e.g., "#47 globally")
- Top 10 guilds get special badges:
  - **#1**: 👑 Sovereign Guild
  - **#2-3**: 🥈 Elite Guild
  - **#4-10**: 🥉 Rising Guild

---

## 📊 DATABASE SCHEMA (Supabase Tables)

### **guilds** table
```sql
CREATE TABLE guilds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  motto TEXT, -- max 60 chars
  icon_url TEXT, -- default or custom
  banner_url TEXT, -- custom background image
  type TEXT NOT NULL CHECK (type IN ('OPEN', 'INVITE_ONLY')),
  guild_master_id UUID REFERENCES players(id) ON DELETE CASCADE,
  vice_master_id UUID REFERENCES players(id) ON DELETE SET NULL,
  glory_points INTEGER DEFAULT 0,
  vault_balance INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guilds_glory ON guilds(glory_points DESC);
CREATE INDEX idx_guilds_type ON guilds(type);
```

### **guild_members** table
```sql
CREATE TABLE guild_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('GUILD_MASTER', 'VICE_MASTER', 'MEMBER')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, player_id)
);

CREATE INDEX idx_guild_members_guild ON guild_members(guild_id);
CREATE INDEX idx_guild_members_player ON guild_members(player_id);
```

### **guild_join_requests** table
```sql
CREATE TABLE guild_join_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE(guild_id, player_id) -- prevent duplicate requests
);

CREATE INDEX idx_join_requests_guild ON guild_join_requests(guild_id, status);
```

### **guild_chat** table
```sql
CREATE TABLE guild_chat (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('USER', 'SYSTEM', 'WORKOUT')),
  content TEXT NOT NULL,
  metadata JSONB, -- for workout posts: {xp: 450, streak: 7, rank: 'B', level: 42}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guild_chat_guild ON guild_chat(guild_id, created_at DESC);
```

### **guild_missions** table
```sql
CREATE TABLE guild_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  mission_date DATE NOT NULL,
  mission_type TEXT NOT NULL, -- 'WORKOUTS', 'XP', 'STREAK'
  target INTEGER NOT NULL, -- e.g., 50 workouts, 10000 XP
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(guild_id, mission_date)
);

CREATE INDEX idx_guild_missions_date ON guild_missions(mission_date, completed);
```

### **guild_wars** table
```sql
CREATE TABLE guild_wars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_a_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  guild_b_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  guild_a_points INTEGER DEFAULT 0,
  guild_b_points INTEGER DEFAULT 0,
  winner_id UUID REFERENCES guilds(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'COMPLETED')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_guild_wars_dates ON guild_wars(start_date, end_date);
CREATE INDEX idx_guild_wars_guilds ON guild_wars(guild_a_id, guild_b_id);
```

### **guild_vault_transactions** table
```sql
CREATE TABLE guild_vault_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guild_id UUID REFERENCES guilds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('DONATION', 'PURCHASE')),
  amount INTEGER NOT NULL,
  item_purchased TEXT, -- if type='PURCHASE', what was bought
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vault_tx_guild ON guild_vault_transactions(guild_id, created_at DESC);
```

---

## 🎨 UI/UX DESIGN PRINCIPLES

### **Visual Style**
- **Dark theme** (black/charcoal backgrounds)
- **Neon cyan accents** (#00d4ff, system-neon from your codebase)
- **Glass morphism** (backdrop-blur, translucent cards)
- **Subtle animations** (fade-ins, slide-ups, glow effects)

### **Chat Design** (Stitch Prompt Ideas)
**Prompt for Stitch:**
> "Dark-themed guild chat interface inspired by Solo Leveling anime aesthetic. Black background with subtle grid pattern. Message bubbles in dark gray with white text. System messages have neon cyan glow. Workout achievement cards have glowing blue border and darker background with XP/streak stats displayed with icons. User avatars shown as small circles next to messages. Top bar shows guild name, member count, and Glory Points. Bottom has message input with send button. Modern, sleek, professional."

### **Guild Card Design** (Stitch Prompt Ideas)
**Prompt for Stitch:**
> "Guild listing card in dark sci-fi style, inspired by Solo Leveling. Rectangular card with dark charcoal background and subtle blue glow on hover. Left side shows guild icon (circular). Right side shows guild name in bold white text, motto in gray below. Bottom row displays member count with user icon, global rank with trophy icon, and Glory Points with star icon. OPEN badge in green or CLOSED badge in orange on top-right corner. Glass morphism effect with backdrop blur."

### **Guild War UI** (Stitch Prompt Ideas)
**Prompt for Stitch:**
> "Guild war battle screen with two guilds facing off. Split-screen layout: left side is your guild, right side is opponent. Each side shows guild icon, name, and live war points in large glowing numbers. Center shows VS divider with lightning effects. Below shows real-time leaderboard of top contributors from both sides with small avatar icons and point counts. Dark background with neon accents. Inspired by esports tournament screens."

---

## 🛠️ IMPLEMENTATION PHASES

### **Phase 1: Foundation (Week 1-2)**
- Create Supabase tables (guilds, guild_members, guild_chat)
- Build Guild Browser view (list, search, filter by type)
- Implement guild creation flow
- Implement join/request flow

### **Phase 2: Chat System (Week 3-4)**
- Build GuildChatView component
- Integrate Supabase Realtime for live messaging
- Add user message sending
- Add system message generation (joins, promotions, donations)
- Add workout post integration (share after workout)

### **Phase 3: Roles & Management (Week 5)**
- Add promotion/demotion system
- Add member kick/leave functionality
- Add guild master transfer
- Add join request approval UI

### **Phase 4: Missions & Vault (Week 6-7)**
- Implement daily mission generation (server-side cron)
- Add mission progress tracking
- Build Guild Vault UI
- Add donation flow
- Add vault purchase system

### **Phase 5: Guild Wars (Week 8-9)**
- Implement war matchmaking algorithm (run Thu 00:00 UTC)
- Build war tracking system (collect workout/quest completions)
- Build Guild War UI (live leaderboard)
- Add war rewards distribution

### **Phase 6: Polish & Launch (Week 10)**
- Add global guild leaderboard
- Add guild rank badges
- Polish UI/UX
- Add onboarding tutorial for guilds
- Soft launch to 10% of users

---

## 🚀 NAVIGATION INTEGRATION

### Replace "PRO" Tab with "GUILDS"
**Update `Navigation.tsx`:**
```typescript
const NAV_ITEMS = [
  { id: 'DASHBOARD' as Tab, label: 'Today', icon: LayoutGrid },
  { id: 'GUILDS' as Tab, label: 'Guilds', icon: Users }, // NEW — replace GOALS
  { id: 'LEADERBOARD' as Tab, label: 'Ranks', icon: Trophy },
  { id: 'STORE' as Tab, label: 'Store', icon: ShoppingBag },
  { id: 'PROFILE' as Tab, label: 'You', icon: User },
];
```

**Update `types.ts`:**
```typescript
export type Tab = 'DASHBOARD' | 'GUILDS' | 'LEADERBOARD' | 'STORE' | 'PROFILE' | ...;
```

**Update `App.tsx`:**
```typescript
{activeTab === 'GUILDS' && (
  <Suspense fallback={<SkeletonGenericPage />}>
    <GuildsView
      player={player}
      onCreateGuild={handleCreateGuild}
      onJoinGuild={handleJoinGuild}
      onLeaveGuild={handleLeaveGuild}
      onSendMessage={handleGuildMessage}
    />
  </Suspense>
)}
```

---

## 🔐 FEATURE GATING

### Free vs PRO
**Free Users:**
- ✅ Join 1 guild
- ✅ Send unlimited messages
- ✅ Participate in missions & wars
- ✅ Donate to vault
- ❌ Cannot create guilds (PRO only)

**PRO Users:**
- ✅ Everything in Free
- ✅ Create unlimited guilds
- ✅ Priority matchmaking in wars
- ✅ 2× Glory Points from missions
- ✅ Exclusive guild icons/banners

---

## 📈 SUCCESS METRICS

### KPIs to Track:
1. **Guild creation rate** (guilds created per day)
2. **Guild join rate** (% of users who join a guild within 7 days)
3. **Chat activity** (messages sent per day per guild)
4. **War participation** (% of guild members active during wars)
5. **Vault donations** (average donation per guild per week)
6. **Retention boost** (do guild members have higher 7-day retention?)

### Target Goals (3 months post-launch):
- **40% of users** in a guild
- **500+ guilds** created
- **10,000+ messages/day** across all guilds
- **80% war participation** rate
- **₹5 lakh ARR boost** from PRO upgrades (guild creation incentive)

---

## ✅ WHAT MAKES THIS WORK

1. **Chat-first** → Users feel connected, not isolated
2. **Simple roles** → No complex hierarchy, easy to manage
3. **Weekly wars** → Creates excitement, drives engagement
4. **Workout sharing** → Social proof, motivates others
5. **Vault system** → Collective goals, teamwork incentives
6. **Solo Leveling aesthetic** → Stays true to your brand

---

## 🚦 NEXT STEPS

1. ✅ **Approve this spec** (or request changes)
2. ⏳ **I'll implement Phase 1** (foundation + guild browser)
3. ⏳ **I'll implement Phase 2** (chat system)
4. ⏳ Continue through phases 3-6
5. ⏳ Soft launch → iterate → full launch

---

**Ready to build the best guild system in the fitness app space? Let's go. 🔥**
