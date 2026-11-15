// US-0506 u5 US5.1, D2, BR8.2 (LC51): the one decision per kind and setting, used by AgentEventStore (state at
// arrival), Notifications (notify or not) and the renderer (open the dialog or not), so the three never disagree.
// Pure, no imports. A value outside the known set gives the default, like the settings sanitising (D1).

const QUESTION_DEFAULT = 'popup-notify';
const REPLY_DEFAULT = 'dialog-notify';
const QUESTION_MODES = new Set(['popup-notify', 'popup', 'off']);
const REPLY_MODES = new Set(['dialog-notify', 'line', 'off']);

/**
 * US-0506 u5 D2: whether the dialog opens on its own, whether a system notification shows, and whether it is silent.
 * @param {'question'|'permission'|'reply'} kind
 * @param {{questionAlerts?: string, replyAlerts?: string, notificationSound?: boolean}|undefined} settings
 * @param {boolean} inFront the window is focused and shows the event's project
 * @returns {{open: boolean, notify: boolean, silent: boolean}}
 */
export function alertPlan(kind, settings, inFront) {
  const s = settings ?? {};
  const silent = s.notificationSound === false;
  if (kind === 'reply') {
    const mode = REPLY_MODES.has(s.replyAlerts) ? s.replyAlerts : REPLY_DEFAULT;
    return { open: mode === 'dialog-notify', notify: mode !== 'off' && !inFront, silent };
  }
  const mode = QUESTION_MODES.has(s.questionAlerts) ? s.questionAlerts : QUESTION_DEFAULT;
  return { open: mode !== 'off', notify: mode === 'popup-notify' && !inFront, silent };
}
