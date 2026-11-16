// Derives each unit's status from the audit events for it: UNIT_STARTED / UNIT_COMPLETED by `Unit`, and the
// build events by `Bolt slug` (US-0507 FR6.1: builds log WORKTREE_CREATED and BOLT_STARTED, never UNIT_STARTED).

const RUNNING = new Set(['UNIT_STARTED', 'WORKTREE_CREATED', 'BOLT_STARTED']);
const DONE = new Set(['UNIT_COMPLETED', 'BOLT_COMPLETED']);

export function unitStatuses(dag, events) {
  const status = Object.fromEntries((dag?.units ?? []).map((u) => [u.name, 'pending']));
  for (const e of events ?? []) {
    const unit = e.fields?.Unit ?? e.fields?.['Bolt slug'];
    if (!unit || !(unit in status)) continue;
    if (RUNNING.has(e.event)) status[unit] = 'running';
    else if (DONE.has(e.event)) status[unit] = 'done';
  }
  return status;
}
