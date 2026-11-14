// The popup for questions and gates AI-DLC waits on (EPIC-05 US-0505 FR2.1–FR2.5). A native modal <dialog>,
// like the settings dialog: on top of everything, Esc closes it. The question is plain text, never HTML (NFR2).
// It answers in place: an option or a gate button goes to the agent tab whose picker shows this question, as that
// picker's own key; the own-answer field types its text and Enter. When no picker shows it (several questions at once,
// other options, the agent moved on) nothing is sent and the popup says why (EPIC-00 US-0004). The calm steel frame turns glowing red after
// OVERDUE_MS without an answer, and the title says so in words too (FR2.5, NFR5).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { t as translate } from '../shared/i18n.js';

export const OVERDUE_MS = 20_000;
/** After a send, how long the question may stay open before the popup says the answer may not have arrived. */
export const ARRIVAL_MS = 10_000;

/** "Godkännande: a → b"; the same keys as the system notification. */
const gateText = (q) =>
  q.nextStage
    ? translate('app.question.gateNext', { stage: q.stage ?? '?', next: q.nextStage })
    : translate('app.question.gate', { stage: q.stage ?? '?' });

/** The choices as [label, number shown]: a gate's Approve and Request Changes, else the logged options 1–9. */
function choices(q, t) {
  if (q.kind === 'gate') return [[t('app.question.approve'), '1'], [t('app.question.requestChanges'), '2']];
  return (q.options ?? []).slice(0, 9).map((o, n) => [o, String(n + 1)]);
}

/**
 * @param {{open: boolean, questions: object[], focus?: {id: string}|null,
 *          harnessOf?: (projectId: string) => object|null, onSend?: (q: object, answer: {index: number}|{own: string}) => Promise<{ok, error?}>,
 *          onOpenTerminal: (q: object) => void, onClose: () => void}} props questions in the order shown, newest first;
 *   focus is a fresh object each time a notification names a question; harnessOf gives the project's running harness
 *   (a table entry) or null
 */
export default function QuestionPopup({ open, questions, focus = null, harnessOf = () => null, onSend, onOpenTerminal, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const firstRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [overdue, setOverdue] = useState(false);
  const [sent, setSent] = useState(null); // {id, ok, error}: the answer sent for question id
  const [own, setOwn] = useState('');
  const count = questions.length;
  // A sent question stays shown until it leaves the list; then the list moves on by itself.
  const sentAt = sent ? questions.findIndex((x) => x.id === sent.id) : -1;
  const i = sentAt !== -1 ? sentAt : Math.min(index, Math.max(0, count - 1));
  const q = questions[i] ?? null;
  const harness = q ? harnessOf(q.projectId) : null;
  const sentHere = sent && q && sent.id === q.id ? sent : null;
  const canSend = Boolean(harness && onSend) && !sentHere; // a refused send offers only the terminal

  // A new newest question, or the one a notification named, is shown first.
  const newestId = questions[0]?.id;
  useEffect(() => {
    const at = focus ? questions.findIndex((x) => x.id === focus.id) : -1;
    setIndex(at === -1 ? 0 : at);
  }, [newestId, focus]); // not on every push: browsing stays where it is

  useEffect(() => {
    if (sent && sentAt === -1) setSent(null);
  }, [sent, sentAt]);

  // Sent, but still waiting after ARRIVAL_MS: say once that it may not have arrived, instead of asking again.
  const [late, setLate] = useState(null);
  const sentOkId = sent?.ok ? sent.id : null;
  useEffect(() => {
    setLate(null);
    if (!sentOkId) return undefined;
    const timer = setTimeout(() => setLate(sentOkId), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [sentOkId]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
      const first = firstRef.current?.disabled ? null : firstRef.current;
      (first ?? d.querySelector('[data-testid="question-popup-terminal"]'))?.focus(); // the first answer gets focus (NFR5)
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]);

  // "Öppna terminalen" (F-01): close the dialog first. Closing a modal <dialog> hands focus back to whatever had it
  // before showModal(), so opening the terminal, which focuses it, runs in the next frame, after that hand-back.
  function openTerminal() {
    const d = ref.current;
    if (d?.open) d.close ? d.close() : d.removeAttribute('open');
    requestAnimationFrame(() => onOpenTerminal(q));
  }

  async function send(answer) {
    const target = q;
    const result = await onSend(target, answer);
    setSent({ id: target.id, ok: result?.ok === true, error: result?.error ?? null });
    if (result?.ok) setOwn('');
  }

  function browse(next) {
    setSent(null);
    setOwn('');
    setIndex(next);
  }

  // Escalation per shown question; it starts over when another question is shown (FR2.5).
  const shownId = open ? q?.id ?? null : null;
  useEffect(() => {
    setOverdue(false);
    if (!shownId) return undefined;
    const timer = setTimeout(() => setOverdue(true), OVERDUE_MS);
    return () => clearTimeout(timer);
  }, [shownId]);
  const red = overdue && !sentHere?.ok;

  const picker = q && harness?.pickerKeys ? choices(q, t) : [];
  const listed = q && !picker.length && q.options?.length > 0;

  return (
    <dialog
      ref={ref}
      className={`settings-dialog question-popup ${red ? 'is-overdue' : 'is-calm'}`}
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
              {red ? t('app.question.stillWaiting') : t('app.question.waiting')}
            </h2>
          </div>
          <p className="question-popup-where">
            {q.projectName} · {q.intent} · {q.stage ?? '?'}
          </p>
          {q.early && <p className="question-popup-early">{t('app.question.early')}</p>}
          <p className="question-popup-text">{q.kind === 'gate' ? gateText(q) : q.text}</p>
          {picker.length > 0 && (
            <div className="question-popup-choices">
              {picker.map(([label, key], n) => (
                <button
                  key={key}
                  ref={n === 0 ? firstRef : undefined}
                  type="button"
                  className="question-popup-choice"
                  disabled={!canSend}
                  onClick={() => send({ index: n })}
                  data-testid="question-popup-choice"
                >
                  <span className="question-popup-key">{key}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
          {listed && (
            <ul className="question-popup-options">
              {q.options.map((o, n) => (
                <li key={n}>{o}</li>
              ))}
            </ul>
          )}
          <form
            className="question-popup-own"
            onSubmit={(e) => {
              e.preventDefault();
              if (own.trim()) send({ own });
            }}
          >
            <input
              ref={picker.length ? undefined : firstRef}
              type="text"
              value={own}
              onChange={(e) => setOwn(e.target.value)}
              placeholder={t('app.question.ownAnswer')}
              aria-label={t('app.question.ownAnswer')}
              disabled={!canSend}
              data-testid="question-popup-own"
            />
            <button type="submit" className="btn btn-accent" disabled={!canSend || !own.trim()} data-testid="question-popup-own-send">
              {t('app.question.send')}
            </button>
          </form>
          {sentHere && (
            <p className={`question-popup-status${sentHere.ok ? '' : ' is-error'}`} role="status" data-testid="question-popup-status">
              {sentHere.ok
                ? late === sentHere.id
                  ? t('app.question.maybeLost', { harness: harness?.name ?? '' })
                  : t('app.question.sent', { harness: harness?.name ?? '' })
                : t('app.question.sendFailed', { error: sentHere.error ?? '' })}
            </p>
          )}
          {!harness && <p className="question-popup-status">{t('app.question.noAgent')}</p>}
          <div className="question-popup-foot">
            <div className="question-popup-pager">
              <button type="button" className="btn btn-quiet" disabled={i === 0} onClick={() => browse(i - 1)}>
                {t('app.question.previous')}
              </button>
              <span>{t('app.question.position', { i: i + 1, n: count })}</span>
              <button type="button" className="btn btn-quiet" disabled={i >= count - 1} onClick={() => browse(i + 1)}>
                {t('app.question.next')}
              </button>
            </div>
            <div className="question-popup-actions">
              <button type="button" className="btn btn-quiet" onClick={openTerminal} data-testid="question-popup-terminal">
                {t('app.question.openTerminal')}
              </button>
              <button type="button" className="btn" onClick={onClose} data-testid="question-popup-close">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
