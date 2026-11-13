import { useMemo, useState } from 'react';
import { isInFlight } from './format.js';

const ALL = '';

export function filterIntents(intents, { status, scope, query }) {
  const q = query.trim().toLowerCase();
  return intents.filter(
    (i) =>
      (status === ALL || i.status === status) &&
      (scope === ALL || i.scope === scope) &&
      (q === '' || i.slug.toLowerCase().includes(q) || (i.request ?? '').toLowerCase().includes(q))
  );
}

const unique = (values) => [...new Set(values.filter(Boolean))].sort();

export default function IntentList({ intents, selected, onSelect }) {
  const [status, setStatus] = useState(ALL);
  const [scope, setScope] = useState(ALL);
  const [query, setQuery] = useState('');
  const statuses = useMemo(() => unique(intents.map((i) => i.status)), [intents]);
  const scopes = useMemo(() => unique(intents.map((i) => i.scope)), [intents]);
  const visible = filterIntents(intents, { status, scope, query });

  return (
    <div className="intent-list" data-testid="intent-list">
      <h2 className="section-title">Intents</h2>
      <div className="filters">
        <input
          type="search"
          placeholder="Sök slug eller beställning"
          aria-label="Sök intents"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="intent-list-search"
        />
        <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="intent-list-status-filter">
          <option value={ALL}>Alla statusar</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select aria-label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} data-testid="intent-list-scope-filter">
          <option value={ALL}>Alla scopes</option>
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ul className="intent-rows" role="listbox" aria-label="Intents">
        {visible.map((i) => (
          <li key={i.dirName}>
            <button
              role="option"
              aria-selected={i.dirName === selected}
              className={`intent-row status-${i.status ?? 'unknown'} ${i.dirName === selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(i.dirName)}
              disabled={i.missingOnDisk}
              data-testid="intent-list-row"
            >
              <span className="intent-row-top">
                <span className="intent-slug">{i.slug}</span>
                {i.active && <span className="tag tag-active">Aktiv</span>}
                {isInFlight(i.status) && <span className="live-dot" aria-label="Live" title="Pågår" />}
              </span>
              <span className="intent-row-meta">
                <span className="status-text" data-testid="intent-list-row-status">
                  {i.status ?? 'okänd status'}
                </span>
                <span>{i.scope ?? '–'}</span>
                <span>{i.date ?? '–'}</span>
                <span title="Klara av körda stages">
                  {i.done ?? 0}/{i.executed ?? 0}
                </span>
              </span>
              {(i.missingInIndex || i.missingOnDisk || i.error) && (
                <span className="intent-row-flags">
                  {i.missingInIndex && <span className="tag tag-warn">Saknas i intents.json</span>}
                  {i.missingOnDisk && <span className="tag tag-warn">Saknas på disk</span>}
                  {i.error && <span className="tag tag-error" title={i.error}>Läsfel</span>}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="muted">Inga intents matchar.</p>}
    </div>
  );
}
