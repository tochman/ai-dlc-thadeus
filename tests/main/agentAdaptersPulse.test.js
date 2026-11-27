// US-0418 FR3, FR5, FR6: the file paths a tool call touches, and their way through the adapters.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { adapters } from '../../src/main/agentAdapters.js';
import { MAX_PATHS, pulsePaths } from '../../src/main/pulse.js';

const ROOT = '/Users/dev/proj';
const FIX = path.resolve(__dirname, '../fixtures/agent-events');

describe('pulsePaths', () => {
  it('Read gives its file as a read, relative to the project (FR3.1)', () => {
    expect(pulsePaths('Read', { file_path: `${ROOT}/src/a.js` }, ROOT, ROOT)).toEqual([{ path: 'src/a.js', kind: 'read' }]);
  });

  it('Write, Edit and MultiEdit are writes, also in opencode spelling (FR3.1, FR6.1)', () => {
    for (const tool of ['Write', 'Edit', 'MultiEdit'])
      expect(pulsePaths(tool, { file_path: `${ROOT}/b.md` }, ROOT, ROOT)).toEqual([{ path: 'b.md', kind: 'write' }]);
    expect(pulsePaths('edit', { filePath: 'src/c.js' }, null, null)).toEqual([{ path: 'src/c.js', kind: 'write' }]);
  });

  it('Grep and Glob read the path in their input, not their pattern (FR3.2)', () => {
    expect(pulsePaths('Grep', { pattern: 'secret', path: `${ROOT}/src` }, ROOT, ROOT)).toEqual([{ path: 'src', kind: 'read' }]);
    expect(pulsePaths('Glob', { pattern: '**/*.js', path: 'tests' }, ROOT, ROOT)).toEqual([{ path: 'tests', kind: 'read' }]);
    expect(pulsePaths('Grep', { pattern: 'x' }, ROOT, ROOT)).toBeNull();
  });

  it('a shell command gives a best-guess read for each path-like word (FR3.3)', () => {
    expect(pulsePaths('Bash', { command: 'cat src/a.js && wc -l ./docs/b.md --flag' }, ROOT, ROOT)).toEqual([
      { path: 'src/a.js', kind: 'read' },
      { path: 'docs/b.md', kind: 'read' }
    ]);
  });

  it('keeps no path outside the project: it becomes one outside mark (FR5.1, FR5.2)', () => {
    const out = pulsePaths('Bash', { command: 'cat /etc/hosts ../other/x.js ~/notes.txt src/a.js' }, ROOT, ROOT);
    expect(out).toEqual([
      { outside: true, kind: 'read' },
      { path: 'src/a.js', kind: 'read' }
    ]);
    expect(pulsePaths('Read', { file_path: '/etc/passwd' }, null, null)).toEqual([{ outside: true, kind: 'read' }]);
  });

  it('is bounded: at most MAX_PATHS entries, no control characters, at most 256 characters (FR5.1)', () => {
    const many = Array.from({ length: 50 }, (_, i) => `f${i}.js`).join(' ');
    expect(pulsePaths('Bash', { command: many }, ROOT, ROOT)).toHaveLength(MAX_PATHS);
    const [only] = pulsePaths('Read', { file_path: `a\u0007b/${'x'.repeat(400)}.js` }, ROOT, ROOT);
    expect(only.path).not.toMatch(/\p{Cc}/u);
    expect(only.path.length).toBeLessThanOrEqual(256);
  });

  it('gives null for an unknown tool or an input with no path', () => {
    expect(pulsePaths('WebFetch', { url: 'https://x/y.js' }, ROOT, ROOT)).toBeNull();
    expect(pulsePaths('Read', null, ROOT, ROOT)).toBeNull();
    expect(pulsePaths(undefined, {}, ROOT, ROOT)).toBeNull();
  });
});

describe('the adapters carry the paths (FR3.1, FR5.3)', () => {
  const claude = (payload) => adapters.claude.parse('activity', Buffer.from(JSON.stringify({ session_id: 'cc-1', cwd: ROOT, ...payload }))).activity;

  it('a Claude Code tool start and an opencode one carry bounded paths', () => {
    expect(claude({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_use_id: 't1', tool_input: { file_path: `${ROOT}/a.js` } }).paths).toEqual([
      { path: 'a.js', kind: 'read' }
    ]);
    const oc = adapters.opencode.parse(
      'activity',
      Buffer.from(JSON.stringify({ type: 'session.tool.input.started', data: { sessionID: 'o1', callID: 'c1', tool: 'write', input: { filePath: 'b.md' } } }))
    );
    expect(oc.activity.paths).toEqual([{ path: 'b.md', kind: 'write' }]);
  });

  it('no fixture tool input lets an absolute path, content or command text through', () => {
    for (const name of readdirSync(path.join(FIX, 'claude'))) {
      const body = JSON.parse(readFileSync(path.join(FIX, 'claude', name), 'utf8'));
      if (!body.tool_input || typeof body.tool_input !== 'object') continue;
      const act = claude({ ...body, cwd: body.cwd ?? ROOT, hook_event_name: 'PreToolUse', tool_use_id: 't1' });
      if (!act) continue;
      const text = JSON.stringify(act.paths ?? null);
      expect(text).not.toMatch(/"path":"[/~]/);
      for (const v of Object.values(body.tool_input)) if (typeof v === 'string' && v.length > 40) expect(text).not.toContain(v);
    }
  });
});
