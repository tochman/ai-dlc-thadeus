// US-1403 FR5 (contract C7): the one place that knows how a Spec Kit command is written for a harness (BR5.1, NFR4.2),
// which command comes next for a feature (BR5.2, BR5.3), and the specify description as one plain line (BR5.6, NFR4.3).
// Pure: plain values in, a string, an object or null out (NFR7.3).

// ponytail: Spec Kit 1.4.3's core commands, by hand; a new core command shows only once it is added here.
const CORE = new Set(['constitution', 'specify', 'clarify', 'plan', 'tasks', 'analyze', 'checklist', 'implement', 'converge', 'taskstoissues']);
// The same safe form U7's reader keeps extension command names to (C6).
const SAFE_NAME = /^speckit(\.[a-z0-9_-]+)+$/i;
const MAX_TEXT = 1000;

/** US-1403 NFR4.3: one plain line: breaks and tabs as spaces, no control character, trimmed, at most 1000 characters; null when blank. */
export function specifyText(raw) {
  if (typeof raw !== 'string') return null;
  const text = raw
    .replace(/[\r\n\t\u0085\p{Zl}\p{Zp}]/gu, ' ') // U+2028, U+2029: the line and paragraph separators
    .replace(/\p{Cc}/gu, '')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
    .trim();
  return text || null;
}

/**
 * US-1403 BR5.2, BR5.3: the next command for a feature from speckit:features (C5): specify, plan, tasks, implement or
 * converge. A tasks.md with no tasks (empty or unreadable) gives tasks. Converge stays after converge, `converged: 'unknown'`,
 * because Spec Kit writes nothing when a feature has converged.
 */
export function nextCommand(feature) {
  const { flow, tasks } = feature;
  if (!flow.spec) return { name: 'specify' };
  if (!flow.plan) return { name: 'plan' };
  if (!flow.tasks || tasks.total === 0) return { name: 'tasks' };
  if (tasks.phases.some((p) => p.items.some((i) => !i.done))) return { name: 'implement' };
  return { name: 'converge', converged: 'unknown' };
}

/** US-1403 NFR4.2: `plan` or `speckit.git.commit` as `speckit.<…>`, or null when the name is not a safe command name. */
export function commandName(name) {
  if (typeof name !== 'string') return null;
  if (CORE.has(name)) return `speckit.${name}`;
  return SAFE_NAME.test(name) ? name : null;
}

/**
 * US-1403 BR5.1 (C7): the text typed for `name` in `harness` (an id): claude `/speckit-plan`, `/speckit-git-commit`;
 * opencode `/speckit.plan`, `/speckit.git.commit`; the arguments after one space. Null for another harness or an unsafe name.
 */
export function speckitCommand(harness, name, args) {
  const full = commandName(name);
  if (!full) return null;
  let command;
  if (harness === 'claude') command = `/${full.replaceAll('.', '-')}`;
  else if (harness === 'opencode') command = `/${full}`;
  else return null;
  const line = specifyText(args);
  return line ? `${command} ${line}` : command;
}
