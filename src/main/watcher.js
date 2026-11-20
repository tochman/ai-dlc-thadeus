// Watches one space's intents/ folder and reports which intents changed, debounced.
import chokidar from 'chokidar';
import path from 'node:path';

const ENGINE_DIR = '.aidlc-engine';
const KEEP_IN_ENGINE = 'active-directive.json';

/** Ignore everything under .aidlc-engine/ except active-directive.json (the folder itself is kept so it is descended). */
function isIgnored(p) {
  const parts = p.split(path.sep);
  const i = parts.indexOf(ENGINE_DIR);
  return i !== -1 && i < parts.length - 1 && parts[parts.length - 1] !== KEEP_IN_ENGINE;
}

/** Debounce, but never hold a change longer than maxWaitMs while an agent writes continuously (NFR1). */
function debounce(flush, debounceMs, maxWaitMs) {
  let timer = null;
  let firstAt = 0;
  return {
    schedule() {
      if (!timer) firstAt = Date.now();
      clearTimeout(timer);
      timer = setTimeout(
        () => {
          timer = null;
          flush();
        },
        Math.min(debounceMs, Math.max(0, firstAt + maxWaitMs - Date.now()))
      );
    },
    cancel: () => clearTimeout(timer)
  };
}

/**
 * A watched target is a file when it ends in .md, .json, .sh or .js (US-0506 u4 PD32: dialog.sh and the opencode plugin),
 * or is dot-named such as aidlc/.aidlc-subagent-inflight; any other target is a folder.
 */
export const isWatchedFile = (t) => /\.(md|json|sh|js)$/i.test(t) || path.posix.basename(t).startsWith('.');

/**
 * Watches a few root-relative paths: files (see isWatchedFile) and folders (their direct .md files), and
 * calls `onChange()` debounced (EPIC-06 FR2.7, US-0901 FR6.1). The root itself is watched with everything else ignored, so paths
 * whose folder does not exist yet are still seen once they appear (chokidar v4 misses those otherwise, F-01).
 * @param {{root: string, paths: string[], onChange: () => void, onError?: (err: Error) => void, debounceMs?: number, maxWaitMs?: number}} opts
 */
export function watchFiles({ root, paths, onChange, onError = console.error, debounceMs = 300, maxWaitMs = 800 }) {
  const base = path.resolve(root);
  const targets = paths.map((p) => path.posix.normalize(p.split(path.sep).join('/')));
  const relOf = (p) => path.relative(base, path.resolve(p)).split(path.sep).join('/');
  const isFile = isWatchedFile;
  const matches = (rel) => targets.some((t) => (isFile(t) ? rel === t : path.posix.dirname(rel) === t && rel.toLowerCase().endsWith('.md')));
  const keep = (rel) => rel === '' || targets.some((t) => t === rel || t.startsWith(`${rel}/`)) || matches(rel);
  const { schedule, cancel } = debounce(onChange, debounceMs, maxWaitMs);

  const depth = Math.max(...targets.map((t) => t.split('/').length + (isFile(t) ? 0 : 1)));
  const watcher = chokidar.watch(base, { ignoreInitial: true, depth, ignored: (p) => !keep(relOf(p)) });
  watcher.on('all', (_event, p) => {
    if (matches(relOf(p))) schedule();
  });
  watcher.on('error', onError);
  const ready = new Promise((resolve) => watcher.once('ready', resolve));
  return {
    ready,
    close: async () => {
      cancel();
      await watcher.close();
    }
  };
}

/** The files open in the editor (EPIC-10 US-1001): `onChange(absPath)` for every change, add or removal of one. */
export function watchOpenFiles({ files, onChange, onError = console.error }) {
  const watcher = chokidar.watch(files, { ignoreInitial: true });
  watcher.on('all', (_event, p) => onChange(p));
  watcher.on('error', onError);
  return { close: () => watcher.close() };
}

/**
 * US-0507 FR5.1: a watcher on the project root that lets through only `.aidlc/worktrees/bolt-*` and, inside each, the
 * intents' Unit plans (`<intents>/<dir>/construction/<unit>/code-generation/code-generation-plan.md`), and calls
 * `onPlan(dir)` for a change of one. The root is watched so worktrees created later are seen (F-01).
 */
function watchWorktreePlans(worktreesDir, intentsDir, onPlan) {
  const trees = path.resolve(worktreesDir);
  const root = path.dirname(path.dirname(trees));
  const any = (p) => !p.startsWith('.');
  const steps = [
    ...path.relative(root, trees).split(path.sep),
    (p) => p.startsWith('bolt-'),
    ...path.relative(root, path.resolve(intentsDir)).split(path.sep),
    any,
    'construction',
    any,
    'code-generation',
    'code-generation-plan.md'
  ];
  const fits = (parts) => parts.length <= steps.length && parts.every((p, i) => (typeof steps[i] === 'string' ? p === steps[i] : steps[i](p)));
  const partsOf = (p) => path.relative(root, path.resolve(p)).split(path.sep).filter(Boolean);
  const dirAt = steps.length - 5;
  const watcher = chokidar.watch(root, { ignoreInitial: true, depth: steps.length, ignored: (p) => !fits(partsOf(p)) });
  watcher.on('all', (_event, p) => {
    const parts = partsOf(p);
    if (parts.length === steps.length && fits(parts)) onPlan(parts[dirAt]);
  });
  return watcher;
}

/**
 * Calls `onHit` for a file directly in `dir` that `accept` takes (absolute path). chokidar v4 misses a file whose folder
 * is absent at start (F-01), and `.thadeus/usage` can lack both levels, so this watches `dir`'s grandparent and lets
 * through only the folders on the way down and the accepted files.
 */
function watchFilesIn(dir, accept, onHit) {
  const inner = path.resolve(dir);
  const chain = new Set([inner, path.dirname(inner), path.dirname(path.dirname(inner))]);
  const hit = (p) => path.dirname(p) === inner && accept(p);
  const w = chokidar.watch(path.dirname(path.dirname(inner)), {
    ignoreInitial: true,
    depth: 2,
    ignored: (p) => {
      const abs = path.resolve(p);
      return !chain.has(abs) && !hit(abs);
    }
  });
  w.on('all', (_event, p) => {
    if (hit(path.resolve(p))) onHit();
  });
  return w;
}

/**
 * @param {{intentsDir: string, ledgerFile?: string, usageDir?: string, worktreesDir?: string,
 *          onChange: (c: {dirNames: string[], indexChanged: boolean, costChanged: boolean}) => void,
 *          onError?: (err: Error) => void, debounceMs?: number, maxWaitMs?: number}} opts
 *   ledgerFile: absolute path to usage-ledger.json; a change there sets costChanged (FR5.1)
 *   usageDir: absolute path to `<root>/.thadeus/usage`; a snapshot change there sets costChanged (US-0209 FR5.1),
 *   as does a change to an intent's audit/*.md shard
 *   worktreesDir: absolute path to `<root>/.aidlc/worktrees`; a Unit plan written there reports its intent (US-0507 FR5.1)
 */
export function watchIntents({ intentsDir, ledgerFile, usageDir, worktreesDir, onChange, onError = console.error, debounceMs = 300, maxWaitMs = 800 }) {
  const pending = new Set();
  let indexChanged = false;
  let costChanged = false;
  let timer = null;
  let firstAt = 0;

  const flush = () => {
    timer = null;
    const change = { dirNames: [...pending], indexChanged, costChanged };
    pending.clear();
    indexChanged = false;
    costChanged = false;
    onChange(change);
  };

  const schedule = () => {
    // Debounce, but never hold a change longer than maxWaitMs while an agent writes continuously (NFR1).
    if (!timer) firstAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(flush, Math.min(debounceMs, Math.max(0, firstAt + maxWaitMs - Date.now())));
  };

  const onCost = () => {
    costChanged = true;
    schedule();
  };
  const watchers = [chokidar.watch(intentsDir, { ignoreInitial: true, ignored: isIgnored })];
  if (ledgerFile) {
    const ledger = path.resolve(ledgerFile);
    watchers.push(watchFilesIn(path.dirname(ledger), (p) => p === ledger, onCost));
  }
  // US-0209 FR5.1: a snapshot written here, or pulled from another machine, reloads the cost.
  if (usageDir) watchers.push(watchFilesIn(usageDir, (p) => p.endsWith('.json'), onCost));
  if (worktreesDir) {
    watchers.push(
      watchWorktreePlans(worktreesDir, intentsDir, (dir) => {
        pending.add(dir);
        schedule();
      })
    );
  }

  const [watcher] = watchers;
  watcher.on('all', (_event, p) => {
    const parts = path.relative(intentsDir, p).split(path.sep);
    if (parts[0] === '' || parts[parts.length - 1] === ENGINE_DIR) {
      return;
    } else if (parts.length === 1) {
      // intents.json, active-intent, or a whole intent folder added/removed.
      if (parts[0].startsWith('.')) return;
      indexChanged = true;
    } else if (!parts[0].startsWith('.')) {
      pending.add(parts[0]);
      if (parts.length === 3 && parts[1] === 'audit' && parts[2].endsWith('.md')) costChanged = true; // US-0209 FR5.1
    } else {
      return;
    }
    schedule();
  });
  for (const w of watchers) w.on('error', onError);

  const ready = Promise.all(watchers.map((w) => new Promise((resolve) => w.once('ready', resolve)))).then(() => {});
  return {
    ready,
    close: async () => {
      clearTimeout(timer);
      await Promise.all(watchers.map((w) => w.close()));
    }
  };
}

/**
 * Watches a folder that has no framework yet and calls `onFound` once, when the first space folder appears
 * under aidlc/spaces/ or `.specify/` appears (that is when detectProject finds one, FR4.6, US-1401 BR1.9). Only
 * root, aidlc/, aidlc/spaces/, its direct children and .specify/ are let through, so a large project is not scanned.
 */
export function watchForAidlc({ root, onFound, onError = console.error }) {
  const base = path.resolve(root);
  const spaces = path.join(base, 'aidlc', 'spaces');
  const specify = path.join(base, '.specify'); // US-1401 BR1.9: Spec Kit appearing counts too
  const keep = (p) => {
    const abs = path.resolve(p);
    return abs === base || abs === path.dirname(spaces) || abs === spaces || path.dirname(abs) === spaces || abs === specify;
  };
  let found = false;
  // ignoreInitial is off so a space created between detectProject and this watcher still counts.
  const watcher = chokidar.watch(base, { depth: 2, ignored: (p) => !keep(p) });
  watcher.on('addDir', (p) => {
    const abs = path.resolve(p);
    const isSpace = path.dirname(abs) === spaces && !path.basename(abs).startsWith('.');
    if (found || !(isSpace || abs === specify)) return;
    found = true;
    onFound();
  });
  watcher.on('error', onError);
  const ready = new Promise((resolve) => watcher.once('ready', resolve));
  return { ready, close: () => watcher.close() };
}
