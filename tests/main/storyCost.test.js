// US-1303 FR2–FR4, FR6.3, NFR2: intent cost rolled up to stories, epics and releases. Plain fixtures shaped like
// summarizeLedger's perIntent (with addRework's `rework`) and loadFeatures' epics.
import { describe, expect, it } from 'vitest';
import { rollUp } from '../../src/main/parsers/storyCost.js';
import { buildReleases } from '../../src/main/parsers/releases.js';

const row = (name, usd, tokens) => ({ name, usd, totalTokens: tokens });
/** One intent's ledger cost: usd split over input/output tokens, one stage, one agent and one model row. */
function cost(usd, { stage = 'code-generation', agent = 'developer', model = 'claude-opus-5-5', complete = true, rework = null } = {}) {
  const tokens = { input: usd * 100, output: usd * 10, cacheWrite: usd * 20, cacheRead: usd * 1000 };
  const totalTokens = tokens.input + tokens.output + tokens.cacheWrite + tokens.cacheRead;
  return {
    total: { usd, tokens, totalTokens, missingPrice: !complete },
    byStage: [row(stage, usd, totalTokens)],
    byAgent: [row(agent, usd, totalTokens)],
    byModel: [{ ...row(model, usd, totalTokens), missingPrice: !complete }],
    complete,
    rework
  };
}
const story = (id, statusText) => ({ id, title: id, status: 'done', statusText });
const epic = (id, stories) => ({ id, parsed: { stories } });

describe('rollUp (US-1303 FR2, FR6.3)', () => {
  it('gives one story the whole cost of an intent that links only to it', () => {
    const r = rollUp({ delivered: { a: ['US-1301'] }, perIntent: { a: cost(6) } });
    expect(r.stories['US-1301']).toMatchObject({ usd: 6, totalTokens: 6 * 1130, tokens: { input: 600, output: 60, cacheWrite: 120, cacheRead: 6000 } });
    expect(r.stories['US-1301'].intents).toEqual([{ dirName: 'a', sharedWith: 1, noCost: false, reworkUnknown: true }]);
    expect(r.stories['US-1301'].byStage).toEqual([{ name: 'code-generation', usd: 6, totalTokens: 6780, reworkUsd: 0 }]);
  });

  it('splits an intent on three stories evenly and says it is shared with 3', () => {
    const r = rollUp({ delivered: { a: ['US-1301', 'US-1302', 'US-1303'] }, perIntent: { a: cost(9) } });
    for (const id of ['US-1301', 'US-1302', 'US-1303']) {
      expect(r.stories[id].usd).toBeCloseTo(3);
      expect(r.stories[id].tokens.input).toBeCloseTo(300);
      expect(r.stories[id].intents[0].sharedWith).toBe(3);
      expect(r.stories[id].shared).toBe(true);
    }
  });

  it('sums a story over two intents, an archived one included, and merges split rows by name', () => {
    const perIntent = { a: cost(2, { agent: 'developer' }), old: cost(3, { agent: 'quality' }) };
    const r = rollUp({ delivered: { a: ['US-1301'], old: ['US-1301'] }, perIntent });
    const s = r.stories['US-1301'];
    expect(s.usd).toBe(5);
    expect(s.shared).toBe(false);
    expect(s.byStage).toEqual([{ name: 'code-generation', usd: 5, totalTokens: 5650, reworkUsd: 0 }]);
    expect(s.byAgent.map((x) => [x.name, x.usd])).toEqual([
      ['quality', 3],
      ['developer', 2]
    ]);
    expect(s.intents.map((i) => i.dirName)).toEqual(['a', 'old']);
  });

  it('an intent with no ledger entry adds nothing and is named as no cost recorded', () => {
    const r = rollUp({ delivered: { a: ['US-1301'], none: ['US-1301'] }, perIntent: { a: cost(2), none: null } });
    expect(r.stories['US-1301'].usd).toBe(2);
    expect(r.stories['US-1301'].intents.find((i) => i.dirName === 'none')).toMatchObject({ noCost: true });
  });

  it('marks a figure with a model that has no price incomplete (NFR2)', () => {
    const r = rollUp({ delivered: { a: ['US-1301'], b: ['US-1302'] }, perIntent: { a: cost(2, { complete: false }), b: cost(1) } });
    expect(r.stories['US-1301'].incomplete).toBe(true);
    expect(r.stories['US-1302'].incomplete).toBe(false);
  });

  it('lists the intents that link to no story as not linked (FR5)', () => {
    const r = rollUp({ delivered: { a: ['US-1301'], b: [], c: [] }, perIntent: { a: cost(1), b: cost(1) } });
    expect(r.notLinked).toEqual(['b', 'c']);
    expect(Object.keys(r.stories)).toEqual(['US-1301']);
  });

  it('gives empty results for no input', () => {
    expect(rollUp({})).toEqual({ stories: {}, epics: {}, releases: {}, notLinked: [] });
  });
});

describe('rollUp rework (US-1303 FR4)', () => {
  it('divides an intent’s rework the same way as its cost and shows its share', () => {
    const rework = { total: { usd: 3, tokens: 300 }, share: 0.5, estimate: false, byStage: { 'code-generation': { usd: 3, tokens: 300 } } };
    const r = rollUp({ delivered: { a: ['US-1301', 'US-1302'] }, perIntent: { a: cost(6, { rework }) } });
    const s = r.stories['US-1301'];
    expect(s.rework).toEqual({ usd: 1.5, tokens: 150, share: 0.5 });
    expect(s.byStage[0].reworkUsd).toBeCloseTo(1.5);
    expect(s.intents[0].reworkUnknown).toBe(false);
  });

  it('counts an intent without known rework as 0 and says so', () => {
    const rework = { total: { usd: 0, tokens: 0 }, share: 0, estimate: false, byStage: {}, unknown: true };
    const r = rollUp({ delivered: { a: ['US-1301'] }, perIntent: { a: cost(2, { rework }) } });
    expect(r.stories['US-1301'].rework).toEqual({ usd: 0, tokens: 0, share: 0 });
    expect(r.stories['US-1301'].intents[0].reworkUnknown).toBe(true);
  });
});

describe('rollUp epics and releases (US-1303 FR3)', () => {
  const epics = [
    epic('EPIC-13', [story('US-1301', '✅ Released in v0.3.2'), story('US-1302', '🚧 In progress, for v0.3.3'), story('US-1303', '📋 Planned')]),
    epic('EPIC-14', [story('US-1401', '📋 Planned')])
  ];
  const delivered = { a: ['US-1301'], b: ['US-1302', 'US-1401'], c: ['US-1303'] };
  const perIntent = { a: cost(4), b: cost(2), c: cost(1) };

  it('an epic is the sum of its stories; an epic with no linked story has no figure', () => {
    const r = rollUp({ delivered, perIntent, epics: [...epics, epic('EPIC-15', [story('US-1501', '📋 Planned')])] });
    expect(r.epics['EPIC-13'].usd).toBe(6);
    expect(r.epics['EPIC-14'].usd).toBe(1);
    expect(r.epics['EPIC-13'].intents.map((i) => i.dirName)).toEqual(['a', 'b', 'c']);
    expect(r.epics['EPIC-15']).toBeUndefined();
  });

  it('a release is the sum of the stories it includes, planned and released markers alike', () => {
    const releases = buildReleases(epics, [], []);
    const r = rollUp({ delivered, perIntent, epics, releases });
    expect(r.releases['v0.3.2'].usd).toBe(4);
    expect(r.releases['v0.3.3'].usd).toBe(1);
    expect(Object.keys(r.releases).sort()).toEqual(['v0.3.2', 'v0.3.3']);
  });

  it('an intent on two stories of one epic is named once there, with both shares counted', () => {
    const r = rollUp({ delivered: { a: ['US-1301', 'US-1302'] }, perIntent: { a: cost(4) }, epics });
    expect(r.epics['EPIC-13'].usd).toBe(4);
    expect(r.epics['EPIC-13'].intents).toEqual([{ dirName: 'a', sharedWith: 2, noCost: false, reworkUnknown: true }]);
  });
});
