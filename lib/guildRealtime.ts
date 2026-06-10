import { supabase } from './supabase';
import type { GuildMessage } from '../types';

export interface GuildRealtimeHandlers {
  onMessage?: (msg: GuildMessage) => void;
  onKicked?: (userId: string) => void;
  onDisbanded?: () => void;
  onMissionComplete?: (payload: { missionId: string; title: string }) => void;
  onJoinRequest?: (payload: { guildId: string; action: string }) => void;
  /** Fired when the socket (re)subscribes — use it to re-hydrate missed history. */
  onResubscribe?: () => void;
  /** Fired when presence state changes (users join/leave). */
  onPresenceSync?: (presenceState: any) => void;
  /** Fired when typing status broadcasts are received from other users. */
  onTyping?: (payload: { userId: string; name: string; isTyping: boolean }) => void;
}

/**
 * Subscribe to a guild's realtime channel.
 * Supports Broadcast events (messages, custom notifications) and Presence tracking.
 */
export function subscribeToGuild(
  guildId: string,
  handlers: GuildRealtimeHandlers,
  myPlayerInfo?: { userId: string; name: string } | null
): { unsubscribe: () => void; sendTyping: (isTyping: boolean) => void } {
  const presenceKey = myPlayerInfo?.userId || 'anonymous';
  const channel = supabase.channel(`guild:${guildId}`, {
    config: { 
      broadcast: { self: false },
      presence: { key: presenceKey }
    },
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
    .on('broadcast', { event: 'join_request' }, ({ payload }) => {
      handlers.onJoinRequest?.(payload as any);
    })
    .on('broadcast', { event: 'typing' }, ({ payload }) => {
      handlers.onTyping?.(payload as any);
    })
    .on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      handlers.onPresenceSync?.(state);
    });

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      handlers.onResubscribe?.();
      if (myPlayerInfo) {
        try {
          await channel.track({
            userId: myPlayerInfo.userId,
            name: myPlayerInfo.name,
            onlineAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('[Presence] track failed:', err);
        }
      }
    }
  });

  return {
    unsubscribe: () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        /* ignore */
      }
    },
    sendTyping: (isTyping: boolean) => {
      if (!myPlayerInfo) return;
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: myPlayerInfo.userId, name: myPlayerInfo.name, isTyping }
      });
    }
  };
}
