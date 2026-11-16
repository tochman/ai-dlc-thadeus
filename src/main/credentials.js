// US-1201 AC-1: the Bitbucket username and app password, encrypted with Electron safeStorage (the OS keychain) in the
// app's own folder (`userData`), never in a project. Nothing here logs them, and only main ever reads them back: the
// renderer only learns whether they are set. Without a keychain that can encrypt, nothing is saved at all.
import { app, safeStorage } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { writeAtomic } from './fileWrite.js';
import { t } from '../shared/i18n.js';

const FILE = 'bitbucket-credentials.bin';
const MAX_LENGTH = 200;

const file = () => path.join(app.getPath('userData'), FILE);

function checkValue(value) {
  if (typeof value !== 'string' || value.trim() === '' || value.length > MAX_LENGTH || /[\0\r\n]/.test(value)) {
    throw new Error(t('team.errors.invalidCredential', { max: MAX_LENGTH }));
  }
  return value;
}

/** US-1201 AC-1: saves the credentials encrypted (mode 0600), replacing any earlier ones. */
export async function saveBitbucket(credentials) {
  const username = checkValue(credentials?.username);
  const appPassword = checkValue(credentials?.appPassword);
  if (!safeStorage.isEncryptionAvailable()) throw new Error(t('team.errors.noKeychain'));
  const bytes = safeStorage.encryptString(JSON.stringify({ username, appPassword }));
  await fs.mkdir(path.dirname(file()), { recursive: true });
  await writeAtomic(file(), bytes, { mode: 0o600 });
}

/**
 * US-1201 AC-1: the saved credentials, or null when none are saved or they cannot be decrypted. Never throws for a
 * missing or damaged file; the platform call then says that the credentials are missing.
 * @returns {Promise<{username: string, appPassword: string}|null>}
 */
export async function loadBitbucket() {
  let bytes;
  try {
    bytes = await fs.readFile(file());
  } catch (err) {
    if (err.code !== 'ENOENT') console.warn('Bitbucket-uppgiften kunde inte läsas:', err.code);
    return null;
  }
  try {
    if (!safeStorage.isEncryptionAvailable()) return null;
    const { username, appPassword } = JSON.parse(safeStorage.decryptString(bytes));
    return typeof username === 'string' && typeof appPassword === 'string' ? { username, appPassword } : null;
  } catch {
    console.warn('Bitbucket-uppgiften kunde inte dekrypteras och används inte.'); // never the content
    return null;
  }
}

/** US-1201 AC-1: whether credentials are saved, for the settings view; never the values. */
export async function hasBitbucket() {
  return (await loadBitbucket()) !== null;
}

/** US-1201 AC-1: removes the saved credentials; nothing saved is fine. */
export async function clearBitbucket() {
  await fs.rm(file(), { force: true });
}
