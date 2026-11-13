import { useMemo, useState } from 'react';
import { CATEGORY_LABEL, formatTime } from './format.js';
import { NOISY_EVENTS as NOISY } from '../main/parsers/audit.js'; // pure module, safe to bundle

const ALL = '';
const MAX_ROWS = 1500; // ponytail: no virtualisation; newest rows win when a log is huge

function EventRow({ e, isNew }) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`event cat-${e.category} ${isNew ? 'is-new' : ''}`}>
      <button className="event-row" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="timeline-event">
        <span className="event-time">{formatTime(e.timestamp)}</span>
        <span className="tag cat-tag">{CATEGORY_LABEL[e.category]}</span>
        <span className="event-type">{e.event ?? '(utan typ)'}</span>
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
    </li>
  );
}

export default function Timeline({ events, newSeqFrom }) {
  const [showNoise, setShowNoise] = useState(false);
  const [type, setType] = useState(ALL);
  const [stage, setStage] = useState(ALL);

  const types = useMemo(() => [...new Set(events.map((e) => e.event).filter(Boolean))].sort(), [events]);
  const stages = useMemo(() => [...new Set(events.map((e) => e.fields.Stage).filter(Boolean))].sort(), [events]);

  const visible = events
    .filter((e) => (showNoise || !NOISY.has(e.event)) && (type === ALL || e.event === type) && (stage === ALL || e.fields.Stage === stage))
    .slice(-MAX_ROWS)
    .reverse(); // newest first

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
      {events.length === 0 && <p className="muted">Inga audit-händelser hittades i audit/.</p>}
      <ol className="events">
        {visible.map((e) => (
          <EventRow key={e.seq} e={e} isNew={newSeqFrom != null && e.seq >= newSeqFrom} />
        ))}
      </ol>
    </div>
  );
}
