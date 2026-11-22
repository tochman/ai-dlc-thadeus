// LCARS primitives (US-0403 FR2.3): segmented bars, the inner elbow frame, dots, readouts and hairlines.
// US-0417: the shared pieces of the richer language (round elbow, diagonal frame, segmented title bar, pill, block
// with state strip and figure, readout table, meters, section heading, list drawer, entrance). The rules they follow
// are written at the top of theme.css.
// Colour always comes from classes in theme.css; decorative parts are aria-hidden and never role="status" (FR2.4).
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { formatCost } from './format.js';
import { t } from '../shared/i18n.js';
import Tooltip from './Tooltip.jsx';
import { useFold } from './useFold.js';

/** US-0417: the only bar thicknesses, in px (the same as the --bar-* tokens in theme.css). */
export const BARS = { thin: 18, medium: 30, large: 42, wide: 60, thick: 150 };

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * US-0417 (Curves follow curves): the radii of a round elbow, scaled from the person's reference elbow (arm 100, bar
 * 35, outer 70, inner 50): outer = 0.7 x arm width, inner = 1.4 x bar thickness, at most half the arm width.
 * @param {number} arm arm width in px
 * @param {number} bar bar thickness in px
 * @returns {{outer: number, inner: number}}
 */
export function elbowRadii(arm, bar) {
  return { outer: round2(arm * 0.7), inner: round2(Math.min(bar * 1.4, arm / 2)) };
}

/**
 * US-0417: a round elbow, one element, where an arm `arm` px wide turns into a bar `bar` px thick. Only circular arcs;
 * the inner black is cut by ::after (theme.css). Children (the mark) sit on it, decorative.
 * @param {{arm?: number, bar?: number, corner?: 'top'|'bottom', className?: string, children?: import('react').ReactNode}} props
 */
export function Elbow({ arm = BARS.thick, bar = BARS.thin, corner = 'top', className = '', children }) {
  const { outer, inner } = elbowRadii(arm, bar);
  const style = { '--elbow-arm': `${arm}px`, '--elbow-bar': `${bar}px`, '--elbow-ro': `${outer}px`, '--elbow-ri': `${inner}px` };
  return (
    <div className={`lcars-elbow lcars-elbow--${corner} lcars-e-wipe ${className}`} style={style} aria-hidden="true" data-testid="lcars-elbow">
      {children}
    </div>
  );
}

/** US-0417 (Shape rule): a pill is an action, always a real button. `tone`: primary | quiet | alert | notice. */
export function Pill({ tone, className = '', children, ...rest }) {
  return (
    <button type="button" className={`lcars-pill${tone ? ` lcars-pill--${tone}` : ''} ${className}`} {...rest}>
      {children}
    </button>
  );
}

/**
 * US-0417 (Titles): a segmented bar headed by its title. The title's cap height is the bar's thickness, set by
 * `level`: window (30 px bar, 35 px type), frame (42 px, 49 px) or section (18 px, 21 px). Then a dark sub-label
 * segment, filler segments, and `trailing` (pills) as the last segments.
 * @param {{title?: import('react').ReactNode, as?: string, level?: 'window'|'frame'|'section', sub?: import('react').ReactNode,
 *          trailing?: import('react').ReactNode, className?: string}} props
 */
export function SegBar({ title, titleId, as: Title = 'h2', level = 'frame', sub, trailing, className = '' }) {
  return (
    <div className={`lcars-segbar lcars-segbar--${level} ${className}`} data-testid="lcars-segbar">
      {title != null && (
        <Title id={titleId} className="lcars-title lcars-e-rise">
          {title}
        </Title>
      )}
      {sub != null && <span className="lcars-sseg lcars-seg-lab">{sub}</span>}
      <span className="lcars-sseg lcars-sseg--steel lcars-e-draw" aria-hidden="true" />
      <span className="lcars-sseg lcars-sseg--fix lcars-e-draw" aria-hidden="true" />
      {trailing}
    </div>
  );
}

/** US-0417: one 1 px hairline, decoration only. Hairlines never fade (theme.css). */
export function Hairline({ vertical = false, className = '' }) {
  return <span className={`lcars-hairline${vertical ? ' lcars-hairline--v' : ''} ${className}`} aria-hidden="true" data-testid="lcars-hairline" />;
}

/**
 * US-0417 (Shape rule): a square block, for navigation and readouts. Label bottom right; `figure` a small readout top
 * left; `strip` the state at the left edge (live steel, alert coral, parked outline, done grey, quiet slate);
 * `selected` turns it light with black text (selection is brightness). `index` staggers the entrance.
 * @param {{as?: string, strip?: 'live'|'alert'|'parked'|'done'|'quiet', figure?: import('react').ReactNode, selected?: boolean,
 *          tone?: 'dark'|'deep'|'mid'|'steel', size?: 'sm'|'sub', index?: number, className?: string}} props
 */
export function Block({ as: Tag = 'div', strip, figure, selected = false, tone, size, index, className = '', style, children, ...rest }) {
  const cls = [
    'lcars-nb',
    tone && `lcars-nb--${tone}`,
    size && `lcars-nb--${size}`,
    strip && `lcars-strip--${strip}`,
    selected && 'is-sel',
    'lcars-e-block',
    className
  ]
    .filter(Boolean)
    .join(' ');
  const button = Tag === 'button' && rest.type === undefined ? { type: 'button' } : {};
  return (
    <Tag className={cls} style={index == null ? style : { ...style, '--i': Math.min(index, 12) }} {...button} {...rest}>
      {figure != null && figure !== '' && <span className="lcars-nb-fig">{figure}</span>}
      <span className="lcars-nb-label">{children}</span>
    </Tag>
  );
}

/**
 * US-0417 (Dense readouts): a readout table. Tabular figures, a square legend key in the first cell, three levels of
 * brightness: the first row is the key value (white), value columns live (steel), the rest grey. A row's `strip` is its
 * state at the left edge (as on a block); `attrs` go on its <tr> (a test id, tabIndex, an extra class).
 * @param {{caption?: string, columns: Array<{label: string, align?: 'right', value?: boolean}>,
 *          rows: Array<{id?: string, legend?: string, strip?: string, attrs?: object, cells: import('react').ReactNode[]}>,
 *          total?: import('react').ReactNode[]}} props
 */
export function ReadoutTable({ caption, columns, rows, total, className = '' }) {
  if (!rows?.length) return null;
  const cellClass = (col = {}) => [col.align === 'right' && 'is-right', col.value && 'is-value'].filter(Boolean).join(' ') || undefined;
  return (
    <table className={`lcars-rt ${className}`}>
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr>
          {columns.map((col, i) => (
            <th key={i} scope="col" className={cellClass({ align: col.align })}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr
            key={row.id ?? ri}
            {...row.attrs}
            className={['lcars-e-rise', ri === 0 && 'is-top', row.strip && `lcars-strip--${row.strip}`, row.attrs?.className].filter(Boolean).join(' ')}
          >
            {row.cells.map((cell, ci) => (
              <td key={ci} className={cellClass(columns[ci])}>
                {ci === 0 && row.legend && <span className={`lcars-key lcars-key--${row.legend}`} aria-hidden="true" />}
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {total && (
        <tfoot>
          <tr className="is-total">
            {total.map((cell, ci) => (
              <td key={ci} className={cellClass(columns[ci])}>
                {cell}
              </td>
            ))}
          </tr>
        </tfoot>
      )}
    </table>
  );
}

/**
 * US-0417 (Readouts never look like controls): a flat read-only meter, a filled bar that ends flat with a thin end
 * tick. An image with its value in words: no slider role, no focus stop, no knob. `value` is a percentage.
 * @param {{label: string, value: number, text?: string, className?: string}} props
 */
export function Meter({ label, value, text, className = '' }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={`lcars-meter lcars-e-growx ${className}`} role="img" aria-label={`${label}: ${text ?? `${Math.round(pct)} %`}`} data-testid="lcars-meter">
      <span className="lcars-meter-rail" />
      <span className="lcars-meter-fill" style={{ width: `${pct}%` }} />
      <span className="lcars-meter-tick" style={{ left: `${pct}%` }} />
    </div>
  );
}

/**
 * US-0417: a segmented meter, one cell per segment. `segments` are tones: key (white), live (steel), mid, deep,
 * done (light slate) or off. Read-only, so an image with `label` as its words.
 * @param {{label: string, segments: string[], className?: string}} props
 */
export function SegMeter({ label, segments, className = '' }) {
  return (
    <div className={`lcars-segmeter lcars-e-growx ${className}`} role="img" aria-label={label} data-testid="lcars-segmeter">
      {segments.map((tone, i) => (
        <span key={i} className={`is-${tone}`} />
      ))}
    </div>
  );
}

/**
 * US-0417: a section heading row. The title (cap height = the 18 px row), a rule, the controls, and the drawer toggle
 * as the last element when the section heads a list.
 */
export function SectionHeading({ title, as: Title = 'h2', controls, toggle, className = '' }) {
  return (
    <div className={`lcars-sect lcars-e-rise ${className}`} data-testid="section-heading">
      <Title className="lcars-title lcars-title--section">{title}</Title>
      <span className="lcars-sect-rule" aria-hidden="true" />
      {controls}
      {toggle}
    </div>
  );
}

/**
 * US-0417 with US-0415: the list drawer every list column uses. The toggle is the last element of the list's heading
 * row; folded, the column closes to the 30 px stack (› block, count, live segment, vertical label), and a click
 * anywhere on it opens the list again. The list stays mounted (inert while folded), so its state is kept; focus
 * follows the control that replaces the one clicked. The state is kept per view by useFold. Motion is CSS only, with
 * full motion only (theme.css).
 * @param {{viewId: 'intents'|'features'|'releases'|'editor'|'activity', title: string, count?: number, live?: boolean,
 *          controls?: import('react').ReactNode, label?: string, className?: string, children: import('react').ReactNode}} props
 */
export function ListDrawer({ viewId, title, count, live = false, controls, label = title, className = '', children }) {
  const { folded, toggle, toggleProps } = useFold(viewId);
  const id = useId();
  const toggleRef = useRef(null);
  const openRef = useRef(null);
  const moved = useRef(false); // focus moves after a click only, never when the saved state is read
  useEffect(() => {
    if (!moved.current) return;
    moved.current = false;
    (folded ? openRef : toggleRef).current?.focus({ preventScroll: true });
  }, [folded]);
  const open = (e) => {
    e.stopPropagation();
    moved.current = true;
    toggle();
  };
  const toggleButton = (
    <button
      {...toggleProps}
      ref={toggleRef}
      className="list-fold-toggle lcars-drawer-toggle"
      aria-controls={id}
      onClick={(e) => {
        moved.current = true;
        toggleProps.onClick(e);
      }}
    />
  );
  return (
    <div className={`lcars-drawer${folded ? ' is-folded' : ''} ${className}`} data-testid="list-drawer">
      <div className="lcars-drawer-content" id={id} inert={folded} aria-hidden={folded || undefined}>
        <SectionHeading title={title} controls={controls} toggle={toggleButton} />
        {children}
      </div>
      <div className="lcars-drawer-stack" data-testid="list-drawer-stack" aria-hidden={folded ? undefined : 'true'} onClick={folded ? open : undefined}>
        <button
          type="button"
          ref={openRef}
          className="lcars-drawer-open"
          aria-expanded={!folded}
          aria-controls={id}
          aria-label={count == null ? t('fold.show') : t('fold.showN', { n: count })}
          tabIndex={folded ? 0 : -1}
          onClick={open}
          data-testid="list-drawer-open"
        >
          ›
        </button>
        {count != null && (
          <span className="lcars-drawer-count" aria-hidden="true">
            {count}
          </span>
        )}
        {live && <span className="lcars-drawer-live" aria-hidden="true" />}
        <span className="lcars-drawer-label" aria-hidden="true">
          <b>{label}</b>
        </span>
        <span className="lcars-drawer-fill" aria-hidden="true" />
        <span className="lcars-drawer-end" aria-hidden="true" />
      </div>
    </div>
  );
}

/** How long a view's entrance class stays on: the sequence ends by ~0.8 s (theme.css, Entrance). */
export const ENTRANCE_MS = 1000;
const motionFull = () => typeof document !== 'undefined' && document.documentElement.dataset.motion === 'full';

/**
 * US-0417 (Entrance): true for ENTRANCE_MS each time `viewKey` changes (and on mount), so the view's root can carry
 * `is-entering` and its pieces run the one shared sequence. Never with reduced or no motion; a re-render with the
 * same key does not run it again. The animations are transform and opacity only, so clicks are never blocked.
 * @param {string} viewKey what identifies the view shown, e.g. `${projectId}:${view}`
 * @returns {boolean}
 */
export function useEntrance(viewKey) {
  const [entering, setEntering] = useState(false);
  useLayoutEffect(() => {
    if (!motionFull()) return undefined;
    setEntering(true);
    const timer = setTimeout(() => setEntering(false), ENTRANCE_MS);
    return () => clearTimeout(timer);
  }, [viewKey]);
  return entering;
}

// The diagonal corner's geometry, fixed in px (360 x 280) as in the approved mockup: a band wide where it leaves the
// arm and thin where it joins the top bar, circular bends only, and the two hairlines at a constant 12 px offset.
const DF_BAND =
  'M24 280 A169 169 0 0 1 73.5 160.5 L137.4 96.6 A193 193 0 0 1 274 40 L360 40 L360 82 L312 82 A121 121 0 0 0 226.6 117.4 L209.4 134.6 A121 121 0 0 0 174 220 L174 280 Z';
const DF_HAIR_OUT = 'M12 280 A181 181 0 0 1 65 152 L128.9 88.1 A205 205 0 0 1 274 28 L360 28';
const DF_HAIR_IN = 'M186 280 V219 A106 106 0 0 1 217.1 143.9 L235.9 125.1 A106 106 0 0 1 311 94 L360 94';

/**
 * US-0417: the curved diagonal frame for the data sub-views (the intent head, Cost, Activity, Velocity). The title
 * heads the 42 px top bar with `sub` in a dark segment and `tag` in an outlined box at its end; `readouts` drop out of
 * the arm as blocks; `corner` ({label, value}) is written on the band; `footer` labels the bottom bar. Content sits on
 * plain black. Below 560 px the corner drops and the readouts flow into a row (container query in theme.css).
 * `arm` is more content for the arm under the readouts (a small live view, a nav block); `titleRef` makes the title a
 * focus target (tabIndex -1), for a view that moves focus to its title on open.
 * @param {{title: import('react').ReactNode, as?: string, sub?: import('react').ReactNode, tag?: import('react').ReactNode,
 *          corner?: {label: string, value: string}, footer?: import('react').ReactNode,
 *          readouts?: Array<{k: import('react').ReactNode, v: import('react').ReactNode, tone?: 'steel'|'deep', strip?: string}>,
 *          arm?: import('react').ReactNode, titleRef?: object, className?: string, children?: import('react').ReactNode}} props
 */
export function DiagonalFrame({ title, as: Title = 'h2', sub, tag, corner, footer, readouts = [], arm, titleRef, className = '', children }) {
  return (
    <section className={`lcars-df ${className}`} data-testid="lcars-diagonal-frame">
      <div className="lcars-df-in lcars-e-slide">
        <svg className="lcars-df-corner lcars-e-wipe" width="360" height="280" viewBox="0 0 360 280" aria-hidden="true">
          <path className="lcars-df-band" d={DF_BAND} />
          {corner && (
            <>
              <text className="lcars-df-corner-label" x="162" y="224" textAnchor="end">
                {corner.label}
              </text>
              <text className="lcars-df-corner-value" x="162" y="254" textAnchor="end">
                {corner.value}
              </text>
            </>
          )}
          <path className="lcars-df-hair" d={DF_HAIR_OUT} />
          <path className="lcars-df-hair" d={DF_HAIR_IN} />
        </svg>
        <span className="lcars-df-x lcars-df-hl-o lcars-e-draw" aria-hidden="true" />
        <span className="lcars-df-x lcars-df-hl-i lcars-e-draw" aria-hidden="true" />
        <div className="lcars-df-x lcars-df-top">
          <Title ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="lcars-title lcars-e-rise">
            {title}
          </Title>
          {sub != null && <span className="lcars-sseg lcars-seg-lab">{sub}</span>}
          <span className="lcars-sseg lcars-e-draw" aria-hidden="true" />
          {tag != null && (
            <span className="lcars-df-tag lcars-e-fade">
              <span className="lcars-dotc" aria-hidden="true">
                {Array.from({ length: 6 }, (_, i) => (
                  <i key={i} />
                ))}
              </span>
              <span className="lcars-tagbox">{tag}</span>
            </span>
          )}
          <span className="lcars-sseg lcars-sseg--cap lcars-e-draw" aria-hidden="true" />
        </div>
        <span className="lcars-df-x lcars-df-hl-left" aria-hidden="true" />
        <span className="lcars-df-x lcars-df-hl-in" aria-hidden="true" />
        <span className="lcars-df-x lcars-df-low" aria-hidden="true" />
        <div className="lcars-df-x lcars-df-bot">
          {footer != null && <span className="lcars-sseg lcars-seg-lab">{footer}</span>}
          <span className="lcars-sseg lcars-e-draw" aria-hidden="true" />
          <span className="lcars-sseg lcars-sseg--cap lcars-e-draw" aria-hidden="true" />
        </div>
        {(readouts.length > 0 || arm) && (
          <div className="lcars-df-arm">
            {readouts.map((r, i) => (
              <div
                key={i}
                className={['lcars-dblk', r.tone && `lcars-dblk--${r.tone}`, r.strip && `lcars-strip--${r.strip}`, 'lcars-e-block'].filter(Boolean).join(' ')}
                style={{ '--i': Math.min(i, 12) }}
                data-testid="lcars-diagonal-readout"
              >
                <span className="lcars-dblk-k">{r.k}</span>
                <span className="lcars-dblk-v">{r.v}</span>
              </div>
            ))}
            {arm}
            <span className="lcars-df-arm-close" aria-hidden="true" />
          </div>
        )}
        <div className="lcars-df-body" data-testid="lcars-diagonal-body">
          {children}
        </div>
      </div>
    </section>
  );
}

const BAR_LEVEL = { [BARS.thin]: 'section', [BARS.medium]: 'window', [BARS.large]: 'frame' };

/**
 * US-0417: the round frame (Configuration, the dialogs). A top elbow and a bottom elbow with circular arcs only, radii
 * from elbowRadii (outer 0.7 x arm, inner 1.4 x bar); the title heads the top bar (`top` px: 42 frame, 30 window) with
 * `sub` and `trailing` pills as its last segments; `footer` labels the bottom bar. The arm is filled, or a column of
 * readout blocks when `armContent` is given; `corner` (the dialogs' brand block) takes the arm column of the top elbow.
 * @param {{title: import('react').ReactNode, titleId?: string, as?: string, sub?: import('react').ReactNode,
 *          trailing?: import('react').ReactNode, footer?: import('react').ReactNode, corner?: import('react').ReactNode,
 *          armContent?: import('react').ReactNode, arm?: number, top?: number, bottom?: number, className?: string,
 *          children?: import('react').ReactNode}} props
 */
export function RoundFrame({
  title,
  titleId,
  as,
  sub,
  trailing,
  footer,
  corner,
  armContent,
  arm = BARS.medium,
  top = BARS.large,
  bottom = BARS.thin,
  className = '',
  children
}) {
  const upper = elbowRadii(arm, top);
  const lower = elbowRadii(arm, bottom);
  const style = {
    '--rf-arm': `${arm}px`,
    '--rf-top': `${top}px`,
    '--rf-bot': `${bottom}px`,
    '--rf-ro': `${upper.outer}px`,
    '--rf-ri': `${upper.inner}px`,
    '--rf-rob': `${lower.outer}px`,
    '--rf-rib': `${lower.inner}px`
  };
  const cls = ['lcars-rf', corner != null && 'has-corner', armContent != null && 'has-readouts', className].filter(Boolean).join(' ');
  return (
    <section className={cls} style={style} data-testid="lcars-round-frame">
      <div className="lcars-rf-tl lcars-e-wipe" aria-hidden={corner == null ? 'true' : undefined}>
        {corner}
      </div>
      <div className="lcars-rf-top lcars-e-slide">
        <SegBar title={title} titleId={titleId} as={as} level={BAR_LEVEL[top] ?? 'frame'} sub={sub} trailing={trailing} />
      </div>
      <div className="lcars-rf-arm" aria-hidden={armContent == null ? 'true' : undefined}>
        {armContent}
      </div>
      <div className="lcars-rf-body" data-testid="lcars-round-body">
        {children}
      </div>
      <div className="lcars-rf-bl lcars-e-wipe" aria-hidden="true" />
      <div className="lcars-rf-bot">
        {footer != null && <span className="lcars-sseg lcars-seg-lab">{footer}</span>}
        <span className="lcars-sseg lcars-sseg--deep lcars-e-draw" aria-hidden="true" />
        <span className="lcars-sseg lcars-sseg--cap lcars-e-draw" aria-hidden="true" />
      </div>
    </section>
  );
}

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
          <Tooltip text={r.name} focusable>
            <span className="lcars-readout-name">{r.label ?? r.name}</span>
          </Tooltip>
          <span className="lcars-readout-usd">{formatCost(r)}</span>
          <span className="lcars-readout-share">{totalUsd > 0 && !r.missingPrice ? `${Math.round((r.usd / totalUsd) * 100)} %` : '–'}</span>
        </Fragment>
      ))}
    </div>
  );
}
