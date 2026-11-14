// Configuration view (EPIC-09 US-0901): how AI-DLC is set up in this project, with where each value comes from.
// Main runs the `aidlc config` commands and sends only the fields shown here (FR2.8). Changes (US-0902, US-0904)
// go through ConfigEdit.jsx: preview first, then apply, and the view reloads on config:changed.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setupHarness } from '../shared/harnesses.js';
import { ActiveEditor, DefaultsEditor, GuardLock, GuardSwitches, ModelPicker } from './ConfigEdit.jsx';
import { useTerminal } from './TerminalContext.jsx';

const DASH = '—';
const SECTION_KEYS = ['models', 'flags', 'active', 'provider', 'plugins'];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const shown = (v) => (v == null || v === '' ? DASH : String(v));

/** The one sentence shown instead of every section, or null when at least one section has values (FR5.1–FR5.3). */
function failure(state, t) {
  if (state.error) return t('config.failed', { error: state.error });
  const d = state.data;
  if (!d || !(d.errors?.missing || SECTION_KEYS.every((k) => d[k] == null))) return null;
  const error = Object.values(d.errors ?? {}).find((v) => typeof v === 'string') ?? '';
  return d.errors?.missing ? t('config.missing', { error }) : t('config.failed', { error });
}

function Section({ id, error, className = '', children }) {
  const { t } = useTranslation();
  return (
    <section className={`config-section ${className}`} data-testid={`config-view-${id}`}>
      <h2>{t(`config.section.${id}`)}</h2>
      {error ? (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      ) : (
        children
      )}
    </section>
  );
}

function Source({ source, env }) {
  const { t } = useTranslation();
  return (
    <>
      {shown(source)}
      {env && <span className="tag tag-warn config-env">{t('config.env')}</span>}
    </>
  );
}

function Models({ rows, harness }) {
  const { t } = useTranslation();
  const entry = setupHarness(harness);
  const byPicker = entry?.perAgentModels === false; // FR4.4
  return (
    <>
      {byPicker && <p className="muted">{t('config.modelsByPicker', { harness: entry.label })}</p>}
      <table className="cost-table config-table">
        <thead>
          <tr>
            <th>{t('config.agent')}</th>
            <th>{t('config.model')}</th>
            <th>{t('config.effort')}</th>
            <th>{t('config.source')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.agent}>
              <td>{r.agent}</td>
              <td>{shown(r.model)}</td>
              <td>{shown(r.effort)}</td>
              <td>
                <Source source={r.modelSource === r.effortSource ? r.modelSource : `${shown(r.modelSource)} / ${shown(r.effortSource)}`} env={r.env} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ValueTable({ rows, nameKey, nameLabel }) {
  const { t } = useTranslation();
  return (
    <table className="cost-table config-table">
      <thead>
        <tr>
          <th>{nameLabel}</th>
          <th>{t('config.value')}</th>
          <th>{t('config.source')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r[nameKey]}>
            <td>
              <code>{r[nameKey]}</code>
            </td>
            <td>{shown(r.value)}</td>
            <td>
              <Source source={r.source} env={r.env} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Plans({ plans }) {
  const { t } = useTranslation();
  if (!plans.length) return <p className="muted">{t('config.noPlans')}</p>;
  return (
    <ul className="config-plans">
      {plans.map((p) => (
        <li key={p.name} className={p.active ? 'is-active' : ''} aria-current={p.active || undefined} data-testid="config-view-plan">
          <strong>{p.name}</strong>
          {p.own && <span className="tag">{t('config.ownPlan')}</span>}
          {p.active && <span className="tag tag-active">{t('config.activePlan')}</span>}
          {p.description && <span className="muted">{p.description}</span>}
        </li>
      ))}
    </ul>
  );
}

function Pairs({ pairs }) {
  return (
    <dl className="config-pairs">
      {pairs.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

const MINUTE = 60 * 1000;

/** "Arbetar nu": the agents working in the active intent, read again on every change event, with a live counter. */
function WorkingAgents({ projectId }) {
  const { t } = useTranslation();
  const [agents, setAgents] = useState(null);
  const [now, setNow] = useState(Date.now);
  const load = useCallback(async () => {
    try {
      setAgents(await window.bridge.getWorkingAgents(projectId));
    } catch (err) {
      console.warn('Arbetande agenter kunde inte läsas:', errorText(err)); // the list keeps its last value
    }
  }, [projectId]);
  useEffect(() => {
    load();
    const mine = (c) => c.projectId === projectId && load();
    const offConfig = window.bridge.onConfigChanged?.(mine); // the inflight file is in the config watcher
    const offProject = window.bridge.onProjectChanged?.(mine);
    return () => {
      offConfig?.();
      offProject?.();
    };
  }, [projectId, load]);
  useEffect(() => {
    if (!agents?.length) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 15 * 1000);
    return () => clearInterval(timer);
  }, [agents]);

  return (
    <Section id="working">
      {!agents?.length ? (
        <p className="muted">{t('config.noWorking')}</p>
      ) : (
        <ul className="config-plans" data-testid="config-view-working-list">
          {agents.map((a) => (
            <li key={`${a.agent}-${a.startedMs}`} data-testid="config-view-working-agent">
              <strong>{a.name}</strong>
              <span className="tag tag-active">{t('config.workingFor', { minutes: Math.max(0, Math.floor((now - a.startedMs) / MINUTE)) })}</span>
              <span className="muted">{t('config.workingIn', { intent: a.intent ?? DASH, stage: a.stage ?? DASH })}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

/**
 * @param {{projectId: string, visible: boolean, harnesses: Array<{id: string, label: string, installed: boolean}>|null,
 *          defaultHarness: string|null, onSetup?: () => void}} props
 *   harnesses: detectHarnesses' list, null while it runs; defaultHarness: the agent tab's harness (FR4.1)
 */
export default function ConfigView({ projectId, visible, harnesses, defaultHarness, onSetup }) {
  const { t } = useTranslation();
  // Changes to the active work wait while any agent tab is "Arbetar" (US-0902, US-0803); no provider: not busy.
  const busy = useTerminal()?.anyBusy?.() === true;
  const installed = (harnesses ?? []).filter((d) => d.installed);
  const [chosen, setChosen] = useState(null); // only this view's choice; the agent tab keeps its own (FR4.2)
  const pick = (id) => installed.some((d) => d.id === id) && id;
  const harness = harnesses ? pick(chosen) || pick(defaultHarness) || installed[0]?.id || defaultHarness : null;

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const seq = useRef(0);
  const load = useCallback(async () => {
    if (!harness) return;
    const n = ++seq.current;
    try {
      const data = await window.bridge.getAidlcConfig(projectId, harness);
      if (n === seq.current) setState({ loading: false, data, error: null });
    } catch (err) {
      // A failed read replaces the earlier values, so none of them shows as current (FR5.2).
      if (n === seq.current) setState({ loading: false, data: null, error: errorText(err) });
    }
  }, [projectId, harness]);

  useEffect(() => {
    setState({ loading: true, data: null, error: null }); // NFR4: a loading state, not empty sections
    load();
  }, [load]);

  // Live reload while shown; a change while the tab is hidden reloads on the next show (FR6.1).
  const stale = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const activeDirRef = useRef(null);
  activeDirRef.current = state.data?.activeDir ?? null;
  useEffect(() => {
    const reload = () => {
      if (visibleRef.current) load();
      else stale.current = true;
    };
    const offConfig = window.bridge.onConfigChanged?.((c) => c.projectId === projectId && reload());
    const offProject = window.bridge.onProjectChanged?.(
      (c) => c.projectId === projectId && (c.indexChanged || (activeDirRef.current && c.dirNames?.includes(activeDirRef.current))) && reload()
    );
    return () => {
      offConfig?.();
      offProject?.();
    };
  }, [projectId, load]);
  useEffect(() => {
    if (visible && stale.current) {
      stale.current = false;
      load();
    }
  }, [visible, load]);

  const failed = state.loading ? null : failure(state, t);
  const d = state.data;
  const errors = d?.errors ?? {};

  return (
    <div className="config-view" data-testid="config-view">
      {installed.length > 1 && (
        <label className="field config-harness">
          <span className="field-label">{t('config.harnessLabel')}</span>
          <select className="lcars-select" value={harness ?? ''} onChange={(e) => setChosen(e.target.value)} data-testid="config-view-harness">
            {installed.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {state.loading || !harness ? (
        <p className="muted" role="status" data-testid="config-view-loading">
          {t('config.loading')}
        </p>
      ) : failed ? (
        <div className="panel features-empty" data-testid="config-view-error">
          <p className="refresh-error" role="alert">
            {failed}
          </p>
          {onSetup && (
            <button className="btn btn-accent" onClick={onSetup} data-testid="config-view-setup">
              {t('setup.start')}
            </button>
          )}
        </div>
      ) : (
        <>
          <Section id="models" error={errors.models} className={setupHarness(harness)?.perAgentModels === false ? 'is-greyed' : ''}>
            {d.models && (
              <ModelPicker projectId={projectId} harness={harness} rows={d.models} fallback={<Models rows={d.models} harness={harness} />} />
            )}
          </Section>
          <Section id="defaults" error={errors.flags}>
            {d.flags && <ValueTable rows={d.flags} nameKey="name" nameLabel={t('config.switch')} />}
            <h3>{t('configEdit.defaults.title')}</h3>
            <DefaultsEditor projectId={projectId} plans={d.plans} />
            <h3>{t('configEdit.guards.title')}</h3>
            <GuardSwitches projectId={projectId} flags={d.flags} />
            <h3>{t('configEdit.lock.title')}</h3>
            <GuardLock projectId={projectId} />
          </Section>
          <div className="config-row">
            {/* Without an active intent the section says so, whatever config list answered (FR2.4). */}
            <Section id="active" error={d.activeDir ? errors.active : undefined}>
              {d.activeDir && d.active?.length ? (
                <>
                  <ValueTable rows={d.active} nameKey="key" nameLabel={t('config.setting')} />
                  <ActiveEditor projectId={projectId} rows={d.active} busy={busy} />
                </>
              ) : (
                <p className="muted">{t('config.noActive')}</p>
              )}
            </Section>
            <WorkingAgents projectId={projectId} />
          </div>
          <Section id="plans">
            <Plans plans={d.plans ?? []} />
          </Section>
          <Section id="provider" error={errors.provider}>
            {d.provider && (
              <Pairs
                pairs={[
                  [t('config.provider'), shown(d.provider.provider)],
                  [t('config.region'), shown(d.provider.region)],
                  [t('config.profile'), shown(d.provider.profile)],
                  [t('config.harnessManaged'), d.provider.harnessManaged ? t('config.yes') : t('config.no')]
                ]}
              />
            )}
          </Section>
          <Section id="plugins" error={errors.plugins}>
            {d.plugins && (
              <Pairs
                pairs={[
                  [t('config.installedPlugins'), d.plugins.installed.join(', ') || DASH],
                  [t('config.selectedPlugins'), d.plugins.selected?.join(', ') || DASH]
                ]}
              />
            )}
          </Section>
        </>
      )}
    </div>
  );
}
