import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CATEGORY_LABEL, formatTime } from './format.js';
import { NOISY_EVENTS as NOISY } from '../main/parsers/audit.js'; // pure module, safe to bundle

const ALL = '';
const ROW_ESTIMATE = 34; // px, a collapsed row
const AT_NEWEST = 40; // px from the top that still counts as "at the newest end" (FR1.5)
const NAV_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End']);

function EventRow({ e, pos, total, isNew, open, onToggle }) {
  const label = `Händelse ${pos} av ${total}${isNew ? ', ny' : ''}: ${e.event ?? 'utan typ'}, ${formatTime(e.timestamp)}`;
  return (
    <>
      <button className="event-row" onClick={() => onToggle(e.key)} aria-expanded={open} aria-label={label} data-testid="timeline-event">
        <span className="event-time">{formatTime(e.timestamp)}</span>
        <span className="tag cat-tag">{CATEGORY_LABEL[e.category]}</span>
        <span className="event-type">
          {e.event ?? '(utan typ)'}
          {isNew && <span className="tag tag-new">ny</span>}
        </span>
        <span className="event-title">{e.fields.Stage ? `${e.fields.Stage}` : e.title}</span>
      </button>
      {open && (
        <dl className="event-fields">
          <div>
            <dt>Titel</dt>
            <dd>{e.title ?? '–'}</dd>
          </div>
          {Object.entries(e.fields).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
          <div>
            <dt>Källa</dt>
            <dd>{e.source}</dd>
          </div>
        </dl>
      )}
    </>
  );
}

export default function Timeline({ events, newKeys }) {
  const [showNoise, setShowNoise] = useState(false);
  const [type, setType] = useState(ALL);
  const [stage, setStage] = useState(ALL);
  const [openKeys, setOpenKeys] = useState(() => new Set()); // survives rows scrolling out of view (FR1.3)
  const scrollRef = useRef(null);
  const anchor = useRef(null); // {key, offset} of the first row in view; null at the newest end
  const pendingFocus = useRef(null);
  const seenNew = useRef(new Set());

  const types = useMemo(() => [...new Set(events.map((e) => e.event).filter(Boolean))].sort(), [events]);
  const stages = useMemo(() => [...new Set(events.map((e) => e.fields.Stage).filter(Boolean))].sort(), [events]);

  const visible = useMemo(
    () =>
      events
        .filter((e) => (showNoise || !NOISY.has(e.event)) && (type === ALL || e.event === type) && (stage === ALL || e.fields.Stage === stage))
        .reverse(), // newest first
    [events, showNoise, type, stage]
  );

  const virtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE,
    overscan: 10,
    gap: 2,
    getItemKey: (i) => visible[i].key
  });
  const items = virtualizer.getVirtualItems();

  // Indexes of highlighted events in the filtered list, oldest-in-list last.
  const newIndexes = useMemo(() => {
    if (!newKeys) return [];
    const out = [];
    visible.forEach((e, i) => newKeys.has(e.key) && out.push(i));
    return out;
  }, [visible, newKeys]);

  // A new event counts as seen once it has been inside the viewport (FR2.4).
  if (!newKeys) seenNew.current.clear();
  const range = virtualizer.range;
  const inView = (i) => range != null && i >= range.startIndex && i <= range.endIndex;
  for (const i of newIndexes) if (inView(i)) seenNew.current.add(visible[i].key);
  const unseen = newIndexes.filter((i) => !seenNew.current.has(visible[i].key));

  // Keep the same event in view when rows are added above it, unless the user is at the newest end (FR1.5).
  useLayoutEffect(() => {
    const a = anchor.current;
    if (!a) return;
    const i = visible.findIndex((e) => e.key === a.key);
    const start = virtualizer.measurementsCache[i]?.start;
    if (start == null) return;
    const target = start + a.offset;
    if (Math.abs(target - scrollRef.current.scrollTop) > 1) virtualizer.scrollToOffset(target);
  }, [visible, virtualizer]);

  // Focus follows keyboard navigation once the target row is rendered (FR1.6).
  useLayoutEffect(() => {
    if (pendingFocus.current == null) return;
    const btn = scrollRef.current?.querySelector(`[data-index="${pendingFocus.current}"] .event-row`);
    if (btn) {
      btn.focus({ preventScroll: true });
      pendingFocus.current = null;
    }
  });

  function onScroll() {
    const top = scrollRef.current.scrollTop;
    const item = top < AT_NEWEST ? null : virtualizer.getVirtualItemForOffset(top);
    anchor.current = item ? { key: item.key, offset: top - item.start } : null;
  }

  function goTo(i, focus = true) {
    if (i < 0 || i >= visible.length) return;
    virtualizer.scrollToIndex(i, { align: 'auto' });
    if (focus) pendingFocus.current = i;
  }

  function onKeyDown(ev) {
    if (!NAV_KEYS.has(ev.key) || !ev.target.classList.contains('event-row')) return;
    ev.preventDefault();
    const i = Number(ev.target.closest('[data-index]').dataset.index);
    const last = visible.length - 1;
    goTo({ ArrowDown: Math.min(i + 1, last), ArrowUp: Math.max(i - 1, 0), Home: 0, End: last }[ev.key]);
  }

  function jumpToStage(s) {
    if (!s) return;
    let i = visible.length - 1; // newest first, so the stage's oldest event has the highest index
    while (i >= 0 && visible[i].fields.Stage !== s) i--;
    if (i >= 0) virtualizer.scrollToIndex(i, { align: 'start' });
    pendingFocus.current = i >= 0 ? i : null;
  }

  function toggle(key) {
    setOpenKeys((cur) => {
      const next = new Set(cur);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }

  return (
    <div className="timeline" data-testid="timeline">
      <div className="filters">
        <label className="check">
          <input type="checkbox" checked={showNoise} onChange={(e) => setShowNoise(e.target.checked)} data-testid="timeline-noise-toggle" />
          Visa brus (guards och sensorer)
        </label>
        <select aria-label="Händelsetyp" value={type} onChange={(e) => setType(e.target.value)} data-testid="timeline-type-filter">
          <option value={ALL}>Alla typer</option>
          {types.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Stage" value={stage} onChange={(e) => setStage(e.target.value)} data-testid="timeline-stage-filter">
          <option value={ALL}>Alla stages</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <span className="muted">
          {visible.length} av {events.length} händelser
        </span>
      </div>
      <div className="filters timeline-nav">
        <button className="btn btn-quiet" onClick={() => virtualizer.scrollToIndex(0)} data-testid="timeline-jump-newest">
          Till senaste
        </button>
        <select aria-label="Till stage-start" value={ALL} onChange={(e) => jumpToStage(e.target.value)} data-testid="timeline-jump-stage">
          <option value={ALL}>Till stage-start…</option>
          {stages.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {unseen.length > 0 && (
          <button className="btn btn-accent timeline-new-counter" onClick={() => goTo(unseen[0], false)} data-testid="timeline-new-counter">
            {unseen.length === 1 ? '1 ny händelse' : `${unseen.length} nya händelser`}
          </button>
        )}
      </div>
      {events.length === 0 && <p className="muted">Inga audit-händelser hittades i audit/.</p>}
      <div className="timeline-scroll" ref={scrollRef} onScroll={onScroll} data-testid="timeline-scroll">
        <ol className="events" role="list" aria-label="Audit-händelser" style={{ height: virtualizer.getTotalSize() }} onKeyDown={onKeyDown}>
          {items.map((item) => {
            const e = visible[item.index];
            const isNew = !!newKeys?.has(e.key);
            return (
              <li
                key={item.key}
                ref={virtualizer.measureElement}
                data-index={item.index}
                role="listitem"
                aria-setsize={visible.length}
                aria-posinset={item.index + 1}
                className={`event cat-${e.category} ${isNew ? 'is-new' : ''}`}
                style={{ transform: `translateY(${item.start}px)` }}
              >
                <EventRow e={e} pos={item.index + 1} total={visible.length} isNew={isNew} open={openKeys.has(e.key)} onToggle={toggle} />
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
