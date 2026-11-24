// US-1410 (contract C9): the Spec Kit agent progress. waitingFrom (BR10.2, NFR3.3, NFR5.1) and loadSpeckitProgress
// (BR10.3, BR10.4, NFR5.2), with events in the public view shape and the features reader stubbed, so no file is read.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byPager } from '../../src/shared/agentOrder.js';
import { loadSpeckitProgress, waitingFrom } from '../../src/main/agentProgress.js';

let n = 0;
/** A public hook event as the store's list gives it (agentEvents.js PUBLIC). */
const event = (over = {}) => ({
  eventId: `h${++n}-abc`,
  sessionId: 's1',
  projectId: 'p1',
  tabId: 'agent:claude',
  harness: 'claude',
  source: 'hook',
  kind: 'question',
  state: 'shown',
  arrivedAt: '2026-11-24T10:00:00.000Z',
  arrivedAtMs: 1000 + n,
  seq: n,
  context: null,
  questions: [{ header: 'Approach', text: 'Which approach?\nMore detail.', truncated: false, options: [], multiSelect: false, allowOwn: true }],
  permission: undefined,
  ...over
});
const permission = (over = {}) =>
  event({
    kind: 'permission',
    questions: undefined,
    permission: { what: 'Bash', detail: 'rm -rf /Users/me/secret', cwd: '/Users/me/project', truncated: false, choices: [] },
    ...over
  });
const list = (...events) => [...events].sort(byPager);

describe('waitingFrom (BR10.2)', () => {
  it('gives null with no events, or none open', () => {
    expect(waitingFrom([])).toBeNull();
    expect(waitingFrom(undefined)).toBeNull();
    expect(waitingFrom([event({ state: 'ended' }), event({ state: 'handedBack' }), event({ state: 'sent' })])).toBeNull();
  });

  it("gives one question's header and the harness label as the agent", () => {
    expect(waitingFrom([event()])).toEqual({ question: 'Approach', agent: 'Claude Code' });
  });

  it("uses the body's first line when there is no header, and the harness id when it has no label", () => {
    expect(waitingFrom([event({ harness: 'unknown-tool', questions: [{ header: null, text: '  First line  \nSecond line' }] })])).toEqual({
      question: 'First line',
      agent: 'unknown-tool'
    });
  });

  it('takes the first open question or permission in pager order; a reply, a timed-out question counts as open', () => {
    const q = event({ arrivedAtMs: 50, state: 'timedOut' });
    const p = permission({ arrivedAtMs: 60 });
    const reply = event({ kind: 'reply', arrivedAtMs: 1, questions: undefined, message: 'Done.' });
    expect(waitingFrom(list(reply, p, q))).toEqual({ question: 'Approach', agent: 'Claude Code' });
    expect(waitingFrom(list(reply, p))).toEqual({ question: 'Bash', agent: 'Claude Code' });
  });

  it('leaves out the AI-DLC audit fallback rows and a handoff page', () => {
    const audit = event({ eventId: 'audit-1', source: 'audit', arrivedAtMs: 1 });
    const handoff = event({ kind: 'handoff', questions: undefined });
    expect(waitingFrom([audit, handoff])).toBeNull();
  });

  it('returns only the tool name and agent of a permission, never its command, path or folder (NFR3.3)', () => {
    const w = waitingFrom([permission()]);
    expect(w).toEqual({ question: 'Bash', agent: 'Claude Code' });
    expect(JSON.stringify(w)).not.toMatch(/rm -rf|secret|Users/);
  });

  it('gives a <script> as plain text and cuts a 5,000-character body to 200 characters (NFR5.1)', () => {
    expect(waitingFrom([event({ questions: [{ header: '<script>alert(1)</script>', text: '' }] })]).question).toBe('<script>alert(1)</script>');
    const long = waitingFrom([event({ questions: [{ header: null, text: 'x'.repeat(5000) }] })]).question;
    expect(long).toHaveLength(200);
  });
});

describe('loadSpeckitProgress (contract C9)', () => {
  const feature = (dir, active, done, total) => ({ dir, number: dir.slice(0, 3), name: dir.slice(4), active, tasks: { done, total, skipped: 0, phases: [] } });
  const features = (active) => ({
    version: null,
    features: [feature('001-login', active === '001-login', 3, 7), feature('002-cart', false, 0, 2)],
    active,
    errors: []
  });
  beforeEach(() => vi.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => vi.restoreAllMocks());

  it("gives the active feature's name and done/total, with source tasks (BR10.3, BR10.4)", async () => {
    const loadFeatures = vi.fn(async () => features('001-login'));
    expect(await loadSpeckitProgress('/kit', [], { loadFeatures })).toEqual({ source: 'tasks', waiting: null, feature: { name: 'login', done: 3, total: 7 } });
    expect(loadFeatures).toHaveBeenCalledWith('/kit');
  });

  it('gives feature null with no active feature, and source none when nothing waits either', async () => {
    expect(await loadSpeckitProgress('/kit', [], { loadFeatures: async () => features(null) })).toEqual({ source: 'none', waiting: null, feature: null });
  });

  it('gives feature null and a warning, and does not throw, when the features reader fails (NFR5.2)', async () => {
    const res = await loadSpeckitProgress('/kit', [event()], { loadFeatures: async () => Promise.reject(new Error('EACCES')) });
    expect(res).toEqual({ source: 'hooks', waiting: { question: 'Approach', agent: 'Claude Code' }, feature: null });
    expect(console.warn).toHaveBeenCalledWith(expect.any(String), 'EACCES');
  });

  it('names hooks as the source when a question waits, even with an active feature (BR10.4)', async () => {
    const res = await loadSpeckitProgress('/kit', [event()], { loadFeatures: async () => features('001-login') });
    expect(res.source).toBe('hooks');
    expect(res.feature).toEqual({ name: 'login', done: 3, total: 7 });
  });
});
