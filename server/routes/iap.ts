/**
 * iap.ts — In-App Purchase credit endpoint.
 *
 * After a successful RevenueCat consumable purchase, the client calls
 * POST /api/iap/credit with the productId to credit the player's
 * gold or keys (mana crystals).
 *
 * Security: We trust the client ONLY after RevenueCat SDK has confirmed
 * the purchase locally. For production, add RevenueCat webhook validation.
 */
import { Router, Request, Response } from 'express';
import { getAuthenticatedUserId } from '../lib/playerAuth.js';
import { supabaseServer } from '../lib/supabase.js';

const router = Router();

// ── Credit mapping: productId → { type, amount } ──
const CREDIT_MAP: Record<string, { type: 'gold' | 'keys'; amount: number }> = {
  'mana_crystals_10':    { type: 'keys', amount: 10 },
  'mana_crystals_30':    { type: 'keys', amount: 30 },
  'mana_crystals_75':    { type: 'keys', amount: 75 },
  'gold_crystals_1000':  { type: 'gold', amount: 1000 },
  'gold_crystals_4000':  { type: 'gold', amount: 4000 },
  'gold_crystals_12000': { type: 'gold', amount: 12000 },
};

// ── POST /credit — Credit keys or gold after a verified purchase ──
router.post('/credit', async (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { productId, transactionId } = req.body;

  if (!productId || typeof productId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid productId' });
  }

  const credit = CREDIT_MAP[productId];
  if (!credit) {
    return res.status(400).json({ error: `Unknown product: ${productId}` });
  }

  try {
    const db = supabaseServer() as any;

    // 1. Get player
    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id, gold, keys')
      .eq('supabase_id', userId)
      .single();

    if (playerErr || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 2. Idempotency check — prevent double-crediting the same transaction
    if (transactionId) {
      const { data: existing } = await db
        .from('iap_transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .single();

      if (existing) {
        console.log(`[IAP] Duplicate transaction ${transactionId} — skipping`);
        return res.json({
          success: true,
          duplicate: true,
          gold: player.gold,
          keys: player.keys,
        });
      }
    }

    // 3. Credit the player
    const currentGold = player.gold || 0;
    const currentKeys = player.keys || 0;
    let newGold = currentGold;
    let newKeys = currentKeys;

    if (credit.type === 'gold') {
      newGold = currentGold + credit.amount;
    } else {
      newKeys = currentKeys + credit.amount;
    }

    const { error: updateErr } = await db
      .from('players')
      .update({
        gold: newGold,
        keys: newKeys,
        updated_at: new Date().toISOString(),
      })
      .eq('id', player.id);

    if (updateErr) {
      console.error('[IAP] Credit failed:', updateErr);
      return res.status(500).json({ error: 'Failed to credit account' });
    }

    // 4. Record the transaction (for idempotency + audit)
    await db.from('iap_transactions').insert({
      player_id: player.id,
      product_id: productId,
      transaction_id: transactionId || `manual_${Date.now()}`,
      credit_type: credit.type,
      credit_amount: credit.amount,
      created_at: new Date().toISOString(),
    }).catch(() => {
      // Table might not exist yet — log but don't fail
      console.warn('[IAP] Could not record transaction — iap_transactions table may not exist');
    });

    console.log(`[IAP] ${userId.slice(-8)}: Credited ${credit.amount} ${credit.type} (${productId}) → gold=${newGold}, keys=${newKeys}`);

    return res.json({
      success: true,
      creditType: credit.type,
      creditAmount: credit.amount,
      gold: newGold,
      keys: newKeys,
    });
  } catch (err) {
    console.error('[IAP credit]', err);
    return res.status(500).json({ error: 'Credit failed' });
  }
});

export default router;
