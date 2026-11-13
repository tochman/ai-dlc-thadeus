// Questions and gates AI-DLC is waiting on, derived from an intent's audit events (EPIC-05 US-0505 FR1.2, FR1.3).
// Pure: the events come from projectService.loadAuditEvents, already merged in time order.
// Answers carry no question id, so they are matched on Stage (and Unit when the answer has one) and order.

const CLOSERS = new Set(['GATE_APPROVED', 'GATE_REJECTED', 'STAGE_COMPLETED', 'STAGE_SKIPPED']);

/** `Options` as a list: a JSON array, else a comma-separated list, else the raw text (NFR2). */
export function parseOptions(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return [];
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return v.map(String);
  } catch {
    // not JSON: AI-DLC usually writes a comma-separated list
  }
  const parts = text.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts : [text];
}

const byTime = (a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0) || (a.seq ?? 0) - (b.seq ?? 0);

/** An answer without a Unit matches every unit of its stage; one with a Unit only that unit. */
const answers = (ev, q) => q.stage === (ev.fields?.Stage ?? null) && (!ev.fields?.Unit || q.unit === ev.fields.Unit);

/**
 * @param {Array<{event: string|null, fields: object, timeMs: number, seq?: number, key: string}>} events
 * @param {{project: {projectId: string, name: string}, intent: string}} where
 * @returns {Array<{id, projectId, projectName, intent, stage, kind: 'question'|'gate', text, options: string[], nextStage, timeMs}>}
 *   oldest first
 */
export function pendingQuestions(events, { project, intent }) {
  let open = [];
  for (const ev of [...(events ?? [])].sort(byTime)) {
    const f = ev.fields ?? {};
    if (ev.event === 'DECISION_RECORDED' || ev.event === 'STAGE_AWAITING_APPROVAL') {
      const gate = ev.event === 'STAGE_AWAITING_APPROVAL';
      open.push({
        id: f['Question Id'] || `${intent}:${ev.key}`,
        projectId: project.projectId,
        projectName: project.name,
        intent,
        stage: f.Stage ?? null,
        unit: f.Unit || null,
        kind: gate ? 'gate' : 'question',
        text: gate ? '' : f.Decision ?? '',
        options: gate ? [] : parseOptions(f.Options),
        nextStage: gate && f['Next Stage'] && f['Next Stage'] !== 'none' ? f['Next Stage'] : null,
        timeMs: ev.timeMs
      });
    } else if (ev.event === 'QUESTION_ANSWERED') {
      const i = open.findIndex((q) => q.kind === 'question' && answers(ev, q)); // the oldest one
      if (i !== -1) open.splice(i, 1);
    } else if (CLOSERS.has(ev.event) || ev.event === 'STAGE_STARTED') {
      open = open.filter((q) => !answers(ev, q)); // a new attempt also closes what the last one left
    }
  }
  return open;
}
