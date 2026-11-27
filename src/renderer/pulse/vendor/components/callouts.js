// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/callouts.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
import { TAU, smoothstep } from '../core/math.js';
import { FONT, rgba, text } from './canvas.js';

export function drawCallouts(ctx, callouts, t, resolve, theme) {
  for (const c of callouts) {
    if (t < c.t0 || t > c.t1) continue;
    const alpha = smoothstep(c.t0, c.t0 + 0.2, t) * (1 - smoothstep(c.t1 - 0.25, c.t1, t));
    const {
      anchor: [ax, ay],
      box: [x, by],
      right
    } = resolve(c, t);
    const color = c.alert ? theme.accent : theme.ink;
    ctx.font = `9px ${FONT}`;
    const bw = Math.max(...c.lines.map((l) => ctx.measureText(l).width)) + 24;
    const bh = 20 + c.lines.length * 13;
    const bx = right ? x - bw : x;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(color, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(right ? bx + bw : bx, by + bh / 2);
    ctx.stroke();
    ctx.fillStyle = rgba(color, 1);
    ctx.beginPath();
    ctx.arc(ax, ay, 2.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = theme.panel;
    ctx.globalAlpha = alpha * 0.92;
    ctx.fillRect(bx, by, bw, bh);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = rgba(color, 0.45);
    ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    ctx.fillStyle = rgba(color, 1);
    ctx.fillRect(bx, by, 3, bh);
    text(ctx, bx + 11, by + 14, c.title, { size: 7.5, color: rgba(color, 0.75), weight: 'bold' });
    c.lines.forEach((l, i) => text(ctx, bx + 11, by + 29 + i * 13, l, { size: 9, color: rgba(color, 0.95) }));
    ctx.globalAlpha = 1;
  }
}
