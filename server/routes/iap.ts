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

// ── POST /webhook — RevenueCat Server-Side Webhook ──
// This is the BACKUP path. If the app crashes after Google charges the user,
// RevenueCat still sends this webhook so the server can credit gold/keys.
//
// RevenueCat Dashboard → Integrations → Webhooks → Add:
//   URL: https://<your-railway-domain>/api/iap/webhook
//   Auth Header: Bearer <REVENUECAT_WEBHOOK_SECRET>
router.post('/webhook', async (req: Request, res: Response) => {
  // 1. Verify authorization header
  const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;
  const authHeader = req.headers.authorization;

  if (webhookSecret) {
    if (!authHeader || authHeader !== `Bearer ${webhookSecret}`) {
      console.warn('[IAP Webhook] Unauthorized request — bad auth header');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // 2. Parse the RevenueCat event
  const event = req.body?.event;
  if (!event) {
    return res.status(400).json({ error: 'Missing event payload' });
  }

  const eventType = event.type;
  const appUserId = event.app_user_id; // This is the Supabase user ID we set in RevenueCat
  const productId = event.product_id;
  const transactionId = event.transaction_id || event.id;

  console.log(`[IAP Webhook] Received event: ${eventType} | product: ${productId} | user: ${appUserId?.slice(-8)}`);

  // 3. Only process purchase events (not renewals, cancellations, etc.)
  if (eventType !== 'INITIAL_PURCHASE' && eventType !== 'NON_RENEWING_PURCHASE') {
    // Acknowledge event but don't process
    return res.json({ received: true, processed: false, reason: `Ignored event type: ${eventType}` });
  }

  // 4. Map product to credit
  const credit = CREDIT_MAP[productId];
  if (!credit) {
    console.warn(`[IAP Webhook] Unknown product: ${productId}`);
    return res.json({ received: true, processed: false, reason: `Unknown product: ${productId}` });
  }

  if (!appUserId) {
    console.warn('[IAP Webhook] No app_user_id in event');
    return res.status(400).json({ error: 'Missing app_user_id' });
  }

  try {
    const db = supabaseServer() as any;

    // 5. Find the player by their Supabase user ID (which is set as RevenueCat's app_user_id)
    const { data: player, error: playerErr } = await db
      .from('players')
      .select('id, gold, keys')
      .eq('supabase_id', appUserId)
      .single();

    if (playerErr || !player) {
      console.error(`[IAP Webhook] Player not found for user: ${appUserId}`);
      return res.status(404).json({ error: 'Player not found' });
    }

    // 6. Idempotency check — skip if this transaction was already credited
    if (transactionId) {
      const { data: existing } = await db
        .from('iap_transactions')
        .select('id')
        .eq('transaction_id', transactionId)
        .single();

      if (existing) {
        console.log(`[IAP Webhook] Transaction ${transactionId} already credited — skipping`);
        return res.json({ received: true, processed: false, reason: 'Already credited (idempotent)' });
      }
    }

    // 7. Credit the player
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
      console.error('[IAP Webhook] Credit failed:', updateErr);
      return res.status(500).json({ error: 'Failed to credit account' });
    }

    // 8. Record the transaction
    await db.from('iap_transactions').insert({
      player_id: player.id,
      product_id: productId,
      transaction_id: transactionId || `webhook_${Date.now()}`,
      credit_type: credit.type,
      credit_amount: credit.amount,
      source: 'revenuecat_webhook',
      created_at: new Date().toISOString(),
    }).catch(() => {
      console.warn('[IAP Webhook] Could not record transaction — iap_transactions table may not exist');
    });

    console.log(`[IAP Webhook] ✅ Credited ${credit.amount} ${credit.type} to ${appUserId.slice(-8)} → gold=${newGold}, keys=${newKeys}`);

    return res.json({
      received: true,
      processed: true,
      creditType: credit.type,
      creditAmount: credit.amount,
    });
  } catch (err) {
    console.error('[IAP Webhook] Error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
