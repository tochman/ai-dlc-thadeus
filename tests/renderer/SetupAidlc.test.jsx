import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { buildSetupCommand, parsePreview } from '../../src/main/setup.js';
import { featureDocsPrompt } from '../../src/renderer/featureDocsPrompt.js';

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

  it('offers feature docs, reports the choice upwards, and builds the matching one-line request (EPIC-06 FR4.1–FR4.4)', async () => {
    stubBridge(readyInfo);
    const onFeatureDocsChange = vi.fn();
    render(<SetupAidlc project={project} featureDocs={false} onFeatureDocsChange={onFeatureDocsChange} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const choice = await screen.findByTestId('setup-aidlc-feature-docs');
    expect(choice.checked).toBe(false);
    expect(choice.closest('.setup-feature-docs').textContent).toMatch(/separata feature-beskrivningar \(FEATURES\.md \+ en fil per epic\).*docs\/features\/epic-01/);
    fireEvent.click(choice);
    expect(onFeatureDocsChange).toHaveBeenCalledWith(true);
    cleanup();

    render(<SetupAidlc project={project} featureDocs onFeatureDocsChange={onFeatureDocsChange} featureDocsExist />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    expect((await screen.findByTestId('setup-aidlc-feature-docs')).checked).toBe(true);
    expect(screen.getByText(/^Feature-beskrivningar finns redan\./)).toBeTruthy();

    const create = featureDocsPrompt({ exists: false });
    const ruleOnly = featureDocsPrompt({ exists: true, path: 'FEATURES.md' });
    for (const text of [create, ruleOnly]) {
      expect(text).not.toMatch(/[\r\n]/);
      expect(text).toMatch(/projektregel genom AI-DLC:s eget sätt att spara regler.*storys i rätt epic-fil.*byggs och släpps/);
    }
    expect(create).toMatch(/^Skapa feature-beskrivningar.*docs\/FEATURES\.md.*docs\/features\/epic-XX-<slug>\.md.*Given\/When\/Then.*📋.*🚧.*✅/);
    expect(ruleOnly).toMatch(/^Projektet har redan feature-beskrivningar i FEATURES\.md/);
    expect(ruleOnly).not.toMatch(/Skapa/);
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
