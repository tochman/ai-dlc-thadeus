// The rows and groups of Settings › Tools (EPIC-04 US-0416): a group is an LCARS section with its tall block on the
// left, a tool is one compact row (name, version, path, state chip, action pills) with its state as a strip at the left.
// Used by SettingsView (Tools) and AidlcUpdate (the AI-DLC group).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';

/** US-0416 AC2: a home folder shown as ~, so a path fits on one line; the full path stays in the title. */
export function shortPath(path) {
  return path.replace(/^\/(?:Users|home)\/[^/]+(?=\/|$)/, '~');
}

/** US-0416 AC2: a tool's state from its scan row: checking, missing, chosen by hand or found. */
export function toolState(row) {
  if (row.found === null) return 'checking';
  if (!row.found) return 'missing';
  return row.source === 'saved' ? 'hand' : 'found';
}

/** US-0416 AC2: the path shortened, in full on hover; a click copies the full path. */
function PathCell({ path, empty }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!path) return <span className="tool-row-path is-empty">{empty}</span>;
  async function copy() {
    try {
      await navigator.clipboard.writeText(path);
      setCopied(true);
    } catch (err) {
      console.warn('The path could not be copied:', err);
    }
  }
  return (
    <Tooltip text={path}>
      <button type="button" className="tool-row-path" aria-label={t('settings.tools.copyPath', { path })} onClick={copy} data-testid="tool-row-path">
        <code>{copied ? t('settings.tools.copied') : shortPath(path)}</code>
      </button>
    </Tooltip>
  );
}

/**
 * US-0416 AC2, AC3: one compact row. `state` (checking, found, hand, missing, newer, quiet) colours the strip and the
 * chip; `children` are full-width lines under it (what a missing tool is for, errors, a folded list).
 */
export function ToolRow({ testId, state, name, version, path, empty = '', chip, chipTestId, actions, children }) {
  return (
    <div className={`tool-row tool-row--${state} lcars-e-rise`} data-testid={testId}>
      <span className="tool-row-name">{name}</span>
      <span className={`tool-row-ver${version ? '' : ' is-none'}`}>{version || '–'}</span>
      <PathCell path={path} empty={empty} />
      <span className="tool-row-chip">
        <span className={`tool-chip tool-chip--${state}`} data-kind={state} data-testid={chipTestId}>
          {chip}
        </span>
      </span>
      <span className="tool-row-act">{actions}</span>
      {children}
    </div>
  );
}

/**
 * US-0416: a scanned tool as a row, with Choose… and Reset (a saved path only) as pills. `state`, `chip` and
 * `before` (pills ahead of Choose…) let the AI-DLC group show the CLI's update; a missing tool says what it is needed
 * for and what to do (AC3).
 */
export function ToolLine({ row: r, error, onChoose, onReset, state = toolState(r), chip, version, before, children }) {
  const { t } = useTranslation();
  const label = t(`settings.tools.${r.id}`);
  return (
    <ToolRow
      testId={`settings-tool-${r.id}`}
      state={state}
      name={label}
      version={version ?? (r.found ? r.version : null)}
      path={r.path}
      empty={r.found === false ? t('settings.tools.notOnPath') : ''}
      chip={chip ?? t(`settings.tools.chip.${state}`)}
      chipTestId={`settings-tool-chip-${r.id}`}
      actions={
        <>
          {before}
          <Pill
            tone={state === 'missing' ? undefined : 'quiet'}
            aria-label={t('settings.tools.pickFor', { tool: label })}
            onClick={() => onChoose(r.id)}
            data-testid={`settings-tool-pick-${r.id}`}
          >
            {t('settings.tools.pick')}
          </Pill>
          {r.source === 'saved' && (
            <Pill
              tone="quiet"
              aria-label={t('settings.tools.resetFor', { tool: label })}
              onClick={() => onReset(r.id)}
              data-testid={`settings-tool-reset-${r.id}`}
            >
              {t('settings.tools.reset')}
            </Pill>
          )}
        </>
      }
    >
      {state === 'missing' && (
        <p className="tool-row-note is-alert">
          {t(`settings.tools.neededFor.${r.id}`)} <b>{t('settings.tools.missingDo')}</b>
        </p>
      )}
      {error && (
        <p className="refresh-error tool-row-note" role="alert" data-testid={`settings-tool-error-${r.id}`}>
          {error}
        </p>
      )}
      {r.error && !error && <p className="muted tool-row-note">{r.error}</p>}
      {r.pathFallback && (
        <p className="muted tool-row-note" data-testid={`settings-tool-fallback-${r.id}`}>
          {t('settings.tools.pathFallback')}
        </p>
      )}
      {children}
    </ToolRow>
  );
}

/** The strip a group's block carries: its worst row (missing, then not signed in (US-0804 FR2.6), then newer), none when all is well. */
export function groupStrip(states) {
  return ['missing', 'out', 'newer'].find((state) => states.includes(state)) ?? null;
}

/** US-0416 AC1: a group as an LCARS section: the tall block (count, name) on the left, the rows beside it. */
export function ToolGroup({ id, title, count, strip, children }) {
  return (
    <section className="tools-group" aria-labelledby={`tools-group-${id}`} data-testid={`settings-tools-group-${id}`}>
      <div className={`tools-gh tools-gh--${id}${strip ? ` tools-gh--${strip}` : ''} lcars-e-block`}>
        <span className="tools-gh-fig">{count}</span>
        <h3 id={`tools-group-${id}`}>{title}</h3>
      </div>
      <div className="tools-group-rows">{children}</div>
    </section>
  );
}
