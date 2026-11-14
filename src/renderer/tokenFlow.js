// The live token view's numbers (EPIC-02 US-0207): the intent's token counts, a short history of ledger readings
// with the rate between them, and meter levels. Pure, so it is tested without the view (FR1.3, NFR5).

/** Ledger readings kept for the waveform. */
export const HISTORY_MAX = 120;
/** Segments per meter. */
export const SEGMENTS = 10;

/**
 * The intent's tokens, as the ledger records them on its `workflows["intent:<uuid>"]` node. They reach the renderer
 * already summarised by `summarizeLedger` (src/main/parsers/ledger.js, `costOf`): cacheWrite is
 * cacheCreate5m + cacheCreate1h.
 * @param {{available?: boolean, perIntent?: object}|null} cost what `project:cost` returns
 * @returns {{input: number, output: number, cacheWrite: number, cacheRead: number}|null} null without an entry
 */
export function tokensOf(cost, dirName) {
  const tokens = cost?.available ? cost.perIntent?.[dirName]?.total?.tokens : null;
  return tokens ? { input: tokens.input, output: tokens.output, cacheWrite: tokens.cacheWrite, cacheRead: tokens.cacheRead } : null;
}

const totalOf = (t) => t.input + t.output + t.cacheWrite + t.cacheRead;

/**
 * Adds a ledger reading. The rate is tokens per minute since the reading before. An unchanged total adds nothing;
 * a lower one (a reset or a new session) starts a new history.
 * @param {{at: number, total: number, tokens: object, rate: number}[]} history oldest first
 * @returns the new history (the same array when nothing changed)
 */
export function pushSample(history, tokens, now) {
  if (!tokens) return history;
  const total = totalOf(tokens);
  const prev = history.at(-1);
  if (prev && total === prev.total) return history;
  if (!prev || total < prev.total) return [{ at: now, total, tokens, rate: 0 }];
  const minutes = Math.max(now - prev.at, 1) / 60_000;
  return [...history, { at: now, total, tokens, rate: (total - prev.total) / minutes }].slice(-HISTORY_MAX);
}

/** The smallest of 1, 2, 5 × 10^k at or above `n` (the meters' scale). */
export function niceCeil(n) {
  if (!(n > 0)) return 0;
  const p = 10 ** Math.floor(Math.log10(n));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= n);
}

/**
 * Lit segments (0–SEGMENTS) for `value` on a scale that rounds `max` up to a readable step.
 * @returns {{level: number, scale: number}}
 */
export function meterLevel(value, max) {
  const scale = niceCeil(max);
  if (!scale || !(value > 0)) return { level: 0, scale };
  return { level: Math.min(SEGMENTS, Math.ceil((value / scale) * SEGMENTS)), scale };
}
