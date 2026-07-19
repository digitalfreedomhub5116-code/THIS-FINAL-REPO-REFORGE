import express, { Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';

const router = express.Router();

router.post('/log', async (req: Request, res: Response) => {
  try {
    const { questId, questRank, outcome, timestamp } = req.body;
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const db = supabaseServer() as any;
    // Resolve the internal player row UUID from the auth userId (supabase_id)
    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      console.warn('[Audit] Player not found for userId:', userId);
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fire and forget insert into audit_logs
    await db
      .from('audit_logs')
      .insert({
        user_id: player.id,
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
