// US-0805 FR2, NFR3: ready or not, as a pure function, for each framework and state.
import { describe, expect, it } from 'vitest';
import { healthOf } from '../../src/shared/health.js';
import { HEALTH_IDS } from '../../src/shared/installCommands.js';

const FOUND = { found: true, version: '1.0.0' };
const MISSING = { found: false, version: null };
const NO_ANSWER = { found: false, version: null, noAnswer: true };
const ALL = Object.fromEntries(HEALTH_IDS.map((id) => [id, FOUND]));

/** healthOf with every tool found and Claude Code signed in, changed by `over` (a row, or null for none yet, per id). */
function health({ over = {}, signIns = { claude: 'in' }, framework = 'aidlc', checking = [] } = {}) {
  const rows = Object.entries({ ...ALL, ...over })
    .filter(([, row]) => row)
    .map(([id, row]) => ({ id, ...row }));
  return healthOf({ rows, signIns, framework, checking });
}
const tool = (result, id) => result.tools.find((x) => x.id === id);
const problems = (result) => result.tools.filter((x) => x.problem).map((x) => x.id);

describe('what each tool is (US-0805 FR1.1, FR2.1)', () => {
  it.each([
    ['aidlc', { claude: 'needed', aidlc: 'needed', specify: 'optional', opencode: 'optional', gh: 'optional' }],
    ['speckit', { claude: 'needed', aidlc: 'optional', specify: 'needed', opencode: 'optional', gh: 'optional' }],
    [null, { claude: 'needed', aidlc: 'either', specify: 'either', opencode: 'optional', gh: 'optional' }]
  ])('framework %s', (framework, needs) => {
    const { tools } = health({ framework });
    expect(Object.fromEntries(tools.map(({ id, need }) => [id, need]))).toEqual(needs);
  });

  it('lists the five tools only, whatever else was scanned', () => {
    const { tools } = health({ over: { glab: FOUND, shell: MISSING } });
    expect(tools.map(({ id }) => id).sort()).toEqual([...HEALTH_IDS].sort());
  });
});

describe('ready or not (US-0805 FR2.2)', () => {
  it.each(['aidlc', 'speckit', null])('framework %s: everything found and signed in is ready, with no problem', (framework) => {
    const result = health({ framework });
    expect(result.status).toBe('ready');
    expect(result.tools.every((x) => x.state === 'ok' && !x.problem && !x.broken)).toBe(true);
  });

  it.each([
    ['aidlc', 'claude', ['claude']],
    ['aidlc', 'aidlc', ['aidlc']],
    ['aidlc', 'specify', []],
    ['speckit', 'claude', ['claude']],
    ['speckit', 'specify', ['specify']],
    ['speckit', 'aidlc', []],
    [null, 'claude', ['claude']],
    [null, 'aidlc', []],
    [null, 'specify', []],
    ['aidlc', 'opencode', []],
    ['speckit', 'gh', []]
  ])('framework %s without %s: problems %j', (framework, id, expected) => {
    for (const [row, state] of [
      [MISSING, 'missing'],
      [NO_ANSWER, 'noAnswer']
    ]) {
      const result = health({ framework, over: { [id]: row } });
      expect(problems(result)).toEqual(expected);
      expect(result.status).toBe(expected.length ? 'problems' : 'ready');
      expect(tool(result, id)).toMatchObject({ state, broken: true });
    }
  });

  it.each([
    ['in', 'ready', 'ok'],
    ['none', 'ready', 'ok'],
    ['unknown', 'ready', 'ok'],
    [undefined, 'ready', 'ok'], // none yet after a finished check
    ['out', 'problems', 'out'],
    ['checking', 'checking', 'checking']
  ])('Claude Code %s: %s', (signIn, status, state) => {
    const result = health({ signIns: { claude: signIn } });
    expect(result.status).toBe(status);
    expect(tool(result, 'claude')).toMatchObject({ state, problem: status === 'problems', broken: state === 'out' });
  });

  it('an optional tool never counts: missing, signed out or with no account', () => {
    const result = health({ over: { opencode: MISSING }, signIns: { claude: 'in', gh: 'out', opencode: 'none' } });
    expect(result.status).toBe('ready');
    expect(tool(result, 'gh')).toMatchObject({ state: 'out', problem: false, broken: true });
  });

  it('a sign-in of a tool that is not found does not count', () => {
    expect(tool(health({ over: { gh: MISSING }, signIns: { claude: 'in', gh: 'in' } }), 'gh').state).toBe('missing');
  });

  it('puts the problems first and keeps the order otherwise', () => {
    const ids = health({ framework: 'speckit', over: { specify: MISSING } }).tools.map(({ id }) => id);
    expect(ids).toEqual(['specify', ...HEALTH_IDS.filter((id) => id !== 'specify')]);
  });

  describe('either AI-DLC or Spec Kit', () => {
    it('neither: both are problems', () => {
      const result = health({ framework: null, over: { aidlc: MISSING, specify: NO_ANSWER } });
      expect(problems(result)).toEqual(['aidlc', 'specify']);
      expect(result.status).toBe('problems');
    });
    it('one missing while the other is not answered yet: no problem and not ready', () => {
      const result = health({ framework: null, over: { aidlc: MISSING, specify: null } });
      expect(problems(result)).toEqual([]);
      expect(result.status).toBe('checking');
    });
    it('one found is enough while the other is not answered yet', () => {
      expect(health({ framework: null, over: { specify: null } }).status).toBe('ready');
    });
  });
});

describe('while something is being checked (US-0805 FR2.2, FR3.4)', () => {
  it('nothing answered yet is checking, with no problem', () => {
    const result = healthOf({ rows: [], signIns: {}, framework: null, checking: HEALTH_IDS });
    expect(result.status).toBe('checking');
    expect(result.tools.every((x) => x.state === 'checking' && !x.problem && !x.broken)).toBe(true);
    expect(health({ over: { claude: { found: null } } }).status).toBe('checking');
  });

  it.each(['claude', 'aidlc'])('a needed tool checked again (%s) is never ready, though its last answer stays', (id) => {
    const result = health({ checking: [id] });
    expect(result.status).toBe('checking');
    expect(tool(result, id).state).toBe('ok');
  });

  it('Claude Code found, with its first sign-in check under way, is checking', () => {
    expect(tool(health({ signIns: {}, checking: ['claude'] }), 'claude').state).toBe('checking');
  });

  it('an optional tool checked again does not hold "ready" back; the last problems stay', () => {
    expect(health({ checking: ['gh', 'opencode', 'specify'] }).status).toBe('ready');
    expect(health({ over: { aidlc: MISSING }, checking: HEALTH_IDS }).status).toBe('problems');
  });

  it('either: the one found, when checked again, is not enough', () => {
    expect(health({ framework: null, over: { aidlc: MISSING }, checking: ['specify'] }).status).toBe('checking');
    expect(health({ framework: null, checking: ['specify'] }).status).toBe('ready');
  });
});
