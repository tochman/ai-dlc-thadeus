// US-1201 AC-2 (US-1202): the collision warning: how far behind main the branch is, the other pull requests that change
// the same files and the files that would conflict, and the merge note opened in the editor. LCARS look, shared Tooltip.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';
import CollisionPanel from '../../src/renderer/CollisionPanel.jsx';

// The shape team:collisions returns.
const COLLIDING = {
  isRepo: true,
  branch: 'feat/US-1201',
  base: 'origin/main',
  behind: 3,
  error: null,
  collisions: [{ number: 58, title: 'feat(US-0209): cost', branch: 'feat/US-0209', shared: ['src/a.js', 'src/b.js'], conflicts: ['src/a.js'] }]
};
const NOTE = { rel: 'aidlc/spaces/default/intents/261116-a/construction/build-and-test/test-results.md', section: '\n## Efter merge med main\n' };

function setup(result = COLLIDING, props = {}) {
  window.bridge = { getCollisions: vi.fn(async () => result), getMergeNote: vi.fn(async () => NOTE) };
  const editor = { open: vi.fn() };
  const view = render(
    <EditorCtx.Provider value={editor}>
      <CollisionPanel projectId="p1" space="default" activeDirName="261116-a" refreshKey={0} {...props} />
    </EditorCtx.Provider>
  );
  return { editor, view };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CollisionPanel (US-1201 AC-2)', () => {
  it('says how many commits the branch is behind main and that the tests should run again', async () => {
    setup();
    const behind = await screen.findByTestId('collision-panel-behind');
    expect(behind.textContent).toBe('Grenen ligger 3 commits efter origin/main. Merga in main och kör testerna igen innan du godkänner.');
    expect(window.bridge.getCollisions).toHaveBeenCalledWith('p1');
  });

  it('names the other pull request, the shared files and the files that would conflict', async () => {
    setup();
    const pull = await screen.findByTestId('collision-panel-pull');
    expect(pull.textContent).toContain('Pull request #58 feat(US-0209): cost ändrar samma filer:');
    expect(pull.textContent).toContain('src/b.js');
    expect(screen.getByTestId('collision-panel-conflicts').textContent).toBe('Skulle krocka vid en merge:src/a.js');
    expect(pull.closest('.lcars-card')).toBeTruthy();
  });

  it('says when the branch is level, nothing overlaps, conflicts are unknown, or main is not fetched', async () => {
    setup({ ...COLLIDING, behind: 0, collisions: [] });
    expect((await screen.findByTestId('collision-panel-behind')).textContent).toBe('Grenen är i fas med origin/main.');
    expect(screen.getByText('Ingen annan öppen pull request ändrar samma filer.')).toBeTruthy();
    cleanup();

    setup({ ...COLLIDING, behind: null, collisions: [{ ...COLLIDING.collisions[0], conflicts: null }] });
    expect((await screen.findByTestId('collision-panel-behind')).textContent).toMatch(/^origin\/main finns inte här ännu/);
    expect(screen.getByText(/Krockarna går inte att räkna ut/)).toBeTruthy();
    cleanup();

    setup({ ...COLLIDING, collisions: [{ ...COLLIDING.collisions[0], conflicts: [] }] });
    expect(await screen.findByText('Inga krockar vid en merge.')).toBeTruthy();
  });

  it("shows a platform failure with its own words and keeps git's part", async () => {
    setup({ ...COLLIDING, collisions: [], error: { code: 'not-logged-in', message: 'GitHub kan inte läsas: du är inte inloggad.' } });
    expect((await screen.findByTestId('collision-panel-error')).textContent).toBe('GitHub kan inte läsas: du är inte inloggad.');
    expect(screen.getByTestId('collision-panel-behind')).toBeTruthy();
    expect(screen.queryByText('Ingen annan öppen pull request ändrar samma filer.')).toBeNull();
  });

  it('opens test-results.md in the editor with the merge note section, and has its help in the shared tooltip', async () => {
    const { editor } = setup();
    const button = await screen.findByTestId('collision-panel-merge-note');
    expect(button.getAttribute('title')).toBeNull();
    fireEvent.focus(button);
    expect(screen.getByRole('tooltip').className).toBe('lcars-tip');
    expect(screen.getByRole('tooltip').textContent).toMatch(/Efter merge med main/);
    fireEvent.click(button);
    await waitFor(() => expect(editor.open).toHaveBeenCalledWith(NOTE.rel, { append: NOTE.section }));
    expect(window.bridge.getMergeNote).toHaveBeenCalledWith('p1', 'default', '261116-a');
  });

  it('offers no merge note without an active intent, and reads again when the panel is refreshed', async () => {
    const { view } = setup(COLLIDING, { activeDirName: null });
    await screen.findByTestId('collision-panel-behind');
    expect(screen.queryByTestId('collision-panel-merge-note')).toBeNull();
    view.rerender(
      <EditorCtx.Provider value={{ open: vi.fn() }}>
        <CollisionPanel projectId="p1" space="default" activeDirName={null} refreshKey={1} />
      </EditorCtx.Provider>
    );
    await waitFor(() => expect(window.bridge.getCollisions).toHaveBeenCalledTimes(2));
  });

  it('shows a failed read as an error line, and nothing for a folder that is not a repository', async () => {
    window.bridge = { getCollisions: vi.fn(async () => Promise.reject(new Error("Error invoking remote method 'team:collisions': Error: boom"))) };
    render(<CollisionPanel projectId="p1" space="default" activeDirName={null} refreshKey={0} />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/boom/);
    cleanup();
    setup({ isRepo: false });
    await waitFor(() => expect(window.bridge.getCollisions).toHaveBeenCalled());
    expect(screen.queryByTestId('collision-panel')).toBeNull();
  });
});
