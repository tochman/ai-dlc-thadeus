// Fails the Linux release when a bundled native binary needs a newer glibc/libstdc++ than Ubuntu 22.04
// ships (glibc 2.35, GLIBCXX_3.4.30), or when node-pty prebuilds for other platforms end up in the package.
// Usage: node scripts/check-glibc.mjs dist/linux-unpacked
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UBUNTU_2204 = { glibc: '2.35', glibcxx: '3.4.30' };

function compare(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function highest(text, re) {
  let max = null;
  for (const m of text.matchAll(re)) if (!max || compare(m[1], max) > 0) max = m[1];
  return max;
}

// Highest GLIBC_x.y and GLIBCXX_3.4.z version tags found in a binary (null when absent).
export function findVersions(buffer) {
  const text = buffer.toString('latin1');
  return {
    glibc: highest(text, /GLIBC_(\d+\.\d+(?:\.\d+)?)/g),
    glibcxx: highest(text, /GLIBCXX_(3\.4(?:\.\d+)?)/g)
  };
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile()) yield full;
  }
}

const ELF_MAGIC = Buffer.from([0x7f, 0x45, 0x4c, 0x46]);

// Returns [{ file, reason }] for every ELF file above the limits and every foreign node-pty prebuild.
export function checkDir(dir, limits = UBUNTU_2204) {
  const violations = [];
  for (const file of walk(dir)) {
    const rel = path.relative(dir, file).split(path.sep).join('/');
    if (/node-pty\/prebuilds\/(darwin|win32)-/.test(rel)) {
      violations.push({ file: rel, reason: 'node-pty-prebuild för annan plattform' });
      continue;
    }
    const buf = readFileSync(file);
    if (!buf.subarray(0, 4).equals(ELF_MAGIC)) continue;
    const { glibc, glibcxx } = findVersions(buf);
    if (glibc && compare(glibc, limits.glibc) > 0) violations.push({ file: rel, reason: `kräver GLIBC_${glibc} (max ${limits.glibc})` });
    if (glibcxx && compare(glibcxx, limits.glibcxx) > 0) violations.push({ file: rel, reason: `kräver GLIBCXX_${glibcxx} (max ${limits.glibcxx})` });
  }
  return violations;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Användning: node scripts/check-glibc.mjs <katalog>');
    process.exit(2);
  }
  const violations = checkDir(dir);
  for (const v of violations) console.error(`${v.file}: ${v.reason}`);
  if (violations.length) {
    console.error(`${violations.length} överträdelse(r) mot Ubuntu 22.04 (glibc ${UBUNTU_2204.glibc}, GLIBCXX_${UBUNTU_2204.glibcxx}).`);
    process.exit(1);
  }
  console.log(`OK: inga binärer i ${dir} kräver mer än glibc ${UBUNTU_2204.glibc} / GLIBCXX_${UBUNTU_2204.glibcxx}.`);
}
