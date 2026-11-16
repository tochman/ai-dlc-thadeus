// US-1201 AC-1: the Bitbucket credentials, with Electron's safeStorage stubbed. The stub's "encryption" is reversible but
// never leaves the clear text in the bytes, so the tests can check that the password never reaches the disk as it is.
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const DIR = path.resolve(__dirname, '../.tmp/credentials-test');
const m = vi.hoisted(() => ({ available: true }));
vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => DIR) },
  safeStorage: {
    isEncryptionAvailable: () => m.available,
    encryptString: (s) => Buffer.from(Buffer.from(s, 'utf8').toString('base64').split('').reverse().join(''), 'utf8'),
    decryptString: (b) => Buffer.from(b.toString('utf8').split('').reverse().join(''), 'base64').toString('utf8')
  }
}));
const { clearBitbucket, hasBitbucket, loadBitbucket, saveBitbucket } = await import('../../src/main/credentials.js');

const CREDS = { username: 'thomas', appPassword: 'S3cret-app-pw' };

beforeEach(() => {
  rmSync(DIR, { recursive: true, force: true });
  mkdirSync(DIR, { recursive: true });
  m.available = true;
});
afterAll(() => rmSync(DIR, { recursive: true, force: true }));

describe('Bitbucket credentials (US-1201 AC-1)', () => {
  it('reads a saved username and app password back', async () => {
    expect(await loadBitbucket()).toBeNull();
    expect(await hasBitbucket()).toBe(false);
    await saveBitbucket(CREDS);
    expect(await loadBitbucket()).toEqual(CREDS);
    expect(await hasBitbucket()).toBe(true);
  });

  it("keeps one encrypted file in the app's own folder, without the password or the username in clear text", async () => {
    await saveBitbucket(CREDS);
    const files = readdirSync(DIR);
    expect(files).toEqual(['bitbucket-credentials.bin']);
    const bytes = readFileSync(path.join(DIR, files[0]));
    expect(bytes.includes('S3cret-app-pw')).toBe(false);
    expect(bytes.includes('thomas')).toBe(false);
  });

  it('says so when the keychain cannot encrypt, and saves nothing unencrypted', async () => {
    m.available = false;
    await expect(saveBitbucket(CREDS)).rejects.toThrow(/nyckelring|keychain/i);
    expect(readdirSync(DIR)).toEqual([]);
    await expect(loadBitbucket()).resolves.toBeNull();
  });

  it('removes a saved credential', async () => {
    await saveBitbucket(CREDS);
    await clearBitbucket();
    expect(existsSync(path.join(DIR, 'bitbucket-credentials.bin'))).toBe(false);
    expect(await loadBitbucket()).toBeNull();
    await expect(clearBitbucket()).resolves.toBeUndefined(); // nothing to remove is fine
  });

  it('refuses an empty or oversized username or password before anything is written', async () => {
    await expect(saveBitbucket({ username: '', appPassword: 'x' })).rejects.toThrow();
    await expect(saveBitbucket({ username: 'a', appPassword: 'x'.repeat(1000) })).rejects.toThrow();
    await expect(saveBitbucket({ username: 'a\nb', appPassword: 'x' })).rejects.toThrow();
    await expect(saveBitbucket(null)).rejects.toThrow();
    expect(readdirSync(DIR)).toEqual([]);
  });

  it('reads a damaged file as no credential, without throwing', async () => {
    await saveBitbucket(CREDS);
    const { writeFileSync } = await import('node:fs');
    writeFileSync(path.join(DIR, 'bitbucket-credentials.bin'), 'not encrypted json');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await loadBitbucket()).toBeNull();
  });
});
