// THADEUS cost rule pack (US-0212). Keeps a marked block of cost rules in each space's project.md and phase files.
// The app writes only between the markers (FR2.1), only to the files in COST_RULES_FILES (NFR1), after a diff the
// person confirms (FR5.1), atomically and only when the file still reads as previewed (FR5.2, NFR4). After a save it
// recompiles AI-DLC and puts every file back when that fails (FR5.3, FR5.4). US-0032: the status names the shipped
// lines a present block lacks.
import { promises as fs } from 'node:fs';
import { defaultExec } from './exec.js';
import { writeAtomic } from './fileWrite.js';
import { compileEveryHarness } from './plans.js';
import { resolveInRoot } from './projectAccess.js';
import { listSpaces } from './projectService.js';
import { COST_RULES_CLASHES, COST_RULES_END, COST_RULES_FILES, COST_RULES_PACK, COST_RULES_START, COST_RULES_TARGETS } from '../shared/costRules.js';
import { t } from '../shared/i18n.js';

const SPACE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const MAX_LINES = 20;
const MAX_LINE_CHARS = 300;

const refuse = (value) => {
  throw new Error(t('errors.invalidValue', { what: 'cost rules', value: String(value) }));
};
const count = (text, marker) => text.split(marker).length - 1;

/** US-0212 NFR1: the root-relative memory file of one target in a space. Throws for anything outside the table. */
export function targetFile(space, target) {
  if (typeof space !== 'string' || !SPACE.test(space)) refuse(space);
  if (!COST_RULES_FILES.includes(target)) refuse(target);
  return `aidlc/spaces/${space}/memory/${target}.md`;
}

/**
 * US-0212 FR2.4: whether `text` holds the block, and its lines (without the `- `), or why its markers are broken
 * (`onlyStart`, `onlyEnd`, `startAfterEnd`, `twice`).
 * @returns {{state: 'absent'} | {state: 'present', lines: string[]} | {state: 'broken', problem: string}}
 */
export function blockState(text) {
  const starts = count(text, COST_RULES_START);
  const ends = count(text, COST_RULES_END);
  if (!starts && !ends) return { state: 'absent' };
  if (starts > 1 || ends > 1) return { state: 'broken', problem: 'twice' };
  if (!ends) return { state: 'broken', problem: 'onlyStart' };
  if (!starts) return { state: 'broken', problem: 'onlyEnd' };
  const start = text.indexOf(COST_RULES_START) + COST_RULES_START.length;
  const end = text.indexOf(COST_RULES_END);
  if (end < start) return { state: 'broken', problem: 'startAfterEnd' };
  const lines = text
    .slice(start, end)
    .split('\n')
    .map((l) => l.replace(/\r$/, '').replace(/^- /, ''))
    .filter((l) => l.trim());
  return { state: 'present', lines };
}

function checkLines(lines) {
  if (!Array.isArray(lines) || lines.length > MAX_LINES) refuse(lines);
  for (const l of lines) {
    if (typeof l !== 'string' || l.length > MAX_LINE_CHARS || /[\r\n]/.test(l) || l.includes('<!--') || l.includes('-->')) refuse(l);
  }
}

/**
 * US-0212 FR2.1–FR2.3: `text` with the block holding `lines`, or without the block for `null`. Absent, it is added at
 * the end (FR2.2); present, only the text between the markers changes (FR2.1); off removes it and the newline it was
 * added with, so the file is byte-identical to before (FR2.3). Throws for a broken marker pair (FR2.4).
 */
export function withBlock(text, lines) {
  if (typeof text !== 'string') refuse(text);
  if (lines !== null) checkLines(lines);
  const found = blockState(text);
  if (found.state === 'broken') throw new Error(t('errors.costRulesBroken', { problem: found.problem }));
  const body = lines && ['', ...lines.map((l) => `- ${l}`), ''].join('\n');
  if (found.state === 'absent') {
    if (!lines) return text;
    const block = `${COST_RULES_START}${body}${COST_RULES_END}`;
    return text === '' || text.endsWith('\n') ? `${text}${block}\n` : `${text}\n${block}`;
  }
  const start = text.indexOf(COST_RULES_START);
  const end = text.indexOf(COST_RULES_END);
  if (lines) return `${text.slice(0, start + COST_RULES_START.length)}${body}${text.slice(end)}`;
  let head = text.slice(0, start);
  let tail = text.slice(end + COST_RULES_END.length);
  if (tail.startsWith('\n')) tail = tail.slice(1);
  else if (tail === '' && head.endsWith('\n')) head = head.slice(0, -1);
  return head + tail;
}

const clashes = (a, b) => {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()];
  return COST_RULES_CLASHES.some(([p, q]) => (x.includes(p) && y.includes(q)) || (x.includes(q) && y.includes(p)));
};

/**
 * US-0212 FR6.1, FR6.2: every pack line that clashes with a rule line, by the fixed keyword pairs. Warns, never blocks.
 * @param {string[]} lines the pack's lines, edited ones included
 * @param {Array<{space: string, file: string, text: string}>} rules the team.md and org.md texts per space
 * @returns {Array<{line: string, rule: string, file: string, space: string}>}
 */
export function findClashes(lines, rules) {
  const out = [];
  for (const { space, file, text } of rules) {
    const ruleLines = text.split('\n').map((l) => l.replace(/\r$/, ''));
    for (const line of lines) for (const rule of ruleLines) if (rule.trim() && clashes(line, rule)) out.push({ line, rule, file, space });
  }
  return out;
}

// File access.

const changed = (file) => new Error(t('errors.changedSincePreview', { file }));

async function readOrNull(root, rel) {
  try {
    return await fs.readFile(await resolveInRoot(root, rel), 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

/** The spaces with a valid name, each with the text of its target files (null when missing). */
async function readTargets(root) {
  const spaces = (await listSpaces(root)).filter((s) => SPACE.test(s));
  const out = [];
  for (const space of spaces) {
    for (const target of COST_RULES_TARGETS) {
      const file = targetFile(space, target);
      out.push({ space, target, file, text: await readOrNull(root, file) });
    }
  }
  return { spaces, targets: out };
}

const stateOf = (text) => (text === null ? { state: 'broken', problem: 'missing' } : blockState(text));

/**
 * US-0212 FR1.2, FR3.2: every space with each target file's state (`absent`, `present`, or `broken` with its problem),
 * whether the pack is on (a block in any file), and the lines to edit: the first block found per target, else the
 * shipped pack. US-0032 AC1: `missing` holds, per target with a block, the shipped lines that block lacks, so a
 * project with an older pack is offered the new ones.
 */
export async function costRulesStatus(root) {
  const { spaces, targets } = await readTargets(root);
  const lines = { ...COST_RULES_PACK };
  const seen = new Set();
  for (const { target, text } of targets) {
    const found = stateOf(text);
    if (found.state === 'present' && !seen.has(target)) {
      seen.add(target);
      lines[target] = found.lines;
    }
  }
  const files = (space) =>
    targets
      .filter((f) => f.space === space)
      .map(({ target, file, text }) => {
        const { state, problem } = stateOf(text);
        return problem ? { target, file, state, problem } : { target, file, state };
      });
  const missing = {};
  for (const target of seen) {
    const lack = COST_RULES_PACK[target].filter((l) => !lines[target].includes(l));
    if (lack.length) missing[target] = lack;
  }
  return { spaces: spaces.map((space) => ({ space, files: files(space) })), on: seen.size > 0, lines, missing };
}

/** The pack sent by the renderer: exactly one list of lines per target (NFR1). */
function checkPack(lines) {
  if (!lines || typeof lines !== 'object' || Array.isArray(lines)) refuse(lines);
  const keys = Object.keys(lines);
  if (keys.length !== COST_RULES_TARGETS.length || !COST_RULES_TARGETS.every((k) => keys.includes(k))) refuse(keys.join(', '));
  for (const k of COST_RULES_TARGETS) checkLines(lines[k]);
  return lines;
}

/** The changed lines between two texts: the common head and tail left out. */
function lineDiff(before, next) {
  const a = before.split('\n');
  const b = next.split('\n');
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  return [...a.slice(s, a.length - e).map((l) => `- ${l}`), ...b.slice(s, b.length - e).map((l) => `+ ${l}`)].join('\n');
}

async function readRules(root, spaces) {
  const rules = [];
  for (const space of spaces) {
    for (const layer of ['team', 'org']) {
      const file = `aidlc/spaces/${space}/memory/${layer}.md`;
      const text = await readOrNull(root, file);
      if (text !== null) rules.push({ space, file, text });
    }
  }
  return rules;
}

/**
 * US-0212 FR5.1, FR2.4, FR6: what a save would write, without writing. `changes` holds one diff per changed file and
 * space, with the text it was made from; a broken or missing file is in `errors` and left out; `warnings` are the
 * clashes with each space's team.md and org.md. Off (`on` not true) removes the block and ignores `lines`.
 */
export async function previewCostRules(root, { on, lines } = {}) {
  const pack = on === true ? checkPack(lines) : null;
  const { spaces, targets } = await readTargets(root);
  const changes = [];
  const errors = [];
  for (const { space, target, file, text } of targets) {
    const found = stateOf(text);
    if (found.state === 'broken') {
      if (pack || found.problem !== 'missing') errors.push({ space, file, problem: found.problem });
      continue;
    }
    const next = withBlock(text, pack && pack[target]);
    if (next !== text) changes.push({ space, file, before: text, next, diff: lineDiff(text, next) });
  }
  const warnings = pack ? findClashes(Object.values(pack).flat(), await readRules(root, spaces)) : [];
  return { changes, errors, warnings };
}

/** A change's file, only when it is a target file of a valid space (NFR1). */
function checkedFile(file) {
  const m = /^aidlc\/spaces\/([^/]+)\/memory\/(.+)\.md$/.exec(typeof file === 'string' ? file : '');
  if (!m || targetFile(m[1], m[2]) !== file) refuse(file);
  return file;
}

async function writeBack(written) {
  const failed = [];
  for (const c of written) {
    try {
      await writeAtomic(c.abs, Buffer.from(c.before, 'utf8'), { mode: c.mode });
    } catch (err) {
      console.error(`Kunde inte återställa ${c.file}:`, err.message);
      failed.push(c.file);
    }
  }
  return failed;
}

/**
 * US-0212 FR5.2–FR5.4, NFR4: writes the previewed changes atomically, only when every file still reads as previewed
 * (else throws before writing), then runs `aidlc engine graph compile`. When the compile fails (non-zero exit,
 * timeout, missing `aidlc`) every written file is put back from its `before` text. `exec` is injectable for tests.
 * @returns {Promise<{ok: true, files: string[], output: string} | {ok: false, files: string[], restored: boolean, error: string, notRestored?: string[]}>}
 */
export async function applyCostRules(root, changes, { exec = defaultExec } = {}) {
  if (!Array.isArray(changes)) refuse(changes);
  const planned = [];
  for (const c of changes) {
    const abs = await resolveInRoot(root, checkedFile(c.file));
    if ((await fs.readFile(abs, 'utf8')) !== c.before) throw changed(c.file);
    planned.push({ ...c, abs, mode: (await fs.stat(abs)).mode & 0o7777 });
  }
  const written = [];
  try {
    for (const c of planned) {
      const expect = async () => {
        if ((await fs.readFile(c.abs, 'utf8')) !== c.before) throw changed(c.file);
      };
      await writeAtomic(c.abs, Buffer.from(c.next, 'utf8'), { mode: c.mode, expect });
      written.push(c);
    }
  } catch (err) {
    await writeBack(written);
    throw err;
  }
  const files = changes.map((c) => c.file);
  const compiled = await compileEveryHarness(root, exec);
  if (compiled.ok) return { ok: true, files, output: compiled.output };
  const failed = await writeBack(written);
  return { ok: false, files, restored: !failed.length, error: compiled.error, ...(failed.length ? { notRestored: failed } : {}) };
}
