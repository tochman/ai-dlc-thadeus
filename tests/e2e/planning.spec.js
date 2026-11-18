// US-0608 FR9.1, FR9.2: the built app plans releases against a real repository and its bare origin, all in a temp
// folder: create a release, assign, move, remove, see the waiting list, Push now, find the commit on origin/main. On a
// story branch the same run leaves the branch, its index and its tree as they were. The app gets a temp userData
// (THADEUS_E2E_USER_DATA) whose settings open the temp project, and tool paths that point nowhere, so no agent starts.
import { _electron as electron, expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { promises as fs, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

const env = { ...process.env, GIT_AUTHOR_NAME: 'T', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 'T', GIT_COMMITTER_EMAIL: 't@example.com' };
const git = (cwd, ...args) => execFileSync('git', ['-c', 'init.defaultBranch=main', ...args], { cwd, env, encoding: 'utf8' }).trim();

const EPIC = 'docs/features/epic-01.md';
const EPIC_TEXT = [
  '# EPIC-01: One',
  '',
  '**Status (2026-11-17):** 📋 US-0101 and US-0102 planned.',
  '',
  '## User Stories',
  '',
  '**US-0101: First story** 📋 Planned',
  '- **Priority:** High',
  '',
  '**US-0102: Second story** 📋 Planned',
  '- **Priority:** Low',
  ''
].join('\n');
const OVERVIEW = '# Features\n\n| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-01](features/epic-01.md) | One | 📋 US-0101 and US-0102 planned |\n';

let tmp;
let origin;
let clone;
let app;

/** A clone of a bare origin with the feature docs on main, and settings that open it with the Releases delivery. */
async function setup() {
  tmp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'thadeus-e2e-')));
  origin = path.join(tmp, 'origin.git');
  clone = path.join(tmp, 'project');
  const userData = path.join(tmp, 'userData');
  git(tmp, 'init', '-q', '--bare', origin);
  git(tmp, 'clone', '-q', origin, clone);
  for (const [k, v] of [
    ['user.name', 'T'],
    ['user.email', 't@example.com'],
    ['commit.gpgsign', 'false']
  ])
    git(clone, 'config', k, v);
  await fs.mkdir(path.join(clone, 'docs/features'), { recursive: true });
  await fs.mkdir(path.join(clone, 'docs/releases'), { recursive: true });
  writeFileSync(path.join(clone, 'docs/FEATURES.md'), OVERVIEW);
  writeFileSync(path.join(clone, EPIC), EPIC_TEXT);
  writeFileSync(path.join(clone, 'docs/releases/1.0.0.md'), '# Release plan v1.0.0\n');
  git(clone, 'add', '.');
  git(clone, 'commit', '-q', '-m', 'start');
  git(clone, 'tag', 'v0.9.0'); // so the picker offers the next versions (v0.10.0 among them)
  git(clone, 'push', '-q', '-u', 'origin', 'main');
  await fs.mkdir(userData, { recursive: true });
  const nowhere = path.join(tmp, 'no-tool');
  const settings = {
    openProjects: [clone],
    activeProject: clone,
    language: 'en',
    updates: { lastCheckMs: Date.now() },
    toolPaths: { aidlc: nowhere, claude: nowhere, opencode: nowhere, gh: nowhere, glab: nowhere },
    projectSettings: { [clone]: { featureDocs: 'show', delivery: 'releases' } }
  };
  writeFileSync(path.join(userData, 'settings.json'), JSON.stringify(settings));
  return userData;
}

async function launch(userData) {
  app = await electron.launch({ args: [path.resolve('out/main/index.js')], env: { ...process.env, THADEUS_E2E_USER_DATA: userData } });
  const page = await app.firstWindow();
  await page.getByTestId('project-view-switch-features').click();
  await page.getByTestId('features-view-tab-releases').click();
  return page;
}

const release = (page, version) => page.getByTestId('features-view-release').filter({ hasText: version });

/** Create v1.1.0, assign US-0101 and US-0102 to v1.0.0, move US-0101 to v1.1.0 in its story detail, remove US-0102. */
async function plan(page) {
  await page.getByTestId('releases-new').click();
  await page.getByTestId('releases-new-version').fill('v1.1.0');
  await page.getByTestId('releases-new-create').click();
  await expect(release(page, 'v1.1.0')).toBeVisible();
  for (const id of ['US-0101', 'US-0102']) {
    await release(page, 'v1.0.0').getByTestId('releases-add-story').selectOption(id);
    await expect(release(page, 'v1.0.0').getByRole('button', { name: new RegExp(id) })).toBeVisible();
  }
  await release(page, 'v1.0.0')
    .getByRole('button', { name: /US-0101/ })
    .click(); // opens the story detail
  await page.getByTestId('features-view-release-picker').selectOption('v1.1.0');
  await expect(page.getByTestId('features-view-release-picker')).toHaveValue('v1.1.0');
  await page.getByTestId('features-view-tab-releases').click();
  await release(page, 'v1.0.0').getByTestId('releases-remove-story').click();
  await expect(release(page, 'v1.0.0').getByRole('button', { name: /US-0102/ })).toHaveCount(0);
}

/**
 * On a story branch the view shows the story's own tree, which the plan never touches, so each step is checked in the
 * waiting list instead: create v1.1.0, assign US-0101 to v1.0.0, and US-0102 assigned, moved and removed in its picker.
 */
async function planOnBranch(page) {
  const entries = page.getByTestId('planning-entry');
  await page.getByTestId('releases-new').click();
  await page.getByTestId('releases-new-version').fill('v1.1.0');
  await page.getByTestId('releases-new-create').click();
  await expect(entries.filter({ hasText: 'New release v1.1.0' })).toBeVisible();
  await release(page, 'v1.0.0').getByTestId('releases-add-story').selectOption('US-0101');
  await expect(entries.filter({ hasText: 'US-0101' })).toBeVisible();
  await page.getByTestId('features-view-tab-epics').click();
  await page.getByTestId('features-view-story').filter({ hasText: 'US-0102' }).click();
  for (const version of ['v1.0.0', 'v0.10.0', '']) await page.getByTestId('features-view-release-picker').selectOption(version);
  await expect(entries.filter({ hasText: 'US-0102' })).toHaveCount(3);
  await page.getByTestId('features-view-tab-releases').click();
}

/** The waiting list shows, Push now empties it, and origin/main has the plan: `planned` is US-0101's release. */
async function pushAndCheck(page, planned) {
  await expect(page.getByTestId('planning-entry').first()).toBeVisible();
  await expect(page.getByTestId('planning-target')).toHaveText('Target: origin/main');
  await page.getByTestId('planning-push-now').click();
  await expect(page.getByTestId('planning-entry')).toHaveCount(0, { timeout: 60_000 });
  const epic = git(origin, 'show', `main:${EPIC}`);
  expect(epic).toMatch(new RegExp(`\\*\\*US-0101: First story\\*\\* 📋 Planned,? for ${planned.replace(/\./g, '\\.')}\\n`));
  expect(epic).toContain('**US-0102: Second story** 📋 Planned\n');
  expect(git(origin, 'ls-tree', '--name-only', 'main', 'docs/releases/')).toContain('docs/releases/1.1.0.md');
  expect(git(origin, 'log', '--format=%s', 'main').split('\n').length).toBeGreaterThan(1);
}

test.afterEach(async () => {
  await app?.close().catch(() => {});
  app = null;
  await fs.rm(tmp, { recursive: true, force: true });
});

test('on main: create, assign, move, remove, the waiting list, Push now, the commit on origin/main (FR9.1)', async () => {
  const page = await launch(await setup());
  await plan(page);
  await pushAndCheck(page, 'v1.1.0');
  expect(git(clone, 'status', '--porcelain')).toBe('');
});

test('on a story branch: the same run leaves the branch, its index and its tree as they were (FR9.2)', async () => {
  const userData = await setup();
  git(clone, 'checkout', '-q', '-b', 'feat/US-0999');
  writeFileSync(path.join(clone, 'src.txt'), 'work in progress\n');
  git(clone, 'add', 'src.txt');
  git(clone, 'status', '--porcelain'); // settles the index's stat data before the snapshot
  const before = {
    head: git(clone, 'rev-parse', 'HEAD'),
    branch: git(clone, 'branch', '--show-current'),
    index: readFileSync(path.join(clone, '.git/index')),
    status: git(clone, 'status', '--porcelain'),
    epic: readFileSync(path.join(clone, EPIC), 'utf8')
  };
  const page = await launch(userData);
  await planOnBranch(page);
  await pushAndCheck(page, 'v1.0.0');
  expect(git(clone, 'rev-parse', 'HEAD')).toBe(before.head);
  expect(git(clone, 'branch', '--show-current')).toBe(before.branch);
  expect(readFileSync(path.join(clone, '.git/index')).equals(before.index)).toBe(true);
  expect(git(clone, 'status', '--porcelain')).toBe(before.status);
  expect(readFileSync(path.join(clone, EPIC), 'utf8')).toBe(before.epic);
});
