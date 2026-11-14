import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import QuestionPopup, { ARRIVAL_MS, OVERDUE_MS } from '../../src/renderer/QuestionPopup.jsx';
import { HARNESSES } from '../../src/shared/harnesses.js';
import { pendingQuestions } from '../../src/main/questions.js';
import { mergeAudits } from '../../src/main/parsers/audit.js';
import { waitForAnswer } from '../../src/renderer/picker.js';
import { fixture } from '../fixtures/picker/index.js';

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
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0', projectId: 'p2' }), { index: 1 });
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
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: 'g1' }), { index: 1 });
  });

  it('the own answer types its text and Enter; a failed send says why', async () => {
    const props = base({ onSend: vi.fn(async () => ({ ok: false, error: 'Agentfliken kör inte.' })) });
    render(<QuestionPopup {...props} questions={[question()]} />);
    expect(screen.getByTestId('question-popup-own-send').disabled).toBe(true);
    fireEvent.change(screen.getByTestId('question-popup-own'), { target: { value: 'Både och' } });
    fireEvent.click(screen.getByTestId('question-popup-own-send'));
    expect(props.onSend).toHaveBeenCalledWith(expect.objectContaining({ id: '8c1829d0' }), { own: 'Både och' });
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

  it('a refused send offers only the terminal; a sent answer still waiting after ARRIVAL_MS says once it may be lost (EPIC-00 US-0004)', async () => {
    const refused = base({ onSend: vi.fn(async () => ({ ok: false, error: 'Claude ställer flera frågor på en gång. Svara i terminalen.' })) });
    const { unmount } = render(<QuestionPopup {...refused} questions={[question()]} />);
    fireEvent.click(screen.getAllByTestId('question-popup-choice')[0]);
    await waitFor(() => expect(screen.getByTestId('question-popup-status').textContent).toContain('flera frågor'));
    expect(screen.getAllByTestId('question-popup-choice').every((b) => b.disabled)).toBe(true);
    expect(screen.getByTestId('question-popup-own').disabled).toBe(true);
    expect(screen.getByTestId('question-popup-terminal').disabled).toBe(false);
    unmount();

    vi.useFakeTimers();
    const props = base();
    render(<QuestionPopup {...props} questions={[question()]} />);
    await act(async () => fireEvent.click(screen.getAllByTestId('question-popup-choice')[0]));
    expect(screen.getByTestId('question-popup-status').textContent).toBe('Skickat till Claude');
    act(() => vi.advanceTimersByTime(ARRIVAL_MS));
    expect(screen.getByTestId('question-popup-status').textContent).toContain('kanske inte kom fram');
    expect(props.onSend).toHaveBeenCalledTimes(1); // it does not ask or send again
  });
});

describe('QuestionPopup against the real picker (EPIC-00 US-0006)', () => {
  const where = { project: { projectId: 'p1', name: 'aidlc-dash' }, intent: '261114-custom-plans' };
  const block = (fields, i) =>
    Object.entries({ Timestamp: new Date(Date.UTC(2026, 10, 14, 9, 0, i)).toISOString(), ...fields })
      .map(([k, v]) => `**${k}**: ${v}`)
      .join('\n');
  const audit = (...rows) => mergeAudits([{ source: 'host.md', text: rows.map(block).join('\n\n---\n\n') }]);
  const asked = {
    Event: 'DECISION_RECORDED',
    Stage: 'requirements-analysis',
    Decision: 'How would you like to answer the questions?',
    Options: "Guide me (walk through each question interactively here),I'll edit the file (fill in the file),Chat (discuss freely; you extract the decisions)",
    'Question Id': '6530554d'
  };

  it('sends the key of the picker drawn after the click, and closes on the following QUESTION_ANSWERED', async () => {
    let lines = fixture('no-picker'); // the audit row came first: Claude Code has not drawn the picker yet
    const typed = [];
    const onSend = vi.fn(async (q, answer) => {
      const { found } = await waitForAnswer(() => [{ tab: 'agent:0', lines }], q, answer, { waitMs: 3000, stepMs: 50 });
      if (found.error) return { ok: false, error: found.error };
      typed.push(...found.keys);
      return { ok: true };
    });
    const before = pendingQuestions(audit(asked), where);
    expect(before.map((q) => q.options)).toEqual([['Guide me', "I'll edit the file", 'Chat']]);
    const { rerender } = render(<QuestionPopup {...base({ onSend })} questions={before} />);

    fireEvent.click(screen.getAllByTestId('question-popup-choice')[0]);
    expect(screen.getAllByTestId('question-popup-choice').every((b) => b.disabled)).toBe(true); // no second send while it waits
    expect(screen.queryByTestId('question-popup-status')).toBeNull();
    setTimeout(() => (lines = fixture('single')), 300);
    await waitFor(() => expect(screen.getByTestId('question-popup-status').textContent).toBe('Skickat till Claude'), { timeout: 3000 });
    expect(typed).toEqual(['1']);
    expect(onSend).toHaveBeenCalledTimes(1);

    const after = pendingQuestions(audit(asked, { Event: 'QUESTION_ANSWERED', Stage: 'requirements-analysis', 'Person Reply': 'Guide me' }), where);
    rerender(<QuestionPopup {...base({ onSend })} questions={after} />);
    expect(screen.queryByTestId('question-popup-title')).toBeNull();
  });

  it('a batch question offers only the terminal and says why', () => {
    const [q] = pendingQuestions(audit({ ...asked, Decision: 'Q1, Q2', Options: '|Q1: A. Every switch|Q1: B. Only|Q2: A. Here|Q2: B. There' }), where);
    render(<QuestionPopup {...base()} questions={[q]} />);
    expect(screen.queryAllByTestId('question-popup-choice')).toEqual([]);
    expect(screen.getByTestId('question-popup-batch').textContent).toContain('Q1: A. Every switch / B. Only');
    expect(screen.getByTestId('question-popup-batch-note').textContent).toBe('AI-DLC ställer 2 frågor på en gång, och dem kan popupen inte svara på. Svara i terminalen.');
    expect(screen.getByTestId('question-popup-own').disabled).toBe(true);
    expect(screen.getByTestId('question-popup-terminal').disabled).toBe(false);
  });

  it('a plan-approval ask is named and offers its exact options', () => {
    const [q] = pendingQuestions(
      audit({ Event: 'QUESTION_ASKED', 'Question Id': '32a59f72', 'Question Type': 'plan-approval', Stage: 'code-generation', Options: '["Approve Plan","Request Changes","I\'ll edit the files"]' }),
      where
    );
    render(<QuestionPopup {...base()} questions={[q]} />);
    expect(screen.getByText('Godkänn planen för code-generation')).toBeTruthy();
    expect(screen.getAllByTestId('question-popup-choice').map((b) => b.textContent)).toEqual(['1Approve Plan', '2Request Changes', "3I'll edit the files"]);
  });
});
