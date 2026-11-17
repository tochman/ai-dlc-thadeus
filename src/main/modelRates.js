// US-0211 FR1.1–FR1.6, NFR1, NFR2: the rate table the app prices recorded tokens with, per model, in this order:
// the project's override file, the app's own table, AI-DLC's shipped `.claude/tools/data/model-rates.json`.
// Read only. Cached per project and read again only when one of the files' mtimes changes, never per row.
import { promises as fs } from 'node:fs';
import path from 'node:path';
import appTable from './data/model-rates.json';

export const AIDLC_RATES_PATH = '.claude/tools/data/model-rates.json';
const SETTINGS_FILES = ['.claude/settings.local.json', '.claude/settings.json'];
const FIELDS = ['input', 'output', 'cacheWrite5m', 'cacheWrite1h', 'cacheRead'];
// ponytail: unbounded per-process cache keyed by root and rates path; fine for a handful of projects.
const cache = new Map();

// The matcher and the path check live in reprice.js (no Node imports), so the renderer can use them too.
export { isValidRatesPath, normalizeModel } from './reprice.js';

const absolute = (root, p) => (path.isAbsolute(p) ? p : path.join(root, p));
const mtime = (file) =>
  fs.stat(file).then(
    (s) => s.mtimeMs,
    () => 0
  );

/** The file as parsed JSON, `{missing}` when it is not there, `{invalid}` when it cannot be read or parsed. */
async function readJson(file) {
  let text;
  try {
    text = await fs.readFile(file, 'utf8');
  } catch (err) {
    return err.code === 'ENOENT' ? { missing: true } : { invalid: true, error: err.message };
  }
  try {
    return { value: JSON.parse(text) };
  } catch (err) {
    return { invalid: true, error: err.message };
  }
}

/** The valid rows of a rates file (`{rates: {model: {input, output, cacheWrite5m, cacheWrite1h, cacheRead}}}`), or null. */
function ratesOf(json) {
  const rates = json?.rates;
  if (!rates || typeof rates !== 'object' || Array.isArray(rates)) return null;
  return Object.fromEntries(Object.entries(rates).filter(([, r]) => FIELDS.every((f) => Number.isFinite(r?.[f]))));
}

/** FR1.2: the project setting, else `env.AIDLC_MODEL_RATES` in settings.local.json, else in settings.json. */
async function overridePathOf(root, ratesPath) {
  if (ratesPath) return ratesPath;
  for (const rel of SETTINGS_FILES) {
    const p = (await readJson(path.join(root, rel))).value?.env?.AIDLC_MODEL_RATES;
    if (typeof p === 'string' && p.trim()) return p.trim();
  }
  return null;
}

/** FR1.6: the override's rows, or {} with a note saying why it was skipped. */
async function overrideRows(root, overridePath, notes) {
  if (!overridePath) return {};
  const res = await readJson(absolute(root, overridePath));
  const rows = res.value ? ratesOf(res.value) : null;
  if (rows) return rows;
  notes.push({ kind: res.missing ? 'overrideMissing' : 'overrideInvalid', path: overridePath });
  console.warn(`Pristabellen ${overridePath} hoppades över:`, res.error ?? (res.missing ? 'filen saknas' : 'ingen rates-tabell'));
  return {};
}

/** AI-DLC's shipped table, read only; {} when it is missing or broken. */
async function shippedRows(root) {
  const res = await readJson(absolute(root, AIDLC_RATES_PATH));
  return ratesOf(res.value) ?? {};
}

async function build(root, ratesPath) {
  const overridePath = await overridePathOf(root, ratesPath);
  const notes = [];
  const project = await overrideRows(root, overridePath, notes);
  const rates = {};
  const layers = [
    ['aidlc', await shippedRows(root)],
    ['app', ratesOf(appTable)],
    ['project', project]
  ];
  for (const [source, table] of layers) for (const [model, r] of Object.entries(table)) rates[model] = { ...r, source };
  const sources = Object.fromEntries(Object.entries(rates).map(([m, r]) => [m, r.source]));
  return { rates, sources, notes, overridePath, asOf: appTable.asOf };
}

/** The mtimes of every file the table came from, as one string; a missing file counts as 0. */
async function stampOf(root, overridePath) {
  const files = [...SETTINGS_FILES, AIDLC_RATES_PATH].map((rel) => absolute(root, rel));
  if (overridePath) files.push(absolute(root, overridePath));
  return (await Promise.all(files.map(mtime))).join(',');
}

/**
 * US-0211 FR1.1–FR1.6, NFR2: the rate table for one project, cached until one of its files changes.
 * @param {string} root project root
 * @param {{ratesPath?: string}} [settings] the app's project settings
 * @returns {Promise<{rates: Record<string, object>, sources: Record<string, 'project'|'app'|'aidlc'>,
 *   notes: {kind: 'overrideMissing'|'overrideInvalid', path: string}[], overridePath: string|null, asOf: string}>}
 */
export async function loadRates(root, { ratesPath = '' } = {}) {
  const key = `${root}\n${ratesPath}`;
  const cached = cache.get(key);
  if (cached && cached.stamp === (await stampOf(root, cached.table.overridePath))) return cached.table;
  const table = await build(root, ratesPath);
  cache.set(key, { table, stamp: await stampOf(root, table.overridePath) });
  return table;
}
