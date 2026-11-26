// US-0805 FR3, FR4.4, FR5.3, NFR3: the health check in the built app at a window width of 1280: the list on the empty
// screen, the folded line, the line above a project, and "Check again". Stand-in tools answer and note what they are run
// with; the real tools never run. A tool that is missing has a chosen path with no file. Its own user data folder, as
// signIn.spec.js.
import { _electron as electron, expect, test } from '@playwright/test';
import { existsSync, promises as fs, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { installFor } from '../../src/shared/installCommands.js';
import { answerWith, standInTools, writeStandIn } from './standInTools.js';

const IDS = ['aidlc', 'claude', 'specify', 'opencode', 'gh'];
const SLOW = { timeout: 20_000 }; // a scan and a check start a login shell with the person's own startup files
// All a stand-in may be run with: the version, the sign-in checks, the AI-DLC update check (US-0504, which only reads) and
// the agent tab's start (no argument).
const READS = ['--version', 'auth status', 'auth list --format json', 'api user --hostname github.com --jq .login', 'update --check --json', ''];

let tmp;
let app;
let tools;

/** The app at 1280 with these tools missing, and Claude Code not signed in with `out`; with the AI-DLC fixture project or none. */
async function open({ project = false, missing = [], out = false } = {}) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-health-')));
  const root = path.join(tmp, 'project');
  await fs.cp(path.resolve('tests/fixtures/project'), root, { recursive: true });
  await fs.mkdir(path.join(root, '.thadeus'));
  writeFileSync(path.join(root, '.thadeus/project.json'), JSON.stringify({ version: 1, framework: 'aidlc' }));
  tools = standInTools(tmp, { missing });
  if (out) answerWith(tools.claude, `echo '${JSON.stringify({ loggedIn: false, apiProvider: 'firstParty' })}'`, 'exit 1');
  const userData = path.join(tmp, 'userData');
  await fs.mkdir(userData, { recursive: true });
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      openProjects: project ? [root] : [],
      activeProject: project ? root : null,
      language: 'en',
      updates: { lastCheckMs: Date.now() },
      toolPaths: tools
    })
  );
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: userData } });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900));
  return page;
}

const row = (page, id) => page.getByTestId(`health-tool-${id}`);
const chip = (page, id) => page.getByTestId(`health-tool-chip-${id}`);
const order = (page) =>
  page.locator('[data-testid^="health-tool-chip-"]').evaluateAll((els) => els.map((el) => el.dataset.testid.replace('health-tool-chip-', '')));
const shot = async (page, name) => {
  await page.waitForTimeout(1200); // the splash and the entrance are over
  await page.screenshot({ path: `tests/.tmp/e2e-results/health-${name}.png` });
};

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
const noSidewaysScroll = async (page) => expect(await page.locator('html').evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  const ran = Object.values(tools).flatMap((file) => (existsSync(`${file}.ran`) ? readFileSync(`${file}.ran`, 'utf8').split('\n') : []));
  await fs.rm(tmp, { recursive: true, force: true });
  // FR4.4: whatever the test did, no tool was run with anything but a read.
  expect(ran.filter((args) => !READS.includes(args))).toEqual([]);
});

test('FR3.1, FR3.2, FR4, FR5.3: the list on the empty screen, problems first, with commands that fit', async () => {
  const page = await open({ missing: ['aidlc', 'specify', 'gh'], out: true });
  await expect(page.getByTestId('health-signin-state-claude')).toHaveText('Not signed in', SLOW);
  await expect(page.getByTestId('health-signin-state-opencode')).toHaveText('Signed in', SLOW);
  await expect(page.getByTestId('health-panel-title')).toHaveText('Missing: AI-DLC CLI or Spec Kit CLI (specify).Not signed in: Claude Code CLI.');
  await expect(page.getByTestId('empty-state-open')).toBeVisible();
  expect(await order(page)).toEqual(['aidlc', 'claude', 'specify', 'opencode', 'gh']);
  for (const id of ['aidlc', 'specify', 'gh']) await expect(chip(page, id)).toHaveText('Missing');
  await expect(page.getByTestId('health-need-gh')).toContainText('Optional.');
  await expect(page.getByTestId('health-need-aidlc')).toContainText('Either AI-DLC or Spec Kit is enough.');
  await expect(page.getByTestId('health-signin-command-claude').locator('code')).toHaveText(`${tools.claude.replace(/ /g, '\\ ')} auth login`);
  await expect(page.getByTestId('health-install-command-opencode')).toHaveCount(0);

  // Copy gives exactly the command; the person's own clipboard is put back.
  const code = page.getByTestId('health-install-command-gh').locator('code');
  const command = installFor('gh', process.platform).command;
  expect(await code.evaluate((el) => el.textContent)).toBe(command);
  const before = await app.evaluate(({ clipboard }) => clipboard.readText());
  await page.getByTestId('health-install-copy-gh').click();
  await expect(page.getByTestId('health-install-copy-gh')).toHaveText('Copied');
  const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
  await app.evaluate(({ clipboard }, text) => clipboard.writeText(text), before);
  expect(copied).toBe(command);

  // The long Linux command in the same box, whatever this machine is: all of it shows, inside the box.
  const chain = installFor('gh', 'linux').command;
  await code.evaluate((el, text) => (el.textContent = text), chain);
  expect(await code.evaluate((el) => el.innerText)).toBe(chain);
  expect(await code.evaluate((el) => [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight])).toEqual([0, 0]);
  for (const id of IDS) await fits(row(page, id));
  await fits(page.getByTestId('health-panel'));
  await noSidewaysScroll(page);

  // The frame scrolls inside: its top is not cut off, and its last row can be reached.
  const body = page.locator('.empty-state .lcars-frame-body');
  await body.evaluate((el) => (el.scrollTop = 0));
  const mark = await body.evaluate((el) => {
    const { top, height } = el.querySelector('.empty-state-mark').getBoundingClientRect();
    return { top: top - el.getBoundingClientRect().top, height };
  });
  expect(mark.top).toBeGreaterThanOrEqual(0);
  expect(mark.height).toBeGreaterThan(70); // not squeezed away by the list
  await shot(page, 'list');
  await page.getByTestId('health-install-copy-gh').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('health-install-copy-gh')).toBeInViewport();
  await shot(page, 'list-end');
});

test('FR3.2: with everything found it is one line, which opens and closes', async () => {
  const page = await open();
  const fold = page.getByTestId('health-panel-fold');
  await expect(fold).toHaveText('Everything is ready', SLOW);
  await expect(fold).toHaveAttribute('aria-expanded', 'false');
  expect(await order(page)).toEqual([]);
  await shot(page, 'ready');
  await fold.focus();
  await page.keyboard.press('Enter');
  await expect(fold).toHaveAttribute('aria-expanded', 'true');
  expect((await order(page)).sort()).toEqual([...IDS].sort());
  for (const id of ['claude', 'opencode', 'gh']) await expect(page.getByTestId(`health-signin-state-${id}`)).toHaveText('Signed in', SLOW);
  await fits(page.getByTestId('health-panel'));
  await shot(page, 'ready-open');
  await page.keyboard.press('Enter');
  expect(await order(page)).toEqual([]);
});

test('FR3.3: the line above a project names what is missing; Show opens the list in place, Dismiss takes it away', async () => {
  const page = await open({ project: true, missing: ['aidlc', 'specify'] });
  const line = page.getByTestId('health-line');
  await expect(page.getByTestId('health-line-text')).toHaveText('Missing: AI-DLC CLI.', SLOW);
  const top = (locator) => locator.evaluate((el) => el.getBoundingClientRect());
  const lineBox = await top(line);
  expect(lineBox.bottom).toBeLessThanOrEqual((await top(page.locator('.project-mode').first())).top);
  await shot(page, 'line');
  await page.getByTestId('health-line-show').click();
  expect((await order(page))[0]).toBe('aidlc');
  await expect(page.getByTestId('health-need-specify')).toContainText('Optional.');
  await expect(page.getByTestId('health-install-command-aidlc').locator('code')).toHaveText(installFor('aidlc', process.platform).command);
  await fits(line);
  await noSidewaysScroll(page);
  await shot(page, 'line-open');
  await page.getByTestId('health-line-dismiss').click();
  await expect(line).toHaveCount(0);
});

test('FR3.4: a tool put in place is found by "Check again", without a restart', async () => {
  const page = await open({ missing: ['aidlc', 'specify'] });
  await expect(chip(page, 'aidlc')).toHaveText('Missing', SLOW);
  const again = page.getByTestId('health-check-again');
  await expect(again).not.toHaveAttribute('aria-disabled', 'true', SLOW);
  writeStandIn(tools.aidlc, 'aidlc');
  await again.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('health-panel-fold')).toHaveText('Everything is ready', SLOW);
  await expect(page.getByTestId('health-status')).toHaveText('Everything is ready', SLOW);
  await expect(again).toBeFocused();
});
