// Keeps the feature docs honest (project rule: feature docs are updated in Deployment Execution, before the PR).
// CI runs this on every PR, so a story that was built but still says 📋 Planned, or an epic status line /
// FEATURES.md row that doesn't mention a built story with its marker, blocks the merge.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parseEpic, parseOverview, statusOf } from '../../src/main/parsers/features.js';
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

/** True when some segment of `text` (split on "·" or ". ") names `id` and carries `status`'s marker. */
export function mentionsWithStatus(text, id, status) {
  return String(text ?? '')
    .split(/·|\.\s/)
    .some((seg) => storyIdsWithRanges(seg).has(id) && statusOf(seg) === status);
}

/**
 * @param {{overview: string, epics: Record<string, string>, built: Set<string>}} docs
 *   epics: link → markdown; built: story ids whose intent has finished Code Generation
 * @returns {string[]} problems, empty when the docs are consistent
 */
export function checkFeatureDocs({ overview, epics, built }) {
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

function builtStories() {
  const built = new Set();
  if (!existsSync(INTENTS)) return built;
  for (const dir of readdirSync(INTENTS, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const base = path.join(INTENTS, dir.name);
    const stateFile = path.join(base, 'aidlc-state.md');
    const descFile = path.join(base, 'project-description.json');
    if (!existsSync(stateFile) || !existsSync(descFile)) continue;
    const state = parseState(readFileSync(stateFile, 'utf8'));
    const codeGen = state.phases.flatMap((p) => p.stages).find((st) => st.slug === 'code-generation');
    if (codeGen?.status !== 'done') continue;
    for (const id of storyIdsWithRanges(JSON.parse(readFileSync(descFile, 'utf8')))) built.add(id);
  }
  return built;
}

describe('feature docs status', () => {
  it('this repo: built stories are marked, and epic status lines and FEATURES.md rows match the story markers', () => {
    const overview = readFileSync(path.join(ROOT, 'docs/FEATURES.md'), 'utf8');
    const epics = {};
    for (const row of parseOverview(overview).epics) {
      const file = path.join(ROOT, 'docs', row.link);
      if (existsSync(file)) epics[row.link] = readFileSync(file, 'utf8');
    }
    expect(checkFeatureDocs({ overview, epics, built: builtStories() })).toEqual([]);
  });

  const overview = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | 📋 Planned (US-0901) |\n';
  const epic = (marker, status) => `# EPIC-09: T\n\n**Status (2026-11-14):** ${status}\n\n**US-0901: Thing** ${marker}\n- [ ] x\n`;

  it('fails when a built story still says Planned', () => {
    const problems = checkFeatureDocs({ overview, epics: { 'e.md': epic('📋 Planned', '📋 Planned.') }, built: new Set(['US-0901']) });
    expect(problems).toEqual([expect.stringContaining('US-0901 is built')]);
  });

  it('fails when the epic status line and the FEATURES row lag behind a built story', () => {
    const problems = checkFeatureDocs({ overview, epics: { 'e.md': epic('🚧 Built', '📋 Planned.') }, built: new Set() });
    expect(problems).toHaveLength(2);
  });

  it('passes ranges and uniform released epics', () => {
    expect(storyIdsWithRanges('US-0101 till US-0103')).toEqual(new Set(['US-0101', 'US-0102', 'US-0103']));
    const ov = '| Epic | Topic | Status |\n|---|---|---|\n| [EPIC-09](e.md) | T | ✅ Released in v0.1.0 |\n';
    expect(checkFeatureDocs({ overview: ov, epics: { 'e.md': epic('✅ Released in v0.1.0', '✅ Released in v0.1.0.') }, built: new Set() })).toEqual([]);
  });
});
