// US-0506 u4 RD30, SD35, NFR4.9: the commands a real Install writes, run as Claude Code runs them, with the app absent.
// Real time (the `scripts` project, after the others), under sh and dash.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { FILES, KINDS, command, createHookInstaller } from '../../src/main/agentHooks.js';
import { SHELLS } from '../helpers/shells.js';
import { removeProject, tempProject } from '../helpers/agentHooksFixtures.js';

let root, commands;
const noWatch = () => ({ ready: Promise.resolve(), close: async () => {} });
// The full matrix intentionally launches hundreds of real shells; do not let Vitest's 5 s default retry an otherwise
// healthy case just because the test matrix itself takes longer than five seconds on a loaded machine.
vi.setConfig({ testTimeout: 30_000 });

beforeAll(async () => {
  root = await tempProject('a b "c" $d-');
  const installer = createHookInstaller({ log: () => {}, watch: noWatch });
  await installer.openProject('g', root);
  const pv = await installer.preview('g', 'claude', 'install');
  expect((await installer.apply('g', pv.previewId)).result).toBe('written');
  await installer.closeProject('g');
  const settings = JSON.parse(await fs.readFile(path.join(root, FILES.settings), 'utf8'));
  commands = Object.values(settings.hooks).flatMap((groups) => groups.flatMap((g) => g.hooks.map((h) => h.command)));
});
afterAll(() => removeProject(root));

const CASES = [
  ['THADEUS_SESSION_DIR unset', () => ({ CLAUDE_PROJECT_DIR: root })],
  ['dialog.sh deleted', () => ({ CLAUDE_PROJECT_DIR: root, THADEUS_SESSION_DIR: path.join(root, 'session') })],
  ['CLAUDE_PROJECT_DIR unset', () => ({ THADEUS_SESSION_DIR: path.join(root, 'session') })],
  ['CLAUDE_PROJECT_DIR empty', () => ({ THADEUS_SESSION_DIR: path.join(root, 'session'), CLAUDE_PROJECT_DIR: '' })]
];

describe('the installed commands (RD30)', () => {
  it('equal the canonical strings byte for byte, also in a root named a b "c" $d (SD35)', () => {
    expect([...commands].sort()).toEqual(KINDS.map(command).sort());
  });

  describe.each(SHELLS)('under %s', (shell) => {
    it.each(CASES)('exit 0 silently within 100 ms, 20 times each, with %s', async (name, env) => {
      if (name === 'dialog.sh deleted') await fs.rm(path.join(root, FILES.script), { force: true });
      for (const cmd of commands) {
        for (let i = 0; i < 20; i++) {
          // Bound the child itself. Timing spawnSync from the parent also counts time the parent is descheduled after
          // the child exited, creating false >100 ms failures under load; spawnSync's timeout preserves RD30's hard
          // wall-clock limit for the installed command without attributing parent scheduling pauses to the hook.
          const run = spawnSync(shell, ['-c', cmd], { env: { PATH: process.env.PATH, ...env() }, timeout: 100 });
          expect(run.error?.code).not.toBe('ETIMEDOUT');
          expect({ status: run.status, out: run.stdout.length, err: run.stderr.length }).toEqual({ status: 0, out: 0, err: 0 });
        }
      }
    });
  });
});
