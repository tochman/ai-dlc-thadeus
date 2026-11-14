import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuestionPopup, { OVERDUE_MS } from '../../src/renderer/QuestionPopup.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';

const harness = (id) => HARNESSES.find((h) => h.id === id);

// Same shape as questions:changed sends (src/main/questions.js + `early` from ipc.js).
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

const base = (over = {}) => ({
  open: true,
  harnessOf: () => harness('claude'),
  onSend: vi.fn(async () => ({ ok: true })),
  onOpenTerminal: vi.fn(),
  onClose: vi.fn(),
  ...over
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('QuestionPopup (US-0505)', () => {
  it('shows the question as text, where it waits, and its options as numbered buttons (FR2.2, NFR5)', () => {
    const props = base();
    const older = question({ id: 'q0', text: 'Äldre fråga?', early: true });
    render(<QuestionPopup {...props} questions={[question(), older]} />);
    const popup = screen.getByTestId('question-popup');
    expect(popup.getAttribute('aria-labelledby')).toBe('question-popup-title');
    expect(screen.getByTestId('question-popup-title').textContent).toBe('AI-DLC väntar på ditt svar'); // harness-neutral (US-0801)
    expect(within(popup).getByText('aidlc-dash · 261113-question-popup · requirements-analysis')).toBeTruthy();
    expect(within(popup).getByText('Var ska popupen <b>visas</b>?')).toBeTruthy(); // text, never HTML
    expect(popup.querySelector('b')).toBeNull();
    const choices = screen.getAllByTestId('question-popup-choice');
    expect(choices.map((b) => b.textContent)).toEqual(['1A', '2B', '3X']);
    expect(document.activeElement).toBe(choices[0]);
    expect(within(popup).getByText('1 av 2')).toBeTruthy();
    expect(popup.querySelector('[role="status"], [role="alert"]')).toBeNull();

    fireEvent.click(within(popup).getByText('Nästa'));
    expect(within(popup).getByText('Väntade redan när appen startade')).toBeTruthy();
    fireEvent.click(screen.getByTestId('question-popup-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('an option sends its number key to that project and says so, staying on the question until it leaves', async () => {
    const props = base({ harnessOf: (id) => (id === 'p2' ? harness('claude') : null) });
    const q = question({ projectId: 'p2' });
    const { rerender } = render(<QuestionPopup {...props} questions={[q, question({ id: 'next', projectId: 'p2', text: 'Nästa fråga?' })]} />);
    fireEvent.click(screen.getAllByTestId('question-popup-choice')[1]);
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0', projectId: 'p2' }), '2');
    await waitFor(() => expect(screen.getByTestId('question-popup-status').textContent).toBe('Skickat till Claude'));
    expect(screen.getAllByTestId('question-popup-choice').every((b) => b.disabled)).toBe(true); // no double answer
    expect(props.onOpenTerminal).not.toHaveBeenCalled();

    // A newer question arrives: the sent one stays shown.
    const newer = question({ id: 'newer', projectId: 'p2', text: 'Ny fråga?', timeMs: 3 });
    rerender(<QuestionPopup {...props} questions={[newer, q]} />);
    expect(screen.getByText('Var ska popupen <b>visas</b>?')).toBeTruthy();
    // The audit shows it answered: it leaves the list and the next one shows.
    rerender(<QuestionPopup {...props} questions={[newer]} />);
    expect(screen.getByText('Ny fråga?')).toBeTruthy();
    expect(screen.queryByTestId('question-popup-status')).toBeNull();
  });

  it('a gate offers Approve (1) and Request changes (2) (FR2.2)', () => {
    const props = base();
    const gate = question({ id: 'g1', kind: 'gate', stage: 'code-generation', nextStage: 'build-and-test', text: '', options: [] });
    render(<QuestionPopup {...props} questions={[gate]} />);
    expect(screen.getByText('Godkännande: code-generation → build-and-test')).toBeTruthy();
    const [approve, changes] = screen.getAllByTestId('question-popup-choice');
    expect(approve.textContent).toBe('1Godkänn');
    expect(changes.textContent).toBe('2Begär ändringar');
    fireEvent.click(changes);
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }), '2');
  });

  it('the own answer types its text and Enter; a failed send says why', async () => {
    const props = base({ onSend: vi.fn(async () => ({ ok: false, error: 'Agentfliken kör inte.' })) });
    render(<QuestionPopup {...props} questions={[question()]} />);
    expect(screen.getByTestId('question-popup-own-send').disabled).toBe(true);
    fireEvent.change(screen.getByTestId('question-popup-own'), { target: { value: 'Både och' } });
    fireEvent.click(screen.getByTestId('question-popup-own-send'));
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0' }), 'Både och\r');
    await waitFor(() => expect(screen.getByTestId('question-popup-status').textContent).toBe('Kunde inte skicka: Agentfliken kör inte.'));
  });

  it('without number keys (opencode) or a running agent only the own answer or the terminal is offered', () => {
    const { rerender } = render(<QuestionPopup {...base({ harnessOf: () => harness('opencode') })} questions={[question()]} />);
    expect(screen.queryAllByTestId('question-popup-choice')).toEqual([]);
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A', 'B', 'X']);
    expect(screen.getByTestId('question-popup-own').disabled).toBe(false);

    rerender(<QuestionPopup {...base({ harnessOf: () => null })} questions={[question()]} />);
    expect(screen.getByTestId('question-popup-own').disabled).toBe(true);
  });

  it('"Öppna terminalen" closes the dialog first and opens the terminal only after that, so it keeps focus (FR2.3, F-01)', async () => {
    const popup = () => screen.getByTestId('question-popup');
    let openWhenCalled;
    const onOpenTerminal = vi.fn(() => {
      openWhenCalled = popup().open || popup().hasAttribute('open');
    });
    render(<QuestionPopup {...base({ onOpenTerminal })} questions={[question()]} />);
    expect(popup().hasAttribute('open')).toBe(true);

    fireEvent.click(screen.getByTestId('question-popup-terminal'));
    expect(onOpenTerminal).not.toHaveBeenCalled(); // not in the click: the dialog's focus hand-back comes first
    expect(popup().hasAttribute('open')).toBe(false);
    await waitFor(() => expect(onOpenTerminal).toHaveBeenCalledTimes(1));
    expect(onOpenTerminal).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0', projectId: 'p1' }));
    expect(openWhenCalled).toBe(false);
  });

  it('starts calm and turns red after OVERDUE_MS, with a title that says so, reset by a new question (FR2.5, NFR5)', () => {
    vi.useFakeTimers();
    const props = base();
    const { rerender } = render(<QuestionPopup {...props} questions={[question()]} />);
    const popup = screen.getByTestId('question-popup');
    expect(popup.classList.contains('is-calm')).toBe(true);
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 1));
    expect(popup.classList.contains('is-overdue')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(popup.classList.contains('is-overdue')).toBe(true);
    expect(popup.classList.contains('is-calm')).toBe(false);
    expect(screen.getByTestId('question-popup-title').textContent).toBe('Väntar fortfarande på ditt svar');

    rerender(<QuestionPopup {...props} questions={[question({ id: 'new', timeMs: 2 }), question()]} />);
    expect(popup.classList.contains('is-calm')).toBe(true);
    expect(screen.getByTestId('question-popup-title').textContent).toBe('AI-DLC väntar på ditt svar');
  });
});
