// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/backlog.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
import { TAU, lowerBound } from '../core/math.js';
import { hash } from '../core/random.js';
import { rgba } from './canvas.js';
import { eventAngle } from './exhaust.js';

export function drawBacklog(ctx, timeline, t, rotation, geo, layout, theme, { maxAge = 8, depth = geo.ri * 0.62 } = {}) {
  const { created } = timeline;
  ctx.lineWidth = 0.8;
  for (let i = lowerBound(created, 't', t - maxAge); i < lowerBound(created, 't', t); i++) {
    const e = created[i];
    if (e.okAt <= t) continue;
    const a = eventAngle(layout, e.group, e.id) + rotation;
    if (geo.facing != null && Math.cos(a - geo.facing) < -0.35) continue;
    const age = t - e.t;
    const sink = 1 - Math.exp(-age / 1.6);
    const r = geo.ri - 12 - sink * depth - hash(e.id * 1.3) * 10;
    const retrying = e.failAt <= t;
    const size = 1.6 + 1.6 * hash(e.id * 2.9);
    ctx.strokeStyle = retrying ? rgba(theme.accent, 0.85) : rgba(theme.ink, 0.22 + 0.4 * (1 - sink));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, size, 0, TAU);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
}
