import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildSetupCommand, parsePreview } from '../../src/main/setup.js';

const terminal = { state: vi.fn(() => 'idle'), exitCode: vi.fn(() => null), type: vi.fn(async () => true) };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: SetupAidlc } = await import('../../src/renderer/SetupAidlc.jsx');

const project = { projectId: 'p1', root: '/Users/me/new-app', detection: { isAidlc: false, reason: 'Mappen saknar aidlc/spaces/ och är inget AI-DLC-projekt.' } };
// Same shape setup:info returns.
const readyInfo = {
  aidlc: { installed: true, version: 'aidlc 2.11.3' },
  git: { isRepo: false },
  harnesses: [],
  // The real dry-run output (F-02), parsed by the real parser.
  preview: parsePreview('  Note: planning a fresh install\nconfig plan for /Users/me/new-app: create=360 update=0 merge=0 preserve=1 remove=0 conflict=0\n'),
  plugins: ['aidlc'],
  presets: ['thorough', 'balanced', 'minimal']
};

function stubBridge(info) {
  window.bridge = {
    getSetupInfo: vi.fn(async () => info),
    // The real builder, as setup:command runs it in the main process.
    buildSetupCommand: vi.fn(async (_id, options) => buildSetupCommand(options, info.plugins))
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SetupAidlc', () => {
  it('changes nothing until asked, then types the default chain into the shell tab without Enter (FR4.1, FR4.4)', async () => {
    stubBridge(readyInfo);
    render(<SetupAidlc project={project} />);
    expect(screen.getByText(project.root)).toBeTruthy();
    expect(window.bridge.getSetupInfo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const preview = await screen.findByTestId('setup-aidlc-preview');
    expect(preview.textContent).toMatch(/create: 360 · update: 0 · merge: 0 · preserve: 1 · remove: 0 · conflict: 0/);
    expect(screen.getByTestId('setup-aidlc-note').textContent).toBe('planning a fresh install');
    expect(screen.getByTestId('setup-aidlc-checks').textContent).toMatch(/git init -b main läggs först/);

    fireEvent.click(screen.getByTestId('setup-aidlc-run'));
    await waitFor(() =>
      expect(terminal.type).toHaveBeenCalledWith('shell', 'git init -b main && aidlc --project-dir . config --harness claude --yes', { submit: false })
    );
  });

  it('disables Initiera on conflicts, and stops with the install link when aidlc is missing (FR4.2, FR4.3)', async () => {
    stubBridge({ ...readyInfo, preview: { ...readyInfo.preview, conflict: 1, conflicts: ['CLAUDE.md'] } });
    render(<SetupAidlc project={project} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    await screen.findByText('CLAUDE.md');
    expect(screen.getByTestId('setup-aidlc-run').disabled).toBe(true);
    cleanup();

    stubBridge({ ...readyInfo, aidlc: { installed: false }, preview: null, plugins: [] });
    render(<SetupAidlc project={project} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const missing = await screen.findByTestId('setup-aidlc-missing');
    expect(missing.querySelector('a').getAttribute('href')).toBe('https://github.com/awslabs/aidlc-workflows');
    expect(screen.getByTestId('setup-aidlc-run').disabled).toBe(true);
    expect(screen.queryByTestId('setup-aidlc-preview')).toBeNull();
    fireEvent.click(screen.getByTestId('setup-aidlc-run'));
    expect(terminal.type).not.toHaveBeenCalled();
  });
});
