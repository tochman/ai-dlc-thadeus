// EPIC-04 US-0407 (the updater's notice), EPIC-00 US-0034 (the Linux password) and US-0417 (one LCARS Update dialog
// over the same logic: checking, up to date, available, downloading, password, ready to restart, error).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import UpdateNotice, { openUpdateDialog } from '../../src/renderer/UpdateNotice.jsx';

// Shaped like update:check returns (src/main/updater.js releaseStatus).
const AVAILABLE = {
  status: 'available',
  version: '0.2.4',
  tag: 'v0.2.4',
  notes: '## Nytt\n- **Uppdateringar** från GitHub',
  asset: { name: 'THADEUS-0.2.4-universal.dmg', size: 100 }
};

function mockBridge(overrides = {}) {
  window.bridge = {
    platform: 'darwin',
    getAppInfo: vi.fn(async () => ({ version: '0.2.3' })),
    checkUpdate: vi.fn(async () => AVAILABLE),
    onUpdateState: vi.fn(() => () => {}),
    downloadUpdate: vi.fn(async () => ({ status: 'downloaded', file: '/ud/updates/v0.2.4/THADEUS-0.2.4-universal.dmg', verified: true })),
    installUpdate: vi.fn(async () => ({ status: 'installed', kept: null })),
    relaunchApp: vi.fn(async () => {}),
    skipUpdate: vi.fn(async () => {}),
    revealUpdate: vi.fn(async () => {}),
    ...overrides
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dialog = () => screen.getByTestId('update-dialog');
const isOpen = () => dialog().hasAttribute('open');

/** The start-up check found an update: the small notice is the way into the dialog. */
async function openFromNotice() {
  fireEvent.click(await screen.findByTestId('update-notice-open'));
  return dialog();
}

describe('UpdateNotice: the small notice (EPIC-04 US-0407)', () => {
  it('an available update at start shows a calm notice, not a modal, that opens the dialog', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    const notice = await screen.findByTestId('update-notice');
    expect(notice.tagName).toBe('ASIDE');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toMatch(/0\.2\.4 finns/);
    expect(isOpen()).toBe(false);
    expect(window.bridge.checkUpdate).toHaveBeenCalledWith({ force: false }); // main keeps it to once a day
    await openFromNotice();
    expect(isOpen()).toBe(true);
    expect(screen.queryByTestId('update-notice')).toBeNull(); // the dialog replaces the notice while it is open
  });

  it('Later on the notice hides it', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-later'));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('nothing new at start shows nothing', async () => {
    mockBridge({ checkUpdate: vi.fn(async () => ({ status: 'none' })) });
    render(<UpdateNotice busy={false} />);
    await waitFor(() => expect(window.bridge.checkUpdate).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('update-notice')).toBeNull();
    expect(isOpen()).toBe(false);
  });
});

describe('UpdateDialog states (US-0417)', () => {
  it('available: current → new, the notes as Markdown, and Update now, Later, Skip as pills', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    const state = await screen.findByTestId('update-dialog-available');
    await waitFor(() => expect(within(state).getByTestId('update-dialog-versions').textContent).toMatch(/v0\.2\.3\s*→\s*v0\.2\.4/));
    expect(screen.getByTestId('update-dialog-notes').querySelector('strong').textContent).toBe('Uppdateringar');
    const pills = ['update-dialog-update', 'update-dialog-later', 'update-dialog-skip'].map((id) => screen.getByTestId(id));
    expect(pills.map((p) => p.textContent)).toEqual(['Uppdatera nu', 'Senare', 'Hoppa över den här versionen']);
    for (const p of pills) expect(p.className).toMatch(/lcars-pill/);
    expect(screen.getByTestId('update-dialog-close').closest('[data-testid="lcars-segbar"]')).toBeTruthy(); // Close ends the title bar
    fireEvent.click(screen.getByTestId('update-dialog-later'));
    expect(isOpen()).toBe(false);
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('Skip calls skipUpdate with the version and closes everything', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-skip'));
    await waitFor(() => expect(window.bridge.skipUpdate).toHaveBeenCalledWith('0.2.4'));
    await waitFor(() => expect(isOpen()).toBe(false));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('the opener opens it checking, with a read-only meter, then up to date with the version', async () => {
    let answer;
    mockBridge({ checkUpdate: vi.fn(async ({ force }) => (force ? new Promise((r) => (answer = r)) : { status: 'none' })) });
    render(<UpdateNotice busy={false} />);
    await waitFor(() => expect(window.bridge.checkUpdate).toHaveBeenCalledTimes(1));
    act(() => openUpdateDialog());
    expect(isOpen()).toBe(true);
    const checking = await screen.findByTestId('update-dialog-checking');
    expect(within(checking).getByRole('img')).toBeTruthy();
    expect(within(dialog()).queryByRole('slider')).toBeNull();
    expect(window.bridge.checkUpdate).toHaveBeenLastCalledWith({ force: true });
    await act(async () => answer({ status: 'none' }));
    const upToDate = await screen.findByTestId('update-dialog-uptodate');
    expect(upToDate.textContent).toMatch(/Du har den senaste versionen\./);
    await waitFor(() => expect(upToDate.textContent).toMatch(/v0\.2\.3/));
  });

  it('the menu check opens it too; a check that cannot run is an error with its reason and Try again', async () => {
    mockBridge({ checkUpdate: vi.fn(async () => ({ status: 'none' })) });
    const { rerender } = render(<UpdateNotice busy={false} />);
    await waitFor(() => expect(window.bridge.checkUpdate).toHaveBeenCalledTimes(1));
    window.bridge.checkUpdate.mockResolvedValueOnce({ status: 'unavailable', reason: 'GitHub gick inte att nå: kontrollera internetanslutningen.' });
    rerender(<UpdateNotice busy={false} checkRequest={1} />);
    const error = await screen.findByTestId('update-dialog-error');
    expect(isOpen()).toBe(true);
    expect(within(error).getByRole('alert').textContent).toMatch(/kontrollera internetanslutningen/);
    expect(error.querySelector('.update-dialog-err')).toBeTruthy(); // the coral strip
    fireEvent.click(screen.getByTestId('update-dialog-retry'));
    expect(await screen.findByTestId('update-dialog-uptodate')).toBeTruthy();
    expect(window.bridge.checkUpdate).toHaveBeenLastCalledWith({ force: true });
  });

  it('downloading shows progress as a segmented meter that is an image, not a slider', async () => {
    let push;
    mockBridge({
      onUpdateState: vi.fn((cb) => {
        push = cb;
        return () => {};
      }),
      downloadUpdate: vi.fn(() => new Promise(() => {})) // still downloading
    });
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-update'));
    await act(async () => push({ status: 'downloading', received: 50, total: 100 }));
    const state = screen.getByTestId('update-dialog-downloading');
    const meter = within(state).getByTestId('lcars-segmeter');
    expect(meter.getAttribute('role')).toBe('img');
    expect(meter.getAttribute('aria-label')).toBe('Hämtar… 50 %');
    expect(meter.hasAttribute('tabindex')).toBe(false);
    expect(within(dialog()).queryByRole('slider')).toBeNull();
    expect(meter.querySelectorAll('.is-live')).toHaveLength(10); // half of the 20 cells
  });

  it('with a busy agent tab warns in the dialog and asks before installing; declined, nothing is downloaded', async () => {
    mockBridge();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UpdateNotice busy />);
    await openFromNotice();
    expect((await screen.findByTestId('update-dialog-busy')).textContent).toMatch(/agentflik arbetar/);
    fireEvent.click(screen.getByTestId('update-dialog-update'));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/agentflik arbetar.*avslutar dess terminalsessioner/));
    expect(window.bridge.downloadUpdate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('update-dialog-update'));
    await waitFor(() => expect(window.bridge.relaunchApp).toHaveBeenCalled());
    expect(window.bridge.installUpdate).toHaveBeenCalledTimes(1);
  });

  it('an install error shows its reason on the coral strip and the reveal pill; the app is not restarted', async () => {
    const error = 'Installationen misslyckades vid ditto: Permission denied';
    mockBridge({ installUpdate: vi.fn(async () => ({ status: 'error', error, file: '/ud/updates/v0.2.4/THADEUS-0.2.4-universal.dmg' })) });
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-update'));
    expect((await screen.findByTestId('update-dialog-error-text')).textContent).toBe(error);
    const reveal = screen.getByTestId('update-dialog-reveal');
    expect(reveal.textContent).toBe('Visa i Finder');
    fireEvent.click(reveal);
    expect(window.bridge.revealUpdate).toHaveBeenCalled();
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('ready to restart keeps the file path in view until Restart now', async () => {
    mockBridge({ installUpdate: vi.fn(async () => ({ status: 'installed', kept: '/ud/updates/v0.2.4/THADEUS-0.2.4-universal.dmg' })) });
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-update'));
    expect((await screen.findByTestId('update-dialog-ready')).textContent).toMatch(/updates\/v0\.2\.4\/THADEUS-0\.2\.4-universal\.dmg/);
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('update-dialog-relaunch'));
    expect(window.bridge.relaunchApp).toHaveBeenCalled();
  });

  it('Esc, the Close pill and a click on the backdrop close it; an offer stays as the notice', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.keyDown(dialog(), { key: 'Escape' });
    expect(isOpen()).toBe(false);
    expect(screen.getByTestId('update-notice')).toBeTruthy();

    await openFromNotice();
    fireEvent.click(screen.getByTestId('update-dialog-close'));
    expect(isOpen()).toBe(false);

    await openFromNotice();
    fireEvent.click(screen.getByTestId('update-dialog-update').closest('.lcars-rf')); // a click inside keeps it open
    expect(isOpen()).toBe(true);
    fireEvent.click(dialog()); // the dialog element itself is the backdrop
    expect(isOpen()).toBe(false);
  });
});

describe('UpdateDialog asks for the password on Linux (EPIC-00 US-0034)', () => {
  const DEB = '/ud/updates/v0.2.4/thadeus_0.2.4_amd64.deb';
  const NEEDS = { status: 'needs-password', file: DEB };

  async function startUpdate(installUpdate) {
    mockBridge({ platform: 'linux', installUpdate });
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-update'));
    return screen.findByTestId('update-dialog-password');
  }

  it('needs-password shows the password form; Install sends the password and the app restarts', async () => {
    const installUpdate = vi.fn().mockResolvedValueOnce(NEEDS).mockResolvedValueOnce({ status: 'installed', kept: null });
    const form = await startUpdate(installUpdate);
    const input = screen.getByTestId('update-dialog-password-input');
    expect(input.getAttribute('type')).toBe('password');
    expect(form.textContent).toMatch(/lösenord/i);
    fireEvent.change(input, { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByTestId('update-dialog-install'));
    await waitFor(() => expect(window.bridge.relaunchApp).toHaveBeenCalled());
    expect(installUpdate).toHaveBeenLastCalledWith({ password: 'hunter2' });
  });

  it('a wrong password says so, clears the field and asks again', async () => {
    const installUpdate = vi
      .fn()
      .mockResolvedValueOnce(NEEDS)
      .mockResolvedValueOnce({ ...NEEDS, wrong: true });
    await startUpdate(installUpdate);
    fireEvent.change(screen.getByTestId('update-dialog-password-input'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByTestId('update-dialog-install'));
    expect((await screen.findByTestId('update-dialog-wrong-password')).textContent).toMatch(/Fel lösenord/);
    expect(screen.getByTestId('update-dialog-password-input').value).toBe('');
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('Cancel keeps the running version and shows the command to install it by hand', async () => {
    await startUpdate(vi.fn().mockResolvedValueOnce(NEEDS));
    fireEvent.click(screen.getByTestId('update-dialog-password-cancel'));
    expect((await screen.findByTestId('update-dialog-manual')).textContent).toContain(`sudo apt install ${DEB}`);
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('an install error with a manual command shows it', async () => {
    mockBridge({ platform: 'linux', installUpdate: vi.fn(async () => ({ status: 'error', error: 'x', file: DEB, manual: `sudo apt install ${DEB}` })) });
    render(<UpdateNotice busy={false} />);
    await openFromNotice();
    fireEvent.click(await screen.findByTestId('update-dialog-update'));
    expect((await screen.findByTestId('update-dialog-manual')).textContent).toContain(`sudo apt install ${DEB}`);
  });
});
