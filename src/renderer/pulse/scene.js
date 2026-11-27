// US-0418 FR1, FR2, FR3.4, FR7, FR8, FR9, NFR3: the adapter between the pulse store and the vendored pretty-events
// drawing code. It maps our snapshot to their shapes (agents become ring sectors, files sit in folder sectors,
// touches become ribbon bundles, file marks become backlog dots, delete is their failure accent) and reads one LCARS
// theme from the CSS tokens. All drawing is theirs; this file only feeds it.
import { drawFlashes, drawRibbons, drawTraces } from './vendor/components/ribbons.js';
import { drawBacklog } from './vendor/components/backlog.js';
import { drawCallouts } from './vendor/components/callouts.js';
import { eventAngle } from './vendor/components/exhaust.js';
import { layoutSectors } from './vendor/scene/layout.js';
import { wrap } from './vendor/core/math.js';
import { rgba } from './vendor/components/canvas.js';

const MIN = 60000;
const BACKLOG_UNIT = 2 * MIN; // FR7.1: the backlog's maxAge 5 at 2 minutes a unit fades a mark after 10 minutes
const KINDS = ['read', 'write', 'delete'];

/** FR5.2, FR7: the top folder of a file, "." for root files, "outside" for the outside mark. */
export function folderOf(file) {
  if (file.outside) return 'outside';
  const i = file.path.indexOf('/');
  return i < 0 ? '.' : file.path.slice(0, i);
}

const keyOf = (f) => (f.outside ? 'outside' : f.path);
const dirOf = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '.');

/** A stable small id from a string, for the vendored hash-based angles. */
function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) % 100003;
  return h;
}

/** FR2, FR3.4, FR7: the whole scene for one snapshot. `name(agent)` gives an agent's shown name. */
export function buildScene(snapshot, { name }) {
  const agentSector = new Map();
  const used = new Set();
  const groups = snapshot.agents.map((a) => {
    const base = name(a);
    let n = base;
    for (let i = 2; used.has(n); i++) n = `${base} ${i}`;
    used.add(n);
    agentSector.set(a.id, n);
    return { name: n, types: [n], agent: a };
  });
  const folders = [...new Set(snapshot.files.map(folderOf))].sort();
  const layout = layoutSectors(groups, folders);
  const fileLayout = { ...layout, producers: layout.consumers };
  const agents = new Map(groups.map((g) => [g.name, g.agent]));

  const files = snapshot.files.map((f) => {
    // `sector` is the folder sector; the snapshot's own `folder: true` flag (a grouped mark, FR7.2) is kept as it is.
    const sector = folderOf(f);
    const id = strHash(keyOf(f));
    return { ...f, key: keyOf(f), sector, id, angle: eventAngle(fileLayout, sector, id) };
  });
  const byKey = new Map(files.map((f) => [f.key, f]));

  const bundles = [];
  for (const touch of snapshot.touches) {
    const from = layout.producers.get(agentSector.get(touch.agent));
    const key = keyOf(touch);
    // A file merged into its folder mark (FR7.2) ends its ribbon on that mark.
    const file = byKey.get(key) ?? (touch.path && byKey.get(dirOf(touch.path)));
    if (!from || !file) continue;
    bundles.push({
      kind: touch.kind,
      t0: touch.at / 1000,
      dur: 1,
      trail: 0.35,
      a0: from.mid,
      a1: file.angle,
      n: 3,
      cross: false,
      k: 0.35,
      spacing: 2,
      alpha: 0.8,
      failed: touch.kind === 'delete'
    });
  }
  bundles.sort((a, b) => a.t0 - b.t0);
  const byKind = Object.fromEntries(KINDS.map((k) => [k, bundles.filter((b) => b.kind === k)]));

  const created = files
    .map((f) => {
      const t = f.lastAt / BACKLOG_UNIT;
      return { t, okAt: Infinity, failAt: f.deleted ? t : Infinity, group: f.sector, id: f.id, file: f };
    })
    .sort((a, b) => a.t - b.t);

  return { layout, fileLayout, agents, files, bundles, byKind, backlog: { created } };
}

/** The ring texture only changes when its sectors change. */
export const ringKey = (scene) => scene.layout.sectors.map((s) => `${s.kind}:${s.name}`).join('|');

/** FR8: what the pointer at (x, y), relative to the ring's centre, is over: a file, else an agent sector, else nothing. */
export function hitTest(scene, x, y, ri) {
  const d = Math.hypot(x, y);
  if (d < ri * 0.4 || d > ri * 1.4) return null;
  const a = wrap(Math.atan2(y, x));
  let best = null;
  let gap = 0.04;
  for (const f of scene.files) {
    const g = Math.abs(wrap(f.angle - a + Math.PI) - Math.PI);
    if (g < gap) [best, gap] = [f, g];
  }
  if (best) return { file: best };
  const s = scene.layout.sectors.find((x) => x.kind === 'producer' && a >= x.a0 && a <= x.a1);
  return s ? { agent: scene.agents.get(s.name), sector: s } : null;
}

/** FR9: touches in the last minute, files touched, the busiest agent and 15 one-minute bars by kind. */
export function readouts(snapshot, now, name) {
  const bars = Array.from({ length: 15 }, () => ({ read: 0, write: 0, delete: 0 }));
  let perMinute = 0;
  for (const t of snapshot.touches) {
    const ago = now - t.at;
    if (ago < MIN) perMinute++;
    const i = 14 - Math.floor(ago / MIN);
    if (i >= 0 && i < 15 && bars[i][t.kind] != null) bars[i][t.kind]++;
  }
  const top = snapshot.agents.reduce((b, a) => (a.count > (b?.count ?? 0) ? a : b), null);
  return { perMinute, files: snapshot.files.length, busiest: top ? name(top) : null, bars };
}

/** '#rrggbb' or '#rgb' to 'r,g,b'; anything else to '0,0,0'. */
function toRgb(value) {
  let h = String(value).trim().replace(/^#/, '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return '0,0,0';
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
}

/** NFR5: the LCARS theme from the CSS tokens: steel for read, white for write, coral for delete. */
export function lcarsTheme(read) {
  const bg = toRgb(read('--bg'));
  const card = toRgb(read('--slate-1'));
  const base = {
    bg: rgba(bg, 1),
    hud: rgba(card, 1),
    panel: rgba(card, 1),
    ring: rgba(bg, 1),
    card: card.split(',').map(Number),
    ink: toRgb(read('--steel-text')),
    accent: toRgb(read('--coral')),
    tints: []
  };
  return { base, read: base, write: { ...base, ink: toRgb(read('--text')) } };
}

/** One frame. `now` is in milliseconds; with motion off (NFR3) the ring and marks stand still and no ribbons draw. */
export function drawFrame(ctx, scene, ring, geo, themes, now, { motion, hover } = {}) {
  const t = now / 1000;
  const rot = 0; // ponytail: the ring stands still; pretty-events' ringRotation is there if a slow spin is wanted
  ctx.save();
  ctx.fillStyle = themes.base.bg;
  ctx.fillRect(0, 0, geo.w, geo.h);
  ctx.translate(geo.cx, geo.cy);
  ring.draw(ctx, rot);
  drawBacklog(ctx, scene.backlog, now / BACKLOG_UNIT, rot, geo, scene.fileLayout, themes.base, { maxAge: 5 });
  if (motion) {
    const load = Math.min(1, scene.bundles.filter((b) => t - b.t0 < 60).length / 30);
    ring.pulse(ctx, t, 1, load);
    for (const kind of KINDS) {
      const theme = themes[kind] ?? themes.base;
      drawTraces(ctx, scene.byKind[kind], t, rot, geo, theme);
      drawRibbons(ctx, scene.byKind[kind], t, rot, geo, theme);
    }
    drawFlashes(ctx, scene.bundles, t, rot, ring);
  }
  if (hover) {
    const r = geo.ri;
    const out = Math.cos(hover.angle) >= 0;
    const anchor = [Math.cos(hover.angle) * r, Math.sin(hover.angle) * r];
    const box = [anchor[0] + (out ? 1 : -1) * (geo.ro - geo.ri + 40), anchor[1] - 20];
    const callout = { t0: t - 1, t1: t + 1, alert: hover.alert, title: hover.title, lines: hover.lines };
    drawCallouts(ctx, [callout], t, () => ({ anchor, box, right: !out }), themes.base);
  }
  ctx.restore();
}
