// US-0213 FR2, FR3.4, FR4.1, FR5, FR6.2: when the handoff page opens, the idle rule, and the turn cost. Pure.
import { describe, expect, it } from 'vitest';
import {
  HANDOFF_DEFAULTS,
  boundaryOf,
  compactInstruction,
  decideBoundary,
  decideThreshold,
  handoffCommands,
  isIdle,
  turnCost
} from '../../src/main/sessionHandoff.js';

const on = { ...HANDOFF_DEFAULTS };
const ev = (event, stage, timeMs) => ({ event, fields: { Stage: stage }, timeMs, key: `${event}-${timeMs}` });

describe('the threshold moment (FR2.1, FR6.2)', () => {
  it('offers once when the size passes the threshold, not again while it stays above', () => {
    let s = decideThreshold(null, 149_999, on);
    expect(s.offer).toBe(false);
    s = decideThreshold(s.state, 150_000, on);
    expect(s.offer).toBe(true);
    expect(decideThreshold(s.state, 160_000, on).offer).toBe(false);
  });

  it('Not now offers again only after another 50 000 tokens', () => {
    let s = decideThreshold(null, 151_000, on);
    s = decideThreshold({ ...s.state, declinedAt: 151_000 }, 200_999, on);
    expect(s.offer).toBe(false);
    expect(decideThreshold(s.state, 201_000, on).offer).toBe(true);
  });

  it('a size back under the threshold (a compaction) starts over; turned off never offers; unknown size never offers', () => {
    let s = decideThreshold(null, 151_000, on);
    s = decideThreshold(s.state, 40_000, on);
    expect(decideThreshold(s.state, 150_500, on).offer).toBe(true);
    expect(decideThreshold(null, 500_000, { ...on, onThreshold: false }).offer).toBe(false);
    expect(decideThreshold(null, null, on).offer).toBe(false);
  });
});

describe('stage and gate moments (FR2.2–FR2.4)', () => {
  const gateState = '- [?] code-generation';
  it('a STAGE_COMPLETED is a stage boundary; a [?] in the state with STAGE_AWAITING_APPROVAL last is a gate', () => {
    expect(boundaryOf('- [x] code-generation', [ev('STAGE_COMPLETED', 'code-generation', 1)])).toEqual({
      kind: 'stage',
      stage: 'code-generation',
      key: 'code-generation'
    });
    expect(boundaryOf(gateState, [ev('STAGE_COMPLETED', 'code-generation', 1), ev('STAGE_AWAITING_APPROVAL', 'code-generation', 2)])).toEqual({
      kind: 'gate',
      stage: 'code-generation',
      key: 'code-generation'
    });
  });

  it('no [?], or an approval after the gate, is no gate; nothing at all is null', () => {
    expect(boundaryOf('- [ ] x', [ev('STAGE_AWAITING_APPROVAL', 'x', 1)])).toBeNull();
    expect(boundaryOf(gateState, [ev('STAGE_AWAITING_APPROVAL', 'x', 1), ev('GATE_APPROVED', 'x', 2)])).toBeNull();
    expect(boundaryOf('', [])).toBeNull();
    // the state file's own legend names [?] in a comment: that is no gate
    const legend = '<!-- Checkbox states: [ ] not started, [?] awaiting approval -->\n- [-] code-generation — EXECUTE';
    expect(boundaryOf(legend, [ev('STAGE_AWAITING_APPROVAL', 'code-generation', 1)])).toBeNull();
  });

  it('one offer per boundary: a gate after its stage completion replaces it; Not now waits for the next boundary', () => {
    let s = decideBoundary(null, { kind: 'stage', stage: 'a', key: 'a' }, on);
    expect(s.offer).toBe('stage');
    s = decideBoundary(s.state, { kind: 'gate', stage: 'a', key: 'a' }, on, { pending: true });
    expect(s.offer).toBe('gate'); // the pending stage page becomes the gate page
    s = decideBoundary(s.state, { kind: 'gate', stage: 'a', key: 'a' }, on);
    expect(s.offer).toBe(null); // the same boundary, answered (Not now): wait for the next
    expect(decideBoundary(s.state, { kind: 'stage', stage: 'b', key: 'b' }, on).offer).toBe('stage');
  });

  it('a moment turned off never offers', () => {
    expect(decideBoundary(null, { kind: 'stage', stage: 'a', key: 'a' }, { ...on, onStage: false }).offer).toBe(null);
    expect(decideBoundary(null, { kind: 'gate', stage: 'a', key: 'a' }, { ...on, onGate: false }).offer).toBe(null);
  });
});

describe('the idle rule (FR5.1, FR5.2)', () => {
  const idle = { lastStopMs: 10_000, lastInputMs: 1_000, busy: false, waiting: false, notify: null, backgroundTasks: null };
  it('idle after a stop with no key since, none in the last 5 s, nothing running or waiting', () => {
    expect(isIdle(idle, 20_000)).toBe(true);
    expect(isIdle({ ...idle, backgroundTasks: false }, 20_000)).toBe(true);
  });

  it.each([
    ['a running tool or agent', { busy: true }],
    ['a waiting question or permission', { waiting: true }],
    ['a permission notification', { notify: 'permission_prompt' }],
    ['background tasks at the stop', { backgroundTasks: true }],
    ['a key since the last stop', { lastInputMs: 12_000 }],
    ['no stop yet', { lastStopMs: null }]
  ])('not idle with %s', (_name, patch) => expect(isIdle({ ...idle, ...patch }, 20_000)).toBe(false));

  it('a key in the last 5 s is typing, even before the stop', () => {
    expect(isIdle({ ...idle, lastInputMs: 9_000 }, 13_000)).toBe(false);
    expect(isIdle({ ...idle, lastInputMs: 9_000 }, 14_000)).toBe(true);
    expect(isIdle(null, 1)).toBe(false);
  });
});

describe('turn cost (FR3.4)', () => {
  const rates = { 'opus-5-5': { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 } };
  it('is tokens × the model’s cache-read price per million', () => {
    expect(turnCost(200_000, 'claude-opus-5-5', rates)).toBeCloseTo(0.1);
  });
  it('is null when the model has no rate or the size is unknown, never 0', () => {
    expect(turnCost(200_000, 'claude-unknown-1', rates)).toBeNull();
    expect(turnCost(null, 'claude-opus-5-5', rates)).toBeNull();
  });
});

describe('commands and the compact instruction (FR3.2, FR3.3, FR3.5, FR4.1)', () => {
  it('names intent, stage, Unit, open decisions and files left, and drops contents and test output', () => {
    const text = compactInstruction({ intent: '261117-x', stage: 'code-generation', unit: 'u1', openDecisions: ['OQ1'], filesLeft: ['src/a.js'] });
    expect(text).toContain('261117-x');
    expect(text).toContain('code-generation');
    expect(text).toContain('u1');
    expect(text).toContain('OQ1');
    expect(text).toContain('src/a.js');
    expect(text).toMatch(/drop/i);
    expect(text).not.toMatch(/[\r\n]/); // one line, so it can follow /compact
    expect(compactInstruction({})).toContain('?');
  });

  it('Claude Code and opencode get their own commands; any other harness none', () => {
    expect(handoffCommands('claude', 'compact', 'keep x')).toEqual(['/compact keep x']);
    expect(handoffCommands('claude', 'fresh')).toEqual(['/clear', '/aidlc --resume']);
    expect(handoffCommands('claude', 'clear')).toEqual(['/clear']);
    expect(handoffCommands('opencode', 'compact', 'keep x')).toEqual(['/compact']); // the plugin's hook adds the instruction
    expect(handoffCommands('opencode', 'fresh')).toEqual(['/new', '/aidlc --resume']);
    expect(handoffCommands('codex', 'fresh')).toBeNull();
    expect(handoffCommands('claude', 'rm -rf')).toBeNull();
  });
});

// US-0213 FR2, FR3, FR5, FR6.2, FR8.1 and US-0026 FR3.3: the controller over a fake store (no Node, no Electron).
import { createHandoffController } from '../../src/main/sessionHandoff.js';
import { vi } from 'vitest';

describe('createHandoffController', () => {
  const RATES = { 'opus-5-5': { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 } };
  const STATE = '- [-] code-generation\n- **Current Stage**: code-generation\n';
  let store, pages, logs, inputs, written, t, ctl, closedFn, size;
  const make = (over = {}) => {
    size = 160_000;
    pages = [];
    logs = [];
    written = [];
    t = 100_000;
    inputs = [{ dirName: '261117-x', stateText: STATE, events: [] }];
    store = {
      addHandoff: vi.fn((sessionId, handoff) => (pages.push({ sessionId, handoff }), `h${pages.length}`)),
      handoffOf: (id) => {
        const p = pages[Number(id.slice(1)) - 1];
        return p && !p.ended
          ? { eventId: id, sessionId: p.sessionId, projectId: 'p1', harness: over.harness ?? 'claude', handoff: p.handoff, state: 'shown' }
          : null;
      },
      setHandoff: vi.fn((id, state) => state === 'ended' && (pages[Number(id.slice(1)) - 1].ended = true)),
      signalsOf: vi.fn(() => ({ lastStopMs: 1, lastInputMs: null, busy: false, waiting: false })),
      sessionsOf: () => [{ sessionId: 's1', harness: over.harness ?? 'claude', tabId: 'agent:claude' }],
      waitForSession: vi.fn(async () => true),
      onSignal: () => {},
      onHandoffClosed: (fn) => (closedFn = fn)
    };
    ctl = createHandoffController({
      store,
      readContext: async (p) => (p === '/t.jsonl' ? { tokens: size, model: 'claude-opus-5-5' } : null),
      ratesOf: async () => RATES,
      settingsOf: async () => ({ ...HANDOFF_DEFAULTS, ...(over.settings ?? {}) }),
      inputsOf: async () => inputs,
      writeInstruction: async (sessionId, text) => written.push([sessionId, text]),
      log: (l) => logs.push(l),
      now: () => t
    });
  };
  const stop = (harness = 'claude') =>
    ctl.onSignal({ sessionId: 's1', projectId: 'p1', harness, kind: 'reply', parsed: { kind: 'reply', signals: { transcriptPath: '/t.jsonl' } } });

  it('a stop past the threshold offers Compact, Fresh session and Not now with size, model and cost, and writes the instruction', async () => {
    make();
    await stop();
    expect(pages).toHaveLength(1);
    expect(pages[0].handoff).toMatchObject({
      moment: 'threshold',
      tokens: 160_000,
      model: 'claude-opus-5-5',
      choices: ['compact', 'fresh', 'notNow'],
      gate: false
    });
    expect(pages[0].handoff.cost).toBeCloseTo(0.08);
    expect(written[0][0]).toBe('s1');
    expect(written[0][1]).toContain('261117-x');
    await stop();
    expect(pages).toHaveLength(1); // once
  });

  it('Not now (close) at the threshold waits 50 000 more tokens', async () => {
    make();
    await stop();
    closedFn({ eventId: 'h1', handoff: pages[0].handoff });
    await stop();
    expect(pages).toHaveLength(1);
  });

  it('a gate in the intent files offers the gate page with its note', async () => {
    make();
    inputs[0] = {
      ...inputs[0],
      stateText: '- [?] code-generation',
      events: [{ event: 'STAGE_AWAITING_APPROVAL', fields: { Stage: 'code-generation' }, timeMs: 1 }]
    };
    await ctl.refreshBoundary('p1');
    expect(pages[0].handoff).toMatchObject({ moment: 'gate', gate: true, choices: ['compact', 'fresh', 'notNow'] });
    await ctl.refreshBoundary('p1');
    expect(pages).toHaveLength(1);
  });

  it('a new session (startup) with an intent open offers /clear and /clear + resume only (US-0026 FR3.3)', async () => {
    make();
    await ctl.onSignal({ sessionId: 's1', projectId: 'p1', harness: 'claude', kind: 'session', parsed: { kind: 'session', source: 'startup' } });
    expect(pages[0].handoff).toMatchObject({ moment: 'newSession', choices: ['clear', 'clearResume'] });
    await ctl.onSignal({ sessionId: 's1', projectId: 'p1', harness: 'claude', kind: 'session', parsed: { kind: 'session', source: 'clear' } });
    expect(pages).toHaveLength(1); // the app's own /clear offers nothing
  });

  it('a harness with no commands gets no page at all (FR3.5, FR7.1)', async () => {
    make({ harness: 'codex' });
    await stop('codex');
    expect(pages).toEqual([]);
  });

  it('commands only for an offered choice; idle follows the signals; sent logs the size before and the next size after (FR8.1)', async () => {
    make();
    await stop();
    expect(ctl.commandsFor('h1', 'fresh')).toEqual({ lines: ['/clear', '/aidlc --resume'], waitReady: true });
    expect(ctl.commandsFor('h1', 'compact').lines[0]).toMatch(/^\/compact Keep for the AI-DLC workflow/);
    expect(ctl.commandsFor('h1', 'clear')).toBeNull();
    expect(ctl.commandsFor('h1', 'rm -rf')).toBeNull();
    expect(ctl.idle('h1')).toBe(true);
    store.signalsOf.mockReturnValue({ lastStopMs: 1, busy: true });
    expect(ctl.idle('h1')).toBe(false);
    ctl.sent('h1', 'compact');
    expect(store.setHandoff).toHaveBeenCalledWith('h1', 'ended');
    expect(logs.at(-1)).toMatch(/compact.*160000/);
    size = 40_000;
    await stop();
    expect(logs.at(-1)).toMatch(/compact.*160000.*40000/);
  });
});
