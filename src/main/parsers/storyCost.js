// US-1303 FR2–FR4, FR6.3, NFR2, NFR4: intent cost rolled up to the stories it delivered, and on to epics and releases.
// Pure functions without Node imports: the renderer rolls up from the cost it already holds for the cost panel
// (summarizeLedger's perIntent, archived intents included, with addRework's `rework`) and the feature docs it has.
const KINDS = ['input', 'output', 'cacheWrite', 'cacheRead'];
const SPLITS = ['byStage', 'byAgent', 'byModel'];
const num = (v) => (Number.isFinite(v) ? v : 0);

const empty = () => ({
  usd: 0,
  tokens: Object.fromEntries(KINDS.map((k) => [k, 0])),
  totalTokens: 0,
  rework: { usd: 0, tokens: 0 },
  incomplete: false,
  splits: { byStage: new Map(), byAgent: new Map(), byModel: new Map() },
  intents: new Map()
});

function addRow(map, name, usd, totalTokens, reworkUsd) {
  const r = map.get(name) ?? { name, usd: 0, totalTokens: 0, reworkUsd: 0 };
  map.set(name, { name, usd: r.usd + usd, totalTokens: r.totalTokens + totalTokens, reworkUsd: r.reworkUsd + reworkUsd });
}

/** Adds `part` (1/N of the intent, or a whole sub-figure for an epic or release) of one intent's cost to `acc`. */
function addIntent(acc, dirName, cost, part, sharedWith) {
  const rework = cost?.rework;
  if (!acc.intents.has(dirName)) acc.intents.set(dirName, { dirName, sharedWith, noCost: !cost, reworkUnknown: !rework || !!rework.unknown });
  if (!cost) return;
  acc.usd += num(cost.total?.usd) * part;
  acc.totalTokens += num(cost.total?.totalTokens) * part;
  for (const k of KINDS) acc.tokens[k] += num(cost.total?.tokens?.[k]) * part;
  acc.rework.usd += num(rework?.total?.usd) * part;
  acc.rework.tokens += num(rework?.total?.tokens) * part;
  acc.incomplete ||= cost.complete === false;
  for (const split of SPLITS) {
    for (const r of cost[split] ?? []) {
      const reworkUsd = split === 'byStage' ? num(rework?.byStage?.[r.name]?.usd) * part : 0;
      addRow(acc.splits[split], r.name, num(r.usd) * part, num(r.totalTokens) * part, reworkUsd);
    }
  }
}

/** Adds a whole story figure (still open, as `empty` builds it) into an epic or release figure. */
function addFigure(acc, fig) {
  acc.usd += fig.usd;
  acc.totalTokens += fig.totalTokens;
  for (const k of KINDS) acc.tokens[k] += fig.tokens[k];
  acc.rework.usd += fig.rework.usd;
  acc.rework.tokens += fig.rework.tokens;
  acc.incomplete ||= fig.incomplete;
  for (const split of SPLITS) for (const r of fig.splits[split].values()) addRow(acc.splits[split], r.name, r.usd, r.totalTokens, r.reworkUsd);
  for (const [dir, i] of fig.intents) if (!acc.intents.has(dir)) acc.intents.set(dir, i);
}

const share = (part, whole) => (whole.usd > 0 ? part.usd / whole.usd : whole.totalTokens > 0 ? part.tokens / whole.totalTokens : 0);
const byCost = (map) => [...map.values()].sort((a, b) => b.usd - a.usd || b.totalTokens - a.totalTokens);

/** The figure as the view shows it: split rows most expensive first, the intents by name, rework with its share. */
function close(acc) {
  const intents = [...acc.intents.values()].sort((a, b) => a.dirName.localeCompare(b.dirName));
  const out = {
    usd: acc.usd,
    tokens: acc.tokens,
    totalTokens: acc.totalTokens,
    rework: { ...acc.rework, share: Math.min(1, share(acc.rework, acc)) },
    incomplete: acc.incomplete,
    shared: intents.some((i) => i.sharedWith > 1),
    intents
  };
  for (const split of SPLITS) out[split] = byCost(acc.splits[split]); // only stage rows carry rework; the others keep 0
  return out;
}

/**
 * US-1303 FR2: a story's figure is the sum over its intents of each intent's cost divided by the number of stories the
 * intent links to; an intent with no ledger entry adds nothing and is named `noCost`. FR3: an epic is the sum of its
 * stories, a release the sum of the stories `buildReleases` puts in it. FR4: rework divided the same way, with its share.
 * NFR2: `incomplete` when a model in it has no price. FR5: `notLinked`, the intents that link to no story.
 * @param {{delivered?: Record<string, string[]>, perIntent?: Record<string, object|null>, epics?: object[], releases?: object[]}} input
 * @returns {{stories: Record<string, object>, epics: Record<string, object>, releases: Record<string, object>, notLinked: string[]}}
 */
export function rollUp({ delivered = {}, perIntent = {}, epics = [], releases = [] }) {
  const open = new Map();
  for (const [dir, ids] of Object.entries(delivered)) {
    for (const id of ids) {
      if (!open.has(id)) open.set(id, empty());
      addIntent(open.get(id), dir, perIntent[dir] ?? null, 1 / ids.length, ids.length);
    }
  }
  const group = (storyIds) => {
    const found = storyIds.filter((id) => open.has(id));
    if (!found.length) return null;
    const acc = empty();
    for (const id of found) addFigure(acc, open.get(id));
    return close(acc);
  };
  const named = (list, key, idsOf) => Object.fromEntries(list.map((x) => [x[key], group(idsOf(x))]).filter(([, fig]) => fig));
  return {
    stories: Object.fromEntries([...open].map(([id, acc]) => [id, close(acc)])),
    epics: named(epics, 'id', (e) => (e.parsed?.stories ?? []).map((s) => s.id)),
    releases: named(releases, 'version', (r) => r.stories.map(({ story }) => story.id)),
    notLinked: Object.entries(delivered)
      .filter(([, ids]) => ids.length === 0)
      .map(([dir]) => dir)
      .sort()
  };
}
