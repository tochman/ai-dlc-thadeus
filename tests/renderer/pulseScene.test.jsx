// US-0418 FR1, FR2, FR3.4, FR7, FR8, FR9, NFR3: the Pulse adapter (scene.js) and the vendored pretty-events modules,
// drawn against a stub 2D context so they count toward coverage.
import { beforeAll, describe, expect, it } from 'vitest';
import {
  LABEL_SPACE,
  buildScene,
  cloudWords,
  drawFrame,
  drawMarks,
  fitRing,
  folderOf,
  hitTest,
  labelTurn,
  lcarsTheme,
  placeCloud,
  readouts,
  ringKey
} from '../../src/renderer/pulse/scene.js';
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

  it('makes the ring of folder sectors only; agents are words in the cloud (FR2, step 14)', () => {
    const scene = buildScene(SNAP, { name });
    expect(scene.layout.producers.size).toBe(0);
    expect([...scene.layout.consumers.keys()].sort()).toEqual(['.', 'outside', 'src']);
    expect(ringKey(scene)).toBe(ringKey(buildScene({ ...SNAP, touches: [] }, { name })));
  });

  it('turns touches into bundles sorted by time, each at its file and named by its agent, delete as the failure (FR3.4, step 14)', () => {
    const scene = buildScene(SNAP, { name });
    expect(scene.bundles.map((b) => b.kind)).toEqual(['read', 'read', 'read', 'delete', 'write']);
    const del = scene.bundles[3];
    expect(del.failed).toBe(true);
    expect(del.t0).toBe((NOW - 2000) / 1000);
    expect(del.word).toBe('main');
    expect(del.a1).toBeCloseTo(scene.files.find((f) => f.path === 'src/gone.js').angle);
    expect(scene.bundles.map((b) => b.word)).toEqual(['main 2', 'main', 'Unattributed', 'main', 'main']);
    const src = scene.layout.consumers.get('src');
    for (const f of scene.files.filter((x) => x.sector === 'src')) expect(f.angle).toBeGreaterThanOrEqual(src.a0);
  });

  it('finds a word under the pointer first, else the nearest file, else nothing (FR8, step 14)', () => {
    const scene = buildScene(SNAP, { name });
    const f = scene.files.find((x) => x.path === 'src/a.js');
    const r = 200;
    expect(hitTest(scene, Math.cos(f.angle) * r, Math.sin(f.angle) * r, r).file).toBe(f);
    const word = { name: 'main', x: 0, y: 0, w: 40, h: 16 };
    expect(hitTest(scene, 5, 3, r, [word]).word).toBe(word);
    expect(hitTest(scene, 0, 0, r)).toBeNull();
  });

  it('sizes each agent word by its touches in the last minute and fades it out four seconds after its last touch (step 14)', () => {
    const scene = buildScene(SNAP, { name });
    const words = cloudWords(scene.bundles, NOW);
    expect(words.map((w) => w.name)).toEqual(['main', 'Unattributed']);
    expect(words[0]).toMatchObject({ n: 3, kind: 'write', ids: ['a1'] });
    expect(words[0].alpha).toBeCloseTo(0.75);
    expect(words[0].size).toBeGreaterThan(words[1].size);
    expect(cloudWords(scene.bundles, NOW + 4000)).toEqual([]);
  });

  it('places the words without overlap inside the ring, biggest first, and skips a word that does not fit (step 14)', () => {
    const measure = (s, size) => s.length * size * 0.6;
    const words = Array.from({ length: 30 }, (_, i) => ({ name: `agent-${i}`, size: 12 + (i % 5) * 4 }));
    const ri = 150;
    const placed = placeCloud(words, ri, measure);
    expect(placed.length).toBeGreaterThan(3);
    expect(placed.length).toBeLessThan(30);
    for (const p of placed) {
      expect(Math.hypot(Math.abs(p.x) + p.w / 2, Math.abs(p.y) + p.h / 2)).toBeLessThanOrEqual(0.7 * ri + 1e-9);
    }
    for (const a of placed)
      for (const b of placed) if (a !== b) expect(Math.abs(a.x - b.x) * 2 >= a.w + b.w || Math.abs(a.y - b.y) * 2 >= a.h + b.h).toBe(true);
    expect(placed[0].size).toBe(28);
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
    expect(count(ctx, 'arc')).toBeGreaterThan(0); // the file marks
  });

  it('links a word to its file while the touch is fresh and not after (FR3.4, step 14)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const fresh = stubCtx();
    const cloud = drawFrame(fresh, scene, ring, geo, theme, NOW - 500, { motion: true });
    expect(cloud.map((w) => w.name)).toContain('main');
    expect(count(fresh, 'quadraticCurveTo')).toBeGreaterThan(0);
    expect(count(fresh, 'lineTo')).toBe(0);
    const late = stubCtx();
    drawFrame(late, scene, ring, geo, theme, NOW + 5000, { motion: true }); // the word and its lines are gone after 4 s
    expect(count(late, 'lineTo')).toBe(0);
    expect(count(late, 'quadraticCurveTo')).toBe(0);
  });

  it('draws no ribbons with reduced motion (NFR3)', () => {
    const scene = buildScene(SNAP, { name });
    const ring = createRing(geo, scene.layout, theme.base, createRandom(7));
    const ctx = stubCtx();
    drawFrame(ctx, scene, ring, geo, theme, NOW - 500, { motion: false });
    expect(count(ctx, 'lineTo')).toBe(0);
    expect(count(ctx, 'quadraticCurveTo')).toBe(0);
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

describe('the rework: fit, names, colours and marks (steps 10-12)', () => {
  const tokens = { '--bg': '#05060a', '--slate-1': '#11151f', '--steel': '#5b9bd5', '--amber': '#f2a93b', '--coral': '#ee6c56' };
  const themes = lcarsTheme((k) => tokens[k] ?? '#808080');

  it.each([
    [1200, 700],
    [600, 900],
    [320, 240]
  ])('fits the ring and its scale inside %ix%i, centred, with a 4 px margin (steps 10, 15)', (w, h) => {
    const g = fitRing(w, h);
    expect(g.ro + LABEL_SPACE + 4).toBeCloseTo(Math.min(w, h) / 2);
    expect([g.w, g.h, g.cx, g.cy]).toEqual([w, h, w / 2, h / 2]);
    expect(g.ro).toBeCloseTo(g.ri * 1.15);
    expect(g.ri).toBeGreaterThan(0);
  });

  it('hit-tests against the fitted ring (step 10)', () => {
    const scene = buildScene(SNAP, { name });
    const g = fitRing(600, 900);
    const f = scene.files.find((x) => x.path === 'src/a.js');
    expect(hitTest(scene, Math.cos(f.angle) * g.ri, Math.sin(f.angle) * g.ri, g.ri).file).toBe(f);
  });

  it('turns every name so it is never upside down or mirrored (step 11)', () => {
    for (let a = 0; a < 2 * Math.PI; a += 0.1) expect(Math.cos(a + labelTurn(a))).toBeGreaterThanOrEqual(-1e-9);
  });

  it('names each recent file inside the ring at 11 px, newest first, and skips the outside mark (steps 14, 15)', () => {
    const scene = buildScene(SNAP, { name });
    const geo = fitRing(1200, 700);
    const ring = createRing(geo, scene.layout, themes.base, createRandom(7));
    const ctx = stubCtx();
    const seen = [];
    const fill = ctx.fillText;
    ctx.fillText = (s, x, ...rest) => (seen.push([s, ctx.font, x, ctx.textAlign]), fill(s, x, ...rest));
    drawFrame(ctx, scene, ring, geo, themes, NOW + 5000, { motion: false });
    const names = seen.filter(([, font]) => font.includes('11px'));
    expect(names.map(([s]) => s)).toEqual(['a.js', 'gone.js', 'README.md']);
    for (const [s, , x, align] of names) {
      // The text runs from just inside the ring's inner edge towards the centre, and stops before the word cloud.
      expect(Math.abs(x)).toBeLessThan(geo.ri);
      expect(Math.abs(x) - s.length * 5).toBeGreaterThanOrEqual(0.7 * geo.ri);
      expect(align).toBe(x > 0 ? 'right' : 'left');
    }
  });

  it('shortens a long file name with an ellipsis so it fits the band inside the ring (steps 14, 15)', () => {
    const long = { path: `src/${'x'.repeat(80)}.js`, kind: 'write', weight: 1, deleted: false, lastAt: NOW, agents: ['a1'] };
    const scene = buildScene({ agents: SNAP.agents, files: [long], touches: [] }, { name });
    const geo = fitRing(1200, 700);
    const ring = createRing(geo, scene.layout, themes.base, createRandom(7));
    const ctx = stubCtx();
    const seen = [];
    const fill = ctx.fillText;
    ctx.fillText = (s, ...rest) => (seen.push(s), fill(s, ...rest));
    drawFrame(ctx, scene, ring, geo, themes, NOW, { motion: false });
    const shown = seen.find((s) => s.startsWith('xxx'));
    expect(shown.endsWith('…')).toBe(true);
    expect(shown.length * 5).toBeLessThanOrEqual(0.3 * geo.ri);
    expect(shown.length * 5).toBeGreaterThan(0.3 * geo.ri - 20);
  });

  it('shows Unattributed only once, even for two agents with no name (step 11, step 14)', () => {
    const snap = {
      ...SNAP,
      agents: [...SNAP.agents, { id: 'u2', label: null, count: 0 }],
      touches: [...SNAP.touches, { agent: 'u2', outside: true, kind: 'read', at: NOW - 100 }]
    };
    const words = cloudWords(buildScene(snap, { name }).bundles, NOW);
    expect(words.filter((w) => w.name.startsWith('Unattributed'))).toHaveLength(1);
    expect(words.find((w) => w.name === 'Unattributed').ids).toEqual(['unattributed', 'u2']);
  });

  it('colours read steel, write amber and delete coral (step 12)', () => {
    expect(themes.kinds).toEqual({ read: '91,155,213', write: '242,169,59', delete: '238,108,86' });
    expect(themes.read.ink).toBe('91,155,213');
    expect(themes.write.ink).toBe('242,169,59');
  });

  it('draws a fresh mark larger and brighter than a nine-minute-old one, and none after ten minutes (step 12)', () => {
    const geo = fitRing(1200, 700);
    const mark = (age) => {
      const ctx = stubCtx();
      const seen = [];
      const arc = ctx.arc;
      ctx.arc = (...a) => (seen.push({ r: a[2], alpha: Number(/,([\d.]+)\)$/.exec(ctx.fillStyle)[1]), blur: ctx.shadowBlur }), arc(...a));
      drawMarks(ctx, [{ kind: 'write', deleted: false, angle: 1, lastAt: NOW - age }], NOW, geo, themes);
      return seen[0];
    };
    const fresh = mark(0);
    const old = mark(9 * MIN);
    expect(fresh.r).toBeGreaterThan(old.r);
    expect(fresh.alpha).toBeGreaterThan(old.alpha);
    expect(fresh.blur).toBeGreaterThan(old.blur);
    const gone = stubCtx();
    drawMarks(gone, [{ kind: 'delete', deleted: true, angle: 1, lastAt: NOW }], NOW, geo, themes);
    expect(gone.fillStyle).toBe('rgba(238,108,86,1)');
    expect(mark(10 * MIN + 1)).toBeUndefined();
  });
});
