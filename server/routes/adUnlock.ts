/**
 * Ad-Gated Unlock System — Server Routes
 * 
 * Tracks per-item ad watch progress. Each item has its own independent counter.
 * When the required number of ads is watched, the item is automatically added to inventory.
 */
import { Router, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

/**
 * Resolve the internal player row ID from the auth userId (supabase_id).
 * Returns { id: uuid, supabase_id: string } or null if not found.
 */
async function resolvePlayer(db: any, supabaseId: string) {
  const { data, error } = await db
    .from('players')
    .select('id')
    .eq('supabase_id', supabaseId)
    .single();
  if (error || !data) return null;
  return data as { id: string };
}

/**
 * GET /api/ad-unlock/progress
 * Returns ad watch progress for all items (or a specific item)
 * Query: ?itemId=border-video-neon (optional — if omitted, returns all)
 */
router.get('/progress', async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const db = supabaseServer() as any;
    const player = await resolvePlayer(db, userId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const itemId = req.query.itemId as string | undefined;

    let query = db
      .from('ad_unlock_progress')
      .select('item_id, ads_watched, ads_required, unlocked')
      .eq('player_id', player.id);

    if (itemId) query = query.eq('item_id', itemId);

    const { data, error } = await query;
    if (error) {
      console.error('[AdUnlock] Progress fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch progress' });
    }

    // Return as a map { itemId: { adsWatched, adsRequired, unlocked } }
    const progressMap: Record<string, { adsWatched: number; adsRequired: number; unlocked: boolean }> = {};
    for (const row of (data || [])) {
      progressMap[row.item_id] = {
        adsWatched: row.ads_watched,
        adsRequired: row.ads_required,
        unlocked: row.unlocked,
      };
    }

    return res.json({ progress: progressMap });
  } catch (e) {
    console.error('[AdUnlock] Progress error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ad-unlock/watch
 * Increment ad count for a SPECIFIC item. Auto-unlocks when threshold is met.
 * Body: { itemId: string, adsRequired: number }
 */
router.post('/watch', async (req: Request, res: Response) => {
  try {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { itemId, adsRequired } = req.body;
    if (!itemId || !adsRequired) {
      return res.status(400).json({ error: 'itemId and adsRequired are required' });
    }

    const db = supabaseServer() as any;
    const player = await resolvePlayer(db, userId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    // Check existing progress
    const { data: existing } = await db
      .from('ad_unlock_progress')
      .select('ads_watched, unlocked')
      .eq('player_id', player.id)
      .eq('item_id', itemId)
      .single();

    if (existing?.unlocked) {
      return res.json({ 
        adsWatched: existing.ads_watched, 
        adsRequired, 
        unlocked: true, 
        alreadyUnlocked: true 
      });
    }

    const currentCount = (existing?.ads_watched ?? 0) + 1;
    const nowUnlocked = currentCount >= adsRequired;

    // Upsert the progress
    const { error: upsertError } = await db
      .from('ad_unlock_progress')
      .upsert({
        player_id: player.id,
        item_id: itemId,
        ads_watched: currentCount,
        ads_required: adsRequired,
        unlocked: nowUnlocked,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'player_id,item_id' });

    if (upsertError) {
      console.error('[AdUnlock] Upsert error:', upsertError);
      return res.status(500).json({ error: 'Failed to update progress' });
    }

    // If now unlocked, add to user_inventory
    if (nowUnlocked) {
      // Determine item type from ID
      const itemType = itemId.startsWith('border') ? 'border' 
                     : itemId.startsWith('outfit') ? 'outfit' 
                     : 'border';

      // Check if already in inventory (safety check)
      const { data: existingInv } = await db
        .from('user_inventory')
        .select('id')
        .eq('player_id', player.id)
        .eq('item_id', itemId)
        .single();

      if (!existingInv) {
        const { error: invError } = await db
          .from('user_inventory')
          .insert({
            player_id: player.id,
            item_id: itemId,
            item_type: itemType,
            price_paid: 0,
            source: 'reward',
          });

        if (invError) {
          console.error('[AdUnlock] Inventory insert error:', invError);
          // Don't fail — the progress is saved, retry on next request
        }
      }
    }

    return res.json({
      adsWatched: currentCount,
      adsRequired,
      unlocked: nowUnlocked,
      justUnlocked: nowUnlocked,
    });
  } catch (e) {
    console.error('[AdUnlock] Watch error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
