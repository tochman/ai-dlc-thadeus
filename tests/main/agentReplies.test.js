// US-0506 u3 LC4, SD10: the terminal auto-response classifier (BR6.6, NFR3.20, NFR1.10; K8, review R-04).
import { describe, expect, it } from 'vitest';
import { isAutoResponse } from '../../src/main/agentReplies.js';

const AUTO = [
  '\x1b[12;40R',
  '\x1b[?12;40R',
  '\x1b[?12;40;1R',
  '\x1b[0n',
  '\x1b[3n',
  '\x1b[?1;2c',
  '\x1b[?62;22c',
  '\x1b[>0;276;0c',
  '\x1b]11;rgb:1e1e/1e1e/1e1e\x07',
  '\x1b]10;rgb:ffff/ffff/ffff\x1b\\',
  '\x1b]4;1;rgb:cd/00/00\x07',
  '\x1b[I',
  '\x1b[O',
  '\x1b[?2026;2$y', // DECRPM (K8)
  '\x1b[?1u', // kitty keyboard flags (K8)
  '\x1b[I\x1b[12;40R' // several in one chunk
];
const PERSON = ['a', 'notes.md', '\r', '\x03', '\x1b[200~text\x1b[201~', '\x1b[A', '\x1b[Ia', '\x1bP>|xterm(1)\x1b\\', ''];

describe('isAutoResponse (SD10)', () => {
  it.each(AUTO)('%j is a terminal auto-response', (data) => {
    expect(isAutoResponse(data)).toBe(true);
  });

  it.each(PERSON)('%j is the person’s input', (data) => {
    expect(isAutoResponse(data)).toBe(false);
  });

  it('a non-string is never an auto-response', () => {
    for (const v of [null, undefined, 12, ['\x1b[I'], { data: '\x1b[I' }]) expect(isAutoResponse(v)).toBe(false);
  });

  it('is case-sensitive: lower-case finals are other sequences', () => {
    for (const data of ['\x1b[12;40r', '\x1b[0N', '\x1b[?1;2C', '\x1b[i', '\x1b[o', '\x1b[?2026;2$Y', '\x1b[?1U']) expect(isAutoResponse(data)).toBe(false);
  });

  it('gives the same answer on repeated calls (no shared lastIndex)', () => {
    for (let i = 0; i < 3; i++) {
      expect(isAutoResponse('\x1b[I')).toBe(true);
      expect(isAutoResponse('x')).toBe(false);
    }
  });

  it('counts Shift-F3 (ESC [ 1 ; 2 R) as a cursor report: the named F3 collision', () => {
    expect(isAutoResponse('\x1b[1;2R')).toBe(true);
  });
});
