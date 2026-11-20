// US-1402 FR6.3, BR6.4: Spec Kit's tasks.md read as phases of task lines. Pure, one pass over the lines.

const PHASE = /^##\s+Phase\s+\d+\s*:\s*(.*?)\s*$/i;
const TASK = /^\s*- \[([ xX])\]\s+(T\d+)(\s+\[P\])?(?:\s+\[(US\d+)\])?(?:\s+(.*?))?\s*$/;
const TASK_LIKE = /^\s*- \[/;
const CONVERGENCE = /^convergence\b/i;

/**
 * US-1402 FR6.3: `{ done, total, skipped, phases: [{ name, round, items: [{ id, parallel, story, done, text }] }] }`.
 * A phase starts at `## Phase <n>: <title>`; tasks before the first one go in a phase named ''. A Convergence phase
 * gets round 1, 2, ... in file order, any other round null. A `- [` line that is not a task is counted in skipped.
 * @param {string} text
 */
export function parseTasks(text) {
  const phases = [];
  let phase = null;
  let rounds = 0;
  let done = 0;
  let total = 0;
  let skipped = 0;
  for (const line of String(text).split(/\r?\n/)) {
    const head = PHASE.exec(line);
    if (head) {
      phase = { name: head[1], round: CONVERGENCE.test(head[1]) ? ++rounds : null, items: [] };
      phases.push(phase);
      continue;
    }
    if (!TASK_LIKE.test(line)) continue;
    const m = TASK.exec(line);
    if (!m) {
      skipped++;
      continue;
    }
    if (!phase) {
      phase = { name: '', round: null, items: [] };
      phases.push(phase);
    }
    const item = { id: m[2], parallel: Boolean(m[3]), story: m[4] ?? null, done: m[1] !== ' ', text: m[5] ?? '' };
    phase.items.push(item);
    total++;
    if (item.done) done++;
  }
  return { done, total, skipped, phases };
}
