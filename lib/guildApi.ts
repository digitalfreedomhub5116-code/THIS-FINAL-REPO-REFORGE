import { API_BASE } from './apiConfig';
import { authenticatedFetch } from './playerApi';
import type {
  Guild,
  GuildSummary,
  GuildMember,
  GuildMessage,
  GuildMission,
  WarState,
  GuildRole,
  GuildJoinRequest,
  VaultTransaction,
} from '../types';

const base = `${API_BASE}/api/guilds`;

async function jsonOrThrow(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `Request failed (${res.status})`);
  return data;
}

// ── Browser & membership ──
export async function fetchGuilds(search = '', filter: 'top' | 'recruiting' | 'war' = 'top'): Promise<GuildSummary[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter) params.set('filter', filter);
  const res = await authenticatedFetch(`${base}?${params.toString()}`);
  const data = await jsonOrThrow(res);
  return data.guilds || [];
}

export async function fetchMyGuild(): Promise<{ guild: Guild | null; membership: { role: GuildRole; contributionPoints: number } | null }> {
  const res = await authenticatedFetch(`${base}/me`);
  return jsonOrThrow(res);
}

export async function fetchGuildDetail(id: string): Promise<{ guild: Guild; myRole: GuildRole | null; members: GuildMember[] }> {
  const res = await authenticatedFetch(`${base}/${id}`);
  return jsonOrThrow(res);
}

export async function createGuild(payload: { name: string; tag?: string; motto?: string; icon?: string; banner?: string; privacy?: string }): Promise<{ guild: Guild }> {
  const res = await authenticatedFetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  return jsonOrThrow(res);
}

export async function joinGuild(id: string): Promise<{ status: 'joined' | 'requested' }> {
  const res = await authenticatedFetch(`${base}/${id}/join`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function leaveGuild(id: string): Promise<{ status: string }> {
  const res = await authenticatedFetch(`${base}/${id}/leave`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function disbandGuild(id: string): Promise<{ status: string }> {
  const res = await authenticatedFetch(`${base}/${id}/disband`, { method: 'POST' });
  return jsonOrThrow(res);
}

// ── Join requests ──
export async function fetchJoinRequests(id: string): Promise<GuildJoinRequest[]> {
  const res = await authenticatedFetch(`${base}/${id}/requests`);
  const data = await jsonOrThrow(res);
  return data.requests || [];
}

export async function resolveJoinRequest(id: string, reqId: string, action: 'approve' | 'reject'): Promise<{ status: string }> {
  const res = await authenticatedFetch(`${base}/${id}/requests/${reqId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  return jsonOrThrow(res);
}

// ── Membership management ──
export async function setMemberRole(id: string, userId: string, role: 'vice' | 'member'): Promise<{ status: string }> {
  const res = await authenticatedFetch(`${base}/${id}/members/${userId}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }),
  });
  return jsonOrThrow(res);
}

export async function kickMember(id: string, userId: string): Promise<{ status: string }> {
  const res = await authenticatedFetch(`${base}/${id}/members/${userId}`, { method: 'DELETE' });
  return jsonOrThrow(res);
}

// ── Chat ──
export async function fetchChatHistory(id: string, before?: string, limit = 30): Promise<GuildMessage[]> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', String(limit));
  const res = await authenticatedFetch(`${base}/${id}/chat?${params.toString()}`);
  const data = await jsonOrThrow(res);
  return data.messages || [];
}

export async function sendChatMessage(id: string, body: string, type: 'user' | 'workout' = 'user', meta?: Record<string, any>): Promise<{ message: GuildMessage }> {
  const res = await authenticatedFetch(`${base}/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body, type, meta }),
  });
  return jsonOrThrow(res);
}

// ── Missions ──
export async function fetchMission(id: string): Promise<GuildMission | null> {
  const res = await authenticatedFetch(`${base}/${id}/mission`);
  const data = await jsonOrThrow(res);
  return data.mission || null;
}

// ── War ──
export async function fetchWar(id: string): Promise<WarState> {
  const res = await authenticatedFetch(`${base}/${id}/war`);
  const data = await jsonOrThrow(res);
  return {
    war: data.war || null,
    registered: !!data.registered,
    canRegister: !!data.canRegister,
    registrationWeek: data.registrationWeek ?? null,
    nextWarStart: data.nextWarStart || '',
  };
}

export async function registerForWar(id: string): Promise<{ status: string; registrationWeek: string; nextWarStart: string }> {
  const res = await authenticatedFetch(`${base}/${id}/war/register`, { method: 'POST' });
  return jsonOrThrow(res);
}

export async function unregisterForWar(id: string): Promise<{ status: string; registrationWeek: null; nextWarStart: string }> {
  const res = await authenticatedFetch(`${base}/${id}/war/unregister`, { method: 'POST' });
  return jsonOrThrow(res);
}

// ── Vault ──
export async function fetchVault(id: string): Promise<{ balance: number; canPurchase: boolean; transactions: VaultTransaction[] }> {
  const res = await authenticatedFetch(`${base}/${id}/vault`);
  return jsonOrThrow(res);
}

export async function donateToVault(id: string, amount: number): Promise<{ newBalance: number; playerGold: number }> {
  const res = await authenticatedFetch(`${base}/${id}/vault/donate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  return jsonOrThrow(res);
}

export async function purchaseVaultItem(id: string, itemKey: string): Promise<{ newBalance: number }> {
  const res = await authenticatedFetch(`${base}/${id}/vault/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ itemKey }),
  });
  return jsonOrThrow(res);
}

// ── Contribution hook (called on workout/quest completion) ──
export async function recordGuildContribution(amount = 1, source = 'workout'): Promise<void> {
  try {
    await authenticatedFetch(`${base}/contribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, source }),
    });
  } catch {
    /* non-critical — ignore */
  }
}
