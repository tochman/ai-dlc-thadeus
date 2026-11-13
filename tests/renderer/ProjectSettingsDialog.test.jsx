import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectSettingsDialog from '../../src/renderer/ProjectSettingsDialog.jsx';

const settings = { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' };

beforeEach(() => {
  // Same shape projectSettings:set returns.
  window.bridge = { setProjectSettings: vi.fn(async (_id, partial) => ({ ...settings, ...partial })) };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ProjectSettingsDialog', () => {
  it('saves the chosen mode and path for this project and closes (FR3.1–FR3.4)', async () => {
    const onClose = vi.fn();
    render(<ProjectSettingsDialog open onClose={onClose} projectId="p1" name="app" settings={settings} />);
    expect(screen.getByTestId('project-settings-mode-auto').checked).toBe(true);
    expect(screen.getByTestId('project-settings-path').value).toBe('docs/FEATURES.md');
    expect(screen.queryByTestId('project-settings-setup')).toBeNull();

    fireEvent.click(screen.getByTestId('project-settings-mode-hide'));
    fireEvent.change(screen.getByTestId('project-settings-path'), { target: { value: 'FEATURES.md' } });
    fireEvent.click(screen.getByTestId('project-settings-save'));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(window.bridge.setProjectSettings).toHaveBeenCalledWith('p1', { featureDocs: 'hide', featuresPath: 'FEATURES.md' });
  });

  it('disables Spara for an invalid path, shows the main-process error, and offers setup without docs (FR3.3, FR3.6)', async () => {
    const onSetup = vi.fn();
    const onClose = vi.fn();
    render(<ProjectSettingsDialog open onClose={onClose} projectId="p1" settings={settings} onSetup={onSetup} />);
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
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('project-settings-setup'));
    expect(onSetup).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
