// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/ribbons.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
import { clamp, easeInOut, lowerBound } from '../core/math.js';
import { hash } from '../core/random.js';
import { rgba, quadPoint } from './canvas.js';

const MAX_LIFE = 1.6;

export function visibleBundles(bundles, t) {
  return [lowerBound(bundles, 't0', t - MAX_LIFE), lowerBound(bundles, 't0', t)];
}

const polar = (rotation) => (a, r) => [Math.cos(a + rotation) * r, Math.sin(a + rotation) * r];

export function drawRibbons(ctx, bundles, t, rotation, geo, theme) {
  const [from, to] = visibleBundles(bundles, t);
  const at = polar(rotation);
  ctx.lineCap = 'round';
  for (let i = from; i < to; i++) {
    const b = bundles[i];
    const u = (t - b.t0) / b.dur;
    if (u > 1 + b.trail) continue;
    const head = easeInOut(clamp(u, 0, 1)) + Math.max(0, u - 1);
    const s1 = Math.min(1, head);
    const s0 = Math.max(0, head - b.trail);
    if (s1 <= s0) continue;
    const mid = (b.a0 + b.a1) / 2;
    const color = b.failed ? theme.accent : theme.ink;
    for (let j = 0; j < b.n; j++) {
      const o = j - (b.n - 1) / 2;
      const p0 = at(b.a0 + o * 0.0014, geo.ri - 3);
      const p1 = at(b.a1 + (b.cross ? -o : o) * 0.0014, geo.ri - 3);
      const c = at(mid, geo.ri * b.k + o * b.spacing);
      const alpha = b.alpha * (0.55 + 0.45 * hash(i * 13 + j));
      const segs = 6;
      for (let q = 0; q < segs; q++) {
        const a = s0 + ((s1 - s0) * q) / segs;
        const z = s0 + ((s1 - s0) * (q + 1)) / segs;
        ctx.strokeStyle = rgba(color, alpha * Math.pow((q + 1) / segs, 2.2));
        ctx.lineWidth = q === segs - 1 ? 1.15 : 0.75;
        ctx.beginPath();
        for (let st = 0; st <= 4; st++) {
          const [x, y] = quadPoint(p0, c, p1, a + ((z - a) * st) / 4);
          if (st === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }
}

export function drawFlashes(ctx, bundles, t, rotation, ring) {
  const [from, to] = visibleBundles(bundles, t);
  for (let i = from; i < to; i++) {
    const b = bundles[i];
    const age = t - b.t0;
    const ends = [
      [b.a0, age],
      [b.a1, age - b.dur]
    ];
    for (const [a, ag] of ends) {
      if (ag < 0 || ag > 0.35) continue;
      ring.flash(ctx, a + rotation, 1 - ag / 0.35, b.failed);
    }
  }
}

export function drawTraces(ctx, bundles, t, rotation, geo, theme, { window = 7, fade = 2.5, strength = 0.3 } = {}) {
  const at = polar(rotation);
  ctx.lineWidth = 0.6;
  for (let i = lowerBound(bundles, 't0', t - window); i < lowerBound(bundles, 't0', t); i++) {
    const b = bundles[i];
    const age = t - b.t0 - b.dur;
    if (age < 0) continue;
    const p0 = at(b.a0, geo.ri - 3);
    const p1 = at(b.a1, geo.ri - 3);
    const c = at((b.a0 + b.a1) / 2, geo.ri * b.k);
    ctx.strokeStyle = rgba(b.failed ? theme.accent : theme.ink, strength * b.alpha * Math.exp(-age / fade));
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    ctx.quadraticCurveTo(c[0], c[1], p1[0], p1[1]);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}
