// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/core/random.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandom(seed) {
  const next = mulberry32(seed);
  const range = (a, b) => a + (b - a) * next();
  return {
    next,
    range,
    int: (a, b) => Math.floor(range(a, b + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    exp: (rate) => -Math.log(1 - next()) / rate
  };
}

export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
