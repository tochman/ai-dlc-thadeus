// US-1305 FR1, NFR2: an intent's quality signals, pure (no I/O). The caller reads the audit events, the intent's
// construction/build-and-test/test-results.md and its reviews/review-NN.md files; a part whose source is missing is null
// ("no record", FR1.7), never 0.

const OPEN_VERDICT = /^(not met|unverified)$/i;
const FIXED_STATUS = /\b(fixed|resolved)\b/i;
const POST_MERGE = /^#{1,6}\s+(after merge with main|efter merge med main)\b/gim;

/** The lines under the H2 (or deeper) heading whose text matches `title`, up to the next heading of that level or higher. */
function sections(text, title) {
  const out = [];
  let current = null;
  let level = 0;
  for (const line of text.split('\n')) {
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h && current && h[1].length <= level) current = null;
    if (h && !current && title.test(h[2])) {
      current = [];
      level = h[1].length;
      out.push(current);
      continue;
    }
    current?.push(line);
  }
  return out;
}

const cells = (line) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

/** A Markdown table's body rows as objects keyed by the lower-cased header; rows with the wrong cell count are skipped. */
function tableRows(lines) {
  const rows = lines.filter((l) => l.trim().startsWith('|'));
  if (rows.length < 2) return [];
  const head = cells(rows[0]).map((h) => h.toLowerCase());
  return rows
    .slice(1)
    .map(cells)
    .filter((c) => c.length === head.length && !c.every((x) => /^:?-+:?$/.test(x)))
    .map((c) => Object.fromEntries(head.map((h, i) => [h, c[i]])));
}

function revisionsOf(events) {
  const byStage = {};
  for (const e of events) {
    if (e.event !== 'GATE_REJECTED') continue;
    const stage = e.fields?.Stage ?? '';
    byStage[stage] = (byStage[stage] ?? 0) + 1;
  }
  return { total: Object.values(byStage).reduce((n, x) => n + x, 0), byStage };
}

function findingsOf(reviews) {
  if (!reviews?.length) return null;
  const out = { bySeverity: {}, open: 0, fixed: 0 };
  for (const text of reviews) {
    for (const row of sections(text, /^findings$/i).flatMap(tableRows)) {
      if (row.severity) out.bySeverity[row.severity] = (out.bySeverity[row.severity] ?? 0) + 1;
      if (FIXED_STATUS.test(row.status ?? '')) out.fixed += 1;
      else out.open += 1;
    }
  }
  return out;
}

function testResultsOf(text, events) {
  if (text == null) return { loopBacks: null, failedRuns: null, postMerge: null };
  const loopBacks = sections(text, /^loop-back log$/i)
    .flat()
    .filter((l) => /^###\s+loop-back\b/i.test(l)).length;
  const matrix = sections(text, /target verification matrix/i).at(-1) ?? [];
  const openVerdict = tableRows(matrix).some((r) => OPEN_VERDICT.test(r.verdict ?? ''));
  const sensorFailed = events.filter((e) => e.event === 'SENSOR_FAILED').length;
  return { loopBacks, failedRuns: loopBacks + (openVerdict ? 1 : 0) + sensorFailed, postMerge: (text.match(POST_MERGE) ?? []).length };
}

/**
 * US-1305 FR1.1–FR1.7: revision cycles per stage, loop-backs, review findings, failed test runs, post-merge findings and
 * the trouble count (the sum of the parts that have a source).
 * ponytail: failed runs need test-results.md; SENSOR_FAILED alone, without it, is "no record". Count it on its own if asked.
 * @param {{events?: object[], testResults?: string|null, reviews?: string[]|null}} input
 */
export function qualityOf({ events, testResults, reviews }) {
  const list = events ?? [];
  const revisions = revisionsOf(list);
  const findings = findingsOf(reviews);
  const tr = testResultsOf(testResults ?? null, list);
  const trouble = revisions.total + (tr.loopBacks ?? 0) + (findings?.open ?? 0) + (tr.failedRuns ?? 0) + (tr.postMerge ?? 0);
  return { revisions, ...tr, findings, trouble };
}
