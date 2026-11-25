// US-1402 FR6, BR6.1–BR6.10, NFR3.3, NFR3.4, NFR5.1, NFR7.3: Spec Kit's features read from real temp folders (contract C5).
// US-1411 FR2.3, FR3.6, FR4.2–FR4.4, NFR2, NFR3: which features are archived, from the marks in .thadeus/archived/.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { t } from '../../src/shared/i18n.js';
import { MAX_READ_BYTES, SPECKIT_WATCH_PATHS, activeFeature, listedFeatures, loadSpeckitFeatures } from '../../src/main/speckitFeatures.js';
import { spyWrites } from './fsWriteSpy.js';

const roots = [];
/** A project from `{ 'rel/path': text }`; a key ending in `/` is an empty folder. */
async function project(tree = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-features-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(tree)) {
    const abs = path.join(root, rel);
    if (rel.endsWith('/')) await fs.mkdir(abs, { recursive: true });
    else {
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content);
    }
  }
  return root;
}
const featureJson = (dir) => JSON.stringify({ feature_directory: dir });
const reason = (key, values) => t(`speckit.reason.${key}`, values);
const one = async (root, dir) => (await loadSpeckitFeatures(root)).features.find((f) => f.dir === dir);

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await fs.chmod(path.join(root, 'specs/001-a/tasks.md'), 0o644).catch(() => {});
    await fs.rm(root, { recursive: true, force: true });
  }
});

describe('loadSpeckitFeatures: the list (BR6.1)', () => {
  it('reads numbered, timestamped and unnumbered folders, sorted by folder name', async () => {
    const root = await project({
      'specs/002-photos/': null,
      'specs/20261120-101500-search/': null,
      'specs/001-albums/': null,
      'specs/notes/': null,
      'specs/README.md': 'x'
    });
    const r = await loadSpeckitFeatures(root);
    expect(r.features.map((f) => [f.dir, f.number, f.name])).toEqual([
      ['001-albums', '001', 'albums'],
      ['002-photos', '002', 'photos'],
      ['20261120-101500-search', '20261120-101500', 'search'],
      ['notes', null, 'notes']
    ]);
    expect(r.errors).toEqual([]);
  });

  it('gives no features and no error when specs/ is missing', async () => {
    expect(await loadSpeckitFeatures(await project({ '.specify/': null }))).toEqual({
      version: { found: null, supported: false },
      features: [],
      active: null,
      activeMarked: false,
      errors: []
    });
  });
});

describe('loadSpeckitFeatures: the active feature (BR6.2, NFR3.3, NFR3.4)', () => {
  it('is the folder feature.json names by a relative path', async () => {
    const root = await project({ 'specs/001-a/': null, 'specs/002-b/': null, '.specify/feature.json': featureJson('specs/002-b') });
    const r = await loadSpeckitFeatures(root);
    expect(r.active).toBe('002-b');
    expect(r.features.map((f) => f.active)).toEqual([false, true]);
  });

  it('is the folder feature.json names by an absolute path', async () => {
    const root = await project({ 'specs/001-a/': null, '.specify/': null });
    await fs.writeFile(path.join(root, '.specify/feature.json'), featureJson(path.join(root, 'specs/001-a')));
    expect((await loadSpeckitFeatures(root)).active).toBe('001-a');
  });

  it('is null with no error when feature.json is missing', async () => {
    const r = await loadSpeckitFeatures(await project({ 'specs/001-a/': null }));
    expect(r.active).toBeNull();
    expect(r.errors).toEqual([]);
  });

  it('is null with a reason when feature.json is invalid or names a missing folder', async () => {
    const bad = await loadSpeckitFeatures(await project({ 'specs/001-a/': null, '.specify/feature.json': '{ not json' }));
    expect(bad.active).toBeNull();
    expect(bad.errors).toEqual([{ path: '.specify/feature.json', reason: reason('invalid') }]);
    const gone = await loadSpeckitFeatures(await project({ 'specs/001-a/': null, '.specify/feature.json': featureJson('specs/009-gone') }));
    expect(gone.active).toBeNull();
    expect(gone.errors).toEqual([{ path: '.specify/feature.json', reason: reason('missing') }]);
  });

  it('is null with a reason when feature.json points outside the project or through a link', async () => {
    const outside = await project({ 'elsewhere/': null });
    const root = await project({ 'specs/001-a/': null, '.specify/feature.json': featureJson(path.join(outside, 'elsewhere')) });
    const out = await loadSpeckitFeatures(root);
    expect(out.active).toBeNull();
    expect(out.errors).toEqual([{ path: '.specify/feature.json', reason: reason('outsideRoot') }]);

    const linked = await project({ 'specs/001-a/': null, '.specify/feature.json': featureJson('specs/002-link') });
    await fs.symlink(path.join(linked, 'specs/001-a'), path.join(linked, 'specs/002-link'));
    const r = await loadSpeckitFeatures(linked);
    expect(r.active).toBeNull();
    expect(r.features.map((f) => f.dir)).toEqual(['001-a']);
    expect(r.errors).toEqual([
      { path: 'specs/002-link', reason: reason('link') },
      { path: '.specify/feature.json', reason: reason('link') }
    ]);
  });
});

describe('loadSpeckitFeatures: the flow (BR6.3)', () => {
  const TASKS = '## Phase 1: Setup\n- [x] T001 One\n- [X] T002 Two\n';
  it('marks each step from the files', async () => {
    const root = await project({
      'specs/001-a/spec.md': '# Spec\n',
      'specs/002-b/spec.md': '# Spec\n\n## Clarifications\n\n### Session 2026-11-20\n',
      'specs/002-b/plan.md': '# Plan',
      'specs/002-b/tasks.md': '## Phase 1: Setup\n- [x] T001 One\n- [ ] T002 Two\n',
      'specs/003-c/': null
    });
    const r = await loadSpeckitFeatures(root);
    expect(r.features.map((f) => f.flow)).toEqual([
      { spec: true, clarify: false, plan: false, tasks: false, implement: false, converge: false },
      { spec: true, clarify: true, plan: true, tasks: true, implement: false, converge: false },
      { spec: false, clarify: false, plan: false, tasks: false, implement: false, converge: false }
    ]);
    expect(r.features[1].tasks).toMatchObject({ done: 1, total: 2, skipped: 0 });
    expect(r.features[0].tasks).toEqual({ done: 0, total: 0, skipped: 0, phases: [] });
  });

  it('counts implement done with only Convergence tasks left, and converge done with a ticked round', async () => {
    const root = await project({
      'specs/001-a/tasks.md': `${TASKS}## Phase 2: Convergence\n- [ ] T003 Gap\n`,
      'specs/002-b/tasks.md': `${TASKS}## Phase 2: Convergence\n- [x] T003 Gap\n`,
      'specs/003-c/tasks.md': '# Tasks\n'
    });
    const [a, b, c] = (await loadSpeckitFeatures(root)).features;
    expect([a.flow.implement, a.flow.converge]).toEqual([true, false]);
    expect([b.flow.implement, b.flow.converge]).toEqual([true, true]);
    expect([c.flow.tasks, c.flow.implement, c.flow.converge]).toEqual([true, false, false]);
  });
});

describe('loadSpeckitFeatures: files and links (BR6.5, NFR3.4)', () => {
  it('lists files root-relative with one subfolder level, sorted, links left out', async () => {
    const root = await project({
      'specs/001-a/spec.md': 's',
      'specs/001-a/plan.md': 'p',
      'specs/001-a/contracts/api.yaml': 'c',
      'specs/001-a/checklists/ux.md': 'u',
      'specs/001-a/checklists/deep/too-far.md': 'x',
      'secret.txt': 'secret'
    });
    await fs.symlink(path.join(root, 'secret.txt'), path.join(root, 'specs/001-a/linked.md'));
    expect((await one(root, '001-a')).files).toEqual([
      'specs/001-a/checklists/ux.md',
      'specs/001-a/contracts/api.yaml',
      'specs/001-a/plan.md',
      'specs/001-a/spec.md'
    ]);
  });

  it('reads no features through a linked specs/ and names it', async () => {
    const elsewhere = await project({ 'specs/001-a/spec.md': 's' });
    const root = await project({ '.specify/': null });
    await fs.symlink(path.join(elsewhere, 'specs'), path.join(root, 'specs'));
    const r = await loadSpeckitFeatures(root);
    expect(r.features).toEqual([]);
    expect(r.errors).toEqual([{ path: 'specs', reason: reason('link') }]);
  });
});

describe('loadSpeckitFeatures: the version (BR6.9)', () => {
  const version = async (tree) => (await loadSpeckitFeatures(await project(tree))).version;
  it('supports 1.4.x and names any other version', async () => {
    expect(await version({ '.specify/init-options.json': JSON.stringify({ speckit_version: '1.4.3' }) })).toEqual({ found: '1.4.3', supported: true });
    expect(await version({ '.specify/init-options.json': JSON.stringify({ speckit_version: '1.5.0' }) })).toEqual({ found: '1.5.0', supported: false });
    expect(await version({ '.specify/init-options.json': JSON.stringify({ speckit_version: '1.3.0' }) })).toEqual({ found: '1.3.0', supported: false });
  });

  it('falls back to the manifest, and gives found null when neither has it', async () => {
    expect(await version({ '.specify/integrations/speckit.manifest.json': JSON.stringify({ version: '1.4.0' }) })).toEqual({ found: '1.4.0', supported: true });
    expect(await version({ '.specify/init-options.json': JSON.stringify({ ai: 'claude' }) })).toEqual({ found: null, supported: false });
  });
});

describe('loadSpeckitFeatures: what cannot be read (BR6.10, NFR5.1)', () => {
  it('names an unreadable tasks.md, a file over 1 MB and a non-UTF-8 file, and still shows every feature', async () => {
    const root = await project({
      'specs/001-a/spec.md': 's',
      'specs/001-a/tasks.md': '## Phase 1: Setup\n- [x] T001 One\n',
      'specs/002-b/spec.md': `# Big\n${'x'.repeat(1024 * 1024)}`,
      'specs/003-c/tasks.md': Buffer.from([0x2d, 0x20, 0x5b, 0xff, 0xfe, 0x5d]),
      'specs/004-d/spec.md': '# Fine\n'
    });
    await fs.chmod(path.join(root, 'specs/001-a/tasks.md'), 0o000);
    const r = await loadSpeckitFeatures(root);
    expect(r.features.map((f) => f.dir)).toEqual(['001-a', '002-b', '003-c', '004-d']);
    expect(r.errors).toEqual([
      { path: 'specs/001-a/tasks.md', reason: reason('unreadable', { code: 'EACCES' }) },
      { path: 'specs/002-b/spec.md', reason: reason('tooLarge') },
      { path: 'specs/003-c/tasks.md', reason: reason('notUtf8') }
    ]);
    expect(r.features[0].flow).toMatchObject({ spec: true, tasks: false });
    expect(r.features[1].flow).toMatchObject({ spec: false, clarify: false });
    expect(r.features[2].flow.tasks).toBe(false);
    expect(r.features[3].flow.spec).toBe(true);
  });
});

describe('loadSpeckitFeatures: read-only (BR6.6, NFR3.1)', () => {
  it('makes no fs write call on a full project', async () => {
    const root = await project({
      '.specify/feature.json': featureJson('specs/001-a'),
      '.specify/init-options.json': JSON.stringify({ speckit_version: '1.4.3' }),
      'specs/001-a/spec.md': '# Spec\n## Clarifications\n',
      'specs/001-a/plan.md': 'p',
      'specs/001-a/tasks.md': '## Phase 1: Setup\n- [x] T001 One\n',
      'specs/001-a/contracts/api.yaml': 'c'
    });
    const writes = spyWrites();
    try {
      expect((await loadSpeckitFeatures(root)).active).toBe('001-a');
      expect(writes.calls()).toEqual([]);
    } finally {
      writes.restore();
    }
  });

  it('makes no fs write call on the error paths (link, invalid feature.json, too large)', async () => {
    const root = await project({ '.specify/feature.json': '{', 'specs/001-a/spec.md': 'x'.repeat(MAX_READ_BYTES + 1), 'secret.txt': 's' });
    await fs.symlink(path.join(root, 'secret.txt'), path.join(root, 'specs/002-link'));
    const writes = spyWrites();
    try {
      expect((await loadSpeckitFeatures(root)).errors).toHaveLength(3);
      expect(writes.calls()).toEqual([]);
    } finally {
      writes.restore();
    }
  });
});

describe('loadSpeckitFeatures: speed (NFR7.3)', () => {
  it('reads 50 features with a 500-line tasks.md each within 500 ms', async () => {
    const lines = Array.from({ length: 500 }, (_, i) =>
      i % 50 === 0 ? `## Phase ${i / 50 + 1}: Part` : `- [${i % 2 ? 'x' : ' '}] T${i} [P] [US1] Task ${i}`
    ).join('\n');
    const tree = {};
    for (let i = 1; i <= 50; i++) {
      const dir = `specs/${String(i).padStart(3, '0')}-f`;
      tree[`${dir}/spec.md`] = '# Spec\n## Clarifications\n';
      tree[`${dir}/plan.md`] = '# Plan';
      tree[`${dir}/tasks.md`] = lines;
    }
    const root = await project(tree);
    const start = performance.now();
    const r = await loadSpeckitFeatures(root);
    expect(performance.now() - start).toBeLessThan(500);
    expect(r.features).toHaveLength(50);
    expect(r.features[0].tasks.total).toBe(490);
  });
});

describe('activeFeature (US-1409 BR2.1)', () => {
  it('gives the folder feature.json names when it is a listed feature folder', async () => {
    const root = await project({ 'specs/001-login/': null, '.specify/feature.json': featureJson('specs/001-login') });
    expect(await activeFeature(root)).toBe('001-login');
  });

  it('gives null for a missing or unreadable feature.json and for a folder that is not there', async () => {
    expect(await activeFeature(await project({ 'specs/001-login/': null }))).toBeNull();
    expect(await activeFeature(await project({ 'specs/001-login/': null, '.specify/feature.json': '{not json' }))).toBeNull();
    expect(await activeFeature(await project({ 'specs/001-login/': null, '.specify/feature.json': featureJson('specs/002-gone') }))).toBeNull();
  });
});

describe('the archive marks (US-1411)', () => {
  const archived = (r) => r.features.filter((f) => f.archived).map((f) => f.dir);
  const mark = (dir) => ({ [`.thadeus/archived/${dir}.json`]: '{"version": 1}\n' });

  it('gives each feature archived from its mark, with the same flow, tasks and files as before', async () => {
    const tree = { 'specs/001-a/spec.md': '# Spec\n', 'specs/001-a/tasks.md': '- [ ] T001 One\n', 'specs/002-b/': null };
    const [plain] = (await loadSpeckitFeatures(await project(tree))).features;
    expect(plain.archived).toBe(false);
    const r = await loadSpeckitFeatures(await project({ ...tree, ...mark('001-a') }));
    expect(r.features).toHaveLength(2);
    expect(r.features[0]).toEqual({ ...plain, archived: true });
    expect(archived(r)).toEqual(['001-a']);
    expect(r).toMatchObject({ activeMarked: false, errors: [] });
  });

  it('shows the active feature as not archived, and says that it is marked (FR2.3)', async () => {
    const tree = { 'specs/001-a/': null, 'specs/002-b/': null, '.specify/feature.json': featureJson('specs/001-a') };
    const r = await loadSpeckitFeatures(await project({ ...tree, ...mark('001-a'), ...mark('002-b') }));
    expect(archived(r)).toEqual(['002-b']);
    expect(r).toMatchObject({ active: '001-a', activeMarked: true });
    expect((await loadSpeckitFeatures(await project({ ...tree, ...mark('002-b') }))).activeMarked).toBe(false);
  });

  it('ignores a mark whose feature folder is gone, and uses it again when the folder is back (FR4.3)', async () => {
    const root = await project({ 'specs/001-a/': null, ...mark('009-gone') });
    expect(await loadSpeckitFeatures(root)).toMatchObject({ features: [{ dir: '001-a', archived: false }], errors: [] });
    await fs.mkdir(path.join(root, 'specs/009-gone'));
    expect(archived(await loadSpeckitFeatures(root))).toEqual(['009-gone']);
  });

  it('matches a folder and its mark in NFC, whichever form each is stored in', async () => {
    const dir = '001-fotoalbum-å';
    const r = await loadSpeckitFeatures(await project({ [`specs/${dir.normalize('NFD')}/`]: null, ...mark(dir.normalize('NFC')) }));
    expect(r.features.map((f) => f.archived)).toEqual([true]);
  });

  it('shows every feature, with the reason, when the marks cannot be read (FR4.4)', async () => {
    const r = await loadSpeckitFeatures(await project({ 'specs/001-a/': null, '.thadeus/archived': 'a file' }));
    expect(archived(r)).toEqual([]);
    expect(r.errors).toEqual([{ path: '.thadeus/archived', reason: reason('notFolder') }]);
  });

  it('lists the marks once and reads none of them, and writes nothing (NFR2, FR4.2)', async () => {
    const tree = { 'specs/001-a/': null, 'specs/002-b/': null, 'specs/003-c/': null, '.specify/feature.json': featureJson('specs/003-c') };
    const root = await project({ ...tree, ...mark('001-a'), ...mark('002-b'), ...mark('003-c') });
    const reads = vi.spyOn(fs, 'readFile');
    const lists = vi.spyOn(fs, 'readdir');
    const writes = spyWrites();
    try {
      expect(archived(await loadSpeckitFeatures(root))).toEqual(['001-a', '002-b']);
      const inThadeus = (spy) => spy.mock.calls.filter(([p]) => String(p).includes('.thadeus'));
      expect(inThadeus(reads)).toEqual([]);
      expect(inThadeus(lists)).toHaveLength(1);
      expect(writes.calls()).toEqual([]);
    } finally {
      writes.restore();
      reads.mockRestore();
      lists.mockRestore();
    }
  });

  it('listedFeatures gives the folders and the active one, as the list has them', async () => {
    const root = await project({ 'specs/002-b/': null, 'specs/001-a/': null, 'specs/.hidden/': null, '.specify/feature.json': featureJson('specs/002-b') });
    expect(await listedFeatures(root)).toEqual({ dirs: ['001-a', '002-b'], active: '002-b' });
    expect(await listedFeatures(await project())).toEqual({ dirs: [], active: null });
  });
});

describe('SPECKIT_WATCH_PATHS (US-1404 BR7.8)', () => {
  it("keeps U6's paths and also follows the constitution, extensions.yml, every extension folder and the archive marks (US-1411 FR3.6)", () => {
    expect(SPECKIT_WATCH_PATHS).toEqual([
      'specs/**',
      '.specify/feature.json',
      '.specify/init-options.json',
      '.specify/memory/constitution.md',
      '.specify/extensions.yml',
      '.specify/extensions/**',
      '.thadeus/archived/**'
    ]);
  });
});
