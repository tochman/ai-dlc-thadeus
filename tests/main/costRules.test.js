import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { applyCostRules, blockState, costRulesStatus, findClashes, previewCostRules, targetFile, withBlock } from '../../src/main/costRules.js';
import { COST_RULES_END, COST_RULES_PACK, COST_RULES_START } from '../../src/shared/costRules.js';

const TMP = path.resolve(__dirname, '../.tmp/cost-rules');

const ONE_COMMITTER = 'On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them.';

const PROJECT = ['# Project-Level Rules', '', '## Corrections', '', '- ALWAYS keep stage documents short.', ''].join('\n');

describe('cost rule block (US-0212 FR2)', () => {
  it('adds the block at the end of a file without one (FR2.2)', () => {
    const next = withBlock(PROJECT, ['ALWAYS be brief.']);
    expect(next.startsWith(PROJECT)).toBe(true);
    expect(next.slice(PROJECT.length)).toBe(`${COST_RULES_START}\n- ALWAYS be brief.\n${COST_RULES_END}\n`);
    expect(blockState(next)).toEqual({ state: 'present', lines: ['ALWAYS be brief.'] });
  });

  it('replaces only the content between the markers; bytes outside stay identical (FR2.1)', () => {
    const before = `head\r\n${COST_RULES_START}\n- old line\n${COST_RULES_END}\r\ntail\n`;
    const next = withBlock(before, ['new one', 'new two']);
    expect(next).toBe(`head\r\n${COST_RULES_START}\n- new one\n- new two\n${COST_RULES_END}\r\ntail\n`);
  });

  it('turning off removes the markers and gives back the file as it was before the pack (FR2.3)', () => {
    for (const original of [PROJECT, 'no final newline', '']) {
      const on = withBlock(original, COST_RULES_PACK.project);
      expect(Buffer.from(withBlock(on, null))).toEqual(Buffer.from(original));
    }
    expect(withBlock(PROJECT, null)).toBe(PROJECT); // already off
  });

  it('refuses a broken marker pair and names the problem (FR2.4)', () => {
    expect(blockState(`a\n${COST_RULES_START}\nb\n`)).toEqual({ state: 'broken', problem: 'onlyStart' });
    expect(blockState(`a\n${COST_RULES_END}\n`)).toEqual({ state: 'broken', problem: 'onlyEnd' });
    expect(blockState(`${COST_RULES_END}\nx\n${COST_RULES_START}\n`)).toEqual({ state: 'broken', problem: 'startAfterEnd' });
    expect(blockState(`${COST_RULES_START}\n${COST_RULES_END}\n${COST_RULES_START}\n${COST_RULES_END}\n`)).toEqual({ state: 'broken', problem: 'twice' });
    expect(() => withBlock(`a\n${COST_RULES_START}\n`, ['x'])).toThrow(/onlyStart/);
  });

  it('refuses lines that could break the block', () => {
    expect(() => withBlock(PROJECT, ['two\nlines'])).toThrow();
    expect(() => withBlock(PROJECT, [`sneaky ${COST_RULES_END}`])).toThrow();
    expect(() => withBlock(PROJECT, 'not a list')).toThrow();
  });
});

describe('cost rule targets (US-0212 NFR1)', () => {
  it('maps a space and a target to its memory file, and refuses anything outside the table', () => {
    expect(targetFile('default', 'project')).toBe('aidlc/spaces/default/memory/project.md');
    expect(targetFile('team-b', 'phases/construction')).toBe('aidlc/spaces/team-b/memory/phases/construction.md');
    for (const target of ['team', 'org', 'phases/../team', '../project', 'aidlc-state']) {
      expect(() => targetFile('default', target)).toThrow();
    }
    for (const space of ['..', 'a/b', '', 'Default', null]) expect(() => targetFile(space, 'project')).toThrow();
  });
});

describe('cost rule clashes (US-0212 FR6)', () => {
  const rules = [
    {
      space: 'default',
      file: 'aidlc/spaces/default/memory/team.md',
      text: '# Team\n\n- **Suite green before merge**: the full suite must pass.\n- Other rule.\n'
    },
    { space: 'team-b', file: 'aidlc/spaces/team-b/memory/org.md', text: 'Nothing about tests here.\n' }
  ];

  it('quotes the pack line, the clashing rule, its file and space (FR6.1, FR6.2)', () => {
    const line = COST_RULES_PACK['phases/construction'][0];
    const found = findClashes([line, 'ALWAYS be brief.'], rules);
    expect(found).toContainEqual({ line, rule: '- **Suite green before merge**: the full suite must pass.', file: rules[0].file, space: 'default' });
    expect(found.every((c) => c.line === line && c.space === 'default')).toBe(true);
  });

  it('checks edited lines too, either way round, and finds nothing for a harmless pack', () => {
    expect(findClashes(['Run all tests before merge.'], [{ space: 's', file: 'f', text: 'Run only the test being worked on.' }])).toHaveLength(1);
    expect(findClashes(['ALWAYS be brief.'], rules)).toEqual([]);
  });

  it('the shipped pack carries the one-committer rule for feature docs on main (US-0032 AC1, AC5)', () => {
    expect(COST_RULES_PACK.project).toContain(ONE_COMMITTER);
  });

  it("the one-committer rule finds no clash with this repository's team.md (US-0032 AC4)", async () => {
    const file = 'aidlc/spaces/default/memory/team.md';
    const team = await fs.readFile(path.resolve(__dirname, '../..', file), 'utf8');
    expect(team).toContain('Docs and small chores may go straight to `main`');
    expect(findClashes([ONE_COMMITTER], [{ space: 'default', file, text: team }])).toEqual([]);
  });

  it('the shipped pack is at most 8 lines and 800 characters (NFR2)', () => {
    const lines = Object.values(COST_RULES_PACK).flat();
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(lines.join('').length).toBeLessThanOrEqual(800);
  });
});

/** Records every aidlc call and answers the login-shell PATH probe that runFixed makes once. */
function fakeExec(answer = 'compiled') {
  const calls = [];
  const exec = vi.fn(async (file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push(args);
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { exec, calls };
}

const fail = (props) => Object.assign(new Error(props.message ?? 'failed'), props);

describe('cost rule files (US-0212 FR1.2, FR3, FR5)', () => {
  const SPACES = ['default', 'team-b'];
  const MEMORY = ['project', 'team', 'org', 'phases/construction'];
  const text = (space, file) => `# ${file} of ${space}\n\n${file === 'team' ? '- **Suite green before merge**: the full suite must pass.\n' : 'Some rule.\n'}`;
  const rel = (space, file) => `aidlc/spaces/${space}/memory/${file}.md`;
  const read = (space, file) => fs.readFile(path.join(TMP, rel(space, file)));
  let root;
  let original;

  beforeEach(async () => {
    await fs.rm(TMP, { recursive: true, force: true });
    original = {};
    for (const space of SPACES) {
      await fs.mkdir(path.join(TMP, `aidlc/spaces/${space}/memory/phases`), { recursive: true });
      for (const file of MEMORY) {
        await fs.writeFile(path.join(TMP, rel(space, file)), text(space, file));
        original[rel(space, file)] = Buffer.from(text(space, file));
      }
    }
    root = await openRoot(TMP);
  });
  afterAll(() => fs.rm(TMP, { recursive: true, force: true }));

  const allOriginal = async () => {
    for (const space of SPACES) for (const file of MEMORY) expect(await read(space, file)).toEqual(original[rel(space, file)]);
  };

  it('status names every space and whether each target file holds the block (FR1.2, FR3.2)', async () => {
    await fs.appendFile(path.join(TMP, rel('team-b', 'project')), `${COST_RULES_START}\n- Mine.\n${COST_RULES_END}\n`);
    const status = await costRulesStatus(root);
    expect(status.spaces.map((s) => s.space)).toEqual(SPACES);
    expect(status.spaces[0].files).toEqual([
      { target: 'project', file: rel('default', 'project'), state: 'absent' },
      { target: 'phases/construction', file: rel('default', 'phases/construction'), state: 'absent' }
    ]);
    expect(status.spaces[1].files[0]).toEqual({ target: 'project', file: rel('team-b', 'project'), state: 'present' });
    expect(status.on).toBe(true);
    expect(status.lines).toEqual({ project: ['Mine.'], 'phases/construction': COST_RULES_PACK['phases/construction'] });
  });

  it('status starts from the shipped pack when no space has the block', async () => {
    const status = await costRulesStatus(root);
    expect(status.on).toBe(false);
    expect(status.lines).toEqual(COST_RULES_PACK);
  });

  it('status offers the shipped lines a present block lacks, and nothing for a full pack or no block (US-0032 AC1)', async () => {
    expect((await costRulesStatus(root)).missing).toEqual({});
    const older = COST_RULES_PACK.project.filter((l) => l !== ONE_COMMITTER);
    await fs.appendFile(path.join(TMP, rel('default', 'project')), withBlock('', older));
    expect((await costRulesStatus(root)).missing).toEqual({ project: [ONE_COMMITTER] });
    await fs.writeFile(path.join(TMP, rel('default', 'project')), withBlock(text('default', 'project'), COST_RULES_PACK.project));
    expect((await costRulesStatus(root)).missing).toEqual({});
  });

  it('preview gives one diff per file and space with the clash warnings, and writes nothing (FR5.1, FR6)', async () => {
    const { changes, errors, warnings } = await previewCostRules(root, { on: true, lines: COST_RULES_PACK });
    expect(changes.map((c) => c.file)).toEqual(SPACES.flatMap((s) => [rel(s, 'project'), rel(s, 'phases/construction')]));
    expect(changes[0].diff).toContain(`+ - ${COST_RULES_PACK.project[0]}`);
    expect(errors).toEqual([]);
    expect(warnings.map((w) => [w.space, w.file])).toEqual(SPACES.map((s) => [s, rel(s, 'team')]));
    await allOriginal();
  });

  it('a broken marker pair is an error for that file, which is left out (FR2.4)', async () => {
    await fs.appendFile(path.join(TMP, rel('team-b', 'phases/construction')), `${COST_RULES_START}\n`);
    const { changes, errors } = await previewCostRules(root, { on: true, lines: COST_RULES_PACK });
    expect(errors).toEqual([{ space: 'team-b', file: rel('team-b', 'phases/construction'), problem: 'onlyStart' }]);
    expect(changes.map((c) => c.file)).not.toContain(rel('team-b', 'phases/construction'));
  });

  it('refuses lines for a target outside the table (NFR1)', async () => {
    await expect(previewCostRules(root, { on: true, lines: { ...COST_RULES_PACK, team: ['x'] } })).rejects.toThrow();
    await expect(previewCostRules(root, { on: true, lines: { project: ['x'] } })).rejects.toThrow();
  });

  it('apply refuses a file changed since the preview and writes nothing (FR5.2)', async () => {
    const { changes } = await previewCostRules(root, { on: true, lines: COST_RULES_PACK });
    await fs.appendFile(path.join(TMP, rel('team-b', 'project')), 'edited meanwhile\n');
    const { exec, calls } = fakeExec();
    await expect(applyCostRules(root, changes, { exec })).rejects.toThrow(rel('team-b', 'project'));
    expect(calls).toEqual([]);
    expect(await read('default', 'project')).toEqual(original[rel('default', 'project')]);
  });

  it('apply writes the block, runs the compile with fixed arguments and returns its output (FR5.3)', async () => {
    const { changes } = await previewCostRules(root, { on: true, lines: COST_RULES_PACK });
    const { exec, calls } = fakeExec('graph compiled');
    const result = await applyCostRules(root, changes, { exec });
    expect(result).toMatchObject({ ok: true, output: 'graph compiled', files: changes.map((c) => c.file) });
    expect(calls).toEqual([['engine', 'graph', 'compile']]);
    expect(blockState(String(await read('team-b', 'phases/construction')))).toEqual({ state: 'present', lines: COST_RULES_PACK['phases/construction'] });
    // Turning it off again gives every file back byte for byte (FR2.3).
    const off = await previewCostRules(root, { on: false, lines: COST_RULES_PACK });
    await applyCostRules(root, off.changes, { exec });
    await allOriginal();
  });

  it('a failing compile, a timeout or a missing aidlc puts every written file back and says so (FR5.4)', async () => {
    for (const err of [fail({ code: 1, message: 'graph broken' }), fail({ killed: true }), fail({ code: 'ENOENT', message: 'spawn aidlc ENOENT' })]) {
      const { changes } = await previewCostRules(root, { on: true, lines: COST_RULES_PACK });
      const result = await applyCostRules(root, changes, { exec: fakeExec(err).exec });
      expect(result).toMatchObject({ ok: false, restored: true, files: changes.map((c) => c.file) });
      expect(result.error).toBeTruthy();
      await allOriginal();
    }
  });
});
