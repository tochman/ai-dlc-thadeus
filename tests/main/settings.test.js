import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/settings');
vi.mock('electron', () => ({ app: { getPath: () => TMP } }));
const { PLANNING_BRANCH_DEFAULT, PLANNING_PUSH_DEFAULT, TOOL_IDS, getProjectSettings, getSettings, setProjectSettings, setSettings } =
  await import('../../src/main/settings.js');
const FILE = path.join(TMP, 'settings.json');

beforeEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(TMP, { recursive: true });
});

afterEach(async () => {
  await fs.rm(TMP, { recursive: true, force: true });
});

describe('project settings', () => {
  it('are kept per project root in the app settings and invalid values fall back to the defaults (FR3.4)', async () => {
    expect(await getProjectSettings('/p/a')).toEqual({ featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' });
    expect(await setProjectSettings('/p/a', { featureDocs: 'show', featuresPath: 'FEATURES.md' })).toEqual({
      featureDocs: 'show',
      featuresPath: 'FEATURES.md'
    });
    expect(await setProjectSettings('/p/a', { featureDocs: 'hide' })).toEqual({ featureDocs: 'hide', featuresPath: 'FEATURES.md' });
    await expect(setProjectSettings('/p/a', { featuresPath: '../outside.md' })).rejects.toThrow(/Ogiltig sökväg/);
    await expect(setProjectSettings('/p/a', { featureDocs: 'always' })).rejects.toThrow(/Okänt värde/);

    await fs.writeFile(
      FILE,
      JSON.stringify({ openProjects: ['/p/a'], projectSettings: { '/p/a': { featureDocs: 'bogus', featuresPath: '/etc/x.md', extra: 1 }, '/p/b': 'junk' } })
    );
    const s = await getSettings();
    expect(s.projectSettings).toEqual({
      '/p/a': { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' },
      '/p/b': { featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' }
    });
    // Saving the tabs never drops the project settings.
    await setSettings({ openProjects: [], projectSettings: {} });
    expect((await getSettings()).projectSettings['/p/a']).toEqual({ featureDocs: 'auto', featuresPath: 'docs/FEATURES.md' });
  });

  it('keeps the rates path per project, left out until set or when cleared, and refuses an unsafe one (US-0211 FR1.2)', async () => {
    expect(await setProjectSettings('/p/a', { ratesPath: 'config/rates.json' })).toMatchObject({ ratesPath: 'config/rates.json' });
    expect((await getProjectSettings('/p/a')).ratesPath).toBe('config/rates.json');
    expect((await setProjectSettings('/p/a', { ratesPath: '' })).ratesPath).toBeUndefined();
    await expect(setProjectSettings('/p/a', { ratesPath: '../rates.json' })).rejects.toThrow(/ratesPath/);
    await expect(setProjectSettings('/p/a', { ratesPath: '/etc/rates.json' })).rejects.toThrow(/ratesPath/);
    await expect(setProjectSettings('/p/a', { ratesPath: 'rates.txt' })).rejects.toThrow(/ratesPath/);
    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/a': { ratesPath: '../x.json' } } }));
    expect((await getProjectSettings('/p/a')).ratesPath).toBeUndefined();
  });

  it('keeps the handoff settings per project: defaults until saved, bounds on the threshold, booleans only (US-0213 FR6.1, FR6.3)', async () => {
    expect((await getProjectSettings('/p/h')).handoff).toBeUndefined(); // the defaults apply where it is read
    const saved = await setProjectSettings('/p/h', { handoff: { threshold: 200_000, onStage: false } });
    expect(saved.handoff).toEqual({ threshold: 200_000, onThreshold: true, onStage: false, onGate: true, autoCompactWindow: false });
    expect((await setProjectSettings('/p/h', { handoff: { autoCompactWindow: true } })).handoff).toMatchObject({
      threshold: 200_000,
      onStage: false,
      autoCompactWindow: true
    });
    for (const bad of [{ threshold: 9_999 }, { threshold: 1_000_001 }, { threshold: 150_000.5 }, { onGate: 'yes' }, { other: 1 }, 'x'])
      await expect(setProjectSettings('/p/h', { handoff: bad })).rejects.toThrow(/handoff/);
    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/h': { handoff: { threshold: 5, onGate: 'no', autoCompactWindow: true } } } }));
    expect((await getProjectSettings('/p/h')).handoff).toEqual({ threshold: 150_000, onThreshold: true, onStage: true, onGate: true, autoCompactWindow: true });
  });

  it('keeps the delivery setting per project, left out until chosen so Releases applies, and refuses an unknown one (US-0603 FR1.1)', async () => {
    expect((await getProjectSettings('/p/d')).delivery).toBeUndefined();
    expect(await setProjectSettings('/p/d', { delivery: 'continuous' })).toMatchObject({ delivery: 'continuous' });
    expect((await getProjectSettings('/p/d')).delivery).toBe('continuous');
    await expect(setProjectSettings('/p/d', { delivery: 'weekly' })).rejects.toThrow(/weekly/);
    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/d': { delivery: 'weekly' }, '/p/e': { delivery: 'releases' } } }));
    const { projectSettings } = await getSettings();
    expect(projectSettings['/p/d'].delivery).toBeUndefined();
    expect(projectSettings['/p/e'].delivery).toBe('releases');
  });

  it('keeps the harness per project and drops an invalid one, so the default applies (EPIC-08 US-0801 FR2.3, FR2.4)', async () => {
    expect(await setProjectSettings('/p/a', { harness: 'opencode' })).toMatchObject({ harness: 'opencode' });
    expect(await getProjectSettings('/p/b')).not.toHaveProperty('harness'); // project B keeps the default
    await setProjectSettings('/p/b', { featureDocs: 'show' });
    expect((await getSettings()).projectSettings['/p/a'].harness).toBe('opencode'); // read back from the file
    await expect(setProjectSettings('/p/a', { harness: 'codex' })).rejects.toThrow(/codex/);
    await expect(setProjectSettings('/p/a', { harness: 'claude; rm -rf /' })).rejects.toThrow();

    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/a': { harness: 'bogus' }, '/p/b': { harness: 'claude' } } }));
    const s = await getSettings();
    expect(s.projectSettings['/p/a']).not.toHaveProperty('harness');
    expect(s.projectSettings['/p/b'].harness).toBe('claude');
  });

  it('keeps the Animationer choice and leaves out an invalid one so the default applies (EPIC-04 FR4.2)', async () => {
    expect((await getSettings()).animations).toBeUndefined(); // nothing saved: the renderer picks Full or Dämpad
    await setSettings({ animations: 'off' });
    expect((await getSettings()).animations).toBe('off');
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps the choice
    expect((await getSettings()).animations).toBe('off');

    await fs.writeFile(FILE, JSON.stringify({ openProjects: [], animations: 'blink' }));
    const s = await getSettings();
    expect('animations' in s).toBe(false);
    await setSettings({ animations: 42 });
    expect(JSON.parse(await fs.readFile(FILE, 'utf8'))).not.toHaveProperty('animations');
  });

  it('keeps the fullscreen mode as a boolean and leaves out anything else (EPIC-04 US-0404 FR1.3)', async () => {
    expect((await getSettings()).fullscreen).toBeUndefined();
    await setSettings({ fullscreen: true });
    expect((await getSettings()).fullscreen).toBe(true);
    await setSettings({ openProjects: ['/p/a'], activeProject: '/p/a' }); // the renderer saving its tabs keeps it
    expect((await getSettings()).fullscreen).toBe(true);
    await setSettings({ fullscreen: false });
    expect((await getSettings()).fullscreen).toBe(false);

    await fs.writeFile(FILE, JSON.stringify({ openProjects: [], fullscreen: 'yes' }));
    expect('fullscreen' in (await getSettings())).toBe(false);
    await setSettings({ fullscreen: 1 });
    expect(JSON.parse(await fs.readFile(FILE, 'utf8'))).not.toHaveProperty('fullscreen');
  });

  it('keeps questionAlerts and notificationSound and leaves out invalid values (EPIC-05 US-0505 FR4.1)', async () => {
    const s0 = await getSettings();
    expect('questionAlerts' in s0 || 'notificationSound' in s0).toBe(false); // unset: Popup och notis, sound on
    for (const mode of ['popup', 'off', 'popup-notify']) {
      await setSettings({ questionAlerts: mode });
      expect((await getSettings()).questionAlerts).toBe(mode);
    }
    await setSettings({ notificationSound: false });
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps both
    expect(await getSettings()).toMatchObject({ questionAlerts: 'popup-notify', notificationSound: false });

    await fs.writeFile(FILE, JSON.stringify({ openProjects: [], questionAlerts: 'always', notificationSound: 'yes' }));
    const s = await getSettings();
    expect('questionAlerts' in s).toBe(false);
    expect('notificationSound' in s).toBe(false);
    await setSettings({ questionAlerts: 7, notificationSound: null });
    expect(JSON.parse(await fs.readFile(FILE, 'utf8'))).not.toHaveProperty('questionAlerts');
    expect(JSON.parse(await fs.readFile(FILE, 'utf8'))).not.toHaveProperty('notificationSound');
  });

  it('keeps a valid language and leaves out an invalid one, so auto applies (EPIC-07 US-0701 FR4.3)', async () => {
    expect('language' in (await getSettings())).toBe(false); // nothing saved: auto
    for (const language of ['en', 'sv', 'auto']) {
      await setSettings({ language });
      expect((await getSettings()).language).toBe(language);
    }
    await setSettings({ language: 'en' });
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps the choice
    expect((await getSettings()).language).toBe('en');

    await fs.writeFile(FILE, JSON.stringify({ openProjects: [], language: 'de' }));
    expect('language' in (await getSettings())).toBe(false);
    await setSettings({ language: 42 });
    expect(JSON.parse(await fs.readFile(FILE, 'utf8'))).not.toHaveProperty('language');
  });

  it('keeps the chosen tool paths and the default project folder, and drops anything that is not an absolute path (US-0405 FR7.1)', async () => {
    expect(TOOL_IDS).toEqual(['aidlc', 'claude', 'opencode', 'gh', 'glab', 'specify', 'shell']); // US-0410 FR4.1, glab since US-1201 AC-1, specify since US-1405 FR3 (R-03)
    const empty = await getSettings();
    expect('toolPaths' in empty).toBe(false); // nothing saved: every tool is found automatically
    expect('defaultProjectFolder' in empty).toBe(false);

    const chosen = { aidlc: '/opt/aidlc/bin/aidlc', shell: '/bin/zsh' };
    await setSettings({ toolPaths: chosen, defaultProjectFolder: '/Users/x/Projects' });
    expect(await getSettings()).toMatchObject({ toolPaths: chosen, defaultProjectFolder: '/Users/x/Projects' });
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps both
    expect(await getSettings()).toMatchObject({ toolPaths: chosen, defaultProjectFolder: '/Users/x/Projects' });

    // A relative path, a non-string and a NUL byte are dropped, so the automatic path applies to those tools.
    await setSettings({ toolPaths: { aidlc: 'bin/aidlc', claude: 42, shell: '/bin/zsh' }, defaultProjectFolder: 'relative/folder' });
    const partial = await getSettings();
    expect(partial.toolPaths).toEqual({ shell: '/bin/zsh' });
    expect('defaultProjectFolder' in partial).toBe(false);

    await fs.writeFile(FILE, JSON.stringify({ toolPaths: { aidlc: '/a\0b', claude: '/usr/local/bin/claude' }, defaultProjectFolder: '/x\0y' }));
    const read = await getSettings();
    expect(read.toolPaths).toEqual({ claude: '/usr/local/bin/claude' });
    expect('defaultProjectFolder' in read).toBe(false);
  });

  it('keeps the updater memory and drops a non-boolean deleteAfterInstall (EPIC-04 US-0407)', async () => {
    expect('updates' in (await getSettings())).toBe(false); // nothing saved: UPDATE_DEFAULTS apply
    const updates = { lastCheckMs: 1700000000000, skipVersion: '0.2.4', deleteAfterInstall: false };
    await setSettings({ updates });
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps it
    expect((await getSettings()).updates).toEqual(updates);

    // A partial change is merged, and invalid values never replace valid ones.
    await setSettings({ updates: { deleteAfterInstall: true } });
    expect((await getSettings()).updates).toEqual({ ...updates, deleteAfterInstall: true });
    await setSettings({ updates: { lastCheckMs: -1, skipVersion: '1.0; rm', deleteAfterInstall: 'no' } });
    expect((await getSettings()).updates).toEqual({ ...updates, deleteAfterInstall: true });
    await fs.writeFile(FILE, JSON.stringify({ updates: { lastCheckMs: 'x', deleteAfterInstall: 'no' } }));
    expect('updates' in (await getSettings())).toBe(false);
    await fs.writeFile(FILE, JSON.stringify({ updates: { skipVersion: '0.3.0', deleteAfterInstall: 1 } }));
    expect((await getSettings()).updates).toEqual({ skipVersion: '0.3.0' });
  });

  it('keeps the side-by-side harness tabs and drops an unknown harness id (EPIC-08 US-0803)', async () => {
    expect(await setProjectSettings('/p/a', { harnessTabs: ['opencode', 'claude', 'claude'] })).toMatchObject({
      harnessTabs: ['claude', 'opencode']
    });
    expect((await getSettings()).projectSettings['/p/a'].harnessTabs).toEqual(['claude', 'opencode']);
    await expect(setProjectSettings('/p/a', { harnessTabs: ['claude', 'codex'] })).rejects.toThrow(/codex/);
    await expect(setProjectSettings('/p/a', { harnessTabs: [] })).rejects.toThrow();

    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/a': { harnessTabs: ['bogus'] }, '/p/b': { harnessTabs: ['opencode', 'x'] } } }));
    const s = await getSettings();
    expect(s.projectSettings['/p/a']).not.toHaveProperty('harnessTabs'); // US-0801's single choice applies
    expect(s.projectSettings['/p/b'].harnessTabs).toEqual(['opencode']);
  });

  // US-0210 FR1.5, AC1.1.4–AC1.1.6: the model profiles per project.
  it('keeps the model profiles per project, merges a partial change, and falls back on invalid parts (US-0210 FR1.5)', async () => {
    expect((await getProjectSettings('/p/m')).modelProfiles).toBeUndefined();
    const saved = {
      criticalPlans: ['feature', 'mvp'],
      critical: { from: 'strong', models: { developer: 'opus', architect: 'opus' } },
      economy: { models: { developer: 'sonnet' } },
      askBeforeBack: true
    };
    expect((await setProjectSettings('/p/m', { modelProfiles: saved })).modelProfiles).toEqual({ ...saved, active: null });
    await setProjectSettings('/p/m', { modelProfiles: { active: 'critical' } }); // main saves only the active profile
    expect((await getSettings()).projectSettings['/p/m'].modelProfiles).toEqual({ ...saved, active: 'critical' });

    await fs.writeFile(
      FILE,
      JSON.stringify({
        projectSettings: {
          '/p/m': {
            modelProfiles: {
              criticalPlans: ['ok', 7],
              critical: { from: 'Bad Name', models: { 'dev eloper': 'x', quality: 3, developer: 'opus' } },
              economy: 'junk',
              askBeforeBack: 'yes',
              active: 'turbo'
            }
          }
        }
      })
    );
    expect((await getSettings()).projectSettings['/p/m'].modelProfiles).toEqual({
      criticalPlans: ['ok'],
      critical: { models: { developer: 'opus' } },
      economy: { models: {} },
      askBeforeBack: false,
      active: null
    });
  });

  it('refuses a saved profile name that does not match the name rule and keeps the earlier value (US-0210 AC1.1.6)', async () => {
    await setProjectSettings('/p/m', { modelProfiles: { critical: { from: 'strong', models: {} } } });
    await expect(setProjectSettings('/p/m', { modelProfiles: { critical: { from: 'strong; rm -rf /', models: {} } } })).rejects.toThrow(/strong; rm -rf/);
    await expect(setProjectSettings('/p/m', { modelProfiles: { economy: { from: '-x', models: {} } } })).rejects.toThrow();
    expect((await getProjectSettings('/p/m')).modelProfiles.critical).toEqual({ from: 'strong', models: {} });
  });

  it('keeps both changes when two writes run at the same time (FR3.5)', async () => {
    await Promise.all([
      setSettings({ openProjects: ['/p/a', '/p/b'], activeProject: '/p/b' }),
      setProjectSettings('/p/a', { featureDocs: 'hide' }),
      setProjectSettings('/p/b', { featuresPath: 'FEATURES.md' })
    ]);
    const s = JSON.parse(await fs.readFile(FILE, 'utf8'));
    expect(s.openProjects).toEqual(['/p/a', '/p/b']);
    expect(s.activeProject).toBe('/p/b');
    expect(s.projectSettings).toEqual({
      '/p/a': { featureDocs: 'hide', featuresPath: 'docs/FEATURES.md' },
      '/p/b': { featureDocs: 'auto', featuresPath: 'FEATURES.md' }
    });
  });
});

// US-0607 FR3.1, FR3.3: the push interval (app-wide) and the docs branch (per project).
describe('release planning settings (US-0607)', () => {
  it('keeps a push interval of 1 to 120 whole minutes and leaves out anything else, so 10 applies (FR3.1)', async () => {
    expect(PLANNING_PUSH_DEFAULT).toBe(10);
    expect((await setSettings({ planningPushMinutes: 25 })).planningPushMinutes).toBe(25);
    expect((await setSettings({ planningPushMinutes: 1 })).planningPushMinutes).toBe(1);
    for (const bad of [0, 121, 2.5, '10', null]) {
      expect(await setSettings({ planningPushMinutes: bad })).not.toHaveProperty('planningPushMinutes');
    }
  });

  it('keeps a valid docs branch per project and refuses an invalid one (FR3.3, NFR3)', async () => {
    expect(PLANNING_BRANCH_DEFAULT).toBe('docs/planning');
    expect(await setProjectSettings('/p/a', { planningBranch: 'docs/release-plans' })).toMatchObject({ planningBranch: 'docs/release-plans' });
    for (const bad of ['-x', 'a..b', 'has space', 'main', '/docs', 'docs/', 'x.lock', 'a//b', 'a~b', 'a@{1}', '.hidden', '']) {
      await expect(setProjectSettings('/p/a', { planningBranch: bad })).rejects.toThrow(/Okänt värde|Ogiltig/);
    }
    expect((await getProjectSettings('/p/a')).planningBranch).toBe('docs/release-plans');
  });

  it('drops an invalid docs branch read from the file, so the default applies', async () => {
    await fs.writeFile(FILE, JSON.stringify({ projectSettings: { '/p/a': { planningBranch: 'bad..name' }, '/p/b': { planningBranch: 'docs/x' } } }));
    const s = await getSettings();
    expect(s.projectSettings['/p/a']).not.toHaveProperty('planningBranch');
    expect(s.projectSettings['/p/b'].planningBranch).toBe('docs/x');
  });
});

// US-0410 FR5.1, FR4.2: the last Settings tab, and the chosen paths for opencode and gh.
describe('settingsTab and the new tool paths (US-0410)', () => {
  it.each(['tools', 'appearance', 'notifications', 'project', 'about'])('keeps settingsTab %s on write and on read', async (tab) => {
    expect((await setSettings({ settingsTab: tab })).settingsTab).toBe(tab);
    expect((await getSettings()).settingsTab).toBe(tab);
  });

  it('drops an unknown or wrong-typed settingsTab, so Settings opens on Tools', async () => {
    for (const bad of ['pipeline', 'Tools', 42, null, '', {}]) {
      await fs.writeFile(FILE, JSON.stringify({ settingsTab: bad }));
      expect(await getSettings()).not.toHaveProperty('settingsTab');
      expect(await setSettings({ settingsTab: bad })).not.toHaveProperty('settingsTab');
    }
  });

  it('keeps chosen paths for opencode and gh like the other tools (FR4.2)', async () => {
    const chosen = { opencode: '/opt/homebrew/bin/opencode', gh: '/opt/homebrew/bin/gh' };
    expect((await setSettings({ toolPaths: chosen })).toolPaths).toEqual(chosen);
    expect((await getSettings()).toolPaths).toEqual(chosen);
    expect((await setSettings({ toolPaths: { gh: 'bin/gh' } })).toolPaths).toBeUndefined(); // relative: dropped
  });
});

// US-0415 FR5.3, AC5.1.3: the folded list column, kept per view.
describe('listFolded (US-0415)', () => {
  it('keeps listFolded with known view ids and booleans, on write and on read', async () => {
    const listFolded = { intents: true, features: false, editor: true };
    expect((await setSettings({ listFolded })).listFolded).toEqual(listFolded);
    await setSettings({ openProjects: ['/p/a'] }); // saving the tabs keeps it
    expect((await getSettings()).listFolded).toEqual(listFolded);
  });

  it('drops an unknown view id', async () => {
    expect((await setSettings({ listFolded: { intents: true, pipeline: true, constructor: false } })).listFolded).toEqual({ intents: true });
    await fs.writeFile(FILE, JSON.stringify({ listFolded: { bogus: true } }));
    expect(await getSettings()).not.toHaveProperty('listFolded');
  });

  it('drops a non-boolean value, and a listFolded that is no object', async () => {
    expect((await setSettings({ listFolded: { intents: 'yes', features: 1, editor: false } })).listFolded).toEqual({ editor: false });
    for (const bad of ['intents', 42, null, [true], true]) {
      await fs.writeFile(FILE, JSON.stringify({ listFolded: bad }));
      expect(await getSettings()).not.toHaveProperty('listFolded');
    }
  });
});

// US-0506 u5 D1, SD55, PD51: the reply alerts setting and the synchronous settings copy.
describe('replyAlerts and settingsNow (US-0506 u5)', () => {
  it.each(['dialog-notify', 'line', 'off'])('keeps %s on write and on read', async (value) => {
    expect((await setSettings({ replyAlerts: value })).replyAlerts).toBe(value);
    expect((await getSettings()).replyAlerts).toBe(value);
  });

  it('leaves out a missing, unknown or wrong-typed value without throwing, so the default applies', async () => {
    for (const bad of ['loud', 42, null, '', 'Off', 'line ', true, {}, [], '__proto__']) {
      await fs.writeFile(FILE, JSON.stringify({ replyAlerts: bad }));
      expect(await getSettings()).not.toHaveProperty('replyAlerts');
      expect(await setSettings({ replyAlerts: bad })).not.toHaveProperty('replyAlerts');
    }
    await fs.writeFile(FILE, JSON.stringify({}));
    expect(await getSettings()).not.toHaveProperty('replyAlerts');
  });

  it('keeps questionAlerts and notificationSound sanitising unchanged beside it', async () => {
    const s = await setSettings({ replyAlerts: 'line', questionAlerts: 'popup', notificationSound: false });
    expect(s).toMatchObject({ replyAlerts: 'line', questionAlerts: 'popup', notificationSound: false });
    const bad = await setSettings({ questionAlerts: 'line', notificationSound: 'no' }); // a reply value is no question value
    expect(bad.replyAlerts).toBe('line');
    expect(bad).not.toHaveProperty('questionAlerts');
    expect(bad).not.toHaveProperty('notificationSound');
  });

  it('settingsNow gives the defaults-only copy before the first read', async () => {
    vi.resetModules();
    const fresh = await import('../../src/main/settings.js');
    await fs.writeFile(FILE, JSON.stringify({ replyAlerts: 'off' }));
    expect(fresh.settingsNow()).toEqual({ openProjects: [], recentProjects: [], activeProject: null, projectSettings: {} });
  });

  it('settingsNow gives what getSettings last read and what setSettings last resolved', async () => {
    const m = await import('../../src/main/settings.js'); // the same instance as settingsNow, after any reset
    await fs.writeFile(FILE, JSON.stringify({ replyAlerts: 'off', questionAlerts: 'popup' }));
    await m.getSettings();
    expect(m.settingsNow()).toMatchObject({ replyAlerts: 'off', questionAlerts: 'popup' });
    await m.setSettings({ replyAlerts: 'line' });
    expect(m.settingsNow().replyAlerts).toBe('line');
  });
});
