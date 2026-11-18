// US-0214 FR2, FR3, NFR2: the pure activity model. Activity events in, one row per main chat and one per dispatched
// agent under it out, each with one state and the time it entered that state.
import { describe, expect, it } from 'vitest';
import { IDLE_MS, activityRows, dropSession, emptyActivity, reduceActivity } from '../../src/shared/agentActivity.js';

const T0 = Date.UTC(2026, 10, 18, 9, 0);
const claude = (s, name, fields = {}) => ({ sessionId: 's1', tabId: 't1', harness: 'claude', atMs: T0 + s * 1000, name, ...fields });
const run = (events, state = emptyActivity()) => events.reduce(reduceActivity, state);
const rowsAt = (state, s) => activityRows(state, T0 + s * 1000);
const main = (state, s) => rowsAt(state, s).find((r) => r.kind === 'main');

describe('main chat state (US-0214 FR2.1, FR3.1)', () => {
  it('matches tool start and end by tool id', () => {
    const st = run([
      claude(0, 'prompt'),
      claude(1, 'toolStart', { tool: 'Read', toolId: 'a' }),
      claude(2, 'toolStart', { tool: 'Bash', toolId: 'b' }),
      claude(3, 'toolEnd', { toolId: 'b' })
    ]);
    expect(main(st, 3)).toMatchObject({ state: 'tool', tool: 'Read', harness: 'claude', tabId: 't1' });
    expect(main(reduceActivity(st, claude(4, 'toolEnd', { toolId: 'a', failed: true })), 4)).toMatchObject({ state: 'working', tool: null });
  });

  it('shows writing until the final message part, and thinking from reasoning', () => {
    let st = run([claude(0, 'prompt'), claude(1, 'text', { final: false })]);
    expect(main(st, 1).state).toBe('writing');
    st = reduceActivity(st, claude(2, 'text', { final: true }));
    expect(main(st, 2).state).toBe('working');
    st = reduceActivity(st, { ...claude(3, 'reasoning', { final: false }), harness: 'opencode' });
    expect(main(st, 3).state).toBe('thinking');
  });

  it.each(['permission', 'question', 'elicitation', 'notification'])('waits for me on %s, until the next event', (reason) => {
    const st = run([claude(0, 'prompt'), claude(1, 'waiting', { reason })]);
    expect(main(st, 1)).toMatchObject({ state: 'waiting', reason });
    expect(main(reduceActivity(st, claude(2, 'toolEnd', { toolId: 'x' })), 2).state).toBe('working');
  });

  it('treats the AskUserQuestion tool as waiting for me', () => {
    const st = run([claude(0, 'toolStart', { tool: 'AskUserQuestion', toolId: 'q' })]);
    expect(main(st, 0)).toMatchObject({ state: 'waiting', reason: 'question' });
  });

  it('turns idle at Stop and working again at the next prompt', () => {
    let st = run([claude(0, 'prompt'), claude(1, 'toolStart', { tool: 'Bash', toolId: 'b' }), claude(2, 'stop')]);
    expect(main(st, 2)).toMatchObject({ state: 'idle', tool: null });
    st = reduceActivity(st, claude(3, 'prompt'));
    expect(main(st, 3).state).toBe('working');
  });

  it('turns idle 30 s after the last event when nothing runs or waits (an interrupt sends no Stop, A3)', () => {
    const st = run([claude(0, 'prompt'), claude(1, 'text', { final: false })]);
    expect(main(st, 30.999).state).toBe('writing');
    expect(main(st, 31)).toMatchObject({ state: 'idle', sinceMs: T0 + 1000 + IDLE_MS });
    const tool = run([claude(0, 'toolStart', { tool: 'Bash', toolId: 'b' })]);
    expect(main(tool, 300).state).toBe('tool'); // a long test run is not an interrupt
  });

  it('stops on an error with its type, until the next prompt', () => {
    let st = run([claude(0, 'prompt'), claude(1, 'error', { error: 'rate_limit' })]);
    expect(main(st, 1)).toMatchObject({ state: 'error', error: 'rate_limit' });
    expect(main(st, 100).state).toBe('error'); // an error does not time out to idle
    st = reduceActivity(st, claude(2, 'prompt'));
    expect(main(st, 2)).toMatchObject({ state: 'working', error: null });
  });

  it('orders the live signals: error > waiting > tool > writing > idle (FR3.3)', () => {
    let st = run([claude(0, 'text', { final: false }), claude(1, 'toolStart', { tool: 'Grep', toolId: 'g' })]);
    expect(main(st, 1).state).toBe('tool');
    st = reduceActivity(st, claude(2, 'waiting', { reason: 'permission' }));
    expect(main(st, 2).state).toBe('waiting');
    st = reduceActivity(st, claude(3, 'error', { error: 'overloaded' }));
    expect(main(st, 3).state).toBe('error');
  });

  it('keeps the time in a state across events that leave it unchanged (FR3.2)', () => {
    const st = run([claude(0, 'prompt'), claude(5, 'text', { final: false }), claude(6, 'text', { final: false }), claude(9, 'text', { final: false })]);
    expect(main(st, 9)).toMatchObject({ state: 'writing', sinceMs: T0 + 5000 });
  });
});

describe('dispatched agents (US-0214 FR2.2, FR2.3, A2)', () => {
  it('gives each agent a row under its main chat, fed by its own events, gone at its stop', () => {
    let st = run([
      claude(0, 'toolStart', { tool: 'Agent', toolId: 'm1' }),
      claude(1, 'agentStart', { agentId: 'ag1', agentType: 'aidlc-developer-agent' }),
      claude(2, 'toolStart', { tool: 'Bash', toolId: 'x', agentId: 'ag1' })
    ]);
    const rows = rowsAt(st, 2);
    expect(rows.map((r) => [r.kind, r.state, r.tool])).toEqual([
      ['main', 'tool', 'Agent'],
      ['agent', 'tool', 'Bash']
    ]);
    expect(rows[1]).toMatchObject({ parent: rows[0].key, agentType: 'aidlc-developer-agent' });
    st = reduceActivity(st, claude(3, 'agentEnd', { agentId: 'ag1' }));
    expect(rowsAt(st, 3).map((r) => r.kind)).toEqual(['main']);
  });

  it('starts a row from an unseen agent id, and an end with no start leaves nothing', () => {
    const st = run([claude(0, 'toolEnd', { toolId: 'z', agentId: 'ag9' }), claude(1, 'agentEnd', { agentId: 'ag8' })]);
    expect(rowsAt(st, 1).map((r) => [r.kind, r.agentId ?? null])).toEqual([
      ['main', null],
      ['agent', 'ag9']
    ]);
  });

  it('opencode: a child session (parentID) is an agent row; its events go there; its idle ends it', () => {
    const oc = (s, name, fields) => ({ sessionId: 's2', tabId: 't2', harness: 'opencode', atMs: T0 + s * 1000, name, ...fields });
    let st = run([
      oc(0, 'busy', { ref: 'ses_main' }),
      oc(1, 'agentStart', { agentId: 'ses_child', ref: 'ses_main', agentType: 'general' }),
      oc(2, 'reasoning', { ref: 'ses_child', final: false }),
      oc(3, 'toolStart', { ref: 'ses_main', tool: 'task', toolId: 'c1' })
    ]);
    expect(rowsAt(st, 3).map((r) => [r.kind, r.harness, r.state])).toEqual([
      ['main', 'opencode', 'tool'],
      ['agent', 'opencode', 'thinking']
    ]);
    st = reduceActivity(st, oc(4, 'idle', { ref: 'ses_child' }));
    expect(rowsAt(st, 4).map((r) => r.kind)).toEqual(['main']);
  });

  it('keeps one main row per agent tab and drops a tab whose session ended', () => {
    const st = run([claude(0, 'prompt'), { ...claude(0, 'prompt'), sessionId: 's3', tabId: 't3', harness: 'opencode' }]);
    expect(rowsAt(st, 0).map((r) => [r.tabId, r.harness])).toEqual([
      ['t1', 'claude'],
      ['t3', 'opencode']
    ]);
    expect(rowsAt(dropSession(st, 's1'), 0).map((r) => r.tabId)).toEqual(['t3']);
  });

  it('never puts agent text in a row: only tool names, states and error types (NFR2)', () => {
    const st = run([
      claude(0, 'prompt', { prompt: 'secret prompt' }),
      claude(1, 'toolStart', { tool: 'Bash', toolId: 'b', input: { command: 'secret command' } }),
      claude(2, 'text', { final: false, message: 'secret answer' })
    ]);
    expect(JSON.stringify(rowsAt(st, 2))).not.toMatch(/secret/);
  });
});

// US-0030 FR1, FR2, FR4, FR5: true permission state per agent, the task and the activity in words, and old rows that say so.
describe('honest agent progress (US-0030)', () => {
  const dev = 'aidlc-developer-agent';
  const dispatch = (s, toolId, task, taskType = dev) => claude(s, 'toolStart', { tool: 'Agent', toolId, task, taskType, detail: task });
  const agent = (state, s, id = 'ag1') => rowsAt(state, s).find((r) => r.agentId === id);
  const started = () =>
    run([claude(0, 'prompt'), dispatch(1, 'm1', 'Code generation for US-0030'), claude(2, 'agentStart', { agentId: 'ag1', agentType: dev })]);

  it('puts an agent’s permission on its own row; main says it waits for that agent (FR1.1, FR1.2)', () => {
    const st = reduceActivity(started(), claude(3, 'waiting', { reason: 'permission', agentId: 'ag1', agentType: dev }));
    expect(agent(st, 3)).toMatchObject({ state: 'waiting', reason: 'permission' });
    expect(main(st, 3)).toMatchObject({ state: 'waiting', reason: 'agent', waitingFor: dev });
  });

  it('clears the wait on the answer, and on that agent’s next event (FR1.3)', () => {
    const waiting = reduceActivity(started(), claude(3, 'waiting', { reason: 'permission', agentId: 'ag1' }));
    const answered = reduceActivity(waiting, claude(4, 'answered', { agentId: 'ag1' }));
    expect(agent(answered, 4).state).toBe('working');
    expect(main(answered, 4)).toMatchObject({ state: 'tool', tool: 'Agent', reason: null, waitingFor: null });
    const moved = reduceActivity(waiting, claude(4, 'toolEnd', { toolId: 'x', agentId: 'ag1' }));
    expect(main(moved, 4).state).toBe('tool');
  });

  it('never says main waits for your permission while it waits for a background agent (FR1.4)', () => {
    let st = reduceActivity(started(), claude(3, 'stop'));
    expect(main(st, 3).reason).toBeNull();
    st = reduceActivity(st, claude(4, 'waiting', { reason: 'permission', agentId: 'ag1' }));
    expect(main(st, 4)).toMatchObject({ state: 'waiting', reason: 'agent' });
    expect(rowsAt(st, 4).filter((r) => r.kind === 'main' && r.reason === 'permission')).toEqual([]);
  });

  it('gives an agent the task of the Agent call that started it, by type and in order; none when unknown (FR2.1, FR2.2)', () => {
    const st = run([
      dispatch(0, 'm1', 'Review the plan', 'aidlc-quality-agent'),
      dispatch(1, 'm2', 'Write the code'),
      dispatch(2, 'm3', 'Write more code'),
      claude(3, 'agentStart', { agentId: 'a', agentType: dev }),
      claude(4, 'agentStart', { agentId: 'b', agentType: 'aidlc-quality-agent' }),
      claude(5, 'agentStart', { agentId: 'c', agentType: dev }),
      claude(6, 'agentStart', { agentId: 'd', agentType: 'Explore' })
    ]);
    expect(['a', 'b', 'c', 'd'].map((id) => agent(st, 6, id).task)).toEqual(['Write the code', 'Review the plan', 'Write more code', null]);
  });

  it('shows the open tool call’s description as the detail, none without one (FR4.1, FR4.2)', () => {
    let st = run([claude(0, 'toolStart', { tool: 'Bash', toolId: 'b', detail: 'Run the view tests' })]);
    expect(main(st, 0)).toMatchObject({ state: 'tool', tool: 'Bash', detail: 'Run the view tests' });
    st = reduceActivity(st, claude(1, 'toolStart', { tool: 'Read', toolId: 'r' }));
    expect(main(st, 1)).toMatchObject({ tool: 'Read', detail: null });
  });

  it('marks a row quiet for 30 s as stale, waiting rows included, until its next event (FR5.1, FR5.2)', () => {
    const st = reduceActivity(started(), claude(3, 'waiting', { reason: 'permission', agentId: 'ag1' }));
    expect(agent(st, 32.999)).toMatchObject({ state: 'waiting', stale: false, lastMs: T0 + 3000 });
    expect(agent(st, 33)).toMatchObject({ state: 'waiting', stale: true });
    expect(agent(reduceActivity(st, claude(40, 'answered', { agentId: 'ag1' })), 40).stale).toBe(false);
  });
});
