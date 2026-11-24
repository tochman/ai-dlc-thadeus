// US-0215: token history for finished intents, rebuilt from Claude Code transcripts when no readings are stored.
// Transcript calls (FR2.1, FR2.2), stage windows (FR2.3), wall-clock (FR4.3), the rebuild and its source (FR1.1, FR2.4,
// FR3, FR5, FR6). Files go in a temp folder made per test, with a fake Claude Code projects folder.
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { callsOfTranscript, loadTokenHistory, readTranscriptCalls, rebuildReadings, stageWindows, wallClockMs } from '../../src/main/tokenHistory.js';

const usageLine = (id, at, usage, extra = {}) =>
  JSON.stringify({ type: 'assistant', timestamp: new Date(at).toISOString(), message: { id, model: 'claude-opus-5-5', usage }, ...extra });
const USAGE = {
  input_tokens: 2,
  cache_creation_input_tokens: 300,
  cache_read_input_tokens: 1000,
  output_tokens: 50,
  cache_creation: { ephemeral_1h_input_tokens: 200, ephemeral_5m_input_tokens: 100 }
};
const T0 = Date.parse('2026-11-13T06:00:00.000Z');

let tmp;
let projectsDir;
beforeEach(async () => {
  tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'token-history-'));
  projectsDir = path.join(tmp, 'claude-projects');
  await fs.mkdir(path.join(projectsDir, 'proj'), { recursive: true });
});
afterEach(() => fs.rm(tmp, { recursive: true, force: true }));

describe('callsOfTranscript (FR2.2)', () => {
  it('counts each message id once, with its last line, and splits the kinds', () => {
    const lines = [
      usageLine('msg_1', T0, { ...USAGE, output_tokens: 10 }),
      usageLine('msg_1', T0 + 100, USAGE), // the same call, one line per content block
      usageLine('msg_2', T0 + 60_000, { input_tokens: 5, output_tokens: 7, cache_read_input_tokens: 9, cache_creation_input_tokens: 0 })
    ];
    expect(callsOfTranscript(lines)).toEqual([
      { id: 'msg_1', model: 'claude-opus-5-5', at: T0 + 100, input: 2, output: 50, cacheWrite5m: 100, cacheWrite1h: 200, cacheRead: 1000 },
      { id: 'msg_2', model: 'claude-opus-5-5', at: T0 + 60_000, input: 5, output: 7, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 9 }
    ]);
  });

  it('skips a broken line, a user line and a line without a timestamp', () => {
    const lines = [
      '{"type":"assistant","timestamp":"2026-11-13T06:0', // half written
      JSON.stringify({ type: 'user', timestamp: new Date(T0).toISOString(), message: { usage: USAGE } }),
      JSON.stringify({ type: 'assistant', message: { id: 'msg_x', usage: USAGE } }),
      '',
      usageLine('msg_3', T0, USAGE)
    ];
    expect(callsOfTranscript(lines)).toHaveLength(1);
  });

  it('puts a cache write without its 5 m / 1 h split into 5 m', () => {
    const [call] = callsOfTranscript([usageLine('msg_4', T0, { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 40 })]);
    expect([call.cacheWrite5m, call.cacheWrite1h, call.cacheRead]).toEqual([40, 0, 0]);
  });

  it('US-1409 BR1.2, BR4.1: keeps each call message id and model; a line without them gives null', () => {
    const lines = [usageLine('msg_5', T0, USAGE), JSON.stringify({ type: 'assistant', timestamp: new Date(T0).toISOString(), message: { usage: USAGE } })];
    expect(callsOfTranscript(lines).map((c) => [c.id, c.model])).toEqual([
      ['msg_5', 'claude-opus-5-5'],
      [null, null]
    ]);
  });
});

describe('readTranscriptCalls (FR2.1)', () => {
  it('reads a transcript inside the projects folder line by line', async () => {
    const file = path.join(projectsDir, 'proj', 'a.jsonl');
    await fs.writeFile(file, [usageLine('msg_1', T0, USAGE), usageLine('msg_2', T0 + 1000, USAGE)].join('\n') + '\n');
    expect(await readTranscriptCalls(file, projectsDir)).toHaveLength(2);
  });

  it('gives null outside the projects folder and for a missing file', async () => {
    const outside = path.join(tmp, 'outside.jsonl');
    await fs.writeFile(outside, usageLine('msg_1', T0, USAGE));
    expect(await readTranscriptCalls(outside, projectsDir)).toBeNull();
    expect(await readTranscriptCalls(path.join(projectsDir, 'proj', '..', '..', 'outside.jsonl'), projectsDir)).toBeNull();
    expect(await readTranscriptCalls(path.join(projectsDir, 'proj', 'gone.jsonl'), projectsDir)).toBeNull();
    expect(await readTranscriptCalls('relative.jsonl', projectsDir)).toBeNull();
  });
});

const ev = (event, timeMs) => ({ event, timeMs, fields: {} });

describe('stageWindows (FR2.3)', () => {
  it('opens on a stage start and closes on its completion, skip or jump', () => {
    const events = [
      ev('WORKFLOW_STARTED', 0),
      ev('STAGE_STARTED', 10),
      ev('STAGE_COMPLETED', 20),
      ev('STAGE_STARTED', 30),
      ev('STAGE_SKIPPED', 40),
      ev('STAGE_STARTED', 50),
      ev('STAGE_JUMPED', 60)
    ];
    expect(stageWindows(events)).toEqual([
      { start: 10, end: 20 },
      { start: 30, end: 40 },
      { start: 50, end: 60 }
    ]);
  });

  it('a park closes the window and an unpark opens a new one', () => {
    const events = [
      ev('STAGE_STARTED', 10),
      ev('WORKFLOW_PARKED', 20),
      ev('WORKFLOW_UNPARKED', 100),
      ev('STAGE_COMPLETED', 120),
      ev('WORKFLOW_COMPLETED', 130)
    ];
    expect(stageWindows(events)).toEqual([
      { start: 10, end: 20 },
      { start: 100, end: 120 }
    ]);
  });

  it('the next stage start closes a window left open; one still open at the end runs to the last event', () => {
    const events = [ev('STAGE_STARTED', 10), ev('STAGE_STARTED', 30), ev('STAGE_AWAITING_APPROVAL', 45)];
    expect(stageWindows(events)).toEqual([
      { start: 10, end: 30 },
      { start: 30, end: 45 }
    ]);
  });

  it('an audit without stage events gives one first-to-last window; no events give none', () => {
    expect(stageWindows([ev('WORKFLOW_STARTED', 5), ev('SESSION_STARTED', 7), ev('WORKFLOW_COMPLETED', 90)])).toEqual([{ start: 5, end: 90 }]);
    expect(stageWindows([])).toEqual([]);
  });
});

describe('wallClockMs (FR4.3)', () => {
  it('is workflow start to completion, and null when the workflow has not completed', () => {
    expect(wallClockMs([ev('WORKFLOW_STARTED', 1000), ev('STAGE_STARTED', 2000), ev('WORKFLOW_COMPLETED', 61_000)])).toBe(60_000);
    expect(wallClockMs([ev('WORKFLOW_STARTED', 1000), ev('STAGE_STARTED', 2000)])).toBeNull();
    expect(wallClockMs([])).toBeNull();
  });
});

const call = (at, n) => ({ at, input: n, output: 2 * n, cacheWrite5m: 3 * n, cacheWrite1h: 4 * n, cacheRead: 5 * n });

describe('rebuildReadings (FR2.3, FR2.4)', () => {
  it('drops calls outside every window and sums the rest into cumulative readings in the stored shape', () => {
    const windows = [
      { start: 100, end: 200 },
      { start: 300, end: 400 }
    ];
    const calls = [call(350, 3), call(50, 100), call(150, 1), call(250, 100), call(200, 2)];
    expect(rebuildReadings(calls, windows)).toEqual([
      { at: 150, input: 1, output: 2, cacheWrite5m: 3, cacheWrite1h: 4, cacheRead: 5, usd: null },
      { at: 200, input: 3, output: 6, cacheWrite5m: 9, cacheWrite1h: 12, cacheRead: 15, usd: null },
      { at: 350, input: 6, output: 12, cacheWrite5m: 18, cacheWrite1h: 24, cacheRead: 30, usd: null }
    ]);
    expect(rebuildReadings(calls, [])).toEqual([]);
  });

  it('merges calls at the same millisecond into one reading', () => {
    expect(rebuildReadings([call(150, 1), call(150, 2)], [{ start: 0, end: 1000 }])).toEqual([
      { at: 150, input: 3, output: 6, cacheWrite5m: 9, cacheWrite1h: 12, cacheRead: 15, usd: null }
    ]);
  });
});

describe('loadTokenHistory (FR1.1, FR3, FR5, FR6)', () => {
  const UUID = 'u-1';
  const DIR = '261113-done';
  const EVENTS = [ev('WORKFLOW_STARTED', T0), ev('STAGE_STARTED', T0 + 1000), ev('STAGE_COMPLETED', T0 + 600_000), ev('WORKFLOW_COMPLETED', T0 + 700_000)];
  const ledgerOf = (files, tokens) => ({
    workflows: {
      [`intent:${UUID}`]: {
        sessions: Object.fromEntries(files.map((f) => [`transcript:${f}`, { totals: {} }])),
        totals: { tokens }
      }
    }
  });
  const TOKENS_OF = (calls) => calls * (2 + 50 + 300 + 1000); // USAGE per call
  async function transcript(name, lines) {
    const file = path.join(projectsDir, 'proj', name);
    await fs.writeFile(file, lines.join('\n') + '\n');
    return file;
  }
  async function projectRoot() {
    const root = path.join(tmp, 'project');
    await fs.mkdir(path.join(root, 'aidlc', 'spaces'), { recursive: true });
    return root;
  }
  const listAll = async (root) => (await fs.readdir(root, { recursive: true })).sort();

  it('keeps recorded readings as the source even when there are few (FR1.1)', async () => {
    const root = await projectRoot();
    const stored = [{ at: 1, input: 1, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, usd: 0.1 }];
    const file = await transcript('a.jsonl', [usageLine('m1', T0 + 2000, USAGE)]);
    const res = await loadTokenHistory({
      root,
      dirName: DIR,
      uuid: UUID,
      ledger: ledgerOf([file], {}),
      events: EVENTS,
      projectsDir,
      readStored: async () => stored
    });
    expect(res).toEqual({ source: 'recorded', readings: stored, wallMs: 700_000, gap: null });
  });

  it('rebuilds from the transcripts when none are stored, and serves the second call from memory (FR2, FR6)', async () => {
    const root = await projectRoot();
    const file = await transcript('b.jsonl', [usageLine('m1', T0 + 2000, USAGE), usageLine('m2', T0 + 62_000, USAGE)]);
    const args = {
      root,
      dirName: DIR,
      uuid: UUID,
      ledger: ledgerOf([file], { input: 4, output: 100, cacheCreate5m: 200, cacheCreate1h: 400, cacheRead: 2000 }),
      events: EVENTS,
      projectsDir
    };
    const first = await loadTokenHistory(args);
    expect(first.source).toBe('rebuilt');
    expect(first.readings.map((r) => r.at)).toEqual([T0 + 2000, T0 + 62_000]);
    expect(first.readings.at(-1)).toMatchObject({ input: 4, output: 100, cacheWrite5m: 200, cacheWrite1h: 400, cacheRead: 2000, usd: null });
    expect(first.gap).toBeNull(); // the totals agree with the ledger
    await fs.rm(file);
    expect(await loadTokenHistory(args)).toBe(first);
  });

  it('gives none when no transcript is readable, with the missing sessions in the gap (FR3, FR5)', async () => {
    const root = await projectRoot();
    const gone = path.join(projectsDir, 'proj', 'gone.jsonl');
    const res = await loadTokenHistory({
      root,
      dirName: DIR,
      uuid: UUID,
      ledger: ledgerOf([gone, '/elsewhere/x.jsonl'], { input: 10 }),
      events: EVENTS,
      projectsDir
    });
    expect(res).toEqual({ source: 'none', readings: [], wallMs: 700_000, gap: { ledgerTokens: 10, rebuiltTokens: 0, missingSessions: 2, outsideTokens: 0 } });
    const noEntry = await loadTokenHistory({ root, dirName: 'other', uuid: null, ledger: null, events: [], projectsDir });
    expect(noEntry).toEqual({ source: 'none', readings: [], wallMs: null, gap: null });
  });

  it('names the tokens outside the stage windows and the missing sessions when the totals differ (FR5)', async () => {
    const root = await projectRoot();
    const file = await transcript('c.jsonl', [usageLine('m1', T0 + 2000, USAGE), usageLine('m2', T0 + 650_000, USAGE)]); // m2 after the stage
    const gone = path.join(projectsDir, 'proj', 'gone.jsonl');
    const res = await loadTokenHistory({ root, dirName: DIR, uuid: UUID, ledger: ledgerOf([file, gone], { input: 5000 }), events: EVENTS, projectsDir });
    expect(res.source).toBe('rebuilt');
    expect(res.gap).toEqual({ ledgerTokens: 5000, rebuiltTokens: TOKENS_OF(1), missingSessions: 1, outsideTokens: TOKENS_OF(1) });
  });

  it('writes nothing in the project (FR6)', async () => {
    const root = await projectRoot();
    const file = await transcript('d.jsonl', [usageLine('m1', T0 + 2000, USAGE)]);
    const before = await listAll(root);
    await loadTokenHistory({ root, dirName: DIR, uuid: UUID, ledger: ledgerOf([file], {}), events: EVENTS, projectsDir });
    expect(await listAll(root)).toEqual(before);
  });
});
