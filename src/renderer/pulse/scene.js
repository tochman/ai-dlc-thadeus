// US-0418 FR1, FR2, FR3.4, FR7, FR8, FR9, NFR3: the adapter between the pulse store and the vendored pretty-events
// drawing code. The ring holds the folder sectors with a mark per file and the file names outside it; the agents are a
// cloud of words in the centre, sized by their touches in the last minute; every fresh touch sends an asteroid from its
// agent's word to its file (steps 10-14). It reads one LCARS theme from the CSS tokens.
import { drawCallouts } from './vendor/components/callouts.js';
import { eventAngle } from './vendor/components/exhaust.js';
import { layoutSectors } from './vendor/scene/layout.js';
import { TAU, wrap } from './vendor/core/math.js';
import { FONT, rgba } from './vendor/components/canvas.js';

const MIN = 60000;
const FADE = 10 * MIN; // FR7.1: a file mark fades out over 10 minutes
/** Room outside the ring's outer edge for the tick labels and the file names. */
export const LABEL_SPACE = 28;
const MARGIN = 24;
const FADE_IN = 1500; // a word fades in over 1.5 s from its first touch
const WORD_LIFE = 4000; // and out over 4 s after its last
const LINK = 1500; // an asteroid flies for 1.5 s
const NAMES = 24; // the most file names drawn at once
const NAME_MAX = 24; // a file name up to 24 characters is shown whole

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
  const word = new Map();
  const used = new Set();
  const agents = new Map();
  for (const a of snapshot.agents) {
    const base = name(a);
    // Step 11: every agent with no name shares the one word; two named alike are told apart by a number.
    if (a.label == null && used.has(base)) {
      word.set(a.id, base);
      continue;
    }
    let n = base;
    for (let i = 2; used.has(n); i++) n = `${base} ${i}`;
    used.add(n);
    word.set(a.id, n);
    agents.set(n, a);
  }
  const folders = [...new Set(snapshot.files.map(folderOf))].sort();
  const layout = layoutSectors([], folders);
  const fileLayout = { ...layout, producers: layout.consumers };

  const files = snapshot.files.map((f) => {
    // `sector` is the folder sector; the snapshot's own `folder: true` flag (a grouped mark, FR7.2) is kept as it is.
    const sector = folderOf(f);
    const id = strHash(keyOf(f));
    return { ...f, key: keyOf(f), sector, id, angle: eventAngle(fileLayout, sector, id) };
  });
  const byKey = new Map(files.map((f) => [f.key, f]));

  // One bundle per touch, from its agent's word to its file mark (a file merged into its folder mark, FR7.2, ends there).
  const bundles = [];
  for (const touch of snapshot.touches) {
    const file = byKey.get(keyOf(touch)) ?? (touch.path && byKey.get(dirOf(touch.path)));
    if (!file) continue;
    const w = word.get(touch.agent) ?? '?';
    bundles.push({ kind: touch.kind, failed: touch.kind === 'delete', t0: touch.at / 1000, at: touch.at, word: w, agent: touch.agent, a1: file.angle });
  }
  bundles.sort((x, y) => x.at - y.at);
  return { layout, fileLayout, agents, files, bundles };
}

/** Step 14: the words of the cloud: touches in the last minute per word, gone 4 s after the last one, in order of first touch. */
export function cloudWords(bundles, now) {
  const words = new Map();
  for (const b of bundles) {
    if (b.at > now || now - b.at >= MIN) continue;
    const w = words.get(b.word) ?? { name: b.word, n: 0, ids: [], first: b.at };
    w.n++;
    w.kind = b.kind;
    w.last = b.at;
    if (!w.ids.includes(b.agent)) w.ids.push(b.agent);
    words.set(b.word, w);
  }
  return [...words.values()]
    .filter((w) => now - w.last < WORD_LIFE)
    .map((w) => ({
      ...w,
      alpha: (1 - (now - w.last) / WORD_LIFE) * Math.min(1, (now - w.first) / FADE_IN),
      size: Math.min(28, 14 + 4 * w.n)
    }))
    .sort((x, y) => x.first - y.first);
}

/**
 * Step 14: the words on an Archimedean spiral from the centre, biggest first, none overlapping, all inside 0.7 x ri;
 * a word that finds no room is left out. `measure(text, size)` gives a word's width.
 * ponytail: re-placed every frame, so a word can hop when sizes change; keep last positions if that shows.
 */
export function placeCloud(words, ri, measure) {
  const limit = 0.7 * ri;
  const placed = [];
  for (const word of [...words].sort((a, b) => b.size - a.size)) {
    const w = measure(word.name, word.size);
    const h = word.size;
    for (let t = 0, r = 0; r <= limit; t += 0.15, r = 2 * t) {
      const x = Math.cos(t) * r;
      const y = Math.sin(t) * r * 0.7;
      if (Math.hypot(Math.abs(x) + w / 2, Math.abs(y) + h / 2) > limit) continue;
      if (placed.some((p) => Math.abs(p.x - x) * 2 < p.w + w && Math.abs(p.y - y) * 2 < p.h + h)) continue;
      placed.push({ ...word, x, y, w, h });
      break;
    }
  }
  return placed;
}

/** Steps 10, 14: a centred ring that fits a w x h canvas with its names and a margin. */
export function fitRing(w, h) {
  const ri = Math.max(1, (Math.min(w, h) / 2 - LABEL_SPACE - MARGIN) / 1.15);
  return { w, h, cx: w / 2, cy: h / 2, ri, ro: ri * 1.15, facing: null };
}

/** Step 11: the turn that sets a name along the ring at angle `a` so it never reads upside down or mirrored. */
export const labelTurn = (a) => (Math.sin(a) > 0 ? -Math.PI / 2 : Math.PI / 2);

/** The ring texture only changes when its sectors change. */
export const ringKey = (scene) => scene.layout.sectors.map((s) => `${s.kind}:${s.name}`).join('|');

/** FR8: what the pointer at (x, y), relative to the ring's centre, is over: a placed word, else a file, else nothing. */
export function hitTest(scene, x, y, ri, words = []) {
  const word = words.find((w) => Math.abs(x - w.x) <= w.w / 2 && Math.abs(y - w.y) <= w.h / 2);
  if (word) return { word };
  const d = Math.hypot(x, y);
  if (d < ri * 0.5 || d > ri * 1.4) return null;
  const a = wrap(Math.atan2(y, x));
  let best = null;
  let gap = 0.04;
  for (const f of scene.files) {
    const g = Math.abs(wrap(f.angle - a + Math.PI) - Math.PI);
    if (g < gap) [best, gap] = [f, g];
  }
  return best ? { file: best } : null;
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

/** NFR5, step 12: the LCARS theme from the CSS tokens: steel for read, amber for write, coral for delete. */
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
  const kinds = { read: toRgb(read('--steel')), write: toRgb(read('--amber')), delete: toRgb(read('--coral')) };
  return { base, kinds, read: { ...base, ink: kinds.read }, write: { ...base, ink: kinds.write }, delete: { ...base, ink: kinds.delete } };
}

/** Step 12, FR7.1: one mark per file in the ring band, in its kind's colour (coral once deleted); a fresh one is larger and glows. */
export function drawMarks(ctx, files, now, geo, themes) {
  const r = (geo.ri + geo.ro) / 2;
  for (const f of files) {
    const age = Math.max(0, now - f.lastAt);
    if (age > FADE) continue;
    const fresh = 1 - age / FADE;
    ctx.shadowColor = rgba(colourOf(f, themes), 0.9);
    ctx.shadowBlur = 12 * fresh;
    ctx.fillStyle = rgba(colourOf(f, themes), 0.35 + 0.65 * fresh);
    ctx.beginPath();
    ctx.arc(Math.cos(f.angle) * r, Math.sin(f.angle) * r, 2.5 + 3 * fresh, 0, TAU);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
}

const colourOf = (x, themes) => (x.deleted || x.kind === 'delete' ? themes.base.accent : (themes.kinds?.[x.kind] ?? themes.base.ink));

/** A file's shown name: its base name, or `path/` for a folder mark; a name over 24 characters is cut with '…' to fit. */
function fileLabel(ctx, f) {
  const label = f.folder ? `${f.path}/` : f.path.slice(f.path.lastIndexOf('/') + 1);
  if (label.length <= NAME_MAX) return label;
  // ponytail: a long name is cut to the label band's width, which is short; show it whole in the hover tip.
  let cut = label;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > LABEL_SPACE) cut = cut.slice(0, -1);
  return `${cut}…`;
}

/** Step 14: the latest file names at 11 px, along the radius just outside the ring, newest first and never upside down. */
function drawFileNames(ctx, files, now, geo, themes) {
  const recent = files.filter((f) => !f.outside && now - f.lastAt < FADE).sort((a, b) => b.lastAt - a.lastAt);
  ctx.font = `11px ${FONT}`;
  ctx.textBaseline = 'middle';
  for (const f of recent.slice(0, NAMES)) {
    const right = Math.cos(f.angle) >= 0;
    ctx.save();
    ctx.rotate(f.angle + (right ? 0 : Math.PI));
    ctx.textAlign = right ? 'left' : 'right';
    ctx.fillStyle = rgba(colourOf(f, themes), 0.25 + 0.65 * (1 - (now - f.lastAt) / FADE));
    ctx.fillText(fileLabel(ctx, f), (right ? 1 : -1) * (geo.ro + 6), 0);
    ctx.restore();
  }
}

/** Step 14: the cloud of agent words, each in the colour of its last touch, fading in and out. */
function drawWords(ctx, placed, themes) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const w of placed) {
    const rgb = colourOf(w, themes);
    ctx.font = `bold ${w.size}px ${FONT}`;
    ctx.shadowColor = rgba(rgb, 1);
    ctx.shadowBlur = 10 * w.alpha;
    ctx.fillStyle = rgba(rgb, w.alpha);
    ctx.fillText(w.name, w.x, w.y);
  }
  ctx.shadowBlur = 0;
}

/** Motion only: a soft radar sweep turning inside the ring. */
function drawSweep(ctx, geo, themes, t) {
  const a = (t * 0.6) % TAU;
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = rgba(themes.base.ink, 0.012 * (i + 1));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, geo.ri, a - 0.6 + i * 0.1, a);
    ctx.fill();
  }
}

/** The bend of the path from a word to the file at angle a1. */
const bend = (a1, ri) => [Math.cos(a1 - 0.5) * ri * 0.55, Math.sin(a1 - 0.5) * ri * 0.55];

/** Motion only: a faint line from each word to every file it touched in the last minute, fading with the word. */
function drawTraces(ctx, scene, placed, geo, themes, now) {
  const byName = new Map(placed.map((w) => [w.name, w]));
  ctx.lineWidth = 1;
  for (const b of scene.bundles) {
    const w = byName.get(b.word);
    if (!w || b.at > now || now - b.at >= MIN) continue;
    const c = bend(b.a1, geo.ri);
    ctx.strokeStyle = rgba(colourOf(b, themes), 0.18 * w.alpha);
    ctx.beginPath();
    ctx.moveTo(w.x, w.y);
    ctx.quadraticCurveTo(c[0], c[1], Math.cos(b.a1) * geo.ri, Math.sin(b.a1) * geo.ri);
    ctx.stroke();
  }
}

/** The point at p on the quadratic curve a-c-b. */
const at = (a, c, b, p) => [0, 1].map((i) => (1 - p) * (1 - p) * a[i] + 2 * (1 - p) * p * c[i] + p * p * b[i]);

/**
 * Step 14, motion only: every touch of the last 1.5 s as an asteroid flying from its word to its file. A faint trail
 * curves behind it, a glowing tail streams after it, and the small rock tumbles; the file's cell flashes as it lands.
 */
function drawAsteroids(ctx, scene, placed, ring, geo, themes, now) {
  const byName = new Map(placed.map((w) => [w.name, w]));
  for (const b of scene.bundles) {
    const age = now - b.at;
    const from = byName.get(b.word);
    if (!from || age < 0 || age > LINK) continue;
    const p = Math.min(1, age / LINK);
    const q = 1 - (1 - p) * (1 - p); // eases out as it nears the ring
    const rgb = colourOf(b, themes);
    const a = [from.x, from.y];
    const end = [Math.cos(b.a1) * geo.ri, Math.sin(b.a1) * geo.ri];
    const c = bend(b.a1, geo.ri);
    // The trail: the curve from the word up to the rock (de Casteljau split at q), fading as the flight ends.
    const head = at(a, c, end, q);
    ctx.strokeStyle = rgba(rgb, 0.25 * (1 - p));
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(a[0] + (c[0] - a[0]) * q, a[1] + (c[1] - a[1]) * q, head[0], head[1]);
    ctx.stroke();
    // The tail: glowing dots behind the rock, smaller and dimmer further back.
    ctx.shadowColor = rgba(rgb, 1);
    for (let i = 1; i <= 5; i++) {
      const [x, y] = at(a, c, end, Math.max(0, q - i * 0.03));
      ctx.shadowBlur = 8;
      ctx.fillStyle = rgba(rgb, 0.5 * (1 - i / 6));
      ctx.beginPath();
      ctx.arc(x, y, 2.5 * (1 - i / 7), 0, TAU);
      ctx.fill();
    }
    // The rock: an irregular outline of curved segments around the head, turning as it flies.
    const spin = age / 150 + b.t0;
    const seed = strHash(`${b.at}${b.word}`);
    ctx.shadowBlur = 14;
    ctx.fillStyle = rgba(rgb, 1);
    ctx.beginPath();
    const corners = 6;
    const pt = (k) => {
      const r = 3 + ((seed >> (k % 12)) & 3) * 0.6;
      const ang = spin + (k / corners) * TAU;
      return [head[0] + Math.cos(ang) * r, head[1] + Math.sin(ang) * r];
    };
    const start = pt(0);
    ctx.moveTo(start[0], start[1]);
    for (let k = 1; k <= corners; k++) {
      const ctl = pt(k - 0.5);
      const next = pt(k % corners);
      ctx.quadraticCurveTo(ctl[0], ctl[1], next[0], next[1]);
    }
    ctx.fill();
    if (p > 0.8) ring.flash(ctx, b.a1, (p - 0.8) / 0.2, b.failed);
  }
  ctx.shadowBlur = 0;
}

/**
 * One frame. `now` is in milliseconds; with motion off (NFR3) nothing flies or pulses and the cloud stands still.
 * Returns the placed words, for hit-testing.
 */
export function drawFrame(ctx, scene, ring, geo, themes, now, { motion, hover } = {}) {
  const t = now / 1000;
  const measure = (s, size) => {
    ctx.font = `bold ${size}px ${FONT}`;
    return ctx.measureText(s).width;
  };
  const placed = placeCloud(cloudWords(scene.bundles, now), geo.ri, measure);
  ctx.save();
  ctx.fillStyle = themes.base.bg;
  ctx.fillRect(0, 0, geo.w, geo.h);
  ctx.translate(geo.cx, geo.cy);
  ring.draw(ctx, 0); // ponytail: the ring stands still; pretty-events' ringRotation is there if a slow spin is wanted
  if (motion) drawSweep(ctx, geo, themes, t);
  if (motion) ring.pulse(ctx, t, 1, Math.min(1, scene.bundles.filter((b) => b.at <= now && now - b.at < MIN).length / 30));
  drawMarks(ctx, scene.files, now, geo, themes);
  drawFileNames(ctx, scene.files, now, geo, themes);
  if (motion) drawTraces(ctx, scene, placed, geo, themes, now);
  drawWords(ctx, placed, themes);
  if (motion) drawAsteroids(ctx, scene, placed, ring, geo, themes, now);
  if (hover) {
    const anchor = hover.at ?? [Math.cos(hover.angle) * geo.ri, Math.sin(hover.angle) * geo.ri];
    const out = anchor[0] >= 0;
    const box = [anchor[0] + (out ? 1 : -1) * (geo.ro - geo.ri + 40), anchor[1] - 20];
    const callout = { t0: t - 1, t1: t + 1, alert: hover.alert, title: hover.title, lines: hover.lines };
    drawCallouts(ctx, [callout], t, () => ({ anchor, box, right: !out }), themes.base);
  }
  ctx.restore();
  return placed;
}
