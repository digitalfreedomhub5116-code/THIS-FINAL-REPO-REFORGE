import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { requireAdmin } from '../lib/adminAuth.js';

const router = Router();

// ── POST /api/reports — submit a player report ──
router.post('/', async (req: Request, res: Response) => {
  const {
    reporterUserId,
    reporterName,
    reportedUserId,
    reportedName,
    reportedLevel,
    reportedRank,
    reportedXp,
    reportedOutfitId,
    reasons,
  } = req.body;

  if (!reporterUserId || !reportedUserId || !Array.isArray(reasons) || reasons.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Prevent self-reporting
  if (reporterUserId === reportedUserId) {
    return res.status(400).json({ error: 'Cannot report yourself' });
  }

  try {
    const sb = supabaseServer() as any;

    // Fetch full reported player data from DB
    const { data: reportedPlayer } = await sb
      .from('players')
      .select('gold, keys, level, rank, current_xp, total_xp, raw_data')
      .eq('supabase_id', reportedUserId)
      .single();

    const rawData = reportedPlayer?.raw_data || {};

    const { error } = await sb.from('player_reports').insert({
      reporter_user_id: reporterUserId,
      reporter_name: reporterName || 'Unknown',
      reported_user_id: reportedUserId,
      reported_name: reportedName || 'Unknown',
      reported_level: reportedPlayer?.level ?? reportedLevel ?? 1,
      reported_rank: reportedPlayer?.rank ?? reportedRank ?? 'E',
      reported_xp: reportedPlayer?.total_xp ?? reportedXp ?? 0,
      reported_gold: reportedPlayer?.gold ?? 0,
      reported_keys: reportedPlayer?.keys ?? 0,
      reported_outfit_id: reportedOutfitId || 'outfit_starter',
      reported_unlocked_outfits: rawData.unlockedOutfits || [],
      reasons: reasons,
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Reports POST]', err);
    return res.status(500).json({ error: 'Failed to save report' });
  }
});

// ── GET /api/reports — admin only, fetch all reports ──
router.get('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const sb = supabaseServer() as any;
    const { data, error } = await sb
      .from('player_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return res.json(data || []);
  } catch (err) {
    console.error('[Reports GET]', err);
    return res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// ── PATCH /api/reports/:id — admin dismiss/resolve ──
router.patch('/:id', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'resolved' | 'dismissed'
  if (!['resolved', 'dismissed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  try {
    const sb = supabaseServer() as any;
    const { error } = await sb
      .from('player_reports')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Reports PATCH]', err);
    return res.status(500).json({ error: 'Failed to update report' });
  }
});

export default router;
