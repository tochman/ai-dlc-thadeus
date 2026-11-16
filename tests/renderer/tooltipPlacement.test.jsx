// US-0414 FR1.4, NFR1: the shared tooltip's placement, as a pure function of the anchor, the tip and the window.
import { describe, expect, it } from 'vitest';
import { placeTooltip } from '../../src/renderer/tooltipPlacement.js';

const VIEW = { width: 1000, height: 800 };
const rect = (left, top, width = 100, height = 20) => ({ left, top, width, height, right: left + width, bottom: top + height });
const TIP = { width: 200, height: 40 };

describe('placeTooltip (US-0414 FR1.4)', () => {
  it('opens below the anchor, left-aligned, by default', () => {
    expect(placeTooltip(rect(100, 100), TIP, VIEW)).toEqual({ top: 124, left: 100, side: 'below' });
  });

  it('flips above when there is no room below', () => {
    expect(placeTooltip(rect(100, 760), TIP, VIEW)).toEqual({ top: 716, left: 100, side: 'above' });
  });

  it('shifts left so it stays 4 px inside the right edge', () => {
    expect(placeTooltip(rect(900, 100), TIP, VIEW).left).toBe(796);
  });

  it('shifts right so it stays 4 px inside the left edge', () => {
    expect(placeTooltip(rect(-50, 100), TIP, VIEW).left).toBe(4);
  });

  it('clamps to the window when it fits neither below nor above', () => {
    const p = placeTooltip(rect(0, 50, 100, 100), { width: 200, height: 700 }, VIEW);
    expect(p.top).toBeGreaterThanOrEqual(4);
    expect(p.top + 700).toBeLessThanOrEqual(796);
  });

  it('pins to the top-left margin when the window is smaller than the tip', () => {
    expect(placeTooltip(rect(10, 10), { width: 300, height: 300 }, { width: 200, height: 200 })).toMatchObject({ top: 4, left: 4 });
  });
});
