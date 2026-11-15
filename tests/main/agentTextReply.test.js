// US-0506 u3 LC12: the u1 sanitizer on the inputs a typed reply and the latest-message strip meet (SD8, K7, K9;
// review R-03, R-06, R-07; NFR3.14).
import { describe, expect, it } from 'vitest';
import { UNSAFE, cleanLine, firstLine, stripUnsafe, utf8Bytes } from '../../src/shared/agentText.js';

const cp = (n) => String.fromCodePoint(n);
const ZWJ_EMOJI = `👩${cp(0x200d)}💻`;

describe('cleanLine on the SD8 inputs', () => {
  it('removes control, escape, bidi and zero-width characters and keeps the visible text', () => {
    const removed = [
      '\x03',
      '\x1b[201~',
      '\x1b[2J',
      '\x7f',
      '\x9b',
      cp(0x202e),
      cp(0x2067),
      cp(0x200e),
      cp(0x200f),
      cp(0x061c),
      cp(0x200b),
      cp(0xfeff),
      cp(0x00ad)
    ];
    for (const bad of removed) {
      const out = cleanLine(`a${bad}b`);
      expect(UNSAFE.test(out)).toBe(false);
      expect(out.startsWith('a')).toBe(true);
      expect(out.endsWith('b')).toBe(true);
    }
    expect(cleanLine('a\x1b[201~b')).toBe('a[201~b'); // the ESC goes, so no paste end can reach the pty
    expect(cleanLine('a\r\nb')).toBe('a  b');
    expect(cleanLine('a\tb')).toBe('a b');
    expect(cleanLine(`a${cp(0x2028)}b`)).toBe('a b');
  });

  it('keeps a ZWJ emoji and åäö unchanged', () => {
    expect(cleanLine(`${ZWJ_EMOJI} åäö ÅÄÖ`)).toBe(`${ZWJ_EMOJI} åäö ÅÄÖ`);
  });

  it('leaves nothing but whitespace from a whitespace-only answer (K9)', () => {
    expect(cleanLine('\n \t').trim()).toBe('');
    expect(cleanLine('\x1b\x07').trim()).toBe('');
  });
});

describe('the 64 KB bound and the strip line', () => {
  it('counts UTF-8 bytes at 65 536 and 65 537 with a 4-byte emoji on the boundary', () => {
    const at = 'a'.repeat(65_532) + '😀';
    expect(utf8Bytes(at)).toBe(65_536);
    expect(utf8Bytes('a' + at)).toBe(65_537);
  });

  it('removes U+202E from a strip line (review R-06)', () => {
    const line = stripUnsafe(firstLine(`\n\n  Rename ${cp(0x202e)}gpj.exe  \nsecond line`));
    expect(line).toBe('Rename gpj.exe');
    expect(line.includes(cp(0x202e))).toBe(false);
  });

  it('UNSAFE.test gives the same result twice (no lastIndex, review R-07)', () => {
    const s = `x${cp(0x202e)}y`;
    expect(UNSAFE.flags.includes('g')).toBe(false);
    expect(UNSAFE.test(s)).toBe(true);
    expect(UNSAFE.test(s)).toBe(true);
    expect(UNSAFE.test(ZWJ_EMOJI)).toBe(false);
  });
});
