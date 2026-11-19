// v0.2.9 release FR1, FR5, FR6: the packaged version has a finished release plan, and the lock file carries the same version.
// v0.2.10 release FR2: every slice story says "Released in v<version>" in the release pull request, before the tag.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => readFileSync(path.join(ROOT, file), 'utf8');
const { version } = JSON.parse(read('package.json'));
const PLAN = `docs/releases/${version}.md`;
const plan = () => read(PLAN);

/** The rows of the table under `## The v<version> slice`, keyed by lower-cased header; other tables are ignored. */
function sliceRows(text) {
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
  const keys = cells(lines[head]).map((c) => c.toLowerCase());
  const rows = [];
  for (let i = head + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) {
    const row = cells(lines[i]);
    rows.push(Object.fromEntries(keys.map((k, j) => [k, row[j]])));
  }
  return rows;
}

/** Each slice story with its epic file (repo-relative, from the Epic cell's link). */
function sliceStories() {
  return sliceRows(plan()).map((row) => ({
    id: row.story,
    status: row.status,
    epic: path.posix.join('docs/releases', row.epic.match(/\]\(([^)]+)\)/)[1])
  }));
}

const RELEASED = `Released in v${version}`;

describe(`release v${version}`, () => {
  it('has a release plan for the packaged version', () => {
    expect(existsSync(path.join(ROOT, PLAN))).toBe(true);
  });

  it('titles the plan with the version', () => {
    expect(plan().split('\n')[0]).toBe(`# Release plan v${version}`);
  });

  it('lists only finished stories in its slice table', () => {
    const statuses = sliceRows(plan()).map((r) => r.status);
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

  it(`marks every slice story "✅ ${RELEASED}" in its epic heading and its slice row`, () => {
    const stories = sliceStories();
    expect(stories.length).toBeGreaterThan(0);
    for (const { id, status, epic } of stories) {
      const heading = read(epic)
        .split('\n')
        .find((l) => l.startsWith(`**${id}:`));
      expect(heading, `${id} heading in ${epic}`).toContain(`✅ ${RELEASED}`);
      expect(status, `${id} slice row`).toBe(`✅ ${RELEASED}`);
    }
  });

  it(`says "released in v${version}", never "for v${version}", for every slice story in its epic Status line and FEATURES.md row`, () => {
    const features = read('docs/FEATURES.md').split('\n');
    for (const { id, epic } of sliceStories()) {
      const statusLine = read(epic)
        .split('\n')
        .find((l) => l.startsWith('**Status ('));
      const row = features.find((l) => l.includes(`](${path.posix.relative('docs', epic)})`));
      for (const [where, text] of [
        [`${epic} status line`, statusLine],
        [`FEATURES.md row for ${epic}`, row]
      ]) {
        const segments = String(text ?? '')
          .split(/·|\.\s/)
          .filter((s) => s.includes(id));
        expect(segments, `${where} names ${id}`).not.toEqual([]);
        for (const seg of segments) {
          expect(seg, `${where}: ${id}`).not.toContain(`for v${version}`);
          expect(seg.toLowerCase(), `${where}: ${id}`).toContain(RELEASED.toLowerCase());
        }
      }
    }
  });
});
