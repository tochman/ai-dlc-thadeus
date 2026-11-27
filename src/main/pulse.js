// US-0418 FR2, FR7, FR9: the Pulse model. Which agent read, wrote or deleted which project file, for 15 minutes, in
// memory only. Paths are project-relative; a path outside the project is one `outside` mark with no path (FR5).
import path from 'node:path';

export const HISTORY_MS = 15 * 60_000; // FR9.2
export const FADE_MS = 10 * 60_000; // FR7.1
export const GROUP_LIMIT = 200; // FR7.2, sized for NFR1 (500 files must stay smooth; past 200 marks they merge by folder)
export const UNATTRIBUTED = 'unattributed'; // FR2.3
const KINDS = new Set(['read', 'write', 'delete']);
const OUTSIDE = '\0outside';

/** US-0418 FR2, FR7, FR9.2: add touches, set the working agents, read a snapshot for a moment. */
export function createPulseStore() {
  let touches = []; // { agent, path?, outside?, kind, at }, oldest first
  const files = new Map(); // key -> { path?, outside?, kind, lastAt, deleted, agents: Set }
  const known = new Map(); // agent id -> { label, group }
  let working = [];

  return {
    add({ agent, path: rel, outside, kind, at }) {
      if (!KINDS.has(kind)) throw new Error(`pulse: unknown kind ${kind}`);
      const id = agent?.id ?? UNATTRIBUTED;
      if (agent) known.set(id, { label: agent.label ?? null, group: agent.group ?? null });
      const where = outside ? { outside: true } : { path: rel };
      touches = touches.filter((t) => t.at > at - HISTORY_MS);
      touches.push({ agent: id, ...where, kind, at });
      const key = outside ? OUTSIDE : rel;
      const prev = files.get(key);
      files.delete(key); // re-added last, so the newest touch is last
      files.set(key, { ...where, kind, lastAt: at, deleted: kind === 'delete', agents: new Set([...(prev?.agents ?? []), id]) });
      for (const [k, f] of files) if (f.lastAt <= at - FADE_MS) files.delete(k);
    },
    /** FR2.2: the agents working now; they hold a segment even before their first touch. */
    setAgents(list) {
      working = list.map((a) => ({ id: a.id, label: a.label ?? null, group: a.group ?? null }));
      for (const a of working) known.set(a.id, { label: a.label, group: a.group });
    },
    snapshot(at) {
      const recent = touches.filter((t) => t.at > at - HISTORY_MS);
      const count = (id) => recent.reduce((n, t) => n + (t.agent === id), 0);
      const ids = [...new Set([...working.map((a) => a.id), ...recent.map((t) => t.agent)])].filter((id) => id !== UNATTRIBUTED);
      const agents = ids.map((id) => ({ id, ...known.get(id), active: working.some((a) => a.id === id), count: count(id) }));
      agents.push({ id: UNATTRIBUTED, label: null, group: null, active: false, count: count(UNATTRIBUTED) });
      const marks = [];
      for (const f of files.values()) {
        const weight = 1 - (at - f.lastAt) / FADE_MS;
        if (weight > 0) marks.push({ ...f, weight: Math.min(1, weight), agents: [...f.agents] });
      }
      return { agents, files: marks.length > GROUP_LIMIT ? byFolder(marks) : marks, touches: recent };
    }
  };
}

export const PUSH_MS = 2000; // the same batching as agent:activity
const WRITE_GRACE_MS = 2000; // FR4.4: the file system reports a write tool's change a moment after the tool ends

/**
 * US-0418 FR3, FR4, NFR6: one Pulse store per project, fed by hook touches and the file observer. `watch(root, onChange)`
 * runs only while `setActive` names a root; `push(projectId, snapshot)` gets one batched snapshot per changed project.
 */
export function createPulseHub({ watch, push, intervalMs = PUSH_MS, now = Date.now }) {
  const projects = new Map(); // projectId -> { store, root, watcher, shells: Map toolId->agent, writes: Map toolId->{paths, until} }
  const dirty = new Set();
  let timer = null;

  const of = (projectId) => {
    let p = projects.get(projectId);
    if (!p) projects.set(projectId, (p = { store: createPulseStore(), root: null, watcher: null, shells: new Map(), writes: new Map() }));
    return p;
  };
  const changed = (projectId) => {
    dirty.add(projectId);
    timer ??= setTimeout(() => {
      timer = null;
      for (const id of dirty) if (projects.has(id)) push(id, projects.get(id).store.snapshot(now()));
      dirty.clear();
    }, intervalMs);
  };
  const stopWatch = (p) => {
    p.watcher?.close();
    p.watcher = null;
    p.root = null;
  };

  const hub = {
    /** FR3.1, FR4.3, FR4.4: a hook tool start keeps its paths and opens a shell or write; its end closes them. */
    touch({ projectId, agent, tool, toolId, paths, phase, at = now() }) {
      const p = of(projectId);
      const name = String(tool ?? '').toLowerCase();
      if (phase === 'end') {
        p.shells.delete(toolId);
        const w = p.writes.get(toolId);
        if (w) w.until = at + WRITE_GRACE_MS;
        return;
      }
      if (SHELL_TOOLS.has(name)) p.shells.set(toolId, agent);
      if (FILE_TOOLS[name] === 'write' && paths) p.writes.set(toolId, { paths: new Set(paths.map((x) => x.path)), until: Infinity });
      for (const x of paths ?? []) p.store.add({ agent, ...(x.outside ? { outside: true } : { path: x.path }), kind: x.kind, at });
      if (paths?.length) changed(projectId);
    },
    /** FR2.2: the agents working now in the project. */
    setAgents(projectId, agents) {
      of(projectId).store.setAgents(agents);
      changed(projectId);
    },
    /** FR4.2, NFR6: the observer runs while the project has an active agent, intent or Spec Kit flow (root), else not. */
    setActive(projectId, root) {
      const p = of(projectId);
      if (p.root === root) return;
      stopWatch(p);
      if (!root) return;
      p.root = root;
      p.watcher = watch(root, (c) => hub.fileChange(projectId, c));
    },
    /** FR4.3, FR4.4: an observed change; dropped when a write tool holds the file, else credited to the running shells. */
    fileChange(projectId, { path: rel, kind }) {
      const p = of(projectId);
      const at = now();
      for (const [id, w] of p.writes) if (w.until <= at) p.writes.delete(id);
      if ([...p.writes.values()].some((w) => w.paths.has(rel))) return;
      const agents = p.shells.size ? [...new Set(p.shells.values())] : [null];
      for (const agent of agents) p.store.add({ agent, path: rel, kind, at });
      changed(projectId);
    },
    list: (projectId) => (projects.get(projectId)?.store ?? createPulseStore()).snapshot(now()),
    /** NFR6: a closed project leaves nothing behind. */
    drop(projectId) {
      const p = projects.get(projectId);
      if (p) stopWatch(p);
      projects.delete(projectId);
    },
    close() {
      clearTimeout(timer);
      timer = null;
      for (const id of [...projects.keys()]) hub.drop(id);
    }
  };
  return hub;
}

const WORKING = new Set(['working', 'tool', 'writing', 'thinking']); // the same states as ipc.js WORKING_STATES
const agentOf = ({ sessionId, agentId, agentType }) => ({
  id: agentId ? `agent:${sessionId}:${agentId}` : `main:${sessionId}`,
  label: agentType ?? null,
  group: sessionId
});

/**
 * US-0418 FR3.1, FR2.2, FR4.2: feeds the hook store's touches and activity rows into the hub. `rootOf(projectId)` is the
 * open project's root, null once it is closed. Returns the unsubscribe.
 * ponytail: the observer runs while an agent works; an open intent or Spec Kit flow alone does not start it. Add that
 * when a change made outside an agent turn needs to show.
 */
export function wirePulse({ events, hub, rootOf }) {
  const offs = [
    events.onTouch((t) => {
      if (!rootOf(t.projectId)) return;
      const phase = t.name === 'toolEnd' ? 'end' : 'start';
      hub.touch({ projectId: t.projectId, agent: agentOf(t), tool: t.tool, toolId: t.toolId, paths: t.paths, phase, at: t.atMs });
    }),
    events.onActivity(({ projectId, rows }) => {
      const root = rootOf(projectId);
      if (!root) return;
      const live = rows.filter((r) => !r.stale && r.state !== 'idle');
      hub.setAgents(projectId, live.map(agentOf));
      hub.setActive(projectId, live.some((r) => WORKING.has(r.state)) ? root : null);
    })
  ];
  return () => offs.forEach((off) => off());
}

export const MAX_PATHS = 20; // FR5.1: a bounded field on every tool start
const MAX_PATH_CHARS = 256;
const FILE_TOOLS = { read: 'read', write: 'write', edit: 'write', multiedit: 'write' };
const SEARCH_TOOLS = new Set(['grep', 'glob', 'list']);
const SHELL_TOOLS = new Set(['bash', 'shell']);

/** FR5: a project-relative path, `outside` for anything not in the project, null for no path. */
function relativePath(value, cwd, root) {
  const s = String(value)
    .replace(/\p{Cc}/gu, '')
    .replace(/^['"]|['"]$/g, '')
    .trim();
  if (!s) return null;
  if (s.startsWith('~')) return { outside: true };
  const abs = path.posix.isAbsolute(s) ? path.posix.normalize(s) : cwd ? path.posix.resolve(cwd, s) : null;
  if (abs && !root) return { outside: true };
  const rel = abs ? path.posix.relative(root, abs) || '.' : path.posix.normalize(s);
  if (rel === '..' || rel.startsWith('../') || path.posix.isAbsolute(rel)) return { outside: true };
  return { path: rel.replace(/\/+$/, '').slice(0, MAX_PATH_CHARS) || '.' };
}

// FR3.3: a word with a slash or a file extension, not a flag or a URL.
// ponytail: a best guess on whitespace-split words; quoted paths with spaces and paths built in the shell are missed.
const pathLike = (w) => !w.startsWith('-') && !w.includes('://') && (w.includes('/') || /\.[A-Za-z]\w*$/.test(w));

/**
 * US-0418 FR3, FR5: the files a tool call touches, from its input. Read/Write/Edit/MultiEdit give their file, Grep and
 * Glob their `path`, a shell command a best-guess read per path-like word. No absolute path, content or other input
 * ever leaves; at most MAX_PATHS entries, one `outside` mark for every path outside the project. Null for none.
 */
export function pulsePaths(tool, input, cwd, root) {
  if (typeof tool !== 'string' || !input || typeof input !== 'object') return null;
  const name = tool.toLowerCase();
  let raw = [];
  let kind = 'read';
  if (Object.hasOwn(FILE_TOOLS, name)) {
    kind = FILE_TOOLS[name];
    raw = [input.file_path ?? input.filePath ?? input.path];
  } else if (SEARCH_TOOLS.has(name)) raw = [input.path];
  else if (SHELL_TOOLS.has(name) && typeof input.command === 'string') raw = input.command.split(/[\s;|&<>()]+/).filter(pathLike);
  const out = [];
  const seen = new Set();
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const where = relativePath(value, cwd, root);
    const key = where && (where.outside ? '\0' : where.path);
    if (!where || seen.has(key)) continue;
    seen.add(key);
    out.push({ ...where, kind });
    if (out.length === MAX_PATHS) break;
  }
  return out.length ? out : null;
}

/** FR7.2: one mark per folder; the outside mark stays as it is. */
function byFolder(marks) {
  const groups = new Map();
  for (const m of marks) {
    const key = m.outside ? OUTSIDE : path.posix.dirname(m.path);
    const g = groups.get(key);
    if (!g)
      groups.set(
        key,
        m.outside
          ? { ...m, count: 1 }
          : { path: key, folder: true, kind: m.kind, weight: m.weight, deleted: false, lastAt: m.lastAt, agents: m.agents, count: 1 }
      );
    else
      Object.assign(g, {
        weight: Math.max(g.weight, m.weight),
        lastAt: Math.max(g.lastAt, m.lastAt),
        agents: [...new Set([...g.agents, ...m.agents])],
        count: g.count + 1
      });
  }
  return [...groups.values()];
}
