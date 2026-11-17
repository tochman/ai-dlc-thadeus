// US-0506 u3 LC9: the opencode plugin's idle handler with a stubbed V2 ctx and a real session folder (BR6.2, RD15,
// PD12, OD7; NFR4.6, NFR5.13, NFR3.22, AC3.1.4). Real timers, a fresh module per test. Shapes are provisional (K12).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const TMP = path.resolve(__dirname, '../.tmp');
const FIX = path.resolve(__dirname, '../fixtures/agent-events/opencode');
const SECRET = 'd'.repeat(64);
const fixture = (name) => JSON.parse(readFileSync(path.join(FIX, `${name}.json`), 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(TMP, { recursive: true });

let dir, ctx, handlers;
const evts = () => readdirSync(path.join(dir, 'events')).filter((f) => f.endsWith('.evt'));
const waitForEvts = async (n, ms = 3000) => {
  for (const end = Date.now() + ms; Date.now() < end; await sleep(10)) if (evts().length >= n) return evts();
  throw new Error(`expected ${n} event files, saw ${evts().length}`);
};
const logged = () => [...ctx.log.error.mock.calls, ...ctx.log.info.mock.calls].map((c) => String(c[0]));

async function load({ env = true, context } = {}) {
  vi.resetModules();
  if (env) {
    process.env.THADEUS_SESSION_DIR = dir;
    process.env.THADEUS_SESSION_SECRET = SECRET;
    process.env.THADEUS_WAIT_SECONDS = '595';
  }
  handlers = {};
  ctx = {
    event: { on: vi.fn((type, fn) => (handlers[type] = fn)) },
    session: { form: { reply: vi.fn() }, context },
    log: { error: vi.fn(), info: vi.fn() }
  };
  const plugin = (await import('../../.opencode/plugins/thadeus-dialog.js')).default;
  await plugin.setup(ctx);
}
const idle = (name) => fixture(name).event;
const statusEvent = (type) => ({ type: 'session.status', properties: { sessionID: 'ses_01WhichName', status: { type } } });

beforeEach(() => {
  dir = mkdtempSync(path.join(TMP, 'ocr-'));
  mkdirSync(path.join(dir, 'events'));
  mkdirSync(path.join(dir, 'answers'));
  writeFileSync(path.join(dir, 'alive'), `${Date.now()}\n`);
});
afterEach(() => {
  delete process.env.THADEUS_SESSION_DIR;
  delete process.env.THADEUS_SESSION_SECRET;
  delete process.env.THADEUS_WAIT_SECONDS;
  rmSync(dir, { recursive: true, force: true });
});

describe('opencode idle handler (BR6.2, RD15)', () => {
  it('a top-level idle writes one reply .evt whose body is { event, context } unchanged', async () => {
    const { event, context } = fixture('idle-which-name');
    await load({ context: vi.fn(async () => context) });
    expect(handlers['session.status'](event)).toBeUndefined();
    const [name] = await waitForEvts(1);
    const text = readFileSync(path.join(dir, 'events', name), 'utf8');
    const nl = text.indexOf('\n');
    expect(text.slice(0, nl)).toBe(`THADEUS-EVENT v1 reply ${SECRET}`);
    expect(JSON.parse(text.slice(nl + 1))).toEqual({ event, context });
    expect(ctx.session.context).toHaveBeenCalledWith({ sessionID: 'ses_01WhichName' });
  });

  it('a sub-agent session (parentID) writes nothing', async () => {
    const { event, context } = fixture('idle-child');
    await load({ context: vi.fn(async () => context) });
    handlers['session.status'](event);
    await sleep(150);
    expect(evts()).toEqual([]);
  });

  it.each(['busy', 'retry'])('a %s status writes no reply and reads no context (US-0213: only a status report)', async (type) => {
    await load({ context: vi.fn(async () => fixture('idle-which-name').context) });
    handlers['session.status'](statusEvent(type));
    await sleep(100);
    const kinds = evts().map((f) => readFileSync(path.join(dir, 'events', f), 'utf8').split(' ')[2]);
    expect(kinds).toEqual(['status']);
    expect(ctx.session.context).not.toHaveBeenCalled();
  });

  it('a rejecting context: nothing thrown, one log line with the code, no text, no secret, no .evt (OD7)', async () => {
    await load({ context: vi.fn(async () => Promise.reject(Object.assign(new Error('Which name should the file have?'), { code: 'ECONNRESET' }))) });
    expect(() => handlers['session.status'](idle('idle-which-name'))).not.toThrow();
    await sleep(100);
    expect(evts()).toEqual([]);
    expect(logged()).toEqual(['thadeus-dialog: context read failed: ECONNRESET']);
  });

  it('a context that throws synchronously is caught the same way', async () => {
    await load({
      context: vi.fn(() => {
        throw new TypeError(`bad ${SECRET}`);
      })
    });
    expect(() => handlers['session.status'](idle('idle-which-name'))).not.toThrow();
    await sleep(100);
    expect(evts()).toEqual([]);
    const lines = logged();
    expect(lines).toEqual(['thadeus-dialog: context read failed: TypeError']);
    expect(lines.join('')).not.toContain(SECRET);
  });

  it('an fs write error: one "event write failed" line with the code, no .evt', async () => {
    await load({ context: vi.fn(async () => fixture('idle-which-name').context) });
    rmSync(path.join(dir, 'events'), { recursive: true });
    handlers['session.status'](idle('idle-which-name'));
    await sleep(150);
    expect(logged()).toEqual(['thadeus-dialog: event write failed: ENOENT']);
  });

  it('a context that never resolves: the handler returns at once and a later idle is still handled (PD12)', async () => {
    const { context } = fixture('idle-which-name');
    const read = vi
      .fn()
      .mockImplementationOnce(() => new Promise(() => {}))
      .mockImplementation(async () => context);
    await load({ context: read });
    expect(handlers['session.status'](idle('idle-which-name'))).toBeUndefined();
    expect(handlers['session.status'](idle('idle-which-name'))).toBeUndefined();
    await waitForEvts(1);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('without THADEUS_SESSION_DIR nothing is subscribed (FR4.4)', async () => {
    await load({ env: false, context: vi.fn() });
    expect(ctx.event.on).not.toHaveBeenCalled();
  });
});
