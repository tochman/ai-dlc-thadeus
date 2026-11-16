// US-0303 Project velocity: per-intent, per-story and per-project time metrics, computed from the merged audit events,
// the feature docs, the git history of the epic files and the release tags. Pure functions without Node imports, so the
// renderer computes the intent tab from `detail.events` with the same code (NFR5, FR4.4: every number is computed).
// A number the records cannot support is null, shown as "unknown", never 0 (FR2.2, FR4.2).
import { statusOf } from './features.js';

const HEAD_LINE = /^\+\*\*(US-\d{4})\s*[:–-].*?\*\*\s*(.*)$/;
const RELEASED = /released in (v\d+\.\d+\.\d+)/i;
const DAY_MS = 864e5;

/**
 * US-0303 FR2.1, FR2.4: the first commit date at which each story's head line gained 🚧 and ✅ (🚀 counts as done),
 * from storyMarkerHistory's `git log --reverse -p --unified=0` text (each commit starts with `\0<hash>\t<ISO date>`).
 * @returns {{stories: Record<string, {progressMs: number|null, doneMs: number|null}>, commits: number, fromMs: number|null, toMs: number|null}}
 */
export function parseMarkerHistory(text) {
  const stories = {};
  let commits = 0;
  let fromMs = null;
  let toMs = null;
  let at = null;
  for (const line of String(text ?? '').split('\n')) {
    if (line.startsWith('\0')) {
      const ms = Date.parse(line.slice(1).split('\t')[1] ?? '');
      at = Number.isNaN(ms) ? null : ms;
      commits += 1;
      if (at !== null) {
        fromMs ??= at;
        toMs = at;
      }
      continue;
    }
    const m = at !== null && HEAD_LINE.exec(line);
    if (!m) continue;
    const status = statusOf(m[2]);
    const s = (stories[m[1]] ??= { progressMs: null, doneMs: null });
    if (status === 'progress') s.progressMs ??= at;
    if (status === 'done' || status === 'deployed') s.doneMs ??= at;
  }
  return { stories, commits, fromMs, toMs };
}

const GATE_ANSWER = new Set(['GATE_APPROVED', 'GATE_REJECTED']);
const PLAN_ANSWER = new Set(['PLAN_APPROVAL_RECORDED', 'PLAN_APPROVAL_REJECTED']);
// A plan approval is asked as a plan-approval question (the audit has no PLAN_APPROVAL_REQUESTED today) and answered
// with PLAN_APPROVAL_RECORDED (FR1.3).
const isPlanAsk = (e) => e.event === 'PLAN_APPROVAL_REQUESTED' || (e.event === 'QUESTION_ASKED' && e.fields?.['Question Type'] === 'plan-approval');

/** Start → end spans summed per name, in first-start order; a start no end closed leaves the row open (FR1.2). */
function spanTracker() {
  const rows = new Map();
  const open = new Map();
  return {
    start(name, ms) {
      if (!name) return;
      if (!rows.has(name)) rows.set(name, { name, ms: null, open: false });
      open.set(name, ms);
    },
    end(name, ms) {
      if (!open.has(name)) return; // a skip without a start, or a second end
      const row = rows.get(name);
      row.ms = (row.ms ?? 0) + ms - open.get(name);
      open.delete(name);
    },
    rows() {
      for (const name of open.keys()) rows.get(name).open = true;
      return [...rows.values()];
    }
  };
}

/**
 * US-0303 FR1.1–FR1.4, FR4.1: one intent's time from its merged audit events (`{timeMs, event, fields}` in time order).
 * Active time is WORKFLOW_STARTED to WORKFLOW_COMPLETED (or the last event while it runs) minus the parked spans.
 * @param {{finished?: boolean}} [opts] finished: intents.json or aidlc-state.md says the workflow is complete
 */
export function intentMetrics(events, { finished: stateFinished = false } = {}) {
  const list = (Array.isArray(events) ? events : []).filter((e) => Number.isFinite(e?.timeMs));
  const phases = spanTracker();
  const stages = spanTracker();
  const stats = new Map(); // stage -> {waitingMs, reviews, rejections}
  const stat = (name) => {
    if (!stats.has(name)) stats.set(name, { waitingMs: 0, reviews: 0, rejections: 0 });
    return stats.get(name);
  };
  const gateAsk = new Map();
  const planAsk = new Map();
  const wait = (asks, name, ms) => {
    if (!asks.has(name)) return;
    stat(name).waitingMs += ms - asks.get(name);
    asks.delete(name);
  };
  let start = null;
  let completed = null;
  let parkedAt = null;
  let parkedMs = 0;

  for (const e of list) {
    const stage = e.fields?.Stage;
    switch (e.event) {
      case 'WORKFLOW_STARTED':
        start ??= e.timeMs;
        break;
      case 'WORKFLOW_COMPLETED':
        completed ??= e.timeMs;
        break;
      case 'WORKFLOW_PARKED':
        parkedAt ??= e.timeMs;
        break;
      case 'WORKFLOW_UNPARKED':
        if (parkedAt !== null) parkedMs += e.timeMs - parkedAt;
        parkedAt = null;
        break;
      case 'PHASE_STARTED':
        phases.start(e.fields?.Phase, e.timeMs);
        break;
      case 'PHASE_COMPLETED':
      case 'PHASE_SKIPPED':
        phases.end(e.fields?.['From phase'] ?? e.fields?.Phase, e.timeMs);
        break;
      case 'STAGE_STARTED':
        stages.start(stage, e.timeMs);
        break;
      case 'STAGE_COMPLETED':
      case 'STAGE_SKIPPED':
        stages.end(stage, e.timeMs);
        break;
      case 'STAGE_AWAITING_APPROVAL':
        if (stage) gateAsk.set(stage, e.timeMs);
        break;
      case 'REVIEW_COMPLETED':
        if (stage) stat(stage).reviews += 1;
        break;
      default:
        if (isPlanAsk(e) && stage) planAsk.set(stage, e.timeMs);
    }
    if (GATE_ANSWER.has(e.event) && stage) {
      wait(gateAsk, stage, e.timeMs);
      if (e.event === 'GATE_REJECTED') stat(stage).rejections += 1;
    }
    if (PLAN_ANSWER.has(e.event) && stage) wait(planAsk, stage, e.timeMs);
  }

  const end = completed ?? list.at(-1)?.timeMs ?? null;
  if (parkedAt !== null && end !== null) parkedMs += end - parkedAt; // parked now: until the last event
  const totalMs = start !== null && end !== null ? end - start : null;
  const stageRows = stages.rows();
  for (const name of stats.keys()) if (!stageRows.some((r) => r.name === name)) stageRows.push({ name, ms: null, open: false });
  const zero = { waitingMs: 0, reviews: 0, rejections: 0 };
  const withStats = stageRows.map((r) => ({ ...r, ...zero, ...stats.get(r.name) }));
  const sum = (k) => withStats.reduce((n, r) => n + r[k], 0);
  return {
    startMs: start,
    endMs: end,
    finished: completed !== null || stateFinished,
    totalMs,
    parkedMs,
    activeMs: totalMs === null ? null : totalMs - parkedMs,
    waitingMs: sum('waitingMs'),
    reviews: sum('reviews'),
    rejections: sum('rejections'),
    phases: phases.rows(),
    stages: withStats
  };
}

/** `YYYY-MM-DD` as local midnight, or null. */
function localDay(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() : null;
}

/** A positive span, else null: zero or a missing end is "unknown", never 0 (FR2.2). */
const span = (from, to) => (from != null && to != null && to - from > 0 ? to - from : null);
const versionParts = (v) => v.slice(1).split('.').map(Number);
const byVersion = (a, b) => {
  const [x, y] = [versionParts(a), versionParts(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/**
 * US-0303 FR2.1–FR2.3: one row per story in the feature docs. 🚧 is the start of the earliest intent whose description or
 * folder names the story, else the git 🚧; ✅ is the git ✅; Released is the date of the `vX.Y.Z` tag its marker names.
 * @param {{features: object, intents?: {dirName: string, request: string|null, startMs: number|null}[],
 *   history?: Record<string, {progressMs: number|null, doneMs: number|null}>, tags?: {name: string, date: string|null}[]}} input
 */
export function storyMetrics({ features, intents = [], history = {}, tags = [] }) {
  const tagMs = new Map(tags.map((tag) => [tag.name, localDay(tag.date)]));
  const texts = intents.filter((i) => i.startMs != null).map((i) => ({ text: `${i.request ?? ''} ${i.dirName}`.toUpperCase(), startMs: i.startMs }));
  const stories = (features?.epics ?? []).flatMap((epic) =>
    (epic.parsed?.stories ?? []).map((s) => {
      const named = texts.filter((x) => x.text.includes(s.id)).map((x) => x.startMs);
      const fromIntent = named.length > 0 ? Math.min(...named) : null;
      const git = history[s.id] ?? {};
      const startMs = fromIntent ?? git.progressMs ?? null;
      const doneMs = git.doneMs ?? null;
      const release = RELEASED.exec(s.statusText ?? '')?.[1] ?? null;
      const releasedMs = release ? (tagMs.get(release) ?? null) : null;
      return {
        id: s.id,
        title: s.title,
        epic: epic.id,
        status: s.status,
        startMs,
        startSource: fromIntent != null ? 'intent' : git.progressMs != null ? 'git' : null,
        doneMs,
        release,
        releasedMs,
        toDoneMs: span(startMs, doneMs),
        toReleaseMs: span(startMs, releasedMs)
      };
    })
  );
  const groups = new Map();
  for (const s of stories) if (s.release) groups.set(s.release, [...(groups.get(s.release) ?? []), s.id]);
  const releases = [...groups.keys()].sort(byVersion).map((release) => ({ release, dateMs: tagMs.get(release) ?? null, stories: groups.get(release) }));
  return { stories, releases };
}

const pad = (n) => String(n).padStart(2, '0');

/** US-0303 FR3.1: the ISO week of a time, in local time, e.g. `2026-W47`. */
export function isoWeek(ms) {
  const d = new Date(ms);
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 3);
  const year = thursday.getFullYear();
  const dayOfYear = Math.round((thursday - new Date(year, 0, 1)) / DAY_MS); // round: a DST day is 23 or 25 h
  return `${year}-W${pad(Math.floor(dayOfYear / 7) + 1)}`;
}

const monthOf = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const average = (values) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null);

// ponytail: only periods with something finished get a bucket, so the chart skips empty weeks; fill gaps if the trend misleads.
function buckets(finished, done, keyOf) {
  const map = new Map();
  const bucket = (key) => {
    if (!map.has(key)) map.set(key, { key, intents: 0, stories: 0, active: [] });
    return map.get(key);
  };
  for (const r of finished) {
    const b = bucket(keyOf(r.endMs));
    b.intents += 1;
    if (Number.isFinite(r.activeMs)) b.active.push(r.activeMs);
  }
  for (const s of done) bucket(keyOf(s.doneMs)).stories += 1;
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1)).map(({ active, ...b }) => ({ ...b, avgActiveMs: average(active) }));
}

/**
 * US-0303 FR3.1–FR3.4, FR4.1: finished intents and stories per ISO week and per month (local time), and the average active
 * time of the finished intents. Unfinished intents are left out of the counts and the averages; archived ones count.
 */
export function projectMetrics(rows, stories) {
  const finished = rows.filter((r) => r.finished && Number.isFinite(r.endMs));
  const done = stories.filter((s) => Number.isFinite(s.doneMs));
  return {
    finished: finished.length,
    running: rows.filter((r) => !r.finished).length,
    storiesDone: done.length,
    avgActiveMs: average(finished.map((r) => r.activeMs).filter(Number.isFinite)),
    week: buckets(finished, done, isoWeek),
    month: buckets(finished, done, monthOf)
  };
}
