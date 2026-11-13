import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mergeIntents } from '../../src/main/parsers/intents.js';
import { parseState } from '../../src/main/parsers/state.js';
import { parseRuntimeGraph } from '../../src/main/parsers/runtimeGraph.js';
import { mergeAudits, parseAudit, categoryOf, NOISY_EVENTS } from '../../src/main/parsers/audit.js';
import { mergePipeline } from '../../src/main/parsers/pipeline.js';
import { unitStatuses } from '../../src/main/parsers/units.js';

const FIX = path.resolve(__dirname, '../fixtures');
const INTENTS = path.join(FIX, 'project/aidlc/spaces/default/intents');
const read = (p) => readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

const epic29 = path.join(INTENTS, '261112-epic29-small-k2-fixes');
const epic02 = path.join(INTENTS, '261110-epic02-finish');

describe('mergeIntents', () => {
  it('sorts newest first and flags intents missing on disk or in the index (FR2.1, FR2.5)', () => {
    const disk = ['261110-epic02-finish', '261111-orphan-notes', '261112-epic29-small-k2-fixes'];
    const list = mergeIntents(readJson(path.join(INTENTS, 'intents.json')), disk, '261112-epic29-small-k2-fixes');

    expect(list.map((i) => i.dirName)).toEqual([
      '261112-epic29-small-k2-fixes',
      '261111-orphan-notes',
      '261110-epic02-finish',
      '261105-ghost-intent'
    ]);
    const by = Object.fromEntries(list.map((i) => [i.dirName, i]));
    expect(by['261105-ghost-intent'].missingOnDisk).toBe(true);
    expect(by['261111-orphan-notes']).toMatchObject({ missingInIndex: true, slug: 'orphan-notes' });
    expect(by['261112-epic29-small-k2-fixes']).toMatchObject({ active: true, date: '2026-11-12', scope: 'express' });
    expect(by['261110-epic02-finish'].active).toBe(false);
  });
});

describe('parseState', () => {
  it('reads depth, test strategy and every checkbox status (FR3.1, FR3.2)', () => {
    const s = parseState(read(path.join(epic29, 'aidlc-state.md')));
    expect(s).toMatchObject({ depth: 'Minimal', testStrategy: 'Minimal', scope: 'express', currentStage: 'build-and-test' });
    expect(s.phases.map((p) => p.name)).toEqual(['initialization', 'ideation', 'inception', 'construction', 'operation']);

    const orphan = parseState(read(path.join(INTENTS, '261111-orphan-notes/aidlc-state.md')));
    expect(orphan.phases[0].stages).toEqual([
      { slug: 'requirements-analysis', status: 'done', mode: 'EXECUTE' },
      { slug: 'user-stories', status: 'awaiting-approval', mode: 'EXECUTE' },
      { slug: 'domain-design', status: 'revising', mode: 'EXECUTE' },
      { slug: 'units-generation', status: 'in-progress', mode: 'EXECUTE' },
      { slug: 'contract-design', status: 'skipped', mode: 'EXECUTE' },
      { slug: 'delivery-planning', status: 'not-started', mode: 'EXECUTE' },
      { slug: 'refined-mockups', status: 'not-started', mode: 'SKIP' }
    ]);
  });
});

describe('mergePipeline', () => {
  const state = parseState(read(path.join(epic29, 'aidlc-state.md')));
  const graph = parseRuntimeGraph(readJson(path.join(epic29, 'runtime-graph.json')));
  const stage = (p, slug) => p.phases.flatMap((ph) => ph.stages).find((s) => s.slug === slug);

  it('lets the state file win and flags disagreement (FR3.4)', () => {
    const consistent = mergePipeline(state, graph);
    expect(stage(consistent, 'code-generation')).toMatchObject({ status: 'done', mismatch: false, agent: 'aidlc-developer-agent' });
    expect(stage(consistent, 'code-generation').durationMs).toBe(33 * 60 * 1000 + 12 * 1000);
    expect(stage(consistent, 'build-and-test')).toMatchObject({ status: 'in-progress', current: true, mismatch: false });

    // Graph claims build-and-test is approved; the state checkbox still says in progress.
    const disagreeing = {
      ...graph,
      stages: graph.stages.map((g) =>
        g.slug === 'build-and-test' ? { ...g, completedAt: '2026-11-12T22:01:05Z', outcome: 'approved' } : g
      )
    };
    expect(stage(mergePipeline(state, disagreeing), 'build-and-test')).toMatchObject({ status: 'in-progress', mismatch: true });
  });

  it('works from the state file alone when runtime-graph.json is missing (FR3.5, FR2.2)', () => {
    const p = mergePipeline(state, null);
    expect(stage(p, 'code-generation')).toMatchObject({ status: 'done', agent: null, mismatch: false });
    expect(p.executed).toBe(10);
    expect(p.done).toBe(6);
  });
});

describe('audit parser', () => {
  it('keeps unknown event types and fields (FR4.1, FR4.6)', () => {
    const events = parseAudit(read(path.join(FIX, 'audit/machine-a.md')), 'machine-a.md');
    expect(events).toHaveLength(8);
    const odd = events.find((e) => e.event === 'WARP_CORE_BREACH');
    expect(odd).toMatchObject({
      title: 'Warp Core Breach',
      timestamp: '2026-11-12T21:20:00Z',
      source: 'machine-a.md',
      fields: { Stage: 'code-generation', 'Containment Field': '87%' }
    });
    expect(categoryOf(odd.event)).toBe('other');
    expect(categoryOf('QUESTION_REPLIED')).toBe('human');
    expect(categoryOf('STAGE_AWAITING_APPROVAL')).toBe('gate');
    expect(categoryOf('ERROR_LOGGED')).toBe('error');
    expect(NOISY_EVENTS.has('SENSOR_PASSED')).toBe(true);
  });

  it('merges two machine shards in timestamp order (FR4.2)', () => {
    const merged = mergeAudits([
      { source: 'machine-a.md', text: read(path.join(FIX, 'audit/machine-a.md')) },
      { source: 'machine-b.md', text: read(path.join(FIX, 'audit/machine-b.md')) }
    ]);
    expect(merged).toHaveLength(11);
    const stamps = merged.map((e) => e.timestamp);
    expect(stamps).toEqual([...stamps].sort());
    expect(merged.slice(5, 8).map((e) => [e.event, e.source])).toEqual([
      ['SUBAGENT_DISPATCHED', 'machine-b.md'],
      ['SENSOR_PASSED', 'machine-a.md'],
      ['SUBAGENT_COMPLETED', 'machine-b.md']
    ]);
    // Equal timestamps keep shard order (stable sort).
    expect(merged.slice(1, 4).map((e) => e.event)).toEqual(['STAGE_STARTED', 'STAGE_COMPLETED', 'STAGE_STARTED']);
  });
});

describe('unitStatuses', () => {
  it('derives pending/running/done for the epic02 DAG (FR5.2)', () => {
    const graph = parseRuntimeGraph(readJson(path.join(epic02, 'runtime-graph.json')));
    expect(graph.boltDag.batches).toHaveLength(4);
    const events = parseAudit(read(path.join(FIX, 'audit/epic02-units.md')), 'epic02-units.md');
    expect(unitStatuses(graph.boltDag, events)).toEqual({
      'u1-departments': 'done',
      'u2-visibility-rls': 'running',
      'u3-reports-assistant': 'pending',
      'u4-department-ui': 'pending',
      'u5-privilege-templates': 'done',
      'u6-epic-docs': 'pending'
    });
  });
});
