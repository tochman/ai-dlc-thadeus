import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { apply, applyGuardLock, buildCommand, guardLockDiff, preview, previewGuardLock } from '../../src/main/aidlcWrite.js';

const TMP = path.resolve(__dirname, '../.tmp/aidlc-write');

/** Records every aidlc call and answers the login-shell PATH probe that runFixed makes once. */
function fakeExec(answer = 'models configuration plan: create=0 update=1') {
  const calls = [];
  const exec = vi.fn(async (file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push(args);
    if (answer instanceof Error) throw answer;
    return answer;
  });
  return { exec, calls };
}

// A memory file with `## Guard Policy` between two other sections, CRLF line in one of them.
const MEMORY = [
  '# Team-Level Rules',
  '',
  '## Testing Posture',
  '',
  'Methodology: test-after\r',
  '',
  '## Guard Policy',
  '',
  '<!-- Mode: strict, relaxed, or off. -->',
  'stray note',
  '',
  '## Deployment',
  '',
  'We deploy on merge.',
  ''
].join('\n');

describe('AI-DLC writes (EPIC-09 US-0902)', () => {
  it('builds the exact args and --dry-run args for a project default, with the target chosen explicitly (FR1.2)', () => {
    expect(buildCommand({ kind: 'project', key: 'swarm', value: 'on', where: 'local' })).toEqual({
      args: ['config', 'flags', '--swarm', 'on', '--local', '--yes'],
      dryRunArgs: ['config', 'flags', '--swarm', 'on', '--local', '--dry-run']
    });
    expect(buildCommand({ kind: 'project', key: 'plugins', value: 'aidlc,extra' }).args).toEqual(['config', 'project', '--plugins', 'aidlc,extra', '--yes']);
    expect(() => buildCommand({ kind: 'project', key: 'swarm', value: 'on' })).toThrow(); // no target: refused
  });

  it('builds engine config set for an active-work key, with no dry run', () => {
    expect(buildCommand({ kind: 'active', key: 'depth', value: 'Standard' })).toEqual({
      args: ['engine', 'config', 'set', 'depth', 'Standard'],
      dryRunArgs: null
    });
    expect(buildCommand({ kind: 'guard', key: 'AIDLC_DISABLE_REVIEW_FREEZE_HOOK', value: 'off', where: 'global' }).args).toEqual([
      'config',
      'flags',
      '--bypass',
      'AIDLC_DISABLE_REVIEW_FREEZE_HOOK',
      '--global',
      '--yes'
    ]);
    expect(buildCommand({ kind: 'guard', key: 'AIDLC_DISABLE_REVIEW_FREEZE_HOOK', value: 'on' }).args).toEqual([
      'config',
      'flags',
      '--clear-bypass',
      'AIDLC_DISABLE_REVIEW_FREEZE_HOOK',
      '--yes'
    ]);
  });

  it('refuses an unknown key, a value with a space or ;, and never runs exec (NFR4)', async () => {
    const { exec } = fakeExec();
    const bad = [
      { kind: 'active', key: 'unknown', value: 'on' },
      { kind: 'active', key: 'depth', value: 'Standard; rm -rf /' },
      { kind: 'project', key: 'defaultScope', value: 'my plan', where: 'project' },
      { kind: 'guard', key: 'AIDLC_SKIP_EVERYTHING', value: 'off', where: 'local' },
      { kind: 'shell', key: 'depth', value: 'Standard' }
    ];
    for (const change of bad) {
      await expect(apply('/p', change, { exec }), JSON.stringify(change)).rejects.toThrow();
      await expect(preview('/p', change, { exec })).rejects.toThrow();
    }
    expect(exec).not.toHaveBeenCalled();
  });

  it('the config:apply payload is refused when it carries an extra args field (NFR4, Step 12)', async () => {
    const { exec } = fakeExec();
    // ipc.js config:apply passes the renderer's payload straight to apply(), so this is the handler's check.
    await expect(apply('/p', { kind: 'active', key: 'depth', value: 'Standard', args: ['--evil'] }, { exec })).rejects.toThrow(/args/);
    await expect(apply('/p', ['active', 'depth'], { exec })).rejects.toThrow();
    expect(exec).not.toHaveBeenCalled();
  });

  it('previews with --dry-run and applies with --yes, returning the CLI error as a value', async () => {
    const ok = fakeExec('flags configuration plan: update=1\n');
    expect(await preview('/p', { kind: 'project', key: 'swarm', value: 'off', where: 'project' }, { exec: ok.exec })).toEqual({
      command: 'aidlc config flags --swarm off --project --yes',
      dryRun: 'flags configuration plan: update=1'
    });
    expect(ok.calls.at(-1)).toContain('--dry-run');
    expect(await preview('/p', { kind: 'active', key: 'sensors', value: 'on' }, { exec: ok.exec })).toEqual({
      command: 'aidlc engine config set sensors on',
      dryRun: null
    });

    const failing = fakeExec(new Error('Command failed: no active intent'));
    const res = await apply('/p', { kind: 'active', key: 'sensors', value: 'on' }, { exec: failing.exec });
    expect(res).toEqual({ ok: false, command: 'aidlc engine config set sensors on', error: 'Command failed: no active intent' });
  });
});

describe('Guard Policy lock (tier 2)', () => {
  it('changes only the ## Guard Policy section and leaves every other line byte-identical', () => {
    const { next, diff } = guardLockDiff(MEMORY, 'strict');
    const before = MEMORY.split('\n');
    const after = next.split('\n');
    const gp = before.indexOf('## Guard Policy');
    const dep = before.indexOf('## Deployment');
    expect(after.slice(0, gp + 1)).toEqual(before.slice(0, gp + 1)); // includes the CRLF line untouched
    expect(after.slice(after.indexOf('## Deployment'))).toEqual(before.slice(dep));
    expect(after.slice(gp + 1, after.indexOf('## Deployment'))).toEqual(['', '<!-- Mode: strict, relaxed, or off. -->', '- **Mode**: strict', '']);
    expect(diff).toContain('- stray note');
    expect(diff).toContain('+ - **Mode**: strict');

    expect(guardLockDiff(next, 'none').next).not.toContain('**Mode**'); // removing the lock
    expect(() => guardLockDiff('# no section\n', 'strict')).toThrow(/Guard Policy/);
    expect(() => guardLockDiff(MEMORY, 'strict; rm')).toThrow();
  });

  describe('on disk', () => {
    let root;
    const rel = 'aidlc/spaces/default/memory/team.md';
    beforeAll(async () => {
      await fs.rm(TMP, { recursive: true, force: true });
      await fs.mkdir(path.join(TMP, 'aidlc/spaces/default/memory'), { recursive: true });
      await fs.writeFile(path.join(TMP, rel), MEMORY);
      root = await openRoot(TMP);
    });
    afterAll(() => fs.rm(TMP, { recursive: true, force: true }));

    it('writes only after re-reading the file unchanged, and refuses a layer outside the table', async () => {
      const shown = await previewGuardLock(root, { space: 'default', layer: 'team', mode: 'strict' });
      expect(shown.file).toBe(rel);
      await fs.appendFile(path.join(TMP, rel), 'edited meanwhile\n');
      await expect(applyGuardLock(root, { space: 'default', layer: 'team', mode: 'strict' }, shown.before)).rejects.toThrow();

      const again = await previewGuardLock(root, { space: 'default', layer: 'team', mode: 'strict' });
      await applyGuardLock(root, { space: 'default', layer: 'team', mode: 'strict' }, again.before);
      expect(await fs.readFile(path.join(TMP, rel), 'utf8')).toBe(again.next);
      await expect(previewGuardLock(root, { space: 'default', layer: '../../etc', mode: 'strict' })).rejects.toThrow();
      await expect(previewGuardLock(root, { space: '../x', layer: 'team', mode: 'strict' })).rejects.toThrow();
    });
  });
});
