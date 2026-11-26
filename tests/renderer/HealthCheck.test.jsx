// US-0805: the health check's scan and its views (the start screen's panel and the line above a project), in Swedish.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { installFor } from '../../src/shared/installCommands.js';
import { HealthLine, HealthPanel, HealthStatus, useHealth } from '../../src/renderer/HealthCheck.jsx';

const IDS = ['aidlc', 'claude', 'opencode', 'gh', 'glab', 'specify', 'shell'];
const found = (id, over) => ({ id, path: `/usr/local/bin/${id}`, source: 'auto', found: true, version: '1.0.0', ...over });
const missing = (id, over) => ({ id, path: null, source: 'auto', found: false, version: null, error: `${id} hittades inte i PATH`, ...over });
const noAnswer = (id) => ({ ...found(id), found: false, version: null, error: 'svarar inte på --version: boom', noAnswer: true });
/** Every tool found, but for these rows. */
const scanOf = (...rows) => IDS.map((id) => rows.find((r) => r.id === id) ?? found(id));
const answer = (state, over) => ({ state, account: null, reason: null, ...over });
const IN = { claude: answer('in', { account: 'dana@example.com' }), opencode: answer('in'), gh: answer('in', { account: 'octo-dana' }) };
const label = (id) => t(`settings.tools.${id}`);

/** A promise and its settlers, for an answer the test gives when it wants to. */
function held() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => ((resolve = yes), (reject = no)));
  return { promise, resolve: (value) => act(async () => resolve(value)), reject: (err) => act(async () => reject(err)) };
}

let bridge;
let health;
let rerender;
function Harness({ ready = true, framework = null, line = false }) {
  health = useHealth({ ready, framework });
  return (
    <>
      <HealthStatus health={health} />
      {line ? <HealthLine health={health} /> : <HealthPanel health={health} />}
    </>
  );
}

/** The hook and its view with these scanned rows and sign-in answers; `tools` and `signIns` can be held promises. */
async function setup({ tools = scanOf(), signIns = IN, platform = 'darwin', ...props } = {}) {
  bridge = {
    platform,
    getTools: vi.fn(async () => tools),
    checkSignIn: vi.fn(async (id) => ({ ...IN, ...signIns })[id]),
    openExternal: vi.fn(async () => {})
  };
  window.bridge = bridge;
  const view = render(<Harness {...props} />);
  rerender = (next) => view.rerender(<Harness {...props} {...next} />);
  await act(async () => {});
}
const setTools = (...rows) => bridge.getTools.mockResolvedValue(scanOf(...rows));
const row = (id) => within(screen.getByTestId(`health-tool-${id}`));
const chip = (id) => screen.getByTestId(`health-tool-chip-${id}`).textContent;
const signInState = (id) => screen.queryByTestId(`health-signin-state-${id}`)?.textContent;
const listed = () => screen.queryAllByTestId(/^health-tool-(?!chip)/).map((el) => el.dataset.testid.replace('health-tool-', ''));
const again = () => screen.getByTestId('health-check-again');
const checkAgain = () => act(async () => fireEvent.click(again()));
const said = () => screen.getByTestId('health-status').textContent;

beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('The scan (US-0805 FR1.3, FR1.4, FR3.4, NFR2)', () => {
  it('starts when ready, once, and never before', async () => {
    await setup({ ready: false });
    expect(bridge.getTools).not.toHaveBeenCalled();
    await act(async () => rerender({ ready: true }));
    await act(async () => rerender({ ready: true, framework: 'aidlc' }));
    expect(bridge.getTools).toHaveBeenCalledTimes(1);
  });

  it('shows the versions before the sign-ins are there, and checks only tools that are found', async () => {
    const slow = held();
    await setup({ tools: scanOf(missing('gh')), signIns: { claude: slow.promise } });
    expect(row('claude').getByText('1.0.0')).toBeTruthy();
    expect(signInState('claude')).toBe(t('signIn.state.checking'));
    expect(health.status).toBe('checking');
    expect(bridge.checkSignIn.mock.calls.flat().sort()).toEqual(['claude', 'opencode']);
    await slow.resolve(answer('in'));
    expect(health.status).toBe('ready');
  });

  it('runs one scan at a time: a second press does nothing, and the window’s focus starts none', async () => {
    const slow = held();
    await setup({ signIns: { gh: slow.promise } }); // the first scan still waits for gh
    await checkAgain();
    await checkAgain();
    fireEvent.focus(window);
    await act(async () => {});
    expect(bridge.getTools).toHaveBeenCalledTimes(1);
    expect(bridge.checkSignIn).toHaveBeenCalledTimes(3);
    await slow.resolve(answer('in'));
    expect(bridge.getTools).toHaveBeenCalledTimes(1);
    await checkAgain();
    expect(bridge.getTools).toHaveBeenCalledTimes(2);
  });

  it('a path change during a scan runs one more when it is done, and that one’s answer stays', async () => {
    const first = held();
    const tools = vi.fn(() => first.promise);
    await setup();
    bridge.getTools.mockImplementation(tools);
    await checkAgain();
    act(() => health.refresh());
    act(() => health.refresh());
    expect(tools).toHaveBeenCalledTimes(1);
    tools.mockImplementation(async () => scanOf(found('claude', { version: '9.9.9' })));
    await first.resolve(scanOf(missing('claude')));
    await waitFor(() => expect(health.busy).toBe(false));
    expect(tools).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByTestId('health-panel-fold'));
    expect(row('claude').getByText('9.9.9')).toBeTruthy();
  });

  it('a path change with no scan under way starts one', async () => {
    await setup();
    await act(async () => health.refresh());
    expect(bridge.getTools).toHaveBeenCalledTimes(2);
  });

  it('a scan that fails keeps the last rows, says why, and the next one clears it', async () => {
    await setup({ tools: scanOf(missing('aidlc')), framework: 'aidlc' });
    bridge.getTools.mockRejectedValueOnce(new Error("Error invoking remote method 'tools:info': Error: no shell"));
    await checkAgain();
    expect(screen.getByRole('alert').textContent).toBe(t('settings.tools.loadFailed', { error: 'no shell' }));
    expect(chip('aidlc')).toBe(t('settings.tools.chip.missing'));
    expect(health.busy).toBe(false);
    await checkAgain();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('a first scan that fails says that the tools were not checked, and can be run again', async () => {
    const first = held();
    await setup({ tools: first.promise });
    expect(screen.getByTestId('health-panel-title').textContent).toBe(t('health.checking'));
    expect(chip('claude')).toBe(t('settings.tools.chip.checking'));
    await first.reject(new Error('no shell'));
    expect(screen.getByTestId('health-panel-title').textContent).toBe(t('health.notChecked'));
    expect(chip('claude')).toBe(t('health.chipNotChecked'));
    bridge.getTools.mockResolvedValue(scanOf());
    await checkAgain();
    expect(health.status).toBe('ready');
  });

  it('a sign-in check that fails is unknown with its reason, and leaves the others', async () => {
    await setup({ signIns: { claude: Promise.reject(new Error('boom')) }, tools: scanOf(missing('gh')), framework: 'aidlc' });
    expect(health.status).toBe('ready');
    fireEvent.click(screen.getByTestId('health-panel-fold'));
    expect(signInState('claude')).toBe(t('signIn.state.unknown'));
    expect(row('claude').getByText(t('signIn.reason.failed'))).toBeTruthy();
    expect(screen.queryByTestId('health-signin-command-claude')).toBeNull(); // not for "unknown"
    expect(signInState('opencode')).toBe(t('signIn.state.in'));
  });
});

describe('The list (US-0805 FR2.3, FR4)', () => {
  it('says for each tool whether it is needed and what for; with no framework, that one of the two is enough', async () => {
    await setup({ signIns: { claude: answer('out') } });
    expect(listed()).toEqual(['claude', 'aidlc', 'specify', 'opencode', 'gh']);
    for (const [id, need] of Object.entries({ claude: 'needed', aidlc: 'either', specify: 'either', opencode: 'optional', gh: 'optional' })) {
      const note = screen.getByTestId(`health-need-${id}`).textContent;
      expect(note).toContain(t(`health.need.${need}`));
      expect(note).toContain(t(`settings.tools.neededFor.${id}`));
    }
    await act(async () => rerender({ framework: 'speckit' }));
    expect(screen.getByTestId('health-need-specify').textContent).toContain(t('health.need.needed'));
    expect(screen.getByTestId('health-need-aidlc').textContent).toContain(t('health.need.optional'));
  });

  it('a missing tool shows its reason, install command, Copy and page; the others do not', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await setup({ tools: scanOf(missing('claude')) });
    expect(chip('claude')).toBe(t('settings.tools.chip.missing'));
    expect(chip('gh')).toBe(t('settings.tools.chip.found'));
    expect(row('claude').getByText('claude hittades inte i PATH')).toBeTruthy();
    expect(screen.getByTestId('health-install-command-claude').querySelector('code').textContent).toBe(installFor('claude', 'darwin').command);
    const copy = screen.getByTestId('health-install-copy-claude');
    expect(copy.getAttribute('aria-label')).toBe(t('health.copyInstall', { tool: label('claude') }));
    await act(async () => fireEvent.click(copy));
    expect(writeText.mock.calls).toEqual([[installFor('claude', 'darwin').command]]);
    const page = screen.getByTestId('health-page-claude');
    expect(page.getAttribute('aria-label')).toBe(t('health.pageFor', { tool: label('claude') }));
    await act(async () => fireEvent.click(page));
    expect(bridge.openExternal.mock.calls).toEqual([['install-claude']]);
    expect(screen.queryByTestId('health-install-command-gh')).toBeNull();
    expect(screen.queryByTestId('health-page-gh')).toBeNull();
  });

  it('a page that does not open and a copy that fails say so', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
    await setup({ tools: scanOf(missing('claude')) });
    bridge.openExternal.mockRejectedValue(new Error("Error invoking remote method 'app:openExternal': Error: no browser"));
    await act(async () => fireEvent.click(screen.getByTestId('health-page-claude')));
    expect(screen.getByRole('alert').textContent).toBe(t('app.browserFailed', { error: 'no browser' }));
    await act(async () => fireEvent.click(screen.getByTestId('health-install-copy-claude')));
    expect(screen.getAllByRole('alert').map((el) => el.textContent)).toContain(t('signIn.copyFailed', { error: 'denied' }));
  });

  it('names what is needed first, per platform', async () => {
    const needs = (id) => screen.getByTestId(`health-install-command-${id}`).textContent;
    await setup({ tools: scanOf(missing('gh'), missing('specify'), missing('claude')), framework: 'aidlc' });
    expect(needs('gh')).toContain(t('health.installNeeds', { needs: 'Homebrew' }));
    expect(needs('specify')).toContain(t('health.installNeeds', { needs: 'uv' }));
    expect(needs('claude')).toContain(t('health.install'));
    cleanup();
    await setup({ tools: scanOf(missing('gh'), missing('claude')), platform: 'linux' });
    expect(needs('gh')).toContain(t('health.install'));
    expect(screen.getByTestId('health-install-command-gh').querySelector('code').textContent).toBe(installFor('gh', 'linux').command);
  });

  it('a tool that does not answer shows its reason and no install command; a chosen path that is gone shows both', async () => {
    await setup({ tools: scanOf(noAnswer('claude'), missing('gh', { path: '/opt/gone/gh', source: 'saved', error: 'finns inte' })) });
    expect(chip('claude')).toBe(t('health.chipNoAnswer'));
    expect(row('claude').getByText('svarar inte på --version: boom')).toBeTruthy();
    expect(screen.queryByTestId('health-install-command-claude')).toBeNull();
    expect(row('gh').getByText('finns inte')).toBeTruthy();
    expect(screen.getByTestId('health-install-command-gh')).toBeTruthy();
  });

  it('a tool not signed in, or with no account, shows its command with a chosen path quoted, and no account name', async () => {
    const claude = found('claude', { path: '/opt/my tools/claude', source: 'saved' });
    await setup({ tools: scanOf(claude), signIns: { claude: answer('out'), opencode: answer('none') } });
    const command = (id) => screen.queryByTestId(`health-signin-command-${id}`)?.querySelector('code').textContent;
    expect(chip('claude')).toBe(t('settings.tools.chip.hand'));
    expect(signInState('claude')).toBe(t('signIn.state.out'));
    expect(command('claude')).toBe('/opt/my\\ tools/claude auth login');
    expect(screen.getByTestId('health-signin-copy-claude').getAttribute('aria-label')).toBe(t('health.copySignIn', { tool: label('claude') }));
    expect(command('opencode')).toBe('opencode auth login');
    expect(command('gh')).toBeUndefined();
    expect(document.body.textContent).not.toContain('octo-dana');
  });

  it('notes a PATH that could not be read, once', async () => {
    await setup({ tools: scanOf(missing('claude', { pathFallback: true }), missing('gh', { pathFallback: true })) });
    expect(screen.getAllByText(t('settings.tools.pathFallback'))).toHaveLength(1);
    setTools(missing('claude'));
    await checkAgain();
    expect(screen.queryByText(t('settings.tools.pathFallback'))).toBeNull();
  });
});

describe('The start screen’s panel (US-0805 FR3.2, FR3.4, FR5.2)', () => {
  it('folds to one line when ready, which opens and closes the list', async () => {
    await setup();
    const fold = screen.getByTestId('health-panel-fold');
    expect(fold.textContent).toBe(t('health.ready'));
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    expect(listed()).toEqual([]);
    fireEvent.click(fold);
    expect(fold.getAttribute('aria-expanded')).toBe('true');
    expect(listed()).toHaveLength(5);
    fireEvent.click(fold);
    expect(listed()).toEqual([]);
  });

  it('is open while there are problems, says which, and has no fold', async () => {
    await setup({ tools: scanOf(missing('aidlc'), missing('specify')), signIns: { claude: answer('out') } });
    expect(screen.queryByTestId('health-panel-fold')).toBeNull();
    expect(listed()).toHaveLength(5);
    const title = screen.getByTestId('health-panel-title').textContent;
    expect(title).toContain(t('health.missing', { tools: t('health.either', { a: label('aidlc'), b: label('specify') }) }));
    expect(title).toContain(t('health.out', { tools: label('claude') }));
  });

  it('while it is checked again the last answers stay, marked, the fold stays, and it does not say ready', async () => {
    await setup();
    const slow = held();
    bridge.getTools.mockReturnValueOnce(slow.promise);
    await checkAgain();
    const fold = screen.getByTestId('health-panel-fold');
    expect(fold.textContent).toBe(t('health.checking'));
    expect(fold.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(fold);
    for (const id of listed()) expect(screen.getByTestId(`health-checking-${id}`).textContent).toBe(t('signIn.again'));
    expect(chip('claude')).toBe(t('settings.tools.chip.found'));
    expect(signInState('claude')).toBe(t('signIn.state.in'));
    await slow.resolve(scanOf());
    expect(fold.textContent).toBe(t('health.ready'));
    expect(screen.queryByTestId('health-checking-claude')).toBeNull();
  });

  it('announces the result politely after "Check again" only, and the button keeps the focus', async () => {
    await setup({ tools: scanOf(missing('claude')) });
    expect(screen.getByTestId('health-status').getAttribute('aria-live')).toBe('polite');
    expect(said()).toBe(''); // the start's own scan is not announced
    const slow = held();
    bridge.getTools.mockReturnValueOnce(slow.promise);
    again().focus();
    await checkAgain();
    expect(again().getAttribute('aria-disabled')).toBe('true');
    expect(again().disabled).toBe(false);
    expect(said()).toBe('');
    await slow.resolve(scanOf());
    expect(said()).toBe(t('health.ready'));
    expect(again().hasAttribute('aria-disabled')).toBe(false);
    expect(document.activeElement).toBe(again()); // also when the list has folded
    setTools(missing('claude'));
    await checkAgain();
    expect(said()).toBe(t('health.missing', { tools: label('claude') }));
    await act(async () => health.refresh());
    expect(said()).toBe('');
  });
});

describe('The line above a project (US-0805 FR3.3)', () => {
  const line = () => screen.queryByTestId('health-line');
  const dismiss = () => fireEvent.click(screen.getByTestId('health-line-dismiss'));

  it('is not there when ready, or while the first check runs', async () => {
    const slow = held();
    await setup({ line: true, framework: 'aidlc', tools: slow.promise });
    expect(line()).toBeNull();
    await slow.resolve(scanOf(missing('specify'), missing('gh'))); // optional in an AI-DLC project
    expect(line()).toBeNull();
  });

  it('names what is missing, does not answer or is not signed in, and Show opens the same list in place', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('aidlc')), signIns: { claude: answer('out') } });
    const text = screen.getByTestId('health-line-text').textContent;
    expect(text).toContain(t('health.missing', { tools: label('aidlc') }));
    expect(text).toContain(t('health.out', { tools: label('claude') }));
    const show = screen.getByTestId('health-line-show');
    expect(show.getAttribute('aria-expanded')).toBe('false');
    expect(listed()).toEqual([]);
    fireEvent.click(show);
    expect(show.getAttribute('aria-expanded')).toBe('true');
    expect(listed().slice(0, 2).sort()).toEqual(['aidlc', 'claude']);
    expect(again()).toBeTruthy();
    fireEvent.click(show);
    expect(listed()).toEqual([]);
    setTools(noAnswer('aidlc'));
    await act(async () => health.refresh());
    expect(screen.getByTestId('health-line-text').textContent).toContain(t('health.noAnswer', { tools: label('aidlc') }));
  });

  it('follows the project’s framework', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('aidlc')) });
    expect(line()).not.toBeNull();
    await act(async () => rerender({ framework: 'speckit' }));
    expect(line()).toBeNull();
    await act(async () => rerender({ framework: null })); // no framework yet: either is enough
    expect(line()).toBeNull();
  });

  it('stays dismissed, also after another check and another project, until a tool that was no problem becomes one', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('aidlc')) });
    dismiss();
    expect(line()).toBeNull();
    await act(async () => health.refresh());
    expect(line()).toBeNull();
    await act(async () => rerender({ framework: 'speckit' }));
    await act(async () => rerender({ framework: 'aidlc' }));
    expect(line()).toBeNull(); // switching project does not bring it back by itself
    setTools(missing('aidlc'), missing('claude'));
    await act(async () => health.refresh());
    expect(line()).not.toBeNull();
  });

  it('comes back when a tool that worked again fails once more', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('aidlc')) });
    dismiss();
    setTools();
    await act(async () => health.refresh());
    expect(line()).toBeNull();
    setTools(missing('aidlc'));
    await act(async () => health.refresh());
    expect(line()).not.toBeNull();
  });

  it('a tool dismissed as missing does not bring it back when it is installed and only not signed in', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('claude')), signIns: { claude: answer('out') } });
    dismiss();
    setTools();
    await act(async () => health.refresh());
    expect(health.status).toBe('problems');
    expect(line()).toBeNull();
  });

  it('announces that everything is ready though the line has gone', async () => {
    await setup({ line: true, framework: 'aidlc', tools: scanOf(missing('aidlc')) });
    fireEvent.click(screen.getByTestId('health-line-show'));
    setTools();
    await checkAgain();
    expect(line()).toBeNull();
    expect(said()).toBe(t('health.ready'));
  });
});
