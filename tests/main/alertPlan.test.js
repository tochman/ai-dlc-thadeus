// US-0506 u5 D2, BR8.2: the one decision table shared by the store, the notifications and the renderer.
import { describe, expect, it } from 'vitest';
import { alertPlan } from '../../src/shared/alertPlan.js';

// kind, setting, in front -> { open, notify }
const ROWS = [
  ['question', 'popup-notify', false, true, true],
  ['question', 'popup-notify', true, true, false],
  ['question', 'popup', false, true, false],
  ['question', 'off', false, false, false],
  ['permission', 'popup-notify', false, true, true],
  ['permission', 'popup-notify', true, true, false],
  ['permission', 'popup', false, true, false],
  ['permission', 'off', false, false, false],
  ['reply', 'dialog-notify', false, true, true],
  ['reply', 'dialog-notify', true, true, false],
  ['reply', 'line', false, false, true],
  ['reply', 'line', true, false, false],
  ['reply', 'off', false, false, false],
  ['reply', 'off', true, false, false]
];

describe('alertPlan (US-0506 u5 D2)', () => {
  it.each(ROWS)('%s with %s, in front %s: open %s, notify %s', (kind, mode, inFront, open, notify) => {
    const settings = kind === 'reply' ? { replyAlerts: mode } : { questionAlerts: mode };
    expect(alertPlan(kind, settings, inFront)).toEqual({ open, notify, silent: false });
  });

  it('gives the defaults for missing or unknown settings', () => {
    expect(alertPlan('question', {}, false)).toEqual({ open: true, notify: true, silent: false });
    expect(alertPlan('reply', undefined, false)).toEqual({ open: true, notify: true, silent: false });
    expect(alertPlan('permission', { questionAlerts: 'loud' }, false)).toEqual({ open: true, notify: true, silent: false });
    expect(alertPlan('reply', { replyAlerts: 42 }, false)).toEqual({ open: true, notify: true, silent: false });
  });

  it('never lets questionAlerts change a reply, nor replyAlerts a question (AC5.1.2)', () => {
    expect(alertPlan('reply', { questionAlerts: 'off' }, false)).toEqual(alertPlan('reply', {}, false));
    expect(alertPlan('question', { replyAlerts: 'off' }, false)).toEqual(alertPlan('question', {}, false));
    expect(alertPlan('permission', { replyAlerts: 'line' }, false)).toEqual(alertPlan('permission', {}, false));
  });

  it('is silent only when notificationSound is false', () => {
    expect(alertPlan('question', { notificationSound: false }, false).silent).toBe(true);
    expect(alertPlan('reply', { notificationSound: true }, false).silent).toBe(false);
    expect(alertPlan('reply', { notificationSound: 'no' }, false).silent).toBe(false);
  });
});
