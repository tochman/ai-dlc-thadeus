// US-0506 u1 LC7: the development timing log (OD1; NFR1.6, NFR1.7).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createTimingLog } from '../../src/main/agentTiming.js';

const TMP = path.resolve(__dirname, '../.tmp');
mkdirSync(TMP, { recursive: true });
let base, dir;
beforeEach(() => {
  base = mkdtempSync(path.join(TMP, 'tl-'));
  dir = path.join(base, 'logs');
});
afterEach(() => rmSync(base, { recursive: true, force: true }));
const lines = () => readFileSync(path.join(dir, 'agent-timing.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);

describe('createTimingLog', () => {
  it('with the switch on, one answered event gives exactly four lines with only the four fields', async () => {
    const log = createTimingLog({ dir, on: true });
    log.stamp('e1', 'claude', 'hookReceived', 1000);
    expect(log.stampFromRenderer('e1', 'dialogShown', 'claude')).toBe(true);
    expect(log.stampFromRenderer('e1', 'answerClicked', 'claude')).toBe(true);
    log.stamp('e1', 'claude', 'answerDelivered');
    await log.flush();
    const got = lines();
    expect(got.map((l) => l.stamp)).toEqual(['hookReceived', 'dialogShown', 'answerClicked', 'answerDelivered']);
    for (const l of got) expect(Object.keys(l).sort()).toEqual(['at', 'eventId', 'harness', 'stamp']);
    expect(got[0]).toEqual({ eventId: 'e1', harness: 'claude', stamp: 'hookReceived', at: 1000 });
  });

  it('with the switch off, no folder and no file exist', async () => {
    const log = createTimingLog({ dir, on: false });
    log.stamp('e1', 'claude', 'hookReceived');
    expect(log.stampFromRenderer('e1', 'dialogShown', 'claude')).toBe(false);
    await log.flush();
    expect(existsSync(dir)).toBe(false);
    expect(log.on).toBe(false);
  });

  it('refuses other renderer stamps and an event id over 64 characters', async () => {
    const log = createTimingLog({ dir, on: true });
    expect(log.stampFromRenderer('e1', 'hookReceived', 'claude')).toBe(false);
    expect(log.stampFromRenderer('e1', 'answerDelivered', 'claude')).toBe(false);
    expect(log.stampFromRenderer('e'.repeat(65), 'dialogShown', 'claude')).toBe(false);
    expect(log.stampFromRenderer(42, 'dialogShown', 'claude')).toBe(false);
    await log.flush();
    expect(existsSync(dir)).toBe(false);
  });

  it('accepts the notification stamps from main callers only (u5 amendment 4)', async () => {
    const log = createTimingLog({ dir, on: true });
    expect(log.stampFromRenderer('e1', 'notificationShown', 'claude')).toBe(false);
    log.stamp('e1', 'claude', 'notificationShown', 1);
    log.stamp('e1', 'claude', 'notificationClicked', 2);
    log.stamp('e1', 'claude', 'madeUp', 3);
    await log.flush();
    expect(lines().map((l) => l.stamp)).toEqual(['notificationShown', 'notificationClicked']);
  });

  it('appends through one queue, so 200 quick stamps give 200 whole lines in order', async () => {
    const log = createTimingLog({ dir, on: true });
    for (let i = 0; i < 200; i++) log.stamp(`e${i}`, 'opencode', 'hookReceived', i);
    await log.flush();
    expect(lines().map((l) => l.at)).toEqual(Array.from({ length: 200 }, (_, i) => i));
  });
});
