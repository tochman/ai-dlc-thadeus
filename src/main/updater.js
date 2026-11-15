// Updating the app from a GitHub release (EPIC-04 US-0407). The repository is private, so the release is read
// and downloaded through the person's own `gh` CLI (fixed arguments, execFile without a shell); no token is
// handled here. Only `tochman/aidlc-dash` release assets are fetched, checked before download (NFR3). Nothing
// downloaded runs except through the platform's installer step. A check never blocks the app (NFR5).
import { createHash } from 'node:crypto';
import { constants, createReadStream, promises as fsp } from 'node:fs';
import path from 'node:path';
import { defaultExec, runFixed } from './exec.js';
import { UPDATE_DEFAULTS } from './settings.js';
import { t } from '../shared/i18n.js';

export const REPO = 'tochman/aidlc-dash';
const DAY_MS = 24 * 60 * 60 * 1000;
const VIEW_TIMEOUT_MS = 20000;
const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const INSTALL_TIMEOUT_MS = 10 * 60 * 1000; // pkexec and the admin prompt wait for the person
const NOTES_MAX = 20000;
const VERSION = /^\d+\.\d+\.\d+$/;
const TAG = /^v\d+\.\d+\.\d+$/;
const SUMS = 'SHA256SUMS.txt';
// What .github/workflows/release.yml publishes (electron-builder.yml artifact names).
const ASSETS = {
  darwin: /^THADEUS-\d+\.\d+\.\d+-universal\.dmg$/,
  'linux-x64': /^thadeus_\d+\.\d+\.\d+_amd64\.deb$/
};
const VIEW_ARGS = ['release', 'view', '--repo', REPO, '--json', 'tagName,body,isDraft,isPrerelease,assets'];
const APP_NAME = 'THADEUS.app';

/** -1, 0 or 1 for two x.y.z versions. */
export function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/** The asset for this machine: the universal .dmg on macOS, the amd64 .deb on Linux x64, else null. */
export function pickAsset(platform, arch, assets) {
  const pattern = ASSETS[platform === 'darwin' ? 'darwin' : `${platform}-${arch}`];
  return (pattern && (assets ?? []).find((a) => typeof a?.name === 'string' && pattern.test(a.name))) || null;
}

/** Throws unless the asset is this repository's own release download for `tag`, with a known name (NFR3). */
export function assertOwnAsset(asset, tag) {
  const name = asset?.name;
  const known = typeof name === 'string' && (name === SUMS || Object.values(ASSETS).some((p) => p.test(name)));
  const url = `https://github.com/${REPO}/releases/download/${tag}/${name}`;
  if (!TAG.test(String(tag)) || !known || asset.url !== url) {
    throw new Error(t('update.notOwnAsset', { name: String(name), repo: REPO }));
  }
  return asset;
}

/** Pure: what a `gh release view --json` answer means for this version. */
export function releaseStatus(release, current, skipVersion, { platform, arch } = {}) {
  if (!release || typeof release.tagName !== 'string') return { status: 'unavailable', reason: t('update.badAnswer') };
  if (release.isDraft || release.isPrerelease) return { status: 'none' };
  const version = release.tagName.replace(/^v/, '');
  if (!VERSION.test(version) || !VERSION.test(current)) return { status: 'none' };
  if (compareVersions(version, current) <= 0 || version === skipVersion) return { status: 'none' };
  const asset = pickAsset(platform, arch, release.assets);
  return {
    status: 'available',
    version,
    tag: release.tagName,
    notes: typeof release.body === 'string' ? release.body.slice(0, NOTES_MAX) : '',
    asset: asset ? { name: asset.name, size: asset.size } : null
  };
}

/** One sentence for why the check could not run (NFR5). */
export function unavailableReason(err) {
  const msg = String(err?.message ?? err);
  if (err?.code === 'ENOENT') return t('update.ghMissing');
  if (/auth login|not logged|authenticat/i.test(msg)) return t('update.ghLoggedOut');
  if (/rate limit/i.test(msg)) return t('update.rateLimited');
  if (err?.killed || /could not resolve|ENOTFOUND|ECONN|network|timed? ?out|connect/i.test(msg)) return t('update.offline');
  if (/not found|HTTP 404/i.test(msg)) return t('update.noAccess', { repo: REPO });
  return t('update.checkFailed', { error: msg.split('\n')[0] });
}

/** `<sha256>  <name>` lines (sha256sum's format; a `*` or a folder before the name is tolerated) -> hash or null. */
export function checksumFor(sumsText, name) {
  for (const line of String(sumsText).split('\n')) {
    const m = /^([a-f0-9]{64})\s+\*?(.+?)\s*$/i.exec(line.trim());
    if (m && path.basename(m[2]) === name) return m[1].toLowerCase();
  }
  return null;
}

function defaultHashFile(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(file)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** The .app bundle the running executable lives in (…/THADEUS.app/Contents/MacOS/THADEUS). */
export function appBundle(exe) {
  const i = String(exe).indexOf('.app/Contents/');
  if (i === -1) throw new Error(t('update.notABundle'));
  return exe.slice(0, i + 4);
}

const firstLine = (err) =>
  err?.killed
    ? t('errors.timeout')
    : String(err?.message ?? err)
        .trim()
        .split('\n')[0];

/**
 * The updater with its dependencies injected (tests pass fakes; index/ipc use the default instance below).
 * `send(state)` reports download progress to the window.
 */
export function createUpdater({
  exec = defaultExec,
  fs = fsp,
  hashFile = defaultHashFile,
  app,
  getSettings,
  setSettings,
  platform = process.platform,
  arch = process.arch,
  now = Date.now,
  send = () => {},
  pollMs = 500
}) {
  const state = { last: null, release: null, file: null, dir: null };
  let inflight = null;
  const gh = (args, timeout) => runFixed('gh', args, { timeout, exec });

  async function runCheck(force) {
    const settings = await getSettings();
    const updates = settings.updates ?? {};
    if (!force && Number.isFinite(updates.lastCheckMs) && now() - updates.lastCheckMs < DAY_MS) return state.last ?? { status: 'none' };
    let release;
    try {
      release = JSON.parse(await gh(VIEW_ARGS, VIEW_TIMEOUT_MS));
    } catch (err) {
      console.warn('Uppdateringskontrollen misslyckades:', firstLine(err));
      return { status: 'unavailable', reason: unavailableReason(err) }; // not recorded, so it is tried again later
    }
    await setSettings({ updates: { ...updates, lastCheckMs: now() } }).catch((err) => console.error('Kunde inte spara uppdateringskontrollen:', err));
    const result = releaseStatus(release, app.getVersion(), updates.skipVersion, { platform, arch });
    state.last = result;
    state.release = result.status === 'available' ? release : null;
    return result;
  }

  /** At most once a day unless forced (the menu); never throws. */
  function check({ force = false } = {}) {
    inflight ??= runCheck(force === true)
      .catch((err) => ({ status: 'unavailable', reason: unavailableReason(err) }))
      .finally(() => {
        inflight = null;
      });
    return inflight;
  }

  async function skip(version) {
    if (typeof version !== 'string' || !VERSION.test(version)) throw new Error(t('errors.invalidValue', { what: 'version', value: String(version) }));
    const settings = await getSettings();
    await setSettings({ updates: { ...settings.updates, skipVersion: version } });
    state.last = { status: 'none' };
    state.release = null;
  }

  async function verify(file, sumsFile, name) {
    const expected = checksumFor(await fs.readFile(sumsFile, 'utf8'), name);
    if (!expected) throw new Error(t('update.checksumMissing', { name }));
    if ((await hashFile(file)) !== expected) throw new Error(t('update.checksumMismatch', { name }));
  }

  /** Downloads this machine's asset of the offered release; a failure comes back as {status: 'error'}. */
  async function download() {
    const release = state.release;
    const asset = release && pickAsset(platform, arch, release.assets);
    if (!asset) return { status: 'error', error: t('update.noPackage') };
    let timer = null;
    try {
      assertOwnAsset(asset, release.tagName);
      const sums = (release.assets ?? []).find((a) => a?.name === SUMS) ?? null;
      if (sums) assertOwnAsset(sums, release.tagName);
      const dir = path.join(app.getPath('userData'), 'updates', release.tagName);
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, asset.name);
      timer = setInterval(() => {
        fs.stat(file).then(
          (s) => send({ status: 'downloading', received: s.size, total: asset.size }),
          () => send({ status: 'downloading', received: 0, total: asset.size })
        );
      }, pollMs);
      const patterns = [asset.name, ...(sums ? [SUMS] : [])].flatMap((p) => ['--pattern', p]);
      await gh(['release', 'download', release.tagName, '--repo', REPO, ...patterns, '--dir', dir, '--clobber'], DOWNLOAD_TIMEOUT_MS);
      if (sums) {
        try {
          await verify(file, path.join(dir, SUMS), asset.name);
        } catch (err) {
          await fs.rm(file, { force: true }).catch((e) => console.error('Kunde inte ta bort paketet:', e));
          throw err;
        }
      }
      Object.assign(state, { file, dir });
      return { status: 'downloaded', file, verified: !!sums };
    } catch (err) {
      console.error('Nedladdningen av uppdateringen misslyckades:', firstLine(err));
      return { status: 'error', error: t('update.downloadFailed', { error: firstLine(err) }) };
    } finally {
      if (timer) clearInterval(timer);
    }
  }

  async function step(name, file, args, timeout = INSTALL_TIMEOUT_MS) {
    try {
      return await runFixed(file, args, { timeout, exec });
    } catch (err) {
      throw new Error(t('update.stepFailed', { step: name, error: firstLine(err) }));
    }
  }

  async function installMac(file) {
    const bundle = appBundle(app.getPath('exe'));
    const mnt = path.join(state.dir, 'mnt');
    await fs.mkdir(mnt, { recursive: true });
    await step('hdiutil attach', 'hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mnt, file]);
    try {
      const src = path.join(mnt, APP_NAME);
      await fs.access(src);
      const writable = await fs.access(path.dirname(bundle), constants.W_OK).then(
        () => true,
        () => false
      );
      if (writable) {
        await step('ditto', 'ditto', [src, bundle]);
        await step('xattr', 'xattr', ['-dr', 'com.apple.quarantine', bundle]);
      } else {
        // The paths travel as argv, never inside the script text, so nothing in them is ever run.
        const script = [
          'on run argv',
          'do shell script "/usr/bin/ditto " & quoted form of item 1 of argv & " " & quoted form of item 2 of argv & " && /usr/bin/xattr -dr com.apple.quarantine " & quoted form of item 2 of argv with administrator privileges',
          'end run'
        ].flatMap((line) => ['-e', line]);
        await step('osascript', 'osascript', [...script, src, bundle]);
      }
    } finally {
      await runFixed('hdiutil', ['detach', mnt], { timeout: 60000, exec }).catch((err) => console.error('hdiutil detach misslyckades:', firstLine(err)));
    }
  }

  /**
   * Installs the downloaded package. Any failed step leaves the running version as it is and returns
   * {status: 'error', error, file}, so the notice can offer to show the file instead.
   */
  async function install() {
    const file = state.file;
    if (!file) return { status: 'error', error: t('update.notDownloaded'), file: null };
    try {
      if (!app.isPackaged) throw new Error(t('update.notPackaged'));
      if (platform === 'darwin') await installMac(file);
      else if (platform === 'linux') await step('pkexec dpkg', 'pkexec', ['dpkg', '-i', file]);
      else throw new Error(t('update.noPackage'));
    } catch (err) {
      console.error('Installationen av uppdateringen misslyckades:', err.message);
      return { status: 'error', error: err.message, file };
    }
    const settings = await getSettings().catch(() => ({}));
    const cleanup = settings.updates?.deleteAfterInstall ?? UPDATE_DEFAULTS.deleteAfterInstall;
    if (!cleanup) return { status: 'installed', kept: file };
    try {
      await fs.rm(state.dir, { recursive: true, force: true });
      return { status: 'installed', kept: null };
    } catch (err) {
      console.error('Kunde inte ta bort det hämtade paketet:', err.message);
      return { status: 'installed', kept: file };
    }
  }

  function relaunch() {
    app.relaunch();
    app.quit();
  }

  /** The downloaded file to show in Finder or the file manager, or null. */
  const downloadedFile = () => state.file;

  return { check, skip, download, install, relaunch, downloadedFile };
}
