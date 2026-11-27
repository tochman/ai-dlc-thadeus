// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/ring.ts (MIT, see LICENSE); types stripped, logic unchanged except: the 7 px sector name is removed (scene.js draws the names, US-0418 step 11). US-0418 FR1.
import { TAU, hex } from '../core/math.js';
import { FONT, context, offscreen, rgba } from './canvas.js';

function shade(theme, rnd) {
  const d = Math.floor(rnd.range(0, 13));
  const [r, g, b] = theme.card;
  return `rgb(${r + d},${g + d},${b + d})`;
}

export function createRing(geo, layout, theme, rnd) {
  const { ri, ro } = geo;
  const band = ro - ri;
  const f = band / 86;
  const size = (ro + 60) * 2;
  const step = 15.5 / ((ri + ro) / 2);
  const canvas = offscreen(size, size);
  const g = context(canvas);
  g.translate(size / 2, size / 2);

  g.fillStyle = theme.ring;
  g.beginPath();
  g.arc(0, 0, ro, 0, TAU);
  g.arc(0, 0, ri, 0, TAU, true);
  g.fill();
  g.lineWidth = 1;
  g.strokeStyle = rgba(theme.ink, 0.38);
  for (const r of [ri, ro]) {
    g.beginPath();
    g.arc(0, 0, r, 0, TAU);
    g.stroke();
  }
  g.strokeStyle = rgba(theme.ink, 0.22);
  g.beginPath();
  g.arc(0, 0, ro + 9, 0, TAU);
  g.stroke();

  for (let d = 0; d < 1440; d++) {
    const a = (d / 1440) * TAU;
    const len = d % 20 === 0 ? 12 : d % 4 === 0 ? 6 : 3;
    g.strokeStyle = rgba(theme.ink, d % 20 === 0 ? 0.55 : 0.22);
    g.beginPath();
    g.moveTo(Math.cos(a) * (ro + 9), Math.sin(a) * (ro + 9));
    g.lineTo(Math.cos(a) * (ro + 9 + len), Math.sin(a) * (ro + 9 + len));
    g.stroke();
    if (d % 40 === 0) {
      g.save();
      g.rotate(a);
      g.translate(ro + 24, 0);
      g.rotate(Math.PI / 2);
      g.fillStyle = rgba(theme.ink, 0.45);
      g.font = `7px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(String(d / 4).padStart(3, '0'), 0, 0);
      g.restore();
    }
  }

  g.textBaseline = 'middle';
  const x0 = ri + 5;
  const x1 = ro - 5;
  const hh = 6.2;
  for (const s of layout.sectors) {
    for (let a = s.a0; a < s.a1 - step * 0.5; a += step) {
      g.save();
      g.rotate(a + step / 2);
      const kind = rnd.next();
      g.fillStyle = shade(theme, rnd);
      g.fillRect(x0, -hh, x1 - x0, hh * 2);
      if (kind < 0.62) {
        g.font = `${4.6 * Math.max(0.8, f)}px ${FONT}`;
        g.fillStyle = rgba(theme.ink, rnd.range(0.45, 0.85));
        g.fillText(rnd.pick(s.types).slice(0, Math.round(26 * f)), x0 + 2, -2.8);
        g.fillStyle = rgba(theme.ink, rnd.range(0.25, 0.5));
        g.fillText(
          `${hex(rnd.next() * 0xffffffff, 8)} ${rnd.int(1, 999)}ms ${rnd.pick(['ok', 'ok', 'ok', 'q', 'tx'])}`.slice(0, Math.round(26 * f)),
          x0 + 2,
          2.9
        );
      } else if (kind < 0.85) {
        const cols = Math.floor((x1 - x0 - 6) / 4.6);
        for (let gx = 0; gx < cols; gx++) {
          for (let gy = 0; gy < 4; gy++) {
            if (rnd.chance(0.5)) {
              g.fillStyle = rgba(theme.ink, rnd.range(0.25, 0.8));
              g.fillRect(x0 + 3 + gx * 4.6, -5.4 + gy * 2.9, 2.3, 2.1);
            }
          }
        }
      } else {
        for (let bx = x0 + 3; bx < x1 - 3; bx += rnd.range(1.2, 3)) {
          g.fillStyle = rgba(theme.ink, rnd.range(0.15, 0.6));
          g.fillRect(bx, -4.5, rnd.range(0.5, 1.4), 9);
        }
      }
      g.restore();
    }
    g.save();
    g.rotate(s.a0 + 0.004);
    g.fillStyle = rgba(theme.ink, 0.9);
    g.fillRect(ri + 1, -0.5, band - 2, 1);
    g.restore();
  }

  const visible = (a) => geo.facing == null || Math.cos(a - geo.facing) > -0.1;

  return {
    step,
    draw(ctx, rotation) {
      ctx.save();
      ctx.rotate(rotation);
      ctx.drawImage(canvas, -size / 2, -size / 2);
      ctx.restore();
    },
    pulse(ctx, t, tick, load) {
      const since = ((t % tick) + tick) % tick;
      const p = Math.exp(-since * 14) * (0.35 + 0.65 * load);
      ctx.strokeStyle = rgba(theme.ink, 0.15 + 0.6 * p);
      ctx.lineWidth = 1 + 2 * p;
      ctx.beginPath();
      if (geo.facing != null) ctx.arc(0, 0, ri - 2, geo.facing - 1.3, geo.facing + 1.3);
      else ctx.arc(0, 0, ri - 2, 0, TAU);
      ctx.stroke();
      const sweep = geo.facing != null ? geo.facing - 1.2 + ((t * 0.9) % 2.4) : (t * 0.9) % TAU;
      ctx.strokeStyle = rgba(theme.ink, 0.9);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, ro + 9, sweep, sweep + 0.06);
      ctx.stroke();
      ctx.lineWidth = 1;
    },
    flash(ctx, angle, v, failed) {
      if (!visible(angle)) return;
      ctx.save();
      ctx.rotate(Math.round(angle / step) * step);
      ctx.fillStyle = failed ? rgba(theme.accent, 0.55 * v) : rgba(theme.ink, 0.35 * v);
      ctx.fillRect(x0, -hh, x1 - x0, hh * 2);
      ctx.restore();
    },
    alarm(ctx, sector, rotation, t, strength) {
      const v = (0.5 + 0.5 * Math.sin(t * 38)) * strength;
      const a0 = sector.a0 + rotation;
      const a1 = sector.a1 + rotation;
      ctx.strokeStyle = rgba(theme.accent, 0.25 + 0.6 * v);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ri - 4, a0, a1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, ro + 3, a0, a1);
      ctx.stroke();
      ctx.fillStyle = rgba(theme.accent, 0.08 + 0.1 * v);
      ctx.beginPath();
      ctx.arc(0, 0, ro, a0, a1);
      ctx.arc(0, 0, ri, a1, a0, true);
      ctx.fill();
      ctx.lineWidth = 1;
    }
  };
}
