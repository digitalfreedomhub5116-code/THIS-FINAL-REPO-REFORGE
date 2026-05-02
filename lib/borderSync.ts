/**
 * syncBorderToPlayers — Instant border sync via direct Supabase PATCH.
 *
 * This mirrors the Lynx AI approach: when a border is equipped/unequipped
 * in the Store, we immediately PATCH the `equipped_border` column on the
 * `players` table. This guarantees the change is persisted even if the
 * user closes the app before the debounced player sync fires.
 *
 * The leaderboard server route reads this column to render borders.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || ((typeof window !== 'undefined' && (window as any).__REFORGE_CONFIG__?.supabaseUrl) || '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || ((typeof window !== 'undefined' && (window as any).__REFORGE_CONFIG__?.supabaseAnonKey) || '');

/**
 * Instantly sync the equipped border to the `players` table.
 * Uses direct REST PATCH — no debounce, no waiting.
 *
 * @param borderId  The store item ID (e.g. 'border-ice-img') or null to unequip
 */
export async function syncBorderToPlayers(borderId: string | null): Promise<void> {
  try {
    // Get the player's supabase_id from localStorage (same as player.userId)
    const playerKey = Object.keys(localStorage).find(k => k.startsWith('reforge_player_v2_'));
    if (!playerKey) { console.debug('[BorderSync] No player in localStorage'); return; }

    const playerData = JSON.parse(localStorage.getItem(playerKey) || '{}');
    const supabaseId = playerData.userId;
    if (!supabaseId || supabaseId.startsWith('local')) {
      console.debug('[BorderSync] No synced userId');
      return;
    }

    // Get auth token — try the Supabase storage key first (works in Capacitor)
    const ref = SUPABASE_URL.split('//')[1]?.split('.')[0] || '';
    const storageKey = `sb-${ref}-auth-token`;
    const raw = localStorage.getItem(storageKey);
    let token = '';

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        token = parsed?.access_token || '';
      } catch { /* malformed */ }
    }

    // Fallback: check Supabase JS client session storage
    if (!token) {
      const sessionKey = Object.keys(localStorage).find(k =>
        k.includes('supabase') && k.includes('auth')
      );
      if (sessionKey) {
        try {
          const parsed = JSON.parse(localStorage.getItem(sessionKey) || '{}');
          token = parsed?.access_token || '';
        } catch { /* malformed */ }
      }
    }

    if (!token) {
      console.warn('[BorderSync] No auth token found — will rely on debounced sync');
      return;
    }

    // Direct PATCH — only updates the equipped_border column
    const patchUrl = `${SUPABASE_URL}/rest/v1/players?supabase_id=eq.${supabaseId}`;

    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        equipped_border: borderId || null,
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[BorderSync] PATCH fail:', res.status, errText);
      return;
    }

    console.log('[BorderSync] ✅ Border synced instantly:', borderId || 'none');
  } catch (err) {
    console.error('[BorderSync] Error:', err);
  }
}
