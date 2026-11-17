// US-0506 u4 LC30, LC31: ownership, the canonical release, the path check and the settings splicer (pure, bytes in and out).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { promises as fs, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import SCRIPT from '../../.thadeus/hooks/dialog.sh?raw';
import PLUGIN from '../../.opencode/plugins/thadeus-dialog.js?raw';
import { WAIT_SECONDS } from '../../src/main/agentChannel.js';
import {
  CANONICAL,
  CURRENT,
  FILES,
  KINDS,
  RELEASES,
  appKind,
  checkPath,
  classify,
  command,
  postCheck,
  prune,
  readSettings,
  splice,
  stripApp
} from '../../src/main/agentHooks.js';
import { INSTALLABLE, fixture, removeProject, tempProject, testEarlier } from '../helpers/agentHooksFixtures.js';

const sha = (b) => createHash('sha256').update(b).digest('hex');
const SRC = path.resolve(__dirname, '../../src/main/agentHooks.js');
const releases = [testEarlier(CANONICAL), CURRENT];
const parse = (bytes) => readSettings(bytes).value;
const commandsOf = (value) => Object.values(value?.hooks ?? {}).flatMap((groups) => groups.flatMap((g) => g.hooks.map((h) => h.command)));

describe('ownership: appKind (RD38, SD34)', () => {
  it.each([
    [command('question'), 'question'],
    [command('answered'), 'answered'],
    [command('permission'), 'permission'],
    [command('reply'), 'reply'],
    ['sh .thadeus/hooks/dialog.sh question', 'question'],
    ['sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" question;exit 0', 'question'],
    ['sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" questionx; exit 0', null],
    ['sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh"', null],
    ['sh .thadeus/hooks/other.sh question', null],
    ['sh dialog.sh question', null],
    // review iteration 1: only the exact shapes the app writes are its own
    ['notify-team.sh && sh .thadeus/hooks/dialog.sh reply', null],
    ['echo see .thadeus/hooks/dialog.sh reply', null],
    ['sh "$CLAUDE_PROJECT_DIR/vendor/.thadeus/hooks/dialog.sh" question', null],
    ['../other/.thadeus/hooks/dialog.sh permission --verbose', null],
    [`${command('reply')} && rm -rf build`, null],
    [42, null],
    [undefined, null]
  ])('%s gives %s', (cmd, kind) => expect(appKind(cmd)).toBe(kind));
});

describe('the canonical release (RD41, D2, SD35)', () => {
  it('holds the four entries of the functional spec and the four of US-0213, with the wait constant imported', () => {
    expect(KINDS).toEqual(['question', 'answered', 'permission', 'reply', 'session', 'notify', 'precompact', 'postcompact']);
    expect(Object.fromEntries(KINDS.map((k) => [k, [CANONICAL[k].event, CANONICAL[k].matcher]]))).toEqual({
      question: ['PreToolUse', 'AskUserQuestion'],
      answered: ['PostToolUse', 'AskUserQuestion'],
      permission: ['PermissionRequest', '*'],
      reply: ['Stop', undefined],
      session: ['SessionStart', undefined],
      notify: ['Notification', undefined],
      precompact: ['PreCompact', undefined],
      postcompact: ['PostCompact', undefined]
    });
    expect([CANONICAL.answered.timeout, CANONICAL.reply.timeout]).toEqual([10, 10]);
    // US-0213 NFR3: the new entries never wait.
    expect([CANONICAL.session, CANONICAL.notify, CANONICAL.precompact, CANONICAL.postcompact].map((e) => e.timeout)).toEqual([10, 10, 10, 10]);
    // US-0213 NFR3: every report-only entry is async; the waiting kinds and PreCompact (its output feeds the compaction) are not.
    expect(Object.fromEntries(KINDS.map((k) => [k, CANONICAL[k].async === true]))).toEqual({
      question: false,
      answered: true,
      permission: false,
      reply: true,
      session: true,
      notify: true,
      precompact: false,
      postcompact: true
    });
    for (const k of ['question', 'permission']) {
      expect(CANONICAL[k].timeout).toBe(600);
      expect(CANONICAL[k].timeout).toBeGreaterThanOrEqual(WAIT_SECONDS.claude + 5);
    }
  });

  it('builds each command from the C6 string with only the kind filled in', () => {
    for (const k of KINDS) {
      expect(command(k)).toBe(
        `[ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ${k}; exit 0`
      );
      expect(CANONICAL[k].command).toBe(command(k));
    }
  });

  it('takes the current digests from the bundled script and plugin, and lists them in the release table (D2)', () => {
    expect(CURRENT.scriptDigest).toBe(sha(Buffer.from(SCRIPT, 'utf8')));
    expect(CURRENT.pluginDigest).toBe(sha(Buffer.from(PLUGIN, 'utf8')));
    expect(RELEASES.at(-1)).toBe(CURRENT);
    expect(RELEASES.some((r) => r.scriptDigest === CURRENT.scriptDigest && r.pluginDigest === CURRENT.pluginDigest)).toBe(true);
  });

  it.each(['v0.2.8', 'before-US-0213'])('reads an install of %s (four sync entries) as outOfDate, and update brings all eight (US-0213 FR1.4)', (release) => {
    const old = RELEASES.find((r) => r.release === release);
    expect(Object.keys(old.entries)).toEqual(['question', 'answered', 'permission', 'reply']);
    expect(old.scriptDigest).not.toBe(CURRENT.scriptDigest);
    expect(old.pluginDigest).not.toBe(CURRENT.pluginDigest);
    const four = Object.fromEntries(
      Object.values(old.entries).map((e) => [
        e.event,
        [{ ...(e.matcher ? { matcher: e.matcher } : {}), hooks: [{ type: 'command', command: e.command, timeout: e.timeout }] }]
      ])
    );
    const bytes = Buffer.from(JSON.stringify({ hooks: four }, null, 2));
    expect(Object.values(old.entries).map((e) => appKind(e.command))).toEqual(['question', 'answered', 'permission', 'reply']);
    const c = classify(parse(bytes));
    expect(c.status).toBe('outOfDate');
    expect([c.kinds.question, c.kinds.reply, c.kinds.session]).toEqual(['current', 'outOfDate', 'missing']); // reply gains async
    const out = splice(bytes, 'update');
    expect(classify(parse(out.bytes)).status).toBe('current');
    expect(parse(out.bytes).hooks.Stop[0].hooks[0]).toMatchObject({ async: true });
  });

  it('ships a dialog.sh with no redirect on the : builtin (RD31, u1 review R-01)', () => {
    expect(SCRIPT).not.toMatch(/(^|[;&|{(]|then|do|else)\s*:\s*[0-9]*>/m);
    expect(SCRIPT).not.toContain('\r');
    expect(SCRIPT.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('imports nothing that reaches the network (SD35)', () => {
    const src = readFileSync(SRC, 'utf8');
    expect(src).not.toMatch(/from ['"](node:)?(net|http|https)['"]/);
    expect(src).not.toMatch(/import\s*\{[^}]*\bnet\b[^}]*\}\s*from ['"]electron['"]/);
    expect(src).not.toContain('fetch(');
  });

  it('fixes the three paths', () => {
    expect(FILES).toEqual({ settings: '.claude/settings.json', script: '.thadeus/hooks/dialog.sh', plugin: '.opencode/plugins/thadeus-dialog.js' });
  });
});

describe('checkPath: fixed paths, no links (SD30)', () => {
  let root, outside;
  beforeEach(async () => {
    root = await tempProject('path-');
    outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'hooks-outside-')));
    await fs.writeFile(path.join(outside, 'settings.json'), '{}\n');
  });
  afterEach(async () => {
    await removeProject(root);
    await fs.rm(outside, { recursive: true, force: true });
  });
  const targetState = async (abs) => {
    const st = await fs.stat(abs);
    return [sha(await fs.readFile(abs)), st.mtimeMs];
  };

  it('names the missing folders of an absent path', async () => {
    expect(await checkPath(root, FILES.script)).toEqual({ abs: path.join(root, FILES.script), exists: false, missingDirs: ['.thadeus', '.thadeus/hooks'] });
    await fs.mkdir(path.join(root, '.thadeus'));
    expect((await checkPath(root, FILES.script)).missingDirs).toEqual(['.thadeus/hooks']);
  });

  it('accepts a regular file inside the root', async () => {
    await fs.mkdir(path.join(root, '.claude'));
    await fs.writeFile(path.join(root, FILES.settings), '{}\n');
    expect(await checkPath(root, FILES.settings)).toEqual({ abs: path.join(root, FILES.settings), exists: true, missingDirs: [] });
  });

  it('refuses folders and files linked outside the root as outsideRoot, leaving the target untouched', async () => {
    const before = await targetState(path.join(outside, 'settings.json'));
    await fs.symlink(outside, path.join(root, '.claude'));
    expect(await checkPath(root, FILES.settings)).toEqual({ reason: 'outsideRoot' });
    await fs.symlink(outside, path.join(root, '.thadeus'));
    expect(await checkPath(root, FILES.script)).toEqual({ reason: 'outsideRoot' });
    await fs.rm(path.join(root, '.claude'));
    await fs.mkdir(path.join(root, '.claude'));
    await fs.symlink(path.join(outside, 'settings.json'), path.join(root, FILES.settings));
    expect(await checkPath(root, FILES.settings)).toEqual({ reason: 'outsideRoot' });
    expect(await targetState(path.join(outside, 'settings.json'))).toEqual(before);
  });

  it('refuses links inside the root and dangling links as cannotWrite (link)', async () => {
    await fs.mkdir(path.join(root, 'docs'));
    await fs.mkdir(path.join(root, '.git'));
    await fs.symlink(path.join(root, 'docs'), path.join(root, '.claude'));
    expect(await checkPath(root, FILES.settings)).toEqual({ reason: 'cannotWrite', cause: 'link' });
    await fs.symlink(path.join(root, '.git'), path.join(root, '.thadeus'));
    expect(await checkPath(root, FILES.script)).toEqual({ reason: 'cannotWrite', cause: 'link' });
    await fs.rm(path.join(root, '.thadeus'));
    await fs.mkdir(path.join(root, '.thadeus/hooks'), { recursive: true });
    await fs.writeFile(path.join(root, 'docs/x.sh'), 'echo\n');
    const before = await targetState(path.join(root, 'docs/x.sh'));
    await fs.symlink(path.join(root, 'docs/x.sh'), path.join(root, FILES.script));
    expect(await checkPath(root, FILES.script)).toEqual({ reason: 'cannotWrite', cause: 'link' });
    expect(await targetState(path.join(root, 'docs/x.sh'))).toEqual(before);
    await fs.mkdir(path.join(root, '.opencode/plugins'), { recursive: true });
    await fs.symlink(path.join(root, 'nowhere.js'), path.join(root, FILES.plugin));
    expect(await checkPath(root, FILES.plugin)).toEqual({ reason: 'cannotWrite', cause: 'link' });
  });

  it('refuses a folder part that is a file, and a final part that is a folder', async () => {
    await fs.writeFile(path.join(root, '.thadeus'), 'x');
    expect(await checkPath(root, FILES.script)).toEqual({ reason: 'cannotWrite', cause: 'ENOTDIR' });
    await fs.mkdir(path.join(root, '.claude/settings.json'), { recursive: true });
    expect(await checkPath(root, FILES.settings)).toEqual({ reason: 'cannotWrite', cause: 'notAFile' });
  });
});

describe('reading the settings file (SD34)', () => {
  it('refuses invalid UTF-8, a parse failure and a comment as invalidJson', () => {
    expect(readSettings(fixture('bad-utf8.json'))).toEqual({ reason: 'invalidJson' });
    expect(readSettings(fixture('invalid.json'))).toEqual({ reason: 'invalidJson' });
    expect(readSettings(fixture('jsonc-comment.json'))).toEqual({ reason: 'invalidJson' });
    expect(readSettings(Buffer.from('{"a": 1}﻿\n', 'utf8'))).toEqual({ reason: 'invalidJson' });
  });

  it('refuses duplicate keys and keys with a backslash as unexpectedShape', () => {
    expect(readSettings(fixture('two-hooks-keys.json'))).toEqual({ reason: 'unexpectedShape' });
    expect(readSettings(fixture('escaped-hooks-key.json'))).toEqual({ reason: 'unexpectedShape' });
    const dupInHook = '{"hooks":{"Stop":[{"hooks":[{"type":"command","type":"command","command":"x"}]}]}}';
    expect(readSettings(Buffer.from(dupInHook))).toEqual({ reason: 'unexpectedShape' });
  });

  it('refuses hooks of the wrong shape as unexpectedShape', () => {
    expect(readSettings(fixture('hooks-array.json'))).toEqual({ reason: 'unexpectedShape' });
    expect(readSettings(Buffer.from('[]'))).toEqual({ reason: 'unexpectedShape' });
    expect(readSettings(Buffer.from('{"hooks":{"Stop":{}}}'))).toEqual({ reason: 'unexpectedShape' });
    expect(readSettings(Buffer.from('{"hooks":{"Stop":[{"matcher":"x"}]}}'))).toEqual({ reason: 'unexpectedShape' });
    expect(readSettings(Buffer.from('{"hooks":{"Stop":[{"hooks":[1]}]}}'))).toEqual({ reason: 'unexpectedShape' });
  });

  it('keeps a leading BOM and parses what follows it', () => {
    const read = readSettings(fixture('bom.json'));
    expect(read.bom).toBe(true);
    expect(read.value.hooks.PreToolUse[0].matcher).toBe('Bash');
  });
});

describe('classify (BR7.4–BR7.6)', () => {
  const c = (name) => classify(parse(fixture(name)), releases);

  it('gives current, outOfDate, editedByHand and missing', () => {
    expect(c('current.json').status).toBe('current');
    expect(c('earlier-release.json')).toMatchObject({ status: 'outOfDate', kinds: { question: 'outOfDate', answered: 'current' } });
    expect(c('hand-edited.json')).toMatchObject({ status: 'editedByHand', kinds: { question: 'editedByHand', reply: 'current' } });
    expect(c('aidlc.json')).toMatchObject({ status: 'missing', kinds: { question: 'missing', reply: 'missing' } });
  });

  it('counts an extra app entry of a kind as a hand edit, and a missing kind as outOfDate for the file (BR7.5, BR7.6)', () => {
    expect(c('duplicate-app.json')).toMatchObject({ status: 'editedByHand', kinds: { question: 'editedByHand' } });
    const value = parse(fixture('current.json'));
    delete value.hooks.Stop;
    expect(classify(value, releases)).toMatchObject({ status: 'outOfDate', kinds: { reply: 'missing' } });
  });

  it('ignores teammate entries that are not the app’s', () => {
    expect(c('teammate-other-sh.json').status).toBe('missing');
    expect(c('questionx.json').status).toBe('missing');
  });

  it('counts an app entry under the wrong event, or with another key, as a hand edit', () => {
    const value = parse(fixture('current.json'));
    value.hooks.PostToolUse[0].hooks[0].once = true; // US-0213: async is now the canonical shape, so another key
    expect(classify(value, releases).kinds.answered).toBe('editedByHand');
    const moved = parse(fixture('current.json'));
    moved.hooks.Stop[0].hooks[0].command = command('question');
    expect(classify(moved, releases).kinds.question).toBe('editedByHand');
  });
});

describe('splice: install and update (BR7.10, BR7.11, RD36, SD34)', () => {
  const kindsOf = (value) => commandsOf(value).map(appKind).filter(Boolean).sort();

  it.each(INSTALLABLE)('install over %s keeps every other value, adds one current entry per kind, in the file’s own style', (name) => {
    const old = fixture(name);
    const out = splice(old, 'install', releases);
    expect(out.change).toBe('modify');
    const next = readSettings(out.bytes);
    expect(isDeepStrictEqual(prune(stripApp(next.value)), prune(stripApp(parse(old))))).toBe(true);
    expect(kindsOf(next.value)).toEqual([...KINDS].sort());
    expect(classify(next.value, releases).status).toBe('current');
    const text = out.bytes.toString('utf8');
    const oldText = old.toString('utf8');
    expect(text.endsWith('\n')).toBe(oldText.endsWith('\n'));
    expect(text.includes('\r\n')).toBe(oldText.includes('\r\n'));
    if (oldText.includes('\r\n')) expect(text.replace(/\r\n/g, '')).not.toContain('\n');
    expect(out.bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf]))).toBe(name === 'bom.json');
  });

  it('indents with the file’s own unit and appends events in the fixed order (RD36)', () => {
    expect(splice(fixture('indent-tab.json'), 'install', releases).bytes.toString()).toMatch(/\n\t\t"PreToolUse": \[\n\t\t\t\{\n\t\t\t\t"matcher"/);
    expect(splice(fixture('indent-4.json'), 'install', releases).bytes.toString()).toMatch(/\n {8}"PreToolUse": \[\n {12}\{/);
    expect(Object.keys(parse(splice(fixture('no-hooks.json'), 'install', releases).bytes).hooks)).toEqual([
      'PreToolUse',
      'PostToolUse',
      'PermissionRequest',
      'Stop',
      'SessionStart',
      'Notification',
      'PreCompact',
      'PostCompact'
    ]);
    const repo = parse(splice(fixture('aidlc.json'), 'install', releases).bytes).hooks;
    expect(repo.PreToolUse.at(-1).matcher).toBe('AskUserQuestion'); // appended at the end of an existing event array
    expect(Object.keys(repo).at(-1)).toBe('PostCompact'); // new event keys go last, in the fixed order
  });

  it('creates a missing file with only the app’s entries, two spaces and a final newline (BR7.11)', () => {
    const out = splice(null, 'install', releases);
    expect(out.change).toBe('create');
    expect(out.bytes.equals(fixture('current.json'))).toBe(true);
    expect(out.diff.split('\n').every((l) => l.startsWith('+') || l.startsWith('@@'))).toBe(true);
  });

  it('gives none for an install over an installed file, and for remove where nothing is the app’s (RD36)', () => {
    const once = splice(fixture('aidlc.json'), 'install', releases).bytes;
    expect(splice(once, 'install', releases)).toMatchObject({ change: 'none', diff: '' });
    expect(splice(fixture('current.json'), 'update', releases).change).toBe('none');
    expect(splice(null, 'remove', releases).change).toBe('none');
    expect(splice(fixture('no-hooks.json'), 'remove', releases).change).toBe('none');
  });

  it('is deterministic: two identical files give equal bytes', () => {
    expect(sha(splice(fixture('aidlc.json'), 'install', releases).bytes)).toBe(sha(splice(fixture('aidlc.json'), 'install', releases).bytes));
  });

  it('update replaces outOfDate entries in place, giving the bytes of a fresh install', () => {
    const out = splice(fixture('earlier-release.json'), 'update', releases);
    expect(out).toMatchObject({ change: 'modify', replacesHandEdit: false });
    expect(out.bytes.equals(fixture('current.json'))).toBe(true);
    expect(out.diff).toContain('-            "timeout": 300');
    expect(out.diff).toContain('+            "timeout": 600');
  });

  it('update replaces a hand edit and marks it, and removes an extra entry (BR7.6, BR7.8)', () => {
    const edited = splice(fixture('hand-edited.json'), 'update', releases);
    expect(edited.replacesHandEdit).toBe(true);
    expect(edited.bytes.equals(fixture('current.json'))).toBe(true);
    const dup = splice(fixture('duplicate-app.json'), 'update', releases);
    expect(dup.replacesHandEdit).toBe(true);
    expect(dup.bytes.equals(fixture('current.json'))).toBe(true);
  });

  it('update moves an entry under the wrong matcher into a new canonical group', () => {
    const value = parse(fixture('current.json'));
    value.hooks.PermissionRequest[0].matcher = 'Bash';
    const next = parse(splice(Buffer.from(`${JSON.stringify(value, null, 2)}\n`), 'update', releases).bytes);
    expect(next.hooks.PermissionRequest).toHaveLength(1);
    expect(next.hooks.PermissionRequest[0].matcher).toBe('*');
    expect(classify(next, releases).status).toBe('current');
  });
});

describe('splice: remove, post-check and diff (BR7.19, RD37, SD34, D5)', () => {
  const kindsOf = (value) => commandsOf(value).map(appKind).filter(Boolean);

  it.each(INSTALLABLE)('install then remove over %s round-trips byte for byte (except the RD37 cases)', (name) => {
    const old = fixture(name);
    const removed = splice(splice(old, 'install', releases).bytes, 'remove', releases);
    expect(removed.change).toBe('modify');
    expect(kindsOf(parse(removed.bytes))).toEqual([]);
    if (name === 'hooks-empty.json') expect(removed.bytes.toString()).toBe('{\n  "env": {\n    "A": "1"\n  }\n}\n');
    else expect(removed.bytes.toString('latin1')).toBe(old.toString('latin1'));
  });

  it('remove of a file the app created leaves {} and a line end (RD37)', () => {
    expect(splice(splice(null, 'install', releases).bytes, 'remove', releases).bytes.toString()).toBe('{}\n');
  });

  it('remove takes out hand-edited, duplicate and earlier app entries with only - lines', () => {
    for (const name of ['hand-edited.json', 'duplicate-app.json', 'earlier-release.json']) {
      const out = splice(fixture(name), 'remove', releases);
      expect(kindsOf(parse(out.bytes))).toEqual([]);
      expect(out.diff.split('\n').some((l) => l.startsWith('+'))).toBe(false);
    }
  });

  it('never touches the teammate other.sh and questionx entries', () => {
    for (const name of ['teammate-other-sh.json', 'questionx.json']) {
      const theirs = parse(fixture(name)).hooks.PreToolUse[0];
      const installed = splice(fixture(name), 'install', releases).bytes;
      expect(parse(installed).hooks.PreToolUse[0]).toEqual(theirs);
      expect(splice(installed, 'update', releases).change).toBe('none');
      expect(parse(splice(installed, 'remove', releases).bytes).hooks.PreToolUse[0]).toEqual(theirs);
    }
  });

  it('keeps teammate commands that only mention dialog.sh byte for byte through install, update and remove (review iteration 1)', () => {
    const old = fixture('lookalike.json');
    const theirs = parse(old).hooks;
    const lines = old
      .toString()
      .split('\n')
      .filter((l) => l.includes('.thadeus'));
    expect(lines).toHaveLength(4);
    expect(classify(theirs ? parse(old) : {}, releases).apps).toEqual([]);
    const installed = splice(old, 'install', releases).bytes;
    const updated = splice(installed, 'update', releases);
    expect(updated.change).toBe('none');
    const removed = splice(installed, 'remove', releases).bytes;
    expect(removed.equals(old)).toBe(true);
    for (const out of [installed, removed]) {
      for (const l of lines) expect(out.toString()).toContain(l);
      const hooks = parse(out).hooks;
      expect(hooks.PermissionRequest[0]).toEqual(theirs.PermissionRequest[0]);
      expect(hooks.Stop[0]).toEqual(theirs.Stop[0]);
      expect(hooks.PreToolUse[0]).toEqual(theirs.PreToolUse[0]);
    }
  });

  it('refuses a splice that deleted a teammate’s empty group, event array or hooks object (post-check, review iteration 1)', () => {
    const old = fixture('empty-containers.json');
    const next = splice(old, 'install', releases).bytes.toString();
    expect(postCheck(old, Buffer.from(next), 'install', releases)).toBeNull();
    const noGroup = next.replace(/\{\s*"matcher": "Bash",\s*"hooks": \[\]\s*\},\s*/, '');
    expect(noGroup).not.toBe(next);
    expect(postCheck(old, Buffer.from(noGroup), 'install', releases)).toBe('unexpectedShape');
    const noEvent = next.replace(/"SubagentStop": \[\],\s*/, ''); // US-0213: Notification is the app's now
    expect(noEvent).not.toBe(next);
    expect(postCheck(old, Buffer.from(noEvent), 'install', releases)).toBe('unexpectedShape');
    const hooksEmpty = fixture('hooks-empty.json');
    const withoutHooks = Buffer.from('{\n  "env": {\n    "A": "1"\n  }\n}\n');
    expect(postCheck(hooksEmpty, withoutHooks, 'remove', releases)).toBe('unexpectedShape');
  });

  it('passes the reader’s refusals through', () => {
    expect(splice(fixture('invalid.json'), 'install', releases)).toEqual({ reason: 'invalidJson' });
    expect(splice(fixture('hooks-array.json'), 'remove', releases)).toEqual({ reason: 'unexpectedShape' });
  });

  it('refuses a splice that changed a non-app value or wrote a wrong timeout (post-check)', () => {
    const old = fixture('aidlc.json');
    const next = splice(old, 'install', releases).bytes.toString();
    expect(postCheck(old, Buffer.from(next), 'install', releases)).toBeNull();
    expect(postCheck(old, Buffer.from(next.replace('"env": {', '"env": { "INJECTED": "1",')), 'install', releases)).toBe('unexpectedShape');
    const wrongTimeout = next.replace(/(dialog\.sh\\" answered; exit 0",\s*"timeout": )10/, '$111');
    expect(wrongTimeout).not.toBe(next);
    expect(postCheck(old, Buffer.from(wrongTimeout), 'install', releases)).toBe('unexpectedShape');
    expect(postCheck(old, Buffer.from(next), 'remove', releases)).toBe('unexpectedShape');
    expect(postCheck(fixture('bom.json'), splice(fixture('other-pretooluse.json'), 'install', releases).bytes, 'install', releases)).toBe('unexpectedShape');
  });

  it('builds the diff from the splices: signed lines and at most 3 lines of context (D5)', () => {
    const { diff } = splice(fixture('other-pretooluse.json'), 'install', releases);
    const lines = diff.split('\n');
    expect(lines[0]).toMatch(/^@@ -\d+,\d+ \+\d+,\d+ @@$/);
    expect(lines.every((l) => /^[ +\-@]/.test(l))).toBe(true);
    expect(lines.slice(1).findIndex((l) => l[0] !== ' ')).toBeLessThanOrEqual(3);
    expect(lines.filter((l) => l.startsWith('+')).length).toBeGreaterThan(20);
    expect(diff).not.toContain('"matcher": "Bash"'); // more than 3 lines before the splice
  });
});
