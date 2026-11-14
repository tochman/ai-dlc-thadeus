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
      timer = setTimeout(() => {
        timer = null;
        flush();
      }, Math.min(debounceMs, Math.max(0, firstAt + maxWaitMs - Date.now())));
    },
    cancel: () => clearTimeout(timer)
  };
}

/**
 * Watches a few root-relative paths: files (ending in .md or .json) and folders (their direct .md files), and
 * calls `onChange()` debounced (EPIC-06 FR2.7, US-0901 FR6.1). The root itself is watched with everything else ignored, so paths
 * whose folder does not exist yet are still seen once they appear (chokidar v4 misses those otherwise, F-01).
 * @param {{root: string, paths: string[], onChange: () => void, onError?: (err: Error) => void, debounceMs?: number, maxWaitMs?: number}} opts
 */
export function watchFiles({ root, paths, onChange, onError = console.error, debounceMs = 300, maxWaitMs = 800 }) {
  const base = path.resolve(root);
  const targets = paths.map((p) => path.posix.normalize(p.split(path.sep).join('/')));
  const relOf = (p) => path.relative(base, path.resolve(p)).split(path.sep).join('/');
  const isFile = (t) => /\.(md|json)$/i.test(t);
  const matches = (rel) =>
    targets.some((t) => (isFile(t) ? rel === t : path.posix.dirname(rel) === t && rel.toLowerCase().endsWith('.md')));
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

/**
 * @param {{intentsDir: string, ledgerFile?: string,
 *          onChange: (c: {dirNames: string[], indexChanged: boolean, costChanged: boolean}) => void,
 *          onError?: (err: Error) => void, debounceMs?: number, maxWaitMs?: number}} opts
 *   ledgerFile: absolute path to usage-ledger.json; a change there sets costChanged (FR5.1)
 */
export function watchIntents({ intentsDir, ledgerFile, onChange, onError = console.error, debounceMs = 300, maxWaitMs = 800 }) {
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

  const watchers = [chokidar.watch(intentsDir, { ignoreInitial: true, ignored: isIgnored })];
  if (ledgerFile) {
    // chokidar v4 misses a file whose folder is absent at start (F-01), so watch the ledger's grandparent
    // (aidlc/) and let through only that folder, .aidlc-sessions/ and the ledger itself.
    const ledger = path.resolve(ledgerFile);
    const sessionsDir = path.dirname(ledger);
    const keep = new Set([path.dirname(sessionsDir), sessionsDir, ledger]);
    const ledgerWatcher = chokidar.watch(path.dirname(sessionsDir), {
      ignoreInitial: true,
      depth: 1,
      ignored: (p) => !keep.has(path.resolve(p))
    });
    ledgerWatcher.on('all', (_event, p) => {
      if (path.resolve(p) !== ledger) return;
      costChanged = true;
      schedule();
    });
    watchers.push(ledgerWatcher);
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
 * Watches a folder that is not an AI-DLC project yet and calls `onFound` once, when the first space
 * folder appears under aidlc/spaces/ (that is when detectProject accepts it, FR4.6). Only root, aidlc/,
 * aidlc/spaces/ and its direct children are let through, so a large project is not scanned.
 */
export function watchForAidlc({ root, onFound, onError = console.error }) {
  const base = path.resolve(root);
  const spaces = path.join(base, 'aidlc', 'spaces');
  const keep = (p) => {
    const abs = path.resolve(p);
    return abs === base || abs === path.dirname(spaces) || abs === spaces || path.dirname(abs) === spaces;
  };
  let found = false;
  // ignoreInitial is off so a space created between detectProject and this watcher still counts.
  const watcher = chokidar.watch(base, { depth: 2, ignored: (p) => !keep(p) });
  watcher.on('addDir', (p) => {
    const abs = path.resolve(p);
    if (found || path.dirname(abs) !== spaces || path.basename(abs).startsWith('.')) return;
    found = true;
    onFound();
  });
  watcher.on('error', onError);
  const ready = new Promise((resolve) => watcher.once('ready', resolve));
  return { ready, close: () => watcher.close() };
}
