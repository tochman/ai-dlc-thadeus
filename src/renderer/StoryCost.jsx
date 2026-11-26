// US-1303 FR5, FR6, NFR2, NFR3: what a story, an epic or a release cost to build. The figure next to its status, its
// detail with the fold-out split, and the cost panel's "Not linked to a story" list with a story picker. The figures
// come from rollUp (parsers/storyCost.js) over the cost the cost panel already holds (NFR4).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill, ReadoutTable, SectionHeading } from './Lcars.jsx';
import { formatTokens, formatUsd, shortModel, tokenBreakdown } from './format.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const round = (tokens) => Object.fromEntries(Object.entries(tokens).map(([k, v]) => [k, Math.round(v)]));
const usdOf = (figure) => `${formatUsd(figure.usd)}${figure.incomplete ? '*' : ''}`; // NFR2: * as in the cost panel
const sharedWith = (figure) => Math.max(...figure.intents.map((i) => i.sharedWith));

/** US-1303 FR6.1, FR6.3: the figure next to a status; nothing without one (0 with no linked intent). */
export function CostBadge({ figure }) {
  const { t } = useTranslation();
  if (!figure) return null;
  return (
    <span className="tag story-cost-tag" aria-label={t('storyCost.label')} data-testid="story-cost-badge">
      {usdOf(figure)}
      {figure.shared && ` · ${t('storyCost.shared', { n: sharedWith(figure) })}`}
    </span>
  );
}

/** US-1303 FR6.2: one split as a readout table; stage rows carry their rework (FR4). */
function SplitTable({ caption, rows, name = (n) => n, rework = false }) {
  const { t } = useTranslation();
  const columns = [
    { label: t('cost.name') },
    { label: t('cost.usd'), align: 'right', value: true },
    { label: t('cost.tokensHeader'), align: 'right', value: true }
  ];
  if (rework) columns.push({ label: t('storyCost.reworkColumn'), align: 'right', value: true });
  const cells = (r) => [name(r.name), formatUsd(r.usd), formatTokens(Math.round(r.totalTokens)), ...(rework ? [formatUsd(r.reworkUsd)] : [])];
  return <ReadoutTable caption={caption} columns={columns} rows={rows.map((r) => ({ id: r.name, cells: cells(r) }))} />;
}

/** One intent in the figure: shared, no cost recorded, rework not known (FR2, FR6.3, constraint). */
function intentText(t, i) {
  const notes = [
    i.sharedWith > 1 && t('storyCost.shared', { n: i.sharedWith }),
    i.noCost && t('storyCost.noCost'),
    i.reworkUnknown && t('storyCost.reworkUnknown')
  ];
  return [i.dirName, ...notes.filter(Boolean)].join(' · ');
}

/** US-1303 FR6.2, FR4, NFR2: total and tokens, the rework share, "incomplete", the fold-out split and the intents named. */
export function CostDetail({ figure, testId = 'story-cost-detail' }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!figure) return null;
  return (
    <div className="story-cost" data-testid={testId}>
      <p className="story-cost-total">
        <span className="field-label">{t('storyCost.label')}</span>{' '}
        {t('storyCost.total', { usd: usdOf(figure), tokens: formatTokens(Math.round(figure.totalTokens)) })}
        <span className="muted"> {tokenBreakdown(round(figure.tokens))}</span>
      </p>
      <p data-testid="story-cost-rework">{t('storyCost.rework', { usd: formatUsd(figure.rework.usd), share: Math.round(figure.rework.share * 100) })}</p>
      {figure.incomplete && (
        <p className="tag-warn" role="note" data-testid="story-cost-incomplete">
          {t('storyCost.incomplete')}
        </p>
      )}
      <ul className="story-cost-intents" aria-label={t('storyCost.intents')}>
        {figure.intents.map((i) => (
          <li key={i.dirName} data-testid="story-cost-intent">
            {intentText(t, i)}
          </li>
        ))}
      </ul>
      <Pill tone="quiet" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="story-cost-split-toggle">
        {open ? '▾' : '▸'} {t('storyCost.split')}
      </Pill>
      {open && (
        <div className="lcars-reveal" data-testid="story-cost-split">
          <SplitTable caption={t('cost.perStage')} rows={figure.byStage} rework />
          <SplitTable caption={t('cost.perAgent')} rows={figure.byAgent} />
          <SplitTable caption={t('cost.perModel')} rows={figure.byModel} name={shortModel} />
        </div>
      )}
    </div>
  );
}

const allStories = (features) => (features?.available ? features.epics : []).flatMap((e) => e.parsed?.stories ?? []);

/**
 * US-1303 FR5: every intent that links to no story, each with a story picker, and the intents linked by hand, each
 * with Remove link. A change goes through main (`.thadeus/story-links.json`), which reloads the views.
 * @param {{projectId: string|null, space: string|null, delivered: {stories: Record<string, string[]>, hand: Record<string, string[]>}|null, features: object|null}} props
 */
export function NotLinked({ projectId, space, delivered, features }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  if (!projectId || !delivered) return null;
  const notLinked = Object.keys(delivered.stories ?? {})
    .filter((dir) => delivered.stories[dir].length === 0)
    .sort();
  const hand = Object.entries(delivered.hand ?? {}).sort(([a], [b]) => a.localeCompare(b));
  if (!notLinked.length && !hand.length) return null;
  const stories = allStories(features);
  async function link(dir, ids) {
    setError(null);
    try {
      await window.bridge.setStoryLink(projectId, space, dir, ids);
    } catch (err) {
      setError(t('storyCost.notLinked.failed', { error: errorText(err) }));
    }
  }
  return (
    <div className="story-cost-links" data-testid="story-cost-not-linked">
      <SectionHeading as="h3" title={t('storyCost.notLinked.title')} />
      <ul className="intent-rows">
        {notLinked.map((dir) => (
          <li key={dir} className="story-cost-link-row" data-intent={dir} data-testid="story-cost-not-linked-intent">
            <span className="intent-slug">{dir}</span>
            <select
              className="lcars-select"
              value=""
              aria-label={t('storyCost.notLinked.pick')}
              onChange={(e) => e.target.value && link(dir, [e.target.value])}
              data-testid="story-cost-link-picker"
            >
              <option value="">{t('storyCost.notLinked.pick')}</option>
              {stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}: {s.title}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      {hand.length > 0 && (
        <>
          <SectionHeading as="h3" title={t('storyCost.notLinked.linked')} />
          <ul className="intent-rows">
            {hand.map(([dir, ids]) => (
              <li key={dir} className="story-cost-link-row" data-intent={dir}>
                <span className="intent-slug">{dir}</span> <span className="muted">{ids.join(', ')}</span>{' '}
                <Pill tone="quiet" onClick={() => link(dir, [])} data-testid="story-cost-unlink">
                  {t('storyCost.notLinked.unlink')}
                </Pill>
              </li>
            ))}
          </ul>
        </>
      )}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
