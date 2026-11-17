// US-0506 u1 FR1.1, FR1.2, FR3.2, FR6.2, ADR-003: HarnessEventAdapter (LC3). Pure: turns a harness's raw hook
// payload into the questions of an AgentEvent, and an answer (option indexes) back into what the harness takes.
// It reads only fields it knows and refuses anything else with a reason, never a guess (BR1.4, RD7). Agent text is
// passed through as JSON.parse decoded it, never trimmed, normalised or re-encoded; only the 64 KB cut applies (BR2.6).
//
// US-0506 u2 BR5.1–BR5.5, BR5.8, SD9, SD11, SD12: the permission part. `parse('permission', …)` gives the event's
// `permission` (what, detail, cwd, truncated, choices) and `alwaysRules`, which stays in main (SD11). Agent text is
// cut first, then shown through visibleText, so a control or bidi character is seen as its escape (SCD8, SD9).
// `permissionAnswer` builds the hook output (Claude Code) or the decision word (opencode) for one choice.
import { cleanLine, visibleText } from '../shared/agentText.js';
import { t } from '../shared/i18n.js';
import { opencodeContext } from './contextSize.js';

export const MAX_TEXT_BYTES = 65_536;
/** SD12: the fixed reason Claude Code gets with a deny; never agent text. */
export const DENY_MESSAGE = 'The person denied this in the app.';
const MAX_WHAT = 200; // code points
const MAX_CWD_BYTES = 4096;
const RULE_CAPS = { lines: 8, line: 256, total: 1024 }; // code points, before escaping (SD11)
const DECISION = { allowOnce: 'once', allowAlways: 'always', deny: 'reject' };
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

// --- Permissions (u2) -------------------------------------------------------------------------------------------------

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const onlyKeys = (obj, allowed) => Object.keys(obj).every((k) => allowed.includes(k));
const isTextList = (v) => Array.isArray(v) && v.length > 0 && v.every(isText);

/** SCD8: one text cut to its cap, then made visible; `cut` says whether anything was dropped. */
function capText(text, { bytes, points, multiline = false }) {
  let s = String(text);
  let cut = false;
  if (points !== undefined) {
    const all = Array.from(s);
    cut = all.length > points;
    if (cut) s = all.slice(0, points).join('');
  } else {
    ({ text: s, truncated: cut } = cutUtf8(s, bytes));
  }
  return { text: visibleText(s, { multiline }), cut };
}

/**
 * SD11: the lines Allow always shows, or null when it may not be offered. Every Claude Code suggestion must be a
 * shape whose whole effect can be put in words.
 * ponytail: an unknown key or type drops the dialog's Allow always (the terminal still offers it) until the fixture
 * is re-recorded for the newer Claude Code; widen the allowed keys only from a recorded payload.
 */
function suggestionLines(suggestions) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) return null;
  const lines = [];
  for (const s of suggestions) {
    if (!isObject(s) || !isText(s.destination)) return null;
    if (
      s.type === 'addRules' &&
      s.behavior === 'allow' &&
      onlyKeys(s, ['type', 'rules', 'behavior', 'destination']) &&
      Array.isArray(s.rules) &&
      s.rules.length
    ) {
      for (const r of s.rules) {
        if (!isObject(r) || !isText(r.toolName) || !onlyKeys(r, ['toolName', 'ruleContent'])) return null;
        if (r.ruleContent !== undefined && !isText(r.ruleContent)) return null;
        lines.push(r.ruleContent === undefined ? `${s.destination}: ${r.toolName}` : `${s.destination}: ${r.toolName}(${r.ruleContent})`);
      }
    } else if (s.type === 'addDirectories' && onlyKeys(s, ['type', 'directories', 'destination']) && isTextList(s.directories)) {
      for (const d of s.directories) lines.push(`${s.destination}: ${d}`);
    } else return null;
  }
  return lines;
}

/** SD11 caps on the raw lines: whole, or not at all. */
function capLines(lines) {
  const sizes = lines.map((l) => Array.from(l).length);
  return lines.length <= RULE_CAPS.lines && sizes.every((n) => n <= RULE_CAPS.line) && sizes.reduce((a, b) => a + b, 0) <= RULE_CAPS.total;
}

/**
 * BR5.3: the agent's own choices in its order. `lines` is null when Allow always is not offered at all.
 * ponytail: labels are built in main in the current language (K3); a language switch while a permission is open keeps
 * the old language on that page until the next event. Rebuild the labels on a `language` change if that matters.
 */
function permissionOf({ what, detail, cwd, lines, denyKey }) {
  const w = capText(what, { points: MAX_WHAT });
  const d = capText(detail, { bytes: MAX_TEXT_BYTES, multiline: true });
  const c = cwd === null ? { text: null, cut: false } : capText(cwd, { bytes: MAX_CWD_BYTES });
  const truncated = w.cut || d.cut || c.cut;
  const choices = [{ label: t('agentDialog.permission.allowOnce'), effect: 'allowOnce', refuses: false, enabled: !truncated }];
  if (lines) {
    const fits = capLines(lines);
    choices.push({
      label: fits
        ? t('agentDialog.permission.allowAlways', { rules: lines.map((l) => visibleText(l)).join('\n') })
        : t('agentDialog.permission.allowAlwaysBare'),
      effect: 'allowAlways',
      refuses: false,
      enabled: fits && !truncated
    });
  }
  choices.push({ label: t(`agentDialog.permission.${denyKey}`), effect: 'deny', refuses: true, enabled: true });
  return { what: w.text, detail: d.text, cwd: c.text, truncated, choices };
}

/** Claude Code PermissionRequest stdin (BR5.1). */
function parseClaudePermission(body) {
  const p = parseJson(body);
  if (p === undefined) return { ok: false, reason: 'not JSON' };
  if (!isText(p?.tool_name)) return { ok: false, reason: 'no tool name' };
  if (p.tool_name === 'AskUserQuestion') return { ok: false, reason: 'question tool' }; // u1 handles it (RD11)
  const input = p.tool_input;
  if (!isObject(input)) return { ok: false, reason: 'tool input not an object', text: p.tool_name };
  const detail = typeof input.command === 'string' ? input.command : typeof input.file_path === 'string' ? input.file_path : JSON.stringify(input, null, 2);
  const lines = suggestionLines(p.permission_suggestions);
  return {
    ok: true,
    kind: 'permission',
    toolCallId: p.tool_use_id ?? null,
    permission: permissionOf({ what: p.tool_name, detail, cwd: typeof p.cwd === 'string' ? p.cwd : null, lines, denyKey: 'deny' }),
    alwaysRules: lines ? p.permission_suggestions : null // the parsed value itself, never rebuilt (SD11)
  };
}

/** opencode permission.asked (BR5.2, Q1 A). */
function parseOpencodePermission(body) {
  const payload = parseJson(body);
  if (payload === undefined) return { ok: false, reason: 'not JSON' };
  const p = payload?.properties;
  if (!isText(p?.requestID)) return { ok: false, reason: 'no request id' };
  if (!isText(p.sessionID)) return { ok: false, reason: 'no session id' };
  if (!isText(p.permission)) return { ok: false, reason: 'no permission type' };
  const command = p.metadata?.command;
  const detail = typeof command === 'string' ? command : isTextList(p.patterns) ? p.patterns.join('\n') : null;
  if (detail === null) return { ok: false, reason: 'no command or patterns', text: p.permission };
  const lines = isTextList(p.always) ? p.always.map((a) => `${p.permission}: ${a}`) : null;
  return {
    ok: true,
    kind: 'permission',
    toolCallId: p.requestID,
    permission: permissionOf({ what: p.permission, detail, cwd: null, lines, denyKey: 'reject' }),
    alwaysRules: lines ? p.always : null
  };
}

/** The effect of choice `i` of a permission event. */
const effectOf = (event, i) => event.permission.choices[i].effect;
/** US-0506 u3 BR6.3, SCD7, NFR2.6: the reply message, cut at 64 KB; an empty message is still a reply. */
const message = (text) => ({ ...cutUtf8(text), empty: text.trim() === '' });
const NO_MESSAGE = { ok: false, reason: 'no last message' };

/**
 * US-0506 u3 SD12, PD13: Claude Code's Stop stdin. The adapter reads no file. US-0213 FR1.1, FR5.1: it passes on the
 * transcript path (main reads the context size from it) and whether `background_tasks` is non-empty (null when absent).
 */
function claudeReply(body) {
  const payload = parseJson(body);
  if (payload === undefined) return { ok: false, reason: 'not JSON' };
  const text = payload?.last_assistant_message;
  if (typeof text !== 'string') return NO_MESSAGE;
  const tasks = payload.background_tasks;
  const signals = {
    transcriptPath: isText(payload.transcript_path) ? payload.transcript_path : null,
    backgroundTasks: Array.isArray(tasks) ? tasks.length > 0 : null
  };
  return { ok: true, kind: 'reply', message: message(text), signals };
}

// --- Handoff signals (US-0213) ---------------------------------------------------------------------------------------
const SOURCES = new Set(['startup', 'resume', 'clear', 'compact']);
const TRIGGERS = new Set(['manual', 'auto']);
const MAX_SIGNAL = 64; // a notification type longer than this is not one Claude Code sends
const known = (v, set) => (set.has(v) ? v : null);

/** US-0213 FR1.3, FR1.5, FR4.2, FR8.1: SessionStart, Notification, PreCompact, PostCompact. Never the message or summary. */
function claudeSignal(kind, body) {
  const p = parseJson(body);
  if (p === undefined || !isObject(p)) return { ok: false, reason: 'not JSON' };
  if (kind === 'session') return { ok: true, kind, source: known(p.source, SOURCES) };
  if (kind === 'notify') return { ok: true, kind, type: isText(p.notification_type) && p.notification_type.length <= MAX_SIGNAL ? p.notification_type : null };
  return { ok: true, kind, trigger: known(p.trigger, TRIGGERS) };
}

/** US-0213: the opencode plugin's V2 envelope { type, data } or the older { properties }. */
function opencodeSignal(kind, body) {
  const p = parseJson(body);
  if (p === undefined || !isObject(p)) return { ok: false, reason: 'not JSON' };
  const d = isObject(p.data) ? p.data : isObject(p.properties) ? p.properties : {};
  if (kind === 'session') return { ok: true, kind, source: 'startup' }; // the plugin reports main sessions only
  if (kind === 'status') return { ok: true, kind, busy: isObject(d.status) && d.status.type !== 'idle' };
  if (kind === 'usage') return { ok: true, kind, context: opencodeContext(d) };
  return { ok: true, kind: 'postcompact', trigger: null };
}

/**
 * US-0506 u3 AC3.1.4: the plugin's { event, context } body; the text parts of the last assistant message, joined
 * with a blank line. ponytail: the context shape is provisional (K12) until the NFR2.5 manual run records it.
 */
function opencodeReply(body) {
  const payload = parseJson(body);
  if (payload === undefined) return { ok: false, reason: 'not JSON' };
  const messages = Array.isArray(payload?.context?.messages) ? payload.context.messages : [];
  const last = messages.findLast((m) => m?.info?.role === 'assistant');
  if (!last || !Array.isArray(last.parts)) return NO_MESSAGE;
  const text = last.parts
    .filter((p) => p?.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('\n\n');
  return { ok: true, kind: 'reply', message: message(text) };
}

/** US-0213: the report-only kinds; they never open a dialog page (agentEvents keeps them as session signals). */
export const SIGNAL_KINDS = new Set(['session', 'notify', 'precompact', 'postcompact', 'status', 'usage']);
const CLAUDE_SIGNALS = new Set(['session', 'notify', 'precompact', 'postcompact']);
const OPENCODE_SIGNALS = new Set(['session', 'status', 'usage', 'postcompact']);

const claude = {
  /** Claude Code hook stdin: PreToolUse (kind question) or PostToolUse (kind answered) for AskUserQuestion. */
  parse(kind, body) {
    if (kind === 'reply') return claudeReply(body);
    if (CLAUDE_SIGNALS.has(kind)) return claudeSignal(kind, body);
    if (kind === 'answered') return { ok: true, kind, toolCallId: parseJson(body)?.tool_use_id ?? null };
    if (kind === 'permission') return parseClaudePermission(body);
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
  /** BR5.8, SD12: PermissionRequest output for choice `i`; allow always carries `alwaysRules` unchanged. No updatedInput. */
  permissionAnswer(event, i, alwaysRules) {
    const effect = effectOf(event, i);
    const decision =
      effect === 'deny'
        ? { behavior: 'deny', interrupt: true, message: DENY_MESSAGE }
        : effect === 'allowAlways'
          ? { behavior: 'allow', updatedPermissions: alwaysRules }
          : { behavior: 'allow' };
    return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PermissionRequest', decision } });
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
    if (kind === 'answered') {
      const p = parseJson(body)?.properties;
      return { ok: true, kind, toolCallId: p?.requestID ?? p?.formID ?? null }; // permission.replied, or a form event
    }
    if (kind === 'permission') return parseOpencodePermission(body);
    if (kind === 'reply') return opencodeReply(body);
    if (OPENCODE_SIGNALS.has(kind)) return opencodeSignal(kind, body);
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
  /** BR5.8: the answer file holds the decision word only; the plugin passes it to ctx.permission.reply. */
  permissionAnswer: (event, i) => DECISION[effectOf(event, i)],
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
