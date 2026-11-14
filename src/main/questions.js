// Questions and gates AI-DLC is waiting on, derived from an intent's audit events (EPIC-05 US-0505 FR1.2, FR1.3).
// Pure: the events come from projectService.loadAuditEvents, already merged in time order.
// Answers carry no question id, so they are matched on Stage (and Unit when the answer has one), the reply and order.
// EPIC-00 US-0006: options are read the way AI-DLC really logs them (JSON, comma, pipe or semicolon lists, batch
// summaries), and the engine's own asks (QUESTION_ASKED: plan approval, scope confirmation) are shown too.

const CLOSERS = new Set(['GATE_APPROVED', 'GATE_REJECTED', 'STAGE_COMPLETED', 'STAGE_SKIPPED', 'STAGE_STARTED']);
/** Events that settle an engine ask of their stage (or any stage, without one). */
const ASK_CLOSERS = new Set(['PLAN_APPROVAL_RECORDED', 'PLAN_APPROVAL_SKIPPED', 'REQUEST_ROUTED']);

const QN = /^\s*Q(\d+):\s*/i;
/** "Guide me (walk through each question here)": the label is the part before the description. */
const label = (s) => String(s).replace(QN, '').replace(/\s+\([^()]*\)\s*$/, '').trim();

/** `text` split on `ch`, but not inside parentheses (a description may hold a comma or a semicolon). */
function splitTop(text, ch) {
  const parts = [''];
  let depth = 0;
  for (const c of text) {
    if (c === '(') depth++;
    else if (c === ')') depth = Math.max(0, depth - 1);
    if (c === ch && depth === 0) parts.push('');
    else parts[parts.length - 1] += c;
  }
  return parts;
}

/**
 * `Options` as AI-DLC writes them (NFR2): a JSON array; a comma, pipe or semicolon list; or a batch summary whose
 * items start with "Q<n>:" ("Q1: a / b; Q2: c / d", "|Q1: A. a|Q1: B. b|Q2: …", "Q1: a,Q1: b,Q2: c").
 * @returns {{options: string[], batch: {id: string, options: string[]}[]|null}} batch is set for two questions or more
 */
export function parseOptions(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return { options: [], batch: null };
  try {
    const v = JSON.parse(text);
    if (Array.isArray(v)) return { options: v.map(String), batch: null };
  } catch {
    // not JSON: a list in one of AI-DLC's text forms
  }
  const sep = ['|', ';'].find((ch) => splitTop(text, ch).length > 1) ?? ',';
  const items = splitTop(text, sep).map((s) => s.trim()).filter(Boolean);
  if (!items.length) return { options: [text], batch: null };
  const groups = [];
  for (const item of items) {
    const m = QN.exec(item);
    if (m && groups.at(-1)?.id !== `Q${m[1]}`) groups.push({ id: `Q${m[1]}`, items: [] });
    if (!groups.length) groups.push({ id: null, items: [] });
    const g = groups.at(-1);
    // "Q1: a / b, c,Q2: …": in a comma list of questions, an item without "Q<n>:" continues the one before it.
    if (!m && sep === ',' && g.id) g.items[g.items.length - 1] += `, ${item}`;
    else g.items.push(item.replace(QN, ''));
  }
  // Inside one item, "a / b / c" (or, in a semicolon summary, "a, b, c") lists that question's options.
  const split = (s) => (s.includes(' / ') ? s.split(' / ') : sep === ';' ? splitTop(s, ',') : [s]);
  const options = (g) => g.items.flatMap(split).map(label).filter(Boolean);
  const asked = groups.filter((g) => g.id);
  if (new Set(asked.map((g) => g.id)).size >= 2) return { options: groups.flatMap(options), batch: groups.map((g) => ({ id: g.id, options: options(g) })) };
  const flat = groups.flatMap(options);
  return { options: flat.length ? flat : [text], batch: null };
}

const byTime = (a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0) || (a.seq ?? 0) - (b.seq ?? 0);

/** An answer without a Unit matches every unit of its stage; one with a Unit only that unit. */
const answers = (ev, q) => q.stage === (ev.fields?.Stage ?? null) && (!ev.fields?.Unit || q.unit === ev.fields.Unit);

const norm = (s) => label(s).replace(/^[A-Z]\.\s+/, '').replace(/\s+/g, ' ').toLowerCase();
/** The reply names one of the question's options (or, for a batch, one of each question's). */
const repliedTo = (q, reply) => {
  const said = String(reply ?? '').split(/\\n|\n|;/).map(norm).filter(Boolean);
  return said.length > 0 && said.every((r) => q.options.some((o) => norm(o) === r));
};
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.some((y) => norm(x) === norm(y)));

function parseJson(raw) {
  try {
    const v = JSON.parse(String(raw ?? ''));
    return Array.isArray(v) ? v.map(String) : null;
  } catch {
    return null;
  }
}

/**
 * @param {Array<{event: string|null, fields: object, timeMs: number, seq?: number, key: string}>} events
 * @param {{project: {projectId: string, name: string}, intent: string}} where
 * @returns {Array<{id, projectId, projectName, intent, stage, kind: 'question'|'gate', text, options: string[],
 *   batch: {id, options}[]|null, ask: string|null, nextStage, timeMs}>} oldest first; `ask` is the engine ask's
 *   Question Type (plan-approval, scope-confirm, …), null for a stage question or a gate
 */
export function pendingQuestions(events, { project, intent }) {
  let open = [];
  const base = (ev, f) => ({
    id: f['Question Id'] || `${intent}:${ev.key}`,
    projectId: project.projectId,
    projectName: project.name,
    intent,
    stage: f.Stage ?? null,
    unit: f.Unit || null,
    timeMs: ev.timeMs
  });
  for (const ev of [...(events ?? [])].sort(byTime)) {
    const f = ev.fields ?? {};
    if (ev.event === 'DECISION_RECORDED' || ev.event === 'STAGE_AWAITING_APPROVAL') {
      const gate = ev.event === 'STAGE_AWAITING_APPROVAL';
      const { options, batch } = gate ? { options: [], batch: null } : parseOptions(f.Options);
      open.push({
        ...base(ev, f),
        kind: gate ? 'gate' : 'question',
        text: gate ? '' : f.Decision ?? '',
        options,
        batch,
        ask: null,
        nextStage: gate && f['Next Stage'] && f['Next Stage'] !== 'none' ? f['Next Stage'] : null
      });
    } else if (ev.event === 'QUESTION_ASKED') {
      // The engine's own ask, with the picker's exact options as JSON; a gate already came as STAGE_AWAITING_APPROVAL.
      const options = parseJson(f.Options);
      const q = base(ev, f);
      if (!options?.length || f['Question Type'] === 'gate' || open.some((o) => o.id === q.id)) continue;
      open.push({ ...q, kind: 'question', text: '', options, batch: null, ask: f['Question Type'] || 'question', nextStage: null });
    } else if (ev.event === 'QUESTION_REPLIED') {
      // The reply to an engine ask: it names the options it was asked with.
      const options = parseJson(f.Options) ?? [];
      const i = open.findIndex((q) => q.ask && sameSet(q.options, options));
      if (i !== -1) open.splice(i, 1);
    } else if (ev.event === 'QUESTION_ANSWERED') {
      // The question whose options the reply names (the oldest such), else the newest: the one on screen.
      const candidates = open.filter((q) => q.kind === 'question' && !q.ask && answers(ev, q));
      const q = candidates.find((c) => repliedTo(c, f['Person Reply']) || repliedTo(c, f.Details)) ?? candidates.at(-1);
      if (q) open = open.filter((o) => o !== q);
    } else if (ASK_CLOSERS.has(ev.event)) {
      open = open.filter((q) => !q.ask || (f.Stage && q.stage !== f.Stage));
    } else if (CLOSERS.has(ev.event)) {
      open = open.filter((q) => !answers(ev, q)); // a new attempt also closes what the last one left
    }
  }
  return open;
}
