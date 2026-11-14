// The editor's reach outside its panel (EPIC-10 US-1001): `useEditor().open(rel)` from the artifact reader and the
// Features view, and the unsaved files every open project has, asked about before a project closes or the app quits.
import { createContext, useContext } from 'react';

export const EditorCtx = createContext(null);

/** {open(rel)} inside a project view; null outside one, so views render without it. */
export const useEditor = () => useContext(EditorCtx);

const dirty = new Map(); // projectId -> Set of root-relative paths with unsaved changes

export function markDirty(projectId, rels) {
  if (rels.length) dirty.set(projectId, new Set(rels));
  else dirty.delete(projectId);
}

/** The unsaved files of one project, or of every project without an id. */
export function dirtyFiles(projectId) {
  if (projectId) return [...(dirty.get(projectId) ?? [])];
  return [...dirty.values()].flatMap((s) => [...s]);
}
