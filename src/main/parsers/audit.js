// Parses audit/*.md shards: `## Title` blocks of `**Key**: value` lines separated
// by `---`. Every block with a title or a field is kept, whatever its event type.

const FIELD = /^\*\*(.+?)\*\*:\s?(.*)$/;
const TITLE = /^##\s+(.+?)\s*$/;

export const NOISY_EVENTS = new Set(['GUARD_DISABLED', 'SENSOR_PASSED', 'SENSOR_FIRED', 'GUARD_STOOD_ASIDE']);

function parseBlock(block, source) {
  let title = null;
  const fields = {};
  let lastKey = null;
  for (const raw of block.split(/\r?\n/)) {
    const line = raw.trimEnd();
    let m;
    if ((m = TITLE.exec(line))) {
      title = m[1];
      lastKey = null;
    } else if ((m = FIELD.exec(line))) {
      lastKey = m[1];
      fields[lastKey] = m[2];
    } else if (lastKey && line.trim() !== '') {
      fields[lastKey] += `\n${line}`; // continuation of a multi-line value
    }
  }
  if (!title && Object.keys(fields).length === 0) return null;
  const { Timestamp: timestamp = null, Event: event = null, ...rest } = fields;
  return { timestamp, event, title, fields: rest, source };
}

/** Each kept block gets `index` (file order) and a stable `key` `<source>#<index>`; shards only grow at the end. */
export function parseAudit(text, source) {
  return String(text ?? '')
    .split(/^---\s*$/m)
    .map((block) => parseBlock(block, source))
    .filter(Boolean)
    .map((e, index) => ({ ...e, index, key: `${source}#${index}` }));
}

/** Parsed time per event; one without a valid timestamp inherits its predecessor's in the same file. */
function withTimes(events) {
  let prev = -Infinity;
  return events.map((e) => {
    const t = Date.parse(e.timestamp ?? '');
    if (!Number.isNaN(t)) prev = t;
    return { ...e, timeMs: prev };
  });
}

const bySource = (a, b) => (a.source < b.source ? -1 : a.source > b.source ? 1 : 0);

/** Merges shards ({source, text}) into one timeline, by parsed time, then source, then block index. */
export function mergeAudits(files) {
  return files
    .flatMap((f) => withTimes(parseAudit(f.text, f.source)))
    .sort((a, b) => a.timeMs - b.timeMs || bySource(a, b) || a.index - b.index)
    .map((e, seq) => ({ ...e, seq }));
}

export function categoryOf(event) {
  const e = String(event ?? '').toUpperCase();
  if (e.includes('ERROR') || e.endsWith('_FAILED')) return 'error';
  if (e.startsWith('GATE_') || e.includes('APPROV')) return 'gate';
  if (e.startsWith('SUBAGENT_')) return 'subagent';
  if (e.startsWith('UNIT_')) return 'unit';
  if (e.startsWith('GUARD_') || e.startsWith('SENSOR_')) return 'guard';
  if (e.startsWith('HUMAN_') || e.startsWith('QUESTION_') || e.startsWith('DECISION_')) return 'human';
  if (e.startsWith('STAGE_') || e.startsWith('PHASE_') || e.startsWith('WORKFLOW_')) return 'stage';
  return 'other';
}
