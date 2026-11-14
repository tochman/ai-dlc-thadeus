import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPicker, resolveAnswer, waitForAnswer } from '../../src/renderer/picker.js';
import { fixture } from '../fixtures/picker/index.js';

const on = (...names) => names.map((name, n) => ({ tab: `agent:${n}`, lines: fixture(name) }));

const gate = { kind: 'gate' };
// The answer-mode question as DECISION_RECORDED logs it, parsed by main (descriptions stripped).
const answerMode = { kind: 'question', options: ['Guide me', "I'll edit the file", 'Chat'] };

describe('readPicker over the real picker layout (US-0006)', () => {
  it('reads every option of the gate, the one under the rule too, and not the numbered list above it', () => {
    const picker = readPicker(fixture('gate'));
    expect(picker.multi).toBe(false); // one □ chip: a single question
    expect(picker.options.map((o) => `${o.key} ${o.label}`)).toEqual(['1 Approve', '2 Request Changes', '3 Type something.', '4 Chat about this']);
    expect(picker.options[0].detail).toEqual(['Continue to Build and Test']);
  });

  it('marks a □ batch and a ☒/☐/✔ Submit batch as several questions', () => {
    expect(readPicker(fixture('batch-square')).multi).toBe(true);
    expect(readPicker(fixture('batch-ballot')).multi).toBe(true);
    expect(readPicker(fixture('batch-square').map((l) => l.replace('✔ Submit', '□ Submit'))).multi).toBe(true); // □ chips only
    expect(readPicker(fixture('single')).multi).toBe(false);
  });

  it('is null with no picker, and for an old picker with newer output under it', () => {
    expect(readPicker(fixture('no-picker'))).toBeNull();
    expect(readPicker([...fixture('gate'), ...fixture('no-picker')])).toBeNull();
  });
});

describe('resolveAnswer over the fixtures (US-0006)', () => {
  it('a gate sends the Approve key and the Request Changes key', () => {
    expect(resolveAnswer(on('gate'), gate, { index: 0 })).toEqual({ tab: 'agent:0', keys: ['1'] });
    expect(resolveAnswer(on('gate'), gate, { index: 1 })).toEqual({ tab: 'agent:0', keys: ['2'] });
  });

  it('a single question sends the right key with the cursor on option 1 and on option 2', () => {
    for (const name of ['single', 'single-cursor2']) {
      expect(resolveAnswer(on(name), answerMode, { index: 0 }), name).toEqual({ tab: 'agent:0', keys: ['1'] });
      expect(resolveAnswer(on(name), answerMode, { index: 2 }), name).toEqual({ tab: 'agent:0', keys: ['3'] });
    }
  });

  it('matches labels logged with a description, a letter or a Q prefix', () => {
    const logged = { kind: 'question', options: ['Q1: A. Guide me (walk through each question)', "B. I'll edit the file", 'Chat (discuss freely)'] };
    expect(resolveAnswer(on('single'), logged, { index: 1 }).keys).toEqual(['2']);
  });

  it('matches a label the picker cut with "…", and one it wrapped onto the next row', () => {
    const scope = { kind: 'question', options: ['Go ahead with the "ultra-express" plan', 'Use a different plan', 'Tailor a plan to this task'] };
    expect(resolveAnswer(on('long-label'), scope, { index: 0 }).keys).toEqual(['1']);
    expect(resolveAnswer(on('long-label'), scope, { index: 2 }).keys).toEqual(['3']);
    const install = {
      kind: 'question',
      options: ['I install the DMG now and confirm that it starts, shows 0.2.3 and opens a project', 'Accept failure: keep them open and continue', 'Abort']
    };
    expect(resolveAnswer(on('wrapped'), install, { index: 0 }).keys).toEqual(['1']);
  });

  it('a batch picker, or a batch question, gives several', () => {
    const flags = { kind: 'question', options: ['Every switch', 'Non-default + Show all', 'Non-default only'] };
    expect(resolveAnswer(on('batch-square'), flags, { index: 0 })).toEqual({ error: 'several' });
    expect(resolveAnswer(on('batch-ballot'), { kind: 'question', options: ['Ja', 'Nej'] }, { index: 0 })).toEqual({ error: 'several' });
    expect(
      resolveAnswer(
        on('single'),
        {
          ...answerMode,
          batch: [
            { id: 'Q1', options: [] },
            { id: 'Q2', options: [] }
          ]
        },
        { index: 0 }
      )
    ).toEqual({ error: 'several' });
  });

  it('an own answer goes through "Type something" with its text', () => {
    expect(resolveAnswer(on('gate'), gate, { own: 'Byt namn' })).toEqual({ tab: 'agent:0', keys: ['3', 'Byt namn\r'] });
    expect(resolveAnswer(on('single'), answerMode, { own: 'Båda' })).toEqual({ tab: 'agent:0', keys: ['4', 'Båda\r'] });
  });

  it('logged options the picker does not show give mismatch; no picker gives noPicker', () => {
    expect(resolveAnswer(on('gate'), answerMode, { index: 0 })).toEqual({ error: 'mismatch' });
    expect(resolveAnswer(on('single'), { kind: 'question', options: ['Full rescan', 'Focused scan'] }, { index: 0 })).toEqual({ error: 'mismatch' });
    expect(resolveAnswer(on('no-picker'), gate, { index: 0 })).toEqual({ error: 'noPicker' });
  });

  it('picks the tab whose picker shows the question', () => {
    expect(resolveAnswer(on('no-picker', 'gate', 'single'), answerMode, { index: 1 })).toEqual({ tab: 'agent:2', keys: ['2'] });
  });
});

describe('waitForAnswer (US-0006)', () => {
  afterEach(() => vi.useRealTimers());

  it('waits for a picker drawn after the question was logged, up to the limit', async () => {
    vi.useFakeTimers();
    let lines = fixture('no-picker');
    setTimeout(() => (lines = fixture('gate')), 1200);
    const pending = waitForAnswer(() => [{ tab: 'agent:0', lines }], gate, { index: 0 }, { waitMs: 3000 });
    await vi.advanceTimersByTimeAsync(1500);
    expect((await pending).found).toEqual({ tab: 'agent:0', keys: ['1'] });

    const never = waitForAnswer(() => [{ tab: 'agent:0', lines: fixture('no-picker') }], gate, { index: 0 }, { waitMs: 3000 });
    await vi.advanceTimersByTimeAsync(3200);
    expect((await never).found).toEqual({ error: 'noPicker' });
  });

  it('does not wait when a picker shows something else', async () => {
    const read = vi.fn(() => on('single'));
    expect((await waitForAnswer(read, gate, { index: 0 })).found).toEqual({ error: 'mismatch' });
    expect(read).toHaveBeenCalledTimes(1);
  });
});
