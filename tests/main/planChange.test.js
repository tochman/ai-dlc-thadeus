// US-0509 FR2.4, FR2.5, FR2.7, FR4.1, NFR1, NFR2: what a change of plan means for an intent's stages, and the description.
import { describe, expect, it } from 'vitest';
import { checkDescription, planChange, quoted, stageRuns } from '../../src/shared/planChange.js';

const stage = (slug, status, over = {}) => ({ slug, status, mode: 'EXECUTE', behind: false, current: false, ...over });
const done = (slug, over) => stage(slug, 'done', { behind: true, ...over });
const todo = (slug, over) => stage(slug, 'not-started', over);
const off = (slug, over) => todo(slug, { mode: 'SKIP', ...over });

/** Work at code-generation: what came before it is behind. */
const PIPELINE = {
  phases: [
    { name: 'initialization', stages: [done('state-init')] },
    {
      name: 'inception',
      stages: [
        off('reverse-engineering', { behind: true }),
        done('requirements-analysis'),
        off('user-stories', { behind: true }),
        stage('domain-design', 'skipped', { behind: true })
      ]
    },
    {
      name: 'construction',
      stages: [
        off('functional-design', { behind: true }),
        stage('code-generation', 'in-progress', { current: true }),
        todo('build-and-test'),
        off('ci-pipeline')
      ]
    },
    { name: 'operation', stages: [todo('deployment-pipeline'), off('deployment-execution'), stage('observability-setup', 'skipped')] }
  ]
};
const SAME = ['state-init', 'requirements-analysis', 'code-generation', 'build-and-test', 'deployment-pipeline'];
const change = (execute, { pipeline = PIPELINE, projectType = 'Brownfield' } = {}) => planChange(pipeline, { execute, skip: [] }, { projectType });

describe('planChange (US-0509 FR2.4)', () => {
  it('gives the added, dropped and kept stages of the work ahead, in pipeline order whatever the plan’s order', () => {
    expect(change(['deployment-execution', 'ci-pipeline', 'code-generation', 'requirements-analysis', 'state-init'])).toEqual({
      added: ['ci-pipeline', 'deployment-execution'],
      dropped: ['build-and-test', 'deployment-pipeline'],
      kept: ['state-init', 'requirements-analysis'],
      passed: [],
      currentDropped: null
    });
  });

  it('keeps a done stage the plan does not have', () => {
    const c = change(['code-generation', 'build-and-test', 'deployment-pipeline']);
    expect(c.kept).toEqual(['state-init', 'requirements-analysis']);
    expect(c.dropped).toEqual([]);
  });

  it('a stage the plan has behind the current one, or skipped earlier, is passed, not added', () => {
    const c = change([...SAME, 'observability-setup', 'functional-design', 'domain-design', 'user-stories']);
    expect(c.passed).toEqual(['user-stories', 'domain-design', 'functional-design', 'observability-setup']);
    expect(c.added).toEqual([]);
  });

  it('names the current stage it drops, also one that waits for approval or has not started', () => {
    for (const status of ['in-progress', 'awaiting-approval', 'revising', 'not-started']) {
      const pipeline = { phases: [{ name: 'construction', stages: [stage('code-generation', status, { current: true }), todo('build-and-test')] }] };
      expect(change(['build-and-test'], { pipeline }), status).toMatchObject({ dropped: ['code-generation'], currentDropped: 'code-generation' });
    }
  });

  it('an open stage behind the current one is dropped too, but it is not passed', () => {
    const pipeline = {
      phases: [{ name: 'inception', stages: [stage('user-stories', 'awaiting-approval', { behind: true, current: true }), todo('domain-design')] }]
    };
    expect(change(['domain-design'], { pipeline })).toMatchObject({ dropped: ['user-stories'], passed: [] });
    expect(change(['user-stories', 'domain-design'], { pipeline })).toMatchObject({ dropped: [], passed: [] });
  });

  it('nothing left to do changes when the plan has the same stages ahead', () => {
    expect(change(SAME)).toMatchObject({ added: [], dropped: [], currentDropped: null });
  });

  it('a tailored plan’s own stages are the base, not the scope it is built on', () => {
    // The state file's suffixes are the tailored plan: ci-pipeline was added to it and build-and-test taken out.
    const pipeline = { phases: [{ name: 'construction', stages: [stage('code-generation', 'in-progress'), off('build-and-test'), todo('ci-pipeline')] }] };
    expect(change(['code-generation', 'build-and-test'], { pipeline })).toMatchObject({ added: ['build-and-test'], dropped: ['ci-pipeline'] });
  });

  it('a stage the state file does not list goes last under added', () => {
    expect(change(['a-plugin-stage', ...SAME, 'ci-pipeline']).added).toEqual(['ci-pipeline', 'a-plugin-stage']);
  });

  it('a pipeline without stages gives the whole plan as added', () => {
    expect(change(['code-generation'], { pipeline: { phases: [] } })).toMatchObject({ added: ['code-generation'], kept: [], dropped: [] });
  });
});

describe('Reverse Engineering in a new project (US-0509 FR2.5)', () => {
  const RE = ['reverse-engineering', ...SAME];
  const ahead = { phases: [{ name: 'inception', stages: [off('reverse-engineering'), todo('requirements-analysis')] }] };
  it('is left out when the project type is Greenfield or missing, and counted in Brownfield', () => {
    for (const projectType of ['Greenfield', 'greenfield', null, '']) {
      expect(change(['reverse-engineering', 'requirements-analysis'], { pipeline: ahead, projectType }).added, String(projectType)).toEqual([]);
      expect(change(RE, { projectType }).passed, String(projectType)).toEqual([]);
    }
    expect(change(['reverse-engineering', 'requirements-analysis'], { pipeline: ahead }).added).toEqual(['reverse-engineering']);
    expect(change(RE).passed).toEqual(['reverse-engineering']);
  });

  it('stays when it is done, and is not added when the state file does not list it', () => {
    const pipeline = { phases: [{ name: 'inception', stages: [done('reverse-engineering')] }] };
    expect(change(RE, { pipeline, projectType: 'Greenfield' }).kept).toEqual(['reverse-engineering']);
    expect(change(['reverse-engineering'], { pipeline: { phases: [] }, projectType: 'Greenfield' }).added).toEqual([]);
  });
});

describe('stageRuns (US-0509 FR4.1)', () => {
  it('counts every done stage, and a planned one that is neither skipped nor passed', () => {
    const of = (over) => stageRuns(stage('x', 'not-started', over));
    expect([of({}), of({ status: 'done', mode: 'SKIP' }), of({ status: 'awaiting-approval', behind: true })]).toEqual([true, true, true]);
    expect([of({ mode: 'SKIP' }), of({ status: 'skipped' }), of({ behind: true })]).toEqual([false, false, false]);
  });
});

describe('the description (US-0509 FR2.7, NFR1)', () => {
  it('is one trimmed line of at most 500 characters, and not empty', () => {
    expect(checkDescription('  a dark  mode ')).toEqual({ text: 'a dark mode' });
    expect(checkDescription('x'.repeat(500))).toEqual({ text: 'x'.repeat(500) });
    expect(checkDescription('x'.repeat(501))).toEqual({ error: 'tooLong' });
    for (const empty of ['', '  \n ', '\u0007', null, undefined]) expect(checkDescription(empty)).toEqual({ error: 'empty' });
  });

  it('counts the line as it is typed, so spaces around it do not make it too long', () => {
    expect(checkDescription(`${' '.repeat(40)}${'x'.repeat(500)}\n`)).toEqual({ text: 'x'.repeat(500) });
  });

  it('every line break and control character is gone', () => {
    const ends = ['\r', '\n', '\r\n', ' ', ' ', '\u0085', '\v', '\f', '\t'];
    const controls = ['\u0000', '\u0003', '\u0008', '\u001b', '\u007f', '\u009b'];
    for (const c of [...ends, ...controls]) {
      expect(checkDescription(`a${c}b`), JSON.stringify(c)).toEqual({ text: 'a b' });
      expect(quoted(`a${c}b`), JSON.stringify(c)).toBe('"a b"');
    }
    expect(quoted('\u001b[201~\rrm')).toBe('"[201~ rm"');
  });

  it('is quoted as one argument, with \\ and " escaped', () => {
    expect(quoted('say "hi"')).toBe('"say \\"hi\\""');
    expect(quoted('back\\slash')).toBe('"back\\\\slash"');
    expect(quoted('end\\"')).toBe('"end\\\\\\""');
  });

  it('keeps letters outside ASCII', () => {
    expect(checkDescription('större än väntat – ny vy 🚀')).toEqual({ text: 'större än väntat – ny vy 🚀' });
  });
});
