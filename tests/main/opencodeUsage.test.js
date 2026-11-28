// US-0058 FR1: opencode's own assistant messages as ledger nodes, one per intent, so Cost and Activity count them.
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { opencodeNodes } from '../../src/main/parsers/opencodeUsage.js';
import { readOpencodeActivityRecords, readOpencodeMessages } from '../../src/main/opencodeDb.js';

const msg = (at, extra = {}) => ({
  at,
  agent: 'build',
  model: 'gpt-6-luna',
  cost: 0,
  tokens: { input: 100, output: 10, reasoning: 5, cache: { read: 1000, write: 50 } },
  ...extra
});
const ev = (timeMs, event, Stage) => ({ timeMs, event, fields: Stage ? { Stage } : {} });

describe('opencodeNodes (US-0058 FR1)', () => {
  const a = { key: 'intent:a', events: [ev(100, 'WORKFLOW_STARTED'), ev(110, 'STAGE_STARTED', 'code-generation'), ev(300, 'WORKFLOW_COMPLETED')] };
  const b = { key: 'intent:b', events: [ev(200, 'WORKFLOW_STARTED'), ev(210, 'STAGE_STARTED', 'build-and-test')] };

  it('gives a message to the intent with the latest event before it, in that stage, with reasoning counted as output', () => {
    const nodes = opencodeNodes([msg(150), msg(250)], [a, b]);
    expect(nodes['intent:a'].totals.tokens).toEqual({ input: 100, output: 15, cacheCreate5m: 50, cacheCreate1h: 0, cacheRead: 1000 });
    expect(nodes['intent:a'].byStage['code-generation'].byAgent.main.tokens.input).toBe(100); // 'build' is the main agent
    expect(nodes['intent:b'].byStage['build-and-test'].byModel['gpt-6-luna'].tokens.cacheRead).toBe(1000);
  });

  it('never gives a message to an intent after it finished, nor one from before every intent', () => {
    const nodes = opencodeNodes([msg(50), msg(350)], [a, b]);
    expect(nodes['intent:a']).toBeUndefined();
    expect(nodes['intent:b'].totals.tokens.input).toBe(100);
  });

  it("keeps opencode's own cost, else prices the tokens, else counts 0 USD", () => {
    const rates = { 'gpt-6-luna': { input: 1, output: 0, cacheWrite5m: 0, cacheWrite1h: 0, cacheRead: 0 } };
    expect(opencodeNodes([msg(150, { cost: 0.5 })], [a], rates)['intent:a'].totals.usd).toBe(0.5);
    expect(opencodeNodes([msg(150)], [a], rates)['intent:a'].totals.usd).toBeCloseTo(0.0001, 10);
    expect(opencodeNodes([msg(150, { model: 'free-model' })], [a], rates)['intent:a'].totals.usd).toBe(0);
    expect(opencodeNodes([msg(150)], [a])['intent:a'].totals.usd).toBe(0);
  });

  it('a message before any stage event has no stage entry, only totals', () => {
    const c = { key: 'intent:c', events: [ev(100, 'WORKFLOW_STARTED')] };
    const node = opencodeNodes([msg(150)], [c])['intent:c'];
    expect(node.byStage).toEqual({});
    expect(node.byAgent.main.tokens.output).toBe(15);
  });
});

describe('readOpencodeMessages (US-0058 FR1, NFR1)', () => {
  let dir;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("reads the assistant messages of this project's sessions and its sub folders only", async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'oc-'));
    const file = path.join(dir, 'opencode.db');
    const db = new DatabaseSync(file);
    db.exec('CREATE TABLE session_v2 (id TEXT, directory TEXT); CREATE TABLE session_message (session_id TEXT, type TEXT, data TEXT)');
    db.exec("INSERT INTO session_v2 VALUES ('s1', '/p'), ('s2', '/p/sub'), ('s3', '/px'), ('s4', '/other')");
    const data = (n) => JSON.stringify({ time: { completed: n }, agent: 'build', model: { id: 'm' }, cost: 0, tokens: { input: n } });
    const ins = db.prepare('INSERT INTO session_message VALUES (?, ?, ?)');
    for (const [s, type, n] of [
      ['s1', 'assistant', 2],
      ['s2', 'assistant', 1],
      ['s1', 'user', 3],
      ['s3', 'assistant', 4],
      ['s4', 'assistant', 5]
    ])
      ins.run(s, type, data(n));
    db.close();
    const got = await readOpencodeMessages('/p', file);
    expect(got.map((m) => m.at)).toEqual([1, 2]);
    expect(got[0]).toMatchObject({ agent: 'build', model: 'm', cost: 0, tokens: { input: 1 } });
  });

  it('gives [] when there is no database, and never throws', async () => {
    expect(await readOpencodeMessages('/p', '/nowhere/opencode.db')).toEqual([]);
    expect(await readOpencodeActivityRecords('/p', '/nowhere/opencode.db')).toEqual({ sessions: [], parts: [], messages: [] });
  });

  it('reads only tool timeline records and session ownership fields from the read-only database', async () => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'oc-'));
    const file = path.join(dir, 'opencode.db');
    const db = new DatabaseSync(file);
    db.exec(
      'CREATE TABLE session_v2 (id TEXT, directory TEXT, parent_id TEXT, agent TEXT); CREATE TABLE part (id TEXT, session_id TEXT, type TEXT, data TEXT); CREATE TABLE session_message (id TEXT, session_id TEXT, type TEXT, data TEXT)'
    );
    db.exec("INSERT INTO session_v2 VALUES ('s1', '/p', NULL, 'build'), ('s2', '/other', NULL, 'other')");
    const ins = db.prepare('INSERT INTO part VALUES (?, ?, ?, ?)');
    ins.run(
      'call',
      's1',
      'tool',
      JSON.stringify({
        tool: 'read',
        callID: 'call',
        state: { status: 'completed', time: { start: 10, end: 20 }, input: { filePath: '/p/a.js', text: 'private' } }
      })
    );
    ins.run('other', 's2', 'tool', JSON.stringify({ tool: 'read', state: { status: 'completed', time: { start: 1, end: 2 }, input: {} } }));
    db.prepare('INSERT INTO session_message VALUES (?, ?, ?, ?)').run(
      'm1',
      's1',
      'assistant',
      JSON.stringify({ time: { created: 5, streamed: 25 }, text: 'private' })
    );
    db.close();

    const result = await readOpencodeActivityRecords('/p', file);
    expect(result.sessions).toEqual([{ id: 's1', directory: '/p', parent_id: null, agent: 'build' }]);
    expect(result.parts).toHaveLength(1);
    expect(result.parts[0]).toMatchObject({ id: 'call', session_id: 's1', type: 'tool' });
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toMatchObject({ id: 'm1', session_id: 's1' });
    expect(JSON.stringify(result)).toContain('private');
  });
});
