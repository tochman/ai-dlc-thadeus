// US-0506 u3 LC3: reply parsing in HarnessEventAdapter (BR6.3, SD12, SCD7, D8, AC3.1.4, AC3.1.5, NFR2.6, NFR3.17).
import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { adapters } from '../../src/main/agentAdapters.js';

const ROOT = path.resolve(__dirname, '../..');
const FIX = path.join(ROOT, 'tests/fixtures/agent-events');
const body = (harness, name) => readFileSync(path.join(FIX, harness, `${name}.json`));
const json = (harness, name) => JSON.parse(body(harness, name).toString('utf8'));
const claude = (payload) => adapters.claude.parse('reply', Buffer.from(JSON.stringify(payload)));
const opencode = (payload) => adapters.opencode.parse('reply', Buffer.from(JSON.stringify(payload)));
const withText = (text) => ({ ...json('claude', 'stop-which-name'), last_assistant_message: text });

afterEach(() => vi.restoreAllMocks());

describe('Claude Code Stop payloads', () => {
  it('stop-which-name gives the reply message, text byte for byte (AC3.1.1)', () => {
    expect(adapters.claude.parse('reply', body('claude', 'stop-which-name'))).toEqual({
      ok: true,
      kind: 'reply',
      message: { text: 'Which name should the file have?', truncated: false, empty: false }
    });
  });

  it('keeps Swedish text, a ZWJ emoji and quotes exactly as the agent sent them (PD13)', () => {
    const r = adapters.claude.parse('reply', body('claude', 'stop-swedish'));
    expect(r.message.text).toBe(json('claude', 'stop-swedish').last_assistant_message);
  });

  it('never reads transcript_path (SD12)', () => {
    const input = body('claude', 'stop-which-name');
    const spies = [vi.spyOn(fs, 'openSync'), vi.spyOn(fs, 'readFileSync'), vi.spyOn(fsp, 'open'), vi.spyOn(fsp, 'readFile')];
    adapters.claude.parse('reply', input);
    for (const s of spies) expect(s).not.toHaveBeenCalled();
    expect(fs.existsSync(path.join(ROOT, json('claude', 'stop-which-name').transcript_path))).toBe(false);
  });

  it('an empty or whitespace-only message is a reply with empty: true (NFR2.6)', () => {
    expect(adapters.claude.parse('reply', body('claude', 'stop-empty')).message).toEqual({ text: '', truncated: false, empty: true });
    expect(claude(withText(' \n\t ')).message.empty).toBe(true);
  });

  it('a missing message is refused with "no last message"; a cut body with "not JSON"', () => {
    expect(adapters.claude.parse('reply', body('claude', 'stop-no-message'))).toEqual({ ok: false, reason: 'no last message' });
    expect(claude(withText(42))).toEqual({ ok: false, reason: 'no last message' });
    expect(adapters.claude.parse('reply', body('claude', 'stop-which-name').subarray(0, 40))).toEqual({ ok: false, reason: 'not JSON' });
  });

  it('65 536 bytes stay whole; 65 537 are cut with truncated (AC3.1.5)', () => {
    const at = 'a'.repeat(65_536);
    expect(claude(withText(at)).message).toEqual({ text: at, truncated: false, empty: false });
    const over = claude(withText(`${at}b`)).message;
    expect(over).toEqual({ text: at, truncated: true, empty: false });
  });

  it('a cut point inside a 4-byte emoji cuts before it (SCD7)', () => {
    const text = `${'a'.repeat(65_534)}😀tail`;
    const m = claude(withText(text)).message;
    expect(m.truncated).toBe(true);
    expect(m.text).toBe('a'.repeat(65_534));
  });
});

describe('opencode idle payloads (K12, provisional)', () => {
  it('idle-which-name gives the same message as the Claude Code fixture (AC3.1.4)', () => {
    expect(adapters.opencode.parse('reply', body('opencode', 'idle-which-name'))).toEqual(adapters.claude.parse('reply', body('claude', 'stop-which-name')));
  });

  it('joins the text parts of the last assistant message with a blank line', () => {
    expect(adapters.opencode.parse('reply', body('opencode', 'idle-two-parts')).message.text).toBe('The first part.\n\nWhich name should the file have?');
  });

  it('joins a 40 KB and a 30 KB part, then cuts at 64 KB', () => {
    const payload = json('opencode', 'idle-which-name');
    payload.context.messages.at(-1).parts = [
      { type: 'text', text: 'x'.repeat(40_000) },
      { type: 'text', text: 'y'.repeat(30_000) }
    ];
    const m = opencode(payload).message;
    expect(m.truncated).toBe(true);
    expect(Buffer.byteLength(m.text)).toBe(65_536);
    expect(m.text.startsWith(`${'x'.repeat(40_000)}\n\ny`)).toBe(true);
  });

  it('a context with no assistant message is refused with "no last message"', () => {
    const payload = json('opencode', 'idle-which-name');
    payload.context.messages = payload.context.messages.filter((m) => m.info.role !== 'assistant');
    expect(opencode(payload)).toEqual({ ok: false, reason: 'no last message' });
    expect(opencode({ event: payload.event })).toEqual({ ok: false, reason: 'no last message' });
  });

  it('a cut body is refused with "not JSON"', () => {
    expect(adapters.opencode.parse('reply', body('opencode', 'idle-which-name').subarray(0, 30))).toEqual({ ok: false, reason: 'not JSON' });
  });
});
