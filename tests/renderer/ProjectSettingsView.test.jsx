import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// The agent tab's state, as the TerminalProvider gives it; null outside a provider.
let terminal = null;
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: ProjectSettingsView } = await import('../../src/renderer/ProjectSettingsView.jsx');

const settings = { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' };
// Same shape as harness:detect returns (detectHarnesses).
const detected = [
  { id: 'claude', label: 'Claude Code', selectable: true, installed: true, cli: { found: true, version: '2.1.0 (Claude Code)' } },
  { id: 'opencode', label: 'opencode', selectable: true, installed: true, cli: { found: true, version: 'opencode v2.1.4' } },
  { id: 'codex', label: 'Codex', selectable: false, installed: true, cli: { found: false, version: null } },
  { id: 'kiro', label: 'Kiro', selectable: false, installed: false, cli: { found: false, version: null } },
  { id: 'cursor', label: 'Cursor', selectable: false, installed: false, cli: null },
  { id: 'copilot', label: 'GitHub Copilot', selectable: false, installed: false, cli: null }
];

beforeEach(() => {
  // Same shape projectSettings:set returns.
  window.bridge = { setProjectSettings: vi.fn(async (_id, partial) => ({ ...settings, ...partial })) };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  terminal = null;
});

describe('ProjectSettingsView (Configuration › Feature docs and Agent, US-0012)', () => {
  it('saves the chosen mode and path for this project and says so (FR3.1–FR3.4)', async () => {
    render(<ProjectSettingsView projectId="p1" name="app" settings={settings} />);
    expect(screen.getByTestId('project-settings-mode-auto').checked).toBe(true);
    expect(screen.getByTestId('project-settings-path').value).toBe('docs/FEATURES.md');
    expect(screen.queryByTestId('project-settings-setup')).toBeNull();

    fireEvent.click(screen.getByTestId('project-settings-mode-hide'));
    fireEvent.change(screen.getByTestId('project-settings-path'), { target: { value: 'FEATURES.md' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { featureDocs: 'hide', featuresPath: 'FEATURES.md' });
  });

  it('offers Releases or Continuous deployment, Releases when unset, and saves only a changed choice (US-0603 FR1.1)', async () => {
    render(<ProjectSettingsView projectId="p1" settings={settings} />);
    expect(screen.getByTestId('project-settings-delivery-releases').checked).toBe(true);
    expect(screen.getByTestId('project-settings-delivery-continuous').closest('label').textContent).toMatch(/Kontinuerlig driftsättning/);
    fireEvent.click(screen.getByTestId('project-settings-delivery-continuous'));
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md', delivery: 'continuous' });
    cleanup();

    render(<ProjectSettingsView projectId="p1" settings={{ ...settings, delivery: 'continuous' }} />);
    expect(screen.getByTestId('project-settings-delivery-continuous').checked).toBe(true);
  });

  it('saves a changed docs branch for a protected main, and refuses one git would not accept (US-0607 FR3.3, FR4.3, NFR3)', async () => {
    render(<ProjectSettingsView projectId="p1" settings={settings} />);
    const field = screen.getByTestId('project-settings-planning-branch');
    expect(field.value).toBe('docs/planning');
    fireEvent.change(field, { target: { value: 'bad..name' } });
    expect(screen.getByTestId('project-settings-save').disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/grennamn/);
    fireEvent.change(field, { target: { value: 'docs/plans' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', {
      featureDocs: 'auto',
      featuresPath: 'docs/FEATURES.md',
      planningBranch: 'docs/plans'
    });
    cleanup();

    render(<ProjectSettingsView projectId="p1" settings={{ ...settings, delivery: 'continuous' }} />);
    expect(screen.queryByTestId('project-settings-planning-branch')).toBeNull(); // no release list, no planning
  });

  it('disables Spara for an invalid path, shows the main-process error, and offers setup without docs (FR3.3, FR3.6)', async () => {
    const onSetup = vi.fn();
    render(<ProjectSettingsView projectId="p1" settings={settings} onSetup={onSetup} />);
    for (const bad of ['../FEATURES.md', '/etc/FEATURES.md', 'docs/FEATURES.txt', '']) {
      fireEvent.change(screen.getByTestId('project-settings-path'), { target: { value: bad } });
      expect(screen.getByTestId('project-settings-save').disabled).toBe(true);
      expect(screen.getByRole('alert').textContent).toMatch(/relativ till projektet, sluta på \.md/);
    }
    fireEvent.click(screen.getByTestId('project-settings-save'));
    expect(window.bridge.setProjectSettings).not.toHaveBeenCalled();

    window.bridge.setProjectSettings.mockRejectedValueOnce(new Error("Error invoking remote method 'projectSettings:set': Error: Skrivfel"));
    fireEvent.change(screen.getByTestId('project-settings-path'), { target: { value: 'FEATURES.md' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    expect((await screen.findByRole('alert')).textContent).toBe('Skrivfel');
    expect(screen.queryByTestId('project-settings-saved')).toBeNull();

    fireEvent.click(screen.getByTestId('project-settings-setup'));
    expect(onSetup).toHaveBeenCalledTimes(1);
  });

  it('US-0211: saves a changed rates path, empty by default, and refuses one outside the project (FR1.2)', async () => {
    render(<ProjectSettingsView projectId="p1" settings={settings} />);
    const field = screen.getByTestId('project-settings-rates-path');
    expect(field.value).toBe('');
    fireEvent.change(field, { target: { value: '../rates.json' } });
    expect(screen.getByTestId('project-settings-save').disabled).toBe(true);
    expect(screen.getByRole('alert').textContent).toMatch(/sluta på \.json/);
    fireEvent.change(field, { target: { value: 'config/rates.json' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', {
      featureDocs: 'auto',
      featuresPath: 'docs/FEATURES.md',
      ratesPath: 'config/rates.json'
    });
    cleanup();

    render(<ProjectSettingsView projectId="p1" settings={{ ...settings, ratesPath: 'config/rates.json' }} />);
    expect(screen.getByTestId('project-settings-rates-path').value).toBe('config/rates.json');
  });

  it('lists the harnesses, disables the unsupported ones, and saves opencode for this project (US-0801 FR2.1, FR2.3)', async () => {
    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} harness="claude" harnesses={detected} />);
    const select = screen.getByTestId('project-settings-harness');
    expect(select.value).toBe('claude');
    expect([...select.options].map((o) => [o.textContent, o.disabled])).toEqual([
      ['Claude Code (2.1.0 (Claude Code))', false],
      ['opencode (opencode v2.1.4)', false],
      ['Codex (stöds inte än)', true] // detected, not selectable; undetected ones are not listed
    ]);

    fireEvent.change(select, { target: { value: 'opencode' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { harness: 'opencode' });
  });

  it('asks before switching while the agent tab works, and switches at once when it is idle (FR6.1)', async () => {
    terminal = { state: vi.fn(() => 'busy') };
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} harness="claude" harnesses={detected} />);
    fireEvent.change(screen.getByTestId('project-settings-harness'), { target: { value: 'opencode' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    expect(confirm).toHaveBeenCalledWith('Claude Code arbetar. Byter du till opencode stängs sessionen. Byta ändå?');
    expect(window.bridge.setProjectSettings).not.toHaveBeenCalled(); // declined: the session keeps running

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await waitFor(() => expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { harness: 'opencode' }));

    terminal.state.mockReturnValue('idle');
    confirm.mockClear();
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await waitFor(() => expect(window.bridge.setProjectSettings).toHaveBeenCalledTimes(2));
    expect(confirm).not.toHaveBeenCalled();
  });

  it('saves both harnesses as side-by-side agent tabs when both are installed, and offers no choice with one (US-0803)', async () => {
    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} harness="claude" harnesses={detected} />);
    const claude = screen.getByTestId('project-settings-tab-claude');
    const opencode = screen.getByTestId('project-settings-tab-opencode');
    expect([claude.checked, opencode.checked]).toEqual([true, false]); // US-0801's single choice is the default
    expect(claude.disabled).toBe(true); // the last open tab cannot be unticked
    fireEvent.click(opencode);
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await screen.findByTestId('project-settings-saved');
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { harnessTabs: ['claude', 'opencode'] });
    cleanup();

    const onlyClaude = detected.map((d) => (d.id === 'opencode' ? { ...d, installed: false } : d));
    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} harness="claude" harnesses={onlyClaude} />);
    expect(screen.queryByTestId('project-settings-tabs')).toBeNull();
  });

  it('"Lägg till harness…" names the installed harnesses and opens setup in add mode (US-0802 FR3.1)', () => {
    const onAddHarness = vi.fn();
    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} harness="claude" harnesses={detected} onAddHarness={onAddHarness} />);
    expect(screen.getByTestId('project-settings-installed-harnesses').textContent).toBe('Installerade: Claude Code, opencode, Codex');
    const add = screen.getByTestId('project-settings-add-harness');
    expect(add.textContent).toBe('Lägg till harness…');
    fireEvent.click(add);
    expect(onAddHarness).toHaveBeenCalledTimes(1);
    cleanup();

    render(<ProjectSettingsView section="agent" projectId="p1" settings={settings} />);
    expect(screen.queryByTestId('project-settings-add-harness')).toBeNull(); // not an AI-DLC project: setup is the main view
  });
});
