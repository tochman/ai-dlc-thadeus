// The palette for places that cannot use CSS variables directly (FR1.2). It is read from theme.css at run
// time, so the tokens on :root stay the only place a colour is written.

/** The value of a token on :root, or '' when the stylesheet is not loaded (tests). */
export function token(name) {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** xterm's theme from the tokens: --bg, --text-2, amber cursor, --steel-deep selection. Unset keys keep xterm's default. */
export function xtermTheme() {
  const theme = {
    background: token('--bg'),
    foreground: token('--text-2'),
    cursor: token('--amber'),
    cursorAccent: token('--bg'),
    selectionBackground: token('--steel-deep')
  };
  return Object.fromEntries(Object.entries(theme).filter(([, v]) => v));
}
