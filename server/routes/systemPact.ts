import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

// Create a new System Pact when player pledges Gold
router.post('/create', async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { quest_id, quest_title, quest_rank, pledge_amount } = req.body;
  if (!quest_id || !pledge_amount) {
    return res.status(400).json({ error: 'quest_id and pledge_amount required' });
  }

  try {
    const { data, error } = await (supabaseServer() as any)
      .from('system_pacts')
      .insert({
        user_id: userId,
        quest_id,
        quest_title: quest_title || '',
        quest_rank: quest_rank || 'E',
        pledge_amount,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error('[SystemPact create]', err);
    return res.status(500).json({ error: err.message || 'Failed to create pact' });
  }
});

// Resolve a pact as honored
router.post('/resolve', async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { quest_id, status } = req.body;
  if (!quest_id || !status) {
    return res.status(400).json({ error: 'quest_id and status required' });
  }

  try {
    const { data, error } = await (supabaseServer() as any)
      .from('system_pacts')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('quest_id', quest_id)
      .eq('status', 'active')
      .select()
      .single();

    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    console.error('[SystemPact resolve]', err);
    return res.status(500).json({ error: err.message || 'Failed to resolve pact' });
  }
});

// Burn a pact — Gold goes to integrity pool
router.post('/burn', async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });

  const { quest_id, amount, week_start } = req.body;
  if (!quest_id || !amount || !week_start) {
    return res.status(400).json({ error: 'quest_id, amount, and week_start required' });
  }

  try {
    // Mark pact as burned
    const { data: pact, error: pactErr } = await (supabaseServer() as any)
      .from('system_pacts')
      .update({ status: 'burned', resolved_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('quest_id', quest_id)
      .eq('status', 'active')
      .select()
      .single();

    if (pactErr) throw pactErr;

    // Log to integrity pool
    const { error: poolErr } = await (supabaseServer() as any)
      .from('integrity_pool')
      .insert({
        user_id: userId,
        pact_id: pact?.id || null,
        amount,
        week_start,
      });

    if (poolErr) throw poolErr;

    return res.json({ burned: true, amount });
  } catch (err: any) {
    console.error('[SystemPact burn]', err);
    return res.status(500).json({ error: err.message || 'Failed to burn pact' });
  }
});

export default router;
