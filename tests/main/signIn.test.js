// US-0804 FR1.1, FR1.2, FR1.6, FR1.7, NFR1, NFR3: the sign-in check against real stand-in scripts, a real shell and a
// stand-in startup file, all in a temporary folder with its own HOME. The real tools never run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { t } from '../../src/shared/i18n.js';

const TMP = path.resolve(__dirname, '../.tmp/signIn');
const BIN = path.join(TMP, 'bin');
const HOME = path.join(TMP, 'home');
const SHELL = existsSync('/bin/zsh') ? '/bin/zsh' : '/bin/bash';
const SAVED = ['SHELL', 'HOME', 'ZDOTDIR', 'PATH', 'SIGN_IN_TEST_KEY'];
const SIGNED_IN = JSON.stringify({ loggedIn: true, apiProvider: 'firstParty', email: 'dana@example.com', subscriptionType: 'pro' });
const SIGNED_OUT = JSON.stringify({ loggedIn: false, apiProvider: 'firstParty' });

let checkSignIn;
let tools;
let env;
let logs;

async function script(file, lines) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, ['#!/bin/sh', ...lines, ''].join('\n'), { mode: 0o755 });
  return file;
}
const tool = (name, ...lines) => script(path.join(BIN, name), lines);
/**
 * The login shell's startup file: zsh reads .zshrc, bash .bash_profile. Its PATH is the stand-ins and the system's own
 * commands, never the PATH this test was started with, so a real tool is not found.
 */
async function startup(...lines) {
  const text = [`export PATH="${BIN}:/usr/bin:/bin"`, ...lines, ''].join('\n');
  await fs.mkdir(HOME, { recursive: true });
  for (const name of ['.zshrc', '.bash_profile']) await fs.writeFile(path.join(HOME, name), text);
}
const gone = (pid) => {
  try {
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
};

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(BIN, { recursive: true });
  env = Object.fromEntries(SAVED.map((key) => [key, process.env[key]]));
  Object.assign(process.env, { SHELL, HOME, ZDOTDIR: HOME, PATH: `${BIN}:/usr/bin:/bin` });
  await startup();
  vi.resetModules(); // an empty login-PATH cache, saved-path map and list of running checks per test
  tools = await import('../../src/main/tools.js');
  ({ checkSignIn } = await import('../../src/main/signIn.js'));
  logs = ['log', 'info', 'warn', 'error', 'debug'].map((name) => vi.spyOn(console, name).mockImplementation(() => {}));
});

afterEach(async () => {
  const logged = logs.flatMap((log) => log.mock.calls);
  vi.restoreAllMocks();
  for (const key of SAVED) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  await fs.rm(TMP, { recursive: true, force: true });
  expect(logged).toEqual([]); // NFR1: no output, account or reason is logged, whatever the test did
});

describe('checkSignIn (US-0804 FR1.1)', () => {
  it('runs the fixed command of each tool and gives only state, account and reason', async () => {
    await tool('gh', '[ "$*" = "api user --hostname github.com --jq .login" ] && echo octo-dana');
    await tool('claude', `[ "$*" = "auth status" ] && echo '${SIGNED_IN}'`);
    await tool('opencode', '[ "$*" = "auth list --format json" ] && echo \'[{"id":"a","name":"Anthropic","connections":[{"id":"c"}]}]\'');
    expect(await checkSignIn('gh')).toEqual({ state: 'in', account: 'octo-dana', reason: null });
    expect(await checkSignIn('claude')).toEqual({ state: 'in', account: 'dana@example.com · pro', reason: null });
    expect(await checkSignIn('opencode')).toEqual({ state: 'in', account: 'Anthropic', reason: null });
  });

  it("reads gh's exit code and stderr, and Claude Code's answer with exit 1", async () => {
    await tool('gh', 'echo "To get started with GitHub CLI, please run:  gh auth login" >&2', 'exit 4');
    await tool('claude', `echo '${SIGNED_OUT}'`, 'exit 1');
    expect(await checkSignIn('gh')).toMatchObject({ state: 'out' });
    expect(await checkSignIn('claude')).toMatchObject({ state: 'out' });
    await tool('gh', 'echo "Get \\"https://api.github.com/user\\": connection refused" >&2', 'exit 1');
    expect(await checkSignIn('gh')).toEqual({ state: 'unknown', account: null, reason: 'Get "https://api.github.com/user": connection refused' });
  });

  it('gives null for a tool that is not found, and runs nothing for an id outside the table', async () => {
    await startup(`export PATH="${BIN}"`); // nothing but the stand-ins, and there is none yet
    for (const id of ['gh', 'claude', 'opencode']) expect(await checkSignIn(id)).toBeNull();
    await tool('gh', 'echo octo-dana');
    tools.setToolPaths({ gh: path.join(TMP, 'moved') }); // a chosen path that is gone
    expect(await checkSignIn('gh')).toBeNull();
    const ran = path.join(TMP, 'ran');
    for (const name of ['glab', 'aidlc']) await tool(name, `touch ${ran}`);
    for (const id of ['glab', 'aidlc', 'shell', 'constructor', '__proto__', `claude; touch ${ran}`, undefined, { id: 'gh' }])
      await expect(Promise.resolve().then(() => checkSignIn(id))).rejects.toThrow(t('errors.unknownTool', { id: String(id) }));
    expect(existsSync(ran)).toBe(false);
  });
});

describe('as an agent tab would run it (US-0804 FR1.2, AC1.2.5)', () => {
  it('a key set in the startup file counts, and a greeting from it changes nothing', async () => {
    await startup('export SIGN_IN_TEST_KEY=set', `echo 'Welcome! ${SIGNED_OUT}'`, 'echo "You have mail" >&2');
    await tool('claude', `[ -n "$SIGN_IN_TEST_KEY" ] && echo '${SIGNED_IN}' || echo '${SIGNED_OUT}'`);
    expect(await checkSignIn('claude')).toMatchObject({ state: 'in', account: 'dana@example.com · pro' });
  });

  it('a chosen path with a space and a quote is run as one word', async () => {
    const file = await script(path.join(TMP, "dana's tools", 'claude'), [`echo '${SIGNED_IN}'`]);
    tools.setToolPaths({ claude: file });
    expect(await checkSignIn('claude')).toMatchObject({ state: 'in' });
  });

  it('a shell that ends before the tool is unknown, whatever its startup file printed', async () => {
    await tool('claude', `echo '${SIGNED_OUT}'`);
    tools.setToolPaths({ shell: await script(path.join(TMP, 'odd-shell'), [`echo '${SIGNED_IN}'`, 'exit 1']) });
    expect(await checkSignIn('claude')).toEqual({ state: 'unknown', account: null, reason: t('signIn.reason.failed') });
  });

  it('a chosen shell that does not start the tool is unknown', async () => {
    tools.setToolPaths({
      shell: await script(path.join(TMP, 'quiet-shell'), ['echo \'[{"connections":[{}]}]\'']),
      opencode: await tool('opencode', 'echo "[]"')
    });
    expect(await checkSignIn('opencode')).toEqual({ state: 'unknown', account: null, reason: t('signIn.reason.failed') });
  });
});

describe('a check that does not answer (US-0804 FR1.1, FR1.6, AC1.2.4, AC1.2.6)', () => {
  it('a tool that asks a question meets a closed stdin', async () => {
    await tool('gh', 'read answer || echo nobody >&2', 'exit 1');
    await tool('opencode', 'cat', 'echo "[]"');
    expect(await checkSignIn('gh')).toMatchObject({ state: 'unknown', reason: 'nobody' });
    expect(await checkSignIn('opencode')).toMatchObject({ state: 'none' });
  });

  it.each([
    ['gh', 'one that hangs', 'exec sleep 600'],
    ['claude', 'one that hangs', 'exec sleep 600'],
    ['gh', 'one that ignores SIGTERM', "trap '' TERM; while :; do sleep 0.1; done"],
    ['claude', 'one that ignores SIGTERM', "trap '' TERM; while :; do sleep 0.1; done"]
  ])('%s: %s is stopped at the limit, is unknown, and its process is gone', { timeout: 15_000 }, async (id, _what, line) => {
    const pidFile = path.join(TMP, 'pid');
    await tool(id, `echo $$ > ${pidFile}`, `echo '${SIGNED_IN}'`, line);
    expect(await checkSignIn(id, { timeout: 3000 })).toEqual({ state: 'unknown', account: null, reason: t('signIn.reason.timeout') });
    const pid = Number(readFileSync(pidFile, 'utf8'));
    expect(pid).toBeGreaterThan(1);
    await vi.waitFor(() => expect(gone(pid)).toBe(true));
  });
});

describe('one process per tool (US-0804 NFR3, AC1.3.4)', () => {
  const counted = (name, count) => [`echo x >> ${count}`, 'sleep 0.3', `echo ${name}`];
  const runs = (count) => readFileSync(count, 'utf8').trim().split('\n').length;

  it('a second request while a check runs shares it; one after it runs again', async () => {
    const count = path.join(TMP, 'count');
    await tool('gh', ...counted('octo-dana', count));
    const answers = await Promise.all([checkSignIn('gh'), checkSignIn('gh')]);
    expect(answers.map((a) => a.account)).toEqual(['octo-dana', 'octo-dana']);
    expect(runs(count)).toBe(1);
    await checkSignIn('gh');
    expect(runs(count)).toBe(2);
  });

  it('a changed path, and another tool, do not share it', async () => {
    const count = path.join(TMP, 'count');
    await tool('gh', ...counted('first', count));
    await tool('opencode', 'echo "[]"');
    const first = checkSignIn('gh');
    tools.setToolPaths({ gh: await script(path.join(TMP, 'other', 'gh'), counted('second', count)) });
    const [a, b, c] = await Promise.all([first, checkSignIn('gh'), checkSignIn('opencode')]);
    expect([a.account, b.account, c.state]).toEqual(['first', 'second', 'none']);
    expect(runs(count)).toBe(2);
  });
});
