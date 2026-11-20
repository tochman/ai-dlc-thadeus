// The project root as a tree (EPIC-10 US-1001), from main's project:listTree: `.gitignore`d files, node_modules/,
// out/, dist/ and .git/ are left out there. A folder's children render only once it is opened.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFold } from '../useFold.js'; // US-0415

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** Sorted paths -> {dirs: {name: node}, files: [name]}. */
export function buildTree(files) {
  const root = { dirs: {}, files: [] };
  for (const f of files) {
    const parts = f.split('/');
    let node = root;
    for (const dir of parts.slice(0, -1)) node = node.dirs[dir] ??= { dirs: {}, files: [] };
    node.files.push(parts.at(-1));
  }
  return root;
}

function Folder({ node, prefix, opened, toggle, onOpen }) {
  return (
    <ul className="file-tree-list">
      {Object.keys(node.dirs)
        .sort()
        .map((name) => {
          const rel = `${prefix}${name}`;
          const open = opened.has(rel);
          return (
            <li key={rel}>
              <button className="file-tree-dir" aria-expanded={open} onClick={() => toggle(rel)}>
                {open ? '▾' : '▸'} {name}
              </button>
              {open && <Folder node={node.dirs[name]} prefix={`${rel}/`} opened={opened} toggle={toggle} onOpen={onOpen} />}
            </li>
          );
        })}
      {node.files.map((name) => (
        <li key={name}>
          <button className="file-tree-file" onClick={() => onOpen(`${prefix}${name}`)} data-testid="file-tree-file">
            {name}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** @param {{projectId: string, onOpen: (rel: string) => void}} props */
export default function FileTree({ projectId, onOpen }) {
  const { t } = useTranslation();
  const [state, setState] = useState({ files: null, truncated: false, error: null });
  const [opened, setOpened] = useState(() => new Set());
  // US-0415 FR5.1: the tree folds to a strip; `.editor-view:has(> .file-tree.is-folded)` gives the editor the width.
  const fold = useFold('editor');
  useEffect(() => {
    let live = true;
    window.bridge
      .listTree(projectId)
      .then((r) => live && setState({ files: r.files, truncated: r.truncated, error: null }))
      .catch((err) => live && setState({ files: null, truncated: false, error: errorText(err) }));
    return () => {
      live = false;
    };
  }, [projectId]);
  const tree = useMemo(() => (state.files ? buildTree(state.files) : null), [state.files]);
  const toggle = (rel) =>
    setOpened((s) => {
      const next = new Set(s);
      if (!next.delete(rel)) next.add(rel);
      return next;
    });

  return (
    <nav
      className={`file-tree${fold.folded ? ' is-folded' : ''}`}
      aria-label={t('editor.tree')}
      data-testid="file-tree"
      onClick={fold.folded ? fold.toggle : undefined}
    >
      <button {...fold.toggleProps} />
      {state.error && <p className="refresh-error">{state.error}</p>}
      {!tree && !state.error && <p className="muted">{t('common.reading')}</p>}
      {tree && <Folder node={tree} prefix="" opened={opened} toggle={toggle} onOpen={onOpen} />}
      {state.truncated && <p className="muted">{t('editor.treeTruncated')}</p>}
    </nav>
  );
}
