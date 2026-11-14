// Reads Claude Code's question picker off an agent tab's screen, so the question popup sends a key only to a picker
// that shows the question it answers (EPIC-00 US-0004). Pure: the lines come from the tab's xterm buffer.
// ponytail: matches the picker by its look (a "❯ 1." cursor line); a new Claude Code layout means updating these regexes.

const OPTION = /^\s*(?:[❯›>]\s*)?(\d{1,2})\.\s+(.*\S)\s*$/;
const CURSOR = /^\s*[❯›]\s*\d{1,2}\.\s/;
const DESCRIPTION = /^\s{3,}\S/; // an option's description, indented under it
const RULE = /^\s*[─━-]{3,}\s*$/;
const BOX = /[☐☒✔✓]/g;
const OWN = /^type something/i;

/** The gate's choices, as AI-DLC spells them in the picker (preserved English labels). */
export const GATE_LABELS = ['Approve', 'Request Changes'];

const norm = (s) =>
  String(s ?? '')
    .replace(/^\s*Q\d+:\s*/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.…]+$/, '')
    .trim()
    .toLowerCase();

/** Same label, or the picker cut the label short with "…". */
function sameLabel(logged, shown) {
  const a = norm(logged);
  const b = norm(shown);
  return a === b || (String(shown).trim().endsWith('…') && b.length > 3 && a.startsWith(b));
}

/**
 * The picker at the bottom of the screen, or null when none is shown.
 * @param {string[]} lines the visible rows, top to bottom
 * @returns {{multi: boolean, options: {key: string, label: string}[]}|null}
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
  const options = [];
  for (let i = top; i <= bottom; i++) {
    const m = OPTION.exec(rows[i]);
    if (m) options.push({ key: m[1], label: m[2] });
  }
  if (!options.length || options.some((o, n) => o.key !== String(n + 1))) return null; // not a numbered picker
  // Several questions at once show a row of check boxes (one per question) and Submit.
  const multi = rows.some((l) => (l.match(BOX)?.length ?? 0) >= 2 || /[☐☒✔✓]\s*Submit/.test(l));
  return { multi, options };
}

/**
 * What to type for an answer from the popup, and in which agent tab.
 * @param {{tab: string, lines: string[]}[]} screens the project's agent tabs
 * @param {{kind: 'question'|'gate', options?: string[]}} q the waiting question
 * @param {{index?: number, own?: string}} answer the chosen option (its index in the popup) or an own answer
 * @returns {{tab: string, keys: string[]}|{error: 'noPicker'|'several'|'mismatch'}}
 */
export function resolveAnswer(screens, q, answer) {
  const logged = q.kind === 'gate' ? GATE_LABELS : (q.options ?? []);
  let error = 'noPicker';
  for (const { tab, lines } of screens) {
    const picker = readPicker(lines);
    if (!picker) continue;
    if (picker.multi) { error = 'several'; continue; }
    const shown = picker.options.filter((o) => !OWN.test(o.label));
    const keyOf = (label) => shown.find((o) => sameLabel(label, o.label))?.key;
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
