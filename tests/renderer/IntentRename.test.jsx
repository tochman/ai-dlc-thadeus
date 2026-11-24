// US-0508 FR1.2, FR1.4, FR1.5, FR1.8: the rename control in the intent's detail header.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { default: IntentDetail, RenameControl } = await import('../../src/renderer/IntentDetail.jsx');

const DIR = '261123-rename-and-clean';
const intent = { dirName: DIR, slug: 'rename-and-clean', aidlcSlug: 'rename-and-clean', status: 'complete', active: false, parked: false };
const bridge = (impl) => (window.bridge = { renameIntent: vi.fn(impl) });
const openField = () => fireEvent.click(screen.getByTestId('intent-rename'));
const save = (value) => {
  fireEvent.change(screen.getByTestId('intent-rename-input'), { target: { value } });
  fireEvent.click(screen.getByTestId('intent-rename-save'));
};

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('RenameControl (US-0508)', () => {
  it('shows a Rename pill; editing shows the field with the name it has now (FR1.2, FR1.8)', () => {
    render(<RenameControl projectId="p1" intent={{ ...intent, slug: 'tidy-up' }} />);
    expect(screen.queryByTestId('intent-rename-input')).toBeNull();
    expect(screen.getByTestId('intent-rename').textContent).toBe('Byt namn');
    openField();
    expect(screen.getByTestId('intent-rename-input').value).toBe('tidy-up');
    expect(screen.getByLabelText('Visningsnamn')).toBe(screen.getByTestId('intent-rename-input'));
  });

  it('saves the trimmed value through the bridge and closes the field (FR1.2)', async () => {
    bridge(async () => ({ ok: true, name: 'tidy-up' }));
    render(<RenameControl projectId="p1" intent={intent} />);
    openField();
    save('  tidy-up ');
    expect(window.bridge.renameIntent).toHaveBeenCalledWith('p1', DIR, 'tidy-up');
    await waitFor(() => expect(screen.queryByTestId('intent-rename-input')).toBeNull());
  });

  it('a refused name shows its reason next to the field, which stays open (FR1.3)', async () => {
    bridge(async () => ({ ok: false, error: 'already used' }));
    render(<RenameControl projectId="p1" intent={intent} />);
    openField();
    save('other');
    expect((await screen.findByTestId('intent-rename-error')).textContent).toBe('already used');
    expect(screen.getByTestId('intent-rename-error').getAttribute('role')).toBe('alert');
    expect(screen.getByTestId('intent-rename-input')).toBeTruthy();
  });

  it('a failed call shows its message (FR1.3)', async () => {
    bridge(async () => {
      throw new Error('ipc down');
    });
    render(<RenameControl projectId="p1" intent={intent} />);
    openField();
    save('x');
    expect((await screen.findByTestId('intent-rename-error')).textContent).toBe('ipc down');
  });

  it('an empty save resets the name; Cancel closes without saving (FR1.4)', async () => {
    bridge(async () => ({ ok: true, name: null }));
    render(<RenameControl projectId="p1" intent={intent} />);
    openField();
    fireEvent.click(screen.getByTestId('intent-rename-cancel'));
    expect(screen.queryByTestId('intent-rename-input')).toBeNull();
    expect(window.bridge.renameIntent).not.toHaveBeenCalled();
    openField();
    save('   ');
    expect(window.bridge.renameIntent).toHaveBeenCalledWith('p1', DIR, '');
  });

  it('is offered while the work runs, in the detail header that shows the name (FR1.5, FR1.6)', () => {
    const detail = { dirName: DIR, state: null, pipeline: { phases: [], done: 0, executed: 0 }, files: [], warnings: [], events: [], graph: null, units: {} };
    const running = { ...intent, slug: 'tidy-up', status: 'in-flight', active: true };
    render(<IntentDetail projectId="p1" detail={detail} intent={running} activeDirName={DIR} cost={null} models={null} />);
    expect(screen.getByTestId('intent-rename')).toBeTruthy();
    expect(screen.getByTestId('intent-detail').textContent).toContain('tidy-up');
  });
});
