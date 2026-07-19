import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = '30d';

/**
 * Generate a player-scoped JWT containing the user's supabase_id.
 * Issued at login (Google OAuth, local auth). Stored in localStorage on the client.
 */
export function generatePlayerToken(userId: string): string {
  return jwt.sign({ role: 'player', sub: userId, iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

/**
 * Internal verify that distinguishes failure reasons without leaking secret details.
 * Returns either the userId, or a structured reason for the failure.
 */
type VerifyReason = 'no_token' | 'invalid_token' | 'expired';
type VerifyResult = { ok: true; userId: string } | { ok: false; reason: VerifyReason };

function verifyPlayerTokenDetailed(token: string | undefined | null): VerifyResult {
  if (!token) return { ok: false, reason: 'no_token' };
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.role === 'player' && decoded?.sub) return { ok: true, userId: decoded.sub };
    // Decoded but wrong role/shape → treat as an invalid token.
    console.warn('[PlayerAuth] Token decoded but missing role/sub:', JSON.stringify({ role: decoded?.role, sub: decoded?.sub }));
    return { ok: false, reason: 'invalid_token' };
  } catch (err: any) {
    const expired = err?.name === 'TokenExpiredError' || err instanceof (jwt as any).TokenExpiredError;
    // Do NOT log token contents or secret details — only the sanitized reason.
    console.warn('[PlayerAuth] Token verification FAILED:', expired ? 'expired' : 'invalid_token');
    return { ok: false, reason: expired ? 'expired' : 'invalid_token' };
  }
}

/**
 * Verify a player JWT and return the userId (sub claim), or null if invalid.
 * Signature/behavior preserved for existing callers.
 */
export function verifyPlayerToken(token: string): string | null {
  const r = verifyPlayerTokenDetailed(token);
  return r.ok ? r.userId : null;
}

/**
 * Express middleware: authenticate a request using the Authorization Bearer JWT only.
 * On success sets `req.userId` and calls next().
 * On failure responds with a consistent 401 shape: { error:'unauthorized', reason }.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized', reason: 'no_token' });
    return;
  }

  const token = authHeader.slice(7);
  const result = verifyPlayerTokenDetailed(token);
  if (result.ok) {
    (req as any).userId = result.userId;
    next();
    return;
  }

  res.status(401).json({ error: 'unauthorized', reason: result.reason });
}

/**
 * Extract the authenticated userId from the request.
 * Bearer-only by default. A temporary rollback escape hatch preserves the old
 * Express-session fallback when AUTH_ALLOW_SESSION_FALLBACK === 'true'.
 * Returns the userId string or null if auth fails.
 */
export function getAuthenticatedUserId(req: Request): string | null {
  // 1. Try JWT from Authorization header (primary, and default-only path)
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const userId = verifyPlayerToken(token);
    if (userId) return userId;
    console.warn('[PlayerAuth] JWT auth failed for', req.method, req.path);
  } else {
    console.warn('[PlayerAuth] No Bearer token for', req.method, req.path);
  }

  // 2. Rollback escape hatch: only fall back to the Express session when explicitly enabled.
  if (process.env.AUTH_ALLOW_SESSION_FALLBACK === 'true') {
    const sessionUserId = (req.session as any)?.userId;
    if (sessionUserId) return sessionUserId;
  }

  console.warn('[PlayerAuth] AUTH FAILED for', req.method, req.path);
  return null;
}

/**
 * Given a still-valid token, mint a fresh 30-day JWT for the same user.
 * Returns null if the provided token is invalid or expired.
 */
export function reissuePlayerToken(oldToken: string): string | null {
  const userId = verifyPlayerToken(oldToken);
  if (!userId) return null;
  return generatePlayerToken(userId);
}
