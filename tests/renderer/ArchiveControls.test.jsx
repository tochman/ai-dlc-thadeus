// US-0513 FR1.1, FR1.4, FR2.1, FR2.2, FR7.2: Archive and Unarchive in an intent's detail.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';

const terminal = { state: vi.fn(() => 'idle'), anyBusy: vi.fn(), asking: vi.fn(), running: vi.fn() };
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: ArchiveControls } = await import('../../src/renderer/ArchiveControls.jsx');

const intent = {
  dirName: '261120-a',
  slug: 'alpha',
  status: 'in-flight',
  active: true,
  parked: false,
  missingOnDisk: false,
  missingInIndex: false,
  activityAt: 0
};
const archived = { ...intent, status: 'archived', active: false, archivedFrom: 'Running' };
const ui = (over = {}, props = {}) => (
  <div className="project-body">
    <ul tabIndex={-1} data-testid="intent-list-rows" />
    <ArchiveControls projectId="p1" intent={{ ...intent, ...over }} space="default" activeSpace="default" {...props} />
  </div>
);
const show = (over, props) => render(ui(over, props));
const archiveButton = () => screen.queryByTestId('intent-archive');
const unavailable = () => archiveButton().getAttribute('aria-disabled') === 'true';
/** The shared tooltip's text on keyboard focus (US-0414). */
function reason() {
  fireEvent.focus(archiveButton());
  const text = screen.queryByRole('tooltip')?.textContent ?? '';
  fireEvent.blur(archiveButton());
  return text;
}

beforeEach(() => {
  for (const f of ['anyBusy', 'asking', 'running']) terminal[f].mockReturnValue(false);
  window.bridge = {
    archiveIntents: vi.fn(async (_p, dirNames) => ({ ok: true, archived: dirNames, refused: [], commit: { state: 'waiting' } })),
    unarchiveIntent: vi.fn(async () => ({ ok: true, commit: { state: 'waiting' } })),
    onArchiveProgress: vi.fn(() => () => {})
  };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('Archive offered or not (AC1.1.1, AC1.1.6)', () => {
  it('is offered on an intent in flight, parked or complete', () => {
    for (const over of [{}, { parked: true }, { status: 'complete', active: false }]) {
      show(over);
      expect(archiveButton().textContent).toBe(t('intents.archive.open'));
      expect(screen.queryByTestId('intent-unarchive')).toBeNull();
      cleanup();
    }
  });

  it('is not offered on one missing on disk or without a row in intents.json', () => {
    for (const over of [{ missingOnDisk: true }, { missingInIndex: true }, { ...archived, missingInIndex: true }]) {
      show(over);
      expect(archiveButton()).toBeNull();
      expect(screen.queryByTestId('intent-unarchive')).toBeNull();
      cleanup();
    }
  });

  it('in another space than AI-DLC’s active one neither is offered, and the reason shows', () => {
    for (const over of [{}, archived]) {
      show(over, { activeSpace: 'team' });
      expect(archiveButton()).toBeNull();
      expect(screen.queryByTestId('intent-unarchive')).toBeNull();
      expect(screen.getByTestId('intent-archive-space').textContent).toBe(t('intents.archive.otherSpace', { space: 'default', active: 'team' }));
      cleanup();
    }
  });
});

describe('Archive unavailable under a working agent (AC1.2.1, AC1.2.2)', () => {
  it.each([
    ['busy', () => terminal.anyBusy.mockReturnValue(true), {}],
    ['asking', () => terminal.asking.mockReturnValue(true), {}],
    ['running', () => terminal.running.mockReturnValue(true), {}],
    ['elsewhere', () => {}, { activityAt: Date.now() }]
  ])('says which: %s', (code, arrange, over) => {
    arrange();
    show(over);
    expect(unavailable()).toBe(true);
    expect(reason()).toBe(t(`intents.archive.blocked.${code}`));
    fireEvent.click(archiveButton());
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();
  });

  it('is available for a parked active intent with an open session, a complete one, and one that is not active', () => {
    terminal.running.mockReturnValue(true);
    for (const over of [{ parked: true, activityAt: Date.now() }, { status: 'complete' }, { active: false, activityAt: Date.now() }]) {
      show(over);
      expect(unavailable()).toBe(false);
      cleanup();
    }
    terminal.anyBusy.mockReturnValue(true);
    show({ active: false });
    expect(unavailable()).toBe(false); // busy tabs block the active intent only
  });
});

describe('archiving it', () => {
  it('asks first, archives, stays with its result, and focus ends in the list as the control is gone (AC1.1.3, FR7.2)', async () => {
    const { rerender } = show();
    archiveButton().focus();
    fireEvent.click(archiveButton());
    expect(window.bridge.archiveIntents).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('archive-dialog-confirm'));
    expect(window.bridge.archiveIntents).toHaveBeenCalledWith('p1', ['261120-a'], '');
    await screen.findByTestId('archive-outcome-done');
    rerender(ui(archived)); // the list reloads
    expect(screen.getByTestId('intent-unarchive')).toBeTruthy();
    expect(screen.getByTestId('archive-outcome-done')).toBeTruthy();
    fireEvent.click(screen.getByTestId('archive-dialog-close'));
    expect(document.activeElement).toBe(screen.getByTestId('intent-list-rows'));
  });

  it('a dialog closed while the command runs still lets the refusal show beside the button (FR1.5)', async () => {
    let answer;
    window.bridge.archiveIntents = vi.fn(() => new Promise((resolve) => (answer = resolve)));
    show();
    fireEvent.click(archiveButton());
    fireEvent.click(screen.getByTestId('archive-dialog-confirm'));
    fireEvent.click(screen.getByTestId('archive-dialog-close'));
    expect(screen.getByTestId('archive-outcome-progress')).toBeTruthy();
    answer({ ok: true, archived: [], refused: [{ dirName: '261120-a', error: 'claimed team Unit(s)' }], commit: null });
    await waitFor(() => expect(screen.getByTestId('archive-outcome').textContent).toContain('claimed team Unit(s)'));
  });

  it('a Cancel gives focus back to Archive', () => {
    show();
    archiveButton().focus();
    fireEvent.click(archiveButton());
    fireEvent.click(screen.getByTestId('archive-dialog-cancel'));
    expect(document.activeElement).toBe(archiveButton());
  });
});

describe('Unarchive (AC2.1.1, AC2.1.2, AC2.1.4)', () => {
  it('is there instead of Archive, runs without a question, and says what became of the commit', async () => {
    const { rerender } = show(archived);
    expect(archiveButton()).toBeNull();
    fireEvent.click(screen.getByTestId('intent-unarchive'));
    expect(screen.queryByTestId('archive-dialog-confirm')).toBeNull();
    expect(window.bridge.unarchiveIntent).toHaveBeenCalledWith('p1', '261120-a');
    await waitFor(() =>
      expect(screen.getByTestId('intent-unarchive-result').textContent).toBe(`${t('intents.archive.unarchived')} ${t('intents.archive.commit.waiting')}`)
    );
    rerender(ui()); // the list reloads: the result stays beside Archive
    expect(archiveButton()).toBeTruthy();
    expect(screen.getByTestId('intent-unarchive-result')).toBeTruthy();
  });

  it('a refusal and a failed call show their words, and it can be tried again', async () => {
    window.bridge.unarchiveIntent.mockResolvedValueOnce({ ok: false, error: 'is not archived' });
    show(archived);
    fireEvent.click(screen.getByTestId('intent-unarchive'));
    expect((await screen.findByRole('alert')).textContent).toBe('is not archived');
    window.bridge.unarchiveIntent.mockRejectedValueOnce(new Error("Error invoking remote method 'intents:unarchive': Error: kaputt"));
    fireEvent.click(screen.getByTestId('intent-unarchive'));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('kaputt'));
    expect(screen.getByTestId('intent-unarchive').disabled).toBe(false);
  });
});
