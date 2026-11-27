// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/exhaust.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
// Only eventAngle, which the scene uses for file angles; the exhaust rays are left out.
import { hash } from '../core/random.js';

export function eventAngle(layout, group, id) {
  const s = layout.producers.get(group) ?? layout.sectors[0];
  return s.a0 + hash(id * 0.618) * (s.a1 - s.a0);
}
