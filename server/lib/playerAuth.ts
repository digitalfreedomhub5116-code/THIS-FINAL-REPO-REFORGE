import jwt from 'jsonwebtoken';
import { Request } from 'express';

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
 * Verify a player JWT and return the userId (sub claim), or null if invalid.
 */
export function verifyPlayerToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.role === 'player' && decoded?.sub) return decoded.sub;
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the authenticated userId from the request.
 * Tries Authorization: Bearer <jwt> first, falls back to Express session.
 * Returns the userId string or null if neither auth method succeeds.
 */
export function getAuthenticatedUserId(req: Request): string | null {
  // 1. Try JWT from Authorization header
  const authHeader = req.headers['authorization'];
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const userId = verifyPlayerToken(token);
    if (userId) return userId;
  }

  // 2. Fallback to Express session
  const sessionUserId = (req.session as any)?.userId;
  if (sessionUserId) return sessionUserId;

  return null;
}
