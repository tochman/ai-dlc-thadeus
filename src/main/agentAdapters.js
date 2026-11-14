// US-0506 u1 FR1.1, FR1.2, FR3.2, FR6.2, ADR-003: HarnessEventAdapter (LC3). Pure: turns a harness's raw hook
// payload into the questions of an AgentEvent, and an answer (option indexes) back into what the harness takes.
// It reads only fields it knows and refuses anything else with a reason, never a guess (BR1.4, RD7). Agent text is
// passed through as JSON.parse decoded it, never trimmed, normalised or re-encoded; only the 64 KB cut applies (BR2.6).
import { cleanLine } from '../shared/agentText.js';

export const MAX_TEXT_BYTES = 65_536;
const MAX_QUESTIONS = 4;
const DOWN = '\x1b[B';
const ENTER = '\r';

/** US-0506 u1 SCD1: cut at `max` bytes of UTF-8 without splitting a character. */
export function cutUtf8(text, max = MAX_TEXT_BYTES) {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= max) return { text, truncated: false };
  let end = max;
  while (end > 0 && (buf[end] & 0xc0) === 0x80) end--; // step back off continuation bytes
  return { text: buf.subarray(0, end).toString('utf8'), truncated: true };
}

function parseJson(body) {
  try {
    return JSON.parse(Buffer.isBuffer(body) ? body.toString('utf8') : String(body));
  } catch {
    return undefined;
  }
}

const isText = (v) => typeof v === 'string' && v.length > 0;

/**
 * The one question normaliser for both harnesses: `raw` is the harness's list, `multiKey` its multi-select field.
 * @returns {{questions: object[]}|{reason: string, text?: string}}
 */
function normalise(raw, multiKey) {
  if (!Array.isArray(raw) || raw.length === 0) return { reason: 'no questions' };
  if (raw.length > MAX_QUESTIONS) return { reason: `more than ${MAX_QUESTIONS} questions` };
  const questions = [];
  for (const q of raw) {
    if (!isText(q?.question)) return { reason: 'a question without text' };
    if (!Array.isArray(q.options) || q.options.some((o) => !isText(o?.label))) return { reason: 'an option without a label', text: q.question };
    questions.push({
      header: isText(q.header) ? q.header : null,
      ...cutUtf8(q.question),
      options: q.options.map((o) => ({ label: o.label, description: isText(o.description) ? o.description : null })),
      multiSelect: q[multiKey] === true,
      allowOwn: q.custom !== false // both pickers offer an own answer unless the payload says otherwise
    });
  }
  return { questions };
}

/** The labels or own text for question `i` of `answer` ({ picks: [[index]], own: [text|null] }), in the options' order. */
function chosen(event, answer, i) {
  const own = answer.own?.[i];
  if (typeof own === 'string' && own.length > 0) return { own };
  const picks = [...(answer.picks?.[i] ?? [])].sort((a, b) => a - b);
  return { labels: picks.map((n) => event.questions[i].options[n].label) };
}

/** The one picked option index of a single-question answer, or null when there is not exactly one. */
const pickedIndex = (answer) => (answer.picks?.[0]?.length === 1 ? answer.picks[0][0] : null);
const single = (event, answer) => (event.questions.length === 1 && !event.questions[0].multiSelect ? chosen(event, answer, 0) : null);

const claude = {
  /** Claude Code hook stdin: PreToolUse (kind question) or PostToolUse (kind answered) for AskUserQuestion. */
  parse(kind, body) {
    if (kind === 'answered') return { ok: true, kind, toolCallId: parseJson(body)?.tool_use_id ?? null };
    if (kind !== 'question') return null; // unknown kinds are ignored (C1 ownership rules)
    const payload = parseJson(body);
    if (payload === undefined) return { ok: false, reason: 'not JSON' };
    const result = normalise(payload?.tool_input?.questions, 'multiSelect');
    if (result.reason) return { ok: false, ...result };
    return { ok: true, kind, toolCallId: payload.tool_use_id ?? null, questions: result.questions, input: payload.tool_input };
  },
  /** PreToolUse output: allow, with updatedInput holding the questions and answers keyed by each full question text. */
  answerText(event, answer) {
    const answers = {};
    event.input.questions.forEach((q, i) => {
      const c = chosen(event, answer, i);
      answers[q.question] = c.own ?? c.labels.join(', ');
    });
    return JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow', updatedInput: { ...event.input, answers } }
    });
  },
  // ponytail: keys are built only for one single-select question (a pick, or an own answer). Claude Code's key
  // sequences for batch tabs and checkboxes are not documented, and a guessed sequence could pick the wrong option
  // (NFR2). Upgrade path: record the picker's key sequence for tabs and checkboxes in the manual run, then add them.
  keys(event, answer) {
    const c = single(event, answer);
    if (!c) return null;
    const n = event.questions[0].options.length;
    if (c.own) return n + 1 <= 9 ? `${n + 1}${cleanLine(c.own)}${ENTER}` : null;
    const i = pickedIndex(answer);
    return i !== null && i < 9 ? String(i + 1) : null; // the position itself, never a label search (review fix 2)
  },
  pickerLabel: (event) => event.questions[0]?.options[0]?.label ?? null
};

const opencode = {
  /** The opencode plugin's form events: form.created (kind question), form.replied or form.cancelled (kind answered). */
  parse(kind, body) {
    if (kind === 'answered') return { ok: true, kind, toolCallId: parseJson(body)?.properties?.formID ?? null };
    if (kind !== 'question') return null;
    const payload = parseJson(body);
    if (payload === undefined) return { ok: false, reason: 'not JSON' };
    const result = normalise(payload?.properties?.questions, 'multiple');
    if (result.reason) return { ok: false, ...result };
    return { ok: true, kind, toolCallId: payload.properties.formID ?? null, questions: result.questions, input: payload.properties };
  },
  /** The form answer the plugin passes to session.form.reply: { q0: label | [labels] | own text, ... }. */
  answerText(event, answer) {
    const out = {};
    event.questions.forEach((q, i) => {
      const c = chosen(event, answer, i);
      out[`q${i}`] = c.own ?? (q.multiSelect ? c.labels : c.labels[0]);
    });
    return JSON.stringify(out);
  },
  // ponytail: as for Claude Code, one single-select pick only; opencode's own-answer row has no confirmed key sequence.
  keys(event, answer) {
    const c = single(event, answer);
    const i = pickedIndex(answer);
    if (!c || c.own || i === null) return null;
    return `${DOWN.repeat(i)}${ENTER}`;
  },
  pickerLabel: claude.pickerLabel
};

export const adapters = { claude, opencode };
