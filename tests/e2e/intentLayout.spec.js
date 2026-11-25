// US-0044 AC1-AC4: the intent view fits the window and its parts stay inside their frames. Layout faults (widths,
// gaps, overflow) that jsdom cannot measure, so the built app is opened on a temp copy of the fixture project whose
// in-flight intent has a long name, twelve stories, a nine-unit graph in three columns, a NOT-READY review and live
// tokens, at window widths 1280 and 1920. Tool paths point nowhere, so no agent starts (as planning.spec.js does).
// US-0509 FR5.3, NFR2: the same at 1280 with "Change plan" and its dialog open on a plan with many stages.
// US-0509 FR3.1, FR5.2: the line lands unsent in an agent tab that runs a stand-in CLI, which records what it is typed.
import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { promises as fs, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const DIR = '261112-epic29-small-k2-fixes';
const UUID = '01a1d000-0000-7000-8000-000000000003';
const SLUG = 'epic29-small-k2-fixes-with-a-long-name-for-the-layout';
const STORIES = Array.from({ length: 12 }, (_, i) => `US-29${String(40 + i)}`);
const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const git = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', ...args], { cwd, env, encoding: 'utf8' });

const AUDIT = [
  '# AI-DLC Audit Log',
  '',
  '## Review',
  '**Timestamp**: 2026-11-12T21:10:00Z',
  '**Event**: REVIEW_COMPLETED',
  '**Stage**: requirements-analysis',
  '**Reviewer**: aidlc-product-lead-agent',
  '**Iteration**: 1',
  '**Verdict**: NOT-READY',
  '',
  '---',
  ''
].join('\n');

const tokens = { input: 48000, output: 22000, cacheCreate5m: 2000, cacheCreate1h: 1000, cacheRead: 800000 };

// US-0509: a plan of the project's own with more stages than fit beside each other, and a long description.
const MANY = [
  'requirements-analysis',
  'code-generation',
  'ci-pipeline',
  ...Array.from({ length: 30 }, (_, i) => `an-extra-stage-with-quite-a-long-name-${i + 1}`)
];
const PLAN = [
  '---',
  'name: everything-and-more',
  'depth: Comprehensive',
  `description: ${'A plan with a long description that tells what it is for. '.repeat(4).trim()}`,
  '---',
  '',
  '# everything-and-more scope',
  '',
  '<!-- BEGIN aidlc composed-scope-grid -->',
  '',
  '```json',
  JSON.stringify({ stages: Object.fromEntries(MANY.map((s) => [s, 'EXECUTE'])) }),
  '```',
  '',
  '<!-- END aidlc composed-scope-grid -->',
  ''
].join('\n');

// US-0509: stands in for the agent's CLI; in raw mode it records every byte typed, Enter included, as it comes. With any
// argument it answers and exits, so `--version` and the sign-in check (US-0804) never write over what it recorded.
const AGENT = ['#!/bin/sh', '[ $# -gt 0 ] && echo 1.0.0 && exit', 'stty raw -echo', 'printf ready', 'exec cat > "$0.typed"', ''].join('\n');

let tmp;
let app;

/** The fixture project, its in-flight intent widened as the screenshots of v0.2.14 show it, and settings that open it. */
async function setup({ agent = false } = {}) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-layout-')));
  const project = path.join(tmp, 'project');
  await fs.cp(path.resolve('tests/fixtures/project'), project, { recursive: true });
  // US-1406 BR4.1: a project with no saved framework opens on the choice screen, so the fixture saves AI-DLC.
  await fs.mkdir(path.join(project, '.thadeus'));
  writeFileSync(path.join(project, '.thadeus/project.json'), JSON.stringify({ version: 1, framework: 'aidlc' }));
  const intents = path.join(project, 'aidlc/spaces/default/intents');
  const base = path.join(intents, DIR);
  const index = JSON.parse(readFileSync(path.join(intents, 'intents.json'), 'utf8'));
  writeFileSync(path.join(intents, 'intents.json'), JSON.stringify(index.map((i) => (i.dirName === DIR ? { ...i, slug: SLUG } : i))));
  writeFileSync(path.join(base, 'project-description.json'), JSON.stringify(`EPIC-29: ${STORIES.join(', ')}.`));
  const graph = JSON.parse(readFileSync(path.join(base, 'runtime-graph.json'), 'utf8'));
  const names = Array.from({ length: 9 }, (_, i) => `u${i + 1}-a-unit-with-a-long-name`);
  graph.bolt_dag = {
    units: names.map((name, i) => ({ name, kind: 'service', depends_on: i < 3 ? [] : [names[i - 3]] })),
    batches: [names.slice(0, 3), names.slice(3, 6), names.slice(6)]
  };
  writeFileSync(path.join(base, 'runtime-graph.json'), JSON.stringify(graph));
  await fs.mkdir(path.join(base, 'audit'), { recursive: true });
  writeFileSync(path.join(base, 'audit/e2e.md'), AUDIT);
  const quiet = new Date(Date.now() - 60 * 60_000); // US-0509 FR1.3: no agent elsewhere wrote to it lately
  await fs.utimes(path.join(base, 'audit/e2e.md'), quiet, quiet);
  await fs.mkdir(path.join(project, 'aidlc/scopes'), { recursive: true });
  writeFileSync(path.join(project, 'aidlc/scopes/everything-and-more.md'), PLAN);
  await fs.mkdir(path.join(project, '.claude'), { recursive: true }); // the harness whose plans are read
  await fs.mkdir(path.join(project, 'aidlc/.aidlc-sessions'), { recursive: true });
  writeFileSync(
    path.join(project, 'aidlc/.aidlc-sessions/usage-ledger.json'),
    JSON.stringify({ schemaVersion: 3, totals: { tokens, usd: 9 }, workflows: { [`intent:${UUID}`]: { totals: { tokens, usd: 9 } } } })
  );
  await fs.mkdir(path.join(project, 'docs/features'), { recursive: true });
  writeFileSync(
    path.join(project, 'docs/FEATURES.md'),
    '# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-29](features/epic-29.md) | Notes | 📋 |\n'
  );
  writeFileSync(
    path.join(project, 'docs/features/epic-29.md'),
    ['# EPIC-29: Notes', '', '## User Stories', '', ...STORIES.flatMap((id) => [`**${id}: A story** 📋 Planned`, '- **Priority:** Low', ''])].join('\n')
  );
  git(project, 'init', '-q');
  git(project, 'add', '.');
  git(project, 'commit', '-q', '-m', 'start');
  const userData = path.join(tmp, 'userData');
  await fs.mkdir(userData, { recursive: true });
  const nowhere = path.join(tmp, 'no-tool');
  const cli = path.join(tmp, 'agent');
  if (agent) writeFileSync(cli, AGENT, { mode: 0o755 });
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      openProjects: [project],
      activeProject: project,
      language: 'en',
      updates: { lastCheckMs: Date.now() },
      toolPaths: { aidlc: nowhere, claude: agent ? cli : nowhere, opencode: nowhere, gh: nowhere, glab: nowhere },
      projectSettings: { [project]: { featureDocs: 'show' } }
    })
  );
  return userData;
}

async function open(width, options) {
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: await setup(options) } });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }, w) => BrowserWindow.getAllWindows()[0].setSize(w, 900), width);
  await page.getByTestId('project-view-switch-intents').click();
  await page.getByText(SLUG).first().click();
  await expect(page.getByTestId('intent-detail-story-link')).toHaveCount(12);
  await page.waitForTimeout(1200); // the US-0417 entrance animations settle
  return page;
}

const box = (locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  await fs.rm(tmp, { recursive: true, force: true });
});

test('US-0509 at 1280: Change plan is inside the frame, and its dialog fits with a plan of many stages', async () => {
  const page = await open(1280);
  const control = page.getByTestId('plan-change-open');
  await expect(control).toHaveAttribute('aria-disabled', 'false');
  const right = (await box(page.getByTestId('lcars-diagonal-frame'))).right;
  for (const r of await page
    .getByTestId('intent-head-actions')
    .locator('button')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right)))
    expect(r).toBeLessThanOrEqual(right + 1);

  await control.click();
  const dialog = page.getByTestId('plan-change-dialog');
  const select = page.getByTestId('plan-change-plan');
  await select.click(); // Escape closes the open list only, not the dialog with the choice in it
  const list = await select.evaluate((el) => ({ open: el.matches(':open'), right: Math.max(...[...el.options].map((o) => o.getBoundingClientRect().right)) }));
  expect(list.open).toBe(true);
  expect(list.right).toBeLessThanOrEqual((await box(dialog)).right);
  await page.keyboard.press('Escape');
  expect(await select.evaluate((el) => el.matches(':open'))).toBe(false);
  await expect(dialog).toBeVisible();

  await select.selectOption('everything-and-more');
  await expect(page.getByTestId('plan-change-added').locator('li')).toHaveCount(31); // ci-pipeline and the 30 extra
  await expect(page.getByTestId('plan-change-kept')).toBeVisible();

  /** Nothing is wider than the dialog, and its buttons can be reached. */
  async function fits() {
    const size = await dialog.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth, right: el.getBoundingClientRect().right }));
    expect(size.scroll).toBeLessThanOrEqual(size.client);
    for (const r of await dialog.locator('.plan-change-form *').evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right)))
      expect(r).toBeLessThanOrEqual(size.right);
    for (const id of ['plan-change-confirm', 'plan-change-cancel']) {
      await page.getByTestId(id).scrollIntoViewIfNeeded();
      const b = await box(page.getByTestId(id));
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.bottom).toBeLessThanOrEqual(await page.locator('html').evaluate((el) => el.clientHeight));
    }
  }
  await fits();
  await page.getByTestId('plan-change-way-tailored').check();
  await page.getByTestId('plan-change-description').fill('x'.repeat(600));
  await page.getByTestId('plan-change-confirm').click();
  await expect(page.getByTestId('plan-change-error')).toBeVisible();
  await fits();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(control).toBeFocused();
});

test('US-0509: the chosen plan is typed unsent into the agent tab, which then has the focus', async () => {
  const page = await open(1280, { agent: true });
  const control = page.getByTestId('plan-change-open');
  await expect(control).toHaveAttribute('aria-disabled', 'false', { timeout: 15_000 });
  await control.click();
  await page.getByTestId('plan-change-plan').selectOption('everything-and-more');
  await expect(page.getByTestId('plan-change-added')).toBeVisible();
  await page.getByTestId('plan-change-confirm').click();
  await expect(page.getByTestId('plan-change-dialog')).toBeHidden();

  const typed = () => fs.readFile(path.join(tmp, 'agent.typed'), 'utf8').catch(() => '');
  await expect.poll(typed, { timeout: 25_000 }).toBe('/aidlc --scope everything-and-more');
  await expect(page.locator('.xterm :focus')).toHaveCount(1);
  await page.waitForTimeout(1000); // no Enter follows
  expect(await typed()).toBe('/aidlc --scope everything-and-more');
});

for (const width of [1280, 1920]) {
  test(`AC1 at ${width}: no horizontal overflow; chips, tabs, head actions, tag and head buttons inside the frame`, async () => {
    const page = await open(width);
    const detail = page.getByTestId('intent-detail');
    const { scrollWidth, clientWidth } = await detail.evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    const right = (await box(page.getByTestId('lcars-diagonal-frame'))).right;
    const inside = ['.lcars-chips', '.detail-tabs', '[data-testid="intent-head-actions"]', '.lcars-df-top .lcars-title'];
    for (const sel of inside)
      for (const b of await page.locator(`[data-testid="intent-detail"] ${sel}`).evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right)))
        expect(b, sel).toBeLessThanOrEqual(right + 1);
    const tag = page.locator('.lcars-df-tag');
    if (await tag.isVisible()) expect((await box(tag)).right).toBeLessThanOrEqual(right + 1);
    for (const r of await page
      .locator('.intent-head button, .intent-head [role="button"]')
      .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().right)))
      expect(r).toBeLessThanOrEqual(right + 1);
  });

  test(`AC2 at ${width}: the Units graph scrolls inside its panel and is no wider than the frame body`, async () => {
    const page = await open(width);
    await page.getByTestId('intent-detail-tab-units').click();
    const body = await box(page.getByTestId('lcars-diagonal-body'));
    const dag = page.locator('.bolt-dag');
    expect((await box(dag)).width).toBeLessThanOrEqual(body.width + 1);
    const { scrollWidth, clientWidth } = await page
      .getByTestId('intent-detail')
      .evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test(`AC3 at ${width}: no empty band under the title bar; the Review heading has room under the tabs`, async () => {
    const page = await open(width);
    const top = await box(page.locator('.lcars-df-top'));
    const chips = await box(page.locator('[data-testid="intent-detail"] .lcars-chips'));
    expect(chips.top - top.bottom).toBeLessThanOrEqual(40);
    await page.getByTestId('intent-detail-tab-comments').click();
    const tabs = await box(page.locator('.detail-tabs'));
    const heading = await box(page.locator('.detail-body').locator('h2, h3, h4').first());
    expect(heading.top - tabs.bottom).toBeGreaterThanOrEqual(12);
  });

  test(`US-0513 at ${width}: the chips, the step row and the request keep clear of the frame's thin line`, async () => {
    const page = await open(width);
    // Every pixel along both hairlines of the corner, in page coordinates.
    const line = await page.locator('.lcars-df-hair').evaluateAll((paths) =>
      paths.flatMap((p) => {
        const m = p.getScreenCTM();
        return Array.from({ length: Math.ceil(p.getTotalLength()) }, (_, i) => {
          const at = p.getPointAtLength(i).matrixTransform(m);
          return { x: at.x, y: at.y };
        });
      })
    );
    expect(line.length).toBeGreaterThan(100);
    for (const sel of ['.lcars-chips', '.intent-progress-step', '[data-testid="intent-detail-description"]']) {
      const b = await box(page.locator(`[data-testid="intent-detail"] ${sel}`).first());
      expect(
        line.filter((p) => p.x >= b.left - 4 && p.x <= b.right && p.y >= b.top && p.y <= b.bottom),
        sel
      ).toEqual([]);
    }
  });

  test(`AC4 at ${width}: the Live tokens panel and its chart stay inside the left arm`, async () => {
    const page = await open(width);
    for (const tab of ['pipeline', 'timeline', 'units', 'cost', 'velocity', 'comments', 'files']) {
      await page.getByTestId(`intent-detail-tab-${tab}`).click();
      await page.waitForTimeout(300);
      const arm = await box(page.locator('.lcars-df-arm'));
      const low = await box(page.locator('.lcars-df-low'));
      for (const sel of ['[data-testid="token-view"]', '.token-wave']) {
        const b = await box(page.locator(`.lcars-df-arm ${sel}`));
        expect(b.left, `${tab} ${sel}`).toBeGreaterThanOrEqual(arm.left - 1);
        expect(b.right, `${tab} ${sel}`).toBeLessThanOrEqual(arm.right + 1);
        expect(b.bottom, `${tab} ${sel}`).toBeLessThanOrEqual(low.top + 1);
      }
    }
  });
}
