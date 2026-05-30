/**
 * scripts/test-search.mjs
 *
 * Smoke-test for Vertex AI Search (AI Applications custom search).
 *
 * What it does:
 *  - Authenticates with the same service account JSON we already use for Vertex
 *    AI (env: GOOGLE_APPLICATION_CREDENTIALS_JSON).
 *  - Hits discoveryengine.googleapis.com :search against the live engine.
 *  - Prints the top-N results for a few hand-picked queries.
 *
 * What it proves:
 *  - The data store + app are wired correctly and respond to queries.
 *  - The auth path works without any extra Discovery Engine client library.
 *  - Each query is a billable event under the GenAI App Builder SKU, which is
 *    what the trial credit covers — so we can come back in ~24h and confirm
 *    the credit balance dropped (CSV download will show fractional decrement).
 *
 * Usage (from repo root):
 *   node scripts/test-search.mjs
 *
 * Optional env override:
 *   SEARCH_QUERY="some query"  → overrides the default query list.
 */
import 'dotenv/config';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

// ── Config (matches the data store + app you created in Cloud Console) ──
const PROJECT_ID = 'gen-lang-client-0615819029';
const PROJECT_NUMBER = '20910572316';
const LOCATION = 'global';
const ENGINE_ID = 'reforge-search-app_1780164568719';

// Build the engine search URL.
// Endpoint reference: https://cloud.google.com/generative-ai-app-builder/docs/preview-search-results
const SEARCH_URL =
  `https://discoveryengine.googleapis.com/v1/projects/${PROJECT_NUMBER}` +
  `/locations/${LOCATION}/collections/default_collection/engines/${ENGINE_ID}` +
  `/servingConfigs/default_search:search`;

// Default queries — mix of exact-match, semantic, and cross-domain.
const DEFAULT_QUERIES = [
  'push',                  // exact word in exercise title
  'high protein indian',   // semantic — should surface paneer
  'stress relief',         // semantic — should surface meditation
];

// ── Resolve credentials ──
// In production we set GOOGLE_APPLICATION_CREDENTIALS_JSON on Railway and the
// server writes it to a temp file on boot. Locally we do the same dance here
// so the user only needs the env var, not a checked-in JSON file.
function ensureCredentialsFile() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!json) {
    throw new Error(
      'Missing service-account credentials. Set GOOGLE_APPLICATION_CREDENTIALS_JSON in .env (the JSON contents of the service account key).',
    );
  }
  const tmpPath = path.join(os.tmpdir(), 'reforge-search-creds.json');
  fs.writeFileSync(tmpPath, json, { mode: 0o600 });
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  return tmpPath;
}

async function getAccessToken() {
  ensureCredentialsFile();
  const auth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });
  const client = await auth.getClient();
  const tokenInfo = await client.getAccessToken();
  if (!tokenInfo?.token) throw new Error('Failed to mint Google access token');
  return tokenInfo.token;
}

async function runQuery(token, query) {
  const body = {
    query,
    pageSize: 10,
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
  };

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`HTTP ${res.status} ${res.statusText}\n${errText}`);
  }
  return res.json();
}

function summariseResult(result) {
  // The shape we care about per result:
  //   result.id                     → document id
  //   result.document.structData    → the structured fields we ingested
  const id = result?.id || result?.document?.id || '(no id)';
  const data = result?.document?.structData || {};
  const name = data.name || '(no name)';
  const type = data.type || '?';
  return `  • [${type}] ${name}  (${id})`;
}

async function main() {
  const queries = process.env.SEARCH_QUERY ? [process.env.SEARCH_QUERY] : DEFAULT_QUERIES;

  console.log(`\n🔄 Authenticating as service account from ${PROJECT_ID}...`);
  const token = await getAccessToken();
  console.log(`✅ Got access token (length ${token.length})\n`);

  console.log(`🔎 Engine: ${ENGINE_ID}`);
  console.log(`📍 Location: ${LOCATION}\n`);

  for (const q of queries) {
    console.log(`──────────────────────────────────────────────────`);
    console.log(`Query: "${q}"`);
    try {
      const json = await runQuery(token, q);
      const results = json.results || [];
      const total = json.totalSize ?? results.length;
      console.log(`Total results: ${total}`);
      if (results.length === 0) {
        console.log('  (no matches — index may still be building)');
      } else {
        for (const r of results) console.log(summariseResult(r));
      }
    } catch (err) {
      console.error(`❌ Query failed:`, err?.message || err);
    }
  }

  console.log(`\n──────────────────────────────────────────────────`);
  console.log('Done. Each query above is one billable Search request against the GenAI App Builder SKU.');
  console.log('Wait ~24h, then download Credits CSV and confirm "Trial credit for GenAI App Builder" remaining value dropped.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
