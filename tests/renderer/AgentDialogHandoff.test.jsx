// US-0213 FR3.1–FR3.4, FR5.3, NFR2 and US-0026 FR3.3: the handoff page of AgentDialog, Swedish locale.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AgentDialog, { GUARD_MS } from '../../src/renderer/AgentDialog.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { t } from '../../src/shared/i18n.js';

const handoffEvent = (over = {}, offer = {}) => ({
  eventId: 'h1',
  sessionId: 's1',
  projectId: 'p1',
  tabId: 'agent:claude',
  harness: 'claude',
  source: 'hook',
  kind: 'handoff',
  state: 'shown',
  arrivedAt: '2026-11-17T10:00:00.000Z',
  arrivedAtMs: 1,
  seq: 0,
  context: { intent: '261117-x', stage: 'code-generation' },
  handoff: { moment: 'threshold', tokens: 162_000, model: 'claude-opus-5-5', cost: 0.081, choices: ['compact', 'fresh', 'notNow'], gate: false, ...offer },
  lastError: null,
  via: null,
  endedBy: null,
  ...over
});

let onHandoff, onClose;
beforeEach(() => {
  window.bridge = { agentEvents: { close: vi.fn(async () => ({ state: 'dismissed' })), answer: vi.fn() } };
  onHandoff = vi.fn(async () => ({ ok: true }));
  onClose = vi.fn();
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function show(ev) {
  const r = render(
    <AgentDialog
      open
      events={[ev]}
      harnessOf={() => HARNESSES.find((h) => h.id === 'claude')}
      projectNameOf={() => 'aidlc-dash'}
      onOpenTerminal={vi.fn()}
      onClose={onClose}
      onHandoff={onHandoff}
    />
  );
  vi.setSystemTime(Date.now() + GUARD_MS);
  return r;
}
const choices = () => screen.getAllByTestId(/^agent-dialog-handoff-choice-/).map((b) => b.dataset.testid.replace('agent-dialog-handoff-choice-', ''));

describe('AgentDialog: handoff page (US-0213)', () => {
  it('shows the context size in tokens and the turn cost as an API-price estimate (FR3.4)', () => {
    show(handoffEvent());
    const size = screen.getByTestId('agent-dialog-handoff-size').textContent;
    expect(size).toContain('162,0 k'); // formatTokens, as the token view shows it
    expect(size).not.toMatch(/162[\s\u00a0]?000/);
    expect(screen.getByTestId('agent-dialog-handoff-cost').textContent).toContain('$0.08');
  });

  it('a model with no price says "price missing", never 0', () => {
    show(handoffEvent({}, { cost: null }));
    expect(screen.getByTestId('agent-dialog-handoff-cost').textContent).toBe(t('agentDialog.handoff.priceMissing'));
  });

  it('offers Compact, Fresh session and Not now at the moments, and only /clear and /clear + resume at a new session', () => {
    const { unmount } = show(handoffEvent());
    expect(choices()).toEqual(['compact', 'fresh', 'notNow']);
    unmount();
    show(handoffEvent({}, { moment: 'newSession', choices: ['clear', 'clearResume'], tokens: 12_000 }));
    expect(choices()).toEqual(['clear', 'clearResume']);
    expect(screen.queryByTestId('agent-dialog-handoff-choice-compact')).toBeNull();
  });

  it('at a gate, Fresh session says AI-DLC shows the gate again', () => {
    show(handoffEvent({}, { moment: 'gate', gate: true }));
    expect(screen.getByTestId('agent-dialog-handoff-gate-note').textContent).toBe(t('agentDialog.handoff.gateNote'));
  });

  it('a choice goes to onHandoff; while main waits for idle the page says so (FR5.3)', async () => {
    let wait;
    onHandoff.mockImplementation((ev, choice, { onWaiting }) => new Promise((resolve) => (wait = { onWaiting, resolve })));
    const { rerender } = show(handoffEvent());
    fireEvent.click(screen.getByTestId('agent-dialog-handoff-choice-compact'));
    expect(onHandoff).toHaveBeenCalledWith(expect.objectContaining({ eventId: 'h1' }), 'compact', expect.any(Object));
    rerender(<AgentDialog open events={[handoffEvent({ state: 'waiting' })]} onOpenTerminal={vi.fn()} onClose={onClose} onHandoff={onHandoff} />);
    expect(screen.getByTestId('agent-dialog-handoff-status').textContent).toBe(t('agentDialog.handoff.waiting'));
    expect(screen.getByTestId('agent-dialog-handoff-choice-fresh').disabled).toBe(true);
    wait.resolve({ ok: true });
  });

  it('Not now closes the page through the bridge; nothing is typed', async () => {
    show(handoffEvent());
    fireEvent.click(screen.getByTestId('agent-dialog-handoff-choice-notNow'));
    expect(window.bridge.agentEvents.close).toHaveBeenCalledWith('h1');
    expect(onHandoff).not.toHaveBeenCalled();
  });

  it('works by keyboard: a digit picks that choice; LCARS choice buttons', () => {
    show(handoffEvent());
    const dialog = screen.getByTestId('agent-dialog');
    fireEvent.keyDown(dialog, { key: '2' });
    expect(onHandoff).toHaveBeenCalledWith(expect.anything(), 'fresh', expect.any(Object));
    expect(screen.getByTestId('agent-dialog-handoff-choice-compact').className).toContain('question-popup-choice');
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe(t('agentDialog.handoff.title.threshold'));
  });

  it('a failed send says why on the page', async () => {
    onHandoff.mockResolvedValue({ ok: false, reason: 'notReady' });
    show(handoffEvent());
    fireEvent.click(screen.getByTestId('agent-dialog-handoff-choice-fresh'));
    expect(await screen.findByText(t('agentDialog.handoff.failed.notReady'))).toBeTruthy();
  });
});
