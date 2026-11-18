// The token detail view's chart numbers (EPIC-02 US-0208 FR3): elapsed time labels, the five kinds stacked over the
// stored readings, the rate between readings, and the by-stage/agent/model splits. Pure, so tested without visx.

/** Bottom to top in the over-time stack (FR3.1); the legend lists them top first. */
export const STACK_KINDS = ['cacheRead', 'cacheWrite5m', 'cacheWrite1h', 'output', 'input'];
/** The ledger's per-stage/agent/model rows merge the two cache writes (costOf). */
export const SPLIT_KINDS = ['input', 'output', 'cacheWrite', 'cacheRead'];
export const SPLIT_MAX = 12;

const totalOf = (r, kinds = STACK_KINDS) => kinds.reduce((sum, k) => sum + (r[k] ?? 0), 0);

/**
 * US-0214 FR5.1, FR5.2: the shown kinds after toggling `kind`, in the order of `all`; the last shown one stays.
 * @param {string[]} shown @param {string[]} all @param {string} kind
 */
export function toggleKind(shown, all, kind) {
  if (shown.includes(kind)) return shown.length > 1 ? shown.filter((k) => k !== kind) : shown;
  return all.filter((k) => k === kind || shown.includes(k));
}

/** US-0208 FR3.1: elapsed milliseconds as h:mm; hours keep counting past 24. */
export function elapsedLabel(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60_000));
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

/**
 * US-0208 FR3.1: the readings as stacked layers over elapsed time, `t` from the first reading.
 * US-0214 FR5.2: only the `shown` kinds are stacked, so the top layer (the y-domain) is their sum.
 * @returns {{kind: string, points: {t: number, y0: number, y1: number}[]}[]} bottom layer first
 */
export function stackSeries(readings, shown = STACK_KINDS) {
  const start = readings[0]?.at ?? 0;
  const base = readings.map(() => 0);
  return STACK_KINDS.filter((k) => shown.includes(k)).map((kind) => ({
    kind,
    points: readings.map((r, i) => {
      const y0 = base[i];
      base[i] += r[kind] ?? 0;
      return { t: r.at - start, y0, y1: base[i] };
    })
  }));
}

/** US-0208 FR3.2: tokens per minute between consecutive readings; a lower total (a reset) counts as 0. US-0214 FR5.1: of the shown kinds. */
export function rateSeries(readings, shown = STACK_KINDS) {
  const start = readings[0]?.at ?? 0;
  return readings.slice(1).map((r, i) => {
    const prev = readings[i];
    const minutes = Math.max(r.at - prev.at, 1) / 60_000;
    return { t: r.at - start, rate: Math.max(0, totalOf(r, shown) - totalOf(prev, shown)) / minutes };
  });
}

/**
 * US-0215 FR4: the run's figures. Kinds and the cache-read share (FR4.5: cache reads of input + cache reads + cache
 * writes) from the ledger entry; working time from the first to the last reading; peak rate the top of `rateSeries` of
 * the `shown` kinds (FR4.4). FR4.6: a figure that cannot be known is null, never 0.
 * @param {{intentCost: object|null, readings: object[], wallMs: number|null, shown?: string[]}} args
 */
export function runFigures({ intentCost, readings, wallMs, shown = STACK_KINDS }) {
  const tk = intentCost?.total?.tokens ?? null;
  const cacheBase = tk ? tk.input + tk.cacheRead + tk.cacheWrite : 0;
  const rates = rateSeries(readings, shown).map((r) => r.rate);
  return {
    input: tk?.input ?? null,
    output: tk?.output ?? null,
    cacheWrite: tk?.cacheWrite ?? null,
    cacheRead: tk?.cacheRead ?? null,
    cacheShare: cacheBase > 0 ? tk.cacheRead / cacheBase : null,
    workingMs: readings.length ? readings.at(-1).at - readings[0].at : null,
    wallMs: Number.isFinite(wallMs) ? wallMs : null,
    peakRate: rates.length ? Math.max(...rates) : null
  };
}

function sumRows(rows) {
  const tokens = Object.fromEntries(SPLIT_KINDS.map((k) => [k, rows.reduce((s, r) => s + r.tokens[k], 0)]));
  return {
    name: 'other',
    other: true,
    usd: rows.reduce((s, r) => s + r.usd, 0),
    missingPrice: rows.some((r) => r.missingPrice),
    totalTokens: rows.reduce((s, r) => s + r.totalTokens, 0),
    tokens
  };
}

/**
 * US-0208 FR3.3: ledger rows ready for a split card, in tokens by kind or in dollars. Largest first unless
 * `keepOrder` (stages in pipeline order); past SPLIT_MAX rows the rest are summed as one `other` row.
 * @param {{name: string, usd: number, totalTokens: number, tokens: object, missingPrice?: boolean}[]} rows
 * US-0214 FR5.1: in tokens, only the `kinds` shown in the card's legend count and draw; dollars are one part.
 * @param {'tokens'|'usd'} measure
 */
export function splitRows(rows, measure, { keepOrder = false, kinds = SPLIT_KINDS } = {}) {
  const all = kinds.length === SPLIT_KINDS.length;
  const valueOf = (r) => (measure === 'usd' ? r.usd : all ? r.totalTokens : kinds.reduce((s, k) => s + (r.tokens[k] ?? 0), 0));
  const sorted = keepOrder ? rows : [...rows].sort((a, b) => valueOf(b) - valueOf(a));
  const shown = sorted.length > SPLIT_MAX + 1 ? [...sorted.slice(0, SPLIT_MAX), sumRows(sorted.slice(SPLIT_MAX))] : sorted;
  return shown.map((r) => ({
    ...r,
    other: r.other === true,
    value: valueOf(r),
    parts: measure === 'usd' ? [{ kind: 'usd', value: r.usd }] : SPLIT_KINDS.filter((k) => kinds.includes(k)).map((kind) => ({ kind, value: r.tokens[kind] }))
  }));
}
