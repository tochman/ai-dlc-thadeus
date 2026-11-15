// US-0506 u2 SCD9, BR5.12: the one pager order, shared by the store's list and the app's cross-project sort.
// Questions and permission prompts come before replies, then arrival, then tab, then the channel's own sequence
// number, never a file name (SCD7).

const rank = (e) => (e.kind === 'reply' ? 1 : 0);

/** Comparator: [rank, arrivedAtMs, tabId, seq]. */
export const byPager = (a, b) =>
  rank(a) - rank(b) || a.arrivedAtMs - b.arrivedAtMs || String(a.tabId ?? '').localeCompare(String(b.tabId ?? '')) || a.seq - b.seq;
