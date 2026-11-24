// US-1404 FR7, BR7.1–BR7.7, NFR3.1–NFR3.4, NFR5.2, NFR7.3: Spec Kit's constitution, extensions and hooks (contract C6).
import { afterEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { t } from '../../src/shared/i18n.js';
import { MAX_READ_BYTES } from '../../src/main/speckitFeatures.js';
import { CONSTITUTION, EXTENSIONS_FILE, hooksFrom, loadSpeckitRules } from '../../src/main/speckitRules.js';
import { spyWrites } from './fsWriteSpy.js';

const entry = (fields = {}) => ({ extension: 'git', command: 'speckit.git.commit', ...fields });
const reason = (key, values) => t(`speckit.reason.${key}`, values);
const manifest = (id) => `.specify/extensions/${id}/extension.yml`;
const commandsYaml = (...names) =>
  `extension:\n  id: x\nprovides:\n  commands:\n${names.map((n) => `    - name: ${JSON.stringify(n)}\n      file: c.md\n`).join('')}`;

const roots = [];
/** A project from `{ 'rel/path': text or Buffer }`; a key ending in `/` is an empty folder. */
async function project(tree = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'speckit-rules-'));
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

afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

describe('hooksFrom: the hooks in extensions.yml (BR7.4, BR7.5)', () => {
  it('reads before_<x> and after_<x> keys as when and target', () => {
    const { hooks, skipped } = hooksFrom({ hooks: { before_specify: [entry()], after_implement: [entry({ command: 'speckit.git.push' })] } });
    expect(hooks).toEqual([
      { extension: 'git', when: 'before', target: 'specify', command: 'speckit.git.commit', mode: 'optional', condition: null },
      { extension: 'git', when: 'after', target: 'implement', command: 'speckit.git.push', mode: 'optional', condition: null }
    ]);
    expect(skipped).toBe(0);
  });

  it('counts a single mapping as a list of one', () => {
    expect(hooksFrom({ hooks: { after_plan: entry() } }).hooks).toEqual([
      expect.objectContaining({ when: 'after', target: 'plan', command: 'speckit.git.commit' })
    ]);
  });

  it('skips and counts a key that does not match and an entry without a command', () => {
    const { hooks, skipped } = hooksFrom({ hooks: { during_plan: [entry(), entry()], before_tasks: [{ extension: 'git' }, 'text', entry()] } });
    expect(hooks).toHaveLength(1);
    expect(skipped).toBe(4); // two under the unknown key, the entry without a command and the plain string
  });

  it('gives off when enabled is false, mandatory when optional is false, optional by default', () => {
    const { hooks } = hooksFrom({
      hooks: { before_plan: [entry({ enabled: false, optional: false }), entry({ optional: false }), entry({ enabled: true, optional: true }), entry()] }
    });
    expect(hooks.map((h) => h.mode)).toEqual(['off', 'mandatory', 'optional', 'optional']);
  });

  it('keeps a condition as a note, without evaluating it', () => {
    expect(hooksFrom({ hooks: { before_plan: [entry({ condition: 'branch != main' })] } }).hooks[0].condition).toBe('branch != main');
  });

  it('leaves out and counts a command that is not a safe name (NFR3.3)', () => {
    const bad = ['a; rm -rf ~', 'speckit.git\ncommit', `x${'a'.repeat(100)}`, 'say "hi"'];
    const { hooks, skipped, unsafe } = hooksFrom({
      hooks: { before_plan: [...bad.map((command) => entry({ command })), entry({ command: `x${'a'.repeat(99)}` })] }
    });
    expect(hooks.map((h) => h.command)).toEqual([`x${'a'.repeat(99)}`]); // 100 characters is the most
    expect(skipped).toBe(4);
    expect(unsafe).toBe(4);
  });

  it('gives no hooks and no count without a hooks mapping, and counts a hooks value that is not one', () => {
    expect(hooksFrom({})).toEqual({ hooks: [], skipped: 0, unsafe: 0 });
    expect(hooksFrom({ hooks: null })).toEqual({ hooks: [], skipped: 0, unsafe: 0 });
    expect(hooksFrom({ hooks: ['before_plan'] }).skipped).toBe(1);
  });
});

describe('loadSpeckitRules: the constitution (BR7.1)', () => {
  it('names the constitution when it is a readable file, with root-relative paths only (NFR3.4)', async () => {
    const root = await project({ [CONSTITUTION]: '# Rules\n' });
    const r = await loadSpeckitRules(root);
    expect(r).toEqual({ constitution: { path: CONSTITUTION, exists: true }, extensions: [], skipped: 0, hooksChecked: true, errors: [] });
    expect(JSON.stringify(r)).not.toContain(root);
  });

  it('gives exists false and no error for a missing constitution, and an error for a folder', async () => {
    expect(await loadSpeckitRules(await project({ '.specify/': null }))).toMatchObject({ constitution: { exists: false }, errors: [] });
    const r = await loadSpeckitRules(await project({ [`${CONSTITUTION}/`]: null }));
    expect(r.constitution.exists).toBe(false);
    expect(r.errors).toEqual([{ path: CONSTITUTION, reason: reason('notFile') }]);
  });
});

describe('loadSpeckitRules: extensions.yml (BR7.3, NFR5.2)', () => {
  it('gives no extensions and no error when the file is missing', async () => {
    expect(await loadSpeckitRules(await project({}))).toMatchObject({ extensions: [], errors: [], hooksChecked: true });
  });

  it('names invalid YAML, a list root and an alias bomb, and checks no hooks', async () => {
    const bomb = ['a: &a [x, x, x, x, x, x, x, x, x, x]', 'b: &b [*a, *a, *a, *a, *a, *a, *a, *a, *a, *a]', 'c: &c [*b, *b, *b, *b, *b, *b, *b, *b, *b, *b]'];
    bomb.push('d: [*c, *c, *c, *c, *c, *c, *c, *c, *c, *c]', 'hooks:', '  before_plan:', '    - { extension: git, command: speckit.git.commit }');
    for (const [text, why] of [
      ['installed: [git\nhooks: {', expect.stringContaining(reason('yaml', { error: '' }))],
      ['- installed\n- hooks\n', reason('notMapping')],
      [bomb.join('\n'), expect.stringMatching(/alias/i)] // refused at the parser's limit, not expanded
    ]) {
      const r = await loadSpeckitRules(await project({ [EXTENSIONS_FILE]: text, [CONSTITUTION]: '# Rules' }));
      expect(r.extensions).toEqual([]);
      expect(r.hooksChecked).toBe(false);
      expect(r.constitution.exists).toBe(true); // the rest still shows
      expect(r.errors).toEqual([{ path: EXTENSIONS_FILE, reason: why }]);
    }
  });
});

describe('loadSpeckitRules: the extensions (BR7.6, NFR3.2, NFR3.3)', () => {
  it('takes ids from installed (strings or mappings with id) and from hooks, deduplicated and sorted, with their commands', async () => {
    const root = await project({
      [EXTENSIONS_FILE]: [
        'installed:',
        '  - git',
        '  - id: review',
        '    version: 1.0.0',
        'hooks:',
        '  after_implement:',
        '    - { extension: git, command: speckit.git.commit, optional: false }',
        '    - { extension: audit, command: speckit.audit.run, enabled: false }'
      ].join('\n'),
      [manifest('git')]: commandsYaml('speckit.git.commit', 'speckit.git.push'),
      [manifest('review')]: commandsYaml('speckit.review.run'),
      [manifest('audit')]: commandsYaml('speckit.audit.run')
    });
    const r = await loadSpeckitRules(root);
    expect(r.errors).toEqual([]);
    expect(r.extensions).toEqual([
      {
        id: 'audit',
        commands: ['speckit.audit.run'],
        hooks: [{ when: 'after', target: 'implement', command: 'speckit.audit.run', mode: 'off', condition: null }]
      },
      {
        id: 'git',
        commands: ['speckit.git.commit', 'speckit.git.push'],
        hooks: [{ when: 'after', target: 'implement', command: 'speckit.git.commit', mode: 'mandatory', condition: null }]
      },
      { id: 'review', commands: ['speckit.review.run'], hooks: [] }
    ]);
  });

  it('names a missing manifest, an invalid one and a bad command name; the extension still shows', async () => {
    const root = await project({
      [EXTENSIONS_FILE]: 'installed: [git, review, lint]\nhooks:\n  before_plan:\n    - { extension: lint, command: "a; rm -rf ~" }\n',
      [manifest('git')]: commandsYaml('speckit.git.commit', 'a; rm -rf ~', 'x'.repeat(200)),
      [manifest('review')]: 'provides: [commands'
    });
    const r = await loadSpeckitRules(root);
    expect(r.extensions.map((e) => [e.id, e.commands])).toEqual([
      ['git', ['speckit.git.commit']],
      ['lint', []],
      ['review', []]
    ]);
    expect(r.skipped).toBe(1);
    expect(r.hooksChecked).toBe(true);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { path: manifest('git'), reason: reason('unsafeNames', { count: 2 }) },
        { path: manifest('lint'), reason: reason('noManifest') },
        { path: manifest('review'), reason: expect.stringMatching(/\S/) },
        { path: EXTENSIONS_FILE, reason: reason('unsafeNames', { count: 1 }) }
      ])
    );
    expect(r.errors).toHaveLength(4);
  });

  it('builds no path from an unsafe id, and shows it with no commands (NFR3.2)', async () => {
    const root = await project({ [EXTENSIONS_FILE]: 'installed: ["../x", "a/b", "..", "/abs", "ok"]\n', [manifest('ok')]: commandsYaml('speckit.ok.run') });
    await fs.mkdir(path.join(root, '.specify/x'), { recursive: true });
    await fs.writeFile(path.join(root, '.specify/x/extension.yml'), commandsYaml('speckit.escaped'));
    const r = await loadSpeckitRules(root);
    expect(r.extensions).toEqual([
      { id: '..', commands: [], hooks: [] },
      { id: '../x', commands: [], hooks: [] },
      { id: '/abs', commands: [], hooks: [] },
      { id: 'a/b', commands: [], hooks: [] },
      { id: 'ok', commands: ['speckit.ok.run'], hooks: [] }
    ]);
    expect(r.errors).toEqual(['..', '../x', '/abs', 'a/b'].map((id) => ({ path: EXTENSIONS_FILE, reason: reason('unsafeId', { id }) })));
  });
});

describe('loadSpeckitRules: files it does not read (NFR3.2, NFR5.2)', () => {
  it('names a link outside the root, a file over 1 MB and a non-UTF-8 file, and shows the rest', async () => {
    const outside = await project({ 'secret.md': '# secret', 'extension.yml': commandsYaml('speckit.secret') });
    const root = await project({
      [EXTENSIONS_FILE]: 'installed: [linked, big, binary, ok]\n',
      [manifest('big')]: 'x'.repeat(MAX_READ_BYTES + 1),
      [manifest('binary')]: Buffer.from([0x70, 0x3a, 0xff, 0xfe]),
      [manifest('ok')]: commandsYaml('speckit.ok.run'),
      '.specify/extensions/linked/': null,
      '.specify/memory/': null
    });
    await fs.symlink(path.join(outside, 'secret.md'), path.join(root, CONSTITUTION));
    await fs.symlink(path.join(outside, 'extension.yml'), path.join(root, manifest('linked')));
    const r = await loadSpeckitRules(root);
    expect(r.constitution.exists).toBe(false);
    expect(r.extensions.find((e) => e.id === 'ok').commands).toEqual(['speckit.ok.run']);
    expect(r.extensions.flatMap((e) => e.commands)).toEqual(['speckit.ok.run']);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        { path: CONSTITUTION, reason: reason('outsideRoot') },
        { path: manifest('linked'), reason: reason('outsideRoot') },
        { path: manifest('big'), reason: reason('tooLarge') },
        { path: manifest('binary'), reason: reason('notUtf8') }
      ])
    );
    expect(r.errors).toHaveLength(4);
    expect(JSON.stringify(r)).not.toContain(outside);
  });

  it.skipIf(process.platform === 'win32')('names a FIFO without reading it', async () => {
    const root = await project({ [CONSTITUTION]: '# Rules' });
    execFileSync('mkfifo', [path.join(root, EXTENSIONS_FILE)]);
    const r = await loadSpeckitRules(root);
    expect(r.constitution.exists).toBe(true);
    expect(r.errors).toEqual([{ path: EXTENSIONS_FILE, reason: reason('notFile') }]);
  });
});

describe('loadSpeckitRules: speed (NFR7.3)', () => {
  it('reads 20 extensions, 50 hooks and a 100 KB constitution in under 300 ms', async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `ext${i}`);
    const hooks = Array.from({ length: 50 }, (_, i) => `    - { extension: ext${i % 20}, command: speckit.ext${i % 20}.run, optional: ${i % 2 === 0} }`);
    const tree = {
      [CONSTITUTION]: `# Rules\n${'- a rule line\n'.repeat(8000)}`,
      [EXTENSIONS_FILE]: `installed: [${ids.join(', ')}]\nhooks:\n  before_plan:\n${hooks.join('\n')}\n`
    };
    for (const id of ids) tree[manifest(id)] = commandsYaml(`speckit.${id}.run`, `speckit.${id}.check`);
    const root = await project(tree);
    await loadSpeckitRules(root); // warm-up: module and parser load
    const start = performance.now();
    const r = await loadSpeckitRules(root);
    expect(performance.now() - start).toBeLessThan(300);
    expect(r.extensions).toHaveLength(20);
    expect(r.extensions.flatMap((e) => e.hooks)).toHaveLength(50);
    expect(r.errors).toEqual([]);
  });
});

describe('loadSpeckitRules: read-only (BR7.7, NFR3.1)', () => {
  it('makes no fs write call on a full project', async () => {
    const root = await project({
      [CONSTITUTION]: '# Rules',
      [EXTENSIONS_FILE]: 'installed: [git]\nhooks:\n  before_plan: { extension: git, command: speckit.git.commit }\n',
      [manifest('git')]: commandsYaml('speckit.git.commit')
    });
    const writes = spyWrites();
    try {
      expect((await loadSpeckitRules(root)).extensions).toHaveLength(1);
      hooksFrom({ hooks: { before_plan: entry() } });
      expect(writes.calls()).toEqual([]);
    } finally {
      writes.restore();
    }
  });

  it('makes no fs write call on the error paths (invalid YAML, unsafe id, too large)', async () => {
    const root = await project({ [EXTENSIONS_FILE]: 'installed: ["../x", big]\n', [manifest('big')]: 'x'.repeat(MAX_READ_BYTES + 1), [CONSTITUTION]: '{' });
    const writes = spyWrites();
    try {
      expect((await loadSpeckitRules(root)).errors).toHaveLength(2);
      expect(writes.calls()).toEqual([]);
    } finally {
      writes.restore();
    }
  });
});
