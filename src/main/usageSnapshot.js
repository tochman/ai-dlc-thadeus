// US-0209 FR3: this machine's cost per intent, written by the app to .thadeus/usage/<host>-<clone-id>.json so it can
// be committed (by the person, never by the app, FR3.5) and counted on the other machines after `git pull` (FR3.4).
// The file holds only token counts, USD, stage/model/agent names and ids (FR3.3, NFR2). Written atomically inside the
// project root, like .thadeus/tokens/ (tokenReadings.js); AI-DLC's own folders are never written.
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { listDir, readJsonSafe, readText, resolveInRoot } from './projectAccess.js';
import { writeAtomic } from './fileWrite.js';
import { shardName } from './parsers/auditCost.js';
import { t } from '../shared/i18n.js';

export const USAGE_DIR = '.thadeus/usage';
export const CLONE_ID_PATH = 'aidlc/.aidlc-clone-id';
const INTENT_KEY = 'intent:';
const TOKEN_KEYS = ['input', 'output', 'cacheCreate5m', 'cacheCreate1h', 'cacheRead'];

const num = (v) => (Number.isFinite(v) ? v : 0);
const entries = (obj) => (obj && typeof obj === 'object' ? Object.entries(obj) : []);
/** A ledger node with only {usd, tokens}; everything else (sessions, cursors, paths) is left out (FR3.3). */
const pick = (n) => ({ usd: num(n?.usd), tokens: Object.fromEntries(TOKEN_KEYS.map((k) => [k, num(n?.tokens?.[k])])) });
const pickMap = (m) => Object.fromEntries(entries(m).map(([name, n]) => [name, pick(n)]));
const pickStage = (s) => ({ totals: pick(s?.totals), byModel: pickMap(s?.byModel), byAgent: pickMap(s?.byAgent) });

/**
 * US-0209 FR3.1–FR3.3: the snapshot of this machine's whole ledger, every `intent:<uuid>` workflow (the first write is
 * the backfill, FR3.2). Legacy records have no intent id and are left out.
 * @param {object|null} ledger parsed usage-ledger.json
 * @param {{host: string, cloneId: string}} clone
 */
export function snapshotOf(ledger, { host, cloneId }) {
  const intents = {};
  for (const [key, wf] of entries(ledger?.workflows)) {
    if (!key.startsWith(INTENT_KEY)) continue;
    intents[key.slice(INTENT_KEY.length)] = {
      totals: pick(wf?.totals),
      byStage: Object.fromEntries(entries(wf?.byStage).map(([slug, s]) => [slug, pickStage(s)])),
      byModel: pickMap(wf?.byModel),
      byAgent: pickMap(wf?.byAgent)
    };
  }
  return { schemaVersion: 1, host, cloneId, intents };
}

function fileOf({ host, cloneId }) {
  const name = `${host}-${cloneId}`;
  if (!/^[\w.-]+$/.test(name) || name.includes('..')) throw new Error(t('errors.invalidName', { what: 'snapshot', name }));
  return `${USAGE_DIR}/${name}.json`;
}

/**
 * US-0209 FR3.1: writes the snapshot only when its content changed, so an unchanged ledger leaves git clean.
 * Rejects on a failed write; the caller logs it and the next cost read tries again.
 * @returns {Promise<boolean>} true when the file was written
 */
export async function writeSnapshot(root, snapshot) {
  const rel = fileOf(snapshot);
  const text = `${JSON.stringify(snapshot, null, 2)}\n`;
  const old = await readText(root, rel).catch((err) => (err.code === 'ENOENT' ? null : Promise.reject(err)));
  if (old === text) return false;
  await fs.mkdir(path.join(root, USAGE_DIR), { recursive: true });
  const dir = await resolveInRoot(root, USAGE_DIR); // a symlinked .thadeus pointing outside the project is refused
  await writeAtomic(path.join(dir, path.basename(rel)), text);
  return true;
}

/**
 * US-0209 FR3.4, NFR3: every machine's snapshot in .thadeus/usage/; a malformed or half-written file is logged and
 * skipped, so that machine counts from its shard rows instead.
 * @returns {Promise<{host: string, cloneId: string, intents: object}[]>}
 */
export async function readSnapshots(root) {
  const out = [];
  for (const e of await listDir(root, USAGE_DIR)) {
    if (e.isDir || !e.name.endsWith('.json') || e.name.startsWith('.')) continue;
    const rel = `${USAGE_DIR}/${e.name}`;
    const res = await readJsonSafe(root, rel);
    const v = res.ok ? res.value : null;
    if (v && typeof v.cloneId === 'string' && typeof v.host === 'string' && v.intents && typeof v.intents === 'object') out.push(v);
    else console.warn(`Kunde inte läsa ${rel}:`, res.error ?? 'not a snapshot');
  }
  return out;
}

/**
 * US-0209 FR2.1: this machine's clone (aidlc/.aidlc-clone-id) and host. The host is taken from this machine's shard
 * name; with no shard yet it comes from os.hostname(). ponytail: AI-DLC's own host normalising is unknown, so the
 * fallback is only lower case, first label; a later shard name can differ, and then two files exist for one clone.
 * @param {string[]} shardSources audit shard file names seen in the space
 * @returns {Promise<{host: string, cloneId: string}|null>} null when the clone id file is missing
 */
export async function localClone(root, shardSources) {
  const text = await readText(root, CLONE_ID_PATH).catch((err) => {
    if (err.code !== 'ENOENT') console.warn(`Kunde inte läsa ${CLONE_ID_PATH}:`, err.message);
    return '';
  });
  const cloneId = text.trim();
  if (!cloneId) return null;
  const own = shardSources.map(shardName).find((s) => s.cloneId === cloneId);
  const host =
    own?.host ??
    os
      .hostname()
      .split('.')[0]
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
  return { host, cloneId };
}
