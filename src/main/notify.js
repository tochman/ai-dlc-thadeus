// System notifications for agent events (US-0506 u5 US5.1, D3–D6, BR8.3, BR8.4, LC50), built on EPIC-05 US-0505
// FR3.1–FR3.3. Each event id is decided at most once per app run, whatever the decision (D4); the decision itself is
// alertPlan's (D2). A click brings the window up and pushes agent-events:focus with the event id (D6, SD53).
// The audit questions AI-DLC waits on go through the same path as question events (Amendment 5).
import { Notification } from 'electron';
import { t } from '../shared/i18n.js';
import { alertPlan } from '../shared/alertPlan.js';
import { cutGraphemes, firstLine, plainLine, stripUnsafe } from '../shared/agentText.js';
import { selectableHarness } from '../shared/harnesses.js';
import { auditEvent } from './questions.js';

const TEXT_MAX = 120; // graphemes (SD51)
const PROJECT_MAX = 40;
const PRE_CUT = 2000; // code units, before any character work (PD52)
const TITLE = { question: 'app.notification.question', permission: 'app.notification.permission', reply: 'app.notification.reply' };

// ponytail: one id per event for the app run, never pruned and no cap; a cap or an LRU if a run ever sees millions.
const decided = new Set();
const live = new Set(); // held so the click handler is not garbage-collected

/** "Godkännande: a → b" for a gate; the same keys as the dialog's text. */
export const gateText = (q) =>
  q.nextStage ? t('app.question.gateNext', { stage: q.stage ?? '?', next: q.nextStage }) : t('app.question.gate', { stage: q.stage ?? '?' });

/** An engine ask (QUESTION_ASKED, EPIC-00 US-0006) has no logged text: name what it asks. Same keys as the dialog. */
export const askText = (q) =>
  q.ask === 'plan-approval'
    ? t('app.question.askPlan', { stage: q.stage ?? '?' })
    : q.ask === 'scope-confirm'
      ? t('app.question.askScope')
      : t('app.question.askOther', { type: q.ask });

const harnessLabel = (id) => (id ? (selectableHarness(id)?.label ?? String(id)) : 'AI-DLC');

/** SD50: first line, pre-cut, unsafe characters out, Markdown out, then the grapheme cut. */
const clean = (s, max) => cutGraphemes(plainLine(stripUnsafe(firstLine(String(s ?? '')).slice(0, PRE_CUT))), max);

/** SD52: the raw `{text}` per kind. */
function rawText(ev, harness) {
  if (ev.kind === 'permission') return `${ev.permission?.what ?? ''} ${firstLine(String(ev.permission?.detail ?? ''))}`;
  if (ev.kind === 'reply') return ev.message?.text ? ev.message.text : t('agentDialog.reply.empty', { harness });
  return ev.questions?.[0]?.text ?? '';
}

// ponytail: on Linux the body is escaped for freedesktop markup (SD56); a daemon that reads no markup shows &amp; as is.
const escapeMarkup = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * US-0506 u5 D3, SD50–SD52, SD56: the title and body of one event's notification, in the current language (PD60).
 * @returns {{title: string, body: string}}
 */
export function notificationText(ev, projectName = '', platform = process.platform) {
  const harness = harnessLabel(ev.harness);
  const title = t(TITLE[ev.kind] ?? TITLE.question, { harness });
  const body = t('app.notification.body', { project: cutGraphemes(stripUnsafe(projectName), PROJECT_MAX), text: clean(rawText(ev, harness), TEXT_MAX) });
  return { title, body: platform === 'linux' ? escapeMarkup(body) : body };
}

function focusWindow(win) {
  if (!win || win.isDestroyed()) return false;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
  return true;
}

/**
 * US-0506 u5 D2, D4–D6, PD50, PD53: notifies one accepted event when alertPlan says so, once per event id. Never
 * throws: a failure is logged in one line without agent text, and the event's queue and push are untouched.
 * @param {object} ev an AgentEvent (C3)
 * @param {{settings: object, win: import('electron').BrowserWindow|null, activeProjectId: string|null,
 *   projectName?: string, timing?: {stamp: Function}}} ctx
 */
export function notifyEvent(ev, { settings, win, activeProjectId, projectName = '', timing }) {
  if (!ev?.eventId || decided.has(ev.eventId)) return;
  decided.add(ev.eventId); // decided once, when the event arrives (D4, D8)
  const inFront = !!win && !win.isDestroyed() && win.isFocused() && ev.projectId === activeProjectId;
  const plan = alertPlan(ev.kind, settings, inFront);
  if (!plan.notify) return;
  try {
    if (!Notification.isSupported()) throw new Error('unsupported');
    const n = new Notification({ ...notificationText(ev, projectName), silent: plan.silent }); // SD54: no actions
    live.add(n);
    n.on('close', () => live.delete(n));
    n.on('click', () => {
      timing?.stamp(ev.eventId, ev.harness, 'notificationClicked');
      live.delete(n);
      if (focusWindow(win)) win.webContents.send('agent-events:focus', { eventId: ev.eventId });
    });
    n.show();
    timing?.stamp(ev.eventId, ev.harness, 'notificationShown');
  } catch (err) {
    console.warn(`[notifications] failed event=${ev.eventId} kind=${ev.kind} cause=${err?.name ?? 'Error'}`);
  }
}

/**
 * The audit path (Amendment 5): each waiting AI-DLC question as its audit question event, gate and ask texts as today.
 * @param {object[]} fresh questions that appeared after the app started
 * @param {Parameters<typeof notifyEvent>[1]} ctx
 */
export function notifyQuestions(fresh, ctx) {
  for (const q of fresh) {
    const text = q.kind === 'gate' ? gateText(q) : q.ask ? askText(q) : String(q.text ?? '');
    const ev = auditEvent(q);
    notifyEvent({ ...ev, questions: [{ ...ev.questions[0], text }] }, { ...ctx, projectName: q.projectName ?? ctx.projectName ?? '' });
  }
}
