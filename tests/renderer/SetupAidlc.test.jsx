import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { parsePreview } from '../../src/main/setup.js';
import { featureDocsPrompt } from '../../src/renderer/featureDocsPrompt.js';

const terminal = { state: vi.fn(() => 'idle'), exitCode: vi.fn(() => null), type: vi.fn(async () => true) };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: SetupAidlc } = await import('../../src/renderer/SetupAidlc.jsx');

const project = { projectId: 'p1', root: '/Users/me/new-app', detection: { isAidlc: false, reason: 'Mappen saknar aidlc/spaces/ och är inget AI-DLC-projekt.' } };
// Same shape setup:info returns.
const readyInfo = {
  harness: 'claude',
  aidlc: { installed: true, version: 'aidlc 2.11.3' },
  git: { isRepo: false },
  harnesses: [],
  // The real dry-run output (F-02), parsed by the real parser.
  preview: parsePreview('  Note: planning a fresh install\nconfig plan for /Users/me/new-app: create=360 update=0 merge=0 preserve=1 remove=0 conflict=0\n'),
  plugins: ['aidlc'],
  presets: ['thorough', 'balanced', 'minimal']
};

// Same shape as harness:detect returns (detectHarnesses): only Claude Code's and opencode's CLIs found.
const detected = [
  { id: 'claude', label: 'Claude Code', selectable: true, installed: false, cli: { found: true, version: '2.1.0' } },
  { id: 'opencode', label: 'opencode', selectable: true, installed: false, cli: { found: true, version: 'opencode v2.1.4' } },
  { id: 'codex', label: 'Codex', selectable: false, installed: false, cli: { found: false, version: null } },
  { id: 'kiro', label: 'Kiro', selectable: false, installed: false, cli: { found: false, version: null } },
  { id: 'cursor', label: 'Cursor', selectable: false, installed: false, cli: null },
  { id: 'copilot', label: 'GitHub Copilot', selectable: false, installed: false, cli: null }
];

/** setup:info answers for the harness asked for; setup:run answers with `runResult` (same shape as runSetup). */
function stubBridge(info, runResult = { ok: true, steps: [] }) {
  window.bridge = {
    getSetupInfo: vi.fn(async (_id, { harness }) => ({ ...info, harness })),
    runSetup: vi.fn(async () => runResult)
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SetupAidlc', () => {
  it('changes nothing until asked, previews Claude Code by default, then Apply runs the setup itself (FR4.1, US-0802 FR1.2, FR2.2)', async () => {
    stubBridge(readyInfo);
    const onApplied = vi.fn();
    render(<SetupAidlc project={project} harnesses={detected} onApplied={onApplied} />);
    expect(screen.getByText(project.root)).toBeTruthy();
    expect(window.bridge.getSetupInfo).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const preview = await screen.findByTestId('setup-aidlc-preview');
    expect(window.bridge.getSetupInfo).toHaveBeenCalledWith('p1', { harness: 'claude' }); // two CLIs found: Claude Code
    expect(preview.textContent).toMatch(/create: 360 · update: 0 · merge: 0 · preserve: 1 · remove: 0 · conflict: 0/);
    expect(screen.getByTestId('setup-aidlc-note').textContent).toBe('planning a fresh install');
    expect(screen.getByTestId('setup-aidlc-checks').textContent).toMatch(/git init -b main läggs först/);

    fireEvent.click(screen.getByTestId('setup-apply'));
    expect((await screen.findByTestId('setup-result-ok')).textContent).toBe('AI-DLC är uppsatt för Claude Code.');
    expect(window.bridge.runSetup).toHaveBeenCalledWith('p1', { harness: 'claude', mode: 'setup', plugins: [], preset: null });
    expect(onApplied).toHaveBeenCalledWith('claude');
    expect(screen.getByTestId('setup-apply').disabled).toBe(true); // done: nothing runs twice
    expect(terminal.type).not.toHaveBeenCalled(); // nothing is typed into the shell tab any more
  });

  it('lists all six harnesses with their CLI state, and choosing opencode previews opencode (US-0802 FR1.1, FR1.3, FR2.1)', async () => {
    stubBridge(readyInfo);
    render(<SetupAidlc project={project} harnesses={detected} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const select = await screen.findByTestId('setup-harness');
    expect([...select.options].map((o) => o.textContent)).toEqual([
      'Claude Code (kommandot hittades)',
      'opencode (kommandot hittades)',
      'Codex (kommandot hittades inte, bara filer)',
      'Kiro (kommandot hittades inte, bara filer)',
      'Cursor (bara filer)',
      'GitHub Copilot (bara filer)'
    ]);
    expect(screen.queryByTestId('setup-harness-note')).toBeNull();

    fireEvent.change(select, { target: { value: 'opencode' } });
    await waitFor(() => expect(window.bridge.getSetupInfo).toHaveBeenLastCalledWith('p1', { harness: 'opencode' }));

    fireEvent.change(screen.getByTestId('setup-harness'), { target: { value: 'kiro' } });
    expect((await screen.findByTestId('setup-harness-note')).textContent).toBe('Installerar AI-DLC:s filer; kan inte köras i agent-fliken än.');
  });

  it('shows the failed step and the CLI error, and offers the switch after a successful opencode setup (US-0802 FR2.2, FR4.2)', async () => {
    const error = 'Command failed: aidlc --project-dir /Users/me/new-app config --harness opencode --yes\nerror: disk full';
    stubBridge(readyInfo, { ok: false, steps: [{ command: 'aidlc --project-dir /Users/me/new-app config --harness opencode --yes', ok: false, error }] });
    const onSwitchHarness = vi.fn();
    render(<SetupAidlc project={project} harnesses={detected} currentHarness="claude" onSwitchHarness={onSwitchHarness} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    fireEvent.change(await screen.findByTestId('setup-harness'), { target: { value: 'opencode' } });
    await waitFor(() => expect(screen.getByTestId('setup-apply').disabled).toBe(false));
    fireEvent.click(screen.getByTestId('setup-apply'));
    const failed = await screen.findByTestId('setup-result-failed');
    expect(failed.textContent).toMatch(/^Uppsättningen stannade: aidlc --project-dir \/Users\/me\/new-app config --harness opencode --yes misslyckades\./);
    expect(failed.querySelector('pre').textContent).toBe(error);
    expect(screen.queryByTestId('setup-switch-offer')).toBeNull();

    window.bridge.runSetup.mockResolvedValueOnce({ ok: true, steps: [] });
    fireEvent.click(screen.getByTestId('setup-apply')); // the preview stands; Apply can be tried again
    expect((await screen.findByTestId('setup-switch-offer')).textContent).toMatch(/^Byta agent-fliken till opencode\?/);
    fireEvent.click(screen.getByTestId('setup-switch'));
    expect(onSwitchHarness).toHaveBeenCalledWith('opencode');
  });

  it('in add mode disables installed harnesses and starts on one not installed (US-0802 FR3.1)', async () => {
    stubBridge(readyInfo);
    const installed = detected.map((d) => (d.id === 'claude' ? { ...d, installed: true } : d));
    render(<SetupAidlc project={project} mode="add" harnesses={installed} currentHarness="claude" onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const select = await screen.findByTestId('setup-harness');
    expect(window.bridge.getSetupInfo).toHaveBeenCalledWith('p1', { harness: 'opencode' });
    expect(select.options[0].textContent).toBe('Claude Code (installerad, kommandot hittades)');
    expect(select.options[0].disabled).toBe(true);
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

  it('disables Apply on conflicts, and stops with the install link when aidlc is missing (FR4.2, FR4.3)', async () => {
    stubBridge({ ...readyInfo, preview: { ...readyInfo.preview, conflict: 1, conflicts: ['CLAUDE.md'] } });
    render(<SetupAidlc project={project} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    await screen.findByText('CLAUDE.md');
    expect(screen.getByTestId('setup-apply').disabled).toBe(true);
    cleanup();

    stubBridge({ ...readyInfo, aidlc: { installed: false }, preview: null, plugins: [] });
    render(<SetupAidlc project={project} />);
    fireEvent.click(screen.getByTestId('setup-aidlc-start'));
    const missing = await screen.findByTestId('setup-aidlc-missing');
    expect(missing.querySelector('a').getAttribute('href')).toBe('https://github.com/awslabs/aidlc-workflows');
    expect(screen.getByTestId('setup-apply').disabled).toBe(true);
    expect(screen.queryByTestId('setup-aidlc-preview')).toBeNull();
    fireEvent.click(screen.getByTestId('setup-apply'));
    expect(window.bridge.runSetup).not.toHaveBeenCalled();
  });
});
