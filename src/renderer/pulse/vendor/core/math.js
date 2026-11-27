// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/core/math.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
export const TAU = Math.PI * 2;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const easeOut = (u) => 1 - Math.pow(1 - u, 3);

export const easeInOut = (u) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

export const wrap = (a) => ((a % TAU) + TAU) % TAU;

export function lowerBound(items, key, x) {
  let lo = 0;
  let hi = items.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (items[mid][key] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export const formatInt = (n) => Math.round(n).toLocaleString('en-US');

export const hex = (n, len = 6) => Math.floor(n).toString(16).padStart(len, '0').slice(-len);

export function quantile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}
