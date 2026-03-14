import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = '8h';

export function generateAdminToken(): string {
  return jwt.sign({ role: 'admin', iat: Math.floor(Date.now() / 1000) }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.role === 'admin';
  } catch {
    return false;
  }
}

export function requireAdmin(req: Request, res: Response): boolean {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized — missing or malformed token' });
    return false;
  }
  const token = authHeader.slice(7);
  if (!verifyAdminToken(token)) {
    res.status(401).json({ error: 'Unauthorized — invalid or expired token' });
    return false;
  }
  return true;
}
