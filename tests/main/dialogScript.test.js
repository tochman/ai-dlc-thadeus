// US-0506 u1 LC8: the hook script .thadeus/hooks/dialog.sh against a real session folder, under sh and (when
// installed) dash (RD4, R-07). The shell is always spawned explicitly, never the file as an executable.
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { SHELLS } from '../helpers/shells.js';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, '.thadeus/hooks/dialog.sh');
const TMP = path.join(ROOT, 'tests/.tmp');
const SECRET = 'a'.repeat(64);
const C6 = (kind) =>
  `[ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ${kind}; exit 0`;
const REAL_SLEEP = spawnSync('sh', ['-c', 'command -v sleep']).stdout.toString().trim();
/** Real-time cases, one at a time so they do not load each other; their windows carry the design's slack (RD1). */
// US-0010: wall-clock tests retry up to twice; each attempt keeps the full limit. ponytail: retry hides load spikes, not a slow script that fails 3 times in a row.
const timed = (name, fn) => it(name, { timeout: 15_000, retry: 2 }, fn);

mkdirSync(TMP, { recursive: true });
const made = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

/** A fresh session folder with events/, answers/ and alive, as AgentChannel makes it. */
function session({ alive = true, answers = true } = {}) {
  const dir = mkdtempSync(path.join(TMP, 'u1-'));
  made.push(dir);
  mkdirSync(path.join(dir, 'events'));
  if (answers) mkdirSync(path.join(dir, 'answers'));
  if (alive) writeAlive(dir);
  return dir;
}

function writeAlive(dir) {
  const tmp = path.join(dir, 'alive.tmp');
  writeFileSync(tmp, `${Date.now()}\n`);
  renameSync(tmp, path.join(dir, 'alive'));
  return Date.now();
}

/** Keeps alive changing every 500 ms, as the heartbeat does; returns stop(), which gives the last write time. */
const beats = new Set(); // stopped after each test, also when the test failed before its own stop()
afterEach(() => {
  for (const timer of beats) clearInterval(timer);
  beats.clear();
});
function heartbeat(dir) {
  let last = writeAlive(dir);
  const timer = setInterval(() => (last = writeAlive(dir)), 500);
  beats.add(timer);
  return () => {
    clearInterval(timer);
    return last;
  };
}

const envFor = (dir, over = {}) => ({ PATH: process.env.PATH, THADEUS_SESSION_DIR: dir, THADEUS_SESSION_SECRET: SECRET, THADEUS_WAIT_SECONDS: '595', ...over });

/** Runs the script (or `-c cmd`) under `shell`; resolves with its exit code, output and run time. */
function run(shell, args, { env, input = '{}', cwd = ROOT } = {}) {
  const started = Date.now();
  const child = spawn(shell, args, { env, cwd });
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  child.stdout.on('data', (b) => (stdout = Buffer.concat([stdout, b])));
  child.stderr.on('data', (b) => (stderr = Buffer.concat([stderr, b])));
  child.stdin.on('error', () => {}); // the script may exit before it reads stdin
  child.stdin.end(input);
  const done = new Promise((resolve) =>
    child.on('close', (code, signal) => resolve({ code, signal, stdout, stderr, ms: Date.now() - started, endedAt: Date.now() }))
  );
  return { child, done };
}

const files = (dir, sub) => (existsSync(path.join(dir, sub)) ? readdirSync(path.join(dir, sub)) : []);
const waitFor = async (fn, ms = 3000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise((r) => setTimeout(r, 10))) {
    const v = fn();
    if (v) return v;
  }
  throw new Error('timed out');
};
const quiet = (r) => {
  expect(r.code).toBe(0);
  expect(r.stderr.length).toBe(0);
};

/** A bin/ folder with a fake sleep at the front of PATH. */
function fakeSleep(dir, body) {
  const bin = path.join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(path.join(bin, 'sleep'), `#!/bin/sh\n${body}\n`);
  chmodSync(path.join(bin, 'sleep'), 0o755);
  return `${bin}:${process.env.PATH}`;
}

describe.each(SHELLS)('dialog.sh under %s: silent exits (NFR4)', (shell) => {
  it('the C6 command exits at once with no output when the variable is unset or the script is missing (NFR4.1)', async () => {
    const noScript = session();
    for (let i = 0; i < 20; i++) {
      const unset = await run(shell, ['-c', C6('question')], { env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: ROOT } }).done;
      quiet(unset);
      expect(unset.stdout.length).toBe(0);
      expect(unset.ms).toBeLessThanOrEqual(100);
      const missing = await run(shell, ['-c', C6('question')], { env: { ...envFor(noScript), CLAUDE_PROJECT_DIR: noScript } }).done;
      quiet(missing);
      expect(missing.stdout.length).toBe(0);
      expect(missing.ms).toBeLessThanOrEqual(100);
    }
    expect(files(noScript, 'events')).toEqual([]);
  });

  it('a missing folder or alive file ends the hook with nothing written (NFR4.2)', async () => {
    const gone = await run(shell, [SCRIPT, 'question'], { env: envFor(path.join(TMP, 'no-such-folder')) }).done;
    quiet(gone);
    expect(gone.ms).toBeLessThanOrEqual(100);
    const dir = session({ alive: false });
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir) }).done;
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(r.ms).toBeLessThanOrEqual(100);
    expect([...files(dir, 'events'), ...files(dir, 'answers')]).toEqual([]);
  });

  it('an empty or non-numeric THADEUS_WAIT_SECONDS, or an unknown kind, writes nothing (NFR4.3)', async () => {
    const dir = session();
    for (const [kind, w] of [
      ['question', ''],
      ['question', '1x'],
      ['bogus', '595'], // permission is a waiting kind since u2
      ['permission', ''],
      ['', '595']
    ]) {
      const r = await run(shell, [SCRIPT, kind], { env: envFor(dir, { THADEUS_WAIT_SECONDS: w }) }).done;
      quiet(r);
      expect(r.stdout.length).toBe(0);
    }
    expect([...files(dir, 'events'), ...files(dir, 'answers')]).toEqual([]);
  });

  it('events/ not writable: exit 0, nothing on stderr, and the wait marker is removed', async () => {
    const dir = session();
    chmodSync(path.join(dir, 'events'), 0o500);
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir) }).done;
    chmodSync(path.join(dir, 'events'), 0o700);
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(files(dir, 'answers')).toEqual([]);
  });

  it('answers/ missing: exit 0 with nothing on stderr (R-01: no special builtin redirect)', async () => {
    const dir = session({ answers: false });
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir) }).done;
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(files(dir, 'events')).toEqual([]);
  });

  it('a failing sleep ends a waiting hook before any file exists (R-03)', async () => {
    const dir = session();
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir, { PATH: fakeSleep(dir, 'exit 1') }) }).done;
    quiet(r);
    expect([...files(dir, 'events'), ...files(dir, 'answers')]).toEqual([]);
  });

  it('answered writes its event and exits at once, with no wait marker', async () => {
    const dir = session();
    const r = await run(shell, [SCRIPT, 'answered'], { env: envFor(dir), input: '{"done":true}' }).done;
    quiet(r);
    expect(r.ms).toBeLessThan(300);
    const [evt] = files(dir, 'events');
    expect(evt).toMatch(/^\d+-\d+\.evt$/);
    expect(readFileSync(path.join(dir, 'events', evt), 'utf8')).toBe(`THADEUS-EVENT v1 answered ${SECRET}\n{"done":true}`);
    expect(files(dir, 'answers')).toEqual([]);
  });

  it('a payload with shell metacharacters arrives byte for byte and runs nothing (NFR3.8)', async () => {
    const dir = session();
    const payload = '{"q":"$(touch marker) `touch marker` ; touch marker \' \\" åäö"}';
    const r = await run(shell, [SCRIPT, 'answered'], { env: envFor(dir), input: payload, cwd: dir }).done;
    quiet(r);
    const [evt] = files(dir, 'events');
    const body = readFileSync(path.join(dir, 'events', evt));
    expect(body.subarray(body.indexOf(10) + 1).toString('utf8')).toBe(payload);
    expect(existsSync(path.join(dir, 'marker'))).toBe(false);
  });
});

describe.each(SHELLS)('dialog.sh under %s: waiting (NFR5)', (shell) => {
  timed('hands back 2.0 to 2.5 s after alive stops changing (NFR5.1, BR1.2)', async () => {
    const dir = session();
    const last = writeAlive(dir);
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir) }).done;
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(r.endedAt - last).toBeGreaterThanOrEqual(2000);
    expect(r.endedAt - last).toBeLessThanOrEqual(2500);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('keeps waiting while alive changes, then hands back 2.0 to 2.5 s after the last update', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { child, done } = run(shell, [SCRIPT, 'question'], { env: envFor(dir) });
    await new Promise((r) => setTimeout(r, 3000));
    expect(child.exitCode).toBeNull();
    const last = stop();
    const r = await done;
    quiet(r);
    expect(r.endedAt - last).toBeGreaterThanOrEqual(2000);
    expect(r.endedAt - last).toBeLessThanOrEqual(2500);
  });

  timed('gives up by wall clock at THADEUS_WAIT_SECONDS (NFR5.2, BR1.3)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const r = await run(shell, [SCRIPT, 'question'], { env: envFor(dir, { THADEUS_WAIT_SECONDS: '2' }) }).done;
    stop();
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(r.ms).toBeGreaterThanOrEqual(1000);
    expect(r.ms).toBeLessThanOrEqual(3200);
  });

  timed('prints a dropped answer byte for byte within 300 ms and leaves no marker (NFR1.5)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { done } = run(shell, [SCRIPT, 'question'], { env: envFor(dir) });
    const evt = await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    const base = evt.replace(/\.evt$/, '');
    expect(files(dir, 'answers')).toEqual([`${base}.wait`]);
    const answer = '{"hookSpecificOutput":{"permissionDecision":"allow"}} åäö 👍';
    writeFileSync(path.join(dir, 'answers', `${base}.x.tmp`), answer);
    renameSync(path.join(dir, 'answers', `${base}.x.tmp`), path.join(dir, 'answers', `${base}.ans`));
    const dropped = Date.now();
    const r = await done;
    stop();
    quiet(r);
    expect(r.stdout.toString('utf8')).toBe(answer);
    expect(r.endedAt - dropped).toBeLessThanOrEqual(300);
    expect(files(dir, 'answers')).toEqual([]);
    expect(readFileSync(path.join(dir, 'events', evt), 'utf8')).toBe(`THADEUS-EVENT v1 question ${SECRET}\n{}`);
  });

  timed('an empty answer prints nothing and exits within 300 ms (NFR5.3, BR3.5)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { done } = run(shell, [SCRIPT, 'question'], { env: envFor(dir) });
    const evt = await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    writeFileSync(path.join(dir, 'answers', evt.replace(/\.evt$/, '.ans')), '');
    const dropped = Date.now();
    const r = await done;
    stop();
    quiet(r);
    expect(r.stdout.length).toBe(0);
    expect(r.endedAt - dropped).toBeLessThanOrEqual(300);
  });

  timed('TERM to a waiting hook removes its wait marker (RD4)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { child, done } = run(shell, [SCRIPT, 'question'], { env: envFor(dir) });
    await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    expect(files(dir, 'answers').some((f) => f.endsWith('.wait'))).toBe(true);
    child.kill('SIGTERM');
    const r = await done;
    stop();
    expect(r.stdout.length).toBe(0);
    expect(r.stderr.length).toBe(0);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('polls at most 11 times a second (NFR5.11)', async () => {
    const dir = session();
    const count = path.join(dir, 'count');
    const PATH = fakeSleep(dir, `echo x >> "${count}"\nexec ${REAL_SLEEP} "$@"`);
    const stop = heartbeat(dir);
    const { child, done } = run(shell, [SCRIPT, 'question'], { env: envFor(dir, { PATH }) });
    await new Promise((r) => setTimeout(r, 1000));
    const polls = readFileSync(count, 'utf8').split('\n').filter(Boolean).length;
    child.kill('SIGTERM');
    await done;
    stop();
    expect(polls).toBeGreaterThan(0); // the wrapper really counts
    expect(polls).toBeLessThanOrEqual(11);
  });
});

// US-0506 u2 RD14: the same script with the permission argument (AC2.1.3; NFR4.4, NFR4.5, NFR5.13–NFR5.15, NFR5.17,
// NFR5.22; PD7, PD11, SCD7, SD14). Every case asserts exit 0 and 0 bytes on stderr, and on stdout unless an answer prints.
describe.each(SHELLS)('permission argument under %s', (shell) => {
  const silent = (r) => {
    quiet(r);
    expect(r.stdout.length).toBe(0);
  };
  const ALLOW = '{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}';

  it('the exact C6 command exits within 100 ms, 20 runs each, with the variable unset and with the script missing (NFR4.4, PD11)', async () => {
    const noScript = session();
    for (let i = 0; i < 20; i++) {
      const unset = await run(shell, ['-c', C6('permission')], { env: { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: ROOT } }).done;
      silent(unset);
      expect(unset.ms).toBeLessThanOrEqual(100);
      const missing = await run(shell, ['-c', C6('permission')], { env: { ...envFor(noScript), CLAUDE_PROJECT_DIR: noScript } }).done;
      silent(missing);
      expect(missing.ms).toBeLessThanOrEqual(100);
    }
    expect([...files(noScript, 'events'), ...files(noScript, 'answers')]).toEqual([]);
  });

  it('a missing folder or alive file writes nothing (NFR4.5)', async () => {
    silent(await run(shell, [SCRIPT, 'permission'], { env: envFor(path.join(TMP, 'no-such-folder')) }).done);
    const dir = session({ alive: false });
    silent(await run(shell, [SCRIPT, 'permission'], { env: envFor(dir) }).done);
    expect([...files(dir, 'events'), ...files(dir, 'answers')]).toEqual([]);
  });

  it('events/ not writable, and answers/ missing: exit 0, silent, nothing left (NFR4.5, SD14)', async () => {
    const dir = session();
    chmodSync(path.join(dir, 'events'), 0o500);
    const r = await run(shell, [SCRIPT, 'permission'], { env: envFor(dir) }).done;
    chmodSync(path.join(dir, 'events'), 0o700);
    silent(r);
    expect(files(dir, 'answers')).toEqual([]);
    const bare = session({ answers: false });
    silent(await run(shell, [SCRIPT, 'permission'], { env: envFor(bare) }).done);
    expect(files(bare, 'events')).toEqual([]);
  });

  timed('prints a dropped allow output byte for byte within 300 ms and leaves no .wait or .took (PD7, NFR1.9)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { done } = run(shell, [SCRIPT, 'permission'], { env: envFor(dir), input: '{"tool_name":"Bash"}' });
    const evt = await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    const base = evt.replace(/\.evt$/, '');
    expect(files(dir, 'answers')).toEqual([`${base}.wait`]);
    expect(readFileSync(path.join(dir, 'events', evt), 'utf8')).toBe(`THADEUS-EVENT v1 permission ${SECRET}\n{"tool_name":"Bash"}`);
    writeFileSync(path.join(dir, 'answers', `${base}.x.tmp`), ALLOW);
    renameSync(path.join(dir, 'answers', `${base}.x.tmp`), path.join(dir, 'answers', `${base}.ans`));
    const dropped = Date.now();
    const r = await done;
    stop();
    quiet(r);
    expect(r.stdout.toString('utf8')).toBe(ALLOW);
    expect(r.endedAt - dropped).toBeLessThanOrEqual(300);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('an empty answer prints nothing within 300 ms (NFR5.13, NFR5.17)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { done } = run(shell, [SCRIPT, 'permission'], { env: envFor(dir) });
    const evt = await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    writeFileSync(path.join(dir, 'answers', evt.replace(/\.evt$/, '.ans')), '');
    const dropped = Date.now();
    const r = await done;
    stop();
    silent(r);
    expect(r.endedAt - dropped).toBeLessThanOrEqual(300);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('hands back 2.0 to 2.5 s after alive stops changing (NFR5.14, RD12)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const { done } = run(shell, [SCRIPT, 'permission'], { env: envFor(dir) });
    await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    const last = stop();
    const r = await done;
    silent(r);
    expect(r.endedAt - last).toBeGreaterThanOrEqual(2000);
    expect(r.endedAt - last).toBeLessThanOrEqual(2500);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('gives up at THADEUS_WAIT_SECONDS=2 within 1.0 to 3.2 s (NFR5.15)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const r = await run(shell, [SCRIPT, 'permission'], { env: envFor(dir, { THADEUS_WAIT_SECONDS: '2' }) }).done;
    stop();
    silent(r);
    expect(r.ms).toBeGreaterThanOrEqual(1000);
    expect(r.ms).toBeLessThanOrEqual(3200);
    expect(files(dir, 'answers')).toEqual([]);
  });

  timed('a payload with shell metacharacters arrives byte for byte and runs nothing (u1 NFR3.8)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const payload = '{"tool_input":{"command":"$(touch marker) `touch marker` ; touch marker \' \\" åäö"}}';
    const { done } = run(shell, [SCRIPT, 'permission'], { env: envFor(dir), input: payload, cwd: dir });
    const evt = await waitFor(() => files(dir, 'events').find((f) => f.endsWith('.evt')));
    const body = readFileSync(path.join(dir, 'events', evt));
    expect(body.subarray(body.indexOf(10) + 1).toString('utf8')).toBe(payload);
    writeFileSync(path.join(dir, 'answers', evt.replace(/\.evt$/, '.ans')), '');
    silent(await done);
    stop();
    expect(existsSync(path.join(dir, 'marker'))).toBe(false);
  });

  timed('two permission hooks started together get two event files and two wait markers (SCD7, NFR5.22)', async () => {
    const dir = session();
    const stop = heartbeat(dir);
    const a = run(shell, [SCRIPT, 'permission'], { env: envFor(dir), input: '{"n":1}' });
    const b = run(shell, [SCRIPT, 'permission'], { env: envFor(dir), input: '{"n":2}' });
    const evts = await waitFor(() => {
      const list = files(dir, 'events').filter((f) => f.endsWith('.evt'));
      return list.length === 2 && list;
    });
    const waits = files(dir, 'answers').filter((f) => f.endsWith('.wait'));
    expect(new Set(evts).size).toBe(2);
    expect(waits.sort()).toEqual(evts.map((f) => f.replace(/\.evt$/, '.wait')).sort());
    for (const f of evts) writeFileSync(path.join(dir, 'answers', f.replace(/\.evt$/, '.ans')), '');
    silent(await a.done);
    silent(await b.done);
    stop();
  });
});

// US-0214 FR1.1, NFR1: the nine activity entries write one kind, activity, with the payload byte for byte, never wait
// and print nothing (an async hook's output is not read, and a sync one's would reach the agent).
describe.each(SHELLS)('the activity kinds under %s (US-0214)', (shell) => {
  it.each(['pretool', 'posttool', 'toolfail', 'agentstart', 'agentstop', 'prompt', 'message', 'stopfail', 'asking'])(
    '%s writes an activity event, leaves no marker, prints nothing and exits at once',
    async (kind) => {
      const dir = session();
      const payload = `{"hook_event_name":"PreToolUse","tool_name":"Bash","x":"$(touch marker)"}`;
      const r = await run(shell, [SCRIPT, kind], { env: envFor(dir), input: payload, cwd: dir }).done;
      quiet(r);
      expect(r.stdout.length).toBe(0);
      expect(r.ms).toBeLessThan(500);
      const [evt] = files(dir, 'events');
      expect(readFileSync(path.join(dir, 'events', evt), 'utf8')).toBe(`THADEUS-EVENT v1 activity ${SECRET}\n${payload}`);
      expect(files(dir, 'answers')).toEqual([]);
      expect(existsSync(path.join(dir, 'marker'))).toBe(false);
    }
  );

  it('without a session folder an activity kind exits 0, silent, writing nothing (NFR1)', async () => {
    const r = await run(shell, [SCRIPT, 'pretool'], { env: envFor(path.join(TMP, 'no-such-folder')) }).done;
    quiet(r);
    expect(r.stdout.length).toBe(0);
  });
});

// US-0213 FR1.3, FR1.5, FR4.2, NFR3: the SessionStart, Notification and PreCompact kinds never wait.
describe.each(SHELLS)('session, notify, precompact and postcompact under %s (US-0213)', (shell) => {
  it.each(['session', 'notify', 'precompact', 'postcompact'])('%s writes its event byte for byte, leaves no marker and exits at once', async (kind) => {
    const dir = session();
    const payload = `{"source":"clear","notification_type":"idle_prompt","x":"$(touch marker)"}`;
    const r = await run(shell, [SCRIPT, kind], { env: envFor(dir), input: payload, cwd: dir }).done;
    quiet(r);
    expect(r.ms).toBeLessThan(500);
    const [evt] = files(dir, 'events');
    expect(readFileSync(path.join(dir, 'events', evt), 'utf8')).toBe(`THADEUS-EVENT v1 ${kind} ${SECRET}\n${payload}`);
    expect(files(dir, 'answers')).toEqual([]);
    expect(existsSync(path.join(dir, 'marker'))).toBe(false);
  });

  it('precompact prints the instruction the app wrote, and nothing when there is none (FR4.2)', async () => {
    const dir = session();
    const none = await run(shell, [SCRIPT, 'precompact'], { env: envFor(dir) }).done;
    quiet(none);
    expect(none.stdout.length).toBe(0);
    writeFileSync(path.join(dir, 'compact.txt'), 'Keep intent 261117, stage code-generation.\n');
    const r = await run(shell, [SCRIPT, 'precompact'], { env: envFor(dir) }).done;
    quiet(r);
    expect(r.stdout.toString('utf8')).toBe('Keep intent 261117, stage code-generation.\n');
  });

  it('without a session folder every new kind exits 0, silent, writing nothing (NFR3)', async () => {
    for (const kind of ['session', 'notify', 'precompact', 'postcompact']) {
      const r = await run(shell, [SCRIPT, kind], { env: envFor(path.join(TMP, 'no-such-folder')) }).done;
      quiet(r);
      expect(r.stdout.length).toBe(0);
      expect(r.ms).toBeLessThan(300);
    }
  });

  timed('a stdin that never closes still returns within 2.5 s (NFR3)', async () => {
    const dir = session();
    const child = spawn(shell, [SCRIPT, 'notify'], { env: envFor(dir) });
    const started = Date.now();
    child.stdin.write('{"notification_type":"idle_prompt"}');
    const code = await new Promise((resolve) => child.on('close', resolve));
    expect(code).toBe(0);
    expect(Date.now() - started).toBeLessThan(2500);
    child.stdin.destroy();
  });
});
