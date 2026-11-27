// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/components/canvas.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
export const FONT = 'Menlo, "SF Mono", Consolas, monospace';

export function offscreen(width, height) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(width);
  c.height = Math.ceil(height);
  return c;
}

export function context(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  return ctx;
}

export const rgba = (rgb, a) => `rgba(${rgb},${a})`;

export function text(ctx, x, y, value, { size = 8, color, weight = '', align = 'left' }) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
  ctx.textAlign = 'left';
}

export function quadPoint(p0, c, p1, s) {
  const u = 1 - s;
  return [u * u * p0[0] + 2 * u * s * c[0] + s * s * p1[0], u * u * p0[1] + 2 * u * s * c[1] + s * s * p1[1]];
}
