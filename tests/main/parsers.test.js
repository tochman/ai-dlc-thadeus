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

    expect(list.map((i) => i.dirName)).toEqual(['261112-epic29-small-k2-fixes', '261111-orphan-notes', '261110-epic02-finish', '261105-ghost-intent']);
    const by = Object.fromEntries(list.map((i) => [i.dirName, i]));
    expect(by['261105-ghost-intent'].missingOnDisk).toBe(true);
    expect(by['261111-orphan-notes']).toMatchObject({ missingInIndex: true, slug: 'orphan-notes' });
    expect(by['261112-epic29-small-k2-fixes']).toMatchObject({ active: true, date: '2026-11-12', scope: 'express' });
    expect(by['261110-epic02-finish'].active).toBe(false);
  });

  // UUID v7: the first 48 bits are the creation time in Unix ms.
  const v7 = (ms) =>
    `${ms
      .toString(16)
      .padStart(12, '0')
      .replace(/^(.{8})/, '$1-')}-7000-8000-000000000000`;
  const day = Date.UTC(2026, 10, 19);

  it('orders same-day intents by the time in their uuid, whatever their names (US-0040 FR4.2)', () => {
    const index = [
      { uuid: v7(day + 1000), dirName: '261119-zeta-first' },
      { uuid: v7(day + 3000), dirName: '261119-alpha-last' },
      { uuid: v7(day + 2000), dirName: '261119-mid' }
    ];
    const list = mergeIntents(
      index,
      index.map((e) => e.dirName),
      null
    );
    expect(list.map((i) => i.dirName)).toEqual(['261119-alpha-last', '261119-mid', '261119-zeta-first']);
  });

  it('puts an intent without a uuid after the same day indexed ones, still by folder date (US-0040 FR4.3)', () => {
    const index = [
      { uuid: v7(day + 1000), dirName: '261119-alpha' },
      { uuid: v7(day - 86_400_000), dirName: '261118-older' },
      { uuid: 'not-a-uuid', dirName: '261119-bad-uuid' }
    ];
    const disk = ['261119-alpha', '261118-older', '261119-zz-orphan', '261120-newer-orphan', '261119-bad-uuid'];
    const list = mergeIntents(index, disk, null);
    expect(list.map((i) => i.dirName)).toEqual(['261120-newer-orphan', '261119-alpha', '261119-zz-orphan', '261119-bad-uuid', '261118-older']);
  });
});

describe('parseState', () => {
  it('reads a custom plan name beside its base scope', () => {
    const s = parseState('## Project Information\n- **Scope**: bugfix\n- **Plan**: i18n-express\n');
    expect(s).toMatchObject({ scope: 'bugfix', plan: 'i18n-express' });
  });

  it('reads what an archived intent was before, and null for any other (US-0513 FR6.2)', () => {
    const archived = '## Current Status\n- **Status**: Archived\n- **Archived From**: Completed\n';
    expect(parseState(archived)).toMatchObject({ currentStatus: 'Archived', archivedFrom: 'Completed' });
    expect(parseState('## Current Status\n- **Status**: Running\n').archivedFrom).toBeNull();
  });

  it('reads depth, test strategy and every checkbox status (FR3.1, FR3.2)', () => {
    const s = parseState(read(path.join(epic29, 'aidlc-state.md')));
    expect(s).toMatchObject({ depth: 'Minimal', testStrategy: 'Minimal', scope: 'express', plan: null, currentStage: 'build-and-test' });
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
      stages: graph.stages.map((g) => (g.slug === 'build-and-test' ? { ...g, completedAt: '2026-11-12T22:01:05Z', outcome: 'approved' } : g))
    };
    expect(stage(mergePipeline(state, disagreeing), 'build-and-test')).toMatchObject({ status: 'in-progress', mismatch: true });
  });

  it('no stage is current in an archived intent, and the counts stay (US-0513 FR1.6, AC1.2.4)', () => {
    const p = mergePipeline({ ...state, currentStatus: 'Archived' }, graph);
    expect(p.phases.flatMap((ph) => ph.stages).some((s) => s.current)).toBe(false);
    expect(stage(p, 'build-and-test').status).toBe('in-progress'); // the record is shown as it is
    expect([p.done, p.executed]).toEqual([6, 9]);
  });

  it('a stage built unit by unit is done when every unit is approved, timed from its units (US-0011)', () => {
    const unit = (bolt, start, end, outcome = 'approved') => ({ bolt, started_at: start, completed_at: end, outcome });
    const raw = (instances) => ({
      stages: [{ stage_slug: 'code-generation', started_at: null, completed_at: null, outcome: 'approved', instances }]
    });
    const done = parseRuntimeGraph(
      raw([unit('u1', '2026-11-14T19:00:00Z', '2026-11-14T20:00:00Z'), unit('u2', '2026-11-14T19:30:00Z', '2026-11-14T21:00:00Z')])
    );
    expect(done.stages[0]).toMatchObject({ startedAt: '2026-11-14T19:00:00Z', completedAt: '2026-11-14T21:00:00Z', durationMs: 2 * 3600 * 1000 });
    expect(stage(mergePipeline(state, done), 'code-generation')).toMatchObject({ status: 'done', mismatch: false });

    // One unit still open: no completion time, so the stage is not done.
    const open = parseRuntimeGraph(raw([unit('u1', '2026-11-14T19:00:00Z', '2026-11-14T20:00:00Z'), unit('u2', '2026-11-14T19:30:00Z', null, null)]));
    expect(open.stages[0]).toMatchObject({ startedAt: '2026-11-14T19:00:00Z', completedAt: null });
    // No units and no times: unchanged.
    expect(parseRuntimeGraph(raw([])).stages[0]).toMatchObject({ startedAt: null, completedAt: null });
  });

  // US-0411: per-unit counts for the level bar, and a failed outcome.
  const inst = (bolt, outcome) => ({ bolt, started_at: '2026-11-14T19:00:00Z', completed_at: outcome ? '2026-11-14T20:00:00Z' : null, outcome });
  const unitGraph = (instances, dag) => ({ stages: [{ stage_slug: 'code-generation', instances }], bolt_dag: dag });
  const fiveUnits = { units: ['u1', 'u2', 'u3', 'u4', 'u5'].map((name) => ({ name })) };

  it('parseRuntimeGraph counts approved and seen units per stage (US-0411 FR2.1)', () => {
    const g = parseRuntimeGraph(unitGraph([inst('u1', 'approved'), inst('u2', 'approved'), inst('u3', null)], fiveUnits));
    expect(g.stages[0]).toMatchObject({ unitsApproved: 2, unitsSeen: 3 });
    expect(parseRuntimeGraph({ stages: [{ stage_slug: 'x' }] }).stages[0]).toMatchObject({ unitsApproved: 0, unitsSeen: 0 });
  });

  it('mergePipeline gives units from bolt_dag, else from instances, else null (US-0411 FR2.1)', () => {
    const two = [inst('u1', 'approved'), inst('u2', 'approved'), inst('u3', null)];
    expect(stage(mergePipeline(state, parseRuntimeGraph(unitGraph(two, fiveUnits))), 'code-generation').units).toEqual({ approved: 2, total: 5 });
    expect(stage(mergePipeline(state, parseRuntimeGraph(unitGraph(two))), 'code-generation').units).toEqual({ approved: 2, total: 3 });
    expect(stage(mergePipeline(state, graph), 'build-and-test').units).toBeNull();
    expect(stage(mergePipeline(state, null), 'code-generation').units).toBeNull();
  });

  it('mergePipeline flags a stage whose runtime outcome is set and not approved as failed (US-0411 FR3.4)', () => {
    const rejected = {
      ...graph,
      stages: graph.stages.map((g) => (g.slug === 'build-and-test' ? { ...g, outcome: 'rejected' } : g))
    };
    expect(stage(mergePipeline(state, rejected), 'build-and-test').failed).toBe(true);
    expect(stage(mergePipeline(state, graph), 'code-generation').failed).toBe(false);
    expect(stage(mergePipeline(state, graph), 'build-and-test').failed).toBe(false);
    expect(stage(mergePipeline(state, null), 'code-generation').failed).toBe(false);
  });

  it('works from the state file alone when runtime-graph.json is missing (FR3.5, FR2.2)', () => {
    const p = mergePipeline(state, null);
    expect(stage(p, 'code-generation')).toMatchObject({ status: 'done', agent: null, mismatch: false });
    expect(p.executed).toBe(9); // observability-setup is [S], skipped by a jump (US-0013)
    expect(p.done).toBe(6);
  });

  it('leaves a stage skipped by a jump ([S]) out of the count, so list and detail agree (US-0013)', () => {
    const jumped = {
      ...state,
      phases: state.phases.map((ph) => ({ ...ph, stages: ph.stages.map((st) => (st.slug === 'code-generation' ? { ...st, status: 'skipped' } : st)) }))
    };
    const p = mergePipeline(jumped, null);
    expect(stage(p, 'code-generation')).toMatchObject({ mode: 'EXECUTE', status: 'skipped' });
    expect(p.executed).toBe(8); // planned to run, but jumped over: not a stage left to do
    expect(p.done).toBe(5);
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

  const block = (event, ts) => `## ${event}\n${ts ? `**Timestamp**: ${ts}\n` : ''}**Event**: ${event}\n`;

  it('gives every block a stable <file>#<index> key, unique across files (FR2.1)', () => {
    const text = [block('A', '2026-11-13T10:00:00Z'), block('B', '2026-11-13T10:01:00Z')].join('---\n');
    expect(parseAudit(text, 'a.md').map((e) => e.key)).toEqual(['a.md#0', 'a.md#1']);
    const merged = mergeAudits([
      { source: 'a.md', text },
      { source: 'b.md', text }
    ]);
    expect(new Set(merged.map((e) => e.key)).size).toBe(4);
    // Equal times: source, then index.
    expect(merged.map((e) => e.key)).toEqual(['a.md#0', 'b.md#0', 'a.md#1', 'b.md#1']);
  });

  it('sorts mixed time zones chronologically, not as text (FR3.1)', () => {
    const merged = mergeAudits([
      { source: 'a.md', text: block('LATER', '2026-11-13T10:00:00Z') },
      { source: 'b.md', text: block('EARLIER', '2026-11-13T10:30:00+01:00') } // 09:30Z
    ]);
    expect(merged.map((e) => e.event)).toEqual(['EARLIER', 'LATER']);
  });

  it('places an event without timestamp right after its predecessor in the same file (FR3.2)', () => {
    const a = [block('A1', '2026-11-13T10:00:00Z'), block('A2', null)].join('---\n');
    const merged = mergeAudits([
      { source: 'a.md', text: a },
      { source: 'b.md', text: [block('B0', '2026-11-13T09:00:00Z'), block('B1', '2026-11-13T11:00:00Z')].join('---\n') }
    ]);
    expect(merged.map((e) => e.event)).toEqual(['B0', 'A1', 'A2', 'B1']);
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
