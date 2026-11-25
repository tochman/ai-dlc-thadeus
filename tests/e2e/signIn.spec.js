// US-0804 FR5.3, NFR2: the sign-in states, the agent tab's line and "Sign in" in the built app at a window width of 1280.
// Stand-in tools answer the checks, each from a file beside it, and note what they are run with; the real tools never
// run. Its own user data folder and project copy, as intentLayout.spec.js.
import { _electron as electron, expect, test } from '@playwright/test';
import { existsSync, promises as fs, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const EMAIL = `dana.${'a-very-long-family-name.'.repeat(4)}example@${'a-long-domain-name.'.repeat(3)}example.com`; // 178; a text is at most 200
const claudeAnswer = (loggedIn) => JSON.stringify({ loggedIn, apiProvider: 'firstParty', ...(loggedIn && { email: EMAIL, subscriptionType: 'max' }) });
// `--version` answers; with no argument it is the agent tab's CLI, which waits; anything else is the check's answer.
const TOOL = [
  '#!/bin/sh',
  'echo "$*" >> "$0.ran"',
  '[ "$1" = --version ] && echo 1.0.0 && exit',
  '[ $# = 0 ] && printf ready && exec cat',
  '. "$0.answer"',
  ''
].join('\n');

let tmp;
let app;
const tool = (name) => path.join(tmp, `stand-in ${name}`); // a space: the path is quoted wherever it is used
/** What a stand-in's check prints and how it exits, as shell lines. */
const answers = (name, ...lines) => writeFileSync(`${tool(name)}.answer`, `${lines.join('\n')}\n`);
const ran = (name) => (existsSync(`${tool(name)}.ran`) ? readFileSync(`${tool(name)}.ran`, 'utf8') : '');

async function setup({ project = true } = {}) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-signin-')));
  const root = path.join(tmp, 'project');
  await fs.cp(path.resolve('tests/fixtures/project'), root, { recursive: true });
  await fs.mkdir(path.join(root, '.thadeus'));
  writeFileSync(path.join(root, '.thadeus/project.json'), JSON.stringify({ version: 1, framework: 'aidlc' }));
  await fs.mkdir(path.join(root, '.claude'), { recursive: true }); // the agent tab's harness
  for (const name of ['claude', 'opencode', 'gh']) writeFileSync(tool(name), TOOL, { mode: 0o755 });
  answers('claude', `echo '${claudeAnswer(false)}'`, 'exit 1');
  answers('opencode', "echo '[]'");
  answers('gh', 'echo "To get started with GitHub CLI, please run:  gh auth login" >&2', 'exit 4');
  const userData = path.join(tmp, 'userData');
  await fs.mkdir(userData, { recursive: true });
  const nowhere = path.join(tmp, 'no-tool');
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      openProjects: project ? [root] : [],
      activeProject: project ? root : null,
      language: 'en',
      updates: { lastCheckMs: Date.now() },
      toolPaths: { aidlc: nowhere, glab: nowhere, specify: nowhere, claude: tool('claude'), opencode: tool('opencode'), gh: tool('gh') }
    })
  );
  return userData;
}

async function open(options) {
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: await setup(options) } });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900));
  return page;
}

const state = (page, id) => page.getByTestId(`settings-signin-state-${id}`);
const SLOW = { timeout: 20_000 }; // a check starts a login shell with the person's own startup files

/** Nothing inside `locator` is wider than it, and it does not scroll sideways. A path is cut with an ellipsis by design (US-0416). */
async function fits(locator) {
  const size = await locator.evaluate((el) => {
    const outer = el.getBoundingClientRect();
    const inner = [...el.querySelectorAll('*')].filter((e) => !e.closest('.sr-only, .tool-row-path')).map((e) => e.getBoundingClientRect());
    return {
      scroll: el.scrollWidth - el.clientWidth,
      right: Math.max(...inner.map((r) => r.right)) - outer.right,
      left: outer.left - Math.min(...inner.map((r) => r.left))
    };
  });
  expect(size.scroll).toBeLessThanOrEqual(0);
  expect(size.right).toBeLessThanOrEqual(1);
  expect(size.left).toBeLessThanOrEqual(1);
}

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  await fs.rm(tmp, { recursive: true, force: true });
});

test('FR2, FR5.3: Settings › Tools shows the states, and a long email and a long reason fit', async () => {
  const page = await open({ project: false });
  await page.getByTestId('app-settings-open').click();
  await expect(state(page, 'claude')).toHaveText('Not signed in', SLOW);
  await expect(state(page, 'opencode')).toHaveText('No account connected', SLOW);
  await expect(state(page, 'gh')).toHaveText('Not signed in', SLOW);
  await expect(page.locator('.tools-gh--agents.tools-gh--out')).toBeVisible();

  answers('claude', `echo '${claudeAnswer(true)}'`);
  answers('opencode', `echo '[{"id":"a","name":"Anthropic","connections":[{"id":"c"}]}]'`);
  answers('gh', `echo 'Get "https://api.github.com/user": ${'a long reason '.repeat(20)}' >&2`, 'exit 1');
  await page.getByTestId('settings-tools-rescan').click();
  await expect(state(page, 'claude')).toHaveText('Signed in', SLOW);
  await expect(page.getByTestId('settings-signin-account-claude')).toHaveText(`${EMAIL} · max`);
  await expect(page.getByTestId('settings-signin-account-opencode')).toHaveText('Anthropic', SLOW);
  await expect(state(page, 'gh')).toHaveText('Sign-in unknown', SLOW);
  await expect(page.getByTestId('settings-signin-reason-gh')).toContainText('api.github.com');
  await expect(page.locator('.tools-gh--agents.tools-gh--out')).toHaveCount(0);
  await page.waitForTimeout(800); // the entrance settles
  for (const id of ['claude', 'opencode', 'gh']) {
    await fits(page.getByTestId(`settings-tool-${id}`));
    // The state line starts where the version does.
    const left = (locator) => locator.evaluate((el) => Math.round(el.getBoundingClientRect().left));
    const row = page.getByTestId(`settings-tool-${id}`);
    expect(await left(row.locator('.tool-signin'))).toBe(await left(row.locator('.tool-row-ver')));
  }
  await fits(page.getByTestId('settings-tools'));
  const html = await page.locator('html').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(html).toBeLessThanOrEqual(0);
  await page.screenshot({ path: 'tests/.tmp/e2e-results/signin-settings.png' });
});

test('FR3.3: with no project open, Sign in shows the command, which the copy button copies', async () => {
  const page = await open({ project: false });
  await page.getByTestId('app-settings-open').click();
  await expect(state(page, 'gh')).toHaveText('Not signed in', SLOW);
  await page.getByTestId('settings-signin-gh').click();
  const command = `${tool('gh').replace(/ /g, '\\ ')} auth login --hostname github.com`;
  const shown = page.getByTestId('settings-signin-command-gh');
  await expect(shown.locator('code')).toHaveText(command);
  await expect(shown).toContainText('Run this in any terminal');
  const before = await app.evaluate(({ clipboard }) => clipboard.readText());
  await page.getByTestId('settings-signin-copy-gh').click();
  await expect(page.getByTestId('settings-signin-copy-gh')).toHaveText('Copied');
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe(command);
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), before); // the person's own clipboard
  await fits(page.getByTestId('settings-tool-gh'));
});

test("FR4, FR5.3: the agent tab's line fits, opens Settings on Tools, and Sign in types the command unsent", async () => {
  const page = await open();
  const line = page.getByTestId('terminal-panel-signin');
  await expect(line).toContainText('Claude Code is not signed in.', SLOW);
  await fits(page.getByTestId('terminal-panel-foot'));
  expect(
    ran('claude')
      .split('\n')
      .filter((args) => args === 'auth status')
  ).toHaveLength(1);
  expect(ran('gh')).not.toContain('api user'); // a start checks its own tool only
  await page.screenshot({ path: 'tests/.tmp/e2e-results/signin-line.png' });

  await page.getByTestId('terminal-panel-signin-tools').click();
  await expect(page.getByTestId('settings-view-tools')).toBeVisible();
  await page.getByTestId('settings-back').click();

  await page.getByTestId('terminal-panel-signin-start').click();
  const typed = async () => (await page.getByTestId('terminal-panel-host-shell').locator('.xterm-rows').innerText()).replace(/\s/g, '');
  const command = `${tool('claude').replace(/ /g, '\\ ')} auth login`;
  await expect.poll(typed, SLOW).toContain(command.replace(/\s/g, ''));
  await expect(page.getByTestId('terminal-panel-pending-shell')).toBeVisible();
  await expect(line).toBeHidden(); // the Shell tab is shown now
  await page.waitForTimeout(1000); // no Enter follows
  expect(ran('claude')).not.toContain('auth login');

  // Signed in meanwhile: the Shell tab going quiet checks again, and the line goes.
  answers('claude', `echo '${claudeAnswer(true)}'`);
  await page.getByTestId('terminal-panel-host-shell').locator('textarea').press('Control+c');
  await page.getByTestId('terminal-panel-tab-agent').click();
  await expect(line).toHaveCount(0, SLOW);
});
