// US-0506 u2 SCD9, BR5.12: the one pager order, shared by the store's list and the app's cross-project sort.
// Questions and permission prompts come before replies, then arrival, then tab, then the channel's own sequence
// number, never a file name (SCD7).

// US-0213: the handoff page comes last, after what the agent asks and says.
const rank = (e) => (e.kind === 'handoff' ? 2 : e.kind === 'reply' ? 1 : 0);

// US-0031 FR2, FR4: a hook page that is over (answered, handed back, stale or ended). It no longer holds the dialog
// open and gives way to a new page. Audit pages leave the list when answered, so they are never settled.
const SETTLED = new Set(['sent', 'handedBack', 'stale', 'ended']);
export const isSettled = (e) => e?.source === 'hook' && SETTLED.has(e.state);

/** Comparator: [rank, arrivedAtMs, tabId, seq]. */
export const byPager = (a, b) =>
  rank(a) - rank(b) || a.arrivedAtMs - b.arrivedAtMs || String(a.tabId ?? '').localeCompare(String(b.tabId ?? '')) || a.seq - b.seq;
