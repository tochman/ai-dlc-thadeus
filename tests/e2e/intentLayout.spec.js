// US-0044 AC1-AC4: the intent view fits the window and its parts stay inside their frames. Layout faults (widths,
// gaps, overflow) that jsdom cannot measure, so the built app is opened on a temp copy of the fixture project whose
// in-flight intent has a long name, twelve stories, a nine-unit graph in three columns, a NOT-READY review and live
// tokens, at window widths 1280 and 1920. Tool paths point nowhere, so no agent starts (as planning.spec.js does).
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

let tmp;
let app;

/** The fixture project, its in-flight intent widened as the screenshots of v0.2.14 show it, and settings that open it. */
async function setup() {
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
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      openProjects: [project],
      activeProject: project,
      language: 'en',
      updates: { lastCheckMs: Date.now() },
      toolPaths: { aidlc: nowhere, claude: nowhere, opencode: nowhere, gh: nowhere, glab: nowhere },
      projectSettings: { [project]: { featureDocs: 'show' } }
    })
  );
  return userData;
}

async function open(width) {
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: await setup() } });
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
