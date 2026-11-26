// US-0048 L1-L6: the Spec Kit views show the right count and tags, and nothing is squeezed. Colours, gaps and line
// breaks that jsdom cannot measure, so the built app is opened on a temp Spec Kit project (and, for the first-open
// choice, one with both frameworks and no saved choice). The tools are stand-ins, so no real agent starts (as
// intentLayout and planning do).
/* global document, getComputedStyle -- in the functions that run in the page */
import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { standInTools } from './standInTools.js';

const LONG = 'specs/002-a-feature-with-a-rather-long-name-for-the-list';
const HOOKS = [
  'hooks:',
  '  before_specify:',
  '    - extension: git',
  '      command: speckit.git.feature',
  '      optional: false',
  '  after_implement:',
  '    - extension: git',
  '      command: speckit.git.commit',
  '    - extension: git',
  '      command: speckit.git.push',
  '      enabled: false',
  ''
].join('\n');
const TREE = {
  '.specify/init-options.json': JSON.stringify({ speckit_version: '1.4.3', ai: 'claude' }),
  '.specify/feature.json': JSON.stringify({ feature_directory: LONG }),
  '.specify/memory/constitution.md': '# Notes Constitution\n',
  '.specify/extensions.yml': HOOKS,
  '.specify/extensions/git/extension.yml': 'extension:\n  id: git\nprovides:\n  commands:\n    - name: speckit.git.commit\n      file: c.md\n',
  'specs/001-notes/spec.md': '# Spec: Notes\n',
  [`${LONG}/spec.md`]: '# Spec\n',
  [`${LONG}/tasks.md`]: '# Tasks\n\n## Phase 1: Setup\n\n- [ ] T001 One\n'
};

let tmp;
let app;

async function write(root, tree) {
  for (const [rel, text] of Object.entries(tree)) {
    await fs.mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await fs.writeFile(path.join(root, rel), text);
  }
}

const project = () => path.join(tmp, 'project');
const resize = (width) => app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setSize(w, 900), width);

/** Opens the Spec Kit project, or with `choice` a project with both frameworks and none saved (the first-open choice). */
async function open({ choice = false } = {}) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-speckit-')));
  if (choice) await fs.cp(path.resolve('tests/fixtures/project'), project(), { recursive: true });
  await write(project(), TREE);
  if (!choice) await write(project(), { '.thadeus/project.json': JSON.stringify({ version: 1, framework: 'speckit' }) });
  execFileSync('git', ['init', '-q'], { cwd: project() });
  const settings = {
    openProjects: [project()],
    activeProject: project(),
    language: 'en',
    updates: { lastCheckMs: Date.now() },
    toolPaths: standInTools(tmp) // found and signed in, so the health check's line (US-0805) is never in the layout
  };
  await write(tmp, { 'userData/settings.json': JSON.stringify(settings) });
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: path.join(tmp, 'userData') } });
  const page = await app.firstWindow();
  await resize(1280);
  if (choice) await expect(page.getByTestId('framework-choice-option-speckit')).toBeVisible();
  else await expect(page.getByTestId('speckit-features-row')).toHaveCount(2);
  await page.waitForTimeout(1200); // the US-0417 entrance animations settle
  return page;
}

async function openConfig(page, section) {
  await page.getByTestId('project-view-switch-config').click();
  await page.getByTestId(`config-section-${section}`).click();
}

const box = (locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());
/** The number of lines the element's text is drawn on. */
const lines = (locator) =>
  locator.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  });
const look = (el) => {
  const { backgroundColor, color } = getComputedStyle(el);
  return `${backgroundColor} ${color}`;
};

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  await fs.rm(tmp, { recursive: true, force: true });
});

test('L1: the foot of the arm counts the features, and follows a new and a removed one while another view shows', async () => {
  const page = await open();
  const foot = page.locator('.arm-foot-label');
  await expect(foot).toHaveText('2 features');
  await openConfig(page, 'framework');
  await expect(foot).toHaveText('2 features');
  await write(project(), { 'specs/003-tags/spec.md': '# Spec: Tags\n' });
  await expect(foot).toHaveText('3 features');
  await fs.rm(path.join(project(), 'specs/003-tags'), { recursive: true });
  await expect(foot).toHaveText('2 features');
});

test('L2: a mandatory, an optional and a turned-off hook have three different tags', async () => {
  const page = await open();
  await openConfig(page, 'speckit');
  const looks = [];
  for (const mode of ['mandatory', 'optional', 'off']) looks.push(await page.locator(`.speckit-mode-${mode}`).first().evaluate(look));
  expect(new Set(looks).size, looks.join(' | ')).toBe(3);
});

test('L3: with a long feature name, the number and the Active tag each stay on one line', async () => {
  const page = await open();
  const row = page.getByTestId('speckit-features-row').filter({ hasText: 'rather-long-name' });
  expect.soft(await lines(row.locator('code')), 'number').toBe(1);
  expect.soft(await lines(row.getByTestId('speckit-features-active')), 'active tag').toBe(1);
});

test('L4: there is a gap below Commands and below the next command', async () => {
  const page = await open();
  const commands = await box(page.getByTestId('speckit-commands-root'));
  const layout = await box(page.locator('.speckit-layout'));
  expect.soft(layout.top - commands.bottom, 'below Commands').toBeGreaterThan(0);
  const next = await box(page.getByTestId('speckit-commands-next'));
  const flow = await box(page.getByTestId('speckit-feature-flow'));
  expect.soft(flow.top - next.bottom, 'below the next command').toBeGreaterThan(0);
});

test('US-1411: from the keyboard, a feature is archived, found under the filter and unarchived, and focus goes to the list', async () => {
  const page = await open();
  const mark = path.join(project(), '.thadeus/archived/001-notes.json');
  const rows = page.getByTestId('speckit-features-row');
  const list = page.getByTestId('speckit-features-list');
  await rows.filter({ hasText: 'notes' }).focus();
  await page.keyboard.press('Enter');
  await page.getByTestId('speckit-archive-open').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('speckit-archive-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('speckit-archive-dialog')).toBeHidden();
  await expect(page.getByTestId('speckit-archive-open')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.getByTestId('speckit-archive-confirm').focus();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(1);
  await expect(list).toBeFocused();
  await expect(page.locator('.arm-foot-label')).toHaveText('1 feature');
  expect(await fs.readFile(mark, 'utf8')).toBe('{"version": 1}\n');

  await page.getByTestId('speckit-features-filter').selectOption('archived');
  const tag = page.getByTestId('speckit-features-archived');
  await expect(tag).toHaveCount(1);
  expect.soft(await lines(tag), 'archived mark').toBe(1);
  const title = await box(page.locator('.speckit-feature-head .section-title'));
  const pill = await box(page.getByTestId('speckit-archive-remove'));
  expect.soft(pill.left, 'Unarchive beside the title').toBeGreaterThanOrEqual(title.right);

  await page.getByTestId('speckit-archive-remove').focus();
  await page.keyboard.press('Enter');
  await expect(rows).toHaveCount(2);
  await expect(page.getByTestId('speckit-features-filter')).toHaveCount(0);
  await expect(list).toBeFocused();
  await expect(fs.access(mark)).rejects.toThrow();

  await write(project(), { '.thadeus/archived/001-notes.json': '{"version": 1}\n' }); // as a pull does
  await expect(rows).toHaveCount(1);
});

test('L5: the two options of the first-open choice stand side by side at 1280 and 1920', async () => {
  const page = await open({ choice: true });
  for (const width of [1280, 1920]) {
    await resize(width);
    await page.waitForTimeout(500); // the new width settles
    const first = await box(page.getByTestId('framework-choice-option-aidlc'));
    const second = await box(page.getByTestId('framework-choice-option-speckit'));
    expect.soft(second.top, `at ${width}`).toBe(first.top);
  }
});

test('L6: a disabled accent button in Configuration looks like any other disabled button', async () => {
  const page = await open();
  await openConfig(page, 'framework');
  const button = page.getByTestId('framework-switch-button');
  await button.click();
  await expect(button).toBeDisabled();
  const plain = await page.evaluateHandle(() =>
    document.body.appendChild(Object.assign(document.createElement('button'), { className: 'btn', disabled: true }))
  );
  await expect.poll(() => button.evaluate(look)).toBe(await plain.evaluate(look)); // polled: .btn fades its background
});
