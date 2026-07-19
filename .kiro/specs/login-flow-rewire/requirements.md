# Requirements — Login Flow Rewire (JWT-Only, Production-Ready)

## Introduction

The REFORGE app currently authenticates with two parallel mechanisms: an Express session cookie (Postgres-backed, `sameSite:none/secure`) and a 30-day player JWT stored in localStorage + Capacitor Preferences. The web build silently relies on the session cookie while the native (Play Store) build depends on the Bearer JWT. This duality has produced a recurring, hard-to-diagnose class of bugs — most visibly "works on web, Unauthorized on the app" (e.g., food scan) — and is spread across three near-duplicate login screens, a multi-step 401 recovery chain, and ~15 server routes.

This spec rewires authentication into a single, unified, JWT-only flow that behaves identically on web and native, is production-ready, and does not lock out existing users. This document defines the requirements (the "what" and the guarantees); the design document will define the "how".

## Requirements

### Requirement 1 — Single unified auth mechanism
**User Story:** As a developer, I want one authentication mechanism (stateless Bearer JWT) for all clients, so that web and native behave identically and the session-cookie complexity is eliminated.

#### Acceptance Criteria
1. WHEN any client makes an authenticated API request THEN the server SHALL authenticate it using the Authorization Bearer JWT only.
2. WHEN the rewire is complete THEN the server SHALL NOT depend on Express session cookies for authenticating player API requests.
3. WHEN the session-cookie code paths (express-session, connect-pg-simple, cookie config) are removed or bypassed for player auth THEN no player-facing endpoint SHALL rely on `req.session` for identity.
4. IF admin authentication currently uses sessions THEN the spec SHALL either migrate admin auth to the same JWT model or explicitly isolate and document it so it is unaffected.

### Requirement 2 — Web/native parity
**User Story:** As a user, I want the app to behave the same whether I use the web version or the Play Store app, so that features like food scan and Dusk work everywhere.

#### Acceptance Criteria
1. WHEN a user is authenticated THEN every authenticated feature (food scan, Dusk chat, goals, quests, economy, sync) SHALL succeed on BOTH web and the native APK.
2. WHEN a request is made cross-origin from the native app THEN authentication SHALL NOT depend on cross-site cookies.
3. WHEN the same account performs the same action on web and native THEN the auth outcome SHALL be identical.

### Requirement 3 — No lockout / safe migration
**User Story:** As an existing logged-in user, I want to keep working after the update, so that I am not forced to re-login unexpectedly or lose access.

#### Acceptance Criteria
1. WHEN a user already holds a valid, unexpired player JWT THEN after the update the app SHALL continue to authenticate them without a forced re-login.
2. IF a user's only credential was the session cookie (no valid JWT) THEN the app SHALL detect the missing/expired token and route them to sign in again gracefully (no crash, no infinite 401 loop).
3. WHEN the change is deployed THEN there SHALL be a documented rollback path if auth regressions are detected.

### Requirement 4 — Token lifecycle (issuance, expiry, refresh)
**User Story:** As a user, I want to stay logged in for a reasonable period and be cleanly prompted to re-login when my session truly expires, so that I am neither logged out constantly nor stuck on errors.

#### Acceptance Criteria
1. WHEN a user logs in (Google or email/password) THEN the server SHALL issue a signed JWT and the client SHALL persist it in both localStorage and native storage.
2. WHEN a token is near or past expiry THEN the system SHALL either transparently refresh it via a non-cookie mechanism OR prompt re-login — and the chosen strategy SHALL be explicit in the design.
3. WHEN a request returns 401 due to an invalid/expired token THEN the client SHALL attempt at most one deterministic recovery and, if it fails, SHALL surface a clear "session expired — please sign in" state rather than a generic error.
4. WHEN a token is stored THEN it SHALL be persisted so that it survives the Android app process being killed from recents.

### Requirement 5 — Single client auth surface
**User Story:** As a developer, I want one auth module and one authenticated-fetch wrapper, so that no request can accidentally bypass auth and there is no duplicated login logic.

#### Acceptance Criteria
1. WHEN any authenticated request is made from the client THEN it SHALL go through a single wrapper that attaches the Bearer token.
2. WHEN the rewire is complete THEN raw `fetch(..., {credentials:'include'})` calls that relied on the session cookie for auth SHALL be replaced by the unified wrapper.
3. WHEN login/logout occurs THEN it SHALL be handled by a single shared auth module rather than duplicated across `AuthView`, `SignInPage`, and `CreateAccountPage`.

### Requirement 6 — Preserve existing login methods
**User Story:** As a user, I want to keep signing in with Google or email/password (including email verification and password reset), so that no login capability is lost in the rewire.

#### Acceptance Criteria
1. WHEN a user signs in with Google THEN the flow SHALL work on both web and native and issue the unified JWT.
2. WHEN a user registers or signs in with email/password THEN the flow SHALL work, including existing OTP email verification and forgot-password.
3. WHEN a new user completes signup THEN they SHALL be routed into onboarding/calibration exactly as today.
4. WHEN a returning user signs in THEN they SHALL be routed to the app without repeating onboarding.

### Requirement 7 — Logout and account switching
**User Story:** As a user, I want logout to fully clear my session, so that no stale identity or cross-account data leaks.

#### Acceptance Criteria
1. WHEN a user logs out THEN the client SHALL clear the token from localStorage, native storage, and any in-memory cache.
2. WHEN a different user logs in on the same device THEN no previous user's data or token SHALL remain.

### Requirement 8 — Security
**User Story:** As the app owner, I want auth to be secure, so that tokens and secrets are not leaked and requests are protected.

#### Acceptance Criteria
1. WHEN the client is built THEN it SHALL NOT contain server secrets (e.g., JWT signing secret); tokens SHALL only be minted server-side.
2. WHEN a JWT is transmitted THEN it SHALL only be sent over HTTPS to the app's own API origin.
3. WHEN the server verifies a token THEN it SHALL reject tokens with an invalid signature, wrong role, or expired claim.
4. WHEN per-user endpoints are accessed THEN the server SHALL continue to enforce that the authenticated user matches the requested resource (no horizontal privilege escalation).

### Requirement 9 — Error handling & observability
**User Story:** As a developer, I want clear auth error states and logs, so that future auth issues are diagnosable without guesswork.

#### Acceptance Criteria
1. WHEN authentication fails THEN the server SHALL respond with a consistent 401 shape and log the reason (no token, bad signature, expired) without leaking secrets.
2. WHEN the client hits an unrecoverable 401 THEN it SHALL show a single clear re-login prompt and SHALL NOT enter a retry/refresh loop.
3. WHEN diagnosing native auth THEN there SHALL be a way to confirm on-device whether a token is present and being attached.

### Requirement 10 — Verification
**User Story:** As the app owner, I want the rewire verified on both platforms before release, so that we don't repeat the "works on web, fails on app" pattern.

#### Acceptance Criteria
1. WHEN the rewire is implemented THEN it SHALL be validated on the web build AND a freshly built release APK before shipping.
2. WHEN validated THEN the test SHALL include: fresh signup, returning login, food scan, Dusk chat, data sync, app-kill/restart persistence, and logout — on both platforms.
3. WHEN the build is verified THEN the project SHALL still type-check and build successfully.

## Out of Scope
- Changing the identity providers themselves (still Google + email/password).
- Redesigning onboarding/calibration UX (only the auth wiring changes).
- Migrating historical data schemas beyond what auth requires.
