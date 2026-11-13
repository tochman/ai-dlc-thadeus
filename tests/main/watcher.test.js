import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { watchIntents } from '../../src/main/watcher.js';

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
});

afterEach(async () => {
  await watcher?.close();
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('watchIntents', () => {
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
    expect(calls).toEqual([{ dirNames: [DIR], indexChanged: false }]);

    await fs.writeFile(path.join(INTENTS, DIR, '.aidlc-engine', 'active-directive.json'), '{"kind":"run-stage"}');
    await wait(600);
    expect(calls[1]).toEqual({ dirNames: [DIR], indexChanged: false });
  });
});
