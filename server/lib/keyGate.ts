/**
 * keyGate.ts — Server-side key deduction for AI features.
 * Keys are ONLY modified by the server. The client can never set the keys balance.
 * 
 * Usage:
 *   const { success, remaining } = await deductKeys(userId, 1);
 *   if (!success) return res.status(402).json({ error: 'Not enough keys' });
 */
import { supabaseServer } from './supabase.js';

/** Check if a player has enough keys and deduct them atomically */
export async function deductKeys(
  userId: string,
  amount: number
): Promise<{ success: boolean; remaining: number; error?: string }> {
  const db = supabaseServer() as any;

  // 1. Get current keys balance (server-authoritative)
  const { data: player, error: fetchErr } = await db
    .from('players')
    .select('id, keys')
    .eq('supabase_id', userId)
    .single();

  if (fetchErr || !player) {
    return { success: false, remaining: 0, error: 'Player not found' };
  }

  const currentKeys = player.keys || 0;
  if (currentKeys < amount) {
    return { success: false, remaining: currentKeys, error: `Not enough keys. Need ${amount}, have ${currentKeys}` };
  }

  // 2. Deduct atomically
  const newKeys = currentKeys - amount;
  const { error: updateErr } = await db
    .from('players')
    .update({ keys: newKeys })
    .eq('id', player.id)
    .eq('keys', currentKeys); // Optimistic concurrency — only succeeds if no other deduction happened

  if (updateErr) {
    return { success: false, remaining: currentKeys, error: 'Concurrent modification — retry' };
  }

  return { success: true, remaining: newKeys };
}

/** Get a player's current key balance (read-only) */
export async function getKeyBalance(userId: string): Promise<number> {
  const db = supabaseServer() as any;
  const { data } = await db
    .from('players')
    .select('keys')
    .eq('supabase_id', userId)
    .single();
  return data?.keys || 0;
}

/** Grant keys to a player (for daily grants, leaderboard rewards, etc.) */
export async function grantKeys(
  userId: string,
  amount: number
): Promise<{ success: boolean; newBalance: number }> {
  const db = supabaseServer() as any;

  const { data: player, error: fetchErr } = await db
    .from('players')
    .select('id, keys')
    .eq('supabase_id', userId)
    .single();

  if (fetchErr || !player) {
    return { success: false, newBalance: 0 };
  }

  const newKeys = (player.keys || 0) + amount;
  const { error: updateErr } = await db
    .from('players')
    .update({ keys: newKeys })
    .eq('id', player.id);

  if (updateErr) {
    return { success: false, newBalance: player.keys || 0 };
  }

  return { success: true, newBalance: newKeys };
}
