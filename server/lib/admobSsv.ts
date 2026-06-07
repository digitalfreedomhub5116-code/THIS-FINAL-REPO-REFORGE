/**
 * AdMob Server-Side Verification (SSV) — public key fetching + signature verification.
 *
 * Flow when a user completes a rewarded ad:
 *   1. Google's ad servers send a GET to your callback URL with query params:
 *        ad_network, ad_unit, custom_data, key_id, reward_amount, reward_item,
 *        signature, timestamp, transaction_id, user_id
 *   2. Your server fetches Google's ECDSA public key set (cached for up to 24h)
 *   3. The public key matching `key_id` is used to verify `signature` against
 *      the canonical message — all query params *except* signature and key_id,
 *      kept in the original order Google sent them.
 *   4. If the signature is valid and the transaction_id has not been seen
 *      before, the reward is granted server-side (no possibility of client
 *      tampering).
 *
 * Reference: https://developers.google.com/admob/android/ssv
 */
import crypto from 'crypto';

interface AdMobPublicKey {
  keyId: number;
  pem: string;
  base64: string;
}

interface AdMobKeySet {
  keys: AdMobPublicKey[];
}

const KEYS_URL = 'https://www.gstatic.com/admob/reward/verifier-keys.json';

// Google rotates these keys; cache for at most 24 hours per the AdMob docs.
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12h to be safe
let cachedKeys: AdMobKeySet | null = null;
let cachedAt = 0;

async function fetchPublicKeys(): Promise<AdMobKeySet> {
  const res = await fetch(KEYS_URL, { method: 'GET' });
  if (!res.ok) throw new Error(`Failed to fetch AdMob verifier keys: HTTP ${res.status}`);
  const data = (await res.json()) as AdMobKeySet;
  if (!data || !Array.isArray(data.keys) || data.keys.length === 0) {
    throw new Error('AdMob verifier-keys.json returned no keys');
  }
  return data;
}

async function getPublicKeys(forceRefresh = false): Promise<AdMobKeySet> {
  const fresh = !forceRefresh && cachedKeys && Date.now() - cachedAt < CACHE_TTL_MS;
  if (fresh) return cachedKeys!;
  const keys = await fetchPublicKeys();
  cachedKeys = keys;
  cachedAt = Date.now();
  return keys;
}

function findKey(keys: AdMobKeySet, keyId: string): AdMobPublicKey | null {
  const idNum = Number(keyId);
  if (!Number.isFinite(idNum)) return null;
  return keys.keys.find(k => k.keyId === idNum) || null;
}

/**
 * Reconstruct the canonical message that Google signed.
 *
 * Per AdMob docs: take the *full query string* of the callback URL, then strip
 * the trailing `&signature=...&key_id=...` segment. Keep all other params and
 * their original ordering.
 */
function canonicalMessage(rawQuery: string): string {
  // rawQuery is e.g. "ad_network=...&ad_unit=...&...&signature=AAA&key_id=123"
  const sigIdx = rawQuery.indexOf('&signature=');
  if (sigIdx < 0) return rawQuery; // malformed — verifier will reject
  return rawQuery.substring(0, sigIdx);
}

/**
 * Decode AdMob's URL-safe base64 signature into raw DER bytes.
 *
 * Google sends the ECDSA signature in URL-safe base64 (with - and _ instead of
 * + and /, and no padding). Node's `crypto.verify` accepts standard DER.
 */
function decodeUrlSafeBase64(s: string): Buffer {
  const std = s.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to a multiple of 4 if needed
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
  return Buffer.from(padded, 'base64');
}

export interface SsvVerifyResult {
  valid: boolean;
  reason?: string;
}

/**
 * Verify the SSV callback. Returns { valid: true } if the signature checks out.
 *
 * @param rawQuery The exact query string from the request (without leading '?')
 * @param keyId    Value of the `key_id` query param
 * @param signature Value of the `signature` query param (URL-safe base64)
 */
export async function verifySsvSignature(
  rawQuery: string,
  keyId: string,
  signature: string,
): Promise<SsvVerifyResult> {
  if (!rawQuery || !keyId || !signature) {
    return { valid: false, reason: 'missing-params' };
  }

  // 1. Get the public key. If not found, refresh once (Google may have rotated).
  let keys = await getPublicKeys();
  let pub = findKey(keys, keyId);
  if (!pub) {
    keys = await getPublicKeys(true);
    pub = findKey(keys, keyId);
  }
  if (!pub) return { valid: false, reason: `unknown-key-id:${keyId}` };

  // 2. Build the canonical message and decode the signature.
  const message = canonicalMessage(rawQuery);
  let sigBytes: Buffer;
  try { sigBytes = decodeUrlSafeBase64(signature); }
  catch { return { valid: false, reason: 'bad-signature-base64' }; }

  // 3. Load the ECDSA public key from the PEM Google publishes.
  let keyObj: crypto.KeyObject;
  try { keyObj = crypto.createPublicKey(pub.pem); }
  catch (e: any) { return { valid: false, reason: `bad-public-key:${e?.message || ''}` }; }

  // 4. Verify. AdMob signs with SHA-256 / ECDSA / DER-encoded signature.
  let valid = false;
  try {
    valid = crypto.verify(
      'sha256',
      Buffer.from(message, 'utf8'),
      { key: keyObj, dsaEncoding: 'der' },
      sigBytes,
    );
  } catch (e: any) {
    return { valid: false, reason: `verify-error:${e?.message || ''}` };
  }

  return valid ? { valid: true } : { valid: false, reason: 'signature-mismatch' };
}
