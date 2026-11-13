import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp/settings');
vi.mock('electron', () => ({ app: { getPath: () => TMP } }));
const { getProjectSettings, getSettings, setProjectSettings, setSettings } = await import('../../src/main/settings.js');
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
    expect(await setProjectSettings('/p/a', { featureDocs: 'show', featuresPath: 'FEATURES.md' })).toEqual({ featureDocs: 'show', featuresPath: 'FEATURES.md' });
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
