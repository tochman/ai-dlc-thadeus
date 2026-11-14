// Smoke tests (EPIC-00 US-0006): the picker as raw terminal output (ANSI colours, cursor moves, CRLF) written into a
// real @xterm/xterm Terminal in jsdom, then read the way the popup reads it: screenLines → readPicker → resolveAnswer.
import { afterEach, describe, expect, it } from 'vitest';
import { Terminal } from '@xterm/xterm';
import { screenLines } from '../../src/renderer/TerminalPanel.jsx';
import { readPicker, resolveAnswer } from '../../src/renderer/picker.js';
import { fixture } from '../fixtures/picker/index.js';

const terms = [];
afterEach(() => terms.splice(0).forEach((t) => t.dispose()));

function terminal(cols, rows) {
  const t = new Terminal({ cols, rows, scrollback: 1000 });
  terms.push(t);
  return t;
}
const write = (t, data) => new Promise((resolve) => t.write(data, resolve));

/** A fixture as Claude Code (Ink) draws it: colours on the cursor row, chips and hint, dim descriptions, CRLF. */
function frame(name) {
  return fixture(name)
    .map((l) => {
      if (/^\s*❯/.test(l)) return `\x1b[36m${l}\x1b[39m`;
      if (/[□☐☒✔]/.test(l)) return `\x1b[1m${l}\x1b[22m`;
      if (/^\s{5}\S/.test(l)) return `\x1b[2m${l}\x1b[22m`;
      if (/^Enter to select/.test(l)) return `\x1b[90m${l}\x1b[39m`;
      return l;
    })
    .join('\r\n');
}
/** Ink's redraw: erase the frame's rows from the bottom up, then write the next frame in their place. */
const redraw = (rows, next) => `${'\x1b[2K\x1b[1A'.repeat(rows - 1)}\x1b[2K\x1b[G${frame(next)}`;
const history = Array.from({ length: 60 }, (_, n) => `⏺ rad ${n + 1} av tidigare utdata`).join('\r\n');
const answerMode = { kind: 'question', options: ['Guide me', "I'll edit the file", 'Chat'] };
const tab = (t) => [{ tab: 'agent:0', lines: screenLines(t) }];

/** The rows the viewport shows, as the reader before US-0006 read them. */
function viewport(t) {
  const buf = t.buffer.active;
  return Array.from({ length: t.rows }, (_, i) => buf.getLine(buf.viewportY + i)?.translateToString(true) ?? '');
}

describe('picker smoke tests in a real xterm Terminal (US-0006)', () => {
  it('reads the gate end to end and sends Request Changes', async () => {
    const t = terminal(80, 24);
    await write(t, `${history}\r\n${frame('gate')}`);
    expect(readPicker(screenLines(t)).options.map((o) => o.label)).toEqual(['Approve', 'Request Changes', 'Type something.', 'Chat about this']);
    expect(resolveAnswer(tab(t), { kind: 'gate' }, { index: 1 })).toEqual({ tab: 'agent:0', keys: ['2'] });
  });

  it('still sends after the person scrolls the tab up', async () => {
    const t = terminal(80, 24);
    await write(t, `${history}\r\n${frame('gate')}`);
    t.scrollLines(-30);
    expect(t.buffer.active.viewportY).toBeLessThan(t.buffer.active.baseY);
    expect(readPicker(viewport(t))).toBeNull(); // the scrolled viewport does not show the picker
    expect(resolveAnswer(tab(t), { kind: 'gate' }, { index: 0 })).toEqual({ tab: 'agent:0', keys: ['1'] });
  });

  it('reads a picker taller than the terminal, and scrolled up there too', async () => {
    const t = terminal(80, 8);
    await write(t, `${history}\r\n${frame('single')}`);
    expect(readPicker(viewport(t))).toBeNull(); // the "❯ 1." row is above the 8 visible rows
    expect(resolveAnswer(tab(t), answerMode, { index: 2 })).toEqual({ tab: 'agent:0', keys: ['3'] });
    t.scrollLines(-20);
    expect(resolveAnswer(tab(t), answerMode, { own: 'Båda' })).toEqual({ tab: 'agent:0', keys: ['4', 'Båda\r'] });
  });

  it('follows a redraw with the cursor moved, as on an arrow key', async () => {
    const t = terminal(80, 24);
    await write(t, `${history}\r\n${frame('single')}`);
    await write(t, redraw(fixture('single').length, 'single-cursor2'));
    const picker = readPicker(screenLines(t));
    expect(picker.options.map((o) => o.key)).toEqual(['1', '2', '3', '4', '5']); // one picker, not two
    expect(screenLines(t).filter((l) => /^\s*❯/.test(l))).toEqual(["❯ 2. I'll edit the file"]);
    expect(resolveAnswer(tab(t), answerMode, { index: 0 })).toEqual({ tab: 'agent:0', keys: ['1'] });
  });

  it('joins rows the terminal wrapped, in a narrow tab', async () => {
    const t = terminal(40, 24);
    await write(t, frame('gate'));
    expect(resolveAnswer(tab(t), { kind: 'gate' }, { index: 1 })).toEqual({ tab: 'agent:0', keys: ['2'] });
  });

  it('a batch picker and a working agent send nothing', async () => {
    const batch = terminal(80, 24);
    await write(batch, `${history}\r\n${frame('batch-square')}`);
    expect(resolveAnswer(tab(batch), { kind: 'question', options: ['Every switch', 'Non-default only'] }, { index: 0 })).toEqual({ error: 'several' });
    const busy = terminal(80, 24);
    await write(busy, `${frame('gate')}\r\n${frame('no-picker')}`); // the answered picker is now old output
    expect(resolveAnswer(tab(busy), { kind: 'gate' }, { index: 0 })).toEqual({ error: 'noPicker' });
  });
});
