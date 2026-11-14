// US-0506 u1 (u3 LC12, u5 amendment 2): the one sanitizer for agent text shown as plain text, in main and the
// renderer. No other file holds its own pattern for unsafe characters, and no exported pattern carries the g flag.
//
// The class: \p{Cc} (C0, DEL, C1), \p{Cf} (bidi controls, zero-width characters, BOM, soft hyphen, tags),
// \p{Cs} (a lone surrogate), \p{Zl} and \p{Zp} (U+2028, U+2029) and the whole tag block U+E0000 to U+E007F.
// The source holds no invisible character itself: the code points are built with String.fromCodePoint.
// ponytail: emoji tag-sequence flags (a black flag with tag characters) lose their tags and show as a black flag;
// keep the tags only if those flags must render, at the cost of an exception for the tag block like the one for ZWJ.

const ZWJ = String.fromCodePoint(0x200d);
const TAGS = `${String.fromCodePoint(0xe0000)}-${String.fromCodePoint(0xe007f)}`;
const SET = String.raw`\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}` + TAGS;

/** Fresh global pattern per call, used only inside replace, so no lastIndex is ever shared. */
const every = () => new RegExp(`[${SET}]`, 'gu');

/** True when `s` holds an unsafe character other than ZWJ. Non-global, so repeated .test() calls agree. */
export const UNSAFE = new RegExp(`(?!${ZWJ})[${SET}]`, 'u');

/** One line: CR, LF, TAB, U+2028 and U+2029 become a space; every other unsafe character except ZWJ is removed. */
export const cleanLine = (s) =>
  String(s)
    .replace(/[\r\n\t\p{Zl}\p{Zp}]/gu, ' ')
    .replace(every(), (c) => (c === ZWJ ? c : ''));

/**
 * A Markdown body (u1 review fix 4): CRLF and CR become LF; LF, TAB and ZWJ stay; every other unsafe character is
 * removed, so a bidi override or a zero-width character in the agent's question cannot disguise what it says.
 */
export const cleanBody = (s) =>
  String(s)
    .replace(/\r\n?/g, '\n')
    .replace(every(), (c) => (c === ZWJ || c === '\n' || c === '\t' ? c : ''));

/** cleanLine, then whitespace runs become one space, trimmed. */
export const stripUnsafe = (s) => cleanLine(s).replace(/\s+/gu, ' ').trim();

const escapeChar = (ch) => {
  const cp = ch.codePointAt(0);
  return cp > 0xffff ? `\\u{${cp.toString(16)}}` : `\\u${cp.toString(16).padStart(4, '0')}`;
};

/** Every unsafe character (ZWJ included) shown as a backslash-u escape; with multiline, LF and TAB stay. Display only. */
export function visibleText(s, { multiline = false } = {}) {
  return String(s).replace(every(), (ch) => (multiline && (ch === '\n' || ch === '\t') ? ch : escapeChar(ch)));
}

/** Markdown markers dropped, a link or image reduced to its label: one line of plain text. */
export function plainLine(s) {
  return String(s)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*(?:#{1,6}\s+|>\s*|[-*+]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/, '')
    .replace(/(\*\*|__|~~|[*_`])/g, '')
    .trim();
}

/** The first line that is neither empty nor only a code fence. */
export function firstLine(s) {
  return (
    String(s)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line && !/^(```|~~~)/.test(line)) ?? ''
  );
}

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

/** At most `n` grapheme clusters, plus an ellipsis when something was cut. */
export function cutGraphemes(s, n) {
  const parts = [...graphemes.segment(String(s))].map((g) => g.segment);
  return parts.length <= n ? String(s) : `${parts.slice(0, n).join('')}…`;
}

/** UTF-8 length in bytes. */
export const utf8Bytes = (s) => new TextEncoder().encode(String(s)).length;
