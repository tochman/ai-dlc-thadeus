// US-0418 FR1, FR2, FR3.4, FR7, FR8, FR9, NFR3: the Pulse adapter (scene.js) and the vendored pretty-events modules,
// drawn against a stub 2D context so they count toward coverage.
import { beforeAll, describe, expect, it } from 'vitest';
import { buildScene, drawFrame, folderOf, hitTest, lcarsTheme, readouts, ringKey } from '../../src/renderer/pulse/scene.js';
import { createRing } from '../../src/renderer/pulse/vendor/components/ring.js';
import { drawCallouts } from '../../src/renderer/pulse/vendor/components/callouts.js';
import { drawTraces, drawRibbons } from '../../src/renderer/pulse/vendor/components/ribbons.js';
import { frameGeometry, parseInset } from '../../src/renderer/pulse/vendor/scene/geometry.js';
import { layoutSectors, ringRotation } from '../../src/renderer/pulse/vendor/scene/layout.js';
import { createRandom } from '../../src/renderer/pulse/vendor/core/random.js';
import { easeOut, formatInt, quantile, smoothstep, wrap } from '../../src/renderer/pulse/vendor/core/math.js';
import { context, offscreen, text } from '../../src/renderer/pulse/vendor/components/canvas.js';

/** A 2D context that records every call by name. */
export function stubCtx() {
  const calls = [];
  return new Proxy(
    { calls, measureText: (s) => ({ width: String(s).length * 5 }) },
    {
      get(target, key) {
        if (key in target) return target[key];
        return (...args) => calls.push([key, ...args]);
      },
      set(target, key, value) {
        target[key] = value;
        return true;
      }
    }
  );
}

// jsdom has no canvas: the ring's offscreen texture draws into a recording stub.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => stubCtx();
});

const count = (ctx, name) => ctx.calls.filter((c) => c[0] === name).length;
const MIN = 60000;
const NOW = 10 * MIN;

const SNAP = {
  agents: [
    { id: 'a1', label: 'main', group: 'pulse-view', active: true, count: 3 },
    { id: 'a2', label: 'main', group: 'other', active: false, count: 1 },
    { id: 'unattributed', label: null, group: null, active: false, count: 1 }
  ],
  files: [
    { path: 'src/a.js', kind: 'write', weight: 1, deleted: false, lastAt: NOW - 1000, agents: ['a1'] },
    { path: 'README.md', kind: 'read', weight: 0.5, deleted: false, lastAt: NOW - 5 * MIN, agents: ['a2'] },
    { path: 'src/gone.js', kind: 'delete', weight: 1, deleted: true, lastAt: NOW - 2000, agents: ['a1'] },
    { outside: true, kind: 'read', weight: 1, deleted: false, lastAt: NOW - 3000, agents: ['unattributed'] }
  ],
  touches: [
    { agent: 'a2', path: 'README.md', kind: 'read', at: NOW - 5 * MIN },
    { agent: 'a1', path: 'src/a.js', kind: 'read', at: NOW - 30000 },
    { agent: 'unattributed', outside: true, kind: 'read', at: NOW - 3000 },
    { agent: 'a1', path: 'src/gone.js', kind: 'delete', at: NOW - 2000 },
    { agent: 'a1', path: 'src/a.js', kind: 'write', at: NOW - 1000 }
  ]
};
const name = (a) => a.label ?? 'Unattributed';

describe('pulse scene adapter', () => {
  it('puts files in folder groups: the top folder, "." for root files, "outside" for the outside mark (FR5.2, FR7)', () => {
    expect(folderOf({ path: 'src/main/a.js' })).toBe('src');
    expect(folderOf({ path: 'README.md' })).toBe('.');
    expect(folderOf({ outside: true })).toBe('outside');
  });

  it('makes one ring sector per agent, with unique names and Unattributed last, and one per folder (FR2)', () => {
    const scene = buildScene(SNAP, { name });
    const producers = [...scene.layout.producers.keys()];
    expect(producers).toEqual(['main', 'main 2', 'Unattributed']);
    expect([...scene.layout.consumers.keys()].sort()).toEqual(['.', 'outside', 'src']);
    expect(ringKey(scene)).toBe(ringKey(buildScene({ ...SNAP, touches: [] }, { name })));
  });

  it('turns touches into ribbon bundles sorted by time, from the agent to the file, delete as the failure (FR3.4)', () => {
    const scene = buildScene(SNAP, { name });
    expect(scene.bundles.map((b) => b.kind)).toEqual(['read', 'read', 'read', 'delete', 'write']);
    const del = scene.bundles[3];
    expect(del.failed).toBe(true);
    expect(del.t0).toBe((NOW - 2000) / 1000);
    expect(del.a0).toBeCloseTo(scene.layout.producers.get('main').mid);
    expect(del.a1).toBeCloseTo(scene.files.find((f) => f.path === 'src/gone.js').angle);
    const src = scene.layout.consumers.get('src');
    for (const f of scene.files.filter((x) => x.sector === 'src')) expect(f.angle).toBeGreaterThanOrEqual(src.a0);
  });

  it('makes one backlog dot per file, with deleted files marked as failed (FR7.1)', () => {
    const scene = buildScene(SNAP, { name });
    const { created } = scene.backlog;
    expect(created).toHaveLength(4);
    expect(created.map((e) => e.t)).toEqual([...created.map((e) => e.t)].sort((a, b) => a - b));
    const gone = created.find((e) => e.file.path === 'src/gone.js');
    expect(gone.failAt).toBe(gone.t);
    expect(created.find((e) => e.file.path === 'src/a.js').failAt).toBe(Infinity);
  });

  it('finds the file nearest the pointer, or the agent whose sector it is in, or nothing (FR8)', () => {
    const scene = buildScene(SNAP, { name });
    const f = scene.files.find((x) => x.path === 'src/a.js');
    const r = 200;
    expect(hitTest(scene, Math.cos(f.angle) * r, Math.sin(f.angle) * r, r).file).toBe(f);
    const agent = scene.layout.producers.get('Unattributed');
    const hit = hitTest(scene, Math.cos(agent.mid) * r, Math.sin(agent.mid) * r, r);
    expect(hit.agent?.id ?? hit.file).toBeTruthy();
    expect(hitTest(scene, 0, 0, r)).toBeNull();
  });

  it('counts touches per minute, files touched, the busiest agent and 15 one-minute bars (FR9)', () => {
    const r = readouts(SNAP, NOW, name);
    expect(r.perMinute).toBe(4);
    expect(r.files).toBe(4);
    expect(r.busiest).toBe('main');
    expect(r.bars).toHaveLength(15);
    expect(r.bars[14]).toEqual({ read: 2, write: 1, delete: 1 });
    expect(r.bars[9]).toEqual({ read: 1, write: 0, delete: 0 });
    expect(readouts({ agents: [], files: [], touches: [] }, NOW, name).busiest).toBeNull();
  });

  it('reads the LCARS colours from the CSS tokens as r,g,b (NFR5)', () => {
    const tokens = { '--bg': '#05060a', '--slate-1': '#11151f', '--steel-text': '#7cc0ea', '--text': '#e6e9f2', '--coral': '#ee6c56' };
    const theme = lcarsTheme((k) => tokens[k] ?? '');
    expect(theme.read.ink).toBe('124,192,234');
    expect(theme.write.ink).toBe('230,233,242');
    expect(theme.base.accent).toBe('238,108,86');
    expect(theme.base.card).toEqual([17, 21, 31]);
    expect(lcarsTheme(() => '').base.ink).toBe('0,0,0');
  });
});

describe('drawing a frame with the vendored modules', () => {
  const geo = frameGeometry({ width: 1080, height: 720, hero: 'orbit', panels: '0' });
  const theme = lcarsTheme(() => '#808080');

  it('draws the ring once to its offscreen canvas and only stamps it per frame (FR1)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const ctx = stubCtx();
    drawFrame(ctx, scene, ring, geo, theme, NOW, { motion: true });
    drawFrame(ctx, scene, ring, geo, theme, NOW + 16, { motion: true });
    expect(count(ctx, 'drawImage')).toBe(2);
    expect(count(ctx, 'arc')).toBeGreaterThan(0); // the backlog dots
  });

  it('draws a ribbon while it is fresh and none after its fade time (FR3.4)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const fresh = stubCtx();
    drawFrame(fresh, scene, ring, geo, theme, NOW - 500, { motion: true });
    expect(count(fresh, 'lineTo')).toBeGreaterThan(0);
    const late = stubCtx();
    drawFrame(late, scene, ring, geo, theme, NOW + 2000, { motion: true });
    expect(count(late, 'lineTo')).toBe(0);
  });

  it('draws no ribbons with reduced motion (NFR3)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const ctx = stubCtx();
    drawFrame(ctx, scene, ring, geo, theme, NOW - 500, { motion: false });
    expect(count(ctx, 'lineTo')).toBe(0);
    expect(count(ctx, 'drawImage')).toBe(1);
  });

  it('draws a hover callout with its title and lines (FR8.1)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const ctx = stubCtx();
    const hover = { angle: 1, title: 'SRC/A.JS', lines: ['write · main'] };
    drawFrame(ctx, scene, ring, geo, theme, NOW, { motion: true, hover });
    const texts = ctx.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);
    expect(texts).toEqual(expect.arrayContaining(['SRC/A.JS', 'write · main']));
  });

  it('keeps the other vendored helpers working: geometry, layout, rotation, traces, callouts, math and canvas', () => {
    expect(parseInset('1,2,3,4')).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
    const arc = frameGeometry({ width: 1080, height: 1400, hero: 'arc-right' });
    expect(arc.facing).toBe(Math.PI);
    expect(arc.rows).toBe(2);
    const layout = layoutSectors([{ name: 'g', types: ['x', 'y'] }], ['h1', 'h2']);
    expect(layout.sectors.map((s) => s.name)).toEqual(['g', 'h1', 'h2']);
    expect(ringRotation(layout, 'g', 10)(0)).toBeTypeOf('number');
    expect(ringRotation(layout, null, 10, { omega: 0, facing: 1 })(5)).toBeCloseTo(1 - layout.sectors[0].mid + 0.08);
    const ring = createRing({ ...arc, ri: 100, ro: 115 }, layout, theme.base, createRandom(1));
    const ctx = stubCtx();
    ring.pulse(ctx, 1, 2, 0.5);
    ring.flash(ctx, Math.PI, 1, true);
    ring.flash(ctx, 0, 1, false); // behind the facing side: not drawn
    ring.alarm(ctx, layout.sectors[0], 0, 1, 1);
    const orbit = createRing({ ...geo }, layout, theme.base, createRandom(2));
    orbit.pulse(ctx, 1, 2, 0.5);
    const b = { t0: 0, dur: 1, trail: 0.35, a0: 0, a1: 1, n: 2, cross: true, k: 0.35, spacing: 2, alpha: 0.8, failed: true };
    drawTraces(ctx, [b], 2, 0, geo, theme.base);
    drawRibbons(ctx, [b], 0.5, 0, geo, theme.base);
    drawCallouts(ctx, [{ t0: 0, t1: 1, alert: true, title: 'T', lines: ['a'] }], 0.5, () => ({ anchor: [0, 0], box: [10, 10], right: true }), theme.base);
    drawCallouts(ctx, [{ t0: 2, t1: 3, title: 'T', lines: ['a'] }], 0.5, () => null, theme.base);
    expect(count(ctx, 'quadraticCurveTo')).toBe(1);
    expect(count(ctx, 'fillRect')).toBeGreaterThan(0);
    expect([smoothstep(0, 1, 0.5), easeOut(1), wrap(-Math.PI), formatInt(1234.4), quantile([1, 2, 3], 0.5), quantile([], 0.5)]).toEqual([
      0.5,
      1,
      Math.PI,
      '1,234',
      2,
      0
    ]);
    const rnd = createRandom(3);
    expect(rnd.exp(1)).toBeGreaterThan(0);
    expect(offscreen(10.2, 3).width).toBe(11);
    expect(() => context({ getContext: () => null })).toThrow('canvas 2d context unavailable');
    text(ctx, 0, 0, 'x', { color: 'red' });
    expect(ctx.textAlign).toBe('left');
  });
});
