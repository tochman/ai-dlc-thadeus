import { describe, expect, it } from 'vitest';
import { readPicker, resolveAnswer } from '../../src/renderer/picker.js';

// Claude Code's question picker as it sits at the bottom of the agent tab (EPIC-00 US-0004).
const GATE = [
  '⏺ Deployment Pipeline är klart.',
  '1. En numrerad lista i chatten, inte ett val', // earlier output: not part of the picker
  '',
  ' Deployment Pipeline är klart. Hur vill du gå vidare?',
  '',
  '❯ 1. Approve',
  '     Fortsätt till Deployment Execution',
  '  2. Request Changes',
  '     Ge feedback för en revidering',
  '  3. Type something.',
  '────────────────',
  '  4. Chat about this'
];
const QUESTION = ['', ' Hur ska v0.2.3 publiceras?', '', '  1. A. Vanlig release direkt', '❯ 2. B. Prerelease först', '  3. Type something.'];
const SEVERAL = ['←  ☐ US-0004  ☐ När  ✔ Submit  →', '', ' Ska US-0004 med?', '', '❯ 1. A. Bygg US-0004 först', '  2. B. Flytta till v0.2.4'];

describe('readPicker', () => {
  it('reads the numbered choices around the cursor, not a numbered list above it', () => {
    expect(readPicker(GATE)).toEqual({
      multi: false,
      options: [
        { key: '1', label: 'Approve' },
        { key: '2', label: 'Request Changes' },
        { key: '3', label: 'Type something.' },
        { key: '4', label: 'Chat about this' }
      ]
    });
  });

  it('is null with no picker on screen, and marks several questions at once', () => {
    expect(readPicker(['⏺ Arbetar…', '1. något', '2. annat'])).toBeNull(); // no cursor line
    expect(readPicker(SEVERAL).multi).toBe(true);
  });
});

describe('resolveAnswer', () => {
  const screens = (...s) => s.map((lines, n) => ({ tab: `agent:${n}`, lines }));

  it('sends the picker\'s key for the chosen option, in the tab whose picker shows the question', () => {
    const q = { kind: 'question', options: ['A. Vanlig release direkt', 'B. Prerelease först'] };
    expect(resolveAnswer(screens(GATE, QUESTION), q, { index: 1 })).toEqual({ tab: 'agent:1', keys: ['2'] });
    expect(resolveAnswer(screens(GATE), { kind: 'gate' }, { index: 0 })).toEqual({ tab: 'agent:0', keys: ['1'] });
    // A batch logged as "Q1: …" still matches its picker's labels.
    expect(resolveAnswer(screens(QUESTION), { kind: 'question', options: ['Q1: A. Vanlig release direkt', 'Q1: B. Prerelease först'] }, { index: 0 }).keys).toEqual(['1']);
  });

  it('sends nothing when the picker shows other choices, several questions, or nothing', () => {
    expect(resolveAnswer(screens(QUESTION), { kind: 'question', options: ['Ja', 'Nej'] }, { index: 0 })).toEqual({ error: 'mismatch' });
    expect(resolveAnswer(screens(SEVERAL), { kind: 'question', options: ['A. Bygg US-0004 först'] }, { index: 0 })).toEqual({ error: 'several' });
    expect(resolveAnswer(screens(['⏺ Arbetar…']), { kind: 'gate' }, { index: 0 })).toEqual({ error: 'noPicker' });
  });

  it('types an own answer through the picker\'s "Type something" choice', () => {
    expect(resolveAnswer(screens(GATE), { kind: 'gate' }, { own: 'Byt namn' })).toEqual({ tab: 'agent:0', keys: ['3', 'Byt namn\r'] });
  });
});
