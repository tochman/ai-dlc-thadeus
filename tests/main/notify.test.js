// US-0506 u5 D3–D6, SD50–SD56, PD50, PD53 (and EPIC-07 US-0701 FR1.2 for the language): Notifications.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/shared/i18n.js';

const shown = [];
let supported = true;
let throwOnShow = false;
vi.mock('electron', () => {
  class Notification {
    static isSupported = () => supported;
    constructor(options) {
      this.options = options;
      this.handlers = {};
    }
    on(name, fn) {
      this.handlers[name] = fn;
    }
    show() {
      if (throwOnShow) throw new TypeError('refused');
      shown.push(this);
    }
  }
  return { Notification };
});
const { notificationText, notifyEvent, notifyQuestions } = await import('../../src/main/notify.js');

const ESC = String.fromCodePoint(0x1b);
const RLO = String.fromCodePoint(0x202e);
const ZWSP = String.fromCodePoint(0x200b);
const CODER = `👩${String.fromCodePoint(0x200d)}💻`; // a ZWJ emoji sequence
let n = 0;
const event = (over = {}) => ({
  eventId: `h${++n}-test`,
  harness: 'claude',
  projectId: 'p1',
  kind: 'question',
  questions: [{ text: 'Which file should I edit?' }],
  ...over
});
const fakeWin = (focused = false) => ({
  isDestroyed: vi.fn(() => false),
  isFocused: vi.fn(() => focused),
  isMinimized: vi.fn(() => true),
  restore: vi.fn(),
  show: vi.fn(),
  focus: vi.fn(),
  webContents: { send: vi.fn() }
});
const ctx = (over = {}) => ({ settings: {}, win: fakeWin(), activeProjectId: 'p1', projectName: 'aidlc-dash', timing: { stamp: vi.fn() }, ...over });

beforeEach(async () => {
  shown.length = 0;
  supported = true;
  throwOnShow = false;
  await i18n.changeLanguage('en');
});
afterEach(() => i18n.changeLanguage('sv'));

describe('notificationText (D3, SD50–SD52)', () => {
  it('titles each kind with the harness name and builds the body from the project and the first line', () => {
    expect(notificationText(event(), 'aidlc-dash')).toEqual({ title: 'Claude Code is waiting for you', body: 'aidlc-dash · Which file should I edit?' });
    expect(notificationText(event({ kind: 'permission', harness: 'opencode', permission: { what: 'Bash', detail: 'npm test\nrm -rf x' } }), 'B')).toEqual({
      title: 'opencode asks for permission',
      body: 'B · Bash npm test'
    });
    expect(notificationText(event({ kind: 'reply', message: { text: 'Done. All 353 tests pass.' } }), 'B').title).toBe('Message from Claude Code');
    expect(notificationText(event({ kind: 'reply', message: { text: '', empty: true } }), 'B').body).toBe(
      'B · Claude Code finished its turn without a message.'
    );
    expect(notificationText(event({ questions: [{ text: 'First?' }, { text: 'Second?' }] }), 'B').body).toBe('B · First?');
  });

  it('drops Markdown and the URL, and joins whitespace runs', () => {
    const { body } = notificationText(event({ kind: 'reply', message: { text: '\n\n## **Bold**   and  [a link](https://x.test/secret)\nmore' } }), 'p');
    expect(body).toBe('p · Bold and a link');
  });

  it('removes control and bidi characters but keeps emoji and åäö', () => {
    const { body } = notificationText(event({ questions: [{ text: `${ESC}[31må${RLO}äö ${CODER}${ZWSP} ok` }] }), 'p');
    expect(body).toBe(`p · [31måäö ${CODER} ok`);
    for (const c of [ESC, RLO, ZWSP]) expect(body).not.toContain(c);
  });

  it('cuts the text at 120 graphemes and the project at 40, keeping an emoji on the cut whole', () => {
    const long = notificationText(event({ questions: [{ text: 'x'.repeat(200) }] }), 'p').body;
    expect(long).toBe(`p · ${'x'.repeat(120)}…`);
    const emoji = notificationText(event({ questions: [{ text: `${'x'.repeat(119)}${CODER}yz` }] }), 'p').body;
    expect(emoji).toBe(`p · ${'x'.repeat(119)}${CODER}…`);
    expect(notificationText(event(), 'n'.repeat(60)).body.startsWith(`${'n'.repeat(40)}… · `)).toBe(true);
  });

  it('builds the text in the current language, and escapes markup on Linux only (SD56)', async () => {
    await i18n.changeLanguage('sv');
    expect(notificationText(event(), 'p').title).toBe('Claude Code väntar på dig');
    const q = event({ questions: [{ text: '<b>bold</b> & x' }] });
    expect(notificationText(q, 'p', 'darwin').body).toBe('p · <b>bold</b> & x');
    expect(notificationText(q, 'p', 'linux').body).toBe('p · &lt;b&gt;bold&lt;/b&gt; &amp; x');
  });
});

describe('notifyEvent (D2, D4–D6, PD50, PD53)', () => {
  it('shows one notification with exactly title, body and silent, and stamps it', () => {
    const c = ctx({ activeProjectId: 'other' });
    const ev = event();
    notifyEvent(ev, c);
    expect(shown).toHaveLength(1);
    expect(Object.keys(shown[0].options).sort()).toEqual(['body', 'silent', 'title']);
    expect(shown[0].options.silent).toBe(false);
    expect(c.timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'notificationShown');
  });

  it('does not notify when the window is focused on the event project, nor a second time for the same id', () => {
    const ev = event();
    notifyEvent(ev, ctx({ win: fakeWin(true) }));
    notifyEvent(ev, ctx({ win: fakeWin(false) })); // a reopen or a re-offer: decided once
    expect(shown).toHaveLength(0);
    const other = event();
    notifyEvent(other, ctx());
    notifyEvent(other, ctx());
    expect(shown).toHaveLength(1);
  });

  it('follows the settings: a reply with off never, silent with the sound off, a question with popup never', () => {
    notifyEvent(event({ kind: 'reply', message: { text: 'hi' } }), ctx({ settings: { replyAlerts: 'off' } }));
    notifyEvent(event(), ctx({ settings: { questionAlerts: 'popup' } }));
    expect(shown).toHaveLength(0);
    notifyEvent(event({ kind: 'reply', message: { text: 'hi' } }), ctx({ settings: { replyAlerts: 'line', notificationSound: false } }));
    expect(shown[0].options.silent).toBe(true);
  });

  it('logs one line and returns when notifications are unsupported or show throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    supported = false;
    const a = event();
    expect(() => notifyEvent(a, ctx())).not.toThrow();
    supported = true;
    throwOnShow = true;
    const b = event({ questions: [{ text: 'secret text' }] });
    expect(() => notifyEvent(b, ctx())).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[1][0]).toBe(`[notifications] failed event=${b.eventId} kind=question cause=TypeError`);
    expect(warn.mock.calls.flat().join(' ')).not.toContain('secret');
    warn.mockRestore();
  });

  it('a click restores, shows and focuses the window, pushes agent-events:focus and stamps the click', () => {
    const c = ctx();
    const ev = event();
    notifyEvent(ev, c);
    shown[0].handlers.click();
    expect(c.win.restore).toHaveBeenCalled();
    expect(c.win.show).toHaveBeenCalled();
    expect(c.win.focus).toHaveBeenCalled();
    expect(c.win.webContents.send).toHaveBeenCalledTimes(1);
    expect(c.win.webContents.send).toHaveBeenCalledWith('agent-events:focus', { eventId: ev.eventId });
    expect(c.timing.stamp).toHaveBeenCalledWith(ev.eventId, 'claude', 'notificationClicked');
  });

  it('a click after the window was destroyed does nothing', () => {
    const c = ctx();
    notifyEvent(event(), c);
    c.win.isDestroyed.mockReturnValue(true);
    shown[0].handlers.close?.();
    shown[0].handlers.click();
    expect(c.win.show).not.toHaveBeenCalled();
    expect(c.win.webContents.send).not.toHaveBeenCalled();
  });

  it('shows ten notifications for ten events in one turn (FR6.1)', () => {
    const c = ctx();
    for (let i = 0; i < 10; i++) notifyEvent(event(), c);
    expect(shown).toHaveLength(10);
  });
});

describe('notifyQuestions, the audit path (Amendment 5)', () => {
  it('gives today gate and ask texts through notifyEvent, titled as AI-DLC questions, with the audit event id', () => {
    const c = ctx({ activeProjectId: null });
    const gate = { id: 'g1', projectId: 'p1', projectName: 'visinv', kind: 'gate', stage: 'requirements-analysis', nextStage: 'user-stories', timeMs: 1 };
    const ask = { id: 'a1', projectId: 'p1', projectName: 'visinv', kind: 'question', ask: 'plan-approval', stage: 'code-generation', timeMs: 2 };
    notifyQuestions([gate, ask, gate], c);
    expect(shown.map((x) => x.options.body)).toEqual([
      'visinv · Approval: requirements-analysis → user-stories',
      'visinv · Approve the plan for code-generation'
    ]);
    expect(shown[0].options.title).toBe('AI-DLC is waiting for you');
    shown[0].handlers.click();
    expect(c.win.webContents.send.mock.calls[0][1].eventId).toMatch(/^audit-[0-9a-f]{40}$/);
  });
});
