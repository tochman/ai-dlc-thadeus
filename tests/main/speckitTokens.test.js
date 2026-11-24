// US-1409: the Spec Kit token log per feature, in real temp folders: the session cursor in user data (NFR3.5), the
// credit of a Claude Code or opencode turn (BR1.2–BR4.1, NFR3.2–NFR3.6, NFR6.1, NFR6.2) and the write boundary (NFR3.1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createSpeckitTokens, readCursor, writeCursor } from '../../src/main/speckitTokens.js';
import { writeAtomic } from '../../src/main/fileWrite.js';
import { spyWrites } from './fsWriteSpy.js';

const DAY = 24 * 3600 * 1000;
const T0 = Date.parse('2026-11-24T08:00:00.000Z');
const RATES = { 'opus-5-5': { input: 5, output: 25, cacheWrite5m: 6.25, cacheWrite1h: 10, cacheRead: 0.5 } };
let tmp, root, userData, projectsDir, transcript, clock;
beforeEach(async () => {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-tokens-')));
  root = path.join(tmp, 'project');
  userData = path.join(tmp, 'userData');
  projectsDir = path.join(tmp, 'claude-projects');
  transcript = path.join(projectsDir, 'p', 'session.jsonl');
  clock = T0 + 3600_000;
  await fs.mkdir(path.dirname(transcript), { recursive: true });
  await fs.mkdir(root, { recursive: true });
});
afterEach(async () => {
  await fs.rm(tmp, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const counts = (n) => ({ input: n, output: n, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: n });

describe('the session cursor (US-1409 NFR3.5, BR3.2)', () => {
  it('reads a missing cursor as empty, and keeps one file per project in user data', async () => {
    expect(await readCursor(userData, root)).toEqual({ sessions: {} });
    await writeCursor(userData, root, { sessions: { 'claude:a': { seenAt: 1000, calls: { msg_1: counts(1) } } } }, { now: 1000 });
    await writeCursor(userData, path.join(tmp, 'other'), { sessions: { 'claude:b': { seenAt: 1000, calls: {} } } }, { now: 1000 });
    expect(Object.keys((await readCursor(userData, root)).sessions)).toEqual(['claude:a']);
    expect(await fs.readdir(path.join(userData, 'speckit-tokens'))).toHaveLength(2);
    await expect(fs.access(path.join(root, '.thadeus'))).rejects.toThrow(); // nothing in the project
  });

  it('writes message ids and counts only, never text', async () => {
    const session = { seenAt: 5, calls: { msg_1: { ...counts(2), text: 'hello', model: 'claude-opus-5-5' } }, total: { ...counts(3), usd: 0.5, note: 'x' } };
    await writeCursor(userData, root, { sessions: { 'claude:a': session } }, { now: 5 });
    expect((await readCursor(userData, root)).sessions['claude:a']).toEqual({ seenAt: 5, calls: { msg_1: counts(2) }, total: { ...counts(3), usd: 0.5 } });
  });

  it('drops sessions not seen for 30 days when it writes', async () => {
    const now = 100 * DAY;
    const sessions = { old: { seenAt: now - 31 * DAY, calls: {} }, fresh: { seenAt: now - 29 * DAY, calls: {} } };
    await writeCursor(userData, root, { sessions }, { now });
    expect(Object.keys((await readCursor(userData, root)).sessions)).toEqual(['fresh']);
  });
});

// --- fixtures for a turn ---------------------------------------------------------------------------------------------
const iso = (at) => new Date(at).toISOString();
const prompt = (at) => JSON.stringify({ type: 'user', timestamp: iso(at), message: { role: 'user', content: 'do it' } });
const toolResult = (at) => JSON.stringify({ type: 'user', timestamp: iso(at), message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } });
const call = (id, at, { input = 10, output = 10, read = 0, model = 'claude-opus-5-5' } = {}) =>
  JSON.stringify({
    type: 'assistant',
    timestamp: iso(at),
    message: { id, model, usage: { input_tokens: input, output_tokens: output, cache_read_input_tokens: read } }
  });
const writeTranscript = (lines, file = transcript) => fs.writeFile(file, lines.join('\n') + '\n');

async function feature(dir) {
  await fs.mkdir(path.join(root, 'specs', dir), { recursive: true });
  await fs.mkdir(path.join(root, '.specify'), { recursive: true });
  await fs.writeFile(path.join(root, '.specify/feature.json'), JSON.stringify({ feature_directory: `specs/${dir}` }));
}
const bucket = async (key) => {
  try {
    return JSON.parse(await fs.readFile(path.join(root, '.thadeus/tokens', `${key}.json`), 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
};
const tokens = (opts = {}) => createSpeckitTokens({ userDataDir: userData, projectsDir, ratesOf: async () => RATES, now: () => clock, ...opts });
const claudeTurn = (t, file = transcript) => t.onTurn({ root, harness: 'claude', sessionId: 's1', transcriptPath: file });
const opencodeTurn = (t, usage) => t.onTurn({ root, harness: 'opencode', sessionId: 'oc1', usage });
const ocUsage = (input, cost) => ({ tokens: { input, output: 10, reasoning: 5, cache: { read: 1000, write: 50 } }, cost });

describe('a Claude Code turn (US-1409 BR1.2, BR2.2, NFR6.2)', () => {
  it('credits only the calls the cursor has not counted, and a grown call by its increase', async () => {
    await feature('001-login');
    const t = tokens();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await claudeTurn(t);
    expect(await bucket('speckit-001-login')).toEqual([
      { at: clock, input: 10, output: 10, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0, usd: expect.closeTo(0.0003, 10) }
    ]);

    clock += 60_000;
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1, { output: 15 }), prompt(T0 + 50), call('msg_2', T0 + 51, { input: 5, output: 1 })]);
    await claudeTurn(t);
    const list = await bucket('speckit-001-login');
    expect(list).toHaveLength(2);
    expect(list[1]).toMatchObject({ at: clock, input: 15, output: 16 });

    clock += 60_000;
    await claudeTurn(t); // nothing new: the file is left as it was
    expect(await bucket('speckit-001-login')).toEqual(list);
  });

  it('at first sight puts the earlier calls in speckit-project and the turn since the last prompt in the feature (NFR3.6)', async () => {
    await feature('001-login');
    await writeTranscript([
      prompt(T0),
      call('msg_a', T0 + 1, { input: 1 }),
      toolResult(T0 + 2), // a tool result is not a new prompt
      call('msg_b', T0 + 3, { input: 2 }),
      call('msg_c', T0 + 4, { input: 4 }),
      prompt(T0 + 10),
      call('msg_d', T0 + 11, { input: 100 })
    ]);
    await claudeTurn(tokens());
    expect((await bucket('speckit-project')).at(-1).input).toBe(7);
    expect((await bucket('speckit-001-login')).at(-1).input).toBe(100);
  });

  it.each([
    ['outside ~/.claude/projects', () => path.join(tmp, 'elsewhere', 'x.jsonl')],
    ['with ..', () => `${projectsDir}/p/../../elsewhere/x.jsonl`], // path.join would fold the .. away
    ['a link out', () => path.join(projectsDir, 'p', 'link.jsonl')]
  ])('skips and logs a transcript %s, and keeps the cursor (NFR3.2)', async (_, fileOf) => {
    await fs.mkdir(path.join(tmp, 'elsewhere'), { recursive: true });
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)], path.join(tmp, 'elsewhere', 'x.jsonl'));
    await fs.symlink(path.join(tmp, 'elsewhere', 'x.jsonl'), path.join(projectsDir, 'p', 'link.jsonl'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await claudeTurn(tokens(), fileOf());
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[speckit tokens]'));
    expect(await bucket('speckit-project')).toBeNull();
    expect(await readCursor(userData, root)).toEqual({ sessions: {} });
  });

  it('adds the tokens of a model without a price, and no dollars (BR4.1)', async () => {
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1, { model: 'some-other-model' })]);
    await claudeTurn(tokens());
    expect((await bucket('speckit-project')).at(-1)).toMatchObject({ input: 10, output: 10, usd: 0 });
  });
});

describe('an opencode turn (US-1409 BR1.3, NFR6.1, NFR6.2)', () => {
  it('credits the increase of the session totals and cost; a re-sent total adds nothing', async () => {
    await feature('001-login');
    const t = tokens();
    await opencodeTurn(t, ocUsage(100, 0.2)); // first sight: what the session held goes to the project bucket
    expect((await bucket('speckit-project')).at(-1)).toMatchObject({ input: 100, output: 15, cacheWrite5m: 50, cacheRead: 1000, usd: 0.2 });
    clock += 60_000;
    await opencodeTurn(t, ocUsage(150, 0.3));
    const list = await bucket('speckit-001-login');
    expect(list.at(-1)).toMatchObject({ input: 50, output: 0, cacheRead: 0, usd: expect.closeTo(0.1, 10) });
    clock += 60_000;
    await opencodeTurn(t, ocUsage(150, 0.3));
    expect(await bucket('speckit-001-login')).toEqual(list);
  });

  it('ignores an event without tokens and writes nothing', async () => {
    const t = tokens();
    await opencodeTurn(t, { cost: 1 });
    await opencodeTurn(t, null);
    await expect(fs.access(path.join(root, '.thadeus'))).rejects.toThrow();
    expect(await readCursor(userData, root)).toEqual({ sessions: {} });
  });
});

describe('the bucket (US-1409 BR1.4, BR2.1, NFR3.3)', () => {
  it('is the feature active when the turn ends', async () => {
    await feature('001-login');
    const t = tokens();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await claudeTurn(t);
    await feature('002-photos'); // the next turn switched the feature
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1), prompt(T0 + 5), call('msg_2', T0 + 6, { input: 3 })]);
    await claudeTurn(t);
    expect((await bucket('speckit-001-login')).at(-1).input).toBe(10);
    expect((await bucket('speckit-002-photos')).at(-1).input).toBe(3);
  });

  it('is speckit-project without an active feature, or when the folder name fails the name check', async () => {
    const t = tokens();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await claudeTurn(t);
    await feature('bad name');
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1), prompt(T0 + 5), call('msg_2', T0 + 6, { input: 3 })]);
    await claudeTurn(t);
    expect((await bucket('speckit-project')).at(-1).input).toBe(13);
    expect(await fs.readdir(path.join(root, '.thadeus/tokens'))).toEqual(['speckit-project.json']);
  });
});

describe('the write boundary (US-1409 BR3.1, BR3.2, NFR3.1, NFR3.4, W1)', () => {
  it('refuses a .thadeus that links out of the project, logs it and keeps the cursor; the next turn credits it', async () => {
    const outside = path.join(tmp, 'outside');
    await fs.mkdir(outside);
    await fs.symlink(outside, path.join(root, '.thadeus'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const t = tokens();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await claudeTurn(t);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('speckit-project'));
    expect(await fs.readdir(outside)).toEqual([]);
    expect(await readCursor(userData, root)).toEqual({ sessions: {} });

    await fs.unlink(path.join(root, '.thadeus'));
    await claudeTurn(t);
    expect((await bucket('speckit-project')).at(-1).input).toBe(10);
  });

  it('writes in the project only .thadeus/tokens/speckit-*.json, never under .specify/ or specs/', async () => {
    await feature('001-login');
    const write = vi.fn(writeAtomic);
    const t = tokens({ write });
    const fsCalls = spyWrites();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await claudeTurn(t);
    await opencodeTurn(t, ocUsage(100, 0.2));
    const all = fsCalls.calls().map((c) => String(c[0]));
    fsCalls.restore();
    const inProject = write.mock.calls.map((c) => c[0]).filter((p) => p.startsWith(root + path.sep));
    expect(inProject.length).toBeGreaterThan(0);
    for (const p of inProject) expect(path.relative(root, p)).toMatch(/^\.thadeus\/tokens\/speckit-[\w.-]+\.json$/);
    for (const p of write.mock.calls.map((c) => c[0]).filter((p) => !p.startsWith(root + path.sep)))
      expect(p.startsWith(path.join(userData, 'speckit-tokens'))).toBe(true);
    for (const p of all.filter((p) => p.startsWith(root + path.sep))) expect(path.relative(root, p).startsWith('.thadeus')).toBe(true);
  });

  it('runs two turns of one project one after the other, so a call is credited once', async () => {
    const t = tokens();
    await writeTranscript([prompt(T0), call('msg_1', T0 + 1)]);
    await Promise.all([claudeTurn(t), claudeTurn(t)]);
    expect((await bucket('speckit-project')).at(-1).input).toBe(10);
  });
});
