/**
 * Phase 2: Quests CRUD API — quests in their own table
 * Mirrors the goals table pattern: per-quest CRUD eliminates array-overwrite races.
 */
import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

// ── GET /api/quests/:playerId — Fetch all quests for a player ──
router.get('/:playerId', async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { active, since } = req.query;

  try {
    let query = (supabaseServer() as any)
      .from('quests')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    // Optional: only active (not completed/failed)
    if (active === 'true') {
      query = query.eq('is_completed', false).eq('failed', false);
    }

    // Optional: only quests updated since a timestamp (for incremental sync)
    if (since && typeof since === 'string') {
      query = query.gte('updated_at', since);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Transform DB rows back to client Quest shape
    const quests = (data || []).map(rowToQuest);
    return res.json(quests);
  } catch (err) {
    console.error('[Quests GET]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/quests/:playerId/sync — Bulk upsert quests (client pushes all) ──
router.put('/:playerId/sync', async (req: Request, res: Response) => {
  const { playerId } = req.params;
  const { quests } = req.body;

  if (!Array.isArray(quests)) {
    return res.status(400).json({ error: 'quests must be an array' });
  }

  try {
    const rows = quests.map((q: any) => questToRow(q, playerId as string));

    // Upsert: insert or update based on (quest_id, player_id) unique constraint
    const { error } = await (supabaseServer() as any)
      .from('quests')
      .upsert(rows, { onConflict: 'quest_id,player_id' });

    if (error) throw error;

    return res.json({ success: true, count: rows.length });
  } catch (err) {
    console.error('[Quests SYNC]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── PUT /api/quests/:playerId/:questId — Update a single quest ──
router.put('/:playerId/:questId', async (req: Request, res: Response) => {
  const { playerId, questId } = req.params;
  const quest = req.body;

  try {
    const row = questToRow(quest, playerId as string);

    const { error } = await (supabaseServer() as any)
      .from('quests')
      .upsert(row, { onConflict: 'quest_id,player_id' });

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    console.error('[Quests PUT]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── DELETE /api/quests/:playerId/:questId — Delete a quest ──
router.delete('/:playerId/:questId', async (req: Request, res: Response) => {
  const { playerId, questId } = req.params;

  try {
    const { error } = await (supabaseServer() as any)
      .from('quests')
      .delete()
      .eq('quest_id', questId)
      .eq('player_id', playerId);

    if (error) throw error;
    return res.json({ success: true });
  } catch (err) {
    console.error('[Quests DELETE]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Helpers: Convert between client Quest shape and DB row ──

function questToRow(q: any, playerId: string) {
  return {
    quest_id: q.id,
    player_id: playerId,
    title: q.title || '',
    description: q.description || null,
    rank: q.rank || 'E',
    category: q.category || null,
    categories: q.categories || [],
    xp_reward: q.xpReward || 0,
    is_completed: q.isCompleted || false,
    failed: q.failed || false,
    is_daily: q.isDaily || false,
    estimated_duration: q.estimatedDuration || null,
    scheduled_time: q.scheduledTime || null,
    goal_id: q.goalId || null,
    goal_title: q.goalTitle || null,
    has_pact: q.hasPact || false,
    pact_amount: q.pactAmount || 0,
    pact_status: q.pactStatus || null,
    sensor_requirements: q.sensorRequirements || null,
    sensor_data: q.sensorData || null,
    sensor_tracking: q.sensorTracking || false,
    raw_quest_data: q, // Store full quest object for any fields we don't have columns for
    created_at: q.createdAt ? new Date(q.createdAt).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: q.isCompleted && q.completedAt ? new Date(q.completedAt).toISOString() : null,
    expires_at: q.expiresAt || null,
  };
}

function rowToQuest(row: any) {
  // Start with the full stored quest data, then overlay DB-authoritative fields
  const base = row.raw_quest_data || {};
  return {
    ...base,
    id: row.quest_id,
    title: row.title,
    description: row.description,
    rank: row.rank,
    category: row.category,
    categories: row.categories,
    xpReward: row.xp_reward,
    isCompleted: row.is_completed,
    failed: row.failed,
    isDaily: row.is_daily,
    estimatedDuration: row.estimated_duration,
    scheduledTime: row.scheduled_time,
    goalId: row.goal_id,
    goalTitle: row.goal_title,
    hasPact: row.has_pact,
    pactAmount: row.pact_amount,
    pactStatus: row.pact_status,
    sensorRequirements: row.sensor_requirements,
    sensorData: row.sensor_data,
    sensorTracking: row.sensor_tracking,
    createdAt: new Date(row.created_at).getTime(),
    expiresAt: row.expires_at,
  };
}

export default router;
