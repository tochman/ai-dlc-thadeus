// US-0507 FR2, FR3.2, FR5.3, NFR2: the agent progress of one intent. The rows come from the audit events
// (parsers/agentProgress.js); this adds each build's plan steps and last commit subject and each review's findings.
// Read-only: every path goes through projectAccess (resolveInRoot), and git only runs `log -1` with fixed arguments.
// US-1410 FR10 (contract C9): the Spec Kit form, from the hook events and U6's features reader; it reads no file itself.
import path from 'node:path';
import { readJsonSafe, readText, resolveInRoot } from './projectAccess.js';
import { assertName, inflightCount, intentsDir, loadAuditEvents } from './projectService.js';
import { planSteps, progressRows, severityCounts } from './parsers/agentProgress.js';
import { lastCommitSubject } from './git.js';
import { loadSpeckitFeatures } from './speckitFeatures.js';
import { selectableHarness } from '../shared/harnesses.js';

const PLAN = 'code-generation/code-generation-plan.md';
const ENGINE = '.aidlc-engine/';

/** The first plan that can be read, counted; when none can, the path to name instead (FR5.3). */
async function readPlan(root, rels, nameIfNone) {
  for (const rel of rels) {
    try {
      return { steps: planSteps(await readText(root, rel)), unreadable: null };
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`Planen ${rel} kunde inte läsas:`, err.message);
    }
  }
  return { steps: null, unreadable: nameIfNone ?? rels[0] };
}

/**
 * A build's plan: the Unit's in its worktree, then the record's (where it lands after the merge); with no Unit, the
 * record's. The commit is read in the worktree, or the project root for a build with no Unit (FR2.1, FR2.2).
 */
async function withBuildProgress(root, base, row, exec) {
  const recordPlan = `${base}/construction/${row.unit ? `${row.unit}/` : ''}${PLAN}`;
  // A legacy audit row holds an absolute worktree path; resolveInRoot refuses one outside the root.
  const tree = row.worktree && (path.isAbsolute(row.worktree) ? path.relative(root, row.worktree) : row.worktree);
  let cwd = row.unit ? null : root;
  if (tree) {
    try {
      cwd = await resolveInRoot(root, tree);
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn(`Worktree ${tree} kunde inte läsas:`, err.message);
    }
  }
  const plans = tree && cwd ? [`${tree}/${recordPlan}`, recordPlan] : [recordPlan];
  const plan = await readPlan(root, plans, tree && !cwd ? tree : null);
  return { ...row, ...plan, commit: cwd ? await lastCommitSubject(cwd, { exec }) : null };
}

/** A review's findings per severity from the record REVIEW_COMPLETED names (FR3.2). */
async function withFindings(root, base, row) {
  if (!row.record) return { ...row, severities: null, unreadable: null };
  const rel = `${base}/${row.record.startsWith(ENGINE) ? '' : ENGINE}${row.record}`;
  const res = await readJsonSafe(root, rel);
  return res.ok ? { ...row, severities: severityCounts(res.value), unreadable: null } : { ...row, severities: null, unreadable: rel };
}

const OPEN = new Set(['shown', 'timedOut']); // agentEvents.js's open states
const WAITS = new Set(['question', 'permission']);
const MAX_QUESTION = 200; // NFR5.1, in characters (code points)

/** NFR5.1: the header, else the body's first non-empty line, trimmed and cut to 200 characters. */
function questionText(ev) {
  if (ev.kind === 'permission') return ev.permission?.what ?? ''; // NFR3.3: the tool name only, never its detail
  const q = ev.questions?.[0];
  const text =
    q?.header?.trim() ||
    (q?.text ?? '')
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) ||
    '';
  return Array.from(text).slice(0, MAX_QUESTION).join('');
}

/**
 * US-1410 BR10.2, NFR3.3: the first open hook question or permission of `events` (one project's list, in pager order),
 * as `{ question, agent }` and nothing else; null when none is open. The audit fallback rows are not hooks.
 */
export function waitingFrom(events) {
  const ev = (events ?? []).find((e) => WAITS.has(e.kind) && OPEN.has(e.state) && !String(e.eventId).startsWith('audit-'));
  return ev ? { question: questionText(ev), agent: selectableHarness(ev.harness)?.label ?? ev.harness } : null;
}

/** BR10.3: the active feature's name and task counts, or null. */
async function activeFeature(root, loadFeatures) {
  const { features, active } = await loadFeatures(root);
  const f = active ? features.find((x) => x.dir === active) : null;
  return f ? { name: f.name, done: f.tasks.done, total: f.tasks.total } : null;
}

/**
 * US-1410 FR10, BR10.1–BR10.4, NFR5.2 (contract C9): `{ source: hooks|tasks|none, waiting, feature }` for a Spec Kit
 * project (or a call with no intent). A failing part is null; this never rejects.
 * @param {string} root the project root
 * @param {object[]} events the project's public hook events, in pager order (store.list)
 * @param {{loadFeatures?: Function}} [opts] loadFeatures: U6's reader, injectable for tests
 */
export async function loadSpeckitProgress(root, events, { loadFeatures = loadSpeckitFeatures } = {}) {
  const waiting = waitingFrom(events); // in memory, pure: no file work (NFR7.3)
  let feature = null;
  try {
    feature = await activeFeature(root, loadFeatures);
  } catch (err) {
    console.warn('Spec Kit-featuren kunde inte läsas:', err.message);
  }
  return { source: waiting ? 'hooks' : feature ? 'tasks' : 'none', waiting, feature };
}

/**
 * US-0507 FR1–FR5: the agent progress rows of one intent, with what each row's own files say.
 * @param {{exec?: Function, nowMs?: number}} [opts] exec: injectable for tests (runFixed)
 */
export async function loadAgentProgress(root, space, dirName, { exec, nowMs = Date.now() } = {}) {
  assertName(space, 'space');
  assertName(dirName, 'intent');
  const base = `${intentsDir(space)}/${dirName}`;
  const rows = progressRows(await loadAuditEvents(root, base), { running: await inflightCount(root), nowMs });
  return Promise.all(
    rows.map((row) => {
      if (row.kind === 'build') return withBuildProgress(root, base, row, exec);
      if (row.kind === 'review') return withFindings(root, base, row);
      return { ...row, unreadable: null };
    })
  );
}
