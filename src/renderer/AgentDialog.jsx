// US-0506 u1 FR2.1–FR2.6, FR3.3, FR3.5, NFR6, NFR7, ADR-006: AgentDialog (LC10), in place of the US-0505 question popup.
// A native modal <dialog>, like the settings dialog: on top of everything, Esc closes it.
//
// Two kinds of page, one pager in arrival order (BR2.1: the page being read never jumps; a new event only raises
// "+1 new"):
// - a hook event (source "hook"): the agent's own question, its Markdown body rendered through FileContent with raw
//   HTML shown as text (K7), header and option labels through visibleText (K8). Answers go to main as option indexes
//   only (agentEvents.answer); main checks and delivers them (C4, BR3.1).
// - an audit event (source "audit", projects without current hooks, BR2.7): today's audit-log question, answered
//   exactly as the popup did, through the terminal path (onAuditSend → TerminalContext.answer(), BR3.6).
// The calm steel frame turns glowing red after OVERDUE_MS without an answer, and the title says so too (BR4.6).
//
// US-0506 u2 BR5.5, BR5.6, BR5.13, PD8, SD9: a permission page (M3) shows what the agent wants to do as plain text,
// with the agent's own choices in its order and the refusing one below a rule. Nothing is preselected; a digit only
// focuses a choice and Enter or a click sends it. For GUARD_MS after the page shows, or after the window gains focus,
// every key, click and Esc on the dialog is swallowed (K8, review R-03).
import { Fragment, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { t as translate } from '../shared/i18n.js';
import { selectableHarness } from '../shared/harnesses.js';
import { cleanBody, visibleText } from '../shared/agentText.js';
import { FileContent } from './ArtifactReader.jsx';
import ReplyPage from './ReplyPage.jsx'; // US-0506 u3: the MESSAGE page

export const OVERDUE_MS = 20_000;
/** After an audit send, how long the question may stay open before the dialog says the answer may not have arrived. */
export const ARRIVAL_MS = 10_000;
/** After a page shows, how long keys and clicks on its answers are ignored (code review fix 1). */
export const GUARD_MS = 400;

const OPEN = new Set(['shown', 'timedOut']);
const agentBridge = () => window.bridge?.agentEvents;
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// --- Audit (fallback) questions: the US-0505 popup's behaviour, unchanged -------------------------------------------

/** "Godkännande: a → b"; the same keys as the system notification. */
const gateText = (q) =>
  q.nextStage ? translate('app.question.gateNext', { stage: q.stage ?? '?', next: q.nextStage }) : translate('app.question.gate', { stage: q.stage ?? '?' });

/** An engine ask has no logged text: name what it asks (the same keys as main's notify.js askText). */
const askText = (q) =>
  q.ask === 'plan-approval'
    ? translate('app.question.askPlan', { stage: q.stage ?? '?' })
    : q.ask === 'scope-confirm'
      ? translate('app.question.askScope')
      : translate('app.question.askOther', { type: q.ask });

const textOf = (q) => (q.kind === 'gate' ? gateText(q) : q.ask ? askText(q) : q.text);

/** The choices as [label, number shown]: a gate's Approve and Request Changes, else the logged options 1–9. */
function auditChoices(q, t) {
  if (q.batch?.length) return []; // several questions at once: answered in the terminal (EPIC-00 US-0006)
  if (q.kind === 'gate')
    return [
      [t('app.question.approve'), '1'],
      [t('app.question.requestChanges'), '2']
    ];
  return (q.options ?? []).slice(0, 9).map((o, n) => [o, String(n + 1)]);
}

function AuditPage({ ev, harness, onSend, guarded }) {
  const { t } = useTranslation();
  const q = ev.audit;
  const [sent, setSent] = useState(null); // {waiting} while the picker is looked for, then {ok, error}
  const [own, setOwn] = useState('');
  const [late, setLate] = useState(false);
  const batch = q.batch?.length ? q.batch : null;
  const canSend = Boolean(harness && onSend) && !sent && !batch; // a refused send offers only the terminal
  const picker = harness?.pickerKeys ? auditChoices(q, t) : [];
  const listed = !picker.length && !batch && q.options?.length > 0;

  // Sent, but still waiting after ARRIVAL_MS: say once that it may not have arrived, instead of asking again.
  const sentOk = sent?.ok === true;
  useEffect(() => {
    if (!sentOk) return undefined;
    const timer = setTimeout(() => setLate(true), ARRIVAL_MS);
    return () => clearTimeout(timer);
  }, [sentOk]);

  async function send(answer) {
    if (guarded()) return; // a keystroke or click meant for something else (review fix 1)
    setSent({ waiting: true });
    const result = await onSend(q, answer);
    setSent({ ok: result?.ok === true, error: result?.error ?? null });
    if (result?.ok) setOwn('');
  }

  return (
    <>
      {ev.early && <p className="question-popup-early">{t('app.question.early')}</p>}
      <p className="question-popup-text">{textOf(q)}</p>
      {batch && (
        <>
          <ul className="question-popup-options" data-testid="agent-dialog-batch">
            {batch.map((b) => (
              <li key={b.id}>
                {b.id}: {b.options.join(' / ')}
              </li>
            ))}
          </ul>
          <p className="question-popup-status" data-testid="agent-dialog-batch-note">
            {t('app.question.batch', { n: batch.length })}
          </p>
        </>
      )}
      {picker.length > 0 && (
        <div className="question-popup-choices">
          {picker.map(([label, key], n) => (
            <button
              key={key}
              type="button"
              className="question-popup-choice"
              disabled={!canSend}
              onClick={() => send({ index: n })}
              data-testid="agent-dialog-choice"
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
          type="text"
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          placeholder={t('app.question.ownAnswer')}
          aria-label={t('app.question.ownAnswer')}
          disabled={!canSend}
          data-testid="agent-dialog-own"
        />
        <button type="submit" className="btn btn-accent" disabled={!canSend || !own.trim()} data-testid="agent-dialog-own-send">
          {t('app.question.send')}
        </button>
      </form>
      {sent && !sent.waiting && (
        <p className={`question-popup-status${sent.ok ? '' : ' is-error'}`} role="status" data-testid="agent-dialog-status">
          {sent.ok
            ? late
              ? t('app.question.maybeLost', { harness: harness?.name ?? '' })
              : t('app.question.sent', { harness: harness?.name ?? '' })
            : t('app.question.sendFailed', { error: sent.error ?? '' })}
        </p>
      )}
      {!harness && <p className="question-popup-status">{t('app.question.noAgent')}</p>}
    </>
  );
}

// --- Hook questions: the agent's own question, answered by index ----------------------------------------------------

/** One question of a hook event: header, Markdown body, options (buttons or checkboxes) and the own-answer field. */
function QuestionBlock({ q, index, batch, draft, disabled, onPick, onToggle, onDone, onOwn, onReopen }) {
  const { t } = useTranslation();
  const [own, setOwn] = useState(draft.own ?? '');
  const header = q.header ? visibleText(q.header) : null;
  if (batch && draft.answered) {
    const said = draft.own || draft.picks.map((n) => visibleText(q.options[n].label)).join(', ');
    return (
      <section className="agent-dialog-question" data-testid="agent-dialog-question">
        <button type="button" className="link" onClick={() => onReopen(index)} disabled={disabled} data-testid="agent-dialog-summary">
          {header ? `${header}: ${said}` : said}
        </button>
      </section>
    );
  }
  return (
    <section className="agent-dialog-question" data-testid="agent-dialog-question">
      {header && (
        <h3 className="question-popup-where" data-testid="agent-dialog-header">
          {header}
        </h3>
      )}
      <FileContent rel="question.md" content={cleanBody(q.text)} html="text" />
      {q.truncated && <p className="question-popup-status">{t('agentDialog.truncated')}</p>}
      <div className="question-popup-choices">
        {q.options.map((o, n) =>
          q.multiSelect ? (
            <label key={n} className="question-popup-choice">
              <input
                type="checkbox"
                checked={draft.picks.includes(n)}
                disabled={disabled}
                onChange={() => onToggle(index, n)}
                data-index={n}
                data-question={index}
                data-testid="agent-dialog-check"
              />
              <span className="question-popup-key">{n + 1}</span>
              <span>
                {visibleText(o.label)}
                {o.description && <small className="muted"> {visibleText(o.description)}</small>}
              </span>
            </label>
          ) : (
            <button
              key={n}
              type="button"
              className={`question-popup-choice${draft.picks.includes(n) ? ' is-selected' : ''}`}
              disabled={disabled}
              onClick={() => onPick(index, n)}
              data-testid="agent-dialog-choice"
            >
              <span className="question-popup-key">{n + 1}</span>
              <span>
                {visibleText(o.label)}
                {o.description && <small className="muted">{visibleText(o.description)}</small>}
              </span>
            </button>
          )
        )}
      </div>
      {q.multiSelect && (
        <button type="button" className="btn" disabled={disabled || draft.picks.length === 0} onClick={() => onDone(index)} data-testid="agent-dialog-done">
          {t('agentDialog.done')}
        </button>
      )}
      {q.allowOwn && (
        <form
          className="question-popup-own"
          onSubmit={(e) => {
            e.preventDefault();
            if (own.trim()) onOwn(index, own);
          }}
        >
          <input
            type="text"
            value={own}
            onChange={(e) => setOwn(e.target.value)}
            placeholder={t('agentDialog.ownAnswer')}
            aria-label={t('agentDialog.ownAnswer')}
            disabled={disabled}
            data-testid="agent-dialog-own"
          />
          <button type="submit" className="btn btn-accent" disabled={disabled || !own.trim()}>
            {t('agentDialog.send')}
          </button>
        </form>
      )}
    </section>
  );
}

function statusOf(ev, localError, label, t) {
  if (ev.state === 'sending') return { text: t('agentDialog.state.sending') };
  if (ev.state === 'sent') return { text: t('agentDialog.state.sent', { harness: label }) };
  if (ev.state === 'handedBack') return { text: t('agentDialog.state.handedBack') };
  if (ev.state === 'ended') return { text: t('agentDialog.state.sessionEnded', { harness: label }) };
  const error = ev.lastError ?? localError;
  if (error) return { text: t('agentDialog.state.failed', { error }), error: true };
  if (ev.state === 'timedOut') return { text: t('agentDialog.state.timedOut') };
  return null;
}

function HookPage({ ev, keysRef, guarded }) {
  const { t } = useTranslation();
  const label = selectableHarness(ev.harness)?.label ?? ev.harness;
  const [drafts, setDrafts] = useState(() => ev.questions.map(() => ({ picks: [], own: null, answered: false })));
  const [localError, setLocalError] = useState(null);
  const batch = ev.questions.length > 1;
  const disabled = !OPEN.has(ev.state);
  const answered = drafts.filter((d) => d.answered).length;

  function send(picks, own) {
    const bridge = agentBridge();
    bridge?.stamp?.(ev.eventId, 'answerClicked'); // fire and forget, before the call (NFR1.7)
    setLocalError(null);
    bridge?.answer(ev.eventId, { question: { picks, own } }).catch((err) => setLocalError(errorText(err)));
  }
  const update = (i, patch) => setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  const finish = (i, picks, own = null) => (batch ? update(i, { picks, own, answered: true }) : send([picks], [own]));

  // Review fix 1: no key or click answers until the page has been on screen for GUARD_MS.
  const onPick = (i, n) => !guarded() && finish(i, [n]);
  const onToggle = (i, n) =>
    !guarded() && setDrafts((ds) => ds.map((d, j) => (j === i ? { ...d, picks: d.picks.includes(n) ? d.picks.filter((x) => x !== n) : [...d.picks, n] } : d)));
  const onDone = (i) =>
    !guarded() &&
    finish(
      i,
      [...drafts[i].picks].sort((a, b) => a - b)
    );
  const onOwn = (i, text) => !guarded() && finish(i, [], text);
  const sendAll = () =>
    !guarded() &&
    send(
      drafts.map((d) => [...d.picks].sort((a, b) => a - b)),
      drafts.map((d) => d.own ?? null)
    );

  // BR4.5: digits pick (or tick), Space ticks, Enter sends; digits typed in the own-answer field stay text.
  keysRef.current = (e) => {
    const target = e.target;
    if (disabled || guarded() || (target.tagName === 'INPUT' && target.type === 'text')) return;
    if (/^[1-9]$/.test(e.key)) {
      const qi = batch ? drafts.findIndex((d) => !d.answered) : 0;
      const n = Number(e.key) - 1;
      if (qi === -1 || n >= ev.questions[qi].options.length) return;
      e.preventDefault();
      (ev.questions[qi].multiSelect ? onToggle : onPick)(qi, n);
    } else if (e.key === ' ' && target.type === 'checkbox') {
      e.preventDefault();
      onToggle(Number(target.dataset.question), Number(target.dataset.index));
    } else if (e.key === 'Enter' && target.tagName !== 'BUTTON') {
      if (batch && answered === drafts.length) sendAll();
      else if (!batch && ev.questions[0].multiSelect && drafts[0].picks.length) onDone(0);
    }
  };

  const status = statusOf(ev, localError, label, t);
  return (
    <>
      {ev.harness === 'opencode' && <p className="question-popup-early">{t('agentDialog.alsoInTerminal')}</p>}
      {ev.questions.map((q, i) => (
        <QuestionBlock
          key={i}
          q={q}
          index={i}
          batch={batch}
          draft={drafts[i]}
          disabled={disabled}
          onPick={onPick}
          onToggle={onToggle}
          onDone={onDone}
          onOwn={onOwn}
          onReopen={(j) => update(j, { answered: false })}
        />
      ))}
      {batch && (
        <div className="question-popup-own">
          <span data-testid="agent-dialog-answered">{t('agentDialog.answered', { answered, total: drafts.length })}</span>
          <button type="button" className="btn btn-accent" disabled={disabled || answered < drafts.length} onClick={sendAll} data-testid="agent-dialog-send">
            {t('agentDialog.sendAll')}
          </button>
        </div>
      )}
      {status && (
        <p className={`question-popup-status${status.error ? ' is-error' : ''}`} role="status" data-testid="agent-dialog-status">
          {status.text}
        </p>
      )}
    </>
  );
}

// --- Permission prompts (u2): the agent's own choices, sent by index ---------------------------------------------------

function permissionStatus(ev, localError, label, t) {
  if (ev.state === 'ended' && ev.endedBy === 'terminal') return { text: t('agentDialog.permission.answeredInTerminal') };
  if (ev.state === 'handedBack') return { text: t('agentDialog.permission.handedBack') };
  if (ev.state === 'timedOut') return { text: t('agentDialog.permission.timedOut', { harness: label }) };
  return statusOf(ev, localError, label, t);
}

function PermissionPage({ ev, keysRef, guarded }) {
  const { t } = useTranslation();
  const label = selectableHarness(ev.harness)?.label ?? ev.harness;
  const [localError, setLocalError] = useState(null);
  const refs = useRef([]);
  const p = ev.permission;
  const live = ev.state === 'shown';

  function send(i) {
    if (guarded() || !live || !p.choices[i]?.enabled) return;
    const bridge = agentBridge();
    bridge?.stamp?.(ev.eventId, 'answerClicked'); // fire and forget, before the call (NFR1.12)
    setLocalError(null);
    bridge?.answer(ev.eventId, { permission: { choice: i } }).catch((err) => setLocalError(errorText(err)));
  }

  // K9: a digit focuses that choice and never sends; ↑/↓ move between choices; Enter sends only a focused choice
  // (preventDefault, so the button's own click does not send it twice). Enter on the title does nothing.
  keysRef.current = (e) => {
    if (guarded()) return;
    const buttons = refs.current;
    const at = buttons.indexOf(e.target);
    if (/^[1-9]$/.test(e.key)) {
      const target = buttons[Number(e.key) - 1];
      if (!target) return;
      e.preventDefault();
      target.focus();
    } else if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && at !== -1) {
      e.preventDefault();
      buttons[(at + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]?.focus();
    } else if (e.key === 'Enter' && at !== -1) {
      e.preventDefault();
      send(at);
    }
  };

  const tooLong = !p.truncated && ev.state !== 'timedOut' && p.choices.some((c) => c.effect === 'allowAlways' && !c.enabled);
  const note = p.truncated ? t('agentDialog.permission.truncated') : tooLong ? t('agentDialog.permission.alwaysTooLong') : null;
  const status = permissionStatus(ev, localError, label, t);
  return (
    <section className="agent-dialog-permission" data-testid="agent-dialog-permission">
      {ev.harness === 'opencode' && <p className="question-popup-early">{t('agentDialog.permission.alsoInTerminal')}</p>}
      <p className="agent-dialog-what" data-testid="agent-dialog-what">
        {p.what}
      </p>
      <pre className="agent-dialog-detail" data-testid="agent-dialog-detail">
        {p.detail}
      </pre>
      {p.cwd && (
        <p className="muted" data-testid="agent-dialog-cwd">
          {t('agentDialog.permission.cwd', { cwd: p.cwd })}
        </p>
      )}
      {note && (
        <p className="question-popup-status" data-testid="agent-dialog-permission-note">
          {note}
        </p>
      )}
      <div className="question-popup-choices">
        {p.choices.map((c, i) => (
          <Fragment key={i}>
            {c.refuses && <hr className="agent-dialog-rule" />}
            <button
              type="button"
              ref={(el) => (refs.current[i] = el)}
              className={`question-popup-choice agent-dialog-permission-choice${c.refuses ? ' is-refusing' : ''}`}
              disabled={!live || !c.enabled}
              onClick={() => send(i)}
              data-effect={c.effect}
              data-testid="agent-dialog-permission-choice"
            >
              <span className="question-popup-key">{i + 1}</span>
              <span className="agent-dialog-permission-label">{c.label}</span>
            </button>
          </Fragment>
        ))}
      </div>
      {status && (
        <p className={`question-popup-status${status.error ? ' is-error' : ''}`} role="status" data-testid="agent-dialog-status">
          {status.text}
        </p>
      )}
    </section>
  );
}

// --- The dialog ------------------------------------------------------------------------------------------------------

/**
 * @param {{open: boolean, events: object[], focus?: {id: string}|null, harnessOf?: (projectId) => object|null,
 *   projectNameOf?: (projectId) => string, onAuditSend?: (q, answer) => Promise<{ok, error?}>,
 *   onOpenTerminal: (ev) => void, onClose: () => void, onNotice?: (text: string) => void}} props events in pager order
 *   (AgentEvents, C3); harnessOf gives a project's running harness for audit events (a table entry) or null; onNotice
 *   shows a short app notice (u2 K11: a permission handed back to the terminal)
 */
export default function AgentDialog({
  open,
  events,
  focus = null,
  harnessOf = () => null,
  projectNameOf = () => '',
  onAuditSend,
  onOpenTerminal,
  onClose,
  onNotice
}) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const titleRef = useRef(null);
  const keysRef = useRef(null);
  const shownAt = useRef({ id: null, at: 0 });
  const [pageId, setPageId] = useState(null);
  const [lastIndex, setLastIndex] = useState(0);
  const [overdue, setOverdue] = useState(false);

  // The page being read stays put while events come and go (BR2.1); when it leaves, its neighbour shows.
  let i = events.findIndex((e) => e.eventId === pageId);
  if (i === -1) i = Math.min(lastIndex, Math.max(0, events.length - 1));
  const ev = events[i] ?? null;
  const shownId = open ? (ev?.eventId ?? null) : null;
  // Review fix 1: a keystroke typed for something else just before the page appeared must never answer. Every page
  // starts a GUARD_MS window in which no key or click on an answer does anything; it is set while rendering, so it
  // holds from the very first event the page can receive.
  if (shownId && shownAt.current.id !== shownId) shownAt.current = { id: shownId, at: Date.now() };
  const guarded = () => Date.now() - shownAt.current.at < GUARD_MS;
  const permPage = Boolean(open && ev?.source === 'hook' && ev.kind === 'permission');
  // K8, R-03: on a permission page the guard swallows every key, pointer and click on the dialog, and starts again
  // when the window comes back into focus, so a keystroke meant for another app can never allow anything.
  const swallow = (e) => {
    if (!permPage || !guarded()) return;
    e.preventDefault();
    e.stopPropagation();
  };
  useEffect(() => {
    if (!permPage) return undefined;
    const restart = () => (shownAt.current = { id: shownId, at: Date.now() });
    window.addEventListener('focus', restart);
    return () => window.removeEventListener('focus', restart);
  }, [permPage, shownId]);
  useEffect(() => {
    if (ev) setPageId(ev.eventId);
    setLastIndex(i);
  }, [ev?.eventId, i]); // eslint-disable-line react-hooks/exhaustive-deps -- ev changes identity on every push

  // "+1 new": events that were not there when this page first showed.
  const seen = useRef({ id: null, ids: new Set() });
  if (ev && seen.current.id !== ev.eventId) seen.current = { id: ev.eventId, ids: new Set(events.map((e) => e.eventId)) };
  const newCount = events.filter((e) => !seen.current.ids.has(e.eventId)).length;

  // A notification names an event (or the audit question behind it): show that one.
  useEffect(() => {
    const at = focus ? events.find((e) => e.eventId === focus.id || e.audit?.id === focus.id) : null;
    if (at) setPageId(at.eventId);
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps -- only when a notification names one

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      if (!d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    } else if (d.open) {
      d.close ? d.close() : d.removeAttribute('open');
    }
  }, [open]);

  // NFR6.1 as amended by review fix 1: the page title gets focus when a page shows, never an answer button, so
  // Enter or Space typed for something else cannot pick; Tab reaches the first choice. A new event moves nothing.
  // u3: a reply page focuses its empty answer field instead (BR6.9, PD11); a page that is shown again focuses again.
  useEffect(() => {
    if (!shownId) return;
    (ref.current?.querySelector('[data-autofocus]') ?? titleRef.current)?.focus();
  }, [shownId]);
  // dialogShown once per first paint of an event, not while a reply is still queued (OD1, u3 PD8).
  const stamped = useRef(new Set());
  const queued = ev?.state === 'queued';
  useEffect(() => {
    const stamp = agentBridge()?.stamp;
    if (!shownId || queued || ev?.source !== 'hook' || !stamp || stamped.current.has(shownId)) return;
    stamped.current.add(shownId);
    requestAnimationFrame(() => stamp(shownId, 'dialogShown')); // after paint
  }, [shownId, queued]); // eslint-disable-line react-hooks/exhaustive-deps -- once per shown event

  // US-0506 u5 D7: a dismissed reply shown again with the same id is a reopen, which starts the count over.
  const lastState = useRef({ id: null, state: null, reopens: 0 });
  if (ev) {
    const l = lastState.current;
    if (l.id === ev.eventId && l.state === 'dismissed' && ev.state === 'shown') l.reopens += 1;
    Object.assign(l, { id: ev.eventId, state: ev.state });
  }
  const reopens = lastState.current.reopens;
  // Escalation per shown page, every kind (BR4.6, u5 D7); it starts over when another page is shown or a reply reopens.
  useEffect(() => {
    setOverdue(false);
    if (!shownId) return undefined;
    const timer = setTimeout(() => setOverdue(true), OVERDUE_MS);
    return () => clearTimeout(timer);
  }, [shownId, reopens]);
  // A page keeps its colour while sending and after a failed send (u5 D7); sent, stale, ended and dismissed are calm.
  const settled = ev?.source === 'hook' && !OPEN.has(ev.state) && ev.state !== 'sending';
  const red = overdue && !settled;

  function closeDialog() {
    const cur = ev;
    onClose();
    // Close on a waiting hook question or permission hands it back to the terminal (BR3.5, BR5.10); on a shown or stale
    // reply it dismisses or ends it, typing nothing (u3 BR6.13, BR6.14). During sending nothing is called: the delivery
    // decides the state (K10).
    if (cur?.source === 'hook' && (OPEN.has(cur.state) || (cur.kind === 'reply' && cur.state === 'stale')))
      agentBridge()
        ?.close(cur.eventId)
        .then((r) => cur.kind === 'permission' && r?.state === 'handedBack' && onNotice?.(translate('agentDialog.permission.handedBack')))
        .catch((err) => console.warn('Frågan kunde inte lämnas tillbaka:', errorText(err)));
  }

  // "Öppna terminalen" (F-01): close the dialog first. Closing a modal <dialog> hands focus back to whatever had it
  // before showModal(), so opening the terminal, which focuses it, runs in the next frame, after that hand-back.
  function openTerminal() {
    const target = ev;
    const d = ref.current;
    if (d?.open) d.close ? d.close() : d.removeAttribute('open');
    requestAnimationFrame(() => onOpenTerminal(target));
  }

  const browse = (next) => {
    setPageId(events[next]?.eventId ?? null);
    setLastIndex(next);
  };
  const hook = ev?.source === 'hook';
  const where = ev && {
    project: ev.projectName ?? projectNameOf(ev.projectId),
    intent: ev.context?.intent ?? '?',
    stage: ev.context?.stage ?? '?'
  };
  const reply = ev?.kind === 'reply';
  const harnessLabel = ev ? (selectableHarness(ev.harness)?.label ?? ev.harness) : '';
  const waiting = permPage
    ? `${t('agentDialog.kind.permission')}: ${t(red ? 'agentDialog.title.permissionStillWaiting' : 'agentDialog.title.permission', { harness: harnessLabel })}`
    : reply
      ? t(red ? 'agentDialog.reply.titleOverdue' : 'agentDialog.reply.title', { harness: harnessLabel })
      : hook
        ? `${t('agentDialog.kind.question')}: ${t(red ? 'agentDialog.title.stillWaiting' : 'agentDialog.title.waiting')}`
        : t(red ? 'app.question.stillWaiting' : 'app.question.waiting');
  const time = reply ? new Date(ev.arrivedAt).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }) : '';
  const whereText = reply
    ? t('agentDialog.reply.where', { project: where.project, tab: harnessLabel, time })
    : ev?.context
      ? t('agentDialog.context', where)
      : where?.project;

  return (
    <dialog
      ref={ref}
      className={`settings-dialog question-popup agent-dialog ${red ? 'is-overdue' : 'is-calm'}`}
      aria-labelledby="agent-dialog-title"
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own state
        if (permPage && guarded()) return; // Esc inside the guard closes nothing (R-03)
        closeDialog();
      }}
      onKeyDownCapture={swallow}
      onPointerDownCapture={swallow}
      onClickCapture={swallow}
      onKeyDown={(e) => hook && keysRef.current?.(e)}
      data-testid="agent-dialog"
    >
      {open && ev && (
        <div>
          <div className={`question-popup-head${permPage ? ' is-permission' : ''}`}>
            <h2 id="agent-dialog-title" ref={titleRef} tabIndex={-1} data-testid="agent-dialog-title">
              {waiting}
            </h2>
          </div>
          <p className="question-popup-where" data-testid="agent-dialog-where">
            {whereText}
          </p>
          {permPage ? (
            <PermissionPage key={ev.eventId} ev={ev} keysRef={keysRef} guarded={guarded} />
          ) : reply ? (
            <ReplyPage key={ev.eventId} ev={ev} harnessLabel={harnessLabel} keysRef={keysRef} guarded={guarded} />
          ) : hook ? (
            <HookPage key={ev.eventId} ev={ev} keysRef={keysRef} guarded={guarded} />
          ) : (
            <AuditPage key={ev.eventId} ev={ev} harness={harnessOf(ev.projectId)} onSend={onAuditSend} guarded={guarded} />
          )}
          <div className="question-popup-foot">
            {/* US-0018: paging only when there is something to page to. */}
            <div className="question-popup-pager">
              {events.length > 1 && (
                <>
                  <button type="button" className="btn btn-quiet" disabled={i === 0} onClick={() => browse(i - 1)} data-testid="agent-dialog-prev">
                    {t('agentDialog.previous')}
                  </button>
                  <span>{t('agentDialog.position', { i: i + 1, n: events.length })}</span>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={i >= events.length - 1}
                    onClick={() => browse(i + 1)}
                    data-testid="agent-dialog-next"
                  >
                    {t('agentDialog.next')}
                  </button>
                </>
              )}
              {newCount > 0 && <span data-testid="agent-dialog-new-count">{t('agentDialog.newCount', { n: newCount })}</span>}
            </div>
            <div className="question-popup-actions">
              <button type="button" className="btn btn-quiet" onClick={openTerminal} data-testid="agent-dialog-terminal">
                {t('agentDialog.openTerminal')}
              </button>
              <button type="button" className="btn" onClick={closeDialog} data-testid="agent-dialog-close">
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
