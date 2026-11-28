import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { applyHookEdit, previewHookEdit } from '../../src/main/speckitHooksEdit.js';

const roots = [];
async function project(text) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-hook-edit-'));
  roots.push(root);
  await fs.mkdir(path.join(root, '.specify'), { recursive: true });
  if (text !== null) await fs.writeFile(path.join(root, '.specify/extensions.yml'), text);
  return root;
}
afterEach(async () => Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))));

describe('US-0906 Spec Kit hook edit', () => {
  it('previews a hook without writing, then applies while preserving YAML comments', async () => {
    const original = '# keep this note\ninstalled: [git]\nhooks:\n  before_specify:\n    - extension: git\n      command: git.commit\n';
    const root = await project(original);
    const edit = { action: 'add', extension: 'git', command: 'git.push', when: 'after', target: 'plan', mode: 'optional' };
    const preview = await previewHookEdit(root, edit);
    expect(preview.diff).toContain('after_plan');
    expect(await fs.readFile(path.join(root, '.specify/extensions.yml'), 'utf8')).toBe(original);
    await applyHookEdit(root, edit, preview.before);
    const saved = await fs.readFile(path.join(root, '.specify/extensions.yml'), 'utf8');
    expect(saved).toContain('# keep this note');
    expect(saved).toContain('git.push');
  });

  it('refuses apply after an external edit and refuses paths outside the project root', async () => {
    const root = await project('installed: [git]\n');
    const preview = await previewHookEdit(root, { action: 'add', extension: 'git', command: 'git.push', when: 'before', target: 'plan' });
    await fs.writeFile(path.join(root, '.specify/extensions.yml'), 'installed: [git]\n# outside edit\n');
    await expect(applyHookEdit(root, { action: 'add', extension: 'git', command: 'git.push', when: 'before', target: 'plan' }, preview.before)).rejects.toThrow(
      /changed/i
    );
    await expect(previewHookEdit(root, { action: 'add', extension: '../x', command: 'git.push', when: 'before', target: 'plan' })).rejects.toThrow();
  });
});
