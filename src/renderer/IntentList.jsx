import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCost, isInFlight, stagePosition } from './format.js';
import ResumeButton from './ResumeButton.jsx';
import { Dots, progressStates } from './Lcars.jsx';

const ALL = '';
const SORTS = ['date', 'cost', 'name'];

const usdOf = (costs, i) => costs?.[i.dirName]?.total.usd ?? null;

/** Date (newest first, the order intents arrive in), cost (highest first, no entry last) or name (FR1.6). */
export function sortIntents(intents, sort, costs) {
  const list = [...intents];
  if (sort === 'name') return list.sort((a, b) => a.slug.localeCompare(b.slug));
  if (sort === 'cost') return list.sort((a, b) => (usdOf(costs, b) ?? -1) - (usdOf(costs, a) ?? -1));
  return list;
}

/** A custom plan's own name, else its scope: what the row and the filter show. */
export const planName = (i) => i.plan ?? i.scope ?? null;

export function filterIntents(intents, { status, scope, query }) {
  const q = query.trim().toLowerCase();
  return intents.filter(
    (i) =>
      (status === ALL || i.status === status) &&
      (scope === ALL || planName(i) === scope) &&
      (q === '' || i.slug.toLowerCase().includes(q) || (i.request ?? '').toLowerCase().includes(q))
  );
}

/** Running cost next to the live dot; "–" with an explanation when the ledger has no entry (FR1.2, FR1.4, FR5.2). */
function RowCost({ c }) {
  const { t } = useTranslation();
  const label = t('cost.label');
  const title = !c ? t('cost.noEntry') : c.complete ? label : t('intents.costIncomplete', { label });
  return (
    <span className="intent-cost" title={title} data-testid="intent-list-row-cost">
      {c ? `${formatCost(c.total)}${c.complete ? '' : '*'}` : '–'}
    </span>
  );
}

const unique = (values) => [...new Set(values.filter(Boolean))].sort();

/** @param {{cost?: {available: boolean, perIntent?: object}|null}} props cost hidden entirely when unavailable (FR1.5) */
export default function IntentList({ intents, selected, onSelect, cost }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(ALL);
  const [scope, setScope] = useState(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const statuses = useMemo(() => unique(intents.map((i) => i.status)), [intents]);
  const scopes = useMemo(() => unique(intents.map(planName)), [intents]);
  const costs = cost?.available ? cost.perIntent : null;
  const visible = sortIntents(filterIntents(intents, { status, scope, query }), sort, costs);
  const activeDirName = intents.find((i) => i.active)?.dirName ?? null;

  return (
    <div className="intent-list" data-testid="intent-list">
      <div className="lcars-heading">
        <h2 className="section-title">{t('intents.title')}</h2>
        <span className="lcars-heading-line" aria-hidden="true" />
        <select className="lcars-select" aria-label={t('intents.sortLabel')} value={sort} onChange={(e) => setSort(e.target.value)} data-testid="intent-list-sort">
          {SORTS.map((id) => (
            <option key={id} value={id}>
              {t('intents.sortBy', { label: t(`intents.sort.${id}`) })}
            </option>
          ))}
        </select>
      </div>
      <div className="filters">
        <input
          type="search"
          placeholder={t('intents.searchPlaceholder')}
          aria-label={t('intents.searchLabel')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          data-testid="intent-list-search"
        />
        <select className="lcars-select" aria-label={t('intents.statusLabel')} value={status} onChange={(e) => setStatus(e.target.value)} data-testid="intent-list-status-filter">
          <option value={ALL}>{t('intents.allStatuses')}</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select className="lcars-select" aria-label={t('intents.scopeLabel')} value={scope} onChange={(e) => setScope(e.target.value)} data-testid="intent-list-scope-filter">
          <option value={ALL}>{t('intents.allScopes')}</option>
          {scopes.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <ul className="intent-rows" role="listbox" aria-label={t('intents.title')}>
        {visible.map((i) => (
          <li key={i.dirName}>
            <button
              role="option"
              aria-selected={i.dirName === selected}
              className={`intent-row status-${i.status ?? 'unknown'} ${i.dirName === selected ? 'is-selected' : ''}`}
              onClick={() => onSelect(i.dirName)}
              disabled={i.missingOnDisk}
              title={i.date ?? undefined}
              data-testid="intent-list-row"
            >
              <span className="intent-row-top">
                <span className="intent-slug">{i.slug}</span>
                {i.active && <span className="intent-badge">{t('intents.active')}</span>}
                {costs && <RowCost c={costs[i.dirName]} />}
              </span>
              <span className="intent-row-meta">
                <span>
                  <span title={i.plan ? t('intents.basedOn', { scope: i.scope ?? '–' }) : undefined}>{planName(i) ?? '–'}</span> ·{' '}
                  <span className="status-text" data-testid="intent-list-row-status">
                    {i.status ?? t('intents.unknownStatus')}
                  </span>
                </span>
                <span className="intent-steps">
                  <Dots states={progressStates(i.done ?? 0, i.executed ?? 0, isInFlight(i.status))} small />
                  <span title={t('intents.doneOfExecuted')}>
                    {i.done ?? 0}/{i.executed ?? 0}
                  </span>
                </span>
              </span>
              {(i.missingInIndex || i.missingOnDisk || i.error) && (
                <span className="intent-row-flags">
                  {i.missingInIndex && <span className="tag tag-warn">{t('intents.missingInIndex')}</span>}
                  {i.missingOnDisk && <span className="tag tag-warn">{t('intents.missingOnDisk')}</span>}
                  {i.error && (
                    <span className="tag tag-error" title={i.error}>
                      {t('intents.readError')}
                    </span>
                  )}
                </span>
              )}
            </button>
            {i.dirName === selected && (
              <ResumeButton intent={i} activeDirName={activeDirName} position={stagePosition(i.currentStage, i.done, i.executed)} />
            )}
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="muted">{t('intents.noMatch')}</p>}
    </div>
  );
}
