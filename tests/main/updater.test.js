import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({ app: { getPath: () => '/unused' } }));
const { assertOwnAsset, checksumFor, createUpdater, pickAsset, releaseStatus } = await import('../../src/main/updater.js');
const { setToolPaths } = await import('../../src/main/tools.js');

const asset = (tag, name, size = 100) => ({ name, size, url: `https://github.com/tochman/aidlc-dash/releases/download/${tag}/${name}` });
// Shaped like `gh release view --repo tochman/aidlc-dash --json tagName,body,isDraft,isPrerelease,assets` (2026-11-14).
const release = (tag, extra = {}) => ({
  tagName: tag,
  body: '## What changed\n- **Updates** from GitHub',
  isDraft: false,
  isPrerelease: false,
  assets: [asset(tag, `THADEUS-${tag.slice(1)}-universal.dmg`), asset(tag, `thadeus_${tag.slice(1)}_amd64.deb`)],
  ...extra
});
const SHA = 'a'.repeat(64);

/** A fake gh/hdiutil/… that records calls; `answers[file]` is a string, an Error, or a function of args. */
function fakeExec(answers = {}) {
  const calls = [];
  const exec = vi.fn(async (file, args) => {
    if (args[0] === '-l') return '__AIDLC_DASH_PATH__/usr/bin';
    calls.push([file, ...args]);
    const a = typeof answers[file] === 'function' ? answers[file](args) : (answers[file] ?? '');
    if (a instanceof Error) throw a;
    return a;
  });
  return { exec, calls };
}

/** An in-memory fs with just what the updater uses. */
function fakeFs(files = {}) {
  return {
    files,
    mkdir: vi.fn(async () => {}),
    stat: vi.fn(async (p) => ({ size: files[p]?.length ?? 0 })),
    readFile: vi.fn(async (p) => {
      if (!(p in files)) throw Object.assign(new Error(`ENOENT ${p}`), { code: 'ENOENT' });
      return files[p];
    }),
    rm: vi.fn(async (p) => {
      for (const k of Object.keys(files)) if (k === p || k.startsWith(`${p}/`)) delete files[k];
    }),
    access: vi.fn(async () => {})
  };
}

function setup({ answers, files, settings = {}, platform = 'darwin', arch = 'arm64', hash = SHA, packaged = true } = {}) {
  const { exec, calls } = fakeExec(answers);
  const fs = fakeFs(files);
  let saved = { ...settings };
  const app = {
    getVersion: () => '0.2.3',
    getPath: (k) => (k === 'userData' ? '/ud' : '/Applications/THADEUS.app/Contents/MacOS/THADEUS'),
    isPackaged: packaged,
    relaunch: vi.fn(),
    quit: vi.fn()
  };
  const updater = createUpdater({
    exec,
    fs,
    hashFile: async () => hash,
    app,
    getSettings: async () => saved,
    setSettings: async (partial) => (saved = { ...saved, ...partial }),
    platform,
    arch,
    now: () => 1_000_000_000_000,
    pollMs: 5
  });
  return { updater, calls, fs, app, saved: () => saved };
}

describe('update check (EPIC-04 US-0407)', () => {
  it('a newer stable tag is available; a draft, a pre-release, a skipped version and an equal one are not', () => {
    const opts = { platform: 'darwin', arch: 'arm64' };
    expect(releaseStatus(release('v0.2.4'), '0.2.3', undefined, opts)).toMatchObject({
      status: 'available',
      version: '0.2.4',
      asset: { name: 'THADEUS-0.2.4-universal.dmg' }
    });
    expect(releaseStatus(release('v0.2.4', { isDraft: true }), '0.2.3', undefined, opts).status).toBe('none');
    expect(releaseStatus(release('v0.2.4', { isPrerelease: true }), '0.2.3', undefined, opts).status).toBe('none');
    expect(releaseStatus(release('v0.2.4'), '0.2.3', '0.2.4', opts).status).toBe('none');
    expect(releaseStatus(release('v0.2.3'), '0.2.3', undefined, opts).status).toBe('none');
    expect(releaseStatus(release('v0.10.0'), '0.9.9', undefined, opts).status).toBe('available'); // semver, not string order
  });

  it('runs gh release view for this repository at most once a day unless forced, and saves the check time', async () => {
    const { updater, calls, saved } = setup({ answers: { gh: JSON.stringify(release('v0.2.4')) } });
    expect((await updater.check()).status).toBe('available');
    expect(calls[0]).toEqual(['gh', 'release', 'view', '--repo', 'tochman/aidlc-dash', '--json', 'tagName,body,isDraft,isPrerelease,assets']);
    expect(saved().updates.lastCheckMs).toBe(1_000_000_000_000);
    expect((await updater.check()).status).toBe('available'); // within the day: the last answer, no new call
    expect(calls).toHaveLength(1);
    await updater.check({ force: true });
    expect(calls).toHaveLength(2);
  });

  it('runs the gh path chosen in Settings, for the check and the download (US-0410 FR4.2)', async () => {
    const GH = '/opt/homebrew/bin/gh';
    setToolPaths({ gh: GH });
    try {
      const { updater, calls } = setup({ answers: { [GH]: JSON.stringify(release('v0.2.4')) } });
      expect((await updater.check()).status).toBe('available');
      expect(calls[0][0]).toBe(GH);
      await updater.download();
      expect(calls.some(([file, ...args]) => file === GH && args[0] === 'release' && args[1] === 'download')).toBe(true);
      expect(calls.some(([file]) => file === 'gh')).toBe(false);
    } finally {
      setToolPaths({});
    }
  });

  it('a missing, logged-out or offline gh gives unavailable in one sentence and never throws (NFR5)', async () => {
    const cases = [
      [Object.assign(new Error('spawn gh ENOENT'), { code: 'ENOENT' }), /gh/],
      [new Error('To get started with GitHub CLI, please run:  gh auth login'), /gh auth login/],
      [new Error('error connecting to api.github.com'), /.+/],
      [new Error('API rate limit exceeded'), /.+/]
    ];
    for (const [err, pattern] of cases) {
      const { updater, saved } = setup({ answers: { gh: err } });
      const res = await updater.check({ force: true });
      expect(res.status).toBe('unavailable');
      expect(res.reason).toMatch(pattern);
      expect(res.reason.split(/[.!?]\s/).length).toBe(1); // one sentence
      expect(saved().updates?.lastCheckMs).toBeUndefined(); // tried again later
    }
    const garbled = setup({ answers: { gh: 'not json' } });
    expect((await garbled.updater.check({ force: true })).status).toBe('unavailable');
  });

  it('picks the .dmg on darwin and the .deb on linux/x64, and nothing on linux/arm64', () => {
    const { assets } = release('v0.2.4');
    expect(pickAsset('darwin', 'x64', assets).name).toBe('THADEUS-0.2.4-universal.dmg');
    expect(pickAsset('darwin', 'arm64', assets).name).toBe('THADEUS-0.2.4-universal.dmg');
    expect(pickAsset('linux', 'x64', assets).name).toBe('thadeus_0.2.4_amd64.deb');
    expect(pickAsset('linux', 'arm64', assets)).toBeNull();
    expect(pickAsset('win32', 'x64', assets)).toBeNull();
  });

  it('assertOwnAsset refuses another repository, another tag and an unknown name (NFR3)', () => {
    const own = asset('v0.2.4', 'THADEUS-0.2.4-universal.dmg');
    expect(assertOwnAsset(own, 'v0.2.4')).toBe(own);
    expect(() => assertOwnAsset({ ...own, url: own.url.replace('tochman/aidlc-dash', 'evil/aidlc-dash') }, 'v0.2.4')).toThrow(/tochman\/aidlc-dash/);
    expect(() => assertOwnAsset(own, 'v0.2.5')).toThrow();
    expect(() => assertOwnAsset(asset('v0.2.4', 'install.sh'), 'v0.2.4')).toThrow();
    expect(() => assertOwnAsset({ ...own, url: `http://github.com/tochman/aidlc-dash/releases/download/v0.2.4/${own.name}` }, 'v0.2.4')).toThrow();
  });
});

describe('download and install', () => {
  const TAG = 'v0.2.4';
  const DMG = 'THADEUS-0.2.4-universal.dmg';
  const DIR = `/ud/updates/${TAG}`;
  const withSums = release(TAG, { assets: [...release(TAG).assets, asset(TAG, 'SHA256SUMS.txt')] });

  it('a checksum mismatch stops before install and removes the file', async () => {
    const files = { [`${DIR}/SHA256SUMS.txt`]: `${'b'.repeat(64)}  ${DMG}\n`, [`${DIR}/${DMG}`]: 'dmg-bytes' };
    const { updater, calls, fs } = setup({ answers: { gh: JSON.stringify(withSums) }, files });
    await updater.check({ force: true });
    const res = await updater.download();
    expect(res.status).toBe('error');
    expect(res.error).toMatch(/SHA256|kontrollsumma|checksum/i);
    expect(calls.find((c) => c[0] === 'gh' && c[1] === 'release' && c[2] === 'download')).toEqual([
      'gh',
      'release',
      'download',
      TAG,
      '--repo',
      'tochman/aidlc-dash',
      '--pattern',
      DMG,
      '--pattern',
      'SHA256SUMS.txt',
      '--dir',
      DIR,
      '--clobber'
    ]);
    expect(fs.files[`${DIR}/${DMG}`]).toBeUndefined();
    expect((await updater.install()).status).toBe('error'); // nothing downloaded: nothing installed
    expect(calls.some((c) => c[0] === 'hdiutil' || c[0] === 'ditto')).toBe(false);
  });

  it('verifies a matching checksum, installs on macOS with hdiutil, ditto and xattr, and cleans up', async () => {
    const files = { [`${DIR}/SHA256SUMS.txt`]: `${SHA}  ${DMG}\n`, [`${DIR}/${DMG}`]: 'dmg-bytes' };
    const { updater, calls, fs, app } = setup({ answers: { gh: JSON.stringify(withSums) }, files });
    await updater.check({ force: true });
    expect(await updater.download()).toEqual({ status: 'downloaded', file: `${DIR}/${DMG}`, verified: true });
    expect(await updater.install()).toEqual({ status: 'installed', kept: null });
    const programs = calls.map((c) => c[0]);
    expect(programs).toEqual(['gh', 'gh', 'hdiutil', 'ditto', 'xattr', 'hdiutil']);
    expect(calls[3]).toEqual(['ditto', `${DIR}/mnt/THADEUS.app`, '/Applications/THADEUS.app']);
    expect(fs.rm).toHaveBeenCalledWith(DIR, { recursive: true, force: true });
    updater.relaunch();
    expect(app.relaunch).toHaveBeenCalled();
    expect(app.quit).toHaveBeenCalled();
  });

  it('keeps the file when cleanup is off, and a failed install step leaves the old version with the file to show', async () => {
    const files = { [`${DIR}/${DMG}`]: 'dmg-bytes' };
    const kept = setup({ answers: { gh: JSON.stringify(release(TAG)) }, files: { ...files }, settings: { updates: { deleteAfterInstall: false } } });
    await kept.updater.check({ force: true });
    expect((await kept.updater.download()).verified).toBe(false); // no SHA256SUMS.txt published
    expect(await kept.updater.install()).toEqual({ status: 'installed', kept: `${DIR}/${DMG}` });

    const failing = setup({ answers: { gh: JSON.stringify(release(TAG)), ditto: new Error('ditto: Permission denied') }, files: { ...files } });
    await failing.updater.check({ force: true });
    await failing.updater.download();
    const res = await failing.updater.install();
    expect(res).toMatchObject({ status: 'error', file: `${DIR}/${DMG}` });
    expect(res.error).toMatch(/ditto/);
    expect(failing.calls.at(-1)[0]).toBe('hdiutil'); // the image is detached even after a failure
    expect(failing.app.relaunch).not.toHaveBeenCalled();
  });

  it('installs the .deb through pkexec dpkg on Linux, and refuses to replace an unpackaged dev run', async () => {
    const DEB = 'thadeus_0.2.4_amd64.deb';
    const linux = setup({ answers: { gh: JSON.stringify(release(TAG)) }, files: { [`${DIR}/${DEB}`]: 'deb' }, platform: 'linux', arch: 'x64' });
    await linux.updater.check({ force: true });
    await linux.updater.download();
    expect((await linux.updater.install()).status).toBe('installed');
    expect(linux.calls.at(-1)).toEqual(['pkexec', 'dpkg', '-i', `${DIR}/${DEB}`]);

    const dev = setup({ answers: { gh: JSON.stringify(release(TAG)) }, files: { [`${DIR}/${DMG}`]: 'dmg' }, packaged: false });
    await dev.updater.check({ force: true });
    await dev.updater.download();
    expect((await dev.updater.install()).status).toBe('error');
  });

  it('saves a skipped version, which the next check then offers no more', async () => {
    const { updater, saved } = setup({ answers: { gh: JSON.stringify(release(TAG)) } });
    await updater.skip('0.2.4');
    expect(saved().updates.skipVersion).toBe('0.2.4');
    expect((await updater.check({ force: true })).status).toBe('none');
    await expect(updater.skip('0.2.4; rm -rf /')).rejects.toThrow();
    expect(checksumFor(`${SHA} *dist/${DMG}\n`, DMG)).toBe(SHA);
  });
});
