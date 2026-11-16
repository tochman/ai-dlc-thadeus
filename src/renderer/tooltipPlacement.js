// US-0414 FR1.4: where the shared tooltip opens. Pure (no DOM), so it is tested with plain numbers.
// Below the anchor by default, above when only that fits, and always at least MARGIN px inside the window.

const GAP = 4; // between the anchor and the tip
const MARGIN = 4; // from every window edge

// A window smaller than the tip pins it to the top-left margin (max wins over min).
const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

/**
 * Places a tip of `tip` size next to `anchor` (a DOMRect-like box) inside `view` (US-0414 FR1.4).
 * @returns {{ top: number, left: number, side: 'below' | 'above' }}
 */
export function placeTooltip(anchor, tip, view) {
  const below = anchor.bottom + GAP;
  const above = anchor.top - GAP - tip.height;
  const fitsBelow = below + tip.height <= view.height - MARGIN;
  const fitsAbove = above >= MARGIN;
  const side = fitsBelow || (!fitsAbove && view.height - anchor.bottom >= anchor.top) ? 'below' : 'above';
  return {
    top: clamp(side === 'below' ? below : above, MARGIN, view.height - MARGIN - tip.height),
    left: clamp(anchor.left, MARGIN, view.width - MARGIN - tip.width),
    side
  };
}
