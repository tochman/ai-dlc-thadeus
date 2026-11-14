// US-0506 u1 LC10: AgentDialog in the Swedish locale with window.bridge.agentEvents stubbed (AC1.1.1–AC1.1.4,
// AC1.1.6–AC1.1.8, AC1.1.10, AC1.1.11; BR4.1–BR4.6; NFR3.5, NFR3.6, NFR6.1–NFR6.3, NFR7.1). The audit cases at the
// end are the 15 QuestionPopup cases (US-0505, EPIC-00 US-0004, US-0006), moved here with the agent-dialog-* ids.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import AgentDialog, { ARRIVAL_MS, GUARD_MS, OVERDUE_MS } from '../../src/renderer/AgentDialog.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';
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
    fireEvent.click(screen.getByTestId('agent-dialog-next'), {}); // nothing next: stays
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
