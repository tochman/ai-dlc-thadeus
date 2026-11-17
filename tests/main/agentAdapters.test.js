// US-0506 u1 LC3: HarnessEventAdapter against the agent event fixtures (BR1.4, BR2.6, BR3.3; NFR2.1, NFR2.3, NFR5.8, NFR7.2).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adapters, cutUtf8 } from '../../src/main/agentAdapters.js';

const FIX = path.resolve(__dirname, '../fixtures/agent-events');
const load = (harness, name) => readFileSync(path.join(FIX, harness, `${name}.json`));
const parse = (harness, name, kind = 'question') => adapters[harness].parse(kind, load(harness, name));
const cp = (n) => String.fromCodePoint(n);

describe('parse', () => {
  it.each(['claude', 'opencode'])('%s: a question keeps header, text, labels, descriptions and order (BR1.4, BR4.2)', (harness) => {
    const ev = parse(harness, 'gate-2026-11-14');
    expect(ev.ok).toBe(true);
    expect(ev.kind).toBe('question');
    expect(ev.questions).toEqual([
      {
        header: 'Stage gate',
        text: '**Code Generation** is complete for `u1-questions`. How would you like to proceed?',
        truncated: false,
        options: [
          { label: 'Complete workflow', description: 'Approve this stage and continue to Build and Test.' },
          { label: 'Request Changes', description: 'Keep the stage open and say what to change.' }
        ],
        multiSelect: false,
        allowOwn: true
      }
    ]);
    expect(ev.toolCallId).toBe(harness === 'claude' ? 'toolu_01GateQuestion20261114' : 'frm_gate20261114');
  });

  it.each(['claude', 'opencode'])('%s: a batch of four keeps each question and its multi-select flag', (harness) => {
    const ev = parse(harness, 'batch-four');
    expect(ev.questions.map((q) => [q.header, q.options.length, q.multiSelect])).toEqual([
      ['Language', 2, false],
      ['Platforms', 3, true],
      ['Errors', 2, false],
      ['Opening', 2, false]
    ]);
  });

  it('reads the closing events with their tool call id (BR2.3)', () => {
    expect(adapters.claude.parse('answered', load('claude', 'post-tool-use'))).toEqual({
      ok: true,
      kind: 'answered',
      toolCallId: 'toolu_01GateQuestion20261114'
    });
    expect(adapters.opencode.parse('answered', load('opencode', 'form-replied'))).toEqual({ ok: true, kind: 'answered', toolCallId: 'frm_gate20261114' });
    expect(adapters.opencode.parse('answered', load('opencode', 'form-cancelled'))).toEqual({ ok: true, kind: 'answered', toolCallId: 'frm_gate20261114' });
    expect(adapters.claude.parse('answered', Buffer.from('not json'))).toEqual({ ok: true, kind: 'answered', toolCallId: null });
  });

  it.each([
    ['no-questions', 'no questions'],
    ['five-questions', 'more than 4 questions'],
    ['no-text', 'a question without text'],
    ['empty-label', 'an option without a label']
  ])('refuses %s with a reason, never a guess (NFR2.3)', (name, reason) => {
    const ev = parse('claude', name);
    expect(ev.ok).toBe(false);
    expect(ev.reason).toBe(reason);
  });

  it('refuses a body that is not JSON, and ignores an unknown kind', () => {
    expect(adapters.claude.parse('question', Buffer.from('{oops'))).toEqual({ ok: false, reason: 'not JSON' });
    expect(adapters.claude.parse('idle', load('claude', 'gate-2026-11-14'))).toBeNull(); // permission is a kind since u2
    expect(adapters.opencode.parse('notice', load('opencode', 'gate-2026-11-14'))).toBeNull(); // u3 made 'reply' a known kind
  });

  it('keeps Swedish, emoji, quotes, newlines and control characters byte-equal (NFR7.2, AC1.1.10)', () => {
    const text = `Välj "rätt" 'svar'\n\tmed ${cp(0x1f469)}${cp(0x200d)}${cp(0x1f4bb)} och ${cp(0x1b)}[31mfärg ${cp(0x202e)}vänd`;
    const body = JSON.stringify({ tool_input: { questions: [{ question: text, header: `Rubrik ${cp(0x7)}`, options: [{ label: `Ja ${cp(0x1f600)}` }] }] } });
    const ev = adapters.claude.parse('question', Buffer.from(body));
    expect(ev.questions[0].text).toBe(text);
    expect(ev.questions[0].header).toBe(`Rubrik ${cp(0x7)}`);
    expect(ev.questions[0].options[0]).toEqual({ label: `Ja ${cp(0x1f600)}`, description: null });
  });

  it('cuts a 70 KB question to 64 KB, marks it truncated and keeps the full text in the answer key (BR2.6)', () => {
    const seed = `Rad åäö ${cp(0x1f600)} "citat"\n`;
    const text = seed.repeat(Math.ceil(70_000 / Buffer.byteLength(seed)));
    const body = JSON.stringify({ tool_input: { questions: [{ question: text, options: [{ label: 'A' }] }] } });
    const ev = adapters.claude.parse('question', Buffer.from(body));
    expect(ev.questions[0].truncated).toBe(true);
    expect(Buffer.byteLength(ev.questions[0].text)).toBeLessThanOrEqual(65_536);
    expect(text.startsWith(ev.questions[0].text)).toBe(true);
    const out = JSON.parse(adapters.claude.answerText(ev, { picks: [[0]], own: [null] }));
    expect(Object.keys(out.hookSpecificOutput.updatedInput.answers)).toEqual([text]);
  });
});

describe('cutUtf8 (SCD1)', () => {
  it('keeps exactly 65 536 bytes, cuts 65 537, and never splits a character', () => {
    expect(cutUtf8('a'.repeat(65_536))).toEqual({ text: 'a'.repeat(65_536), truncated: false });
    expect(cutUtf8('a'.repeat(65_537))).toEqual({ text: 'a'.repeat(65_536), truncated: true });
    const emoji = 'a'.repeat(65_533) + cp(0x1f600) + 'b'; // the 4-byte emoji starts at byte 65 534 (1-based)
    const cut = cutUtf8(emoji);
    expect(cut).toEqual({ text: 'a'.repeat(65_533), truncated: true });
    expect(cut.text).not.toContain(cp(0xfffd));
  });
});

describe('answers for the five scenarios (NFR2.1, BR3.3)', () => {
  const claudeAnswers = (name, answer) => {
    const ev = parse('claude', name);
    const out = JSON.parse(adapters.claude.answerText(ev, answer));
    expect(out.hookSpecificOutput.hookEventName).toBe('PreToolUse');
    expect(out.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(out.hookSpecificOutput.updatedInput.questions).toEqual(JSON.parse(load('claude', name)).tool_input.questions);
    return out.hookSpecificOutput.updatedInput.answers;
  };
  const opencodeAnswer = (name, answer) => JSON.parse(adapters.opencode.answerText(parse('opencode', name), answer));

  it('1 gate: the picked label, not the audit log wording', () => {
    expect(claudeAnswers('gate-2026-11-14', { picks: [[0]], own: [null] })).toEqual({
      '**Code Generation** is complete for `u1-questions`. How would you like to proceed?': 'Complete workflow'
    });
    expect(opencodeAnswer('gate-2026-11-14', { picks: [[1]], own: [null] })).toEqual({ q0: 'Request Changes' });
  });

  it('2 reordered options: the label at the picked index', () => {
    expect(claudeAnswers('reordered', { picks: [[2]], own: [null] })).toEqual({ 'Which database should the service use?': 'DynamoDB' });
    expect(opencodeAnswer('reordered', { picks: [[1]], own: [null] })).toEqual({ q0: 'PostgreSQL' });
  });

  it('3 a batch of four, one multi-select: one answer per question', () => {
    const answer = { picks: [[1], [0, 1], [0], [1]], own: [null, null, null, null] };
    expect(claudeAnswers('batch-four', answer)).toEqual({
      'Which language should the texts be written in?': 'English',
      'Which platforms must the release cover?': 'macOS, Linux',
      'How should a failed send be shown?': 'In the dialog',
      'Should the dialog open by itself?': 'No'
    });
    expect(opencodeAnswer('batch-four', answer)).toEqual({ q0: 'English', q1: ['macOS', 'Linux'], q2: 'In the dialog', q3: 'No' });
  });

  it('4 multi-select with two picks: labels in the options order', () => {
    expect(claudeAnswers('multi-two', { picks: [[2, 0]], own: [null] })).toEqual({ 'Which checks should run in CI?': 'Coverage, Prettier' });
    expect(opencodeAnswer('multi-two', { picks: [[2, 0]], own: [null] })).toEqual({ q0: ['Coverage', 'Prettier'] });
  });

  it('5 own answer: the own text as the answer', () => {
    expect(claudeAnswers('own-answer', { picks: [[]], own: ['Bryggan'] })).toEqual({ 'What should the new tab be called?': 'Bryggan' });
    expect(opencodeAnswer('own-answer', { picks: [[]], own: ['Bryggan'] })).toEqual({ q0: 'Bryggan' });
  });
});

describe('key sequences for a hand-back (K11, BR3.2)', () => {
  it('Claude Code: the digit of the position; an own answer is the own-answer row, the cleaned text and Enter', () => {
    expect(adapters.claude.keys(parse('claude', 'reordered'), { picks: [[2]], own: [null] })).toBe('3');
    expect(adapters.claude.keys(parse('claude', 'own-answer'), { picks: [[]], own: [`Brygg\nan${cp(0x202e)}`] })).toBe('3Brygg an\r');
  });

  it('opencode: arrow down to the index, then Enter; no keys for an own answer', () => {
    expect(adapters.opencode.keys(parse('opencode', 'reordered'), { picks: [[2]], own: [null] })).toBe('\x1b[B\x1b[B\r');
    expect(adapters.opencode.keys(parse('opencode', 'reordered'), { picks: [[0]], own: [null] })).toBe('\r');
    expect(adapters.opencode.keys(parse('opencode', 'own-answer'), { picks: [[]], own: ['x'] })).toBeNull();
  });

  it('builds keys from the picked index, so two options with the same label still get their own key (review fix 2)', () => {
    const dup = { questions: [{ options: [{ label: 'Ja' }, { label: 'Ja' }, { label: 'Nej' }], multiSelect: false }] };
    expect(adapters.claude.keys(dup, { picks: [[1]], own: [null] })).toBe('2');
    expect(adapters.opencode.keys(dup, { picks: [[1]], own: [null] })).toBe('\x1b[B\r');
  });

  it('a batch or a multi-select answer has no key sequence', () => {
    for (const harness of ['claude', 'opencode']) {
      expect(adapters[harness].keys(parse(harness, 'batch-four'), { picks: [[0], [0], [0], [0]], own: [null, null, null, null] })).toBeNull();
      expect(adapters[harness].keys(parse(harness, 'multi-two'), { picks: [[0]], own: [null] })).toBeNull();
    }
  });

  it('the label the picker is watched for is the first option of the first question', () => {
    expect(adapters.claude.pickerLabel(parse('claude', 'reordered'))).toBe('SQLite');
  });
});

// US-0213 FR1.3, FR1.5, FR5.1, FR8.1: the report-only kinds. Only known fields are read; any other value is null.
describe('handoff signals (US-0213)', () => {
  const raw = (harness, kind, payload) => adapters[harness].parse(kind, Buffer.from(JSON.stringify(payload)));

  it('claude session reads source, and only the four known sources (FR1.5)', () => {
    expect(raw('claude', 'session', { hook_event_name: 'SessionStart', source: 'clear', model: 'x' })).toEqual({ ok: true, kind: 'session', source: 'clear' });
    expect(raw('claude', 'session', { source: 'rm -rf' })).toEqual({ ok: true, kind: 'session', source: null });
    expect(raw('claude', 'session', {})).toEqual({ ok: true, kind: 'session', source: null }); // absent: degrades
  });

  it('claude notify reads notification_type and never the message (FR1.3)', () => {
    expect(raw('claude', 'notify', { notification_type: 'idle_prompt', message: 'Claude is waiting' })).toEqual({
      ok: true,
      kind: 'notify',
      type: 'idle_prompt'
    });
    expect(raw('claude', 'notify', { notification_type: 7 })).toEqual({ ok: true, kind: 'notify', type: null });
  });

  it('claude postcompact reads trigger and never compact_summary (FR8.1)', () => {
    const out = raw('claude', 'postcompact', { trigger: 'manual', compact_summary: 'SECRET SUMMARY' });
    expect(out).toEqual({ ok: true, kind: 'postcompact', trigger: 'manual' });
    expect(JSON.stringify(out)).not.toContain('SECRET');
    expect(raw('claude', 'precompact', { trigger: 'auto', custom_instructions: '' })).toEqual({ ok: true, kind: 'precompact', trigger: 'auto' });
  });

  it('claude reply carries the transcript path and whether background tasks run (FR1.1, FR5.1)', () => {
    const base = { last_assistant_message: 'Done.', transcript_path: '/Users/x/.claude/projects/p/s.jsonl' };
    expect(raw('claude', 'reply', { ...base, background_tasks: [{ id: 'b1' }] }).signals).toEqual({
      transcriptPath: base.transcript_path,
      backgroundTasks: true
    });
    expect(raw('claude', 'reply', { ...base, background_tasks: [] }).signals.backgroundTasks).toBe(false);
    expect(raw('claude', 'reply', base).signals.backgroundTasks).toBe(null); // absent: the rule behaves as before
    expect(raw('claude', 'reply', { last_assistant_message: 'x', transcript_path: 5 }).signals.transcriptPath).toBe(null);
  });

  it('opencode session, status, usage and postcompact read V2 data or properties (FR1.2, FR1.5, FR5.1)', () => {
    expect(raw('opencode', 'session', { type: 'session.created', data: { info: { id: 's' } } })).toEqual({ ok: true, kind: 'session', source: 'startup' });
    expect(raw('opencode', 'status', { data: { status: { type: 'busy' } } })).toEqual({ ok: true, kind: 'status', busy: true });
    expect(raw('opencode', 'status', { properties: { sessionID: 's' } })).toEqual({ ok: true, kind: 'status', busy: false }); // session.idle
    const tokens = { input: 10, output: 5, cache: { read: 90_000, write: 1_000 } };
    expect(raw('opencode', 'usage', { data: { tokens, modelID: 'claude-sonnet-4-5' } })).toEqual({
      ok: true,
      kind: 'usage',
      context: { tokens: 91_010, model: 'claude-sonnet-4-5' }
    });
    expect(raw('opencode', 'postcompact', { data: { tokens } })).toEqual({ ok: true, kind: 'postcompact', trigger: null });
  });

  it('refuses a body that is not JSON, for every new kind of both harnesses', () => {
    for (const kind of ['session', 'notify', 'precompact', 'postcompact']) expect(adapters.claude.parse(kind, Buffer.from('{'))).toMatchObject({ ok: false });
    for (const kind of ['session', 'status', 'usage', 'postcompact']) expect(adapters.opencode.parse(kind, Buffer.from('{'))).toMatchObject({ ok: false });
  });
});
