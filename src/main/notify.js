// System notifications for questions AI-DLC waits on (EPIC-05 US-0505 FR3.1–FR3.3, FR4.2).
// Each question id is notified at most once per app run; a click brings the window up and opens the popup.
import { Notification } from 'electron';
import { t } from '../shared/i18n.js';

const notified = new Set();
const live = new Set();
const MAX_BODY = 120;

export const notificationTitle = (q) => t('app.notification.title', { project: String(q.projectName ?? '') });

/** "Godkännande: a → b" for a gate; the same keys as the popup's text. */
export const gateText = (q) =>
  q.nextStage ? t('app.question.gateNext', { stage: q.stage ?? '?', next: q.nextStage }) : t('app.question.gate', { stage: q.stage ?? '?' });

/** An engine ask (QUESTION_ASKED, EPIC-00 US-0006) has no logged text: name what it asks. Same keys as the popup. */
export const askText = (q) =>
  q.ask === 'plan-approval'
    ? t('app.question.askPlan', { stage: q.stage ?? '?' })
    : q.ask === 'scope-confirm'
      ? t('app.question.askScope')
      : t('app.question.askOther', { type: q.ask });

/** The question, or the gate text for a gate, cut to about 120 characters. */
export function notificationBody(q) {
  const text = q.kind === 'gate' ? gateText(q) : q.ask ? askText(q) : String(q.text ?? '');
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > MAX_BODY ? `${flat.slice(0, MAX_BODY - 1)}…` : flat;
}

/**
 * @param {object[]} fresh questions that appeared after the app started
 * @param {{settings: object, win: import('electron').BrowserWindow|null, activeProjectId: string|null}} ctx
 */
export function notifyQuestions(fresh, { settings, win, activeProjectId }) {
  if ((settings?.questionAlerts ?? 'popup-notify') !== 'popup-notify') return; // Bara popup or Av (FR4.2)
  if (!Notification.isSupported()) return;
  const focused = !!win && !win.isDestroyed() && win.isFocused();
  for (const q of fresh) {
    if (notified.has(q.id)) continue;
    notified.add(q.id); // decided once, when the question arrives
    if (focused && q.projectId === activeProjectId) continue; // the popup is enough (FR3.1)
    const n = new Notification({ title: notificationTitle(q), body: notificationBody(q), silent: settings?.notificationSound === false });
    live.add(n); // held so the click handler is not garbage-collected
    n.on('close', () => live.delete(n));
    n.on('click', () => {
      live.delete(n);
      if (!win || win.isDestroyed()) return;
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.webContents.send('questions:focus', q.id);
    });
    n.show();
  }
}
