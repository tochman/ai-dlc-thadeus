// US-0510 FR4.1–FR4.6, NFR4: park and unpark through AI-DLC's own commands; AI-DLC itself never runs here.
import { describe, expect, it, vi } from 'vitest';
import { park, parkedFromAudit, parkedFromStatus, readParkStatus, unpark, withParkStatus } from '../../src/main/intentPark.js';

const ev = (event, timeMs, fields = {}) => ({ event, timeMs, timestamp: new Date(timeMs).toISOString(), fields, source: 'host.md' });

/** Records each command (not the PATH probe runFixed makes once) and answers from `answers` in order; an Error is thrown. */
function fakeExec(...answers) {
  const calls = [];
  const exec = vi.fn(async (file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push(args);
    const answer = answers.shift() ?? 'ok';
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { exec, calls };
}

const refusal = (text) => Object.assign(new Error('Command failed'), { stdout: text });
const KNOWN = ['261120-a', '261120-b'];

describe('parkedFromAudit', () => {
  it('a last parked event gives the parked state with its stage, and a later unparked event clears it (AC4.1.1, AC4.1.6)', () => {
    const parked = [ev('STAGE_STARTED', 1, { Stage: 'code-generation' }), ev('WORKFLOW_PARKED', 2000, { Stage: 'code-generation' })];
    expect(parkedFromAudit(parked)).toEqual({ parked: true, stage: 'code-generation', at: 2000 });
    expect(parkedFromAudit([...parked, ev('WORKFLOW_UNPARKED', 3000)])).toEqual({ parked: false, stage: null, at: 3000 });
    expect(parkedFromAudit([])).toEqual({ parked: false, stage: null, at: null });
  });
});

describe('parkedFromStatus', () => {
  it('a status naming parking gives parked; the current output gives not parked', () => {
    expect(parkedFromStatus('Status:         Parked\nCurrent Stage:  Functional Design (3.1)\n')).toBe(true);
    expect(parkedFromStatus('Status:         Running\nCurrent Stage:  Code Generation (3.5)\n')).toBe(false);
    expect(parkedFromStatus('')).toBe(false);
  });
});

describe('readParkStatus and withParkStatus', () => {
  it('reads aidlc engine status with its read time, and null when it fails', async () => {
    const { exec, calls } = fakeExec('Status:         Parked\n', new Error('boom'));
    expect(await readParkStatus('/p', { exec, now: () => 5000 })).toEqual({ parked: true, at: 5000 });
    expect(calls).toEqual([['engine', 'status']]);
    expect(await readParkStatus('/p', { exec })).toBeNull();
  });

  it('a newer parked status marks the active intent; an older one, or a not-parked one, changes nothing', () => {
    const list = { intents: [{ dirName: 'a', active: true, parked: false, parkedAt: 1000, currentStage: 'code-generation' }, { dirName: 'b' }], warning: null };
    expect(withParkStatus(list, { parked: true, at: 2000 }).intents[0]).toMatchObject({ parked: true, parkedStage: 'code-generation' });
    expect(withParkStatus(list, { parked: true, at: 500 }).intents[0].parked).toBe(false);
    expect(withParkStatus(list, { parked: false, at: 2000 })).toBe(list);
    expect(withParkStatus(list, null)).toBe(list);
  });
});

describe('park', () => {
  it('runs exactly aidlc engine orchestrate park --person-asked (AC4.1.2)', async () => {
    const { exec, calls } = fakeExec('Parked.');
    expect(await park('/p', { exec })).toEqual({ ok: true });
    expect(calls).toEqual([['engine', 'orchestrate', 'park', '--person-asked']]);
  });

  it('a refused park comes back with its reason, and nothing else runs (AC4.1.5)', async () => {
    const { exec, calls } = fakeExec(refusal('Cannot park in the middle of a stage.\n'));
    expect(await park('/p', { exec })).toEqual({ ok: false, error: 'Cannot park in the middle of a stage.' });
    expect(calls).toHaveLength(1);
  });
});

describe('unpark', () => {
  it('on the active intent runs only aidlc engine state unpark', async () => {
    const { exec, calls } = fakeExec();
    expect(await unpark('/p', '261120-a', { activeDirName: '261120-a', known: KNOWN, exec })).toEqual({ ok: true, switched: false });
    expect(calls).toEqual([['engine', 'state', 'unpark']]);
  });

  it('on another intent switches to it first, then unparks, and reports the switch (AC4.1.3)', async () => {
    const { exec, calls } = fakeExec();
    expect(await unpark('/p', '261120-b', { activeDirName: '261120-a', known: KNOWN, exec })).toEqual({ ok: true, switched: true });
    expect(calls).toEqual([
      ['intent', '261120-b'],
      ['engine', 'state', 'unpark']
    ]);
  });

  it('a name not in the list, or not a valid name, throws before anything runs (NFR4)', async () => {
    const { exec } = fakeExec();
    await expect(unpark('/p', '261120-z', { activeDirName: '261120-a', known: KNOWN, exec })).rejects.toThrow();
    await expect(unpark('/p', '../x', { activeDirName: '261120-a', known: [...KNOWN, '../x'], exec })).rejects.toThrow();
    await expect(unpark('/p', '--help', { activeDirName: '261120-a', known: [...KNOWN, '--help'], exec })).rejects.toThrow();
    expect(exec).not.toHaveBeenCalled();
  });

  it('a failed switch stops there and changes nothing else (AC4.1.5)', async () => {
    const { exec, calls } = fakeExec(refusal('No such intent'));
    expect(await unpark('/p', '261120-b', { activeDirName: '261120-a', known: KNOWN, exec })).toEqual({ ok: false, error: 'No such intent', switched: false });
    expect(calls).toHaveLength(1);
  });

  it('a failed unpark after the switch reports the switch (FR4.5)', async () => {
    const { exec, calls } = fakeExec('switched', refusal('Not parked'));
    expect(await unpark('/p', '261120-b', { activeDirName: '261120-a', known: KNOWN, exec })).toEqual({ ok: false, error: 'Not parked', switched: true });
    expect(calls).toHaveLength(2);
  });
});
