// US-0506 u4 LC35, M8: the install preview, keyboard only, in the Swedish locale (BR7.7–BR7.9, BR7.18, BR7.20,
// PD33–PD36, AC4.1.1, AC4.1.5).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentHooksPreview from '../../src/renderer/AgentHooksPreview.jsx';

const ID = '0f8fad5b-d9cb-469f-a165-70867728950e';
const previewOf = (over = {}) => ({
  previewId: ID,
  harness: 'claude',
  action: 'install',
  canApply: true,
  files: [
    {
      path: '.claude/settings.json',
      change: 'modify',
      summary: 'Bara appens poster ändras.',
      diff: '@@ -1,2 +1,3 @@\n {\n-  "a": 1\n+  "a": 1,\n+  "hooks": {}',
      replacesHandEdit: false
    },
    { path: '.thadeus/hooks/dialog.sh', change: 'create', summary: 'Ny fil.', diff: '@@ -0,0 +1,1 @@\n+#!/bin/sh', replacesHandEdit: false }
  ],
  ...over
});

let bridge, onClose;
async function mount({ preview = previewOf(), apply = async () => ({ result: 'written', status: [] }), action = 'install' } = {}) {
  bridge = { preview: vi.fn(async () => preview), apply: vi.fn(apply), cancel: vi.fn(), status: vi.fn(), onChanged: vi.fn(() => () => {}) };
  window.bridge = { agentHooks: bridge };
  onClose = vi.fn();
  render(<AgentHooksPreview projectId="p1" harness="claude" action={action} onClose={onClose} />);
  await screen.findAllByTestId('agent-hooks-preview-file').catch(() => {});
  await act(async () => {});
}
const dialog = () => screen.getByTestId('agent-hooks-preview');
const applyButton = () => screen.getByTestId('agent-hooks-preview-apply');
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('AgentHooksPreview (M8)', () => {
  it('titles each action', async () => {
    await mount();
    expect(screen.getByRole('heading').textContent).toBe('Lägg till agentdialoger i projektet');
    cleanup();
    await mount({ action: 'remove', preview: previewOf({ action: 'remove' }) });
    expect(screen.getByRole('heading').textContent).toBe('Ta bort agentdialoger från projektet');
    expect(applyButton().textContent).toBe('Ta bort');
  });

  it('says the files are committed and shared, and that teammates are not affected', async () => {
    await mount();
    expect(dialog().textContent).toContain('Filerna checkas in och delas med ditt team.');
    expect(dialog().textContent).toContain('Kollegor utan appen påverkas inte.');
  });

  it('shows one section per file with its path, summary and signed diff lines in a <pre> (PD35)', async () => {
    await mount();
    const files = screen.getAllByTestId('agent-hooks-preview-file');
    expect(files).toHaveLength(2);
    expect(files[0].textContent).toContain('.claude/settings.json');
    expect(files[0].textContent).toContain('Bara appens poster ändras.');
    const lines = [...files[0].querySelectorAll('pre > span')].map((s) => s.textContent);
    expect(lines).toEqual(['@@ -1,2 +1,3 @@', ' {', '-  "a": 1', '+  "a": 1,', '+  "hooks": {}']);
  });

  it('shows the hand-edit sentence only for a file that replaces a hand edit', async () => {
    const files = previewOf().files;
    await mount({ preview: previewOf({ action: 'update', files: [{ ...files[0], replacesHandEdit: true }, files[1]] }), action: 'update' });
    const sections = screen.getAllByTestId('agent-hooks-preview-file');
    expect(sections[0].textContent).toContain('Ändrad för hand, ersätts med appens version.');
    expect(sections[1].textContent).not.toContain('Ändrad för hand');
  });

  it('focuses Cancel on open, with the tab order Cancel, the file sections, then apply (PD34)', async () => {
    await mount();
    expect(document.activeElement).toBe(screen.getByTestId('agent-hooks-preview-cancel'));
    const focusable = [...dialog().querySelectorAll('button, [tabindex="0"]')].map((el) => el.dataset.testid);
    expect(focusable).toEqual(['agent-hooks-preview-cancel', 'agent-hooks-preview-file', 'agent-hooks-preview-file', 'agent-hooks-preview-apply']);
  });

  it('Esc closes with no apply and one cancel; Enter on a section applies nothing (PD34)', async () => {
    await mount();
    fireEvent.keyDown(screen.getAllByTestId('agent-hooks-preview-file')[0], { key: 'Enter' });
    expect(bridge.apply).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getAllByTestId('agent-hooks-preview-file')[1], { key: 'Escape' });
    expect(bridge.cancel).toHaveBeenCalledTimes(1);
    expect(bridge.cancel).toHaveBeenCalledWith('p1', ID);
    expect(bridge.apply).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(null);
  });

  it('disables apply with the busy text while apply runs; a second click makes no call (PD33)', async () => {
    let finish;
    await mount({ apply: () => new Promise((r) => (finish = r)) });
    fireEvent.click(applyButton());
    expect(applyButton().disabled).toBe(true);
    expect(applyButton().textContent).toBe('Skriver…');
    fireEvent.click(applyButton());
    expect(bridge.apply).toHaveBeenCalledTimes(1);
    expect(bridge.apply).toHaveBeenCalledWith('p1', ID);
    await act(async () => finish({ result: 'written', status: [] }));
  });

  it('stays open after a changed-since-preview refusal, with the sentence and the new diff', async () => {
    const fresh = previewOf({ previewId: '1f8fad5b-d9cb-469f-a165-70867728950e', files: [{ ...previewOf().files[0], diff: '@@ -1,1 +1,1 @@\n-ny rad' }] });
    await mount({ apply: async () => ({ result: 'refused', refusal: 'changedSincePreview', file: '.claude/settings.json', preview: fresh, status: [] }) });
    await act(async () => fireEvent.click(applyButton()));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('.claude/settings.json har ändrats sedan förhandsvisningen. Titta på den nya förhandsvisningen.');
    expect(screen.getAllByTestId('agent-hooks-preview-file')).toHaveLength(1);
    expect(dialog().textContent).toContain('-ny rad');
    await act(async () => fireEvent.click(applyButton()));
    expect(bridge.apply).toHaveBeenLastCalledWith('p1', '1f8fad5b-d9cb-469f-a165-70867728950e');
  });

  it('shows a refusal in one sentence with the path as on disk, and a preview refusal with no apply (PD36)', async () => {
    await mount({ apply: async () => ({ result: 'partiallyWritten', file: '.claude/settings.json', cause: 'EACCES', status: [] }) });
    await act(async () => fireEvent.click(applyButton()));
    expect(screen.getByRole('alert').textContent).toBe('.claude/settings.json skrevs inte (åtkomst nekad). Uppdatera för att bli klar.');
    expect(screen.queryByTestId('agent-hooks-preview-apply')).toBeNull();
    cleanup();
    await mount({ preview: { refusal: 'cannotWrite', file: '.claude/settings.json', cause: 'link' } });
    expect(screen.getByRole('alert').textContent).toBe('Inget skrevs: .claude/settings.json kan inte skrivas (är en länk).');
    expect(screen.queryByTestId('agent-hooks-preview-apply')).toBeNull();
  });

  it('closes on success with the restart line naming the harness; offers no apply when nothing changes (BR7.18, BR7.7)', async () => {
    await mount();
    await act(async () => fireEvent.click(applyButton()));
    await waitFor(() => expect(onClose).toHaveBeenCalledWith('Agentdialogerna är installerade. Starta om körande Claude Code-flikar för att använda dem.'));
    cleanup();
    await mount({ preview: previewOf({ canApply: false, files: [{ ...previewOf().files[1], change: 'none', diff: '' }] }) });
    expect(dialog().textContent).toContain('Alla filer är redan aktuella.');
    expect(screen.queryByTestId('agent-hooks-preview-apply')).toBeNull();
  });
});
