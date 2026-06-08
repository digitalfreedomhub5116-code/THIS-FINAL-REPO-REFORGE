import { supabase } from './supabase';
import type { GuildMessage } from '../types';

export interface GuildRealtimeHandlers {
  onMessage?: (msg: GuildMessage) => void;
  onKicked?: (userId: string) => void;
  onDisbanded?: () => void;
  onMissionComplete?: (payload: { missionId: string; title: string }) => void;
  /** Fired when the socket (re)subscribes — use it to re-hydrate missed history. */
  onResubscribe?: () => void;
}

/**
 * Subscribe to a guild's realtime broadcast channel.
 *
 * Production notes:
 * - Uses Supabase Broadcast (not Postgres Changes) so delivery does NOT depend on
 *   a per-user Supabase Auth session / RLS — works for every player regardless of
 *   how they authenticated with the Express backend.
 * - The server is the source of truth: it persists each event and fans it out here.
 * - Returns an unsubscribe function. ALWAYS call it on unmount / guild switch to
 *   avoid leaked channels (the #1 cause of Realtime connection exhaustion).
 */
export function subscribeToGuild(guildId: string, handlers: GuildRealtimeHandlers): () => void {
  const channel = supabase.channel(`guild:${guildId}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      handlers.onMessage?.(payload as GuildMessage);
    })
    .on('broadcast', { event: 'kicked' }, ({ payload }) => {
      handlers.onKicked?.((payload as any)?.userId);
    })
    .on('broadcast', { event: 'disbanded' }, () => {
      handlers.onDisbanded?.();
    })
    .on('broadcast', { event: 'mission_complete' }, ({ payload }) => {
      handlers.onMissionComplete?.(payload as any);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        handlers.onResubscribe?.();
      }
    });

  return () => {
    try {
      supabase.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}
