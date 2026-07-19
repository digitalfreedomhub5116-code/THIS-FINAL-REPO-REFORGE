# Design — Login Flow Rewire (JWT-Only, Production-Ready)

## Overview

Replace the dual session-cookie + JWT auth with a single stateless **Bearer-JWT** model used identically by web and native. Remove player-auth dependence on Express sessions, consolidate all client auth into one module + one fetch wrapper, and harden the shared key-gate that both the food-scan and Dusk modules depend on. Includes a full race-condition analysis and a mandatory final reverify step.

Requirements traceability: R1 (unified mechanism), R2 (parity), R3 (no lockout), R4 (token lifecycle), R5 (single client surface), R6 (preserve methods), R7 (logout), R8 (security), R9 (errors/observability), R10 (verification).

## Current State (baseline)

- Server authenticates via `getAuthenticatedUserId` = Bearer JWT first, then `req.session.userId` fallback.
- `googleAuth.ts` and `localAuth_supabase_fixed.ts` mint a JWT AND write `req.session`.
- `server/index.ts` configures express-session + connect-pg-simple + cookie (`sameSite:none/secure`).
- Client: `playerApi.ts` (`getPlayerAuthHeaders`, `authenticatedFetch` with 3-step 401 recovery, `getOrRefreshPlayerHeaders` using whoami/session), `nativeAuth.ts` (Preferences), three login screens (`AuthView`, `SignInPage`, `CreateAccountPage`) each with their own `loginWithUser` + `whoami` + `credentials:'include'` calls.
- Key gate: `deductKeys` (optimistic concurrency, NO retry) and `grantKeys` (non-atomic read-modify-write).

## Target Architecture

### Token model
- **Access JWT**: signed server-side (`{ role:'player', sub:userId }`), 30-day expiry (unchanged claim shape → existing tokens remain valid = R3.1).
- **Proactive reissue (no cookie)**: new endpoint `POST /api/auth/reissue` that accepts a currently-valid Bearer JWT and returns a fresh 30-day JWT. On app launch (and after any successful authed response), if the token's remaining lifetime < 7 days, the client calls reissue. Hard-expired token → route to login (R4.2, R4.3).
- No refresh-token store, no cookie. This keeps it stateless and identical cross-platform (R1, R2).

### Server
- New middleware `requireAuth(req,res,next)`: extracts Bearer JWT, verifies signature/role/expiry, sets `req.userId`; returns a consistent `401 { error:'unauthorized', reason }` otherwise (R8.3, R9.1).
- `getAuthenticatedUserId` becomes **Bearer-only** (session fallback removed) (R1.1–1.3).
- Remove express-session/connect-pg-simple wiring for player auth from `server/index.ts`. Keep CORS reflecting the Capacitor origins (already correct). **Admin auth**: audit `admin_supabase.ts`; if it uses sessions, migrate it to a dedicated admin JWT or a header-checked admin secret, isolated from player auth (R1.4). Document the outcome.
- `googleAuth.ts` / `localAuth_supabase_fixed.ts`: stop writing `req.session`; only mint + return the JWT.

### Client
- New single module `lib/auth.ts` exposing: `login()`, `logout()`, `getToken()`, `isAuthed()`, and `authFetch(url, init)`.
- `authFetch` attaches the Bearer token, and on 401 performs **at most one** single-flight reissue-or-fail (see race section), then routes to a global "session expired" state (R5.1, R9.2).
- Token persistence stays localStorage + Capacitor Preferences via `nativeAuth.ts` (survives process kill = R4.4). Restore-on-startup is awaited before the first authed call.
- Consolidate `AuthView`/`SignInPage`/`CreateAccountPage` login logic into `lib/auth.ts` + one shared hook so screens are thin UI (R5.3). Remove `credentials:'include'` reliance and `whoami`/session recovery paths.

### Key-gate hardening (shared by food scan + Dusk)
- `deductKeys`: wrap the optimistic-concurrency update in a small **bounded retry loop** (e.g., 3 attempts) so a concurrent modification re-reads and retries instead of returning a false "Not enough keys".
- `grantKeys`: make atomic — use a Postgres RPC (`keys = keys + amount`) or an optimistic loop, eliminating the lost-update on concurrent refunds/grants.
- **Idempotency for AI spends**: client generates a `requestId` per user action (one scan tap / one send) and sends it; server deduplicates within a short TTL so double-submits don't double-charge.

## Race Conditions & Mitigations

### A. Authentication / token
1. **Thundering-herd refresh** — many concurrent requests 401 at once and each triggers its own reissue. *Mitigation:* single-flight — one shared in-flight reissue promise; all callers await it, then retry once.
2. **Startup token race** — requests fire before native Preferences restore completes. *Mitigation:* `bootstrap()` awaits `restoreAuthFromNative()` before mounting/first authed call (already partially done; make it a hard gate).
3. **Logout vs in-flight request** — a response with the old token lands after a new user logs in → cross-account write. *Mitigation:* on logout/login, bump an in-memory `authEpoch`; `authFetch` tags requests with the epoch and drops responses from a stale epoch; clear token from localStorage + Preferences + in-memory cache (R7).
4. **Reissue vs concurrent use** — token replaced mid-flight. *Mitigation:* atomic swap of the cached token; old token stays valid until expiry so in-flight calls still succeed.

### B. Food scan (`/api/nutrition/analyze`)
1. **Double-submit** (rapid taps / re-render) → two POSTs → two `deductKeys` → 2 keys spent or a false 402. *Mitigation:* client in-flight lock (disable scan while a request is active) + server idempotency `requestId`.
2. **False 402 under concurrency** — `deductKeys` optimistic conflict returns failure though the user has keys. *Mitigation:* deductKeys retry loop (above).
3. **Key spent, result lost** — deduct succeeds, then component unmounts or the response is dropped → key gone, no result. *Mitigation:* refund on any non-success delivery is already present for NOT_FOOD/parse/AI-fail; extend to a server-side "spend is only final on successful 200 delivery" pattern via idempotency (a retried same `requestId` returns the cached result instead of charging again).
4. **Refund race** — refund `grantKeys` races with another key change → drift. *Mitigation:* atomic `grantKeys`.

### C. Dusk chat (`/api/dusk/chat`)
1. **In-memory counter across instances** — `duskMsgCounters` Map is per-process; multiple Railway instances (or a restart) make "every 5th message" inconsistent and can mis-charge. *Mitigation:* move the message counter to an atomic DB counter (or Redis); increment atomically and gate the key deduction on the returned value.
2. **Autonomous system events charging keys** — `triggerDuskMessage` (fired on quest/workout/goal events from `useSystem`) POSTs to the same endpoint, increments the counter, and can trigger the 5th-message key deduction for something the user never typed. *Mitigation:* mark system events (`[SYSTEM_EVENT]`) as non-billable server-side: they neither increment the paid counter nor deduct keys.
3. **Concurrent user message + autonomous event** — double counter increment / interleaved deduction. *Mitigation:* atomic counter + system-event exclusion (above) removes the race.
4. **Client history clobber** — `DuskChat` component and `useSystem.triggerDuskMessage` both read-modify-write `localStorage['dusk_chat_history_<userId>']` → lost messages. *Mitigation:* single writer — centralize Dusk history in one module (e.g., a small store) with an append operation; the component subscribes rather than independently writing.
5. **Out-of-order responses** — rapid sends resolve out of order and append wrongly. *Mitigation:* order messages by client-generated monotonic id/timestamp on insert.
6. **Failed 5th-message still charged** — dusk route does not refund on AI failure (nutrition does). *Mitigation:* refund the key if the AI call fails, matching nutrition behavior (parity).

## Migration & Rollback (R3)
- **Migration:** existing valid JWTs keep working (same secret + claim shape). Users with only a cookie session are treated as logged-out → clean re-login prompt (no loop). No DB migration required for tokens; the Dusk counter and idempotency may add columns/table (additive, non-breaking).
- **Rollback:** implement behind a branch; the server change is additive (Bearer-only + reissue) and can be reverted by re-enabling the session fallback in `getAuthenticatedUserId` if a regression appears. Document the exact revert commit.

## File-by-file change list
- `server/lib/playerAuth.ts` — Bearer-only `getAuthenticatedUserId`; add `requireAuth` middleware; add reissue helper.
- `server/auth/googleAuth.ts`, `server/auth/localAuth_supabase_fixed.ts` — drop `req.session` writes; add `POST /api/auth/reissue`.
- `server/index.ts` — remove player session middleware; keep CORS; isolate/adjust admin auth.
- `server/lib/keyGate.ts` — retrying `deductKeys`; atomic `grantKeys`; idempotency helper.
- `server/routes/nutrition.ts` — accept `requestId` idempotency; keep refund-on-failure.
- `server/routes/dusk.ts` — atomic DB counter; exclude `[SYSTEM_EVENT]` from billing; refund on AI failure.
- `lib/auth.ts` (new) — unified login/logout/getToken/authFetch (single-flight reissue, authEpoch).
- `lib/playerApi.ts` — re-export/delegate to `lib/auth.ts`; remove whoami/session recovery.
- `lib/nativeAuth.ts` — unchanged persistence, used by `lib/auth.ts`.
- `components/AuthView.tsx`, `SignInPage.tsx`, `CreateAccountPage.tsx` — thin UI over shared auth; remove duplicated `loginWithUser`/whoami.
- `hooks/useSystem.ts` — Dusk history single-writer; `triggerDuskMessage` marks system events non-billable.
- `components/HealthView.tsx`, `NutritionLogCard.tsx` — scan in-flight lock + `requestId`.
- `App.tsx` and misc components — replace raw `fetch(credentials:'include')` authed calls with `authFetch`.

## Final Recheck / Reverify Step (mandatory, R10)
Before the rewire is considered done, run a full reverify pass:
1. **Static:** `npx tsc --noEmit` clean; grep confirms no remaining player-auth reliance on `req.session` and no authed `credentials:'include'` calls bypassing `authFetch`.
2. **Live server probe:** confirm `POST /api/nutrition/analyze` and `POST /api/dusk/chat` from a Capacitor origin with a valid Bearer token pass auth (non-401), and with no token return the consistent 401 shape.
3. **Race checks:** simulate concurrent double food-scan (same `requestId`) → exactly one key charged; concurrent Dusk messages → counter consistent, no double charge; system event → zero keys charged; concurrent key refund + grant → no lost update.
4. **Cross-platform manual matrix (R10.2):** fresh signup, returning login, food scan, Dusk chat, data sync, app-kill/restart persistence, logout — on BOTH web and a freshly built release APK.
5. **Sign-off:** document results; only then bump versionCode, rebuild APK, and ship.

## Task 5 — Admin Auth Audit (outcome)

Admin authentication is already fully stateless and independent of the player Express session, so no code changes were required for Task 5. Admin login is handled by `POST /api/admin/verify` in `server/routes/admin_supabase.ts`, which compares the request-body `password` against the `ADMIN_PASSWORD` env var per request (with Supabase-persisted IP lockout after 3 failures) and, on success, returns a short-lived (8h) admin JWT minted by `generateAdminToken()` in `server/lib/adminAuth.ts` (claim `{ role: 'admin' }`, signed with `JWT_SECRET`). Every protected admin route across `admin_supabase.ts`, `store.ts`, `globalConfig_supabase.ts`, `reports.ts`, and `videos_supabase.ts` gates access via `requireAdmin(req, res)`, which reads the `Authorization: Bearer <token>` header and verifies the admin JWT with `verifyAdminToken()` — it never reads or writes `req.session`. On the client, `AdminLogin.tsx` POSTs the password to `/verify` without cookies/`credentials:'include'`, stores the returned token in React state (`App.tsx` `adminToken`), and `AdminDashboard.tsx` (and its child admin components) attach it as `Authorization: Bearer ${adminToken}` on each request. The only `req.session` references found in the server are on player routes (`workout.ts` custom-plans/log-complete, `systemPact.ts`, and the logout handlers in `player_supabase.ts` / `localAuth_supabase_fixed.ts`), which belong to Tasks 3/4/11 — none touch admin auth. Conclusion: removing the express-session middleware in Task 11 will not affect admin authentication; admin auth is already isolated on a dedicated header-checked admin JWT. `npx tsc --noEmit -p server/tsconfig.json` reports 0 errors.
