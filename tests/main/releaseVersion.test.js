// v0.2.9 release FR1, FR5, FR6: the packaged version has a finished release plan, and the lock file carries the same version.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const { version } = JSON.parse(read('package.json'));
const PLAN = `docs/releases/${version}.md`;
const plan = () => read(PLAN);

/** The Status cell of each row in the table under `## The v<version> slice`; other tables are ignored. */
function sliceStatuses(text) {
  const lines = text.split('\n');
  const start = lines.indexOf(`## The v${version} slice`);
  if (start === -1) return [];
  const head = lines.findIndex((l, i) => i > start && l.trim().startsWith('|'));
  if (head === -1) return [];
  const cells = (l) =>
    l
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
  const statusAt = cells(lines[head]).findIndex((c) => c.toLowerCase() === 'status');
  const rows = [];
  for (let i = head + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i])[statusAt]);
  return rows;
}

describe(`release v${version}`, () => {
  it('has a release plan for the packaged version', () => {
    expect(existsSync(path.join(ROOT, PLAN))).toBe(true);
  });

  it('titles the plan with the version', () => {
    expect(plan().split('\n')[0]).toBe(`# Release plan v${version}`);
  });

  it('lists only finished stories in its slice table', () => {
    const statuses = sliceStatuses(plan());
    expect(statuses.length).toBeGreaterThan(0);
    for (const status of statuses) expect(status).toMatch(/^✅ (Done|Released)/);
  });

  it.runIf(version === '0.2.9')('tells users on v0.2.8 or earlier to download v0.2.9 by hand', () => {
    expect(plan()).toContain('## For users on v0.2.8 or earlier');
    expect(plan()).toContain('download v0.2.9 by hand');
  });

  it('keeps package-lock.json at the same version as package.json', () => {
    expect(JSON.parse(read('package-lock.json')).version).toBe(version);
  });
});
