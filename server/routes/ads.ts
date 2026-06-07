/**
 * AdMob ads routes.
 *
 *   GET /api/ads/ssv-callback
 *     Public endpoint that Google's ad servers call after each completed
 *     rewarded ad. The callback is signed with ECDSA — we verify the
 *     signature against Google's published public keys.
 *
 *     Configure this URL in AdMob Console:
 *       Apps → REFORGE → Edit → Server-side verification (SSV)
 *       → Custom callback URL:
 *         https://this-final-repo-reforge-production-2c30.up.railway.app/api/ads/ssv-callback
 *
 *   ─── Trust model ───
 *
 *   Per Google's recommendation [1], rewards are granted *immediately* on the
 *   client-side `Rewarded` event for the best UX. SSV runs in parallel as the
 *   anti-fraud verification layer:
 *
 *     • Each successful client call to /api/economy/ad-key-watch increments
 *       a "client-claimed" counter (already implemented).
 *     • Each Google SSV callback that we successfully verify increments a
 *       separate "ssv-confirmed" counter.
 *
 *   In a healthy install, the two counters stay in sync. If client-claimed
 *   pulls significantly ahead of ssv-confirmed for a given user, that user
 *   may be tampering with the client. That divergence is logged here and
 *   exposed via raw_data.adKeysSsvDelta so anti-cheat tooling can react.
 *
 *   We deliberately do *not* double-grant from SSV — the client already gave
 *   the user their key. SSV just confirms it was a legitimate ad watch.
 *
 *   [1] https://developers.google.com/admob/ios/ssv
 */
import { Router, Request, Response } from 'express';
import { supabaseServer } from '../lib/supabase.js';
import { verifySsvSignature } from '../lib/admobSsv.js';

const router = Router();

router.get('/ssv-callback', async (req: Request, res: Response) => {
  const startedAt = Date.now();

  // Capture the EXACT raw query string. Express's `req.url` keeps it intact
  // (unlike `req.query` which has already been parsed and re-encoded).
  const fullUrl = req.url || '';
  const qIdx = fullUrl.indexOf('?');
  const rawQuery = qIdx >= 0 ? fullUrl.substring(qIdx + 1) : '';

  const q = req.query as Record<string, string | undefined>;
  const keyId = q.key_id;
  const signature = q.signature;
  const transactionId = q.transaction_id;
  const userId = q.user_id;            // we set this client-side to player.userId
  const adNetwork = q.ad_network;
  const adUnit = q.ad_unit;

  // SSV callbacks always carry these params — refuse anything else.
  if (!keyId || !signature || !transactionId || !userId) {
    console.warn('[SSV] rejected — missing params', JSON.stringify({ keyId, hasSig: !!signature, transactionId, userId }));
    // Per docs, return 200 OK so Google doesn't retry forever; we just don't credit.
    return res.status(200).send('ok');
  }

  // ── Verify ECDSA signature against Google's public key set ──
  let verify;
  try {
    verify = await verifySsvSignature(rawQuery, keyId, signature);
  } catch (err: any) {
    console.error('[SSV] verify threw', err?.message || err);
    return res.status(200).send('ok');
  }
  if (!verify.valid) {
    console.warn('[SSV] rejected — invalid signature', verify.reason, '| txn', transactionId, '| user', userId.slice(-8));
    return res.status(200).send('ok');
  }

  // ── Dedupe by transaction_id ──
  // Google may legitimately retry the callback with the same transaction_id.
  // We track processed transactions in players.raw_data.adKeysSsvTxns (last
  // 200) so the same ad can't be counted twice in our verification trail.
  const db = supabaseServer() as any;
  try {
    const { data: player, error: fetchErr } = await db
      .from('players')
      .select('id, supabase_id, raw_data')
      .eq('supabase_id', userId)
      .single();
    if (fetchErr || !player) {
      console.warn('[SSV] rejected — player not found', userId.slice(-8));
      return res.status(200).send('ok');
    }

    const rawData = (player.raw_data as Record<string, any>) || {};
    const seenTxns: string[] = Array.isArray(rawData.adKeysSsvTxns) ? rawData.adKeysSsvTxns : [];
    if (seenTxns.includes(transactionId)) {
      console.log('[SSV] dedup hit (already processed)', transactionId);
      return res.status(200).send('ok');
    }

    const prevSsvCount: number = Number(rawData.adKeysSsvConfirmed) || 0;
    const newSsvCount = prevSsvCount + 1;
    const clientClaimed: number = Number(rawData.adKeysWatched) || 0;
    // Positive delta means client has claimed more ads than SSV has confirmed.
    // Small positive delta is normal (client races ahead until SSV arrives);
    // large or persistent delta suggests tampering.
    const delta = clientClaimed - newSsvCount;

    // Keep the txn ring-buffer at 200 entries to bound storage.
    const trimmedTxns = [...seenTxns, transactionId].slice(-200);

    const newRawData = {
      ...rawData,
      adKeysSsvConfirmed: newSsvCount,
      adKeysSsvTxns: trimmedTxns,
      adKeysSsvLastAt: new Date().toISOString(),
      adKeysSsvDelta: delta,
    };

    const { error: updateErr } = await db
      .from('players')
      .update({ raw_data: newRawData })
      .eq('id', player.id);

    if (updateErr) {
      console.error('[SSV] db update failed', updateErr);
      // Non-2xx triggers Google retries — txn dedup keeps things idempotent.
      return res.status(500).send('db-error');
    }

    const took = Date.now() - startedAt;
    const flag = delta >= 5 ? ' ⚠️ HIGH-DELTA' : '';
    console.log(
      `[SSV] ✅ ${userId.slice(-8)} | ssvConfirmed=${newSsvCount} | clientClaimed=${clientClaimed} | delta=${delta}${flag} | net=${adNetwork} unit=${adUnit} | ${took}ms`,
    );

    return res.status(200).send('ok');
  } catch (err) {
    console.error('[SSV] handler error', err);
    return res.status(500).send('error');
  }
});

export default router;
