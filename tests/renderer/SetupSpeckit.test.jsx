// US-1405 FR3, AC2.1.1–AC2.1.3: the Spec Kit setup panel, with the bridge stubbed in the shapes of contract C3.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import SetupSpeckit from '../../src/renderer/SetupSpeckit.jsx';

const ROOT = '/Users/me/new-app';
const command = (h) => ['specify', 'init', '--here', '--force', '--non-interactive', '--integration', h];
/** speckit:setupPreview's answer for `harness`, as getSpeckitSetupInfo gives it. */
const infoFor = (harnesses, harness = harnesses.length === 1 ? harnesses[0] : null, extra = {}) => ({
  specifyOnPath: true,
  version: 'specify 1.4.3',
  installHint: 'uv tool install specify-cli',
  harnesses,
  harness,
  command: harness ? command(harness) : null,
  adds: harness ? ['.specify/', `.${harness}/`] : [],
  notEmpty: false,
  ...extra
});

function stubBridge({ harnesses = ['claude'], preview, run = { ok: true, output: 'Project ready.' } } = {}) {
  window.bridge = {
    speckitSetupPreview: vi.fn(preview ?? (async (_id, harness) => infoFor(harnesses, harness ?? undefined))),
    speckitSetup: vi.fn(async () => run)
  };
}

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('SetupSpeckit (US-1405)', () => {
  it('names the install command and runs nothing when specify is missing; Retry previews again (AC2.1.2)', async () => {
    let found = false;
    stubBridge({ preview: async () => (found ? infoFor(['claude']) : { ...infoFor(['claude']), specifyOnPath: false, version: null }) });
    render(<SetupSpeckit projectId="p1" root={ROOT} />);
    expect((await screen.findByTestId('setup-speckit-hint')).textContent).toMatch(/uv tool install specify-cli/);
    expect(screen.queryByTestId('setup-speckit-run')).toBeNull();
    found = true;
    fireEvent.click(screen.getByTestId('setup-speckit-retry'));
    await screen.findByTestId('setup-speckit-run');
    expect(window.bridge.speckitSetupPreview).toHaveBeenCalledTimes(2);
    expect(window.bridge.speckitSetup).not.toHaveBeenCalled();
  });

  it('takes the only harness and shows the exact command before Run (AC2.1.1)', async () => {
    stubBridge({ harnesses: ['opencode'] });
    render(<SetupSpeckit projectId="p1" root={ROOT} />);
    expect((await screen.findByTestId('setup-speckit-command')).textContent).toContain('specify init --here --force --non-interactive --integration opencode');
    expect(screen.queryByTestId('setup-speckit-harness')).toBeNull();
    expect(screen.getByTestId('setup-speckit-root').textContent).toMatch(/\.specify\//);
  });

  it('asks for the harness with none or two, and previews the one picked (R-01)', async () => {
    for (const harnesses of [[], ['claude', 'opencode']]) {
      stubBridge({ harnesses });
      render(<SetupSpeckit projectId="p1" root={ROOT} />);
      const select = await screen.findByTestId('setup-speckit-harness');
      expect(screen.queryByTestId('setup-speckit-command')).toBeNull();
      expect(screen.getByTestId('setup-speckit-run').disabled).toBe(true);
      fireEvent.change(select, { target: { value: 'claude' } });
      await waitFor(() => expect(window.bridge.speckitSetupPreview).toHaveBeenLastCalledWith('p1', 'claude'));
      expect((await screen.findByTestId('setup-speckit-command')).textContent).toContain('--integration claude');
      cleanup();
    }
  });

  it('says existing files stay when the folder is not empty (R-02)', async () => {
    stubBridge({ preview: async () => infoFor(['claude'], 'claude', { notEmpty: true }) });
    render(<SetupSpeckit projectId="p1" root={ROOT} />);
    await screen.findByTestId('setup-speckit-command');
    expect(screen.getByTestId('setup-speckit-root').textContent).toMatch(/Befintliga filer ligger kvar/);
  });

  it('runs on confirm and shows the output and done (AC2.1.1)', async () => {
    const onApplied = vi.fn();
    stubBridge();
    render(<SetupSpeckit projectId="p1" root={ROOT} onApplied={onApplied} />);
    fireEvent.click(await screen.findByTestId('setup-speckit-run'));
    expect((await screen.findByTestId('setup-speckit-output')).textContent).toContain('Project ready.');
    expect(window.bridge.speckitSetup).toHaveBeenCalledWith('p1', 'claude');
    expect(screen.getByTestId('setup-speckit-root').textContent).toMatch(/Spec Kit är uppsatt/);
    expect(screen.getByTestId('setup-speckit-run').disabled).toBe(true); // done: nothing runs twice
    expect(onApplied).toHaveBeenCalled();
  });

  it('shows the output and the reason on failure and on timeout, and can try again (AC2.1.3)', async () => {
    stubBridge({ run: { ok: false, error: { code: 'failed', message: 'Command failed' }, output: 'Error: boom' } });
    render(<SetupSpeckit projectId="p1" root={ROOT} />);
    fireEvent.click(await screen.findByTestId('setup-speckit-run'));
    const out = await screen.findByTestId('setup-speckit-output');
    expect(out.textContent).toContain('Error: boom');
    expect(screen.getByRole('alert').textContent).toMatch(/misslyckades/);
    expect(screen.getByTestId('setup-speckit-run').disabled).toBe(false);

    window.bridge.speckitSetup.mockResolvedValueOnce({ ok: false, error: { code: 'timeout', message: 'x' }, output: '' });
    fireEvent.click(screen.getByTestId('setup-speckit-run'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/120 s/));
  });

  it('shows a refused or failed call as an error, never a crash', async () => {
    stubBridge({ preview: async () => Promise.reject(new Error("Error invoking remote method 'speckit:setupPreview': Error: nope")) });
    render(<SetupSpeckit projectId="p1" root={ROOT} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/nope/);
  });
});
