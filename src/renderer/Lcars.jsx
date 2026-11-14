// LCARS primitives (US-0403 FR2.3): segmented bars, the inner elbow frame, dots, readouts and hairlines.
// Colour always comes from classes in theme.css; decorative parts are aria-hidden and never role="status" (FR2.4).
import { Fragment } from 'react';
import { formatCost } from './format.js';
import { t } from '../shared/i18n.js';

/**
 * Segmented bar. `segs` is a list of [tone, size, content?]: a size up to 12 grows (flex), a larger one is a fixed px
 * width. A segment with content holds it (e.g. a small control); only then is the bar left in the accessibility tree.
 * @param {{segs: Array<[string, number, import('react').ReactNode?]>, className?: string}} props
 */
export function Bar({ segs, className = '' }) {
  const holds = segs.some(([, , content]) => content);
  return (
    <div className={`lcars-bar ${className}`} aria-hidden={holds ? undefined : 'true'}>
      {segs.map(([tone, size, content], i) => (
        <span
          key={i}
          className={`lcars-seg lcars-seg--${tone}${content ? ' lcars-seg--holds' : ''}`}
          style={size > 12 ? { width: size, flexShrink: 0 } : { flex: size }}
          aria-hidden={holds && !content ? 'true' : undefined}
        >
          {content || null}
        </span>
      ))}
    </div>
  );
}

/** Inner nested elbow frame with segment gaps in its bars, as in the mockup's Main. */
export function Frame({ children, className = '' }) {
  return (
    <div className={`lcars-frame ${className}`}>
      <span aria-hidden="true">
        <span className="lcars-cut lcars-cut--t1" />
        <span className="lcars-cut lcars-cut--t2" />
        <span className="lcars-cut lcars-cut--t3" />
        <span className="lcars-frame-cap" />
        <span className="lcars-cut lcars-cut--b1" />
      </span>
      <div className="lcars-frame-body">{children}</div>
    </div>
  );
}

/** Groups of 2 px lines; `widths` in percent. */
export function Hairlines({ widths = [100, 70, 100, 40, 100], lit = [2], tone = '' }) {
  return (
    <div className={`lcars-hairlines ${tone ? `lcars-hairlines--${tone}` : ''}`} aria-hidden="true">
      {widths.map((w, i) => (
        <span key={i} className={lit.includes(i) ? 'is-lit' : ''} style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

const DOTS_MAX = 24;

/** States for an intent's steps from its counts only: done, then the current one when live, then left. */
export function progressStates(done = 0, total = 0, live = false) {
  return Array.from({ length: Math.min(total, DOTS_MAX) }, (_, i) => (i < done ? 'done' : i === done && live ? 'current' : 'todo'));
}

/** Text for the dots, so status is never colour alone (NFR1). */
export function dotsLabel(states) {
  const n = (s) => states.filter((x) => x === s).length;
  const parts = [t('intents.dots.done', { n: n('done') })];
  const current = states.indexOf('current');
  if (current >= 0) parts.push(t('intents.dots.current', { n: current + 1 }));
  if (n('attn')) parts.push(t('intents.dots.attn', { n: n('attn') }));
  parts.push(t('intents.dots.todo', { n: n('todo') }));
  return parts.join(', ');
}

/** Dot indicator: `states` of done | current | attn | todo | skip. */
export function Dots({ states, small = false }) {
  if (states.length === 0) return null;
  return (
    <span className={`lcars-dots ${small ? 'lcars-dots--sm' : ''}`} role="img" aria-label={dotsLabel(states)}>
      {states.map((s, i) => (
        <span key={i} className={`lcars-dot lcars-dot--${s}`} />
      ))}
    </span>
  );
}

/**
 * Readout rows with a square colour key: the first row is lit, models are filled and agents outlined.
 * @param {{rows: Array<{name: string, usd: number, missingPrice?: boolean, key: 'steel'|'light'|'outline'}>, totalUsd: number}} props
 */
export function Readout({ rows, totalUsd }) {
  if (rows.length === 0) return null;
  return (
    <div className="lcars-readout">
      {rows.map((r) => (
        <Fragment key={`${r.key}-${r.name}`}>
          <span className={`lcars-readout-key lcars-readout-key--${r.key}`} aria-hidden="true" />
          <span className="lcars-readout-name" title={r.name}>
            {r.label ?? r.name}
          </span>
          <span className="lcars-readout-usd">{formatCost(r)}</span>
          <span className="lcars-readout-share">{totalUsd > 0 && !r.missingPrice ? `${Math.round((r.usd / totalUsd) * 100)} %` : '–'}</span>
        </Fragment>
      ))}
    </div>
  );
}
