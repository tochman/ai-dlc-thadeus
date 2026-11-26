// US-0050 (motion audit): what jsdom cannot show. (a) Switching an intent tab really runs the shared tab transition on
// the new tab's content under Full, and nothing under Reduced (item 2). (b) With 25 intents and 2,000 timeline events,
// entering the intent list and opening the Timeline keeps the frames at 60 fps (p95 frame time at or under 20 ms).
// The built app is opened on a temp copy of the fixture project; the tools are stand-ins, so no real agent starts (as
// intentLayout.spec.js and speckitLayout.spec.js do).
/* global console, document, requestAnimationFrame, window -- the page's own, and the frame time printed for the report */
import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { promises as fs, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { standInTools } from './standInTools.js';

const DIR = '261112-epic29-small-k2-fixes'; // the fixture's in-flight intent, which gets the 2,000 events
const SLUG = 'epic29-small-k2-fixes';
const COPY_OF = '261110-epic02-finish';
const EXTRA = 21; // the fixture lists 4 intents (3 in its index, 1 only on disk): 25 in all
const EVENTS = 2000;
const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const git = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', '-c', 'commit.gpgsign=false', ...args], { cwd, env, encoding: 'utf8' });

/** An audit shard of `n` events, a minute apart, as the timeline reads them. */
function audit(n) {
  const start = Date.parse('2026-11-12T08:00:00Z');
  const lines = ['# AI-DLC Audit Log', ''];
  for (let i = 0; i < n; i++) {
    const stage = ['requirements-analysis', 'functional-design', 'code-generation'][i % 3];
    lines.push(
      `## Stage event ${i + 1}`,
      `**Timestamp**: ${new Date(start + i * 60_000).toISOString()}`,
      '**Event**: STAGE_PROGRESS',
      `**Stage**: ${stage}`,
      '',
      '---',
      ''
    );
  }
  return lines.join('\n');
}

let tmp;
let app;

async function setup(animations) {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-motion-')));
  const project = path.join(tmp, 'project');
  await fs.cp(path.resolve('tests/fixtures/project'), project, { recursive: true });
  await fs.mkdir(path.join(project, '.thadeus'));
  writeFileSync(path.join(project, '.thadeus/project.json'), JSON.stringify({ version: 1, framework: 'aidlc' }));
  const intents = path.join(project, 'aidlc/spaces/default/intents');
  const index = JSON.parse(readFileSync(path.join(intents, 'intents.json'), 'utf8'));
  const source = index.find((i) => i.dirName === COPY_OF);
  for (let n = 0; n < EXTRA; n++) {
    const dirName = `2611${String(n).padStart(2, '0')}-motion-${n}`;
    await fs.cp(path.join(intents, COPY_OF), path.join(intents, dirName), { recursive: true });
    index.push({ ...source, dirName, slug: `motion-${n}`, uuid: `01a1e000-0000-7000-8000-${String(n).padStart(12, '0')}` });
  }
  writeFileSync(path.join(intents, 'intents.json'), JSON.stringify(index));
  await fs.mkdir(path.join(intents, DIR, 'audit'), { recursive: true });
  writeFileSync(path.join(intents, DIR, 'audit/e2e.md'), audit(EVENTS));
  git(project, 'init', '-q');
  git(project, 'add', '.');
  git(project, 'commit', '-q', '-m', 'start');
  const userData = path.join(tmp, 'userData');
  await fs.mkdir(userData, { recursive: true });
  writeFileSync(
    path.join(userData, 'settings.json'),
    JSON.stringify({
      openProjects: [project],
      activeProject: project,
      language: 'en',
      animations,
      updates: { lastCheckMs: Date.now() },
      toolPaths: standInTools(tmp)
    })
  );
  return userData;
}

/** Opens the app with `animations` and shows the in-flight intent, its entrance settled. */
async function open(animations) {
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: await setup(animations) } });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(1280, 900));
  await page.getByTestId('project-view-switch-intents').click();
  await expect(page.getByTestId('intent-list-row')).toHaveCount(25);
  await page.getByTestId('intent-list-row').filter({ hasText: SLUG }).first().click();
  await expect(page.getByTestId('intent-detail')).toBeVisible();
  await page.waitForTimeout(1200); // the US-0417 entrance animations settle
  return page;
}

/** The names of the CSS animations on the element itself, as the page sees them. */
const animationsOn = (locator) => locator.evaluate((el) => el.getAnimations().map((a) => a.animationName));

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  await fs.rm(tmp, { recursive: true, force: true });
});

test('US-0050 (a): a switched intent tab’s content runs the tab transition under Full, and nothing under Reduced', async () => {
  const page = await open('full');
  await page.getByTestId('intent-detail-tab-velocity').click();
  expect(await animationsOn(page.getByTestId('intent-detail-tab-content'))).toContain('lcars-tab-in');
  await app.close();

  const still = await open('reduced');
  await still.getByTestId('intent-detail-tab-velocity').click();
  expect(await animationsOn(still.getByTestId('intent-detail-tab-content'))).toEqual([]);
});

test('US-0050 (b): entering the intent list and the Timeline with 25 intents and 2,000 events keeps p95 frames at or under 20 ms', async () => {
  const page = await open('full');
  await page.getByTestId('project-view-switch-config').click();
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const frames = [];
    let last = null;
    window.__motionFrames = frames;
    window.__motionRun = true;
    const tick = (now) => {
      if (last != null) frames.push(now - last);
      last = now;
      if (window.__motionRun) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.getByTestId('project-view-switch-intents').click(); // the list enters
  await page.waitForTimeout(1200);
  await page.getByTestId('intent-detail-tab-timeline').click(); // 2,000 events, virtualized
  await expect(page.getByTestId('timeline-event').first()).toBeVisible();
  await page.waitForTimeout(1200);
  const frames = await page.evaluate(() => {
    window.__motionRun = false;
    return window.__motionFrames;
  });
  const sorted = [...frames].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  console.log(`US-0050 frames: ${frames.length}, p95 ${p95.toFixed(1)} ms, max ${sorted.at(-1).toFixed(1)} ms`);
  expect(frames.length).toBeGreaterThan(60);
  expect(p95).toBeLessThanOrEqual(20);
  expect(await page.evaluate(() => document.querySelectorAll('[data-testid="timeline-event"]').length)).toBeLessThan(200); // still virtualized
});
