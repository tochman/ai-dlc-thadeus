// Keeps the feature docs honest (project rule: feature docs are updated in Deployment Execution, before the PR,
// and a delivered story never shows as in progress). CI runs this on every PR, so the merge is blocked when:
// a built story still says 📋 Planned, a delivered story (its intent is complete) isn't ✅ Done (or 🚀 Deployed), an
// epic status line / FEATURES.md row doesn't mention a 🚧/✅/🚀 story with its marker, or a story still says
// "for vX.Y.Z" after tag vX.Y.Z was cut (US-0603 FR6, FR7).
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseEpic, parseOverview, statusOf } from '../../src/main/parsers/features.js';
import { releaseOf } from '../../src/main/parsers/releases.js';
import { parseState } from '../../src/main/parsers/state.js';

const ROOT = path.resolve(__dirname, '../..');
const INTENTS = path.join(ROOT, 'aidlc/spaces/default/intents');

/** Story ids in a text, with ranges ("US-0501–US-0503", "US-0101 till US-0110") expanded. */
export function storyIdsWithRanges(text) {
  const ids = new Set();
  const s = String(text ?? '');
  for (const [, a, b] of s.matchAll(/US-(\d{4})\s*(?:[–-]|till|to)\s*US-(\d{4})/g)) {
    for (let n = Number(a); n <= Number(b); n++) ids.add(`US-${String(n).padStart(4, '0')}`);
  }
  for (const [id] of s.matchAll(/US-\d{4}/g)) ids.add(id);
  return ids;
}

/**
 * The stories a workflow builds, from its description (US-0410): one that opens with "US-XXXX:" builds that story
 * only, so a story it merely mentions is not counted; any other description counts every id it names.
 */
export function intentStoryIds(description) {
  const lead = String(description ?? '').match(/^\s*(US-\d{4}):/);
  return lead ? new Set([lead[1]]) : storyIdsWithRanges(description);
}

/** True when some segment of `text` (split on "·" or ". ") names `id` and carries `status`'s marker. */
export function mentionsWithStatus(text, id, status) {
  return String(text ?? '')
    .split(/·|\.\s/)
    .some((seg) => storyIdsWithRanges(seg).has(id) && statusOf(seg) === status);
}

/**
 * @param {{overview: string, epics: Record<string, string>, built: Set<string>}} docs
 *   epics: link → markdown; built: story ids whose intent has finished Code Generation;
 *   delivered: story ids whose intent is complete (merged); tags: the repository's vX.Y.Z tags (US-0603 FR7)
 * @returns {string[]} problems, empty when the docs are consistent
 */
export function checkFeatureDocs({ overview, epics, built, delivered = new Set(), tags = new Set() }) {
  const problems = [];
  for (const row of parseOverview(overview).epics) {
    const md = epics[row.link];
    if (md == null) {
      problems.push(`${row.id}: ${row.link} is missing`);
      continue;
    }
    const epic = parseEpic(md);
    const tracked = epic.stories.filter((s) => s.status); // ➡️ moved and unmarked stories are skipped
    const uniform = tracked.length > 0 && tracked.every((s) => s.status === tracked[0].status);
    for (const s of tracked) {
      // 🚀 Deployed comes after ✅ Done, so it counts as delivered too (US-0603 FR6).
      if (delivered.has(s.id) && s.status !== 'done' && s.status !== 'deployed')
        problems.push(`${s.id} is delivered (its intent is complete) but isn't marked ✅ Done`);
      const { planned, released } = releaseOf(s.statusText);
      if (planned && !released && tags.has(planned)) {
        problems.push(`${s.id} is still marked "for ${planned}", but tag ${planned} exists: mark it "Released in ${planned}"`);
      }
      if (s.status === 'planned') {
        if (built.has(s.id)) problems.push(`${s.id} is built (its intent finished Code Generation) but still says 📋 Planned`);
        continue;
      }
      for (const [where, text] of [
        [`${epic.id} status line`, epic.statusLine],
        [`FEATURES.md row ${row.id}`, row.status]
      ]) {
        // A fully uniform epic ("✅ Released in v0.1.0") only needs its first marker to match.
        const ok = mentionsWithStatus(text, s.id, s.status) || (uniform && statusOf(text) === s.status);
        if (!ok) problems.push(`${where} doesn't mention ${s.id} with its marker (${s.status})`);
      }
    }
  }
  return problems;
}

function intentStories() {
  const built = new Set();
  const delivered = new Set();
  if (!existsSync(INTENTS)) return { built, delivered };
  const index = existsSync(path.join(INTENTS, 'intents.json')) ? JSON.parse(readFileSync(path.join(INTENTS, 'intents.json'), 'utf8')) : [];
  const complete = new Set(index.filter((e) => e.status === 'complete').map((e) => e.dirName));
  for (const dir of readdirSync(INTENTS, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const base = path.join(INTENTS, dir.name);
    const stateFile = path.join(base, 'aidlc-state.md');
    const descFile = path.join(base, 'project-description.json');
    if (!existsSync(stateFile) || !existsSync(descFile)) continue;
    const state = parseState(readFileSync(stateFile, 'utf8'));
    const codeGen = state.phases.flatMap((p) => p.stages).find((st) => st.slug === 'code-generation');
    const ids = intentStoryIds(JSON.parse(readFileSync(descFile, 'utf8')));
    if (codeGen?.status === 'done') ids.forEach((id) => built.add(id));
    if (complete.has(dir.name)) ids.forEach((id) => delivered.add(id));
  }
  return { built, delivered };
}

/** The repository's v* tags; none without git or tags, as in a shallow CI checkout (US-0603 FR7). */
function repoTags() {
  try {
    return new Set(execFileSync('git', ['tag', '--list', 'v*'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

describe('feature docs status', () => {
  it('this repo: built and delivered stories are marked, and epic status lines and FEATURES.md rows match', () => {
    const overview = readFileSync(path.join(ROOT, 'docs/FEATURES.md'), 'utf8');
    const epics = {};
    for (const row of parseOverview(overview).epics) {
      const file = path.join(ROOT, 'docs', row.link);
      if (existsSync(file)) epics[row.link] = readFileSync(file, 'utf8');
    }
    expect(checkFeatureDocs({ overview, epics, ...intentStories(), tags: repoTags() })).toEqual([]);
  });

  const overview = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | 📋 Planned (US-0901) |\n';
  const epic = (marker, status) => `# EPIC-09: T\n\n**Status (2026-11-14):** ${status}\n\n**US-0901: Thing** ${marker}\n- [ ] x\n`;

  it('a description that opens with "US-XXXX:" names only that story; others keep every id they mention (US-0410)', () => {
    expect([...intentStoryIds('US-0410: Settings tabs; builds the card style US-0411 reuses.')]).toEqual(['US-0410']);
    expect([...intentStoryIds('Bygg EPIC-01 (US-0101 till US-0103) och US-0110')]).toEqual(['US-0101', 'US-0102', 'US-0103', 'US-0110']);
  });

  it('fails when a built story still says Planned', () => {
    const problems = checkFeatureDocs({ overview, epics: { 'e.md': epic('📋 Planned', '📋 Planned.') }, built: new Set(['US-0901']) });
    expect(problems).toEqual([expect.stringContaining('US-0901 is built')]);
  });

  it('fails when the epic status line and the FEATURES row lag behind a built story', () => {
    const problems = checkFeatureDocs({ overview, epics: { 'e.md': epic('🚧 Built', '📋 Planned.') }, built: new Set() });
    expect(problems).toHaveLength(2);
  });

  it('fails when a delivered story is still marked in progress', () => {
    const ov = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | 🚧 US-0901 built |\n';
    const problems = checkFeatureDocs({
      overview: ov,
      epics: { 'e.md': epic('🚧 Built', '🚧 US-0901 built.') },
      built: new Set(),
      delivered: new Set(['US-0901'])
    });
    expect(problems).toEqual([expect.stringContaining('US-0901 is delivered')]);
  });

  it('accepts 🚀 Deployed for a delivered story (US-0603 FR6)', () => {
    const ov = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | 🚀 US-0901 deployed |\n';
    const docs = { overview: ov, epics: { 'e.md': epic('🚀 Deployed', '🚀 US-0901 deployed.') }, built: new Set(['US-0901']) };
    expect(checkFeatureDocs({ ...docs, delivered: new Set(['US-0901']) })).toEqual([]);
  });

  it('fails a story still marked "for vX.Y.Z" when tag vX.Y.Z exists, and passes without tags (US-0603 FR7)', () => {
    const ov = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | ✅ US-0901 done, for v0.2.5 |\n';
    const docs = { overview: ov, epics: { 'e.md': epic('✅ Done, for v0.2.5', '✅ US-0901 done, for v0.2.5.') }, built: new Set() };
    expect(checkFeatureDocs({ ...docs, tags: new Set(['v0.2.4', 'v0.2.5']) })).toEqual([
      'US-0901 is still marked "for v0.2.5", but tag v0.2.5 exists: mark it "Released in v0.2.5"'
    ]);
    expect(checkFeatureDocs(docs)).toEqual([]); // a shallow CI checkout has no tags
  });

  it('passes ranges and uniform released epics', () => {
    expect(storyIdsWithRanges('US-0101 till US-0103')).toEqual(new Set(['US-0101', 'US-0102', 'US-0103']));
    const ov = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | ✅ Released in v0.1.0 |\n';
    expect(checkFeatureDocs({ overview: ov, epics: { 'e.md': epic('✅ Released in v0.1.0', '✅ Released in v0.1.0.') }, built: new Set() })).toEqual([]);
  });
});
