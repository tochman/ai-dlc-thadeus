import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import UpdateNotice from '../../src/renderer/UpdateNotice.jsx';

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

describe('UpdateNotice (EPIC-04 US-0407)', () => {
  it('an available update shows the version, the notes as Markdown and three buttons, not as a modal', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    const notice = await screen.findByTestId('update-notice');
    expect(notice.tagName).toBe('ASIDE');
    expect(notice.getAttribute('role')).toBe('status');
    expect(notice.textContent).toMatch(/0\.2\.4 finns/);
    expect(screen.getByTestId('update-notice-notes').querySelector('strong').textContent).toBe('Uppdateringar');
    expect(['update-notice-update', 'update-notice-later', 'update-notice-skip'].map((id) => screen.getByTestId(id).textContent)).toEqual([
      'Uppdatera nu',
      'Senare',
      'Hoppa över den här versionen'
    ]);
    expect(window.bridge.checkUpdate).toHaveBeenCalledWith({ force: false }); // main keeps it to once a day
    fireEvent.click(screen.getByTestId('update-notice-later'));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('Skip calls skipUpdate with the version and hides the notice', async () => {
    mockBridge();
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-skip'));
    await waitFor(() => expect(window.bridge.skipUpdate).toHaveBeenCalledWith('0.2.4'));
    expect(screen.queryByTestId('update-notice')).toBeNull();
  });

  it('with a busy agent tab asks before installing; declined, nothing is downloaded or installed', async () => {
    mockBridge();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<UpdateNotice busy />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/agentflik arbetar.*avslutar dess terminalsessioner/));
    expect(window.bridge.downloadUpdate).not.toHaveBeenCalled();
    expect(window.bridge.installUpdate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('update-notice-update'));
    await waitFor(() => expect(window.bridge.relaunchApp).toHaveBeenCalled());
    expect(window.bridge.installUpdate).toHaveBeenCalledTimes(1);
  });

  it('an install error shows one sentence and the reveal button, and the app is not restarted', async () => {
    const error = 'Installationen misslyckades vid ditto: Permission denied';
    mockBridge({ installUpdate: vi.fn(async () => ({ status: 'error', error, file: '/ud/updates/v0.2.4/THADEUS-0.2.4-universal.dmg' })) });
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    expect((await screen.findByTestId('update-notice-error')).textContent).toBe(error);
    const reveal = screen.getByTestId('update-notice-reveal');
    expect(reveal.textContent).toBe('Visa i Finder');
    fireEvent.click(reveal);
    expect(window.bridge.revealUpdate).toHaveBeenCalled();
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('keeps the file and shows its path when cleanup is off, and shows download progress pushed by main', async () => {
    let push;
    mockBridge({
      onUpdateState: vi.fn((cb) => {
        push = cb;
        return () => {};
      }),
      downloadUpdate: vi.fn(() => new Promise(() => {})) // still downloading
    });
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    await act(async () => push({ status: 'downloading', received: 50, total: 100 }));
    expect(screen.getByTestId('update-notice-progress').textContent).toBe('Hämtar… 50 %');
    cleanup();

    mockBridge({ installUpdate: vi.fn(async () => ({ status: 'installed', kept: '/ud/updates/v0.2.4/THADEUS-0.2.4-universal.dmg' })) });
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    expect((await screen.findByTestId('update-notice-kept')).textContent).toMatch(/updates\/v0\.2\.4\/THADEUS-0\.2\.4-universal\.dmg/);
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('update-notice-relaunch'));
    expect(window.bridge.relaunchApp).toHaveBeenCalled();
  });

  it('the menu check says "latest version" or why it could not check; the start-up check stays silent then', async () => {
    mockBridge({ checkUpdate: vi.fn(async () => ({ status: 'none' })) });
    const { rerender } = render(<UpdateNotice busy={false} />);
    await waitFor(() => expect(window.bridge.checkUpdate).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('update-notice')).toBeNull(); // nothing new at start: no notice

    rerender(<UpdateNotice busy={false} checkRequest={1} />);
    expect((await screen.findByTestId('update-notice-message')).textContent).toBe('Du har den senaste versionen.');
    expect(window.bridge.checkUpdate).toHaveBeenLastCalledWith({ force: true });

    window.bridge.checkUpdate.mockResolvedValueOnce({
      status: 'unavailable',
      reason: 'GitHub gick inte att nå, så uppdateringskontrollen försöker igen senare.'
    });
    rerender(<UpdateNotice busy={false} checkRequest={2} />);
    await waitFor(() => expect(screen.getByTestId('update-notice-message').textContent).toMatch(/försöker igen senare/));
  });
});

describe('UpdateNotice asks for the password on Linux (EPIC-00 US-0034)', () => {
  const DEB = '/ud/updates/v0.2.4/thadeus_0.2.4_amd64.deb';
  const NEEDS = { status: 'needs-password', file: DEB };

  async function startUpdate(installUpdate) {
    mockBridge({ platform: 'linux', installUpdate });
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    return screen.findByTestId('update-notice-password');
  }

  it('needs-password shows the password form; Install sends the password and the app restarts', async () => {
    const installUpdate = vi.fn().mockResolvedValueOnce(NEEDS).mockResolvedValueOnce({ status: 'installed', kept: null });
    const form = await startUpdate(installUpdate);
    const input = screen.getByTestId('update-notice-password-input');
    expect(input.getAttribute('type')).toBe('password');
    expect(form.textContent).toMatch(/lösenord/i);
    fireEvent.change(input, { target: { value: 'hunter2' } });
    fireEvent.click(screen.getByTestId('update-notice-install'));
    await waitFor(() => expect(window.bridge.relaunchApp).toHaveBeenCalled());
    expect(installUpdate).toHaveBeenLastCalledWith({ password: 'hunter2' });
  });

  it('a wrong password says so, clears the field and asks again', async () => {
    const installUpdate = vi
      .fn()
      .mockResolvedValueOnce(NEEDS)
      .mockResolvedValueOnce({ ...NEEDS, wrong: true });
    await startUpdate(installUpdate);
    fireEvent.change(screen.getByTestId('update-notice-password-input'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByTestId('update-notice-install'));
    expect((await screen.findByTestId('update-notice-wrong-password')).textContent).toMatch(/Fel lösenord/);
    expect(screen.getByTestId('update-notice-password-input').value).toBe('');
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('Cancel keeps the running version and shows the command to install it by hand', async () => {
    await startUpdate(vi.fn().mockResolvedValueOnce(NEEDS));
    fireEvent.click(screen.getByTestId('update-notice-password-cancel'));
    expect((await screen.findByTestId('update-notice-manual')).textContent).toContain(`sudo apt install ${DEB}`);
    expect(window.bridge.relaunchApp).not.toHaveBeenCalled();
  });

  it('an install error with a manual command shows it', async () => {
    mockBridge({ platform: 'linux', installUpdate: vi.fn(async () => ({ status: 'error', error: 'x', file: DEB, manual: `sudo apt install ${DEB}` })) });
    render(<UpdateNotice busy={false} />);
    fireEvent.click(await screen.findByTestId('update-notice-update'));
    expect((await screen.findByTestId('update-notice-manual')).textContent).toContain(`sudo apt install ${DEB}`);
  });
});
