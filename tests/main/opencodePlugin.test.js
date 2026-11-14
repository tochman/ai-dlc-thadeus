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

async function load({ env = true, reply = vi.fn(async () => {}), wait = '595' } = {}) {
  vi.resetModules();
  if (env) {
    process.env.THADEUS_SESSION_DIR = dir;
    process.env.THADEUS_SESSION_SECRET = SECRET;
    process.env.THADEUS_WAIT_SECONDS = wait;
  }
  handlers = {};
  ctx = {
    event: { on: vi.fn((type, fn) => (handlers[type] = fn)) },
    session: reply === null ? {} : { form: { reply } }, // null: no reply member at all
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
