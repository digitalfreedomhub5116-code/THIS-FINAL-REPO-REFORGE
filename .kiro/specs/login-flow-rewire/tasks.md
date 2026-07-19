# Tasks — Login Flow Rewire (JWT-Only, Production-Ready)

Implementation plan derived from design.md. Order is server-first and additive so the app keeps working mid-rollout; the session fallback is only removed after Bearer-only is proven. Each task is independently verifiable. Requirement refs in parentheses.

- [x] 1. Create working branch `feat/auth-jwt-rewire`
  - Branch off `main`; all rewire work lands here until the reverify pass passes.
  - _Req: R3.3 (rollback)_

- [ ] 2. Harden the shared key-gate (`server/lib/keyGate.ts`)
  - [-] 2.1 Wrap `deductKeys` optimistic update in a bounded retry loop (re-read + retry up to 3x) so concurrent modifications don't return a false "Not enough keys".
  - [~] 2.2 Make `grantKeys` atomic (Postgres RPC `keys = keys + amount`, or an optimistic retry loop) to remove the lost-update on concurrent refunds/grants.
  - [~] 2.3 Add an idempotency helper (table or short-TTL store keyed by `userId + requestId`) that records a spend result and returns the cached result on replay.
  - _Req: R8.4, food-scan races B2/B4, dusk race C-key_

- [ ] 3. Add Bearer-only server auth primitives (`server/lib/playerAuth.ts`)
  - [~] 3.1 Add `requireAuth` middleware that verifies the Bearer JWT (signature, role, expiry), sets `req.userId`, and returns a consistent `401 { error:'unauthorized', reason }` otherwise.
  - [~] 3.2 Change `getAuthenticatedUserId` to Bearer-only (remove the `req.session` fallback) — keep the old behavior behind a temporary flag for rollback until Task 10.
  - [~] 3.3 Add a reissue helper that, given a still-valid token, mints a fresh 30-day JWT.
  - _Req: R1.1–1.3, R8.3, R9.1_

- [ ] 4. Add token reissue endpoint + stop writing sessions (`server/auth/*.ts`)
  - [~] 4.1 Add `POST /api/auth/reissue` (accepts valid Bearer, returns fresh JWT).
  - [~] 4.2 Remove `req.session` writes from `googleAuth.ts` and `localAuth_supabase_fixed.ts` (keep JWT minting).
  - _Req: R1.2, R4.2, R6.1, R6.2_

- [~] 5. Audit and isolate admin auth
  - Determine whether admin routes use sessions; migrate to a dedicated admin credential/JWT or explicitly isolate so player-session removal doesn't break admin. Document the outcome in design.md.
  - _Req: R1.4_

- [~] 6. Nutrition (food scan) idempotency (`server/routes/nutrition.ts`)
  - Accept a client `requestId`; on replay return the cached result instead of charging again; keep the existing refund-on-failure paths.
  - _Req: food-scan races B1/B3_

- [ ] 7. Dusk billing correctness (`server/routes/dusk.ts`)
  - [~] 7.1 Replace the in-memory `duskMsgCounters` Map with an atomic per-user counter (DB column/RPC).
  - [~] 7.2 Exclude `[SYSTEM_EVENT]` messages from billing (no counter increment, no key deduction).
  - [~] 7.3 Refund the key if the AI call fails on a billed message (parity with nutrition).
  - _Req: dusk races C1/C2/C3/C6_

- [ ] 8. Unified client auth module (`lib/auth.ts`, new)
  - [~] 8.1 Implement `login()`, `logout()`, `getToken()`, `isAuthed()`.
  - [~] 8.2 Implement `authFetch(url, init)`: attach Bearer token; on 401 do a single-flight reissue then retry once; on failure route to a global "session expired" state.
  - [~] 8.3 Add `authEpoch`: bump on login/logout; tag requests and drop stale-epoch responses (prevents cross-account writes).
  - [~] 8.4 Hard-gate startup on `restoreAuthFromNative()` before the first authed call.
  - _Req: R4, R5.1, R7, auth races A1/A2/A3/A4_

- [ ] 9. Migrate client callers to `authFetch`
  - [~] 9.1 `lib/playerApi.ts` delegates to `lib/auth.ts`; remove `whoami`/session recovery paths.
  - [~] 9.2 Replace raw `fetch(..., {credentials:'include'})` authed calls in `App.tsx`, `HealthView.tsx`, `AuthView.tsx`, `SignInPage.tsx`, `CreateAccountPage.tsx`, and others with `authFetch`.
  - _Req: R5.1, R5.2_

- [~] 10. Consolidate the three login screens
  - Move duplicated `loginWithUser`/whoami logic into `lib/auth.ts` + one shared hook; `AuthView`/`SignInPage`/`CreateAccountPage` become thin UI. Preserve Google + email/password + OTP + forgot-password + onboarding routing.
  - _Req: R5.3, R6.1–6.4_

- [~] 11. Remove player session middleware (`server/index.ts`)
  - After Bearer-only is proven in staging, remove express-session/connect-pg-simple for player auth (keep admin isolation from Task 5). Delete the temporary rollback flag from Task 3.2.
  - _Req: R1.2, R1.3_

- [~] 12. Food-scan client hardening (`HealthView.tsx`, `NutritionLogCard.tsx`)
  - Add an in-flight lock (disable scan while a request is active) and send a per-tap `requestId`.
  - _Req: food-scan race B1_

- [ ] 13. Dusk client hardening (`hooks/useSystem.ts`, `components/DuskChat.tsx`)
  - [~] 13.1 Single-writer Dusk history store; component subscribes instead of independently writing `localStorage['dusk_chat_history_...']`.
  - [~] 13.2 `triggerDuskMessage` tags system events so they are non-billable end-to-end.
  - [~] 13.3 Insert/order messages by a monotonic client id to prevent out-of-order append.
  - _Req: dusk races C4/C5, R9.2_

- [ ] 14. FINAL RECHECK / REVERIFY (mandatory)
  - [~] 14.1 Static: `npx tsc --noEmit` clean; grep confirms no player-auth `req.session` reliance and no authed `credentials:'include'` bypassing `authFetch`.
  - [~] 14.2 Live probe: with a valid Bearer token, `POST /api/nutrition/analyze` and `POST /api/dusk/chat` from a Capacitor origin pass auth (non-401); with no token they return the consistent 401 shape.
  - [~] 14.3 Race checks: concurrent double food-scan (same `requestId`) charges exactly one key; concurrent Dusk messages keep the counter consistent; a system event charges zero keys; concurrent refund+grant shows no lost update.
  - [~] 14.4 Cross-platform matrix on web AND a freshly built release APK: fresh signup, returning login, food scan, Dusk chat, data sync, app-kill/restart persistence, logout.
  - [~] 14.5 Sign-off + build: document results, bump versionCode, rebuild APK, then ship.
  - _Req: R2, R3, R10_
