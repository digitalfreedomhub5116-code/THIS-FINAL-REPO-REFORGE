import { Router, Request, Response } from 'express';
import { query } from '../db/pool.js';

const ADMIN_SECRET = 'system_admin_2025';

const router = Router();

router.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  try {
    const result = await query('SELECT value FROM global_config WHERE key = $1', [key]);
    if (result.rows.length === 0) {
      return res.json({});
    }
    try {
      return res.json(JSON.parse(result.rows[0].value));
    } catch {
      return res.json(result.rows[0].value);
    }
  } catch (err) {
    console.error('[GlobalConfig GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:key', async (req: Request, res: Response) => {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { key } = req.params;
  const value = JSON.stringify(req.body);
  try {
    await query(
      `INSERT INTO global_config (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [key, value]
    );
    return res.json({ success: true });
  } catch (err) {
    console.error('[GlobalConfig PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
