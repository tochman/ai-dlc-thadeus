// US-1407 AC2.3.1–AC2.3.4, BR8.1–BR8.4, BR8.6, NFR1.2, NFR4.6, NFR7.5: Configuration › Framework, with the bridge
// stubbed in the shapes of contracts C3 and C10. Runs in Swedish (setup-i18n.js).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../src/shared/i18n.js';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => null }));
const { default: FrameworkSection } = await import('../../src/renderer/FrameworkSection.jsx');

const t = (key, values) => i18n.t(key, values);
const projectOn = (framework) => ({ projectId: 'p1', root: '/p/app', name: 'app', detection: { framework, reason: null } });
const previewOf = (extra = {}) => ({ setupNeeded: false, inProgress: [], keeps: ['aidlc/'], unread: [], ...extra });
const kitDetection = { framework: 'speckit', views: ['specs'] };

/** A promise the test resolves by hand, so a step can be held open. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function stubBridge({ preview = previewOf(), result = { ok: true, detection: kitDetection } } = {}) {
  window.bridge = {
    switchPreview: vi.fn(async () => (typeof preview === 'function' ? preview() : preview)),
    switchFramework: vi.fn(async () => result),
    // C3: the Spec Kit setup, for the project's own harness.
    speckitSetupPreview: vi.fn(async (_id, harness) => ({
      specifyOnPath: true,
      version: 'specify 1.4.3',
      harnesses: ['claude'],
      harness: harness ?? 'claude',
      command: ['specify', 'init', '--here'],
      adds: ['.specify/'],
      notEmpty: true
    })),
    speckitSetup: vi.fn(async () => ({ ok: true, output: 'Project ready.' })),
    // US-0503: the AI-DLC setup.
    getSetupInfo: vi.fn(async (_id, { harness }) => ({
      harness,
      aidlc: { installed: true, version: 'aidlc 2.11.3' },
      git: { isRepo: true },
      harnesses: [],
      preview: { create: 3, update: 0, merge: 0, preserve: 0, remove: 0, conflict: 0, conflicts: [], notes: [], raw: '' },
      plugins: [],
      presets: []
    })),
    runSetup: vi.fn(async () => ({ ok: true, steps: [] }))
  };
}

function renderOn(framework = 'aidlc') {
  return render(<FrameworkSection project={projectOn(framework)} harness="claude" harnesses={[]} />);
}

async function openPreview() {
  fireEvent.click(screen.getByTestId('framework-switch-button'));
  return screen.findByTestId('framework-switch-preview');
}

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('FrameworkSection (US-1407)', () => {
  it('shows the current framework, and the button names the other one (BR8.1)', () => {
    stubBridge();
    renderOn('aidlc');
    expect(screen.getByTestId('framework-section').textContent).toContain(t('framework.switch.current', { framework: 'AI-DLC' }));
    expect(screen.getByTestId('framework-switch-button').textContent).toBe(t('framework.switch.button', { framework: 'Spec Kit' }));
    cleanup();
    renderOn('speckit');
    expect(screen.getByTestId('framework-switch-button').textContent).toBe(t('framework.switch.button', { framework: 'AI-DLC' }));
  });

  it('previews the setup only when it is needed, the work in progress or none, the kept files and an unread list (BR8.2, BR8.3)', async () => {
    stubBridge({ preview: previewOf({ setupNeeded: true, inProgress: [{ kind: 'intent', name: 'open-work' }], unread: ['intent'] }) });
    renderOn('aidlc');
    const preview = await openPreview();
    expect(window.bridge.switchPreview).toHaveBeenCalledWith('p1', 'speckit');
    expect(screen.getByTestId('framework-switch-setup').textContent).toBe(t('framework.switch.setupLine', { framework: 'Spec Kit' }));
    expect(preview.textContent).toContain('open-work');
    expect(preview.textContent).toContain(t('framework.switch.keeps', { list: 'aidlc/' }));
    expect(screen.getByTestId('framework-switch-unread').textContent).toBe(t('framework.switch.unread.intent'));
    cleanup();

    stubBridge({ preview: previewOf() });
    renderOn('aidlc');
    const plain = await openPreview();
    expect(screen.queryByTestId('framework-switch-setup')).toBeNull();
    expect(screen.queryByTestId('framework-switch-unread')).toBeNull();
    expect(plain.textContent).toContain(t('framework.switch.none'));
  });

  it('does nothing on Cancel', async () => {
    stubBridge();
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-cancel'));
    expect(screen.queryByTestId('framework-switch-preview')).toBeNull();
    expect(window.bridge.switchFramework).not.toHaveBeenCalled();
    expect(screen.getByTestId('framework-switch-button').disabled).toBe(false);
  });

  it('confirms with no setup in one call, even on a double click, with the buttons disabled while it writes (NFR7.5)', async () => {
    stubBridge();
    const write = deferred();
    window.bridge.switchFramework.mockImplementation(() => write.promise);
    renderOn('aidlc');
    await openPreview();
    const confirm = screen.getByTestId('framework-switch-confirm');
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(window.bridge.switchFramework).toHaveBeenCalledTimes(1);
    expect(window.bridge.switchFramework).toHaveBeenCalledWith('p1', 'speckit');
    expect(screen.getByTestId('framework-switch-button').disabled).toBe(true);
    expect(screen.getByTestId('framework-switch-confirm').disabled).toBe(true);
    await act(async () => write.resolve({ ok: true, detection: kitDetection }));
    expect(screen.queryByTestId('framework-switch-preview')).toBeNull();
    expect(screen.queryByTestId('framework-switch-error')).toBeNull();
  });

  it('runs the Spec Kit setup with the project harness first, then writes (BR8.4)', async () => {
    stubBridge({ preview: previewOf({ setupNeeded: true }) });
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    fireEvent.click(await screen.findByTestId('setup-speckit-run'));
    await waitFor(() => expect(window.bridge.switchFramework).toHaveBeenCalledTimes(1));
    expect(window.bridge.speckitSetup).toHaveBeenCalledWith('p1', 'claude');
    expect(window.bridge.speckitSetup.mock.invocationCallOrder[0]).toBeLessThan(window.bridge.switchFramework.mock.invocationCallOrder[0]);
  });

  it('runs the AI-DLC setup first when a Spec Kit project switches to AI-DLC', async () => {
    stubBridge({ preview: previewOf({ setupNeeded: true, keeps: ['.specify/', 'specs/'] }), result: { ok: true, detection: { framework: 'aidlc' } } });
    renderOn('speckit');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    fireEvent.click(await screen.findByTestId('setup-aidlc-start'));
    await waitFor(() => expect(screen.getByTestId('setup-apply').disabled).toBe(false));
    fireEvent.click(screen.getByTestId('setup-apply'));
    await waitFor(() => expect(window.bridge.switchFramework).toHaveBeenCalledWith('p1', 'aidlc'));
    expect(window.bridge.runSetup.mock.invocationCallOrder[0]).toBeLessThan(window.bridge.switchFramework.mock.invocationCallOrder[0]);
  });

  it('never writes after a failed or cancelled setup, and says the project stays on its framework (BR8.4)', async () => {
    stubBridge({ preview: previewOf({ setupNeeded: true }) });
    window.bridge.speckitSetup.mockResolvedValue({ ok: false, output: 'no', error: { code: 'failed', message: 'specify failed' } });
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    fireEvent.click(await screen.findByTestId('setup-speckit-run'));
    expect((await screen.findByTestId('setup-speckit-output')).textContent).toContain('specify failed'); // the setup's own output
    fireEvent.click(screen.getByTestId('framework-switch-cancel'));
    expect(screen.getByTestId('framework-switch-error').textContent).toContain(t('framework.switch.stays', { framework: 'AI-DLC' }));
    expect(window.bridge.switchFramework).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('framework-switch-close'));
    expect(screen.queryByTestId('framework-switch-error')).toBeNull();
    expect(screen.getByTestId('framework-switch-button').disabled).toBe(false);
  });

  it('never writes when Cancel comes while the setup still runs and it then succeeds (BR8.4)', async () => {
    stubBridge({ preview: previewOf({ setupNeeded: true }) });
    const run = deferred();
    window.bridge.speckitSetup.mockReturnValue(run.promise);
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    fireEvent.click(await screen.findByTestId('setup-speckit-run'));
    await waitFor(() => expect(window.bridge.speckitSetup).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('framework-switch-cancel'));
    await act(async () => run.resolve({ ok: true, output: 'Project ready.' }));
    expect(window.bridge.switchFramework).not.toHaveBeenCalled();
    expect(screen.getByTestId('framework-switch-error')).toBeTruthy();
  });

  it('shows the preview again when main answers setupNeeded', async () => {
    stubBridge({ result: { ok: false, error: { code: 'setupNeeded', message: 'Spec Kit saknas.' } } });
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    await waitFor(() => expect(window.bridge.switchPreview).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('framework-switch-preview')).toBeTruthy();
  });

  it('shows a failed write and a failed preview as an error, and the reopen note when the views could not follow', async () => {
    stubBridge({ result: { ok: false, error: { code: 'writeFailed', message: 'Disken är full.' } } });
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    expect((await screen.findByTestId('framework-switch-error')).textContent).toContain('Disken är full.');
    cleanup();

    stubBridge();
    window.bridge.switchPreview.mockRejectedValue(new Error("Error invoking remote method 'project:switchPreview': Error: Ogiltigt"));
    renderOn('aidlc');
    fireEvent.click(screen.getByTestId('framework-switch-button'));
    expect((await screen.findByTestId('framework-switch-error')).textContent).toContain('Ogiltigt');
    cleanup();

    stubBridge({ result: { ok: true, detection: null } });
    renderOn('aidlc');
    await openPreview();
    fireEvent.click(screen.getByTestId('framework-switch-confirm'));
    expect((await screen.findByTestId('framework-switch-reopen')).textContent).toBe(t('framework.switchedReopen'));
  });

  it('takes every text from t() in both languages (NFR4.6)', async () => {
    for (const lng of ['en', 'sv']) {
      await act(() => i18n.changeLanguage(lng));
      stubBridge({ preview: previewOf({ setupNeeded: true, inProgress: [{ kind: 'feature', name: '001-x' }], unread: ['feature'] }) });
      renderOn('speckit');
      const preview = await openPreview();
      expect(screen.getByTestId('framework-section').textContent).not.toMatch(/framework\.switch|switchInvalid/);
      expect(preview.textContent).toContain(t('framework.switch.kind.feature'));
      expect(preview.textContent).toContain(t('framework.switch.notCarried'));
      cleanup();
    }
  });
});
