import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Monaco is mocked in jsdom: the setup (workers, loader) is skipped and the editor is a textarea.
vi.mock('../../src/renderer/editor/monacoSetup.js', () => ({ default: {} }));
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options }) => (
    <textarea data-testid="monaco" value={value} readOnly={options.readOnly} onChange={(e) => onChange(e.target.value)} />
  ),
  DiffEditor: ({ original, modified }) => <div data-testid="monaco-diff">{`${original}|${modified}`}</div>
}));
const { default: EditorPanel, languageFor, useEditorTabs } = await import('../../src/renderer/editor/EditorPanel.jsx');
const { dirtyFiles } = await import('../../src/renderer/editor/EditorContext.jsx');
const { default: FileTree } = await import('../../src/renderer/editor/FileTree.jsx');

// The shape file:read returns (src/main/fileWrite.js readForEdit).
const opened = (rel, content, extra = {}) => ({ rel, content, mtimeMs: 1000, hash: `hash-${content}`, size: content.length, readOnly: null, ...extra });
let changed;

beforeEach(() => {
  changed = null;
  window.bridge = {
    readFileForEdit: vi.fn(async (_id, rel) => opened(rel, '# Notes\n')),
    writeFile: vi.fn(async (_id, _rel, text) => ({ ok: true, mtimeMs: 2000, hash: `hash-${text}` })),
    watchOpenFiles: vi.fn(async () => {}),
    onFileChanged: vi.fn((cb) => {
      changed = cb;
      return () => {};
    }),
    openInEditor: vi.fn()
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function Harness({ files }) {
  const editor = useEditorTabs('p1');
  useEffect(() => {
    files.forEach((f) => editor.open(f));
  }, []);
  return <EditorPanel projectId="p1" editor={editor} />;
}
const type = async (text) => fireEvent.change(await screen.findByTestId('monaco'), { target: { value: text } });

describe('EditorPanel (EPIC-10 US-1001)', () => {
  it('picks the language from the extension', () => {
    expect(languageFor('docs/notes.md')).toBe('markdown');
    expect(languageFor('src/renderer/App.jsx')).toBe('javascript');
    expect(languageFor('electron-builder.yml')).toBe('yaml');
    expect(languageFor('.github/ci.yaml')).toBe('yaml');
    expect(languageFor('scripts/run.sh')).toBe('shell');
    expect(languageFor('Dockerfile')).toBe('dockerfile');
    expect(languageFor('LICENSE')).toBe('plaintext');
    expect(languageFor('data.unknownext')).toBe('plaintext');
  });

  it('saves on Cmd+S with the mtime and hash the file was opened with, and marks unsaved changes', async () => {
    render(<Harness files={['docs/notes.md']} />);
    await type('# Notes\n\nMore.\n');
    expect(screen.getByTestId('editor-tab-dirty')).toBeTruthy();
    expect(dirtyFiles('p1')).toEqual(['docs/notes.md']);
    expect(screen.getByTestId('editor-preview').textContent).toContain('More.'); // Markdown preview beside it
    fireEvent.keyDown(screen.getByTestId('editor-panel'), { key: 's', metaKey: true });
    await waitFor(() =>
      expect(window.bridge.writeFile).toHaveBeenCalledWith('p1', 'docs/notes.md', '# Notes\n\nMore.\n', { mtimeMs: 1000, hash: 'hash-# Notes\n' })
    );
    await waitFor(() => expect(screen.queryByTestId('editor-tab-dirty')).toBeNull());
    expect(dirtyFiles('p1')).toEqual([]);
  });

  it('adds an appended section after the content, unsaved, and writes nothing until the person saves (US-1201 AC-2)', async () => {
    function AppendHarness() {
      const editor = useEditorTabs('p1');
      useEffect(() => {
        editor.open('docs/notes.md', { append: '\n## Efter merge med main\n' });
      }, []);
      return (
        <>
          <button data-testid="append-again" onClick={() => editor.open('docs/notes.md', { append: 'again\n' })} />
          <EditorPanel projectId="p1" editor={editor} />
        </>
      );
    }
    render(<AppendHarness />);
    await waitFor(() => expect(screen.getByTestId('monaco').value).toBe('# Notes\n\n## Efter merge med main\n'));
    expect(screen.getByTestId('editor-tab-dirty')).toBeTruthy();
    fireEvent.click(screen.getByTestId('append-again')); // already open: appended to what is there
    expect(screen.getByTestId('monaco').value).toBe('# Notes\n\n## Efter merge med main\nagain\n');
    expect(window.bridge.writeFile).not.toHaveBeenCalled();
  });

  it('opens the conflict dialog when the file changed on disk, and keeps mine against the disk version', async () => {
    window.bridge.writeFile
      .mockResolvedValueOnce({ conflict: true, disk: { content: '# By the agent\n', mtimeMs: 1500, hash: 'hash-agent' } })
      .mockResolvedValueOnce({ ok: true, mtimeMs: 3000, hash: 'hash-mine' });
    render(<Harness files={['docs/notes.md']} />);
    await type('# Mine\n');
    fireEvent.keyDown(screen.getByTestId('editor-panel'), { key: 's', ctrlKey: true });
    expect((await screen.findByTestId('editor-conflict')).textContent).toContain('docs/notes.md');
    fireEvent.click(screen.getByTestId('editor-conflict-compare'));
    expect((await screen.findByTestId('monaco-diff')).textContent).toBe('# By the agent\n|# Mine\n');
    fireEvent.click(screen.getByTestId('editor-conflict-keep'));
    await waitFor(() => expect(window.bridge.writeFile).toHaveBeenLastCalledWith('p1', 'docs/notes.md', '# Mine\n', { mtimeMs: 1500, hash: 'hash-agent' }));
    await waitFor(() => expect(screen.queryByTestId('editor-conflict')).toBeNull());
  });

  it('asks before closing a tab with unsaved changes', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    render(<Harness files={['docs/notes.md']} />);
    await type('# Changed\n');
    fireEvent.click(screen.getByTestId('editor-tab-close'));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('editor-tab')).toBeTruthy();
    fireEvent.click(screen.getByTestId('editor-tab-close'));
    expect(screen.queryByTestId('editor-tab')).toBeNull();
  });

  it('shows a read-only file with its reason and no save', async () => {
    window.bridge.readFileForEdit.mockResolvedValue(opened('aidlc/spaces/default/intents/x/aidlc-state.md', '# State\n', { readOnly: 'engine' }));
    render(<Harness files={['aidlc/spaces/default/intents/x/aidlc-state.md']} />);
    expect((await screen.findByTestId('editor-read-only')).textContent).toBe('Skrivskyddad: filen tillhör AI-DLC:s motor.');
    expect(screen.queryByTestId('editor-save')).toBeNull();
    expect(screen.getByTestId('monaco').readOnly).toBe(true);
    fireEvent.keyDown(screen.getByTestId('editor-panel'), { key: 's', metaKey: true });
    expect(window.bridge.writeFile).not.toHaveBeenCalled();
  });

  it('reloads a clean file quietly when it changes on disk, and only notes it on a dirty one', async () => {
    render(<Harness files={['docs/notes.md']} />);
    await screen.findByTestId('monaco');
    window.bridge.readFileForEdit.mockResolvedValue(opened('docs/notes.md', '# New on disk\n'));
    await act(() => changed({ projectId: 'p1', rel: 'docs/notes.md' }));
    await waitFor(() => expect(screen.getByTestId('monaco').value).toBe('# New on disk\n'));
    expect(screen.queryByTestId('editor-changed-on-disk')).toBeNull();

    await type('# Mine\n');
    window.bridge.readFileForEdit.mockResolvedValue(opened('docs/notes.md', '# Newer\n'));
    await act(() => changed({ projectId: 'p1', rel: 'docs/notes.md' }));
    expect(await screen.findByTestId('editor-changed-on-disk')).toBeTruthy();
    expect(screen.getByTestId('monaco').value).toBe('# Mine\n');
  });

  // US-0415 AC5.1.1: the editor view as ProjectView lays it out, the file tree beside the editor.
  it('the file tree folds to the strip and the editor takes the width (US-0415 AC5.1.1)', async () => {
    window.bridge.listTree = vi.fn(async () => ({ files: ['README.md'], truncated: false }));
    render(
      <div className="editor-view" data-testid="editor-view">
        <FileTree projectId="p1" onOpen={() => {}} />
        <Harness files={[]} />
      </div>
    );
    const tree = screen.getByTestId('file-tree');
    await screen.findByTestId('file-tree-file');
    fireEvent.click(screen.getByTestId('list-fold-toggle'));
    expect(tree.classList.contains('is-folded')).toBe(true);
    expect(screen.getByTestId('editor-view').matches('.editor-view:has(> .file-tree.is-folded)')).toBe(true); // the 28px grid column
    fireEvent.click(tree); // the strip brings it back
    expect(tree.classList.contains('is-folded')).toBe(false);
    expect(screen.getByTestId('file-tree-file')).toBeTruthy();
  });
});
