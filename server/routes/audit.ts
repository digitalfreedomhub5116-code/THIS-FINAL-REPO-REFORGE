import express, { Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = express.Router();

router.post('/log', async (req: Request, res: Response) => {
  try {
    const { questId, questRank, outcome, timestamp } = req.body;
    const userId = (req as any).user?.id || (req.session as any)?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Fire and forget insert into audit_logs
    await (supabaseServer() as any)
      .from('audit_logs')
      .insert({
        user_id: userId,
        quest_id: questId,
        quest_rank: questRank,
        outcome: outcome,
        logged_at: timestamp || new Date().toISOString()
      });

    // We don't care about the result for the client, so return 200 immediately
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[AuditTheater] Failed to log audit:', error);
    // Even on error, return 200 so we don't break the client's silent background fetch
    res.status(200).json({ success: false, error: 'Silenced' });
  }
});

export default router;
