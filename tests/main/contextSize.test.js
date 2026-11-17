// US-0213 FR1.1, FR1.2: the context size of the last request, from a Claude Code transcript or opencode's tokens.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { contextOfTranscript, opencodeContext, readTranscriptContext } from '../../src/main/contextSize.js';

const assistant = (usage, model = 'claude-opus-4-5') => JSON.stringify({ type: 'assistant', message: { role: 'assistant', model, usage } });
const USAGE = { input_tokens: 12, cache_read_input_tokens: 150_000, cache_creation_input_tokens: 3_000, output_tokens: 400 };

describe('contextOfTranscript (FR1.1)', () => {
  it('the last assistant usage gives input + cache read + cache write, and its model', () => {
    const text = [assistant({ ...USAGE, input_tokens: 1 }), JSON.stringify({ type: 'user' }), assistant(USAGE)].join('\n');
    expect(contextOfTranscript(text)).toEqual({ tokens: 153_012, model: 'claude-opus-4-5' });
  });

  it('a half-written last line is skipped', () => {
    const text = `${assistant(USAGE)}\n{"type":"assistant","message":{"usage":{"input_tok`;
    expect(contextOfTranscript(text)).toEqual({ tokens: 153_012, model: 'claude-opus-4-5' });
  });

  it('no usage gives null, never 0', () => {
    expect(contextOfTranscript([JSON.stringify({ type: 'user' }), JSON.stringify({ type: 'assistant', message: {} })].join('\n'))).toBeNull();
    expect(contextOfTranscript('')).toBeNull();
  });
});

describe('readTranscriptContext (FR1.1)', () => {
  let dir;
  beforeEach(() => (dir = mkdtempSync(path.join(os.tmpdir(), 'ctx-'))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reads the tail of a transcript inside the allowed folder', async () => {
    const file = path.join(dir, 'a.jsonl');
    writeFileSync(file, `${'x'.repeat(300_000)}\n${assistant(USAGE)}\n`);
    expect(await readTranscriptContext(file, dir)).toEqual({ tokens: 153_012, model: 'claude-opus-4-5' });
  });

  it('a missing file, a path outside the folder or a non-string gives null', async () => {
    expect(await readTranscriptContext(path.join(dir, 'gone.jsonl'), dir)).toBeNull();
    expect(await readTranscriptContext(path.join(os.tmpdir(), 'elsewhere.jsonl'), dir)).toBeNull();
    expect(await readTranscriptContext(`${dir}/../x.jsonl`, dir)).toBeNull();
    expect(await readTranscriptContext(42, dir)).toBeNull();
  });
});

describe('opencodeContext (FR1.2)', () => {
  it('maps a message’s tokens to the same shape', () => {
    const info = { role: 'assistant', modelID: 'claude-sonnet-4-5', tokens: { input: 10, output: 5, reasoning: 0, cache: { read: 90_000, write: 1_000 } } };
    expect(opencodeContext(info)).toEqual({ tokens: 91_010, model: 'claude-sonnet-4-5' });
  });

  it('no tokens gives null', () => {
    expect(opencodeContext({ role: 'assistant' })).toBeNull();
    expect(opencodeContext(null)).toBeNull();
  });
});
