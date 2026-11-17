// US-0211 FR2.1–FR2.3: USD computed from the stored token counts with the current rate table (modelRates.js).
// The recorded USD is never changed; these figures sit beside it. Pure functions with no Node imports: the
// renderer imports ledger.js, which uses them.

const num = (v) => (Number.isFinite(v) ? v : 0);

/** US-0211 FR1.2: a rates path set in the app's project settings: relative, no `..`, ending in .json; '' clears it. */
export function isValidRatesPath(p) {
  if (p === '') return true;
  if (typeof p !== 'string' || p.trim() !== p || !p.toLowerCase().endsWith('.json')) return false;
  if (p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split(/[\\/]/).some((seg) => seg === '..' || seg === '');
}

/**
 * US-0211 FR2.3: a model id as a rate key, the way AI-DLC's normalizeModel matches: provider prefix, `claude-`,
 * `[1m]`, `-vN[:M]` and `-YYYYMMDD` are dropped, then the key must exist exactly. The bare ledger key also matches.
 * No family fallback, so a price is never borrowed from another model.
 */
export function normalizeModel(modelId, rates) {
  const key = modelKey(modelId);
  return key && Object.hasOwn(rates ?? {}, key) ? key : null;
}

/** The rate-table key a model id would have, whether or not a table holds it; null for a malformed provider shape. */
export function modelKey(modelId) {
  if (!modelId || typeof modelId !== 'string') return null;
  let s = modelId.trim().toLowerCase();
  const converse = s.startsWith('converse/');
  if (converse) s = s.slice('converse/'.length);
  const provider = s.match(/^(?:[a-z0-9-]+\.)?anthropic\./);
  if (provider) s = s.slice(provider[0].length);
  else if (converse) return null;
  if (provider && !s.startsWith('claude-')) return null;
  return s
    .replace(/^claude-/, '')
    .replace(/\[[^\]]*\]$/, '')
    .replace(/-v\d+(?::\d+)?$/, '')
    .replace(/-\d{8}$/, '');
}

/**
 * US-0211 FR2.1, FR2.2: USD for one model's tokens (`input`, `output`, `cacheCreate5m`, `cacheCreate1h`, `cacheRead`).
 * Audit rows carry all their cache writes as 5m already (auditCost.js). Null when the model has no rate (FR2.3).
 */
export function priceTokens(model, tokens, rates) {
  const key = normalizeModel(model, rates);
  if (!key) return null;
  const r = rates[key];
  const t = tokens ?? {};
  return (
    (num(t.input) * r.input + num(t.output) * r.output + num(t.cacheCreate5m) * r.cacheWrite5m + num(t.cacheCreate1h) * r.cacheWrite1h + num(t.cacheRead) * r.cacheRead) /
    1e6
  );
}

const hasTokens = (t) => ['input', 'output', 'cacheCreate5m', 'cacheCreate1h', 'cacheRead'].some((k) => num(t?.[k]) > 0);

/**
 * US-0211 AC1.5.1: a `byModel` map's current-price total. `missing` counts the models with tokens but no rate;
 * `usd` is null when no model in it has a rate.
 * @returns {{usd: number|null, missing: number}}
 */
export function repriceMap(byModel, rates) {
  let usd = null;
  let missing = 0;
  for (const [model, node] of Object.entries(byModel ?? {})) {
    if (!hasTokens(node?.tokens)) continue;
    const price = priceTokens(model, node.tokens, rates);
    if (price === null) missing += 1;
    else usd = (usd ?? 0) + price;
  }
  return { usd, missing };
}

/** The current figure of one model row: its USD, the rate's source and the matched key (all null without a rate). */
export function repriceModel(model, node, rates) {
  const priced = normalizeModel(model, rates);
  return { currentUsd: priced ? priceTokens(model, node?.tokens, rates) : null, source: priced ? (rates[priced].source ?? null) : null, key: modelKey(model) };
}
