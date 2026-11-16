// US-0507: the agent progress section of the token detail view. One sentence sums the work up (FR4), then one focusable
// row per running piece of agent work states its name, stage, minutes and status in text, not by colour (FR1–FR3, NFR4).
// The rows come from main (`agents:progress`); every number here is read from them (FR4.2).
import { useTranslation } from 'react-i18next';
import { stageTitle } from './format.js';

const nameOf = (row) => row.unit ?? stageTitle(row.stage);

/** The row's status in words: plan steps, the review verdict with findings, or what could not be read (FR2, FR3, FR5.3). */
function statusText(t, row) {
  if (row.unreadable) return t('tokenDetail.progress.unreadable', { path: row.unreadable });
  if (row.kind === 'review') {
    if (row.status !== 'done') return t('tokenDetail.progress.reviewRequested');
    const counts = Object.entries(row.severities ?? {});
    const findings = counts.length
      ? counts.map(([severity, n]) => t('tokenDetail.progress.finding', { n, severity })).join(', ')
      : t('tokenDetail.progress.noFindings');
    return t('tokenDetail.progress.verdict', { verdict: row.verdict ?? '–', findings });
  }
  if (row.status === 'failed') return t('tokenDetail.progress.failed');
  if (row.steps) return t(row.status === 'done' ? 'tokenDetail.progress.stepsDone' : 'tokenDetail.progress.steps', row.steps);
  return t(row.status === 'done' ? 'tokenDetail.progress.done' : 'tokenDetail.progress.running');
}

/** FR4.1: the builds with their steps in one sentence; with no counted build, how many pieces of work run. */
function summaryText(t, language, rows) {
  const builds = rows.filter((r) => r.kind === 'build' && r.steps);
  if (builds.length === 0) return t('tokenDetail.progress.summaryCount', { n: rows.length });
  const list = new Intl.ListFormat(language, { type: 'conjunction' }).format(
    builds.map((r) => t('tokenDetail.progress.summaryItem', { name: nameOf(r), done: r.steps.done, total: r.steps.total }))
  );
  return t('tokenDetail.progress.summaryBuilds', { list });
}

/** @param {{rows: object[]}} props */
export default function AgentProgress({ rows }) {
  const { t, i18n } = useTranslation();
  return (
    <section className="token-detail-section" data-testid="agent-progress">
      <div className="token-detail-section-head">
        <h3>{t('tokenDetail.progress.title')}</h3>
        <i className="token-detail-rule" aria-hidden="true" />
      </div>
      {rows.length === 0 ? (
        <p className="token-detail-empty" data-testid="agent-progress-empty">
          {t('tokenDetail.progress.empty')}
        </p>
      ) : (
        <>
          <p className="agent-progress-summary" data-testid="agent-progress-summary">
            {summaryText(t, i18n.language, rows)}
          </p>
          <ul className="token-detail-rows">
            {rows.map((row) => (
              <li key={row.key} className="token-detail-row" tabIndex={0} data-testid="agent-progress-row">
                <span className="token-detail-row-name">{nameOf(row)}</span>
                <span className="agent-progress-detail">
                  <span>{[stageTitle(row.stage), row.agent].filter(Boolean).join(' · ')}</span>
                  <span className="agent-progress-status">{statusText(t, row)}</span>
                  {row.commit && <span>{t('tokenDetail.progress.commit', { subject: row.commit })}</span>}
                </span>
                <span className="token-detail-row-value">{t('tokenDetail.progress.minutes', { n: row.minutes })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
