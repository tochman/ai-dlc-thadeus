// US-0513 FR1.3, FR1.4, FR6.2: the one archive rule that main, the renderer and the feature docs test share.
import { describe, expect, it } from 'vitest';
import { ELSEWHERE_MS, checkReason, isArchiveEvent, isArchived, isFinished, workBlock } from '../../src/shared/intentArchive.js';

describe('isArchived (as AI-DLC tests it)', () => {
  it('is true when the row or the state says so', () => {
    expect(isArchived({ status: 'archived' })).toBe(true);
    expect(isArchived({ status: ' Archived ' })).toBe(true); // AI-DLC trims and ignores case
    expect(isArchived({ status: 'in-flight', stateStatus: 'Archived' })).toBe(true); // a run cut off before intents.json
    expect(isArchived({ status: 'archived', stateStatus: 'Running' })).toBe(true); // an unarchive cut off before it
  });

  it('is false for every other status, an unknown one and no intent', () => {
    expect(isArchived({ status: 'complete', stateStatus: 'Completed' })).toBe(false);
    expect(isArchived({ status: 'in-flight', stateStatus: 'Running' })).toBe(false);
    expect(isArchived({ status: null })).toBe(false);
    expect(isArchived(null)).toBe(false);
  });
});

describe('isFinished (FR6.2)', () => {
  it('is true for a complete intent and for an archived one that was complete (AC6.1.2)', () => {
    expect(isFinished({ status: 'complete' })).toBe(true);
    expect(isFinished({ status: 'in-flight', stateStatus: 'Completed' })).toBe(true);
    expect(isFinished({ status: 'archived', stateStatus: 'Archived', archivedFrom: 'Completed' })).toBe(true);
    expect(isFinished({ status: 'complete', stateStatus: 'Archived', archivedFrom: 'Completed' })).toBe(true); // cut off before intents.json
    expect(isFinished({ status: 'archived', stateStatus: 'Completed' })).toBe(true); // an unarchive cut off before intents.json
  });

  it('is false for any other archived intent and for running work (AC6.1.3)', () => {
    expect(isFinished({ status: 'archived', stateStatus: 'Archived', archivedFrom: 'Running' })).toBe(false);
    expect(isFinished({ status: 'complete', stateStatus: 'Archived', archivedFrom: 'Running' })).toBe(false);
    expect(isFinished({ status: 'archived', stateStatus: 'Archived' })).toBe(false); // archived before the field existed
    expect(isFinished({ status: 'in-flight', stateStatus: 'Running' })).toBe(false);
    expect(isFinished(null)).toBe(false);
  });
});

describe('checkReason (FR1.3, AC1.1.4)', () => {
  it('trims it and turns line breaks into spaces; spaces only is no reason', () => {
    expect(checkReason('  done with it  ')).toEqual({ reason: 'done with it' });
    expect(checkReason('one\ntwo\r\nthree')).toEqual({ reason: 'one two three' });
    expect(checkReason('   \n ')).toEqual({ reason: '' });
    expect(checkReason(undefined)).toEqual({ reason: '' });
  });

  it('accepts 200 characters, not 201, and refuses one that starts with a dash', () => {
    expect(checkReason('x'.repeat(200))).toEqual({ reason: 'x'.repeat(200) });
    expect(checkReason('x'.repeat(201))).toEqual({ error: 'tooLong' });
    expect(checkReason(' --force')).toEqual({ error: 'dash' });
    expect(checkReason('-')).toEqual({ error: 'dash' });
    expect(checkReason('not-a-flag')).toEqual({ reason: 'not-a-flag' });
  });
});

describe('workBlock (FR1.4, AC1.2.1, AC1.2.2)', () => {
  const now = 1_800_000_000_000;
  const active = { dirName: 'a', status: 'in-flight', active: true, activityAt: now - ELSEWHERE_MS - 1 };
  const block = (o) => workBlock({ busy: false, asking: false, running: false, activeIntent: active, now, ...o });

  it('names a busy tab, then a waiting question, then an open session, then an outside agent', () => {
    expect(block({ busy: true, asking: true, running: true })).toBe('busy');
    expect(block({ asking: true, running: true })).toBe('asking');
    expect(block({ running: true })).toBe('running');
    expect(block({ activeIntent: { ...active, activityAt: now - ELSEWHERE_MS + 1 } })).toBe('elsewhere');
    expect(block({})).toBeNull();
  });

  it('a parked active intent is blocked by a busy or asking tab only', () => {
    const parked = { ...active, parked: true, activityAt: now };
    expect(block({ activeIntent: parked, running: true })).toBeNull();
    expect(block({ activeIntent: parked, busy: true })).toBe('busy');
    expect(block({ activeIntent: parked, asking: true })).toBe('asking');
  });

  it('a complete active intent, or none, is not blocked by a session or the audit', () => {
    expect(block({ activeIntent: { ...active, status: 'complete', activityAt: now }, running: true })).toBeNull();
    expect(block({ activeIntent: null, running: true })).toBeNull();
    expect(block({ activeIntent: { ...active, activityAt: null } })).toBeNull();
  });
});

describe('isArchiveEvent', () => {
  it('knows the two events AI-DLC writes', () => {
    expect(['WORKFLOW_ARCHIVED', 'WORKFLOW_UNARCHIVED', 'WORKFLOW_PARKED'].map((event) => isArchiveEvent({ event }))).toEqual([true, true, false]);
  });
});
