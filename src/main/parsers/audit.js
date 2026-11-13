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

export function parseAudit(text, source) {
  return String(text ?? '')
    .split(/^---\s*$/m)
    .map((block) => parseBlock(block, source))
    .filter(Boolean);
}

/** Merges shards ({source, text}) into one timeline; Array.sort is stable, so ties keep file order. */
export function mergeAudits(files) {
  return files
    .flatMap((f) => parseAudit(f.text, f.source))
    .sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? ''))
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
