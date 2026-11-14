// US-0506 u3 LC11: the latest-message strip in the Swedish locale (BR6.15, BR6.16, BR6.18, RD16, SD11, D11, W9;
// review R-06; AC3.1.2, AC3.1.3, AC3.1.5).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LatestMessageStrip from '../../src/renderer/LatestMessageStrip.jsx';

const RLO = String.fromCodePoint(0x202e);
const latestOf = (over = {}) => ({
  tabId: 'agent:claude',
  harness: 'claude',
  text: '\n\n**Vilket** namn ska filen få?\n\n## Rubrik\n\n- punkt',
  arrivedAt: '2026-11-14T10:05:00.000Z',
  status: 'waiting',
  eventId: 'r1',
  truncated: false,
  empty: false,
  ...over
});

let agentEvents, changed, onOpenReply;
function setup(value) {
  changed = null;
  agentEvents = {
    latest: vi.fn(async () => value),
    onChanged: vi.fn((fn) => {
      changed = fn;
      return () => (changed = null);
    }),
    answer: vi.fn(),
    close: vi.fn(),
    reopen: vi.fn()
  };
  window.bridge = { agentEvents };
  onOpenReply = vi.fn();
}
const mount = async (value) => {
  setup(value);
  render(<LatestMessageStrip projectId="p1" onOpenReply={onOpenReply} />);
  await waitFor(() => expect(agentEvents.latest).toHaveBeenCalled());
  await act(async () => {});
};
const strip = () => screen.getByTestId('latest-message-strip');
const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, ul, ol, pre, blockquote';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal ??= function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function () {
    this.removeAttribute('open');
  };
});
afterEach(cleanup);

describe('LatestMessageStrip', () => {
  it('with no message shows "Inget meddelande från agenten än" and no button (BR6.18, RD16)', async () => {
    await mount(null);
    expect(strip().textContent).toContain('Inget meddelande från agenten än');
    expect(strip().querySelectorAll('button')).toHaveLength(0);
  });

  it('waiting: tab, time, the first non-empty line as inline Markdown (no block element) and Answer', async () => {
    await mount(latestOf());
    expect(screen.getByTestId('latest-message-tab').textContent).toContain('Claude Code');
    expect(strip().textContent).toMatch(/\d{2}[:.]\d{2}/);
    const line = screen.getByTestId('latest-message-line');
    expect(line.textContent).toBe('Vilket namn ska filen få?');
    expect(line.querySelector('strong')?.textContent).toBe('Vilket');
    expect(line.querySelectorAll(BLOCKS)).toHaveLength(0);
    expect(screen.getByTestId('latest-message-answer').textContent).toBe('Svara');
    expect(screen.queryByTestId('latest-message-show')).toBeNull();
  });

  it.each([
    ['answered', '(besvarat)'],
    ['sessionEnded', '(sessionen avslutad)'],
    ['notShown', '(nyare meddelande visas inte)']
  ])('%s shows "%s" and Show', async (status, mark) => {
    await mount(latestOf({ status }));
    expect(screen.getByTestId('latest-message-tab').textContent).toContain(mark);
    expect(screen.getByTestId('latest-message-show').textContent).toBe('Visa');
    expect(screen.queryByTestId('latest-message-answer')).toBeNull();
  });

  it('marks a shortened message', async () => {
    await mount(latestOf({ truncated: true }));
    expect(strip().textContent).toContain('(förkortat)');
  });

  it('shows a U+202E line without the U+202E (review R-06)', async () => {
    await mount(latestOf({ text: `Byt namn ${RLO}gpj.exe` }));
    expect(screen.getByTestId('latest-message-line').textContent).toBe('Byt namn gpj.exe');
  });

  it('refetches on agent-events:changed for its own project only', async () => {
    await mount(latestOf());
    agentEvents.latest.mockResolvedValue(latestOf({ status: 'answered' }));
    await act(async () => changed({ projectId: 'other', events: [] }));
    expect(agentEvents.latest).toHaveBeenCalledTimes(1);
    await act(async () => changed({ projectId: 'p1', events: [] }));
    expect(agentEvents.latest).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('latest-message-tab').textContent).toContain('(besvarat)');
  });

  it('Answer is a focusable button that calls onOpenReply(eventId) (AC3.1.3)', async () => {
    await mount(latestOf());
    const answer = screen.getByTestId('latest-message-answer');
    expect(answer.tagName).toBe('BUTTON');
    answer.focus();
    expect(document.activeElement).toBe(answer);
    fireEvent.click(answer);
    expect(onOpenReply).toHaveBeenCalledWith('r1');
  });

  it('Show opens the read-only view: full Markdown, the shortened line, no field, Close only; nothing else called (W9)', async () => {
    await mount(latestOf({ status: 'answered', truncated: true }));
    fireEvent.click(screen.getByTestId('latest-message-show'));
    const view = screen.getByTestId('latest-message-view');
    expect(view.hasAttribute('open')).toBe(true);
    expect(view.querySelector('h2')?.textContent).toBe('Rubrik');
    expect(view.textContent).toContain('Förkortat vid 64 KB');
    expect(view.querySelectorAll('input, textarea')).toHaveLength(0);
    expect([...view.querySelectorAll('button')].map((b) => b.dataset.testid)).toEqual(['latest-message-view-close']);
    fireEvent.click(screen.getByTestId('latest-message-view-close'));
    expect(view.hasAttribute('open')).toBe(false);
    for (const fn of ['answer', 'close', 'reopen']) expect(agentEvents[fn]).not.toHaveBeenCalled();
    expect(onOpenReply).not.toHaveBeenCalled();
  });

  it('renders an unsafe payload inert in the strip and the view (SD11)', async () => {
    const bad = `<script>x</script><style>*{}</style> <iframe></iframe><img src=x onerror="y"> [j](javascript:z) **ok**`;
    await mount(latestOf({ text: bad, status: 'answered' }));
    fireEvent.click(screen.getByTestId('latest-message-show'));
    for (const root of [screen.getByTestId('latest-message-line'), screen.getByTestId('latest-message-view')]) {
      expect(root.querySelectorAll('script, style, iframe, img')).toHaveLength(0);
      expect([...root.querySelectorAll('*')].some((el) => [...el.attributes].some((a) => a.name.startsWith('on')))).toBe(false);
      expect(root.querySelectorAll('a')).toHaveLength(0);
    }
  });
});
