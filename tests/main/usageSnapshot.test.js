// US-0209 FR3.1–FR3.3, NFR2, NFR3: this machine's committed cost snapshot in .thadeus/usage/<host>-<clone-id>.json.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { USAGE_DIR, localClone, readSnapshots, snapshotOf, writeSnapshot } from '../../src/main/usageSnapshot.js';

const ledger = JSON.parse(readFileSync(path.join(process.cwd(), 'tests/fixtures/ledger/usage-ledger.json'), 'utf8'));
const CLONE = { host: 'hosta', cloneId: 'aaaaaaaaaaaa' };
const TMP_BASE = path.join(process.cwd(), 'tests/.tmp');

let root;
beforeEach(async () => {
  await fs.mkdir(TMP_BASE, { recursive: true });
  root = await fs.realpath(await fs.mkdtemp(path.join(TMP_BASE, 'usage-snapshot-')));
});
afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const TOKEN_KEYS = ['cacheCreate1h', 'cacheCreate5m', 'cacheRead', 'input', 'output'];
const keys = (o) => Object.keys(o).sort();
/** Asserts a {usd, tokens} node with only number values. */
function expectNode(n) {
  expect(keys(n)).toEqual(['tokens', 'usd']);
  expect(keys(n.tokens)).toEqual(TOKEN_KEYS);
  expect(Object.values(n.tokens).every(Number.isFinite) && Number.isFinite(n.usd)).toBe(true);
}
const expectMap = (m) => Object.values(m).forEach(expectNode);

describe('snapshotOf (US-0209 FR3.2, FR3.3, NFR2)', () => {
  it('holds every intent of the ledger, the one-time backfill, and no legacy record (FR3.2)', () => {
    const snap = snapshotOf(ledger, CLONE);
    expect(snap).toMatchObject({ schemaVersion: 1, host: 'hosta', cloneId: 'aaaaaaaaaaaa' });
    expect(Object.keys(snap.intents).sort()).toEqual(['01a1c625-50f3-7f83-9755-b096bf4025e6', '01a1d000-0000-7000-8000-000000000003']);
    const epic02 = snap.intents['01a1c625-50f3-7f83-9755-b096bf4025e6'];
    expect(epic02.totals).toEqual({ usd: 4, tokens: { input: 3000, output: 1500, cacheCreate5m: 200, cacheCreate1h: 100, cacheRead: 5000 } });
    expect(epic02.byStage['code-generation'].byModel['sonnet-5-5'].usd).toBe(1.5);
    expect(snapshotOf(null, CLONE).intents).toEqual({});
  });

  it('holds only tokens, USD, names and ids: no sessions, cursors or other ledger keys (FR3.3, NFR2)', () => {
    const withExtras = { ...structuredClone(ledger), cursors: { '/Users/x/transcript.jsonl': 12 } };
    const wf = withExtras.workflows['intent:01a1c625-50f3-7f83-9755-b096bf4025e6'];
    wf.sessions = { 's-1': { transcript: '/Users/x/a.jsonl' } };
    wf.byStage['code-generation'].sessions = { 's-1': {} };
    const snap = snapshotOf(withExtras, CLONE);
    expect(JSON.stringify(snap)).not.toMatch(/sessions|cursors|transcript|\/Users/);
    expect(keys(snap)).toEqual(['cloneId', 'host', 'intents', 'schemaVersion']);
    for (const intent of Object.values(snap.intents)) {
      expect(keys(intent)).toEqual(['byAgent', 'byModel', 'byStage', 'totals']);
      expectNode(intent.totals);
      expectMap(intent.byModel);
      expectMap(intent.byAgent);
      for (const stage of Object.values(intent.byStage)) {
        expect(keys(stage)).toEqual(['byAgent', 'byModel', 'totals']);
        expectNode(stage.totals);
        expectMap(stage.byModel);
        expectMap(stage.byAgent);
      }
    }
  });
});

describe('writeSnapshot and readSnapshots (US-0209 FR3.1, NFR3)', () => {
  it('writes .thadeus/usage/<host>-<clone-id>.json and does not rewrite an unchanged file (FR3.1)', async () => {
    const snap = snapshotOf(ledger, CLONE);
    expect(await writeSnapshot(root, snap)).toBe(true);
    const file = path.join(root, USAGE_DIR, 'hosta-aaaaaaaaaaaa.json');
    expect(JSON.parse(await fs.readFile(file, 'utf8'))).toEqual(snap);
    const { mtimeMs } = await fs.stat(file);
    expect(await writeSnapshot(root, snapshotOf(ledger, CLONE))).toBe(false);
    expect((await fs.stat(file)).mtimeMs).toBe(mtimeMs);
    await expect(writeSnapshot(root, { ...snap, host: '../evil' })).rejects.toThrow();
  });

  it('reads every snapshot and skips a malformed or half-written one (NFR3)', async () => {
    const dir = path.join(root, USAGE_DIR);
    await fs.mkdir(dir, { recursive: true });
    await fs.copyFile(path.join(process.cwd(), 'tests/fixtures/cost/hostb-bbbbbbbbbbbb.json'), path.join(dir, 'hostb-bbbbbbbbbbbb.json'));
    await fs.writeFile(path.join(dir, 'hostc-cccccccccccc.json'), '{"schemaVersion":1,"host":"hostc","cloneId":"cc');
    await fs.writeFile(path.join(dir, 'hostd-dddddddddddd.json'), '{"schemaVersion":1,"host":"hostd"}');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const snaps = await readSnapshots(root);
    expect(snaps.map((s) => [s.host, s.cloneId])).toEqual([['hostb', 'bbbbbbbbbbbb']]);
    expect(console.warn).toHaveBeenCalledTimes(2);
    await fs.rm(dir, { recursive: true });
    expect(await readSnapshots(root)).toEqual([]);
  });
});

describe('localClone (US-0209 FR2.1)', () => {
  it('reads the clone id and takes the host from this machine shard, else from os.hostname()', async () => {
    expect(await localClone(root, [])).toBeNull(); // no aidlc/.aidlc-clone-id
    await fs.mkdir(path.join(root, 'aidlc'), { recursive: true });
    await fs.writeFile(path.join(root, 'aidlc/.aidlc-clone-id'), 'aaaaaaaaaaaa\n');
    expect(await localClone(root, ['hostb-bbbbbbbbbbbb.md', 'my-mac-aaaaaaaaaaaa.md'])).toEqual({ host: 'my-mac', cloneId: 'aaaaaaaaaaaa' });
    vi.spyOn(os, 'hostname').mockReturnValue('Thomas-MacBook.local');
    expect(await localClone(root, ['hostb-bbbbbbbbbbbb.md'])).toEqual({ host: 'thomas-macbook', cloneId: 'aaaaaaaaaaaa' });
  });
});
