// US-0506 u1 LC10: AgentDialog in the Swedish locale with window.bridge.agentEvents stubbed (AC1.1.1–AC1.1.4,
// AC1.1.6–AC1.1.8, AC1.1.10, AC1.1.11; BR4.1–BR4.6; NFR3.5, NFR3.6, NFR6.1–NFR6.3, NFR7.1). The audit cases at the
// end are the 15 QuestionPopup cases (US-0505, EPIC-00 US-0004, US-0006), moved here with the agent-dialog-* ids.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import AgentDialog, { ARRIVAL_MS, GUARD_MS, OVERDUE_MS } from '../../src/renderer/AgentDialog.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { isSettled } from '../../src/shared/agentOrder.js';
import { adapters } from '../../src/main/agentAdapters.js';
import { auditEvent, pendingQuestions } from '../../src/main/questions.js';
import { mergeAudits } from '../../src/main/parsers/audit.js';
import { waitForAnswer } from '../../src/renderer/picker.js';
import { fixture } from '../fixtures/picker/index.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const harness = (id) => HARNESSES.find((h) => h.id === id);
const cp = (n) => String.fromCodePoint(n);

/** A hook AgentEvent as main pushes it, with the questions the adapter parsed from a fixture. */
function hookEvent(fixtureName = 'gate-2026-11-14', over = {}, h = 'claude') {
  const { questions } = adapters[h].parse('question', readFileSync(path.join(FIX, h, `${fixtureName}.json`)));
  return {
    eventId: `h-${fixtureName}`,
    sessionId: 's1',
    projectId: 'p1',
    tabId: `agent:${h}`,
    harness: h,
    source: 'hook',
    kind: 'question',
    state: 'shown',
    arrivedAt: '2026-11-14T10:00:00.000Z',
    arrivedAtMs: 1,
    seq: 1,
    context: { intent: '261114-agent-dialogs', stage: 'code-generation' },
    questions,
    lastError: null,
    via: null,
    endedBy: null,
    ...over
  };
}
const textQuestion = (text, over = {}) =>
  hookEvent('gate-2026-11-14', {
    questions: [{ header: 'Rubrik', text, truncated: false, options: [{ label: 'A', description: null }], multiSelect: false, allowOwn: true }],
    ...over
  });

let agentEvents;
beforeEach(() => {
  agentEvents = { answer: vi.fn(async () => ({ state: 'sent', via: 'hook' })), close: vi.fn(async () => ({ state: 'handedBack' })) };
  window.bridge = { agentEvents };
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true }); // the click guard reads Date.now()
});
/** Moves the clock past the click guard, as a person who read the page would be. */
const settle = () => vi.setSystemTime(Date.now() + GUARD_MS);
/** Renders the dialog and lets the guard pass, for the tests about what an answer does. */
function show(ui) {
  const result = render(ui);
  settle();
  const rerender = (next) => {
    result.rerender(next);
    settle();
  };
  return { ...result, rerender };
}
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const base = (over = {}) => ({
  open: true,
  harnessOf: () => harness('claude'),
  projectNameOf: () => 'aidlc-dash',
  onAuditSend: vi.fn(async () => ({ ok: true })),
  onOpenTerminal: vi.fn(),
  onClose: vi.fn(),
  ...over
});
const choices = () => screen.getAllByTestId('agent-dialog-choice');
const status = () => screen.getByTestId('agent-dialog-status').textContent;

describe('AgentDialog: hook questions', () => {
  it('M1: one question with descriptions in the agent order; a pick sends its index once (AC1.1.1, BR4.2)', async () => {
    show(<AgentDialog {...base()} events={[hookEvent()]} />);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Fråga: Agenten väntar på ditt svar');
    expect(choices().map((b) => b.textContent)).toEqual([
      '1Complete workflowApprove this stage and continue to Build and Test.',
      '2Request ChangesKeep the stage open and say what to change.'
    ]);
    expect(document.activeElement).toBe(screen.getByTestId('agent-dialog-title')); // never an answer (review fix 1)
    fireEvent.click(choices()[0]);
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    expect(agentEvents.answer).toHaveBeenCalledWith('h-gate-2026-11-14', { question: { picks: [[0]], own: [null] } });
  });

  it('M2: a batch of four on one page, each collapsing when answered, Send all only when all are answered (AC1.1.2, BR4.3)', () => {
    show(<AgentDialog {...base()} events={[hookEvent('batch-four')]} />);
    const blocks = screen.getAllByTestId('agent-dialog-question');
    expect(blocks).toHaveLength(4);
    const send = screen.getByTestId('agent-dialog-send');
    expect(send.disabled).toBe(true);
    expect(screen.getByTestId('agent-dialog-answered').textContent).toBe('0 av 4 besvarade');
    fireEvent.click(within(blocks[0]).getAllByTestId('agent-dialog-choice')[1]);
    expect(within(screen.getAllByTestId('agent-dialog-question')[0]).getByTestId('agent-dialog-summary').textContent).toBe('Language: English');
    const checks = within(screen.getAllByTestId('agent-dialog-question')[1]).getAllByTestId('agent-dialog-check');
    fireEvent.click(checks[0]);
    fireEvent.click(checks[1]);
    fireEvent.click(within(screen.getAllByTestId('agent-dialog-question')[1]).getByTestId('agent-dialog-done'));
    fireEvent.click(within(screen.getAllByTestId('agent-dialog-question')[2]).getAllByTestId('agent-dialog-choice')[0]);
    expect(screen.getByTestId('agent-dialog-answered').textContent).toBe('3 av 4 besvarade');
    expect(agentEvents.answer).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getAllByTestId('agent-dialog-question')[3]).getAllByTestId('agent-dialog-choice')[1]);
    expect(screen.getByTestId('agent-dialog-send').disabled).toBe(false);
    expect(screen.getByTestId('agent-dialog-send').textContent).toBe('Skicka alla svar');
    fireEvent.click(screen.getByTestId('agent-dialog-send'));
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    expect(agentEvents.answer).toHaveBeenCalledWith('h-batch-four', { question: { picks: [[1], [0, 1], [0], [1]], own: [null, null, null, null] } });
  });

  it('multi-select shows checkboxes and Done; two ticks send both indexes (BR4.4)', () => {
    show(<AgentDialog {...base()} events={[hookEvent('multi-two')]} />);
    const checks = screen.getAllByTestId('agent-dialog-check');
    expect(checks).toHaveLength(3);
    expect(screen.getByTestId('agent-dialog-done').disabled).toBe(true);
    fireEvent.click(checks[2]);
    fireEvent.click(checks[0]);
    fireEvent.click(screen.getByTestId('agent-dialog-done'));
    expect(agentEvents.answer).toHaveBeenCalledWith('h-multi-two', { question: { picks: [[0, 2]], own: [null] } });
  });

  it('an own answer sends its text (FR2.6)', () => {
    show(<AgentDialog {...base()} events={[hookEvent('own-answer')]} />);
    fireEvent.change(screen.getByTestId('agent-dialog-own'), { target: { value: 'Bryggan' } });
    fireEvent.submit(screen.getByTestId('agent-dialog-own'));
    expect(agentEvents.answer).toHaveBeenCalledWith('h-own-answer', { question: { picks: [[]], own: ['Bryggan'] } });
  });

  it('renders the Markdown body; raw HTML shows as text, no element and no on* attribute (AC1.1.3, NFR3.5, K7)', () => {
    const text =
      '# Rubrik\n\n- punkt\n\n`kod` och\n\n```\nblock\n```\n\n[docs](https://example.com) <script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><img src=x onerror="alert(1)">';
    show(<AgentDialog {...base()} events={[textQuestion(text)]} />);
    const dialog = screen.getByTestId('agent-dialog');
    expect(dialog.querySelector('h1').textContent).toBe('Rubrik');
    expect(dialog.querySelector('li').textContent).toBe('punkt');
    expect(dialog.querySelector('pre code').textContent).toBe('block\n');
    expect(dialog.querySelector('a.md-link').getAttribute('href')).toBe('https://example.com');
    for (const tag of ['script', 'style', 'iframe', 'img']) expect(dialog.querySelector(tag)).toBeNull();
    expect([...dialog.querySelectorAll('*')].some((el) => [...el.attributes].some((a) => a.name.startsWith('on')))).toBe(false);
    expect(dialog.textContent).toContain('<script>alert(1)</script>');
  });

  it('gives no anchor for javascript:, file: or data: links, and opens a link only on click (NFR3.6)', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(
      <AgentDialog {...base()} events={[textQuestion('[a](javascript:alert(1)) [b](file:///etc/passwd) [c](data:text/html,x) [d](https://ok.example)')]} />
    );
    const anchors = [...screen.getByTestId('agent-dialog').querySelectorAll('a')];
    expect(anchors.map((a) => a.getAttribute('href'))).toEqual(['https://ok.example']);
    expect(open).not.toHaveBeenCalled();
    expect(anchors[0].getAttribute('target')).toBe('_blank');
    open.mockRestore();
  });

  it('shows header and labels through visibleText; the answer is still the index (K8)', () => {
    const ev = hookEvent('gate-2026-11-14');
    ev.questions[0].header = `Val${cp(0x202e)}`;
    ev.questions[0].options[0].label = `Ja${cp(0x202e)}nej`;
    show(<AgentDialog {...base()} events={[ev]} />);
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Val\\u202e');
    expect(choices()[0].textContent).toContain('Ja\\u202enej');
    fireEvent.click(choices()[0]);
    expect(agentEvents.answer).toHaveBeenCalledWith(ev.eventId, { question: { picks: [[0]], own: [null] } });
  });

  it('removes invisible and bidi characters from the Markdown body, keeping line breaks (review fix 4)', () => {
    show(<AgentDialog {...base()} events={[textQuestion(`Ja${cp(0x202e)}nej\n\nrad${cp(0x200b)}två`)]} />);
    const body = screen.getByTestId('agent-dialog').querySelector('.markdown');
    expect(body.textContent).toContain('Janej');
    expect(body.textContent).toContain('radtvå');
    expect(body.querySelectorAll('p')).toHaveLength(2);
    expect(body.textContent).not.toContain(cp(0x202e));
  });

  it('a keystroke or click right after a page shows never answers; after GUARD_MS it does (review fix 1)', () => {
    const props = base();
    const { rerender } = render(<AgentDialog {...props} events={[hookEvent('reordered')]} />);
    const dialog = screen.getByTestId('agent-dialog');
    fireEvent.keyDown(dialog, { key: '1' });
    fireEvent.keyDown(dialog, { key: 'Enter' });
    fireEvent.click(choices()[0]);
    expect(agentEvents.answer).not.toHaveBeenCalled();
    settle();
    fireEvent.keyDown(dialog, { key: '2' });
    expect(agentEvents.answer).toHaveBeenCalledWith('h-reordered', { question: { picks: [[1]], own: [null] } });

    // A new page starts the guard again.
    rerender(<AgentDialog {...props} events={[hookEvent('gate-2026-11-14')]} />);
    fireEvent.keyDown(dialog, { key: '1' });
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    settle();
    fireEvent.keyDown(dialog, { key: '1' });
    expect(agentEvents.answer).toHaveBeenCalledTimes(2);
  });

  it('an audit page is guarded too: an early click sends nothing', () => {
    const props = base();
    render(<AgentDialog {...props} events={[auditEvent({ ...question(), id: 'g' })]} />);
    fireEvent.click(choices()[0]);
    expect(props.onAuditSend).not.toHaveBeenCalled();
    settle();
    fireEvent.click(choices()[0]);
    expect(props.onAuditSend).toHaveBeenCalledTimes(1);
  });

  it('names project, intent and stage from the context (AC1.1.4)', () => {
    show(<AgentDialog {...base()} events={[hookEvent()]} />);
    expect(screen.getByTestId('agent-dialog-where').textContent).toBe('aidlc-dash · 261114-agent-dialogs · code-generation');
  });

  it('a hook question page says it comes from the agent hooks; an audit page does not (US-1410 BR10.6)', () => {
    const { unmount } = show(<AgentDialog {...base()} events={[hookEvent()]} />);
    expect(screen.getByTestId('agent-dialog-source-hooks').textContent).toBe('Från agentens hooks');
    unmount();
    show(<AgentDialog {...base()} events={[audit()]} />); // `audit` is defined below, before any test runs
    expect(screen.queryByTestId('agent-dialog-source-hooks')).toBeNull();
  });

  it.each([
    [{ state: 'sending' }, 'Skickar…'],
    [{ state: 'sent', via: 'hook' }, 'Skickat till Claude Code.'],
    [{ state: 'handedBack' }, 'Lämnad tillbaka till terminalen.'],
    [{ state: 'timedOut' }, 'Frågan väntade för länge och visas nu i terminalen. Du kan fortfarande svara här.'],
    [{ state: 'shown', lastError: 'Agentens val visas inte i terminalen.' }, 'Kunde inte skicka: Agentens val visas inte i terminalen.'],
    [{ state: 'ended', endedBy: 'session' }, 'Sessionen i Claude Code avslutades. Inget skickades.']
  ])('names the state %o in words (NFR6.3)', (over, text) => {
    show(<AgentDialog {...base()} events={[hookEvent('own-answer', over)]} />);
    expect(status()).toBe(text);
  });

  it('a failed send keeps the own-answer text and offers Open the terminal (AC1.1.8, BR3.4)', async () => {
    agentEvents.answer.mockRejectedValueOnce(new Error("Error invoking remote method 'agentEvents:answer': Error: Agentens val visas inte i terminalen."));
    const props = base();
    const { rerender } = show(<AgentDialog {...props} events={[hookEvent('own-answer')]} />);
    fireEvent.change(screen.getByTestId('agent-dialog-own'), { target: { value: 'Mitt svar' } });
    fireEvent.submit(screen.getByTestId('agent-dialog-own'));
    await waitFor(() => expect(status()).toBe('Kunde inte skicka: Agentens val visas inte i terminalen.'));
    rerender(<AgentDialog {...props} events={[hookEvent('own-answer', { lastError: 'Agentens val visas inte i terminalen.' })]} />);
    expect(screen.getByTestId('agent-dialog-own').value).toBe('Mitt svar');
    fireEvent.click(screen.getByTestId('agent-dialog-terminal'));
    await waitFor(() => expect(props.onOpenTerminal).toHaveBeenCalledTimes(1));
  });

  it('for opencode says the question is also open in the terminal', () => {
    show(<AgentDialog {...base()} events={[hookEvent('gate-2026-11-14', {}, 'opencode')]} />);
    expect(screen.getByText('Frågan visas också i terminalen.')).toBeTruthy();
  });

  it('a cut question says the full text is in the terminal (AC1.1.10)', () => {
    const ev = hookEvent();
    ev.questions[0].truncated = true;
    show(<AgentDialog {...base()} events={[ev]} />);
    expect(screen.getByText('Texten är förkortad. Hela texten finns i terminalen.')).toBeTruthy();
  });

  it('a second event while a page is shown keeps the page and counts +1 ny, then +2 nya (NFR5.9, BR2.1)', () => {
    const props = base();
    const first = hookEvent('gate-2026-11-14');
    const { rerender } = show(<AgentDialog {...props} events={[first]} />);
    rerender(<AgentDialog {...props} events={[first, hookEvent('reordered', { eventId: 'h2', sessionId: 's2', arrivedAtMs: 2 })]} />);
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Stage gate');
    expect(screen.getByTestId('agent-dialog-new-count').textContent).toBe('+1 ny');
    rerender(
      <AgentDialog
        {...props}
        events={[
          first,
          hookEvent('reordered', { eventId: 'h2', sessionId: 's2', arrivedAtMs: 2 }),
          hookEvent('own-answer', { eventId: 'h3', sessionId: 's3', arrivedAtMs: 3 })
        ]}
      />
    );
    expect(screen.getByTestId('agent-dialog-new-count').textContent).toBe('+2 nya');
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Database');
  });

  it('works by keyboard: digits pick, Space ticks, Enter sends, Esc closes; digits in the own field are text (NFR6.1, NFR6.2, AC1.1.11)', async () => {
    const props = base();
    const { unmount } = show(<AgentDialog {...props} events={[hookEvent('reordered')]} />);
    const dialog = screen.getByTestId('agent-dialog');
    fireEvent.keyDown(dialog, { key: '3' });
    expect(agentEvents.answer).toHaveBeenLastCalledWith('h-reordered', { question: { picks: [[2]], own: [null] } });
    unmount();

    show(<AgentDialog {...props} events={[hookEvent('multi-two')]} />);
    fireEvent.keyDown(screen.getByTestId('agent-dialog'), { key: '2' });
    screen.getAllByTestId('agent-dialog-check')[0].focus();
    fireEvent.keyDown(document.activeElement, { key: ' ' });
    fireEvent.keyDown(screen.getByTestId('agent-dialog'), { key: 'Enter' });
    expect(agentEvents.answer).toHaveBeenLastCalledWith('h-multi-two', { question: { picks: [[0, 1]], own: [null] } });
    cleanup();

    show(<AgentDialog {...props} events={[hookEvent('own-answer')]} />);
    const own = screen.getByTestId('agent-dialog-own');
    own.focus();
    fireEvent.keyDown(own, { key: '1' });
    expect(agentEvents.answer).toHaveBeenCalledTimes(2);
    fireEvent(screen.getByTestId('agent-dialog'), new Event('cancel', { cancelable: true })); // what Esc fires on a modal dialog
    await waitFor(() => expect(agentEvents.close).toHaveBeenCalledWith('h-own-answer'));
    expect(props.onClose).toHaveBeenCalled();
  });

  it('starts calm and turns red at OVERDUE_MS with the still-waiting title (BR4.6)', () => {
    vi.useRealTimers(); // leave the Date-only fake of beforeEach
    vi.useFakeTimers();
    show(<AgentDialog {...base()} events={[hookEvent()]} />);
    const dialog = screen.getByTestId('agent-dialog');
    expect(dialog.classList.contains('is-calm')).toBe(true);
    act(() => vi.advanceTimersByTime(OVERDUE_MS));
    expect(dialog.classList.contains('is-overdue')).toBe(true);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Fråga: Agenten väntar fortfarande på ditt svar');
  });

  it('Send works without the stamp member; with it, the answer call is made in the same tick as the click (NFR1.7)', () => {
    const { unmount } = show(<AgentDialog {...base()} events={[hookEvent()]} />);
    fireEvent.click(choices()[0]);
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    unmount();
    agentEvents.stamp = vi.fn();
    show(<AgentDialog {...base()} events={[hookEvent()]} />);
    fireEvent.click(choices()[1]);
    expect(agentEvents.stamp).toHaveBeenCalledWith('h-gate-2026-11-14', 'answerClicked');
    expect(agentEvents.answer).toHaveBeenCalledTimes(2);
  });

  it('Close hands a hook question back and closes the dialog (AC1.1.6)', async () => {
    const props = base();
    show(<AgentDialog {...props} events={[hookEvent()]} />);
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    await waitFor(() => expect(agentEvents.close).toHaveBeenCalledWith('h-gate-2026-11-14'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});

// The moved QuestionPopup cases: audit events from today's audit-log questions, answered through onAuditSend.
const question = (over = {}) => ({
  id: '8c1829d0',
  projectId: 'p1',
  projectName: 'aidlc-dash',
  intent: '261113-question-popup',
  stage: 'requirements-analysis',
  unit: null,
  kind: 'question',
  text: 'Var ska popupen <b>visas</b>?',
  options: ['A', 'B', 'X'],
  nextStage: null,
  timeMs: 1,
  early: false,
  ...over
});
const audit = (over) => auditEvent(question(over));

describe('AgentDialog: audit fallback (US-0505, BR3.6, ADR-006)', () => {
  it('shows the question as text, where it waits, and its options as numbered buttons (FR2.2, NFR5)', () => {
    const props = base();
    const older = audit({ id: 'q0', text: 'Äldre fråga?', early: true });
    show(<AgentDialog {...props} events={[audit(), older]} />);
    const dialog = screen.getByTestId('agent-dialog');
    expect(dialog.getAttribute('aria-labelledby')).toBe('agent-dialog-title');
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('AI-DLC väntar på ditt svar');
    expect(within(dialog).getByText('aidlc-dash · 261113-question-popup · requirements-analysis')).toBeTruthy();
    expect(within(dialog).getByText('Var ska popupen <b>visas</b>?')).toBeTruthy();
    expect(dialog.querySelector('b')).toBeNull();
    expect(choices().map((b) => b.textContent)).toEqual(['1A', '2B', '3X']);
    expect(document.activeElement).toBe(screen.getByTestId('agent-dialog-title'));
    expect(within(dialog).getByText('1 av 2')).toBeTruthy();
    expect(dialog.querySelector('[role="status"], [role="alert"]')).toBeNull();
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    expect(within(dialog).getByText('Väntade redan när appen startade')).toBeTruthy();
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(agentEvents.close).not.toHaveBeenCalled();
  });

  // US-0050 item 3: paging to another question slides the new page in, with full motion only.
  it('slides the next page in when paging, with full motion only', () => {
    const page = () => screen.getByTestId('agent-dialog-page');
    try {
      document.documentElement.dataset.motion = 'full';
      show(<AgentDialog {...base()} events={[audit(), audit({ id: 'q0', text: 'Äldre fråga?' })]} />);
      const first = page();
      expect(first.classList.contains('lcars-tab-in')).toBe(false);
      fireEvent.click(screen.getByTestId('agent-dialog-next'));
      expect(page()).not.toBe(first);
      expect(page().classList.contains('lcars-tab-in')).toBe(true);
      cleanup();
      document.documentElement.dataset.motion = 'reduced';
      show(<AgentDialog {...base()} events={[audit(), audit({ id: 'q0', text: 'Äldre fråga?' })]} />);
      fireEvent.click(screen.getByTestId('agent-dialog-next'));
      expect(page().classList.contains('lcars-tab-in')).toBe(false);
    } finally {
      delete document.documentElement.dataset.motion;
    }
  });

  it('an option sends its number to that project and says so, staying on the question until it leaves', async () => {
    const props = base({ harnessOf: (id) => (id === 'p2' ? harness('claude') : null) });
    const q = audit({ projectId: 'p2' });
    const { rerender } = show(<AgentDialog {...props} events={[q, audit({ id: 'next', projectId: 'p2', text: 'Nästa fråga?' })]} />);
    fireEvent.click(choices()[1]);
    expect(props.onAuditSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0', projectId: 'p2' }), { index: 1 });
    await waitFor(() => expect(status()).toBe('Skickat till Claude'));
    expect(choices().every((b) => b.disabled)).toBe(true);
    expect(props.onOpenTerminal).not.toHaveBeenCalled();
    const newer = audit({ id: 'newer', projectId: 'p2', text: 'Ny fråga?', timeMs: 3 });
    rerender(<AgentDialog {...props} events={[newer, q]} />);
    expect(screen.getByText('Var ska popupen <b>visas</b>?')).toBeTruthy();
    rerender(<AgentDialog {...props} events={[newer]} />);
    expect(screen.getByText('Ny fråga?')).toBeTruthy();
    expect(screen.queryByTestId('agent-dialog-status')).toBeNull();
    expect(agentEvents.answer).not.toHaveBeenCalled();
  });

  it('a gate offers Approve (1) and Request changes (2)', () => {
    const props = base();
    show(<AgentDialog {...props} events={[audit({ id: 'g1', kind: 'gate', stage: 'code-generation', nextStage: 'build-and-test', text: '', options: [] })]} />);
    expect(screen.getByText('Godkännande: code-generation → build-and-test')).toBeTruthy();
    const [approve, changes] = choices();
    expect(approve.textContent).toBe('1Godkänn');
    expect(changes.textContent).toBe('2Begär ändringar');
    fireEvent.click(changes);
    expect(props.onAuditSend).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }), { index: 1 });
  });

  it('the own answer types its text; a failed send says why', async () => {
    const props = base({ onAuditSend: vi.fn(async () => ({ ok: false, error: 'Agentfliken kör inte.' })) });
    show(<AgentDialog {...props} events={[audit()]} />);
    expect(screen.getByTestId('agent-dialog-own-send').disabled).toBe(true);
    fireEvent.change(screen.getByTestId('agent-dialog-own'), { target: { value: 'Både och' } });
    fireEvent.click(screen.getByTestId('agent-dialog-own-send'));
    expect(props.onAuditSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0' }), { own: 'Både och' });
    await waitFor(() => expect(status()).toBe('Kunde inte skicka: Agentfliken kör inte.'));
  });

  it('without number keys (opencode) or a running agent only the own answer or the terminal is offered', () => {
    const { rerender } = show(<AgentDialog {...base({ harnessOf: () => harness('opencode') })} events={[audit()]} />);
    expect(screen.queryAllByTestId('agent-dialog-choice')).toEqual([]);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A', 'B', 'X']);
    expect(screen.getByTestId('agent-dialog-own').disabled).toBe(false);
    rerender(<AgentDialog {...base({ harnessOf: () => null })} events={[audit()]} />);
    expect(screen.getByTestId('agent-dialog-own').disabled).toBe(true);
  });

  it('Open the terminal closes the dialog first and opens the terminal after that (F-01)', async () => {
    const dialog = () => screen.getByTestId('agent-dialog');
    let openWhenCalled;
    const onOpenTerminal = vi.fn(() => {
      openWhenCalled = dialog().open || dialog().hasAttribute('open');
    });
    show(<AgentDialog {...base({ onOpenTerminal })} events={[audit()]} />);
    expect(dialog().hasAttribute('open')).toBe(true);
    fireEvent.click(screen.getByTestId('agent-dialog-terminal'));
    expect(onOpenTerminal).not.toHaveBeenCalled();
    expect(dialog().hasAttribute('open')).toBe(false);
    await waitFor(() => expect(onOpenTerminal).toHaveBeenCalledTimes(1));
    expect(onOpenTerminal).toHaveBeenCalledWith(expect.objectContaining({ eventId: audit().eventId, projectId: 'p1' }));
    expect(openWhenCalled).toBe(false);
  });

  it('shows Previous, the position and Next only with more than one item (US-0018)', () => {
    const props = base();
    const { rerender } = show(<AgentDialog {...props} events={[audit()]} />);
    expect(screen.queryByTestId('agent-dialog-prev')).toBeNull();
    expect(screen.queryByTestId('agent-dialog-next')).toBeNull();
    expect(screen.queryByText('1 av 1')).toBeNull();
    rerender(<AgentDialog {...props} events={[audit(), audit({ id: 'two', timeMs: 2 })]} />);
    expect(screen.getByTestId('agent-dialog-next')).toBeTruthy();
    expect(screen.getByText('1 av 2')).toBeTruthy();
  });

  it('starts calm and turns red after OVERDUE_MS, reset by a new question', () => {
    vi.useRealTimers(); // leave the Date-only fake of beforeEach
    vi.useFakeTimers();
    const props = base();
    const { rerender } = show(<AgentDialog {...props} events={[audit()]} />);
    const dialog = screen.getByTestId('agent-dialog');
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 1));
    expect(dialog.classList.contains('is-overdue')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(dialog.classList.contains('is-overdue')).toBe(true);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Väntar fortfarande på ditt svar');
    rerender(<AgentDialog {...props} events={[audit({ id: 'new', timeMs: 2 })]} />);
    expect(dialog.classList.contains('is-calm')).toBe(true);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('AI-DLC väntar på ditt svar');
  });

  it('a refused send offers only the terminal; a sent answer still waiting after ARRIVAL_MS may be lost (EPIC-00 US-0004)', async () => {
    const refused = base({ onAuditSend: vi.fn(async () => ({ ok: false, error: 'Claude ställer flera frågor på en gång. Svara i terminalen.' })) });
    const { unmount } = show(<AgentDialog {...refused} events={[audit()]} />);
    fireEvent.click(choices()[0]);
    await waitFor(() => expect(status()).toContain('flera frågor'));
    expect(choices().every((b) => b.disabled)).toBe(true);
    expect(screen.getByTestId('agent-dialog-own').disabled).toBe(true);
    expect(screen.getByTestId('agent-dialog-terminal').disabled).toBe(false);
    unmount();

    vi.useRealTimers(); // leave the Date-only fake of beforeEach
    vi.useFakeTimers();
    const props = base();
    show(<AgentDialog {...props} events={[audit()]} />);
    await act(async () => fireEvent.click(choices()[0]));
    expect(status()).toBe('Skickat till Claude');
    act(() => vi.advanceTimersByTime(ARRIVAL_MS));
    expect(status()).toContain('kanske inte kom fram');
    expect(props.onAuditSend).toHaveBeenCalledTimes(1);
  });

  it('a notification focus opens the question it names', () => {
    show(<AgentDialog {...base()} events={[audit(), audit({ id: 'other', text: 'Den andra?' })]} focus={{ id: 'other' }} />);
    expect(screen.getByText('Den andra?')).toBeTruthy();
  });
});

describe('AgentDialog: audit fallback against the real picker (EPIC-00 US-0006)', () => {
  const where = { project: { projectId: 'p1', name: 'aidlc-dash' }, intent: '261114-custom-plans' };
  const block = (fields, i) =>
    Object.entries({ Timestamp: new Date(Date.UTC(2026, 10, 14, 9, 0, i)).toISOString(), ...fields })
      .map(([k, v]) => `**${k}**: ${v}`)
      .join('\n');
  const auditLog = (...rows) => mergeAudits([{ source: 'host.md', text: rows.map(block).join('\n\n---\n\n') }]);
  const asked = {
    Event: 'DECISION_RECORDED',
    Stage: 'requirements-analysis',
    Decision: 'How would you like to answer the questions?',
    Options: "Guide me (walk through each question interactively here),I'll edit the file (fill in the file),Chat (discuss freely; you extract the decisions)",
    'Question Id': '6530554d'
  };
  const events = (rows) => pendingQuestions(rows, where).map(auditEvent);

  it('sends the key of the picker drawn after the click, and closes on the following QUESTION_ANSWERED', async () => {
    let lines = fixture('no-picker');
    const typed = [];
    const onAuditSend = vi.fn(async (q, answer) => {
      const { found } = await waitForAnswer(() => [{ tab: 'agent:0', lines }], q, answer, { waitMs: 3000, stepMs: 50 });
      if (found.error) return { ok: false, error: found.error };
      typed.push(...found.keys);
      return { ok: true };
    });
    const before = events(auditLog(asked));
    expect(before.map((e) => e.audit.options)).toEqual([['Guide me', "I'll edit the file", 'Chat']]);
    const { rerender } = show(<AgentDialog {...base({ onAuditSend })} events={before} />);
    fireEvent.click(choices()[0]);
    expect(choices().every((b) => b.disabled)).toBe(true);
    expect(screen.queryByTestId('agent-dialog-status')).toBeNull();
    setTimeout(() => (lines = fixture('single')), 300);
    await waitFor(() => expect(status()).toBe('Skickat till Claude'), { timeout: 3000 });
    expect(typed).toEqual(['1']);
    expect(onAuditSend).toHaveBeenCalledTimes(1);
    const after = events(auditLog(asked, { Event: 'QUESTION_ANSWERED', Stage: 'requirements-analysis', 'Person Reply': 'Guide me' }));
    rerender(<AgentDialog {...base({ onAuditSend })} events={after} />);
    expect(screen.queryByTestId('agent-dialog-title')).toBeNull();
  });

  it('a batch question offers only the terminal and says why', () => {
    const [ev] = events(auditLog({ ...asked, Decision: 'Q1, Q2', Options: '|Q1: A. Every switch|Q1: B. Only|Q2: A. Here|Q2: B. There' }));
    show(<AgentDialog {...base()} events={[ev]} />);
    expect(screen.queryAllByTestId('agent-dialog-choice')).toEqual([]);
    expect(screen.getByTestId('agent-dialog-batch').textContent).toContain('Q1: A. Every switch / B. Only');
    expect(screen.getByTestId('agent-dialog-batch-note').textContent).toBe(
      'AI-DLC ställer 2 frågor på en gång, och dem kan popupen inte svara på. Svara i terminalen.'
    );
    expect(screen.getByTestId('agent-dialog-own').disabled).toBe(true);
    expect(screen.getByTestId('agent-dialog-terminal').disabled).toBe(false);
  });

  it('a plan-approval ask is named and offers its exact options', () => {
    const [ev] = events(
      auditLog({
        Event: 'QUESTION_ASKED',
        'Question Id': '32a59f72',
        'Question Type': 'plan-approval',
        Stage: 'code-generation',
        Options: '["Approve Plan","Request Changes","I\'ll edit the files"]'
      })
    );
    show(<AgentDialog {...base()} events={[ev]} />);
    expect(screen.getByText('Godkänn planen för code-generation')).toBeTruthy();
    expect(choices().map((b) => b.textContent)).toEqual(['1Approve Plan', '2Request Changes', "3I'll edit the files"]);
  });
});

// US-0506 u2 LC10: permission pages (AC2.1.1–AC2.1.4; BR5.5, BR5.6, BR5.9, BR5.10, BR5.13; NFR3.14, NFR3.16,
// NFR6.4–NFR6.6, NFR7.3; PD8, SD9, K8–K11).
describe('AgentDialog: permission pages', () => {
  /** A permission AgentEvent as main pushes it, built by the real adapter from a fixture (or a payload). */
  function permissionEvent(fixtureName = 'permission-bash', over = {}, h = 'claude', payload) {
    const bytes = payload ? Buffer.from(JSON.stringify(payload)) : readFileSync(path.join(FIX, h, `${fixtureName}.json`));
    const { permission, toolCallId } = adapters[h].parse('permission', bytes);
    return {
      eventId: `p-${fixtureName}`,
      sessionId: 's1',
      projectId: 'p1',
      tabId: `agent:${h}`,
      harness: h,
      source: 'hook',
      kind: 'permission',
      state: 'shown',
      arrivedAt: '2026-11-14T10:00:00.000Z',
      arrivedAtMs: 1,
      seq: 1,
      context: { intent: '261114-agent-dialogs', stage: 'code-generation' },
      permission,
      toolCallId,
      lastError: null,
      via: null,
      endedBy: null,
      ...over
    };
  }
  const pchoices = () => screen.getAllByTestId('agent-dialog-permission-choice');
  const dialog = () => screen.getByTestId('agent-dialog');
  const key = (k, target = dialog()) => fireEvent.keyDown(target, { key: k });
  const later = (ms) => vi.setSystemTime(Date.now() + ms);
  const payload = (over) => ({ ...JSON.parse(readFileSync(path.join(FIX, 'claude', 'permission-bash.json'), 'utf8')), ...over });

  it('a permission page says it comes from the agent hooks (US-1410 BR10.6)', () => {
    show(<AgentDialog {...base()} events={[permissionEvent()]} />);
    expect(screen.getByTestId('agent-dialog-source-hooks').textContent).toBe('Från agentens hooks');
  });

  it('M3: the kind and "<harness> ber om behörighet", where, what, detail, cwd and the choices in order (BR5.13, AC2.1.1)', () => {
    show(<AgentDialog {...base()} events={[permissionEvent()]} />);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('BEHÖRIGHET: Claude Code ber om behörighet');
    expect(screen.getByTestId('agent-dialog-where').textContent).toBe('aidlc-dash · 261114-agent-dialogs · code-generation');
    expect(screen.getByTestId('agent-dialog-what').textContent).toBe('Bash');
    const detail = screen.getByTestId('agent-dialog-detail');
    expect(detail.classList.contains('agent-dialog-detail')).toBe(true);
    expect(detail.childNodes).toHaveLength(1);
    expect(detail.firstChild.nodeType).toBe(Node.TEXT_NODE);
    expect(detail.textContent).toBe('git push origin feat/US-0506');
    expect(screen.getByTestId('agent-dialog-cwd').textContent).toBe('Mapp: /Users/dev/Projects/aidlc-dash');
    expect(pchoices().map((b) => b.textContent)).toEqual(['1Tillåt en gång', '2Tillåt alltid:\nlocalSettings: Bash(git push:*)', '3Neka']);
    expect(pchoices().map((b) => b.dataset.effect)).toEqual(['allowOnce', 'allowAlways', 'deny']);
    const deny = pchoices()[2];
    expect(deny.classList.contains('is-refusing')).toBe(true);
    expect(deny.previousElementSibling.tagName).toBe('HR');
    expect(
      pchoices()
        .slice(0, 2)
        .some((b) => b.classList.contains('is-refusing'))
    ).toBe(false);
  });

  it('shows every detail as plain text: no script, img or link element, ANSI and bidi as escapes (SD9, NFR3.16)', () => {
    const command = `<script>alert(1)</script> <img src=x onerror=alert(1)> [klick](https://evil.example) ${'\x1b'}[31mröd ${cp(0x202e)}vänd`;
    show(<AgentDialog {...base()} events={[permissionEvent('x', {}, 'claude', payload({ tool_input: { command } }))]} />);
    expect(dialog().querySelector('script, img, a')).toBeNull();
    const text = screen.getByTestId('agent-dialog-detail').textContent;
    expect(text).toContain('<script>alert(1)</script>');
    expect(text).toContain('[klick](https://evil.example)');
    expect(text).toContain('\\u001b[31m');
    expect(text).toContain('\\u202evänd');
  });

  it('Allow always shows its whole label and every rule line, with no ellipsis; too long says so (SD11)', () => {
    const { unmount } = show(<AgentDialog {...base()} events={[permissionEvent('permission-bash-dirs')]} />);
    const always = pchoices()[1];
    expect(always.textContent).toBe(`2${permissionEvent('permission-bash-dirs').permission.choices[1].label}`);
    for (const line of ['projectSettings: Bash(ls:*)', 'projectSettings: Read', 'session: /Users/dev/Projects/shared-assets'])
      expect(always.textContent).toContain(line);
    for (const el of [always, ...always.querySelectorAll('*')]) expect(getComputedStyle(el).textOverflow).not.toBe('ellipsis');
    expect(screen.queryByTestId('agent-dialog-permission-note')).toBeNull();
    unmount();
    const rules = Array.from({ length: 9 }, (_, i) => ({ toolName: 'Bash', ruleContent: `r${i}` }));
    show(
      <AgentDialog
        {...base()}
        events={[
          permissionEvent(
            'long',
            {},
            'claude',
            payload({ permission_suggestions: [{ type: 'addRules', rules, behavior: 'allow', destination: 'localSettings' }] })
          )
        ]}
      />
    );
    expect(pchoices()[1].disabled).toBe(true);
    expect(pchoices()[1].textContent).toBe('2Tillåt alltid');
    expect(screen.getByTestId('agent-dialog-permission-note').textContent).toBe('För långt för att visas här. Använd terminalen för Tillåt alltid.');
  });

  it('preselects nothing: focus on the title, no aria-selected, aria-pressed or autofocus; Enter on the title sends nothing (NFR3.14, NFR6.4)', () => {
    show(<AgentDialog {...base()} events={[permissionEvent()]} />);
    expect(document.activeElement).toBe(screen.getByTestId('agent-dialog-title'));
    for (const b of pchoices()) for (const attr of ['aria-selected', 'aria-pressed', 'autofocus']) expect(b.hasAttribute(attr)).toBe(false);
    key('Enter', document.activeElement);
    expect(agentEvents.answer).not.toHaveBeenCalled();
  });

  it('the guard swallows keys, clicks and Esc for GUARD_MS, restarts on a new page and on window focus (PD8, K8, R-03)', () => {
    const props = base();
    const two = [permissionEvent(), permissionEvent('permission-edit')];
    render(<AgentDialog {...props} events={two} />);
    for (const at of [0, 100, 199]) {
      if (at) later(at === 100 ? 100 : 99);
      key('1');
      key('Enter', document.activeElement);
    }
    fireEvent.click(pchoices()[0]); // at 199 ms
    later(200); // 399 ms
    key('1');
    key('Enter', document.activeElement);
    fireEvent(dialog(), new Event('cancel', { cancelable: true })); // Esc
    expect(agentEvents.answer).not.toHaveBeenCalled();
    expect(agentEvents.close).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    expect(pchoices()).not.toContain(document.activeElement);
    later(1);
    key('1');
    expect(document.activeElement).toBe(pchoices()[0]);
    key('Enter', document.activeElement);
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    expect(agentEvents.answer).toHaveBeenCalledWith('p-permission-bash', { permission: { choice: 0 } });

    fireEvent.click(screen.getByTestId('agent-dialog-next')); // a new page starts the guard again
    expect(screen.getByTestId('agent-dialog-what').textContent).toBe('Edit');
    key('1');
    expect(pchoices()).not.toContain(document.activeElement);
    settle();
    act(() => window.dispatchEvent(new Event('focus'))); // the window came back: the guard starts again
    key('1');
    expect(pchoices()).not.toContain(document.activeElement);
    settle();
    key('1');
    expect(document.activeElement).toBe(pchoices()[0]);
  });

  it('works by keyboard alone: a digit only focuses, ↓ moves, Enter sends the focused choice, Esc closes (NFR6.5, K9)', async () => {
    for (const [digit, choice] of [
      ['1', 0],
      ['2', 1],
      ['3', 2]
    ]) {
      const { unmount } = show(<AgentDialog {...base()} events={[permissionEvent()]} />);
      key(digit);
      expect(document.activeElement).toBe(pchoices()[choice]);
      expect(agentEvents.answer).not.toHaveBeenCalledWith('p-permission-bash', { permission: { choice } });
      key('Enter', document.activeElement);
      expect(agentEvents.answer).toHaveBeenLastCalledWith('p-permission-bash', { permission: { choice } });
      unmount();
    }
    const props = base();
    show(<AgentDialog {...props} events={[permissionEvent()]} />);
    key('1');
    key('ArrowDown', document.activeElement);
    expect(document.activeElement).toBe(pchoices()[1]);
    key('ArrowUp', document.activeElement);
    expect(document.activeElement).toBe(pchoices()[0]);
    const calls = agentEvents.answer.mock.calls.length;
    fireEvent(dialog(), new Event('cancel', { cancelable: true }));
    await waitFor(() => expect(agentEvents.close).toHaveBeenCalledWith('p-permission-bash'));
    expect(agentEvents.answer.mock.calls.length).toBe(calls);
  });

  it.each([
    ['sending', { state: 'sending' }, 'Skickar…'],
    ['sent', { state: 'sent', via: 'hook' }, 'Skickat till Claude Code.'],
    ['timedOut', { state: 'timedOut' }, 'Claude Code slutade vänta på dialogen. Svara i terminalen.'],
    ['failed', { lastError: 'Agenten tog inte emot svaret.' }, 'Kunde inte skicka: Agenten tog inte emot svaret.'],
    ['ended in the terminal', { state: 'ended', endedBy: 'terminal' }, 'Besvarad i terminalen.'],
    ['ended by the session', { state: 'ended', endedBy: 'session' }, 'Sessionen i Claude Code avslutades. Inget skickades.']
  ])('state %s says so (NFR6.6, BR5.9, BR5.11)', (_name, over, text) => {
    show(<AgentDialog {...base()} events={[permissionEvent('permission-bash', over)]} />);
    expect(screen.getByTestId('agent-dialog-status').textContent).toBe(text);
  });

  it('timedOut: every choice disabled, Open the terminal and Close still work (AC2.1.3)', async () => {
    const ev = permissionEvent();
    const props = base();
    show(
      <AgentDialog
        {...props}
        events={[{ ...ev, state: 'timedOut', permission: { ...ev.permission, choices: ev.permission.choices.map((c) => ({ ...c, enabled: false })) } }]}
      />
    );
    expect(pchoices().every((b) => b.disabled)).toBe(true);
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    await waitFor(() => expect(agentEvents.close).toHaveBeenCalled());
    expect(props.onClose).toHaveBeenCalled();
  });

  it('a failed send keeps the choice enabled; a cut command disables both allows and keeps Deny (BR5.5, SCD8)', () => {
    const { unmount } = show(<AgentDialog {...base()} events={[permissionEvent('permission-bash', { lastError: 'x' })]} />);
    expect(pchoices().every((b) => !b.disabled)).toBe(true);
    unmount();
    show(<AgentDialog {...base()} events={[permissionEvent('cut', {}, 'claude', payload({ tool_input: { command: 'x'.repeat(70_000) } }))]} />);
    expect(pchoices().map((b) => b.disabled)).toEqual([true, true, false]);
    expect(screen.getByTestId('agent-dialog-permission-note').textContent).toBe('Förkortad vid 64 KB. Hela texten finns i terminalen.');
    expect(screen.getByTestId('agent-dialog-terminal').disabled).toBe(false);
  });

  it('opencode says the prompt is also open in the terminal, with Reject as the refusing choice', () => {
    show(<AgentDialog {...base()} events={[permissionEvent('permission-asked-always', {}, 'opencode')]} />);
    expect(screen.getByText('Frågan om behörighet visas också i terminalen.')).toBeTruthy();
    expect(pchoices()[2].textContent).toBe('3Avvisa');
  });

  it('Close during sending calls no close; Close on a shown permission handed back raises the notice (K10, K11)', async () => {
    const onNotice = vi.fn();
    const { unmount } = show(<AgentDialog {...base({ onNotice })} events={[permissionEvent('permission-bash', { state: 'sending' })]} />);
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    expect(agentEvents.close).not.toHaveBeenCalled();
    unmount();
    show(<AgentDialog {...base({ onNotice })} events={[permissionEvent()]} />);
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    await waitFor(() => expect(onNotice).toHaveBeenCalledWith('Lämnad tillbaka till terminalen. Svara där som vanligt.'));
    agentEvents.close.mockResolvedValueOnce({ state: 'dismissed' });
    onNotice.mockClear();
    show(<AgentDialog {...base({ onNotice })} events={[permissionEvent('permission-edit')]} />);
    fireEvent.click(screen.getAllByTestId('agent-dialog-close').at(-1));
    await waitFor(() => expect(agentEvents.close).toHaveBeenCalledTimes(2));
    expect(onNotice).not.toHaveBeenCalled();
  });

  it('a permission arriving while a question page is shown keeps the page and counts +1 ny (BR2.1, SCD9)', () => {
    const { rerender } = show(<AgentDialog {...base()} events={[hookEvent()]} />);
    rerender(<AgentDialog {...base()} events={[hookEvent(), permissionEvent('permission-bash', { arrivedAtMs: 2, seq: 2 })]} />);
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Fråga: Agenten väntar på ditt svar');
    expect(screen.getByTestId('agent-dialog-new-count').textContent).toBe('+1 ny');
  });

  it('with stamp, answerClicked goes before the answer in the same tick (NFR1.12)', () => {
    agentEvents.stamp = vi.fn();
    show(<AgentDialog {...base()} events={[permissionEvent()]} />);
    fireEvent.click(pchoices()[2]);
    expect(agentEvents.stamp).toHaveBeenCalledWith('p-permission-bash', 'answerClicked');
    expect(agentEvents.answer).toHaveBeenCalledWith('p-permission-bash', { permission: { choice: 2 } });
    expect(agentEvents.stamp.mock.invocationCallOrder[0]).toBeLessThan(agentEvents.answer.mock.invocationCallOrder[0]);
  });

  // US-0506 u5 D7, AC5.1.1: every kind turns red after 20 s.
  it('a permission page turns is-overdue after OVERDUE_MS with the still-waiting title, and paging restarts the count', () => {
    vi.useRealTimers();
    vi.useFakeTimers();
    show(<AgentDialog {...base()} events={[permissionEvent(), permissionEvent('permission-edit')]} />);
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 1));
    expect(dialog().classList.contains('is-overdue')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(dialog().classList.contains('is-overdue')).toBe(true);
    expect(screen.getByTestId('agent-dialog-title').textContent).toMatch(/väntar fortfarande/);
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    expect(dialog().classList.contains('is-overdue')).toBe(false);
    act(() => vi.advanceTimersByTime(OVERDUE_MS));
    expect(dialog().classList.contains('is-overdue')).toBe(true);
  });
});

// US-0031 FR2, FR4: one rule for a page that is over, shared by the app shell and the dialog.
describe('isSettled (US-0031)', () => {
  it.each(['sent', 'handedBack', 'stale', 'ended'])('a hook page in %s is settled', (state) => {
    expect(isSettled(hookEvent('gate-2026-11-14', { state }))).toBe(true);
  });
  it.each(['shown', 'timedOut', 'sending', 'waiting', 'queued'])('a hook page in %s is live', (state) => {
    expect(isSettled(hookEvent('gate-2026-11-14', { state }))).toBe(false);
  });
  it('an audit page is live, whatever its state; nothing is not settled', () => {
    expect(isSettled(audit({}))).toBe(false);
    expect(isSettled(null)).toBe(false);
  });
});

describe('AgentDialog: a new page and the page on screen (US-0031)', () => {
  const second = () => hookEvent('reordered', { eventId: 'h2', sessionId: 's2', arrivedAtMs: 2 });

  it('open on a sent page, a new page takes over (AC1.2.1, FR2)', () => {
    const props = base();
    const first = hookEvent('gate-2026-11-14', { state: 'sent' });
    const { rerender } = show(<AgentDialog {...props} events={[first]} />);
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Stage gate');
    rerender(<AgentDialog {...props} events={[first, second()]} />);
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Database');
    fireEvent.click(screen.getByTestId('agent-dialog-prev'));
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Stage gate');
  });

  it('open on a live page, a new page leaves it shown and counts +1 ny (AC1.3.1, FR3, BR2.1)', () => {
    const props = base();
    const first = hookEvent('gate-2026-11-14');
    const { rerender } = show(<AgentDialog {...props} events={[first]} />);
    rerender(<AgentDialog {...props} events={[first, second()]} />);
    expect(screen.getByTestId('agent-dialog-header').textContent).toBe('Stage gate');
    expect(screen.getByTestId('agent-dialog-new-count').textContent).toBe('+1 ny');
  });
});

describe('AgentDialog: the project band with several projects open (US-0046)', () => {
  const names = { pa: 'alpha', pb: 'beta' };
  const props = () => base({ projectNameOf: (id) => names[id] ?? '' });
  const alpha = () => hookEvent('gate-2026-11-14', { projectId: 'pa' });
  const beta = () => hookEvent('reordered', { eventId: 'h2', sessionId: 's2', projectId: 'pb', arrivedAtMs: 2 });
  const band = () => screen.getByTestId('agent-dialog-project').textContent;

  it('showProject: the page names its project in the band (AC1)', () => {
    show(<AgentDialog {...props()} showProject events={[alpha()]} />);
    expect(band()).toBe('PROJEKT alpha');
  });

  it('paging shows each page its own project (AC2)', () => {
    show(<AgentDialog {...props()} showProject events={[alpha(), beta()]} />);
    expect(band()).toBe('PROJEKT alpha');
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    expect(band()).toBe('PROJEKT beta');
    fireEvent.click(screen.getByTestId('agent-dialog-prev'));
    expect(band()).toBe('PROJEKT alpha');
  });

  it('without showProject there is no band and the where line is as before (AC3)', () => {
    show(<AgentDialog {...props()} events={[alpha()]} />);
    expect(screen.queryByTestId('agent-dialog-project')).toBeNull();
    expect(screen.getByTestId('agent-dialog-where').textContent).toBe('alpha · 261114-agent-dialogs · code-generation');
  });
});
