// US-1304 FR1.3, FR2.1, FR3.1–FR3.3, FR4.1, FR4.2, FR5.1, FR5.2, FR6.1: the delivery metrics as pure functions over the
// stories, the release tags, the EPIC-00 fix stories, GitHub's release list and the merged pull requests.
import { describe, expect, it } from 'vitest';
import {
  changeFailureRate,
  deliveryMetrics,
  failedReleases,
  median,
  parseFaultIn,
  pullFigures,
  releasesPerMonth,
  timeToRecover
} from '../../src/main/parsers/delivery.js';

const DAY = 864e5;
const NOW = new Date(2026, 10, 26, 12).getTime();
const TAGS = [
  { name: 'v0.1.1', date: '2026-09-20' },
  { name: 'v0.1.0', date: '2026-09-10' },
  { name: 'v0.2.0', date: '2026-10-15' }
];
const RELEASES = [
  { tag: 'v0.1.0', prerelease: true },
  { tag: 'v0.1.1', prerelease: false },
  { tag: 'v0.2.0', prerelease: false }
];
const fix = (id, statusText, raw) => ({ id, title: id, statusText, raw });
const FIXES = [
  fix('US-0057', 'Released in v0.2.0', '- **Epic:** EPIC-00\n- **Fault in:** v0.1.1\n- **Priority:** High'),
  fix('US-0058', 'Planned', '- **Epic:** EPIC-00')
];
const STORIES = [
  { id: 'US-0101', release: 'v0.1.0', toReleaseMs: 2 * DAY },
  { id: 'US-0102', release: 'v0.1.0', toReleaseMs: 4 * DAY },
  { id: 'US-0201', release: 'v0.2.0', toReleaseMs: null },
  { id: 'US-0202', release: null, toReleaseMs: null }
];
const PULLS = [
  { number: 1, createdAt: '2026-09-05T10:00:00Z', mergedAt: '2026-09-06T10:00:00Z', changes: 0 },
  { number: 2, createdAt: '2026-09-12T10:00:00Z', mergedAt: '2026-09-14T10:00:00Z', changes: 2 },
  { number: 3, createdAt: '2026-10-01T10:00:00Z', mergedAt: '2026-10-04T10:00:00Z', changes: 0 },
  { number: 4, createdAt: '2026-11-01T10:00:00Z', mergedAt: '2026-11-05T10:00:00Z', changes: null }
];
const localDay = (y, m, d) => new Date(y, m - 1, d).getTime();

describe('parseFaultIn (US-1304 FR3.1, FR3.3)', () => {
  it("reads the release a fix story's Fault in line names", () => {
    expect(parseFaultIn(FIXES[0].raw)).toBe('v0.1.1');
    expect(parseFaultIn('* **Fault in:**   v1.20.3 (the updater)')).toBe('v1.20.3');
  });

  it('gives null without the line, with no version in it, or with no text', () => {
    expect(parseFaultIn(FIXES[1].raw)).toBeNull();
    expect(parseFaultIn('- **Fault in:** the last one')).toBeNull();
    expect(parseFaultIn(null)).toBeNull();
  });
});

describe('failedReleases and changeFailureRate (US-1304 FR3.1–FR3.3)', () => {
  it('a release has failed when GitHub marks it a prerelease or a fix story names it; fix stories without the line are counted', () => {
    const { failed, withoutFaultIn } = failedReleases({ tags: TAGS, fixes: FIXES, releases: RELEASES });
    expect(failed).toEqual([
      { release: 'v0.1.0', prerelease: true, fixes: [] },
      { release: 'v0.1.1', prerelease: false, fixes: ['US-0057'] }
    ]);
    expect(withoutFaultIn).toBe(1);
  });

  it("without GitHub's release list the fix stories still count, and a Fault in naming no tag is left out", () => {
    const fixes = [...FIXES, fix('US-0059', 'Planned', '- **Fault in:** v9.9.9')];
    expect(failedReleases({ tags: TAGS, fixes, releases: null }).failed).toEqual([{ release: 'v0.1.1', prerelease: false, fixes: ['US-0057'] }]);
  });

  it('is the failed releases over all tagged releases, and unknown without tags', () => {
    expect(changeFailureRate(2, 3)).toBeCloseTo(2 / 3);
    expect(changeFailureRate(0, 3)).toBe(0);
    expect(changeFailureRate(0, 0)).toBeNull();
  });
});

describe('timeToRecover (US-1304 FR4.1, FR4.2)', () => {
  const { failed } = failedReleases({ tags: TAGS, fixes: FIXES, releases: RELEASES });

  it('runs to the first later tag holding a fixing story, or to the next tag for a prerelease alone', () => {
    expect(timeToRecover({ failed, tags: TAGS, fixes: FIXES })).toEqual([
      { release: 'v0.1.0', recoverMs: localDay(2026, 9, 20) - localDay(2026, 9, 10), recovered: true, by: 'v0.1.1' },
      { release: 'v0.1.1', recoverMs: localDay(2026, 10, 15) - localDay(2026, 9, 20), recovered: true, by: 'v0.2.0' }
    ]);
  });

  it('is "not recovered yet" while the fixing story has no release, or no tag follows a prerelease', () => {
    const unreleased = [fix('US-0057', 'In progress', FIXES[0].raw)];
    const rows = timeToRecover({ failed: [...failed, { release: 'v0.2.0', prerelease: true, fixes: [] }], tags: TAGS, fixes: unreleased });
    expect(rows[1]).toEqual({ release: 'v0.1.1', recoverMs: null, recovered: false, by: null });
    expect(rows[2]).toEqual({ release: 'v0.2.0', recoverMs: null, recovered: false, by: null });
  });
});

describe('releasesPerMonth and median (US-1304 FR2.1, FR1.3)', () => {
  it('averages the tags over the months from the first tag to now, and is unknown without tags', () => {
    expect(releasesPerMonth(TAGS, NOW)).toBe(1); // September, October, November
    expect(releasesPerMonth([{ name: 'v0.1.0', date: '2026-11-02' }], NOW)).toBe(1);
    expect(releasesPerMonth([], NOW)).toBeNull();
    expect(releasesPerMonth([{ name: 'v0.1.0', date: null }], NOW)).toBeNull();
  });

  it('takes the middle value, the mean of the two middle ones, and leaves unknown values out', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, null, 3, 2])).toBe(2.5);
    expect(median([null, undefined])).toBeNull();
  });
});

describe('pullFigures (US-1304 FR5.1, FR5.2)', () => {
  it('gives open to merge and review rounds per pull request, grouped by the release whose tag follows its merge', () => {
    const p = pullFigures(PULLS, TAGS);
    expect(p.pulls.map((x) => [x.number, x.openMs / DAY, x.rounds, x.release])).toEqual([
      [1, 1, 1, 'v0.1.0'],
      [2, 2, 3, 'v0.1.1'],
      [3, 3, 1, 'v0.2.0'],
      [4, 4, null, null]
    ]);
    expect(p.medianOpenMs).toBe(2.5 * DAY);
    expect(p.medianRounds).toBe(1);
    expect(p.byRelease['v0.1.1']).toEqual({ count: 1, medianOpenMs: 2 * DAY, medianRounds: 3 });
  });

  it('leaves out a pull request without a merge time, and is null without the list', () => {
    expect(pullFigures([{ number: 9, createdAt: '2026-09-01T00:00:00Z', mergedAt: null, changes: 0 }], TAGS).pulls).toEqual([]);
    expect(pullFigures(null, TAGS)).toBeNull();
  });
});

describe('deliveryMetrics (US-1304 FR6.1)', () => {
  it('gives the four readouts, the pull request medians and one row per release', () => {
    const d = deliveryMetrics({ stories: STORIES, tags: TAGS, fixes: FIXES, releases: RELEASES, pulls: PULLS, nowMs: NOW });
    expect(d.readouts).toEqual({ leadMs: 3 * DAY, perMonth: 1, failureRate: 2 / 3, recoverMs: 17.5 * DAY });
    expect(d.pulls).toEqual({ count: 4, medianOpenMs: 2.5 * DAY, medianRounds: 1 });
    expect(d.withoutFaultIn).toBe(1);
    expect(d.releases.map((r) => r.release)).toEqual(['v0.1.0', 'v0.1.1', 'v0.2.0']);
    expect(d.releases[0]).toEqual({
      release: 'v0.1.0',
      dateMs: localDay(2026, 9, 10),
      stories: 2,
      leadMs: 3 * DAY,
      failed: true,
      prerelease: true,
      fixes: [],
      recoverMs: 10 * DAY,
      recovered: true,
      pulls: 1,
      medianOpenMs: DAY
    });
    expect(d.releases[2]).toMatchObject({ stories: 1, leadMs: null, failed: false, recoverMs: null, recovered: null, pulls: 1 });
  });

  it('keeps the rest when the release list and the pull requests are missing', () => {
    const d = deliveryMetrics({ stories: STORIES, tags: TAGS, fixes: FIXES, releases: null, pulls: null, nowMs: NOW });
    expect(d.readouts.failureRate).toBeCloseTo(1 / 3);
    expect(d.pulls).toBeNull();
    expect(d.releases[0]).toMatchObject({ failed: false, pulls: null, medianOpenMs: null });
  });
});
