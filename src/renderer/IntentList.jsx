import { useMemo, useState } from 'react';
import { COST_LABEL, NO_COST_ENTRY, formatCost, isInFlight } from './format.js';

const ALL = '';
const SORTS = [
  { id: 'date', label: 'Datum' },
  { id: 'cost', label: 'Kostnad' },
  { id: 'name', label: 'Namn' }
];

const usdOf = (costs, i) => costs?.[i.dirName]?.total.usd ?? null;

/** Date (newest first, the order intents arrive in), cost (highest first, no entry last) or name (FR1.6). */
export function sortIntents(intents, sort, costs) {
  const list = [...intents];
  if (sort === 'name') return list.sort((a, b) => a.slug.localeCompare(b.slug));
  if (sort === 'cost') return list.sort((a, b) => (usdOf(costs, b) ?? -1) - (usdOf(costs, a) ?? -1));
  return list;
}

export function filterIntents(intents, { status, scope, query }) {
  const q = query.trim().toLowerCase();
  return intents.filter(
    (i) =>
      (status === ALL || i.status === status) &&
      (scope === ALL || i.scope === scope) &&
      (q === '' || i.slug.toLowerCase().includes(q) || (i.request ?? '').toLowerCase().includes(q))
  );
}

/** Running cost next to the live dot; "–" with an explanation when the ledger has no entry (FR1.2, FR1.4, FR5.2). */
function RowCost({ c }) {
  const title = !c ? NO_COST_ENTRY : c.complete ? COST_LABEL : `${COST_LABEL} – ofullständig: pris saknas för någon modell`;
  return (
    <span className="intent-cost" title={title} data-testid="intent-list-row-cost">
      {c ? `${formatCost(c.total)}${c.complete ? '' : '*'}` : '–'}
    </span>
  );
}

const unique = (values) => [...new Set(values.filter(Boolean))].sort();

/** @param {{cost?: {available: boolean, perIntent?: object}|null}} props cost hidden entirely when unavailable (FR1.5) */
export default function IntentList({ intents, selected, onSelect, cost }) {
  const [status, setStatus] = useState(ALL);
  const [scope, setScope] = useState(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const statuses = useMemo(() => unique(intents.map((i) => i.status)), [intents]);
  const scopes = useMemo(() => unique(intents.map((i) => i.scope)), [intents]);
  const costs = cost?.available ? cost.perIntent : null;
  const visible = sortIntents(filterIntents(intents, { status, scope, query }), sort, costs);

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
        <select aria-label="Sortering" value={sort} onChange={(e) => setSort(e.target.value)} data-testid="intent-list-sort">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              Sortera: {s.label}
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
                {costs && <RowCost c={costs[i.dirName]} />}
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
