import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { isWatchedFile, watchFiles, watchForAidlc, watchIntents } from '../../src/main/watcher.js';
import { CONFIG_WATCH_PATHS } from '../../src/main/aidlcConfig.js';
import { featureWatchPaths } from '../../src/main/features.js';

const SOURCE = path.resolve(__dirname, '../fixtures/project/aidlc/spaces/default/intents/261110-epic02-finish');
const TMP = path.resolve(__dirname, '../.tmp/watcher');
const INTENTS = path.join(TMP, 'intents');
const DIR = '261110-epic02-finish';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let watcher;

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.cp(SOURCE, path.join(INTENTS, DIR), { recursive: true });
  await fs.mkdir(path.join(INTENTS, DIR, '.aidlc-engine'), { recursive: true });
  await fs.mkdir(path.join(TMP, '.aidlc-sessions'), { recursive: true });
  await fs.writeFile(path.join(TMP, '.aidlc-sessions', 'usage-ledger.json'), '{"schemaVersion":3}');
  // macOS FSEvents can deliver the copy above after the watcher is ready; let it settle first.
  await wait(300);
});

afterEach(async () => {
  await watcher?.close();
  await fs.rm(TMP, { recursive: true, force: true });
});

// US-0010: the debounce waits are wall-clock; retry up to twice under a loaded suite.
describe('watchIntents', { retry: 2 }, () => {
  it('debounces writes into one change for that intent and ignores .aidlc-engine/ (FR7.1, FR7.2)', async () => {
    const calls = [];
    watcher = watchIntents({ intentsDir: INTENTS, onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;

    await fs.writeFile(path.join(INTENTS, DIR, '.aidlc-engine', 'state-writes.json'), '{}');
    await wait(400);
    expect(calls).toEqual([]);

    const state = path.join(INTENTS, DIR, 'aidlc-state.md');
    await fs.appendFile(state, '\n- [x] extra — EXECUTE\n');
    await wait(30);
    await fs.appendFile(state, '\n');
    await wait(600);
    expect(calls).toEqual([{ dirNames: [DIR], indexChanged: false, costChanged: false }]);

    await fs.writeFile(path.join(INTENTS, DIR, '.aidlc-engine', 'active-directive.json'), '{"kind":"run-stage"}');
    await wait(600);
    expect(calls[1]).toEqual({ dirNames: [DIR], indexChanged: false, costChanged: false });
  });

  it('reports a usage-ledger.json write as costChanged in the same debounced event (FR5.1)', async () => {
    const ledgerFile = path.join(TMP, '.aidlc-sessions', 'usage-ledger.json');
    const calls = [];
    watcher = watchIntents({ intentsDir: INTENTS, ledgerFile, onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;

    await fs.writeFile(ledgerFile, '{"schemaVersion":3,"totals":{}}');
    await wait(600);
    expect(calls).toEqual([{ dirNames: [], indexChanged: false, costChanged: true }]);
  });

  it('reports a ledger created after watching started, folder included, as costChanged (F-01, FR5.1)', async () => {
    const sessionsDir = path.join(TMP, ['.aidlc', 'sessions'].join('-'));
    const ledgerFile = path.join(sessionsDir, 'usage-ledger.json');
    await fs.rm(sessionsDir, { recursive: true, force: true });
    await wait(300);
    const calls = [];
    watcher = watchIntents({ intentsDir: INTENTS, ledgerFile, onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;

    await fs.mkdir(sessionsDir);
    await fs.writeFile(path.join(sessionsDir, 'other.json'), '{}');
    await fs.writeFile(ledgerFile, '{"schemaVersion":3,"totals":{}}');
    await wait(600);
    expect(calls).toEqual([{ dirNames: [], indexChanged: false, costChanged: true }]);
  });

  it("reports a Unit plan written in a worktree created after watching started as that intent's change (US-0507 FR5.1, NFR3)", async () => {
    // The project root is TMP: intents sit at TMP/aidlc/spaces/default/intents, worktrees at TMP/.aidlc/worktrees.
    const intentsDir = path.join(TMP, 'aidlc', 'spaces', 'default', 'intents');
    await fs.mkdir(path.join(intentsDir, DIR), { recursive: true });
    await wait(300);
    const calls = [];
    watcher = watchIntents({ intentsDir, worktreesDir: path.join(TMP, '.aidlc', 'worktrees'), onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;

    const tree = path.join(TMP, '.aidlc', 'worktrees', 'bolt-2a09832c_u1-a');
    await fs.mkdir(path.join(tree, 'src'), { recursive: true });
    await fs.writeFile(path.join(tree, 'src', 'x.js'), 'ignored');
    await wait(400);
    expect(calls).toEqual([]);

    const planDir = path.join(tree, 'aidlc', 'spaces', 'default', 'intents', DIR, 'construction', 'u1-a', 'code-generation');
    await fs.mkdir(planDir, { recursive: true });
    await fs.writeFile(path.join(planDir, 'code-generation-plan.md'), '- [x] Step 1\n- [ ] Step 2\n');
    await wait(900);
    expect(calls).toEqual([{ dirNames: [DIR], indexChanged: false, costChanged: false }]);
  });

  it('reports an audit shard write as that intent and costChanged (US-0209 FR5.1)', async () => {
    const calls = [];
    watcher = watchIntents({ intentsDir: INTENTS, onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;
    await fs.mkdir(path.join(INTENTS, DIR, 'audit'), { recursive: true });
    await fs.writeFile(path.join(INTENTS, DIR, 'audit', 'hostb-bbbbbbbbbbbb.md'), '## Stage Completion\n');
    await wait(900);
    expect(calls.at(-1)).toEqual({ dirNames: [DIR], indexChanged: false, costChanged: true });
  });

  it('reports a snapshot in .thadeus/usage/, the folder created after watching started, as costChanged (US-0209 FR5.1)', async () => {
    const usageDir = path.join(TMP, '.thadeus', 'usage');
    const calls = [];
    watcher = watchIntents({ intentsDir: INTENTS, usageDir, onChange: (c) => calls.push(c), debounceMs: 150 });
    await watcher.ready;
    await fs.mkdir(usageDir, { recursive: true });
    await fs.writeFile(path.join(usageDir, 'notes.txt'), 'ignored');
    await wait(400);
    expect(calls).toEqual([]);
    await fs.writeFile(path.join(usageDir, 'hostb-bbbbbbbbbbbb.json'), '{}');
    await wait(900);
    expect(calls).toEqual([{ dirNames: [], indexChanged: false, costChanged: true }]);
  });
});

describe('watchFiles', { retry: 2 }, () => {
  it('reports .md changes in the watched file and folder, also when the folder appears later (EPIC-06 FR2.7)', async () => {
    const root = path.join(TMP, 'docs-project');
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await wait(300); // same FSEvents settling as above
    let changes = 0;
    watcher = watchFiles({ root, paths: ['docs/FEATURES.md', 'docs/features'], onChange: () => changes++, debounceMs: 150 });
    await watcher.ready;

    await fs.writeFile(path.join(root, 'src', 'x.md'), 'ignored');
    await wait(400);
    expect(changes).toBe(0);

    await fs.mkdir(path.join(root, 'docs', 'features'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs', 'FEATURES.md'), '# F');
    await fs.writeFile(path.join(root, 'docs', 'features', 'epic-01-a.md'), '# EPIC-01: A');
    await fs.writeFile(path.join(root, 'docs', 'features', 'notes.txt'), 'ignored');
    await wait(900);
    expect(changes).toBe(1);
  });

  it('reports a .json file target, created after watching started, and ignores other .json files (US-0901 FR6.1)', async () => {
    const root = path.join(TMP, 'config-project');
    await fs.mkdir(root, { recursive: true });
    await wait(300); // same FSEvents settling as above
    let changes = 0;
    watcher = watchFiles({ root, paths: ['aidlc.settings.json', 'aidlc/scopes'], onChange: () => changes++, debounceMs: 150 });
    await watcher.ready;

    await fs.writeFile(path.join(root, 'package.json'), '{}');
    await wait(400);
    expect(changes).toBe(0);

    await fs.writeFile(path.join(root, 'aidlc.settings.json'), '{"flags":{}}');
    await wait(600);
    expect(changes).toBe(1);
  });

  it('reports the extensionless aidlc/.aidlc-subagent-inflight file and ignores its siblings', async () => {
    const root = path.join(TMP, 'inflight-project');
    await fs.mkdir(path.join(root, 'aidlc'), { recursive: true });
    await wait(300); // same FSEvents settling as above
    let changes = 0;
    watcher = watchFiles({ root, paths: ['aidlc/.aidlc-subagent-inflight'], onChange: () => changes++, debounceMs: 150 });
    await watcher.ready;

    await fs.writeFile(path.join(root, 'aidlc', '.aidlc-other'), 'x');
    await wait(400);
    expect(changes).toBe(0);

    await fs.writeFile(path.join(root, 'aidlc', '.aidlc-subagent-inflight'), '{"version":1,"entries":[]}');
    await wait(600);
    expect(changes).toBe(1);
  });

  // US-0506 u4 PD32: the installer watches dialog.sh and the plugin as files.
  it('treats .sh and .js targets as files and reports a change to each', async () => {
    expect(isWatchedFile('.thadeus/hooks/dialog.sh')).toBe(true);
    expect(isWatchedFile('.opencode/plugins/thadeus-dialog.js')).toBe(true);
    const root = path.join(TMP, 'hooks-project');
    await fs.mkdir(root, { recursive: true });
    await wait(300); // same FSEvents settling as above
    let changes = 0;
    watcher = watchFiles({ root, paths: ['.thadeus/hooks/dialog.sh', '.opencode/plugins/thadeus-dialog.js'], onChange: () => changes++, debounceMs: 150 });
    await watcher.ready;
    await fs.mkdir(path.join(root, '.thadeus/hooks'), { recursive: true });
    await fs.writeFile(path.join(root, '.thadeus/hooks/dialog.sh'), '#!/bin/sh\n');
    await wait(700);
    expect(changes).toBe(1);
    await fs.mkdir(path.join(root, '.opencode/plugins'), { recursive: true });
    await fs.writeFile(path.join(root, '.opencode/plugins/thadeus-dialog.js'), 'export default {};\n');
    await wait(700);
    expect(changes).toBe(2);
  });

  it("keeps every existing call site's targets as file or folder", () => {
    const before = (t) => /\.(md|json)$/i.test(t) || path.posix.basename(t).startsWith('.');
    const targets = [...CONFIG_WATCH_PATHS, ...featureWatchPaths('docs/FEATURES.md', { epics: [{ file: 'docs/features/epic-01.md' }] }), 'docs/features'];
    expect(targets.length).toBeGreaterThan(4);
    for (const target of targets) expect(isWatchedFile(target), target).toBe(before(target));
  });
});

describe('watchForAidlc', { retry: 2 }, () => {
  it('calls onFound once when a space appears under aidlc/spaces/, ignoring other folders (FR4.6)', async () => {
    const root = path.join(TMP, 'plain');
    await fs.mkdir(path.join(root, 'src'), { recursive: true });
    await wait(300); // same FSEvents settling as above
    let found = 0;
    watcher = watchForAidlc({ root, onFound: () => found++ });
    await watcher.ready;

    await fs.mkdir(path.join(root, 'src', 'spaces'), { recursive: true });
    await fs.mkdir(path.join(root, 'aidlc'));
    await wait(300);
    expect(found).toBe(0);

    await fs.mkdir(path.join(root, 'aidlc', 'spaces', 'default', 'intents'), { recursive: true });
    await fs.mkdir(path.join(root, 'aidlc', 'spaces', 'other'));
    await wait(600);
    expect(found).toBe(1);
  });
});
