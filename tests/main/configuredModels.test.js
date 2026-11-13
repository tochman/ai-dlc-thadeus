import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { openRoot } from '../../src/main/projectAccess.js';
import { getConfiguredModels } from '../../src/main/models.js';

const PROJECT = path.resolve(__dirname, '../fixtures/project');

// Same envelope `aidlc config models --show --json --harness claude` prints.
const CONFIG_OUTPUT = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  data: {
    harness: 'claude',
    effective: [
      { agent: 'architect', group: 'deciding', model: 'inherit', modelSource: 'shipped default' },
      { agent: 'architecture-reviewer', model: 'sonnet', effort: 'medium', modelSource: 'shipped default' }
    ]
  }
});

describe('getConfiguredModels', () => {
  it('uses the config command with fixed args, the project root and a 10 s timeout (FR4.1)', async () => {
    const root = await openRoot(PROJECT);
    const calls = [];
    const exec = async (file, args, opts) => {
      calls.push({ file, args, opts });
      return file === 'aidlc' ? CONFIG_OUTPUT : 'rc-noise\n__AIDLC_DASH_PATH__/opt/bin:/usr/bin';
    };
    const res = await getConfiguredModels(root, { exec });

    expect(res).toEqual({
      source: 'aidlc-config',
      agents: [
        { agent: 'architect', model: 'inherit', effort: null },
        { agent: 'architecture-reviewer', model: 'sonnet', effort: 'medium' }
      ]
    });
    const call = calls.find((c) => c.file === 'aidlc');
    expect(call.args).toEqual(['config', 'models', '--show', '--json', '--harness', 'claude']);
    expect(call.opts).toMatchObject({ cwd: root, timeout: 10000 });
    expect(call.opts.env.PATH).toBe('/opt/bin:/usr/bin');
    expect(call.opts.shell).toBeUndefined();
  });

  it('falls back to the agent files on a missing command, a timeout or invalid JSON (FR4.2)', async () => {
    const root = await openRoot(PROJECT);
    const failures = [
      async () => {
        throw Object.assign(new Error('spawn ENOENT'), { code: 'ENOENT' });
      },
      async () => {
        throw Object.assign(new Error('Command failed'), { killed: true, signal: 'SIGTERM' });
      },
      async () => 'not json'
    ];
    for (const exec of failures) {
      const res = await getConfiguredModels(root, { exec });
      expect(res.source).toBe('agent-files');
      expect(res.agents).toEqual([
        { agent: 'architect', model: 'inherit', effort: null },
        { agent: 'developer', model: 'sonnet', effort: 'high' }
      ]);
      expect(res.error).toMatch(/misslyckades/);
    }
  });
});
