// US-0506 u1 LC9: the opencode plugin with a stubbed V2 ctx and a real session folder (RD1, RD2, RD8; NFR5.7).
// Real timers: the plugin's waits run against real file I/O, so the liveness and deadline cases take 1 to 2.5 s.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp');
const FIX = path.resolve(__dirname, '../fixtures/agent-events/opencode');
const SECRET = 'c'.repeat(64);
const fixture = (name) => JSON.parse(readFileSync(path.join(FIX, `${name}.json`), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (fn, ms = 3000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) {
    const v = fn();
    if (v) return v;
  }
  throw new Error('timed out');
};
mkdirSync(TMP, { recursive: true });

let dir, ctx, handlers, beat;
const files = (sub) => readdirSync(path.join(dir, sub));
const writeAlive = () => writeFileSync(path.join(dir, 'alive'), `${Date.now()}\n`);

async function load({ env = true, reply = vi.fn(async () => {}), wait = '595', permReply = vi.fn(async () => {}) } = {}) {
  vi.resetModules();
  if (env) {
    process.env.THADEUS_SESSION_DIR = dir;
    process.env.THADEUS_SESSION_SECRET = SECRET;
    process.env.THADEUS_WAIT_SECONDS = wait;
  } else {
    // US-0018: run inside the app's own terminal, these are set already; the case needs them unset.
    delete process.env.THADEUS_SESSION_DIR;
    delete process.env.THADEUS_SESSION_SECRET;
    delete process.env.THADEUS_WAIT_SECONDS;
  }
  handlers = {};
  ctx = {
    event: { on: vi.fn((type, fn) => (handlers[type] = fn)) },
    session: reply === null ? {} : { form: { reply } }, // null: no reply member at all
    permission: permReply === null ? { hook: vi.fn() } : { reply: permReply, hook: vi.fn() }, // US-0506 u2
    log: { error: vi.fn(), info: vi.fn() }
  };
  const plugin = (await import('../../.opencode/plugins/thadeus-dialog.js')).default;
  expect(plugin.id).toBe('thadeus-dialog');
  await plugin.setup(ctx);
  return ctx;
}

beforeEach(() => {
  dir = mkdtempSync(path.join(TMP, 'oc-'));
  mkdirSync(path.join(dir, 'events'));
  mkdirSync(path.join(dir, 'answers'));
  writeAlive();
  beat = setInterval(writeAlive, 500);
});
afterEach(() => {
  clearInterval(beat);
  delete process.env.THADEUS_SESSION_DIR;
  delete process.env.THADEUS_SESSION_SECRET;
  delete process.env.THADEUS_WAIT_SECONDS;
  rmSync(dir, { recursive: true, force: true });
});

/** Fires form.created and returns the base name of the event file it wrote. */
async function ask(name = 'gate-2026-11-14') {
  const returned = handlers['form.created'](fixture(name));
  expect(returned).toBeUndefined(); // the wait runs in its own task, never awaited by the handler
  const evt = await waitFor(() => files('events').find((f) => f.endsWith('.evt')));
  return evt.replace(/\.evt$/, '');
}
function answer(base, text) {
  writeFileSync(path.join(dir, 'answers', `${base}.t.tmp`), text);
  renameSync(path.join(dir, 'answers', `${base}.t.tmp`), path.join(dir, 'answers', `${base}.ans`));
}

describe('opencode plugin (thadeus-dialog.js)', () => {
  it('without THADEUS_SESSION_DIR registers nothing and writes nothing (FR4.4)', async () => {
    await load({ env: false });
    expect(ctx.event.on).not.toHaveBeenCalled();
    expect([...files('events'), ...files('answers')]).toEqual([]);
  });

  it('form.created writes a C1 event file, with the wait marker before the rename (RD2 step 1)', async () => {
    await load();
    const base = await ask();
    expect(base).toMatch(/^\d+-\d+$/);
    expect(files('answers')).toEqual([`${base}.wait`]);
    const body = readFileSync(path.join(dir, 'events', `${base}.evt`), 'utf8');
    expect(body.split('\n')[0]).toBe(`THADEUS-EVENT v1 question ${SECRET}`);
    expect(JSON.parse(body.slice(body.indexOf('\n') + 1))).toEqual(fixture('gate-2026-11-14'));
  });

  it('takes a dropped answer, replies with it and leaves no marker', async () => {
    const reply = vi.fn(async () => {});
    await load({ reply });
    const base = await ask();
    answer(base, '{"q0":"Complete workflow"}');
    await waitFor(() => reply.mock.calls.length === 1);
    expect(reply).toHaveBeenCalledWith({ sessionID: 'ses_7d1c0b2a9e', formID: 'frm_gate20261114', answer: { q0: 'Complete workflow' } });
    await waitFor(() => files('answers').length === 0);
  });

  it('an empty answer hands back without a reply', async () => {
    const reply = vi.fn(async () => {});
    await load({ reply });
    const base = await ask();
    answer(base, '');
    await waitFor(() => files('answers').length === 0);
    expect(reply).not.toHaveBeenCalled();
  });

  it('a missing or rejecting reply leaves .nack and throws nothing (NFR5.7, RD8)', async () => {
    for (const reply of [null, vi.fn(async () => Promise.reject(new Error('no such form')))]) {
      for (const f of files('answers')) rmSync(path.join(dir, 'answers', f));
      for (const f of files('events')) rmSync(path.join(dir, 'events', f));
      await load({ reply });
      const base = await ask();
      answer(base, '{"q0":"Complete workflow"}');
      await waitFor(() => files('answers').includes(`${base}.nack`) && !files('answers').includes(`${base}.wait`));
      expect(files('answers')).toEqual([`${base}.nack`]);
    }
  });

  it('logs an fs error on the event write and throws nothing', async () => {
    await load();
    rmSync(path.join(dir, 'events'), { recursive: true });
    expect(() => handlers['form.created'](fixture('gate-2026-11-14'))).not.toThrow();
    await waitFor(() => ctx.log.error.mock.calls.length === 1);
    expect(existsSync(path.join(dir, 'events'))).toBe(false);
    await waitFor(() => files('answers').length === 0);
  });

  it('two events in the same millisecond get different names', async () => {
    await load();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    handlers['form.replied'](fixture('form-replied'));
    handlers['form.cancelled'](fixture('form-cancelled'));
    await waitFor(() => files('events').filter((f) => f.endsWith('.evt')).length === 2);
    vi.restoreAllMocks();
    const names = files('events').sort();
    expect(names).toEqual([`1700000000000-${process.pid}.evt`, `1700000000001-${process.pid}.evt`]);
    for (const n of names) expect(readFileSync(path.join(dir, 'events', n), 'utf8').split('\n')[0]).toBe(`THADEUS-EVENT v1 answered ${SECRET}`);
  });

  it('ends the wait with no reply when alive stops changing for 2000 ms (BR1.2)', { timeout: 10_000 }, async () => {
    const reply = vi.fn(async () => {});
    await load({ reply });
    await ask();
    clearInterval(beat);
    const stopped = Date.now();
    await waitFor(() => files('answers').length === 0, 4000);
    expect(Date.now() - stopped).toBeGreaterThanOrEqual(1900);
    expect(Date.now() - stopped).toBeLessThanOrEqual(2700);
    expect(reply).not.toHaveBeenCalled();
  });

  it('ends the wait at THADEUS_WAIT_SECONDS (BR1.3)', { timeout: 10_000 }, async () => {
    await load({ wait: '1' });
    const started = Date.now();
    await ask();
    await waitFor(() => files('answers').length === 0, 3000);
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    expect(Date.now() - started).toBeLessThanOrEqual(1600);
  });
});

// US-0506 u2 LC9: the permission path (BR5.2, BR5.11; RD13, SD8; NFR3.13, NFR5.19, NFR8.6).
describe('opencode plugin: permissions', () => {
  const REQ = 'per_9a1f20b3c4';
  const asked = () => fixture('permission-asked-always');
  const evts = () => files('events').filter((f) => f.endsWith('.evt'));
  const kindOf = (f) =>
    readFileSync(path.join(dir, 'events', f), 'utf8')
      .split('\n')[0]
      .split(' ')[2];
  const bodyOf = (f) => {
    const s = readFileSync(path.join(dir, 'events', f), 'utf8');
    return JSON.parse(s.slice(s.indexOf('\n') + 1));
  };
  async function askPermission(event = asked()) {
    let waitFirst = false;
    const before = new Set(evts());
    expect(handlers['permission.asked'](event)).toBeUndefined();
    const evt = await waitFor(() => {
      const f = evts().find((n) => !before.has(n));
      if (f) waitFirst = files('answers').includes(f.replace(/\.evt$/, '.wait'));
      return f;
    });
    expect(waitFirst).toBe(true); // RD13: the wait marker exists before the event can be seen
    return evt.replace(/\.evt$/, '');
  }
  const replied = () => handlers['permission.replied'](fixture('permission-replied'));

  it('permission.asked writes a C1 permission event with the event unchanged, and its wait marker', async () => {
    await load();
    const base = await askPermission();
    expect(kindOf(`${base}.evt`)).toBe('permission');
    expect(readFileSync(path.join(dir, 'events', `${base}.evt`), 'utf8').split('\n')[0]).toBe(`THADEUS-EVENT v1 permission ${SECRET}`);
    expect(bodyOf(`${base}.evt`)).toEqual(asked());
  });

  it.each(['once', 'always', 'reject'])('an answer file %s gives exactly one reply with that decision and leaves no marker (NFR2.4)', async (decision) => {
    const permReply = vi.fn(async () => {});
    await load({ permReply });
    const base = await askPermission();
    answer(base, decision);
    await waitFor(() => files('answers').length === 0);
    expect(permReply.mock.calls).toEqual([[{ sessionID: 'ses_7d1c0b2a9e', requestID: REQ, decision }]]);
  });

  it('any other answer text gives no reply (SD8)', async () => {
    const permReply = vi.fn(async () => {});
    await load({ permReply });
    for (const text of ['', 'allow', 'once\n', 'ALWAYS']) {
      const base = await askPermission();
      answer(base, text);
      await waitFor(() => files('answers').length === 0);
    }
    expect(permReply).not.toHaveBeenCalled();
  });

  it('permission.replied before the answer file means no reply; each replied writes an answered event (BR5.11, NFR5.19)', async () => {
    const permReply = vi.fn(async () => {});
    await load({ permReply });
    const base = await askPermission();
    replied();
    await waitFor(() => evts().some((f) => kindOf(f) === 'answered'));
    const ans = evts().find((f) => kindOf(f) === 'answered');
    expect(bodyOf(ans).properties.requestID).toBe(REQ);
    answer(base, 'once');
    await waitFor(() => files('answers').length === 0);
    expect(permReply).not.toHaveBeenCalled();
  });

  it('permission.replied after the reply changes nothing: one reply', async () => {
    const permReply = vi.fn(async () => {});
    await load({ permReply });
    const base = await askPermission();
    answer(base, 'always');
    await waitFor(() => permReply.mock.calls.length === 1 && files('answers').length === 0);
    replied();
    await waitFor(() => evts().some((f) => kindOf(f) === 'answered'));
    expect(permReply).toHaveBeenCalledTimes(1);
  });

  it('replied during reply: one reply call, nothing thrown, .nack and the answered event exist (RD13, review R-06)', async () => {
    const permReply = vi.fn(async () => {
      replied();
      throw new Error('already answered');
    });
    await load({ permReply });
    const base = await askPermission();
    answer(base, 'once');
    await waitFor(() => files('answers').includes(`${base}.nack`) && !files('answers').includes(`${base}.wait`));
    await waitFor(() => evts().some((f) => kindOf(f) === 'answered'));
    expect(permReply).toHaveBeenCalledTimes(1);
    expect(files('answers')).toEqual([`${base}.nack`]);
  });

  it('a rejecting or missing reply leaves .nack and throws nothing; an fs error on the event write is logged (NFR5.19)', async () => {
    for (const permReply of [vi.fn(async () => Promise.reject(new Error('no such request'))), null]) {
      for (const f of files('answers')) rmSync(path.join(dir, 'answers', f));
      await load({ permReply });
      const base = await askPermission();
      answer(base, 'reject');
      await waitFor(() => files('answers').includes(`${base}.nack`) && !files('answers').includes(`${base}.wait`));
    }
    rmSync(path.join(dir, 'events'), { recursive: true });
    expect(() => handlers['permission.asked'](asked())).not.toThrow();
    expect(() => replied()).not.toThrow();
    await waitFor(() => ctx.log.error.mock.calls.length === 2);
  });

  it('three permission.asked in the same millisecond get three names and wait at once (SCD7)', async () => {
    await load();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    for (let i = 0; i < 3; i++) handlers['permission.asked'](asked());
    await waitFor(() => evts().length === 3 && files('answers').length === 3);
    vi.restoreAllMocks();
    expect(evts().sort()).toEqual([0, 1, 2].map((n) => `${1_700_000_000_000 + n}-${process.pid}.evt`));
    for (const f of evts()) answer(f.replace(/\.evt$/, ''), '');
    await waitFor(() => files('answers').length === 0);
  });

  it('never calls ctx.permission.hook, and the source holds no evaluate (SD8, NFR3.13)', async () => {
    await load();
    const base = await askPermission();
    answer(base, 'once');
    await waitFor(() => files('answers').length === 0);
    expect(ctx.permission.hook).not.toHaveBeenCalled();
    expect(readFileSync(path.resolve(__dirname, '../../.opencode/plugins/thadeus-dialog.js'), 'utf8')).not.toContain('evaluate');
  });

  it('writes nothing to the console on the quiet paths: asked, a reply, a hand-back, replied (OD8)', async () => {
    const spies = ['log', 'info', 'warn', 'error'].map((m) => vi.spyOn(console, m));
    await load();
    let base = await askPermission();
    answer(base, 'once');
    await waitFor(() => files('answers').length === 0);
    base = await askPermission();
    answer(base, '');
    await waitFor(() => files('answers').length === 0);
    replied();
    await waitFor(() => evts().some((f) => kindOf(f) === 'answered'));
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(ctx.log.error).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

// US-0213 FR1.2, FR1.5, FR4.2, FR5.1, FR8.1: the plugin's report-only events. V2 envelope { type, data }, with the
// older { properties } still read. Every handler returns at once and never throws to opencode.
describe('opencode plugin: session handoff reports (US-0213)', () => {
  const evts = () => files('events').filter((f) => f.endsWith('.evt'));
  const read = (f) => {
    const s = readFileSync(path.join(dir, 'events', f), 'utf8');
    return { kind: s.split('\n')[0].split(' ')[2], body: JSON.parse(s.slice(s.indexOf('\n') + 1)) };
  };
  const fire = (type, data, envelope = 'data') => handlers[type]({ id: 'e1', type, [envelope]: data });
  const USAGE = { input: 10, output: 5, reasoning: 0, cache: { read: 90_000, write: 1_000 }, cost: 0.1 };

  it('session.created reports the main chat as kind session, and a child session (parentID) not at all (FR1.5)', async () => {
    await load();
    expect(fire('session.created', { info: { id: 'ses_child', parentID: 'ses_main' } })).toBeUndefined();
    await sleep(100);
    expect(evts()).toEqual([]);
    fire('session.created', { info: { id: 'ses_main' } });
    const [f] = await waitFor(() => evts().length === 1 && evts());
    expect(read(f)).toEqual({ kind: 'session', body: { id: 'e1', type: 'session.created', data: { info: { id: 'ses_main' } } } });
  });

  it('session.usage.updated reports kind usage with the token object, from data or properties (FR1.2)', async () => {
    await load();
    fire('session.usage.updated', { sessionID: 'ses_main', tokens: USAGE }, 'properties');
    const [f] = await waitFor(() => evts().length === 1 && evts());
    expect(read(f).kind).toBe('usage');
    expect(read(f).body.properties.tokens).toEqual(USAGE);
  });

  it('session.compaction.ended reports kind postcompact (FR8.1)', async () => {
    await load();
    fire('session.compaction.ended', { sessionID: 'ses_main', tokens: USAGE });
    const [f] = await waitFor(() => evts().length === 1 && evts());
    expect(read(f).kind).toBe('postcompact');
  });

  it.each(['busy', 'retry'])('a %s session.status reports kind status (FR5.1)', async (type) => {
    await load({ reply: vi.fn() });
    fire('session.status', { sessionID: 'ses_main', status: { type } });
    const [f] = await waitFor(() => evts().length === 1 && evts());
    expect(read(f).kind).toBe('status');
  });

  it('session.idle reports kind status only while no session.status has been seen (FR5.1 fallback)', async () => {
    await load();
    fire('session.idle', { sessionID: 'ses_main' });
    const [f] = await waitFor(() => evts().length === 1 && evts());
    expect(read(f).kind).toBe('status');
    fire('session.status', { sessionID: 'ses_main', status: { type: 'busy' } });
    await waitFor(() => evts().length === 2);
    fire('session.idle', { sessionID: 'ses_main' });
    await sleep(100);
    expect(evts()).toHaveLength(2);
  });

  it('the compaction hook adds the instruction the app wrote as a system part, never a result; nothing without the file (FR4.2)', async () => {
    const hook = vi.fn();
    await load();
    vi.resetModules();
    ctx.session.hook = hook;
    const plugin = (await import('../../.opencode/plugins/thadeus-dialog.js')).default;
    await plugin.setup(ctx);
    expect(hook).toHaveBeenCalledWith('compaction', expect.any(Function));
    const fn = hook.mock.calls[0][1];
    const none = { system: [] };
    await fn(none);
    expect(none).toEqual({ system: [] });
    writeFileSync(path.join(dir, 'compact.txt'), 'Keep intent 261117.');
    const event = { system: [] };
    await fn(event);
    expect(event.system).toEqual(['Keep intent 261117.']);
    expect('result' in event).toBe(false);
    await expect(fn(undefined)).resolves.toBeUndefined();
  });

  it('without ctx.session.hook, setup still subscribes and never throws', async () => {
    await load();
    expect(ctx.session.hook).toBeUndefined();
    expect(Object.keys(handlers)).toEqual(expect.arrayContaining(['session.created', 'session.usage.updated', 'session.compaction.ended', 'session.idle']));
  });

  it('a failed write never reaches opencode: the handler returns undefined and logs the code only', async () => {
    await load();
    rmSync(path.join(dir, 'events'), { recursive: true });
    expect(fire('session.created', { info: { id: 'ses_main' } })).toBeUndefined();
    await sleep(100);
    expect(ctx.log.error.mock.calls.flat().join(' ')).not.toContain(SECRET);
  });
});
