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

/**
 * @param {{intentsDir: string, onChange: (c: {dirNames: string[], indexChanged: boolean}) => void,
 *          onError?: (err: Error) => void, debounceMs?: number, maxWaitMs?: number}} opts
 */
export function watchIntents({ intentsDir, onChange, onError = console.error, debounceMs = 300, maxWaitMs = 800 }) {
  const pending = new Set();
  let indexChanged = false;
  let timer = null;
  let firstAt = 0;

  const flush = () => {
    timer = null;
    const change = { dirNames: [...pending], indexChanged };
    pending.clear();
    indexChanged = false;
    onChange(change);
  };

  const watcher = chokidar.watch(intentsDir, { ignoreInitial: true, ignored: isIgnored });
  watcher.on('all', (_event, p) => {
    const parts = path.relative(intentsDir, p).split(path.sep);
    if (parts[0] === '' || parts[parts.length - 1] === ENGINE_DIR) return;
    if (parts.length === 1) {
      // intents.json, active-intent, or a whole intent folder added/removed.
      if (parts[0].startsWith('.')) return;
      indexChanged = true;
    } else if (!parts[0].startsWith('.')) {
      pending.add(parts[0]);
    } else {
      return;
    }
    // Debounce, but never hold a change longer than maxWaitMs while an agent writes continuously (NFR1).
    if (!timer) firstAt = Date.now();
    clearTimeout(timer);
    timer = setTimeout(flush, Math.min(debounceMs, Math.max(0, firstAt + maxWaitMs - Date.now())));
  });
  watcher.on('error', onError);

  const ready = new Promise((resolve) => watcher.once('ready', resolve));
  return {
    ready,
    close: async () => {
      clearTimeout(timer);
      await watcher.close();
    }
  };
}
