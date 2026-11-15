// US-0506 u3 LC10: the reply (MESSAGE) page of AgentDialog in the Swedish locale with window.bridge.agentEvents
// stubbed (BR6.9–BR6.14, BR6.17, PD8, PD11, PD13, SD11, K7, K9; NFR6.4–NFR6.6; AC3.1.1, AC3.1.2, AC3.1.5).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import AgentDialog, { GUARD_MS, OVERDUE_MS } from '../../src/renderer/AgentDialog.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adapters } from '../../src/main/agentAdapters.js';

const harness = (id) => HARNESSES.find((h) => h.id === id);
const RLO = String.fromCodePoint(0x202e);
const TEXT = 'Vilket namn ska filen få?';

const replyEvent = (over = {}) => ({
  eventId: 'r1',
  sessionId: 's1',
  projectId: 'p1',
  tabId: 'agent:claude',
  harness: 'claude',
  source: 'hook',
  kind: 'reply',
  state: 'shown',
  arrivedAt: '2026-11-14T10:00:00.000Z',
  arrivedAtMs: 1,
  seq: 1,
  context: null,
  message: { text: TEXT, truncated: false, empty: false },
  lastError: null,
  via: null,
  endedBy: null,
  staleReason: null,
  ...over
});
const questionEvent = () => {
  const { questions } = adapters.claude.parse('question', readFileSync(path.resolve(__dirname, '../fixtures/agent-events/claude/gate-2026-11-14.json')));
  return { ...replyEvent({ eventId: 'q1', kind: 'question', message: undefined }), questions };
};

let agentEvents;
beforeEach(() => {
  agentEvents = {
    answer: vi.fn(async () => ({ state: 'sent', via: 'typed' })),
    close: vi.fn(async () => ({ state: 'dismissed' })),
    stamp: vi.fn()
  };
  window.bridge = { agentEvents };
  vi.useFakeTimers({ toFake: ['Date'], shouldAdvanceTime: true }); // the click guard reads Date.now()
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
const settle = () => vi.setSystemTime(Date.now() + GUARD_MS);
const props = (events, over = {}) => ({
  open: true,
  events,
  harnessOf: () => harness('claude'),
  projectNameOf: () => 'aidlc-dash',
  onOpenTerminal: vi.fn(),
  onClose: vi.fn(),
  ...over
});
function show(events, over) {
  const result = render(<AgentDialog {...props(events, over)} />);
  settle();
  return { ...result, update: (next, o) => (result.rerender(<AgentDialog {...props(next, { ...over, ...o })} />), settle()) };
}
const field = () => screen.getByTestId('agent-dialog-reply-text');
const sendButton = () => screen.getByTestId('agent-dialog-reply-send');
const type = (value) => fireEvent.change(field(), { target: { value } });

describe('the M4 page (BR6.9)', () => {
  it('shows the kind, the title, the where line, the body and an empty focused field', () => {
    show([replyEvent()]);
    expect(screen.getByTestId('agent-dialog-kind').textContent).toBe('MEDDELANDE');
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Meddelande från Claude Code');
    const where = screen.getByTestId('agent-dialog-where').textContent;
    expect(where).toContain('aidlc-dash');
    expect(where).toContain('Claude Code');
    expect(where).toMatch(/\d{2}[:.]\d{2}/);
    expect(screen.getByTestId('agent-dialog-reply').textContent).toContain(TEXT);
    expect(field().value).toBe('');
    expect(document.activeElement).toBe(field());
  });

  it('shows the empty-message line and the shortened line', () => {
    show([replyEvent({ message: { text: '', truncated: true, empty: true } })]);
    const page = screen.getByTestId('agent-dialog-reply').textContent;
    expect(page).toContain('Claude Code avslutade sin tur utan meddelande.');
    expect(page).toContain('Förkortat vid 64 KB');
  });

  it('renders an unsafe payload inert: no script, style, iframe, on* attribute, odd link or U+202E (SD11, K7)', () => {
    const bad = `<script>alert(1)</script><style>*{}</style><iframe src="x"></iframe><img src=x onerror="alert(1)">\n\n[js](javascript:alert(1)) [f](file:///etc/passwd) [w](https://example.com) a${RLO}b`;
    window.bridge.openExternal = vi.fn();
    show([replyEvent({ message: { text: bad, truncated: false, empty: false } })]);
    const page = screen.getByTestId('agent-dialog-reply');
    expect(page.querySelectorAll('script, style, iframe, img').length).toBe(0);
    expect([...page.querySelectorAll('*')].some((el) => [...el.attributes].some((a) => a.name.startsWith('on')))).toBe(false);
    expect([...page.querySelectorAll('a')].map((a) => a.getAttribute('href'))).toEqual(['https://example.com']);
    expect(window.bridge.openExternal).not.toHaveBeenCalled();
    expect(page.textContent).not.toContain(RLO);
  });
});

describe('sending (BR6.10–BR6.12, K9)', () => {
  it('Enter in the field sends the text once, with answerClicked stamped first', () => {
    show([replyEvent()]);
    type('notes.md');
    fireEvent.submit(field().form);
    expect(agentEvents.answer).toHaveBeenCalledTimes(1);
    expect(agentEvents.answer).toHaveBeenCalledWith('r1', { reply: { text: 'notes.md' } });
    expect(agentEvents.stamp).toHaveBeenCalledWith('r1', 'answerClicked');
    expect(agentEvents.stamp.mock.invocationCallOrder.at(-1)).toBeLessThan(agentEvents.answer.mock.invocationCallOrder[0]);
  });

  it('keeps Send disabled for an empty, a whitespace-only and a 65 537-byte field', () => {
    show([replyEvent()]);
    expect(sendButton().disabled).toBe(true);
    type(' \n\t ');
    expect(sendButton().disabled).toBe(true);
    type('a'.repeat(65_537));
    expect(sendButton().disabled).toBe(true);
    type('a'.repeat(65_536));
    expect(sendButton().disabled).toBe(false);
  });

  it('within GUARD_MS of the page showing, Enter and Send do nothing and the text stays', () => {
    render(<AgentDialog {...props([replyEvent()])} />);
    type('notes.md');
    fireEvent.submit(field().form);
    fireEvent.click(sendButton());
    expect(agentEvents.answer).not.toHaveBeenCalled();
    expect(field().value).toBe('notes.md');
  });

  it('after a question page, a digit key on the reply page sends nothing', () => {
    const { update } = show([questionEvent()]);
    update([replyEvent()]);
    fireEvent.keyDown(screen.getByTestId('agent-dialog'), { key: '1' });
    expect(agentEvents.answer).not.toHaveBeenCalled();
  });

  it('says it was sent as typed, followed by Enter', () => {
    show([replyEvent({ state: 'ended', via: 'typed', endedBy: 'typed' })]);
    expect(screen.getByTestId('agent-dialog-reply-status').textContent).toBe('Skickat till Claude Code som text, följt av Enter.');
  });

  it('a failed send shows its one sentence and keeps the text (RD14)', async () => {
    agentEvents.answer.mockRejectedValueOnce(new Error("Error invoking remote method 'agentEvents:answer': Error: Sessionen har avslutats."));
    show([replyEvent()]);
    type('notes.md');
    await act(async () => fireEvent.submit(field().form));
    expect(screen.getByTestId('agent-dialog-reply-status').textContent).toContain('Sessionen har avslutats.');
    expect(field().value).toBe('notes.md');
  });
});

describe('stale, close and reopen (BR6.13, BR6.14, PD11)', () => {
  it.each([
    ['movedOn', 'Claude Code väntar inte längre på det här meddelandet. Din text finns kvar.'],
    ['sessionEnded', 'Claude Code-sessionen avslutades. Inget skickades.'],
    ['notShown', 'Claude Code skickade ett nyare meddelande som inte kunde visas. Det finns i terminalen. Din text finns kvar.']
  ])('%s: its line, field and Send disabled, the text kept, Copy and Open the terminal', (staleReason, line) => {
    navigator.clipboard = { writeText: vi.fn(async () => {}) };
    const { update } = show([replyEvent()]);
    type('notes.md');
    update([replyEvent({ state: 'stale', staleReason })]);
    expect(screen.getByTestId('agent-dialog-reply-stale').textContent).toBe(line);
    expect(field().disabled).toBe(true);
    expect(sendButton().disabled).toBe(true);
    expect(field().value).toBe('notes.md');
    fireEvent.click(screen.getByTestId('agent-dialog-reply-copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('notes.md');
    expect(screen.getByTestId('agent-dialog-terminal')).toBeTruthy();
  });

  it('Esc and Close call close(eventId), also on a stale page', () => {
    const { update } = show([replyEvent()]);
    fireEvent(screen.getByTestId('agent-dialog'), new Event('cancel', { cancelable: true }));
    expect(agentEvents.close).toHaveBeenCalledWith('r1');
    update([replyEvent({ state: 'stale', staleReason: 'movedOn' })]);
    fireEvent.click(screen.getByTestId('agent-dialog-close'));
    expect(agentEvents.close).toHaveBeenCalledTimes(2);
  });

  it('a reopened reply shows an empty, focused field again', () => {
    const { update } = show([replyEvent()]);
    type('draft');
    update([], { open: false });
    update([replyEvent()], { open: true });
    expect(field().value).toBe('');
    expect(document.activeElement).toBe(field());
  });
});

describe('overdue and timing (BR6.17, PD8)', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  it('turns red at 20 s, not at 19.9 s; never for a stale reply; a reopened one starts at 0 again', () => {
    const { update } = show([replyEvent()]);
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 100));
    expect(screen.getByTestId('agent-dialog').className).not.toContain('is-overdue');
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByTestId('agent-dialog').className).toContain('is-overdue');
    expect(screen.getByTestId('agent-dialog-title').textContent).toBe('Meddelande från Claude Code: väntar fortfarande på ditt svar');
    update([replyEvent({ state: 'stale', staleReason: 'movedOn' })]);
    expect(screen.getByTestId('agent-dialog').className).not.toContain('is-overdue');
    update([], { open: false });
    update([replyEvent()], { open: true });
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 100));
    expect(screen.getByTestId('agent-dialog').className).not.toContain('is-overdue');
  });

  // US-0506 u5 D7, AC5.1.1.
  const red = () => screen.getByTestId('agent-dialog').className.includes('is-overdue');

  it('a reopened reply (same id, dismissed to shown) starts calm and restarts its count', () => {
    const { update } = show([replyEvent()]);
    act(() => vi.advanceTimersByTime(OVERDUE_MS));
    expect(red()).toBe(true);
    update([replyEvent({ state: 'dismissed' })]);
    expect(red()).toBe(false); // a dismissed page never turns red
    act(() => vi.advanceTimersByTime(OVERDUE_MS));
    expect(red()).toBe(false);
    update([replyEvent()]);
    expect(red()).toBe(false);
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 100));
    expect(red()).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(red()).toBe(true);
  });

  it('a failed send keeps the red', () => {
    const { update } = show([replyEvent()]);
    act(() => vi.advanceTimersByTime(OVERDUE_MS));
    update([replyEvent({ state: 'sending' })]);
    expect(red()).toBe(true);
    update([replyEvent({ state: 'shown', lastError: 'Det gick inte att skicka.' })]);
    expect(red()).toBe(true);
  });

  it('paging from a question to a reply restarts the count', () => {
    show([questionEvent(), replyEvent()]);
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 100));
    fireEvent.click(screen.getByTestId('agent-dialog-next'));
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 100));
    expect(red()).toBe(false);
    act(() => vi.advanceTimersByTime(100));
    expect(red()).toBe(true);
  });

  it('stamps dialogShown once per first paint, not while the reply is queued', () => {
    const { update } = show([replyEvent({ state: 'queued' })]);
    act(() => vi.advanceTimersByTime(50));
    expect(agentEvents.stamp).not.toHaveBeenCalled();
    update([replyEvent()]);
    act(() => vi.advanceTimersByTime(50));
    update([replyEvent()]);
    act(() => vi.advanceTimersByTime(50));
    expect(agentEvents.stamp.mock.calls).toEqual([['r1', 'dialogShown']]);
  });
});
