// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/scene/layout.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
import { TAU } from '../core/math.js';

export function layoutSectors(groups, handlers, gap = 0.012) {
  const producers = groups.map((g) => ({ name: g.name, types: g.types, kind: 'producer', weight: g.types.length + 4 }));
  const consumers = handlers.map((h) => ({ name: h, types: [h], kind: 'consumer', weight: 4 }));
  const every = Math.max(1, Math.round(producers.length / Math.max(1, consumers.length)));
  const items = [];
  producers.forEach((p, i) => {
    items.push(p);
    const next = (i + 1) % every === 0 ? consumers.shift() : undefined;
    if (next) items.push(next);
  });
  items.push(...consumers);
  const total = items.reduce((sum, s) => sum + s.weight, 0);
  let a = 0;
  const sectors = items.map((s) => {
    const span = (s.weight / total) * TAU;
    const sector = { ...s, a0: a + gap, a1: a + span - gap, mid: a + span / 2 };
    a += span;
    return sector;
  });
  return {
    sectors,
    producers: new Map(sectors.filter((s) => s.kind === 'producer').map((s) => [s.name, s])),
    consumers: new Map(sectors.filter((s) => s.kind === 'consumer').map((s) => [s.name, s]))
  };
}

export function ringRotation(layout, focus, duration, { omega = -0.055, facing = 0 } = {}) {
  const sector = (focus ? layout.producers.get(focus) : undefined) ?? layout.sectors[0];
  return (t) => facing - sector.mid - omega * (duration / 2) + omega * t + 0.08;
}
