import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/settings');
vi.mock('electron', () => ({ app: { getPath: () => TMP } }));
const { TOOL_IDS, getProjectSettings, getSettings, setProjectSettings, setSettings } = await import('../../src/main/settings.js');
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
    expect(TOOL_IDS).toEqual(['aidlc', 'claude', 'shell']);
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
