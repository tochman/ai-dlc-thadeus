// US-0513 FR1.2, FR1.3, FR4.2, FR4.3: the confirmation, its progress and its result, for one intent and for several.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import ArchiveDialog, { useArchiveRun } from '../../src/renderer/ArchiveDialog.jsx';
import { t } from '../../src/shared/i18n.js';

const A = { dirName: '261120-a', slug: 'alpha', status: 'complete', active: false };
const B = { dirName: '261121-b', slug: 'beta', status: 'complete', active: false };
const OPEN = { dirName: '261122-c', slug: 'gamma', status: 'in-flight', active: true };
const done = (archived, refused = [], commit = { state: 'waiting' }) => ({ ok: true, archived, refused, commit });

let progress;
beforeEach(() => {
  window.bridge = {
    archiveIntents: vi.fn(async (_p, dirNames) => done(dirNames)),
    onArchiveProgress: vi.fn((fn) => {
      progress = fn;
      return vi.fn();
    })
  };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
});

/** An owner as ArchiveControls and IntentList are: it holds the run, and opens and closes the dialog. */
function Owner({ intents, onDone }) {
  const [open, setOpen] = useState(false);
  const run = useArchiveRun('p1', onDone);
  return (
    <>
      <button data-testid="opener" onClick={() => setOpen(true)}>
        open
      </button>
      <output data-testid="busy">{String(run.busy)}</output>
      <ArchiveDialog open={open} intents={intents} run={run} onClose={() => setOpen(false)} />
    </>
  );
}
function show(intents, onDone) {
  render(<Owner intents={intents} onDone={onDone} />);
  screen.getByTestId('opener').focus();
  fireEvent.click(screen.getByTestId('opener'));
}
const click = (id) => fireEvent.click(screen.getByTestId(id));
const type = (value) => fireEvent.change(screen.getByTestId('archive-dialog-reason'), { target: { value } });
const text = (id) => screen.getByTestId(id).textContent;

describe('the confirmation (AC1.1.2, AC4.1.2)', () => {
  it('names the intent, says that nothing is deleted, and gives no warning for a complete one', () => {
    show([A]);
    expect(text('archive-dialog-names')).toContain('alpha');
    expect(text('archive-dialog')).toContain(t('intents.archive.nothingDeleted', { n: 1 }));
    expect(screen.queryByTestId('archive-dialog-warning')).toBeNull();
  });

  it('warns when it is unfinished and when it is the active one', () => {
    show([OPEN]);
    expect(screen.getAllByTestId('archive-dialog-warning').map((w) => w.textContent)).toEqual([
      t('intents.archive.warnUnfinished', { name: 'gamma' }),
      t('intents.archive.warnActive', { name: 'gamma' })
    ]);
  });

  it('lists every chosen intent, with one reason for all of them', async () => {
    show([A, B]);
    expect(screen.getAllByTestId('archive-dialog-name').map((n) => n.textContent)).toEqual(['alpha', 'beta']);
    expect(text('archive-dialog-confirm')).toBe(t('intents.archive.confirm', { n: 2 }));
    type('tidy');
    click('archive-dialog-confirm');
    expect(window.bridge.archiveIntents).toHaveBeenCalledWith('p1', ['261120-a', '261121-b'], 'tidy');
    await screen.findByTestId('archive-outcome-done');
  });

  it('Cancel, Close and Escape run nothing, and focus goes back (FR7.2)', () => {
    show([A]);
    click('archive-dialog-cancel');
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('opener'));
    click('opener');
    fireEvent.keyDown(screen.getByTestId('archive-dialog'), { key: 'Escape' });
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();
    click('opener');
    click('archive-dialog-close');
    expect(window.bridge.archiveIntents).not.toHaveBeenCalled();
  });
});

describe('the reason (AC1.1.4)', () => {
  it('spaces only send none; line breaks become spaces; 200 characters go through', async () => {
    show([A]);
    type('   ');
    click('archive-dialog-confirm');
    expect(window.bridge.archiveIntents).toHaveBeenLastCalledWith('p1', ['261120-a'], '');
    await screen.findByTestId('archive-outcome-done');
    cleanup();

    show([A]);
    type(`one\ntwo ${'x'.repeat(192)}`);
    click('archive-dialog-confirm');
    expect(window.bridge.archiveIntents).toHaveBeenLastCalledWith('p1', ['261120-a'], `one two ${'x'.repeat(192)}`);
    await screen.findByTestId('archive-outcome-done');
  });

  it('201 characters, or a leading hyphen, is refused with a message, and what I typed is kept', () => {
    show([A]);
    for (const [value, code] of [
      ['x'.repeat(201), 'tooLong'],
      ['--force', 'dash']
    ]) {
      type(value);
      click('archive-dialog-confirm');
      expect(text('archive-dialog-error')).toBe(t(`intents.archive.reasonError.${code}`));
      expect(screen.getByTestId('archive-dialog-reason').value).toBe(value);
    }
    type('fine');
    expect(screen.queryByTestId('archive-dialog-error')).toBeNull();
    expect(window.bridge.archiveIntents).not.toHaveBeenCalled();
  });
});

describe('the result (AC1.1.5, FR5)', () => {
  it('a refused single one shows AI-DLC’s words, keeps the reason and can be tried again', async () => {
    window.bridge.archiveIntents.mockResolvedValueOnce(done([], [{ dirName: '261120-a', error: 'still has claimed Units' }], null));
    show([A]);
    type('done');
    click('archive-dialog-confirm');
    await waitFor(() => expect(text('archive-dialog-error')).toBe('still has claimed Units'));
    expect(screen.getByTestId('archive-dialog-reason').value).toBe('done');
    click('archive-dialog-confirm');
    await screen.findByTestId('archive-outcome-done');
  });

  it('a refused start and a failed call show their reason', async () => {
    window.bridge.archiveIntents.mockResolvedValueOnce({ ok: false, error: 'already running' });
    show([A]);
    click('archive-dialog-confirm');
    await waitFor(() => expect(text('archive-dialog-error')).toBe('already running'));
    window.bridge.archiveIntents.mockRejectedValueOnce(new Error("Error invoking remote method 'intents:archive': Error: kaputt"));
    click('archive-dialog-confirm');
    await waitFor(() => expect(text('archive-dialog-error')).toBe('kaputt'));
  });

  it('says what was archived and where the commit stands, and stays until closed', async () => {
    window.bridge.archiveIntents.mockResolvedValueOnce(done(['261120-a'], [], { state: 'refused', reason: 'hook says no' }));
    show([A]);
    click('archive-dialog-confirm');
    expect((await screen.findByTestId('archive-outcome-done')).textContent).toBe(t('intents.archive.done', { n: 1 }));
    expect(text('archive-outcome-commit')).toBe(t('intents.archive.commit.refused', { reason: 'hook says no' }));
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();
    click('archive-dialog-close');
    expect(screen.queryByTestId('archive-outcome-done')).toBeNull();
  });

  it.each(['waiting', 'syncOff', 'noRemote', 'protected', 'offline', 'notMain', 'dirtyIndex'])('has a text for the commit outcome %s', async (state) => {
    window.bridge.archiveIntents.mockResolvedValueOnce(done(['261120-a'], [], { state }));
    show([A]);
    click('archive-dialog-confirm');
    expect((await screen.findByTestId('archive-outcome-commit')).textContent).toBe(t(`intents.archive.commit.${state}`));
  });

  it('names each refused one of several with AI-DLC’s reason (AC4.1.4)', async () => {
    window.bridge.archiveIntents.mockResolvedValueOnce(done(['261120-a'], [{ dirName: '261121-b', error: 'claimed' }]));
    show([A, B]);
    click('archive-dialog-confirm');
    expect((await screen.findByTestId('archive-outcome-done')).textContent).toBe(t('intents.archive.done', { n: 1 }));
    expect(screen.getAllByTestId('archive-outcome-refused').map((r) => r.textContent)).toEqual(['beta: claimed']);
  });
});

describe('while a run goes on (AC4.1.3, AC4.1.5)', () => {
  it('shows the progress of its own project, cannot be started again, and goes on when the dialog is closed', async () => {
    let finish;
    window.bridge.archiveIntents.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const onDone = vi.fn();
    show([A, B], onDone);
    click('archive-dialog-confirm');
    expect(screen.getByTestId('archive-dialog-confirm').disabled).toBe(true);
    act(() => progress({ projectId: 'other', n: 9, total: 9 }));
    act(() => progress({ projectId: 'p1', n: 1, total: 2 }));
    expect(text('archive-outcome-progress')).toBe(t('intents.archive.progress', { n: 1, total: 2 }));

    click('archive-dialog-close');
    expect(text('busy')).toBe('true');
    click('opener'); // opened again: the progress, and still no second start
    expect(screen.getByTestId('archive-dialog-confirm').disabled).toBe(true);
    await act(async () => finish(done(['261120-a', '261121-b'])));
    expect(text('busy')).toBe('false');
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(window.bridge.archiveIntents).toHaveBeenCalledTimes(1);
  });
});
