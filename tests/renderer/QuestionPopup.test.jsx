import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuestionPopup, { OVERDUE_MS } from '../../src/renderer/QuestionPopup.jsx';

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

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('QuestionPopup (US-0505)', () => {
  it('shows the question as text with its options, and "Svara i Claude" answers in that project (FR2.2, FR2.3, NFR5)', async () => {
    const onAnswer = vi.fn();
    const onClose = vi.fn();
    const older = question({ id: 'q0', text: 'Äldre fråga?', early: true });
    render(<QuestionPopup open questions={[question(), older]} onAnswer={onAnswer} onClose={onClose} />);
    const popup = screen.getByTestId('question-popup');
    expect(popup.getAttribute('aria-labelledby')).toBe('question-popup-title');
    expect(screen.getByTestId('question-popup-title').textContent).toBe('AI-DLC väntar på ditt svar'); // harness-neutral (US-0801)
    expect(within(popup).getByText('aidlc-dash · 261113-question-popup · requirements-analysis')).toBeTruthy();
    expect(within(popup).getByText('Var ska popupen <b>visas</b>?')).toBeTruthy(); // text, never HTML
    expect(popup.querySelector('b')).toBeNull();
    expect(within(popup).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['A', 'B', 'X']);
    expect(within(popup).getByText('1 av 2')).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByTestId('question-popup-answer'));
    expect(popup.querySelector('[role="status"], [role="alert"]')).toBeNull();

    fireEvent.click(within(popup).getByText('Nästa'));
    expect(within(popup).getByText('Väntade redan när appen startade')).toBeTruthy();
    fireEvent.click(screen.getByTestId('question-popup-close'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('question-popup-answer'));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ id: 'q0', projectId: 'p1' })));
  });

  it('"Svara i Claude" closes the dialog first and answers only after that, so the terminal keeps focus (FR2.3, F-01)', async () => {
    const popup = () => screen.getByTestId('question-popup');
    let openWhenAnswered;
    const onAnswer = vi.fn(() => {
      openWhenAnswered = popup().open || popup().hasAttribute('open');
    });
    render(<QuestionPopup open questions={[question()]} onAnswer={onAnswer} onClose={vi.fn()} />);
    expect(popup().hasAttribute('open')).toBe(true);

    fireEvent.click(screen.getByTestId('question-popup-answer'));
    expect(onAnswer).not.toHaveBeenCalled(); // not in the click: the dialog's focus hand-back comes first
    expect(popup().hasAttribute('open')).toBe(false);
    await waitFor(() => expect(onAnswer).toHaveBeenCalledTimes(1));
    expect(onAnswer).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0', projectId: 'p1' }));
    expect(openWhenAnswered).toBe(false);
  });

  it('escalates after 20 s: class is-overdue and a title that says so, reset by a new question (FR2.5, NFR5)', () => {
    vi.useFakeTimers();
    const props = { open: true, onAnswer: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<QuestionPopup {...props} questions={[question()]} />);
    const popup = screen.getByTestId('question-popup');
    act(() => vi.advanceTimersByTime(OVERDUE_MS - 1));
    expect(popup.classList.contains('is-overdue')).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(popup.classList.contains('is-overdue')).toBe(true);
    expect(screen.getByTestId('question-popup-title').textContent).toBe('Väntar fortfarande på ditt svar');

    rerender(<QuestionPopup {...props} questions={[question({ id: 'new', timeMs: 2 }), question()]} />);
    expect(popup.classList.contains('is-overdue')).toBe(false);
    expect(screen.getByTestId('question-popup-title').textContent).toBe('AI-DLC väntar på ditt svar');
  });

  it('shows a gate as "Godkännande: stage → next stage" without options (FR2.2)', () => {
    const gate = question({ id: 'g1', kind: 'gate', stage: 'code-generation', nextStage: 'build-and-test', text: '', options: [] });
    render(<QuestionPopup open questions={[gate]} onAnswer={vi.fn()} onClose={vi.fn()} />);
    const popup = screen.getByTestId('question-popup');
    expect(within(popup).getByText('Godkännande: code-generation → build-and-test')).toBeTruthy();
    expect(within(popup).queryAllByRole('listitem')).toEqual([]);
  });
});
