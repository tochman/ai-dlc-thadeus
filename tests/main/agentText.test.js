// US-0506 u1 (u3 LC12, u5 amendment 2): the one sanitizer for agent text shown as plain text.
// Code points are built with String.fromCodePoint, so this file holds no invisible character itself.
import { describe, expect, it } from 'vitest';
import { UNSAFE, cleanBody, cleanLine, cutGraphemes, firstLine, plainLine, stripUnsafe, utf8Bytes, visibleText } from '../../src/shared/agentText.js';

const cp = (n) => String.fromCodePoint(n);
const ZWJ = cp(0x200d);
const CASES = [
  0x0000, 0x001b, 0x007f, 0x0085, 0x009f, 0x00ad, 0x061c, 0x200b, 0x200c, 0x200e, 0x200f, 0x202a, 0x202e, 0x2060, 0x2066, 0x2069, 0xfeff, 0xe0001, 0xe0041,
  0xe007f
];
const LONE = String.fromCharCode(0xd800);
const esc = (n) => (n > 0xffff ? `\\u{${n.toString(16)}}` : `\\u${n.toString(16).padStart(4, '0')}`);
const CODER = `${cp(0x1f469)}${ZWJ}${cp(0x1f4bb)}`; // woman technologist, a ZWJ sequence

describe('agentText: the unsafe class', () => {
  it.each(CASES)('code point %i is unsafe, removed by the cleaners and escaped by visibleText', (n) => {
    const s = `a${cp(n)}b`;
    expect(UNSAFE.test(s)).toBe(true);
    expect(cleanLine(s)).toBe('ab');
    expect(stripUnsafe(s)).toBe('ab');
    expect(visibleText(s)).toBe(`a${esc(n)}b`);
  });

  it('a lone surrogate is unsafe, removed and escaped', () => {
    expect(UNSAFE.test(`a${LONE}b`)).toBe(true);
    expect(cleanLine(`a${LONE}b`)).toBe('ab');
    expect(visibleText(`a${LONE}b`)).toBe('a\\ud800b');
  });

  it('U+2028 and U+2029 become a space in the cleaners and are escaped by visibleText, also with multiline', () => {
    for (const n of [0x2028, 0x2029]) {
      expect(UNSAFE.test(cp(n))).toBe(true);
      expect(cleanLine(`a${cp(n)}b`)).toBe('a b');
      expect(visibleText(`a${cp(n)}b`)).toBe(`a${esc(n)}b`);
      expect(visibleText(`a${cp(n)}b`, { multiline: true })).toBe(`a${esc(n)}b`);
    }
  });

  it('ZWJ is not unsafe, is kept by the cleaners and is escaped by visibleText', () => {
    expect(UNSAFE.test(ZWJ)).toBe(false);
    expect(cleanLine(`a${ZWJ}b`)).toBe(`a${ZWJ}b`);
    expect(visibleText(`a${ZWJ}b`)).toBe('a\\u200db');
  });

  it('UNSAFE has no g flag, so two tests in a row agree', () => {
    expect(UNSAFE.flags).not.toContain('g');
    const s = `x${cp(0x202e)}y`;
    expect([UNSAFE.test(s), UNSAFE.test(s)]).toEqual([true, true]);
    expect([UNSAFE.test('abc'), UNSAFE.test('abc')]).toEqual([false, false]);
  });

  it('keeps emoji sequences and Swedish letters unchanged', () => {
    for (const s of [`${CODER} kodar`, 'åäö ÅÄÖ']) {
      expect(cleanLine(s)).toBe(s);
      expect(stripUnsafe(s)).toBe(s);
    }
  });
});

describe('agentText: line helpers', () => {
  it('cleanLine turns CR, LF and TAB into spaces; stripUnsafe also collapses and trims', () => {
    expect(cleanLine('a\r\nb\tc')).toBe('a  b c');
    expect(stripUnsafe('  a\r\n\n b\t\tc  ')).toBe('a b c');
  });

  it('cleanBody keeps LF, TAB and ZWJ for a Markdown body and removes every other unsafe character (review fix 4)', () => {
    const s = `a${cp(0x202e)}b\nc\td\r\ne${cp(0x200b)}${CODER}${cp(0xe0041)}`;
    expect(cleanBody(s)).toBe(`ab\nc\td\ne${CODER}`);
    expect(cleanBody('åäö\n')).toBe('åäö\n');
  });

  it('visibleText keeps LF and TAB only with multiline', () => {
    expect(visibleText('a\nb\tc')).toBe('a\\u000ab\\u0009c');
    expect(visibleText('a\nb\tc', { multiline: true })).toBe('a\nb\tc');
    expect(visibleText('a\rb', { multiline: true })).toBe('a\\u000db');
    expect(visibleText('plain åäö')).toBe('plain åäö');
  });

  it('plainLine drops Markdown markers and keeps a link label', () => {
    expect(plainLine('## **Bold** and _it_ with `code` and [the docs](https://x.se)')).toBe('Bold and it with code and the docs');
    expect(plainLine('- [ ] a task')).toBe('a task');
    expect(plainLine('> quoted ~~old~~ text')).toBe('quoted old text');
  });

  it('firstLine skips empty lines and code fences', () => {
    expect(firstLine('\n\n```js\nconst a = 1;\n```')).toBe('const a = 1;');
    expect(firstLine('  \nFirst\nSecond')).toBe('First');
    expect(firstLine('')).toBe('');
  });

  it('cutGraphemes keeps a ZWJ sequence whole and adds an ellipsis only when it cuts', () => {
    expect(cutGraphemes('abc', 3)).toBe('abc');
    expect(cutGraphemes('abcd', 3)).toBe('abc…');
    expect(cutGraphemes(`a${CODER}b`, 2)).toBe(`a${CODER}…`);
  });

  it('utf8Bytes counts UTF-8 bytes', () => {
    expect(utf8Bytes('a')).toBe(1);
    expect(utf8Bytes('å')).toBe(2);
    expect(utf8Bytes(cp(0x1f600))).toBe(4);
    expect(utf8Bytes(CODER)).toBe(11);
  });
});
