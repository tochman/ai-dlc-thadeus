// US-0214 FR2, FR3, FR4.1, NFR3: Agent progress from the hook activity rows, with the audit rows as the fallback when
// the app's hooks are missing or out of date. Swedish locale (the renderer project's setup).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';

const { default: AgentProgress } = await import('../../src/renderer/AgentProgress.jsx');

const hookFiles = (status) => [{ path: '.claude/settings.json', status }];
const harness = (id, status = 'current', used = true) => ({ harness: id, used, status, files: hookFiles(status) });
const row = (key, extra) => ({
  key,
  kind: 'main',
  parent: null,
  sessionId: 's1',
  tabId: 't1',
  harness: 'claude',
  agentId: null,
  agentType: null,
  state: 'working',
  tool: null,
  reason: null,
  error: null,
  sinceMs: Date.now(),
  ...extra
});
const AUDIT = [
  { kind: 'build', key: 'agent:dev', unit: null, agent: 'developer', stage: 'code-generation', minutes: 18, status: 'running', unreadable: null, steps: null }
];

let pushActivity;
function setup({ hooks = [harness('claude')], activity = [] } = {}) {
  window.bridge = {
    agentHooks: { status: vi.fn(async () => hooks), onChanged: vi.fn(() => () => {}) },
    agentActivity: {
      list: vi.fn(async () => activity),
      onChanged: vi.fn((fn) => {
        pushActivity = fn;
        return () => {};
      })
    }
  };
}
async function show(props) {
  render(<AgentProgress projectId="p1" rows={[]} live {...props} />);
  await act(async () => {});
}
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('Agent progress from the hook events (US-0214)', () => {
  it('labels each main chat with its harness and puts its agents under it (FR2.1, FR2.2)', async () => {
    setup({
      activity: [
        row('main:s1', { state: 'tool', tool: 'Agent' }),
        row('agent:s1:ag1', { kind: 'agent', parent: 'main:s1', agentId: 'ag1', agentType: 'aidlc-developer-agent', state: 'tool', tool: 'Bash' }),
        row('main:s2', { sessionId: 's2', tabId: 't2', harness: 'opencode', state: 'thinking' })
      ]
    });
    await show();
    const mains = screen.getAllByTestId('agent-progress-main');
    expect(mains.map((m) => m.textContent)).toEqual([expect.stringContaining('Huvudchatt · Claude Code'), expect.stringContaining('Huvudchatt · opencode')]);
    const agent = screen.getByTestId('agent-progress-agent');
    expect(agent.textContent).toContain('developer');
    expect(agent.className).toContain('agent-progress-row--child');
    const rows = screen.getAllByTestId(/^agent-progress-(main|agent)$/);
    expect(rows.map((r) => r.dataset.testid)).toEqual(['agent-progress-main', 'agent-progress-agent', 'agent-progress-main']);
    for (const r of rows) expect([r.getAttribute('tabindex'), r.className.includes('token-detail-row')]).toEqual(['0', true]);
  });

  it('shows each row’s state in words and how long it has been in it (FR3.1, FR3.2)', async () => {
    const now = Date.now();
    setup({
      activity: [
        row('main:s1', { state: 'tool', tool: 'Bash', sinceMs: now - 42_400 }),
        row('main:s2', { sessionId: 's2', state: 'waiting', reason: 'permission', sinceMs: now - 125_000 }),
        row('main:s3', { sessionId: 's3', state: 'error', error: 'rate_limit' })
      ]
    });
    await show();
    const [tool, waiting, error] = screen.getAllByTestId('agent-progress-main');
    expect(within(tool).getByTestId('agent-progress-state').textContent).toBe('kör Bash');
    expect(tool.textContent).toMatch(/42 s/);
    expect(within(waiting).getByTestId('agent-progress-state').textContent).toBe('väntar på ditt tillstånd');
    expect(waiting.textContent).toContain('2 min');
    expect(within(error).getByTestId('agent-progress-state').textContent).toBe('stoppad av ett fel: rate_limit');
  });

  it('says no agents are working only when every row is idle, and follows the pushes for its own project (FR2.4, FR2.3)', async () => {
    setup({ activity: [row('main:s1', { state: 'idle' })] });
    await show();
    expect(screen.getByTestId('agent-progress-empty').textContent).toBe('Inga agenter arbetar i den här intenten just nu.');
    act(() => pushActivity({ projectId: 'p2', rows: [row('main:x', { state: 'writing' })] }));
    expect(screen.queryAllByTestId('agent-progress-main')).toHaveLength(0);
    act(() => pushActivity({ projectId: 'p1', rows: [row('main:s1', { state: 'writing' })] }));
    expect(screen.getByTestId('agent-progress-main').textContent).toContain('skriver');
    expect(screen.queryByTestId('agent-progress-empty')).toBeNull();
  });

  it('with hooks missing or out of date, says so, offers the update and shows the audit rows; never "none are working" (FR4.1)', async () => {
    setup({ hooks: [harness('claude', 'outOfDate')], activity: [row('main:s1', { state: 'tool', tool: 'Bash' })] });
    await show({ rows: AUDIT });
    const notice = screen.getByTestId('agent-progress-hooks');
    expect(notice.textContent).toContain('Claude Code');
    expect(within(notice).getByTestId('agent-progress-hooks-action').textContent).toBe('Uppdatera');
    expect(screen.getAllByTestId('agent-progress-row')[0].textContent).toContain('18 min');
    expect(screen.queryAllByTestId('agent-progress-main')).toHaveLength(0);
    cleanup();
    setup({ hooks: [harness('claude', 'missing')] });
    await show({ rows: [] });
    expect(within(screen.getByTestId('agent-progress-hooks')).getByTestId('agent-progress-hooks-action').textContent).toBe('Installera');
    expect(screen.queryByTestId('agent-progress-empty')).toBeNull();
    expect(screen.getByTestId('agent-progress-unknown').textContent).toBe('Utan appens hooks går det inte att se vem som arbetar just nu.');
  });

  it('keeps the audit rows for a finished intent and while the hook status is unknown', async () => {
    setup();
    await show({ rows: AUDIT, live: false });
    expect(window.bridge.agentActivity.list).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('agent-progress-row')).toHaveLength(1);
    cleanup();
    window.bridge = {};
    await show({ rows: AUDIT });
    expect(screen.getAllByTestId('agent-progress-row')).toHaveLength(1);
    expect(screen.queryByTestId('agent-progress-hooks')).toBeNull();
  });

  it('asks for the project’s rows on open', async () => {
    setup({ activity: [row('main:s1', { state: 'writing' })] });
    await show();
    await waitFor(() => expect(window.bridge.agentActivity.list).toHaveBeenCalledWith('p1'));
    expect(screen.getByTestId('agent-progress-main')).toBeTruthy();
  });
});

// US-0030 FR1.2, FR2, FR3, FR4, FR5, NFR3: the task, the activity in words, main waiting for an agent, the step count on
// hook rows, and "seen N ago" on a row that has been quiet.
describe('honest agent progress (US-0030)', () => {
  const dev = (key, extra) => row(key, { kind: 'agent', parent: 'main:s1', agentId: key, agentType: 'aidlc-developer-agent', ...extra });
  afterEach(() => vi.useRealTimers());

  it('shows the task next to the agent’s name, and only the name when it is unknown (FR2.1, FR2.2)', async () => {
    setup({ activity: [row('main:s1'), dev('a', { task: 'Code generation for US-0030' }), dev('b')] });
    await show();
    const [withTask, without] = screen.getAllByTestId('agent-progress-agent');
    expect(within(withTask).getByTestId('agent-progress-task').textContent).toBe('Code generation for US-0030');
    expect(withTask.textContent).toContain('developer');
    expect(within(without).queryByTestId('agent-progress-task')).toBeNull();
  });

  it('says the tool call’s description, else “kör <tool>” (FR4.1, FR4.2)', async () => {
    setup({
      activity: [
        row('main:s1', { state: 'tool', tool: 'Bash', detail: 'Rerunning view tests after fixing expectation' }),
        row('main:s2', { sessionId: 's2', state: 'tool', tool: 'Read' })
      ]
    });
    await show();
    const [described, plain] = screen.getAllByTestId('agent-progress-state');
    expect(described.textContent).toBe('Rerunning view tests after fixing expectation');
    expect(plain.textContent).toBe('kör Read');
  });

  it('main says it waits for the agent, not for your permission (FR1.2)', async () => {
    setup({
      activity: [
        row('main:s1', { state: 'waiting', reason: 'agent', waitingFor: 'aidlc-developer-agent' }),
        dev('a', { state: 'waiting', reason: 'permission' })
      ]
    });
    await show();
    const [mainState, agentState] = screen.getAllByTestId('agent-progress-state');
    expect(mainState.textContent).toBe('väntar på developer');
    expect(agentState.textContent).toBe('väntar på ditt tillstånd');
  });

  it('gives a hook row the step count of its agent’s plan from the audit rows; none without a plan (FR3.1, FR3.2)', async () => {
    const audit = [{ ...AUDIT[0], steps: { done: 3, total: 10 } }];
    setup({ activity: [row('main:s1'), dev('a'), row('agent:s1:q', { kind: 'agent', parent: 'main:s1', agentId: 'q', agentType: 'aidlc-quality-agent' })] });
    await show({ rows: audit });
    const [build, review] = screen.getAllByTestId('agent-progress-agent');
    expect(within(build).getByTestId('agent-progress-steps').textContent).toBe('3 av 10 steg');
    expect(within(review).queryByTestId('agent-progress-steps')).toBeNull();
    expect(within(screen.getByTestId('agent-progress-main')).queryByTestId('agent-progress-steps')).toBeNull();
  });

  it('says when a quiet row was last seen, waiting rows included, and keeps it current (FR5.1, NFR3)', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
    const now = Date.now();
    setup({
      activity: [row('main:s1', { state: 'waiting', reason: 'permission', lastMs: now - 45_000 }), row('main:s2', { sessionId: 's2', lastMs: now - 1000 })]
    });
    await show();
    const [quiet, fresh] = screen.getAllByTestId('agent-progress-main');
    expect(within(quiet).getByTestId('agent-progress-seen').textContent).toBe('sågs för 45 s sedan');
    expect(within(fresh).queryByTestId('agent-progress-seen')).toBeNull();
    act(() => vi.advanceTimersByTime(10_000));
    expect(within(quiet).getByTestId('agent-progress-seen').textContent).toBe('sågs för 55 s sedan');
  });
});
