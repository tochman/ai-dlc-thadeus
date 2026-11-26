// US-1304 Delivery metrics: lead time, release frequency, change failure rate, time to recover and pull request figures,
// from storyMetrics' stories, the `vX.Y.Z` tags, the EPIC-00 fix stories, GitHub's release list and the merged pull
// requests. Pure functions without Node imports, like velocity.js (NFR2). A number the records cannot support is null,
// shown as "unknown", never 0.
import { RELEASED, byVersion, localDay } from './velocity.js';

const DAY_MS = 864e5;
const FAULT_IN = /^\s*[-*]\s+\*\*Fault in:\*\*\s*(v\d+\.\d+\.\d+)/m;

/** US-1304 FR3.1, FR3.3: the release a fix story's `- **Fault in:** vX.Y.Z` line names, or null. */
export function parseFaultIn(raw) {
  return FAULT_IN.exec(String(raw ?? ''))?.[1] ?? null;
}

/** US-1304 FR1.3: the middle value of the known values (the mean of the two middle ones), or null. */
export function median(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (v.length === 0) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/**
 * US-1304 FR3.1, FR3.3: the tagged releases that failed (a GitHub prerelease, or named in a fix story's Fault in line),
 * in version order, and how many fix stories have no Fault in line. `releases` null: GitHub's list is missing (FR3.4).
 * @returns {{failed: {release: string, prerelease: boolean, fixes: string[]}[], withoutFaultIn: number}}
 */
export function failedReleases({ tags, fixes, releases }) {
  const pre = new Set((releases ?? []).filter((r) => r.prerelease).map((r) => r.tag));
  const named = new Map();
  let withoutFaultIn = 0;
  for (const f of fixes) {
    const v = parseFaultIn(f.raw);
    if (v) named.set(v, [...(named.get(v) ?? []), f.id]);
    else withoutFaultIn += 1;
  }
  const failed = tags
    .map((t) => t.name)
    .sort(byVersion)
    .filter((name) => pre.has(name) || named.has(name))
    .map((release) => ({ release, prerelease: pre.has(release), fixes: named.get(release) ?? [] }));
  return { failed, withoutFaultIn };
}

/** US-1304 FR3.2: failed releases over all tagged releases, or null without tags. */
export function changeFailureRate(failed, tagged) {
  return tagged > 0 ? failed / tagged : null;
}

/**
 * US-1304 FR4.1, FR4.2: per failed release, the time from its tag to the first later tag that holds a story fixing it;
 * with only the prerelease mark, to the next tag. `recovered: false` is "not recovered yet". Tag dates are days, so a
 * same-day fix is 0. GitHub does not record when a release was marked, so recovery starts at the tag date.
 */
export function timeToRecover({ failed, tags, fixes }) {
  const names = tags.map((t) => t.name).sort(byVersion);
  const tagMs = new Map(tags.map((t) => [t.name, localDay(t.date)]));
  const releaseOf = new Map(fixes.map((f) => [f.id, RELEASED.exec(f.statusText ?? '')?.[1] ?? null]));
  return failed.map((f) => {
    const later = (v) => v && tagMs.has(v) && byVersion(v, f.release) > 0;
    const by =
      f.fixes.length > 0
        ? (f.fixes
            .map((id) => releaseOf.get(id))
            .filter(later)
            .sort(byVersion)[0] ?? null)
        : (names.find(later) ?? null);
    const from = tagMs.get(f.release);
    const to = by ? tagMs.get(by) : null;
    return { release: f.release, recoverMs: from != null && to != null ? to - from : null, recovered: by !== null, by };
  });
}

const monthIndex = (ms) => new Date(ms).getFullYear() * 12 + new Date(ms).getMonth();

/** US-1304 FR2.1: dated tags per calendar month (local time), from the first tag's month to now, or null. */
export function releasesPerMonth(tags, nowMs) {
  const days = tags.map((t) => localDay(t.date)).filter((ms) => ms != null);
  if (days.length === 0) return null;
  return days.length / (monthIndex(nowMs) - monthIndex(Math.min(...days)) + 1);
}

/**
 * US-1304 FR5.1, FR5.2: per merged pull request its open-to-merge time and review rounds (changes asked + 1; null where
 * the platform does not say), the release whose tag day ends after its merge, and the medians. Null without the list.
 */
export function pullFigures(pulls, tags) {
  if (!Array.isArray(pulls)) return null;
  const ends = tags
    .map((t) => ({ name: t.name, endMs: localDay(t.date) }))
    .filter((t) => t.endMs != null)
    .map((t) => ({ ...t, endMs: t.endMs + DAY_MS }))
    .sort((a, b) => a.endMs - b.endMs);
  const rows = pulls
    .map((p) => ({ p, merged: Date.parse(p.mergedAt ?? ''), created: Date.parse(p.createdAt ?? '') }))
    .filter((x) => Number.isFinite(x.merged))
    .map(({ p, merged, created }) => ({
      number: p.number,
      openMs: Number.isFinite(created) && merged >= created ? merged - created : null,
      rounds: p.changes == null ? null : p.changes + 1,
      release: ends.find((t) => merged < t.endMs)?.name ?? null
    }));
  const figures = (list) => ({ count: list.length, medianOpenMs: median(list.map((r) => r.openMs)), medianRounds: median(list.map((r) => r.rounds)) });
  const byRelease = {};
  for (const name of new Set(rows.map((r) => r.release).filter(Boolean))) byRelease[name] = figures(rows.filter((r) => r.release === name));
  const all = figures(rows);
  return { pulls: rows, medianOpenMs: all.medianOpenMs, medianRounds: all.medianRounds, byRelease };
}

/**
 * US-1304 FR6.1: the Delivery section's figures: four readouts, the pull request medians (null when missing), the fix
 * stories without a Fault in line, and one row per tag in version order.
 * @param {{stories: object[], tags: {name: string, date: string|null}[], fixes: object[], releases: {tag: string, prerelease: boolean}[]|null,
 *   pulls: {number: number, createdAt: string, mergedAt: string, changes: number|null}[]|null, nowMs: number}} input
 */
export function deliveryMetrics({ stories, tags, fixes, releases, pulls, nowMs }) {
  const { failed, withoutFaultIn } = failedReleases({ tags, fixes, releases });
  const recover = new Map(timeToRecover({ failed, tags, fixes }).map((r) => [r.release, r]));
  const failedBy = new Map(failed.map((f) => [f.release, f]));
  const pr = pullFigures(pulls, tags);
  const released = stories.filter((s) => s.release);
  const rows = tags
    .map((t) => t.name)
    .sort(byVersion)
    .map((release) => {
      const own = released.filter((s) => s.release === release);
      const f = failedBy.get(release);
      const r = recover.get(release);
      return {
        release,
        dateMs: localDay(tags.find((t) => t.name === release).date),
        stories: own.length,
        leadMs: median(own.map((s) => s.toReleaseMs)),
        failed: !!f,
        prerelease: f?.prerelease ?? false,
        fixes: f?.fixes ?? [],
        recoverMs: r?.recoverMs ?? null,
        recovered: r ? r.recovered : null,
        pulls: pr ? (pr.byRelease[release]?.count ?? 0) : null,
        medianOpenMs: pr?.byRelease[release]?.medianOpenMs ?? null
      };
    });
  return {
    readouts: {
      leadMs: median(released.map((s) => s.toReleaseMs)),
      perMonth: releasesPerMonth(tags, nowMs),
      failureRate: changeFailureRate(failed.length, tags.length),
      recoverMs: median([...recover.values()].map((r) => r.recoverMs))
    },
    pulls: pr && { count: pr.pulls.length, medianOpenMs: pr.medianOpenMs, medianRounds: pr.medianRounds },
    withoutFaultIn,
    releases: rows
  };
}
