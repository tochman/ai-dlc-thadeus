import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { currentTip, formatCost, isInFlight, stagePosition, stageTitle } from './format.js';
import ResumeButton from './ResumeButton.jsx';
import { Dots, ListDrawer, progressStates } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';

const ALL = '';
const SORTS = ['date', 'cost', 'name'];

const usdOf = (costs, i) => costs?.[i.dirName]?.total.usd ?? null;

/** The active intent first, then open work (in flight, parked or not), then the rest (US-0040 FR4.1). */
const openRank = (i) => (i.active ? 0 : isInFlight(i.status) ? 1 : 2);

/**
 * Date (open work first, each group newest first in the order intents arrive in; US-0040 FR4.1), cost (highest
 * first, no entry last) or name (FR1.6, US-0040 FR4.4).
 */
export function sortIntents(intents, sort, costs) {
  const list = [...intents];
  if (sort === 'name') return list.sort((a, b) => a.slug.localeCompare(b.slug));
  if (sort === 'cost') return list.sort((a, b) => (usdOf(costs, b) ?? -1) - (usdOf(costs, a) ?? -1));
  return list.sort((a, b) => openRank(a) - openRank(b));
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

/**
 * The explanation of a row's cost: "no entry", the label, or the label marked incomplete (FR1.4, FR5.2); the
 * current-price figure on its own line when it differs from the recorded one (US-0211 AC1.4.3).
 */
function costTip(t, c) {
  const label = t('cost.label');
  if (!c) return t('cost.noEntry');
  return [c.complete ? label : t('intents.costIncomplete', { label }), currentTip(c.total)].filter(Boolean).join('\n');
}

/** Running cost next to the live dot; "–" with an explanation when the ledger has no entry (FR1.2, FR1.4, FR5.2). */
function RowCost({ c }) {
  const { t } = useTranslation();
  return (
    <Tooltip text={costTip(t, c)}>
      <span className="intent-cost" data-testid="intent-list-row-cost">
        {c ? `${formatCost(c.total)}${c.complete ? '' : '*'}` : '–'}
      </span>
    </Tooltip>
  );
}

/** The row's tooltips joined, shown when the row button gets keyboard focus; its parts are not focusable (US-0414 FR2.3). */
function rowTips(t, i, costs) {
  return [i.date, costs && costTip(t, costs[i.dirName]), i.plan && t('intents.basedOn', { scope: i.scope ?? '–' }), t('intents.doneOfExecuted'), i.error]
    .filter(Boolean)
    .join('\n');
}

/** US-0510 FR4.1: the LCARS "Parked at <stage>" mark of a parked intent, in its row and its detail. */
export function ParkedMark({ stage }) {
  const { t } = useTranslation();
  return (
    <span className="intent-parked" data-testid="intent-parked">
      {t('intents.parked', { stage: stage ? stageTitle(stage) : '–' })}
    </span>
  );
}

const unique = (values) => [...new Set(values.filter(Boolean))].sort();

/**
 * @param {{cost?: {available: boolean, perIntent?: object}|null, projectId?: string}} props cost hidden entirely when
 *   unavailable (FR1.5); projectId lets Resume unpark a parked intent (US-0510 FR4.4); children sit above the filters
 */
export default function IntentList({ intents, selected, onSelect, cost, projectId, children }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(ALL);
  const [scope, setScope] = useState(ALL);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('date');
  const statuses = useMemo(() => unique(intents.map((i) => i.status)), [intents]);
  const scopes = useMemo(() => unique(intents.map(planName)), [intents]);
  const costs = cost?.available ? cost.perIntent : null;
  const visible = sortIntents(filterIntents(intents, { status, scope, query }), sort, costs);
  const activeIntent = intents.find((i) => i.active) ?? null;
  const activeDirName = activeIntent?.dirName ?? null;

  const sortSelect = (
    <select className="lcars-select" aria-label={t('intents.sortLabel')} value={sort} onChange={(e) => setSort(e.target.value)} data-testid="intent-list-sort">
      {SORTS.map((id) => (
        <option key={id} value={id}>
          {t('intents.sortBy', { label: t(`intents.sort.${id}`) })}
        </option>
      ))}
    </select>
  );

  // US-0417 with US-0415: the list column is the shared drawer; the sort sits in its heading row, before the toggle.
  return (
    <ListDrawer
      viewId="intents"
      title={t('intents.title')}
      count={intents.length}
      live={intents.some((i) => isInFlight(i.status))}
      controls={sortSelect}
      className="intent-drawer"
    >
      <div className="intent-list" data-testid="intent-list">
        {children}
        <div className="filters">
          <input
            type="search"
            placeholder={t('intents.searchPlaceholder')}
            aria-label={t('intents.searchLabel')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            data-testid="intent-list-search"
          />
          <select
            className="lcars-select"
            aria-label={t('intents.statusLabel')}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            data-testid="intent-list-status-filter"
          >
            <option value={ALL}>{t('intents.allStatuses')}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className="lcars-select"
            aria-label={t('intents.scopeLabel')}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            data-testid="intent-list-scope-filter"
          >
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
              <Tooltip text={i.date} focusText={rowTips(t, i, costs)}>
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
                    {/* active-intent is only the selection cursor; a finished intent stays selected but is not active */}
                    {i.active && i.status !== 'complete' && <span className="intent-badge">{t('intents.active')}</span>}
                    {i.parked && <ParkedMark stage={i.parkedStage} />}
                    {costs && <RowCost c={costs[i.dirName]} />}
                  </span>
                  <span className="intent-row-meta">
                    <span>
                      <Tooltip text={i.plan && t('intents.basedOn', { scope: i.scope ?? '–' })}>
                        <span>{planName(i) ?? '–'}</span>
                      </Tooltip>{' '}
                      ·{' '}
                      <span className="status-text" data-testid="intent-list-row-status">
                        {i.status ?? t('intents.unknownStatus')}
                      </span>
                    </span>
                    <span className="intent-steps">
                      <Dots states={progressStates(i.done ?? 0, i.executed ?? 0, isInFlight(i.status))} small />
                      <Tooltip text={t('intents.doneOfExecuted')}>
                        <span>
                          {i.done ?? 0}/{i.executed ?? 0}
                        </span>
                      </Tooltip>
                    </span>
                  </span>
                  {(i.missingInIndex || i.missingOnDisk || i.error) && (
                    <span className="intent-row-flags">
                      {i.missingInIndex && <span className="tag tag-warn">{t('intents.missingInIndex')}</span>}
                      {i.missingOnDisk && <span className="tag tag-warn">{t('intents.missingOnDisk')}</span>}
                      {i.error && (
                        <Tooltip text={i.error}>
                          <span className="tag tag-error">{t('intents.readError')}</span>
                        </Tooltip>
                      )}
                    </span>
                  )}
                </button>
              </Tooltip>
              {i.dirName === selected && (
                <ResumeButton
                  projectId={projectId}
                  intent={i}
                  activeDirName={activeDirName}
                  activeIntent={activeIntent}
                  position={stagePosition(i.currentStage, i.done, i.executed)}
                />
              )}
            </li>
          ))}
        </ul>
        {visible.length === 0 && <p className="muted">{t('intents.noMatch')}</p>}
      </div>
    </ListDrawer>
  );
}
