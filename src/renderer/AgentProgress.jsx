// US-0507: the agent progress section of the token detail view. One sentence sums the work up (FR4), then one focusable
// row per running piece of agent work states its name, stage, minutes and status in text, not by colour (FR1–FR3, NFR4).
// The audit rows come from main (`agents:progress`); every number here is read from them (FR4.2).
// US-0214 FR2, FR3, FR4.1: for a live intent whose project's hooks are current, the rows are the hook activity rows
// instead (`agentActivity`): one per main chat, labelled with its harness, and its dispatched agents under it, each with
// its state in words and the time in that state. Hooks missing or out of date: a notice with the update, then the
// audit rows, and never "no agents are working" as if that were known.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { stageTitle } from './format.js';
import { agentName } from '../main/parsers/ledger.js';
import AgentHooksPreview, { harnessLabel } from './AgentHooksPreview.jsx';
import { useAgentHooks } from './AgentHooksSection.jsx';

const nameOf = (row) => row.unit ?? stageTitle(row.stage);
const TICK_MS = 1000;

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

/** US-0214 FR3.1: one activity state in words; only the tool name or error type is shown, never agent text (NFR2). */
function stateText(t, row) {
  if (row.state === 'tool') return t('tokenDetail.progress.state.tool', { tool: row.tool });
  if (row.state === 'error') return t('tokenDetail.progress.state.error', { error: row.error });
  if (row.state === 'waiting') return t(`tokenDetail.progress.state.waiting.${row.reason ?? 'notification'}`);
  return t(`tokenDetail.progress.state.${row.state}`);
}

/** US-0214 FR3.2: the time in the current state, in seconds below a minute. */
function sinceText(t, sinceMs, now) {
  const s = Math.max(0, Math.floor((now - sinceMs) / 1000));
  return s < 60 ? t('tokenDetail.progress.seconds', { n: s }) : t('tokenDetail.progress.minutes', { n: Math.floor(s / 60) });
}

/** US-0214 FR2.3: the project's activity rows, from the call on open and every push for this project. */
function useActivity(projectId, on) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const bridge = window.bridge?.agentActivity;
    if (!on || !bridge) return undefined;
    let gone = false;
    bridge.list(projectId).then(
      (list) => !gone && setRows(Array.isArray(list) ? list : []),
      (err) => console.error('agentActivity:list', err?.message ?? err)
    );
    const off = bridge.onChanged?.((change) => change?.projectId === projectId && setRows(Array.isArray(change.rows) ? change.rows : []));
    return () => {
      gone = true;
      off?.();
    };
  }, [projectId, on]);
  return rows;
}

/** A clock for the time in state, running only while activity rows show. */
function useNow(on) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [on]);
  return now;
}

/** US-0214 FR4.1: one line per used harness whose hooks are not current, with Install or Update through the preview. */
function HooksNotice({ projectId, harnesses }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(null);
  return (
    <>
      {harnesses.map((h) => {
        const action = h.files.some((f) => f.reason) ? null : h.status === 'missing' ? 'install' : 'update';
        return (
          <div key={h.harness} className="banner banner-warn" role="status" data-testid="agent-progress-hooks">
            <span>{t(`tokenDetail.progress.hooks.${h.status === 'missing' ? 'missing' : 'outOfDate'}`, { harness: harnessLabel(h.harness) })}</span>
            {action && (
              <span className="banner-actions">
                <button type="button" className="btn" onClick={() => setOpen({ harness: h.harness, action })} data-testid="agent-progress-hooks-action">
                  {t(`agentHooks.action.${action}`)}
                </button>
              </span>
            )}
          </div>
        );
      })}
      {open && <AgentHooksPreview projectId={projectId} harness={open.harness} action={open.action} onClose={() => setOpen(null)} />}
    </>
  );
}

function ActivityRows({ rows }) {
  const { t } = useTranslation();
  const now = useNow(rows.length > 0);
  return (
    <ul className="token-detail-rows">
      {rows.map((row) => {
        const main = row.kind === 'main';
        return (
          <li
            key={row.key}
            className={`token-detail-row${main ? '' : ' agent-progress-row--child'}`}
            tabIndex={0}
            data-testid={main ? 'agent-progress-main' : 'agent-progress-agent'}
          >
            <span className="token-detail-row-name">
              {main
                ? t('tokenDetail.progress.main', { harness: harnessLabel(row.harness) })
                : row.agentType
                  ? agentName(row.agentType)
                  : t('tokenDetail.progress.agent')}
            </span>
            <span className="agent-progress-detail">
              <span className="agent-progress-status" data-testid="agent-progress-state">
                {stateText(t, row)}
              </span>
            </span>
            <span className="token-detail-row-value">{sinceText(t, row.sinceMs, now)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function AuditRows({ rows }) {
  const { t, i18n } = useTranslation();
  return (
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
  );
}

/**
 * @param {{projectId: string, rows: object[], live?: boolean}} props rows: the audit rows; live: the intent is in flight
 */
export default function AgentProgress({ projectId, rows, live = false }) {
  const { t } = useTranslation();
  const harnesses = useAgentHooks(projectId);
  const used = (harnesses ?? []).filter((h) => h.used);
  const stale = used.filter((h) => h.status !== 'current');
  // FR4.1: the hook rows only when the status is known and every used harness is current; unknown keeps the audit rows.
  const fromHooks = live && used.length > 0 && stale.length === 0;
  const activity = useActivity(projectId, fromHooks);
  const active = activity.some((r) => r.state !== 'idle');
  const notice = live && stale.length > 0;

  let body;
  if (fromHooks) body = active ? <ActivityRows rows={activity} /> : null;
  else if (rows.length > 0) body = <AuditRows rows={rows} />;
  else if (notice)
    body = (
      <p className="token-detail-empty" data-testid="agent-progress-unknown">
        {t('tokenDetail.progress.unknown')}
      </p>
    );
  return (
    <section className="token-detail-section" data-testid="agent-progress">
      <div className="token-detail-section-head">
        <h3>{t('tokenDetail.progress.title')}</h3>
        <i className="token-detail-rule" aria-hidden="true" />
      </div>
      {notice && <HooksNotice projectId={projectId} harnesses={stale} />}
      {body ?? (
        <p className="token-detail-empty" data-testid="agent-progress-empty">
          {t('tokenDetail.progress.empty')}
        </p>
      )}
    </section>
  );
}
