// US-0414 FR1: the one LCARS tooltip of the app. It wraps a single anchor element, opens at once on keyboard focus and
// after HOVER_DELAY_MS on hover, closes on blur, leave, scroll and Esc, and renders in document.body through a portal so
// no scrolling container clips it. It measures the anchor and itself and places itself with placeTooltip (FR1.4).
// The look is the .lcars-tip class in theme.css (FR1.1, FR1.5).
import { Children, cloneElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { placeTooltip } from './tooltipPlacement.js';

// ponytail: a fixed hover delay per tooltip, no global hover-intent manager; add one if moving across a list still flashes.
export const HOVER_DELAY_MS = 300;

// The pointer-over events an inner tooltip has taken, so only the innermost anchor under the pointer opens (FR2.3).
const claimed = new WeakSet();

function closeTip(timer, setMode, setPos) {
  clearTimeout(timer.current);
  setMode(null);
  setPos(null);
}

/**
 * Shows `text` on hover and `focusText` (default `text`) on keyboard focus of its single child (US-0414 FR1.2, FR2.3).
 * `focusable` gives plain text a tab stop (FR2.2). Without any text the child renders as it is.
 */
export default function Tooltip({ text, focusText, focusable = false, children }) {
  const id = useId();
  const [mode, setMode] = useState(null); // null, 'hover' or 'focus'
  const [pos, setPos] = useState(null);
  const anchorRef = useRef(null);
  const tipRef = useRef(null);
  const timer = useRef(null);
  const shown = mode === 'focus' ? (focusText ?? text) : mode === 'hover' ? text : null;

  // Only the timer ref and state setters, so the effects below need no other dependency.
  const stopTimer = () => clearTimeout(timer.current);
  const hide = () => closeTip(timer, setMode, setPos);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!mode) return undefined;
    const close = () => closeTip(timer, setMode, setPos);
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
    };
  }, [mode]);

  useLayoutEffect(() => {
    if (!shown || !anchorRef.current || !tipRef.current) return;
    const tip = tipRef.current.getBoundingClientRect();
    const view = { width: window.innerWidth, height: window.innerHeight };
    const { top, left } = placeTooltip(anchorRef.current.getBoundingClientRect(), { width: tip.width, height: tip.height }, view);
    setPos({ top, left });
  }, [shown]);

  const child = Children.only(children);
  if (!text && !focusText) return child;

  const chain = (name, own) => (e) => {
    child.props[name]?.(e);
    own(e);
  };
  const props = {
    onMouseOver: chain('onMouseOver', (e) => {
      if (claimed.has(e.nativeEvent)) return hide(); // an inner tooltip has it
      claimed.add(e.nativeEvent);
      anchorRef.current = e.currentTarget;
      if (mode || !text) return undefined;
      stopTimer();
      timer.current = setTimeout(() => setMode('hover'), HOVER_DELAY_MS);
      return undefined;
    }),
    onMouseLeave: chain('onMouseLeave', () => mode !== 'focus' && hide()),
    onFocus: chain('onFocus', (e) => {
      if (e.target !== e.currentTarget) return; // focus inside the anchor belongs to that element
      stopTimer();
      anchorRef.current = e.currentTarget;
      setMode('focus');
    }),
    onBlur: chain('onBlur', hide)
  };
  if (shown) props['aria-describedby'] = [child.props['aria-describedby'], id].filter(Boolean).join(' ');
  if (focusable && child.props.tabIndex === undefined) props.tabIndex = 0;

  return (
    <>
      {cloneElement(child, props)}
      {shown &&
        createPortal(
          <div ref={tipRef} id={id} role="tooltip" className="lcars-tip" style={pos ?? { top: 0, left: 0, visibility: 'hidden' }}>
            {shown}
          </div>,
          document.body
        )}
    </>
  );
}
