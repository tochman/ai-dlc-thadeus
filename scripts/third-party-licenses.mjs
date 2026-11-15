// US-1101 FR6.1: writes build/THIRD_PARTY_LICENSES.txt, the licences of everything the packaged app bundles: every
// non-dev package in package-lock.json, the dev packages Vite bundles into the renderer (Monaco), and Electron's own
// licence. electron-builder.yml ships the file as resources/THIRD_PARTY_LICENSES.txt; About opens it (FR6.2).
// Usage: node scripts/third-party-licenses.mjs (from the repository root, after npm ci).
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ponytail: the bundled-dev list is hand-kept; add a package here when the renderer imports a new dev dependency
// (or one of these gains a dependency). A walk of the renderer bundle's imports would replace it.
export const BUNDLED_DEV = new Set(['monaco-editor', '@monaco-editor/react', '@monaco-editor/loader', 'dompurify', 'marked', 'state-local']);

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.|-|$)/i;

/** The package name from a lock key: 'node_modules/a/node_modules/@s/b' → '@s/b'. */
const nameOf = (key) => key.slice(key.lastIndexOf('node_modules/') + 'node_modules/'.length);

/**
 * The bundled packages with their licence text, one per name@version, sorted by name (US-1101 FR6.1).
 * @param {{packages: Record<string, {version?: string, license?: string, dev?: boolean}>}} lock package-lock.json v2/v3
 * @param {(dir: string) => string | null} readText the licence file text of a package folder, or null
 * @returns {{name: string, version: string, license: string, text: string}[]}
 */
export function collectLicenses(lock, readText) {
  const seen = new Map();
  for (const [key, pkg] of Object.entries(lock?.packages ?? {})) {
    if (!key.includes('node_modules/')) continue; // '' is the app itself; workspace links have no node_modules
    const name = nameOf(key);
    if (pkg.dev && !BUNDLED_DEV.has(name)) continue;
    const id = `${name}@${pkg.version}`;
    if (seen.has(id)) continue;
    const license = pkg.license ?? 'UNKNOWN';
    const text = readText(key) ?? `License: ${license} (no licence file in the package)`;
    seen.set(id, { name, version: pkg.version, license, text });
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
}

/** The text of a package folder's licence file(s), or null when it has none (or is not installed, e.g. optional). */
export function readLicenseText(dir) {
  let names;
  try {
    names = readdirSync(dir).filter((f) => LICENSE_FILE.test(f));
  } catch (err) {
    if (err.code === 'ENOENT') return null; // an optional package not installed on this platform
    throw err;
  }
  if (!names.length) return null;
  return names.map((f) => readFileSync(path.join(dir, f), 'utf8').trim()).join('\n\n');
}

/** The whole file: a short header, one section per package, then Electron's licence. */
export function formatLicenses(entries, electronLicense) {
  const rule = '-'.repeat(78);
  const parts = entries.map((e) => `${rule}\n${e.name} ${e.version} (${e.license})\n${rule}\n\n${e.text.trim()}\n`);
  if (electronLicense) parts.push(`${rule}\nElectron (MIT)\n${rule}\n\n${electronLicense.trim()}\n`);
  const head = "T.H.A.D.E.U.S. bundles the following third-party software. Chromium's notices ship with Electron as LICENSES.chromium.html.\n";
  return `${head}\n${parts.join('\n')}`;
}

function main() {
  const root = process.cwd();
  const lock = JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  const entries = collectLicenses(lock, (key) => readLicenseText(path.join(root, key)));
  const electron = readLicenseText(path.join(root, 'node_modules/electron'));
  if (!electron) throw new Error('node_modules/electron/LICENSE is missing; run npm ci first');
  mkdirSync(path.join(root, 'build'), { recursive: true });
  const out = path.join(root, 'build/THIRD_PARTY_LICENSES.txt');
  writeFileSync(out, formatLicenses(entries, electron));
  console.log(`${path.relative(root, out)}: ${entries.length} packages + Electron`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
