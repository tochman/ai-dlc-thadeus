// US-0506 u3 LC8: the Stop branch of .thadeus/hooks/dialog.sh (`reply`, BR6.1, RD10, K10) against a real session
// folder, under sh and (when installed) dash. Real time: this file runs in the `scripts` project (vitest.config.mjs).
// Every case: exit 0 and nothing on stdout or stderr, whatever happens.
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createAgentChannel } from '../../src/main/agentChannel.js';
import { SHELLS } from '../helpers/shells.js';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, '.thadeus/hooks/dialog.sh');
const TMP = path.join(ROOT, 'tests/.tmp');
const SECRET = 'b'.repeat(64);
const FIXTURE = path.join(ROOT, 'tests/fixtures/agent-events/claude/stop-which-name.json');
const STOP = `[ -n "$THADEUS_SESSION_DIR" ] && [ -f "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" ] && sh "$CLAUDE_PROJECT_DIR/.thadeus/hooks/dialog.sh" reply; exit 0`;
// US-0010: wall-clock tests retry up to twice; each attempt keeps the full limit. ponytail: retry hides load spikes, not a slow script that fails 3 times in a row.
const timed = (name, fn) => it(name, { timeout: 15_000, retry: 2 }, fn);
const header = (secret = SECRET) => Buffer.from(`THADEUS-EVENT v1 reply ${secret}\n`);

mkdirSync(TMP, { recursive: true });
const made = [];
afterAll(() => {
  for (const d of made) {
    try {
      chmodSync(d, 0o700);
      if (existsSync(path.join(d, 'events'))) chmodSync(path.join(d, 'events'), 0o700);
    } catch {
      // already gone
    }
    rmSync(d, { recursive: true, force: true });
  }
});

/** A fresh session folder with events/, answers/ and alive, as AgentChannel makes it. */
function session({ alive = true } = {}) {
  const dir = mkdtempSync(path.join(TMP, 'u3-'));
  made.push(dir);
  mkdirSync(path.join(dir, 'events'));
  mkdirSync(path.join(dir, 'answers'));
  if (alive) {
    writeFileSync(path.join(dir, 'alive.tmp'), `${Date.now()}\n`);
    renameSync(path.join(dir, 'alive.tmp'), path.join(dir, 'alive'));
  }
  return dir;
}
const envFor = (dir, over = {}) => ({ PATH: process.env.PATH, THADEUS_SESSION_DIR: dir, THADEUS_SESSION_SECRET: SECRET, THADEUS_WAIT_SECONDS: '595', ...over });
const evtFiles = (dir) =>
  existsSync(path.join(dir, 'events'))
    ? readdirSync(path.join(dir, 'events')).filter((n) => n.endsWith('.evt') && statSync(path.join(dir, 'events', n)).isFile())
    : [];
const evtBody = (dir) => readFileSync(path.join(dir, 'events', evtFiles(dir)[0]));

/**
 * Runs `shell args`; `input` is written and stdin closed at once, unless `holdMs` keeps it open that long after it.
 * Resolves with the exit code, output, the time to `exit` and the gap from `exit` to stdout's EOF.
 */
function run(shell, args, { env, input = Buffer.alloc(0), holdMs = 0, stdinClosed = false, beforeEnd } = {}) {
  const started = Date.now();
  const child = spawn(shell, args, { env, cwd: ROOT, stdio: [stdinClosed ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
  let stdout = Buffer.alloc(0);
  let stderr = Buffer.alloc(0);
  let exitAt = 0;
  let hold = null;
  child.stdout.on('data', (b) => (stdout = Buffer.concat([stdout, b])));
  child.stderr.on('data', (b) => (stderr = Buffer.concat([stderr, b])));
  const eof = new Promise((resolve) => child.stdout.on('end', () => resolve(Date.now())));
  if (child.stdin) {
    child.stdin.on('error', () => {});
    child.stdin.write(input);
    const end = () => child.stdin.end();
    if (holdMs) hold = setTimeout(end, holdMs);
    else if (beforeEnd) beforeEnd(child).then(end);
    else end();
  }
  return new Promise((resolve) =>
    child.on('exit', async (code) => {
      exitAt = Date.now();
      const eofAt = await eof;
      clearTimeout(hold);
      child.stdin?.destroy();
      resolve({ code, stdout, stderr, ms: exitAt - started, eofGap: eofAt - exitAt });
    })
  );
}
const reply = (shell, dir, opts = {}) => run(shell, [SCRIPT, 'reply'], { env: envFor(dir), ...opts });
const silent = (r) => {
  expect(r.code).toBe(0);
  expect(r.stdout.length).toBe(0);
  expect(r.stderr.length).toBe(0);
};

/** Cases 1 to 6, each reduced to what must be the same under every shell (case 10). */
const outcomes = {
  async big(shell) {
    const dir = session();
    const input = Buffer.alloc(1_048_576, 'x');
    const r = await reply(shell, dir, { input });
    return { r, evts: evtFiles(dir).length, same: evtFiles(dir).length === 1 && evtBody(dir).equals(Buffer.concat([header(), input])) };
  },
  async held(shell) {
    const dir = session();
    const input = Buffer.alloc(200, 'y');
    const r = await reply(shell, dir, { input, holdMs: 8000 });
    return { r, evts: evtFiles(dir).length, same: evtFiles(dir).length === 1 && evtBody(dir).equals(Buffer.concat([header(), input])) };
  },
  async capped(shell) {
    const dir = session();
    const r = await reply(shell, dir, { input: Buffer.alloc(1_200_000, 'z') });
    return { r, evts: evtFiles(dir).length, same: evtFiles(dir).length === 1 && evtBody(dir).length - header().length === 1_048_577 };
  },
  async closed(shell) {
    const dir = session();
    const r = await run(shell, ['-c', `exec <&- ${shell} "${SCRIPT}" reply`], { env: envFor(dir), stdinClosed: true });
    return { r, evts: evtFiles(dir).length, same: true };
  },
  async unwritable(shell) {
    const results = [];
    const a = session(); // events/ not writable
    chmodSync(path.join(a, 'events'), 0o500);
    results.push({ r: await reply(shell, a, { input: Buffer.from('{}') }), dir: a });
    const b = session(); // the session folder (and its events/) read-only
    chmodSync(path.join(b, 'events'), 0o500);
    chmodSync(b, 0o500);
    results.push({ r: await reply(shell, b, { input: Buffer.from('{}') }), dir: b });
    const c = session(); // a folder planted at the .evt name: the pid is the script's own after exec
    const planted = (child) => {
      const s = Math.floor(Date.now() / 1000);
      for (const t of [s - 1, s, s + 1, s + 2]) mkdirSync(path.join(c, 'events', `${t}-${child.pid}.evt`));
      return Promise.resolve();
    };
    results.push({ r: await run(shell, ['-c', `exec ${shell} "${SCRIPT}" reply`], { env: envFor(c), input: Buffer.from('{}'), beforeEnd: planted }), dir: c });
    chmodSync(b, 0o700);
    return { r: results.map((x) => x.r), evts: results.reduce((n, x) => n + evtFiles(x.dir).length, 0), same: true };
  },
  async absent(shell) {
    const noScript = mkdtempSync(path.join(TMP, 'u3-noscript-'));
    made.push(noScript);
    const noAlive = session({ alive: false });
    const variants = [
      { PATH: process.env.PATH, CLAUDE_PROJECT_DIR: ROOT }, // the variable unset
      { ...envFor(session()), CLAUDE_PROJECT_DIR: noScript }, // the script folder deleted
      { ...envFor(noAlive), CLAUDE_PROJECT_DIR: ROOT } // alive missing: the app is gone
    ];
    const runs = [];
    for (const env of variants) for (let i = 0; i < 20; i++) runs.push(await run(shell, ['-c', STOP], { env, input: Buffer.from('{"a":1}') }));
    return { r: runs, evts: evtFiles(noAlive).length, same: true, slowest: Math.max(...runs.map((x) => x.ms)) };
  }
};
const shape = ({ r, evts, same }) => ({
  codes: [r].flat().map((x) => x.code),
  out: [r].flat().map((x) => x.stdout.length + x.stderr.length),
  evts,
  same
});

describe.each(SHELLS)('dialog.sh reply under %s (BR6.1, RD10)', (shell) => {
  timed('1. a 1 048 576-byte stdin closed at once: one .evt, the C1 header, the body byte for byte, under 1 s (NFR4.5)', async () => {
    const o = await outcomes.big(shell);
    silent(o.r);
    expect(o.evts).toBe(1);
    expect(o.same).toBe(true);
    expect(o.r.ms).toBeLessThan(1000);
  });

  timed('2. stdin held open after 200 bytes: exits between 1.9 and 2.6 s with those 200 bytes (RD10, review R-04)', async () => {
    const o = await outcomes.held(shell);
    silent(o.r);
    expect(o.r.ms).toBeGreaterThanOrEqual(1900);
    expect(o.r.ms).toBeLessThanOrEqual(2600);
    expect(o.evts).toBe(1);
    expect(o.same).toBe(true);
  });

  timed('3. a 1 200 000-byte stdin: the body is cut at exactly 1 048 577 bytes (review R-05)', async () => {
    const o = await outcomes.capped(shell);
    silent(o.r);
    expect(o.same).toBe(true);
  });

  timed('4. stdin closed: no .evt (NFR4.7)', async () => {
    const o = await outcomes.closed(shell);
    silent(o.r);
    expect(o.evts).toBe(0);
  });

  timed('5. events/ not writable, the folder read-only, or a folder at the .evt name: no .evt (NFR4.7)', async () => {
    const o = await outcomes.unwritable(shell);
    o.r.forEach(silent);
    expect(o.evts).toBe(0);
  });

  it('6. the app absent: the exact C6 Stop string ends within 100 ms in each of 20 runs (PD7, NFR4.4, NFR4.8)', { timeout: 30_000, retry: 2 }, async () => {
    const o = await outcomes.absent(shell);
    o.r.forEach(silent);
    expect(o.evts).toBe(0);
    expect(o.slowest).toBeLessThanOrEqual(100);
  });

  timed('7. stdout reaches EOF when the script exits, with stdin held open: no head or sleep keeps it (RD10)', async () => {
    const r = await reply(shell, session(), { input: Buffer.from('{}'), holdMs: 8000 });
    silent(r);
    expect(r.ms).toBeLessThan(3000);
    expect(r.eofGap).toBeLessThan(200);
  });
});

describe('dialog.sh reply: source and wiring', () => {
  it('8. the branch has no while, no answers/, one sleep only inside the watchdog, no redirect on : or exec (NFR5.24, SCD10)', () => {
    const src = readFileSync(SCRIPT, 'utf8');
    // US-0213: the branch also serves session, notify and precompact, with the same checks; US-0214 adds activity.
    const start = src.indexOf('case $kind in reply | session | notify | precompact | postcompact | activity)');
    expect(start).toBeGreaterThan(-1);
    const branch = src.slice(start, src.indexOf('\nesac\n', start) + 5);
    expect(branch).not.toMatch(/\bwhile\b/);
    expect(branch).not.toMatch(/answers\//);
    expect(branch.match(/\bsleep\b/g)).toHaveLength(1);
    expect(branch).toMatch(/\(\s*sleep 2; kill "\$c"\s*\)/);
    expect(branch).not.toMatch(/(^|[;&|{(]|\n)\s*(:|exec)\b[^\n]*[<>]/);
    expect(src).toMatch(/kind=\$\{1:-\}\ncase \$kind in\n/);
    expect(src).toMatch(/^\s*answered \| reply \| session \| notify \| precompact \| postcompact\) waits=0 ;;$/m);
    expect(src).toMatch(
      /^\s*pretool \| posttool \| toolfail \| agentstart \| agentstop \| prompt \| message \| stopfail \| asking\) waits=0 kind=activity ;;$/m
    );
  });

  let base, channel;
  beforeEach(() => {
    base = mkdtempSync(path.join(TMP, 'u3-ch-'));
    channel = createAgentChannel({ root: path.join(base, 'agent-channel'), log: () => {} });
  });
  afterEach(async () => {
    await channel.dispose();
    rmSync(base, { recursive: true, force: true });
  });

  it.each(SHELLS)('9. under %s the real script gives one raw reply event whose body is the fixture', { timeout: 10_000 }, async (shell) => {
    const raws = [];
    channel.onRawEvent((raw) => raws.push(raw));
    const { sessionId, env } = await channel.openSession({ projectId: 'p1', tabId: 'agent:claude', harness: 'claude' });
    const input = readFileSync(FIXTURE);
    const r = await run(shell, [SCRIPT, 'reply'], { env: { PATH: process.env.PATH, ...env }, input });
    silent(r);
    for (const end = Date.now() + 3000; Date.now() < end && raws.length === 0; await new Promise((res) => setTimeout(res, 10)));
    expect(raws).toHaveLength(1);
    expect(raws[0]).toMatchObject({ sessionId, kind: 'reply' });
    expect(raws[0].body.equals(input)).toBe(true);
  });

  it('10. every shell gives the same exit status and output for cases 1 to 6 (NFR8.5)', { timeout: 60_000 }, async () => {
    const per = [];
    for (const shell of SHELLS) {
      const row = {};
      for (const [name, fn] of Object.entries(outcomes)) row[name] = shape(await fn(shell));
      per.push(row);
    }
    for (const row of per.slice(1)) expect(row).toEqual(per[0]);
  });
});
