// Vendored from MoulikRT/pretty-events@3f003aad4ec241761e090af0753d62984eb312a8 src/scene/geometry.ts (MIT, see LICENSE); types stripped, logic unchanged. US-0418 FR1.
export const LOGICAL_WIDTH = 1080;
export const TOP = 58;
export const PANEL_HEIGHT = 158;
export const PANEL_GAP = 9;

export function parseInset(value) {
  const [top = 0, right = 0, bottom = 0, left = 0] = String(value ?? '')
    .split(',')
    .map((v) => Number(v) || 0);
  return { top, right, bottom, left };
}

export function frameGeometry({ width, height, hero = 'arc', panels = 'auto', inset = parseInset() }) {
  const w = LOGICAL_WIDTH;
  const h = Math.round((w * height) / width);
  const usable = h - inset.top - inset.bottom;
  const fit = usable >= 1250 ? 2 : usable >= 950 ? 1 : 0;
  const rows = panels === 'auto' ? fit : Math.min(fit, Number(panels) / 4);
  const hud = rows ? 8 + rows * PANEL_HEIGHT + (rows - 1) * PANEL_GAP + 8 : 0;
  const top = inset.top + TOP;
  const hudBottom = h - inset.bottom;
  const stageBottom = hudBottom - hud;
  const cy = (top + stageBottom) / 2;
  const frame = {
    w,
    h,
    scale: width / w,
    rows,
    barY: inset.top,
    top,
    stageBottom,
    hudBottom,
    hudLeft: inset.left,
    hudRight: w - inset.right,
    clipTop: inset.top ? 0 : top,
    clipBottom: inset.bottom ? h : stageBottom
  };

  if (hero === 'orbit') {
    const ri = Math.min(w, stageBottom - top) * 0.31;
    return { ...frame, cx: w / 2, cy, ri, ro: ri * 1.15, facing: null };
  }
  const right = hero === 'arc-right';
  return { ...frame, cx: right ? w * 0.9 : w * 0.1, cy, ri: 540, ro: 626, facing: right ? Math.PI : 0 };
}
