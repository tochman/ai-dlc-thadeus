// Reads Claude Code's question picker off an agent tab's screen, so the question popup sends a key only to a picker
// that shows the question it answers (EPIC-00 US-0004, US-0006). Pure: the lines come from the tab's xterm buffer.
// ponytail: matches the picker by its look (a "❯ 1." cursor line); a new Claude Code layout means updating these regexes.
// The layout is the one in tests/fixtures/picker/ (header chip, cursor row, indented descriptions, a rule before
// "Chat about this", the key hint last).

const OPTION = /^\s*(?:[❯›>]\s*)?(\d{1,2})\.\s+(.*\S)\s*$/;
const CURSOR = /^\s*[❯›]\s*\d{1,2}\.\s/;
const DESCRIPTION = /^\s{3,}\S/; // an option's description (or its wrapped label), indented under it
const RULE = /^\s*[─━-]{3,}\s*$/;
const BOX = /[□■☐☑☒✔✓]/g; // header chips: one per question, □ (U+25A1) is what Claude Code draws
const SUBMIT = /[□■☐☑☒✔✓]\s*Submit/;
const OWN = /^type something/i;
/** Rows under the picker (its key hint, a status line) before it no longer counts as the thing on screen. */
const TAIL = 3;

/** The gate's choices, as AI-DLC spells them in the picker (preserved English labels). */
export const GATE_LABELS = ['Approve', 'Request Changes'];

/** How long an answer waits for its picker to be drawn: the popup opens on the audit row, before Claude Code draws it. */
export const PICKER_WAIT_MS = 3000;

const norm = (s) =>
  String(s ?? '')
    .replace(/^\s*Q\d+:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.…]+$/, '')
    .trim()
    .toLowerCase();

/** Without a letter prefix ("A. ") or a trailing description in parentheses: AI-DLC logs either way. */
const loose = (s) => norm(s).replace(/^[a-z]\.\s+/, '').replace(/\s*\([^()]*\)$/, '').trim();

/** Same label, said with or without "A. " or "(…)", cut short with "…", or wrapped onto the rows under it. */
function sameLabel(logged, option) {
  const a = norm(logged);
  const la = loose(logged);
  const shown = [option.label];
  for (const row of option.detail ?? []) shown.push(`${shown.at(-1)} ${row}`);
  return shown.some((text) => {
    const b = norm(text);
    return a === b || (la !== '' && la === loose(text)) || (String(text).trim().endsWith('…') && b.length > 3 && a.startsWith(b));
  });
}

/**
 * The picker at the bottom of the screen, or null when none is shown.
 * @param {string[]} lines the rows, top to bottom (the bottom rows are what the terminal shows now)
 * @returns {{multi: boolean, options: {key: string, label: string, detail: string[]}[]}|null}
 */
export function readPicker(lines) {
  const rows = (lines ?? []).map((l) => String(l ?? ''));
  let c = -1;
  for (let i = rows.length - 1; i >= 0; i--) if (CURSOR.test(rows[i])) { c = i; break; }
  if (c === -1) return null;
  const part = (l) => OPTION.test(l) || DESCRIPTION.test(l) || RULE.test(l) || !l.trim();
  let top = c;
  while (top > 0 && part(rows[top - 1])) top--;
  let bottom = c;
  while (bottom < rows.length - 1 && part(rows[bottom + 1])) bottom++;
  // An old picker in the scrollback, with newer output under it, is not on screen.
  if (rows.slice(bottom + 1).filter((l) => l.trim()).length > TAIL) return null;
  const options = [];
  for (let i = top; i <= bottom; i++) {
    const m = OPTION.exec(rows[i]);
    if (m) options.push({ key: m[1], label: m[2], detail: [] });
    else if (options.length && DESCRIPTION.test(rows[i])) options.at(-1).detail.push(rows[i].trim());
  }
  if (!options.length || options.some((o, n) => o.key !== String(n + 1))) return null; // not a numbered picker
  // Several questions at once show a header with a chip per question and Submit, above the question, under a rule.
  let head = top - 1;
  while (head > 0 && !RULE.test(rows[head])) head--;
  const header = rows.slice(Math.max(0, head), top);
  const multi = header.some((l) => (l.match(BOX)?.length ?? 0) >= 2 || SUBMIT.test(l));
  return { multi, options };
}

/**
 * What to type for an answer from the popup, and in which agent tab.
 * @param {{tab: string, lines: string[]}[]} screens the project's agent tabs
 * @param {{kind: 'question'|'gate', options?: string[], batch?: object[]|null}} q the waiting question
 * @param {{index?: number, own?: string}} answer the chosen option (its index in the popup) or an own answer
 * @returns {{tab: string, keys: string[]}|{error: 'noPicker'|'several'|'mismatch'}}
 */
export function resolveAnswer(screens, q, answer) {
  if (q.batch?.length) return { error: 'several' }; // a batch is answered in the terminal (US-0006)
  const logged = q.kind === 'gate' ? GATE_LABELS : (q.options ?? []);
  let error = 'noPicker';
  for (const { tab, lines } of screens) {
    const picker = readPicker(lines);
    if (!picker) continue;
    if (picker.multi) { error = 'several'; continue; }
    const shown = picker.options.filter((o) => !OWN.test(o.label));
    const keyOf = (label) => shown.find((o) => sameLabel(label, o))?.key;
    // Every logged option must be in the picker: otherwise it asks something else, or says it differently.
    if (!logged.length || logged.some((l) => !keyOf(l))) { if (error === 'noPicker') error = 'mismatch'; continue; }
    if (answer.own !== undefined) {
      const own = picker.options.find((o) => OWN.test(o.label));
      if (!own) return { error: 'mismatch' };
      return { tab, keys: [own.key, `${answer.own}\r`] };
    }
    const key = keyOf(logged[answer.index]);
    return key ? { tab, keys: [key] } : { error: 'mismatch' };
  }
  return { error };
}

/**
 * resolveAnswer, read again every `stepMs` while no picker is on screen yet, for at most `waitMs`.
 * @param {() => {tab: string, lines: string[]}[]} read the agent tabs' screens now
 * @returns {Promise<{found: ReturnType<typeof resolveAnswer>, screens: {tab: string, lines: string[]}[]}>}
 */
export async function waitForAnswer(read, q, answer, { waitMs = PICKER_WAIT_MS, stepMs = 150 } = {}) {
  const until = Date.now() + waitMs;
  for (;;) {
    const screens = read();
    const found = resolveAnswer(screens, q, answer);
    if (found.error !== 'noPicker' || Date.now() >= until) return { found, screens };
    await new Promise((resolve) => setTimeout(resolve, stepMs));
  }
}
