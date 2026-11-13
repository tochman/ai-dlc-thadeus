// The popup for questions and gates AI-DLC waits on (EPIC-05 US-0505 FR2.1–FR2.5). A native modal <dialog>,
// like the settings dialog: on top of everything, Esc closes it. The question is plain text, never HTML (NFR2).
// After 20 s without an answer the head turns glowing red and the title says so in words too (FR2.5, NFR5).
import { useEffect, useRef, useState } from 'react';

export const OVERDUE_MS = 20_000;

const gateText = (q) => `Godkännande: ${q.stage ?? '?'}${q.nextStage ? ` → ${q.nextStage}` : ''}`;

/**
 * @param {{open: boolean, questions: object[], focus?: {id: string}|null,
 *          onAnswer: (q: object) => void, onClose: () => void}} props questions in the order shown, newest first;
 *   focus is a fresh object each time a notification names a question
 */
export default function QuestionPopup({ open, questions, focus = null, onAnswer, onClose }) {
  const ref = useRef(null);
  const answerRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [overdue, setOverdue] = useState(false);
  const count = questions.length;
  const i = Math.min(index, Math.max(0, count - 1));
  const q = questions[i] ?? null;

  // A new newest question, or the one a notification named, is shown first.
  const newestId = questions[0]?.id;
  useEffect(() => {
    const at = focus ? questions.findIndex((x) => x.id === focus.id) : -1;
    setIndex(at === -1 ? 0 : at);
  }, [newestId, focus]); // not on every push: browsing stays where it is

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
      answerRef.current?.focus(); // "Svara i Claude" gets focus (NFR5)
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]);

  // "Svara i Claude" (F-01): close the dialog first. Closing a modal <dialog> hands focus back to whatever had it
  // before showModal(), so the answer, which focuses the terminal, runs in the next frame, after that hand-back.
  function answer() {
    const d = ref.current;
    if (d?.open) d.close ? d.close() : d.removeAttribute('open');
    requestAnimationFrame(() => onAnswer(q));
  }

  // Escalation per shown question; it starts over when another question is shown (FR2.5).
  const shownId = open ? q?.id ?? null : null;
  useEffect(() => {
    setOverdue(false);
    if (!shownId) return undefined;
    const timer = setTimeout(() => setOverdue(true), OVERDUE_MS);
    return () => clearTimeout(timer);
  }, [shownId]);

  return (
    <dialog
      ref={ref}
      className={`settings-dialog question-popup${overdue ? ' is-overdue' : ''}`}
      aria-labelledby="question-popup-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own state
        onClose();
      }}
      data-testid="question-popup"
    >
      {open && q && (
        <div>
          <div className="question-popup-head">
            <h2 id="question-popup-title" data-testid="question-popup-title">
              {overdue ? 'Väntar fortfarande på ditt svar' : 'Claude väntar på ditt svar'}
            </h2>
          </div>
          {q.early && <p className="question-popup-early">Väntade redan när appen startade</p>}
          <p className="question-popup-where">
            {q.projectName} · {q.intent} · {q.stage ?? '?'}
          </p>
          <p className="question-popup-text">{q.kind === 'gate' ? gateText(q) : q.text}</p>
          {q.options?.length > 0 && (
            <ul className="question-popup-options">
              {q.options.map((o, n) => (
                <li key={n}>{o}</li>
              ))}
            </ul>
          )}
          <div className="question-popup-pager">
            <button type="button" className="btn" disabled={i === 0} onClick={() => setIndex(i - 1)}>
              Föregående
            </button>
            <span>
              {i + 1} av {count}
            </span>
            <button type="button" className="btn" disabled={i >= count - 1} onClick={() => setIndex(i + 1)}>
              Nästa
            </button>
          </div>
          <div className="setup-actions">
            <button ref={answerRef} type="button" className="btn btn-accent" onClick={answer} data-testid="question-popup-answer">
              Svara i Claude
            </button>
            <button type="button" className="btn" onClick={onClose} data-testid="question-popup-close">
              Stäng
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
