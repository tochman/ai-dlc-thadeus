// Derives each unit's status from the last UNIT_STARTED / UNIT_COMPLETED event for it.

export function unitStatuses(dag, events) {
  const status = Object.fromEntries((dag?.units ?? []).map((u) => [u.name, 'pending']));
  for (const e of events ?? []) {
    const unit = e.fields?.Unit;
    if (!unit || !(unit in status)) continue;
    if (e.event === 'UNIT_STARTED') status[unit] = 'running';
    else if (e.event === 'UNIT_COMPLETED') status[unit] = 'done';
  }
  return status;
}
