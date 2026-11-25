// US-1411 FR1.1–FR1.4, FR2.1, FR2.2, FR6.2: Archive and Unarchive in a Spec Kit feature's detail.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import SpeckitArchive from '../../src/renderer/SpeckitArchive.jsx';
import { t } from '../../src/shared/i18n.js';

const search = { dir: '002-search', number: '002', name: 'search', active: false, archived: false, tasks: { done: 0, total: 0, skipped: 0, phases: [] } };
const withTasks = (done, total) => ({ ...search, tasks: { ...search.tasks, done, total } });

let onDisk; // whether the feature is marked, as main would say
let setFeature;
/** An owner as SpeckitFeatures is: the list, and a reload that reads the mark again. */
function Owner({ start }) {
  const [feature, set] = useState(start);
  const list = useRef(null);
  setFeature = set;
  return (
    <>
      <ul ref={list} tabIndex={-1} data-testid="list" />
      <button data-testid="elsewhere">x</button>
      <SpeckitArchive projectId="p1" feature={feature} onChanged={async () => set((f) => ({ ...f, archived: onDisk }))} getList={() => list.current} />
    </>
  );
}
const show = (start = search) => {
  onDisk = start.archived;
  return render(<Owner start={start} />);
};
const q = (role) => screen.queryByTestId(`speckit-archive-${role}`);
const click = (role) => act(async () => fireEvent.click(q(role)));
const dialogOpen = () => q('dialog').hasAttribute('open');
/** Opens the confirmation from the keyboard's place, so focus has somewhere to go back to. */
async function ask(start) {
  show(start);
  q('open').focus();
  await click('open');
}

beforeEach(() => {
  window.bridge = {
    archiveSpeckitFeature: vi.fn(async () => {
      onDisk = true;
      return { ok: true };
    }),
    unarchiveSpeckitFeature: vi.fn(async () => {
      onDisk = false;
      return { ok: true };
    })
  };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('the confirmation (FR1.1, FR1.2)', () => {
  it('is offered on a feature that is neither active nor archived, names it and says that only the app hides it', async () => {
    await ask();
    expect(q('open').textContent).toBe(t('intents.archive.open'));
    expect(q('remove')).toBeNull();
    expect(dialogOpen()).toBe(true);
    expect(q('name').textContent).toBe('002 · search');
    expect(q('dialog').textContent).toContain(t('speckit.archive.hidden'));
    expect(q('dialog').querySelector('input, textarea')).toBeNull(); // no reason field
  });

  it.each([
    ['no tasks.md', withTasks(0, 0), null],
    ['every task done', withTasks(3, 3), null],
    ['one open task', withTasks(2, 3), 1],
    ['several open tasks', withTasks(1, 5), 4]
  ])('%s: warns only about open tasks, and how many', async (_name, feature, n) => {
    await ask(feature);
    expect(q('warning')?.textContent ?? null).toBe(n === null ? null : t('speckit.archive.openTasks', { n }));
  });

  it('Cancel and Escape send nothing, and focus goes back to Archive', async () => {
    await ask();
    await click('cancel');
    expect(dialogOpen()).toBe(false);
    expect(document.activeElement).toBe(q('open'));
    await click('open');
    await act(async () => fireEvent.keyDown(q('dialog'), { key: 'Escape' }));
    expect(dialogOpen()).toBe(false);
    expect(window.bridge.archiveSpeckitFeature).not.toHaveBeenCalled();
  });

  it('sends once on confirm, also when clicked twice, then offers Unarchive with focus on the list', async () => {
    let answer;
    window.bridge.archiveSpeckitFeature.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    await ask();
    await click('confirm');
    await click('confirm');
    expect(window.bridge.archiveSpeckitFeature.mock.calls).toEqual([['p1', '002-search']]);
    onDisk = true;
    await act(async () => answer({ ok: true }));
    await waitFor(() => expect(dialogOpen()).toBe(false));
    expect(q('open')).toBeNull();
    expect(q('remove').textContent).toBe(t('intents.archive.unarchive'));
    expect(q('error')).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId('list'));
  });
});

describe('a refusal (FR1.4)', () => {
  it('stays in the dialog with its reason, is gone the next time, and leaves the feature as it was', async () => {
    window.bridge.archiveSpeckitFeature.mockResolvedValueOnce({ ok: false, error: 'It is active now' });
    await ask();
    await click('confirm');
    expect(dialogOpen()).toBe(true);
    expect(q('error').textContent).toBe('It is active now');
    expect(q('remove')).toBeNull();
    await click('cancel');
    expect(q('error')).toBeNull();
    await click('open');
    expect(q('error')).toBeNull();
  });

  it('shows a rejected call without its IPC prefix, and beside the pill when the dialog was closed meanwhile', async () => {
    let fail;
    window.bridge.archiveSpeckitFeature.mockImplementation(() => new Promise((_resolve, reject) => (fail = reject)));
    await ask();
    await click('confirm');
    await click('cancel');
    await act(async () => fail(new Error("Error invoking remote method 'speckit:archive': Error: boom")));
    expect(dialogOpen()).toBe(false);
    expect(q('error').textContent).toBe('boom');
  });
});

describe('the active feature (FR1.3)', () => {
  it('has Archive unavailable with its reason, which the keyboard reaches', async () => {
    show({ ...search, active: true });
    expect(q('open').getAttribute('aria-disabled')).toBe('true');
    expect(q('open').disabled).toBe(false);
    act(() => q('open').focus());
    expect(screen.getByRole('tooltip').textContent).toBe(t('speckit.archive.active'));
    await click('open');
    expect(dialogOpen()).toBe(false);
  });
});

describe('Unarchive (FR2.1, FR2.2, FR6.2)', () => {
  const archived = { ...search, archived: true };

  it('asks nothing, sends once, offers Archive again and gives the list focus', async () => {
    show(archived);
    expect(q('open')).toBeNull();
    q('remove').focus();
    fireEvent.click(q('remove'));
    await click('remove');
    expect(window.bridge.unarchiveSpeckitFeature.mock.calls).toEqual([['p1', '002-search']]);
    expect(dialogOpen()).toBe(false);
    await waitFor(() => expect(q('open')).toBeTruthy());
    expect(document.activeElement).toBe(screen.getByTestId('list'));
  });

  it('leaves focus where the person moved it meanwhile', async () => {
    let answer;
    window.bridge.unarchiveSpeckitFeature.mockImplementation(() => new Promise((resolve) => (answer = resolve)));
    show(archived);
    await click('remove');
    screen.getByTestId('elsewhere').focus();
    onDisk = false;
    await act(async () => answer({ ok: true }));
    await waitFor(() => expect(q('open')).toBeTruthy());
    expect(document.activeElement).toBe(screen.getByTestId('elsewhere'));
  });

  it('shows why it failed and stays archived; a change from elsewhere takes no focus', async () => {
    window.bridge.unarchiveSpeckitFeature.mockResolvedValueOnce({ ok: false, error: 'No access' });
    show(archived);
    await click('remove');
    expect(q('error').textContent).toBe('No access');
    expect(q('error').getAttribute('role')).toBe('alert');
    expect(q('remove')).toBeTruthy();
    await act(async () => setFeature(search)); // a pull removed the mark
    expect(q('open')).toBeTruthy();
    expect(document.activeElement).toBe(document.body);
  });
});
