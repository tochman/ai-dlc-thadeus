// Changing AI-DLC settings from the Configuration view (EPIC-09 US-0902, US-0904). Every change is previewed
// first: the exact command and its --dry-run result, then Apply. The renderer only ever sends
// {kind, key, value, where} or a model change; main builds the command from fixed tables (NFR4).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ACTIVE_SETTINGS,
  GROUPS,
  GUARD_LOCK_LAYERS,
  GUARD_LOCK_MODES,
  GUARD_OFF_WHERE,
  GUARD_SWITCHES,
  MODEL_WHERE,
  PRESETS,
  PROJECT_SETTINGS
} from '../shared/configTables.js';
import { compareModels } from '../main/parsers/ledger.js';
import { formatUsd } from './format.js';

const DASH = '—';
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const shown = (v) => (v == null || v === '' ? DASH : String(v));

/**
 * The exact command, its --dry-run result (or error), then Apply with the result or the error. `preview` and
 * `apply` are the bridge calls for this change; `blocked` is why Apply cannot run now, if so. Main sends
 * config:changed after a successful apply, which reloads the view.
 */
export function ChangePanel({ preview, apply, blocked = null, onClose, renderExtra }) {
  const { t } = useTranslation();
  const [shownPreview, setShownPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    let live = true;
    setShownPreview(null);
    setResult(null);
    preview()
      .then((p) => live && setShownPreview(p))
      .catch((err) => live && setShownPreview({ command: null, dryRun: null, error: errorText(err) }));
    return () => {
      live = false;
    };
  }, [preview]);

  async function run() {
    setRunning(true);
    try {
      setResult(await apply());
    } catch (err) {
      setResult({ ok: false, error: errorText(err) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="panel config-change" data-testid="config-change">
      {!shownPreview ? (
        <p className="muted" role="status">
          {t('configEdit.previewing')}
        </p>
      ) : (
        <>
          {shownPreview.command && (
            <p>
              <span className="field-label">{t('configEdit.command')}</span> <code data-testid="config-change-command">{shownPreview.command}</code>
            </p>
          )}
          {shownPreview.dryRun && <pre className="config-change-output" data-testid="config-change-dry-run">{shownPreview.dryRun}</pre>}
          {shownPreview.command && !shownPreview.dryRun && !shownPreview.error && <p className="muted">{t('configEdit.noDryRun')}</p>}
          {shownPreview.error && (
            <p className="refresh-error" role="alert" data-testid="config-change-preview-error">
              {shownPreview.error}
            </p>
          )}
          {renderExtra?.(shownPreview)}
        </>
      )}
      {blocked && <p className="muted" data-testid="config-change-blocked">{blocked}</p>}
      {result &&
        (result.ok ? (
          <p role="status" data-testid="config-change-result">
            {t('configEdit.applied')} {result.output && <code>{result.output}</code>}
          </p>
        ) : (
          <p className="refresh-error" role="alert" data-testid="config-change-error">
            {result.error}
          </p>
        ))}
      <div className="setup-actions">
        <button
          className="btn btn-accent"
          disabled={!shownPreview?.command || !!blocked || running || result?.ok}
          onClick={run}
          data-testid="config-change-apply"
        >
          {t('configEdit.apply')}
        </button>
        <button className="btn" onClick={onClose} data-testid="config-change-close">
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

/** Where a change applies: this project, only me, or this machine, chosen explicitly (no default ticked). */
export function WhereChoice({ options, value, onChange, name }) {
  const { t } = useTranslation();
  return (
    <fieldset className="config-where" data-testid={`${name}-where`}>
      <legend className="field-label">{t('configEdit.where.legend')}</legend>
      {options.map((w) => (
        <label key={w} className="check">
          <input type="radio" name={name} checked={value === w} onChange={() => onChange(w)} data-testid={`${name}-where-${w}`} />
          {t(`configEdit.where.${w}`)}
        </label>
      ))}
    </fieldset>
  );
}

/** The bridge calls for one {kind, key, value, where} change, made once per change so the preview runs once. */
function configCalls(projectId, change) {
  return {
    preview: () => window.bridge.previewConfigChange(projectId, change),
    apply: () => window.bridge.applyConfigChange(projectId, change)
  };
}

/** The active work's settings (`aidlc engine config set`), blocked while any agent tab is "Arbetar". */
export function ActiveEditor({ projectId, rows, busy }) {
  const { t } = useTranslation();
  const [calls, setCalls] = useState(null);
  const current = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]));
  return (
    <div className="config-edit" data-testid="config-edit-active">
      <div className="config-edit-grid">
        {Object.entries(ACTIVE_SETTINGS).map(([key, values]) => (
          <label key={key} className="field">
            <span className="field-label">{key}</span>
            <select
              className="lcars-select"
              value=""
              onChange={(e) => e.target.value && setCalls(configCalls(projectId, { kind: 'active', key, value: e.target.value }))}
              data-testid={`config-edit-active-${key}`}
            >
              <option value="">{t('configEdit.current', { value: shown(current[key]) })}</option>
              {values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {calls && <ChangePanel {...calls} blocked={busy ? t('configEdit.busy') : null} onClose={() => setCalls(null)} />}
    </div>
  );
}

/** Project defaults: default plan, parallel Units, provider and region, plugins (`aidlc config …`). */
export function DefaultsEditor({ projectId, plans }) {
  const { t } = useTranslation();
  const [key, setKey] = useState('defaultScope');
  const [value, setValue] = useState('');
  const [where, setWhere] = useState(null);
  const [calls, setCalls] = useState(null);
  const entry = PROJECT_SETTINGS[key];
  const choices = entry.values ?? (key === 'defaultScope' ? (plans ?? []).map((p) => p.name) : null);
  const valid = entry.values ? entry.values.includes(value) : entry.pattern.test(value);
  const ready = valid && (!entry.where.length || entry.where.includes(where));
  const change = { kind: 'project', key, value, ...(entry.where.length ? { where } : {}) };
  return (
    <div className="config-edit" data-testid="config-edit-defaults">
      <div className="config-edit-grid">
        <label className="field">
          <span className="field-label">{t('configEdit.setting')}</span>
          <select
            className="lcars-select"
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setValue('');
              setWhere(null);
            }}
            data-testid="config-edit-defaults-key"
          >
            {Object.keys(PROJECT_SETTINGS).map((k) => (
              <option key={k} value={k}>
                {t(`configEdit.defaults.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('configEdit.value')}</span>
          {choices ? (
            <select className="lcars-select" value={value} onChange={(e) => setValue(e.target.value)} data-testid="config-edit-defaults-value">
              <option value="">{DASH}</option>
              {choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          ) : (
            <input type="text" value={value} onChange={(e) => setValue(e.target.value.trim())} aria-invalid={!!value && !valid} data-testid="config-edit-defaults-value" />
          )}
        </label>
      </div>
      {entry.where.length > 0 && <WhereChoice name="config-edit-defaults" options={entry.where} value={where} onChange={setWhere} />}
      <button className="btn" disabled={!ready} onClick={() => setCalls(configCalls(projectId, change))} data-testid="config-edit-defaults-preview">
        {t('configEdit.preview')}
      </button>
      {calls && <ChangePanel {...calls} onClose={() => setCalls(null)} />}
    </div>
  );
}

/**
 * The checks a person can turn off, each with what it protects (US-0902). Turning one off asks for a
 * confirmation that names it and where it applies; turning it back on needs none.
 */
export function GuardSwitches({ projectId, flags }) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(null); // {id, where}
  const [calls, setCalls] = useState(null);
  const valueOf = (id) => (flags ?? []).find((f) => f.name === id)?.value ?? null;
  return (
    <div className="config-edit" data-testid="config-edit-guards">
      <table className="cost-table config-table">
        <tbody>
          {GUARD_SWITCHES.map((id) => (
            <tr key={id} data-testid={`config-edit-guard-${id}`}>
              <td>
                <strong>{t(`configEdit.guards.${id}.name`)}</strong>
                <div className="muted">{t(`configEdit.guards.${id}.protects`)}</div>
              </td>
              <td>
                <code>{id}</code> {shown(valueOf(id))}
              </td>
              <td>
                <button className="btn" onClick={() => setConfirming({ id, where: null })} data-testid={`config-edit-guard-off-${id}`}>
                  {t('configEdit.guards.turnOff')}
                </button>{' '}
                <button
                  className="btn"
                  onClick={() => {
                    setConfirming(null);
                    setCalls(configCalls(projectId, { kind: 'guard', key: id, value: 'on' }));
                  }}
                  data-testid={`config-edit-guard-on-${id}`}
                >
                  {t('configEdit.guards.turnOn')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {confirming && (
        <div className="panel config-change" role="alertdialog" data-testid="config-edit-guard-confirm">
          <p>{t('configEdit.guards.confirmOff', { name: t(`configEdit.guards.${confirming.id}.name`) })}</p>
          <WhereChoice name="config-edit-guard" options={GUARD_OFF_WHERE} value={confirming.where} onChange={(where) => setConfirming({ ...confirming, where })} />
          <div className="setup-actions">
            <button
              className="btn btn-accent"
              disabled={!confirming.where}
              onClick={() => {
                setCalls(configCalls(projectId, { kind: 'guard', key: confirming.id, value: 'off', where: confirming.where }));
                setConfirming(null);
              }}
              data-testid="config-edit-guard-confirm-yes"
            >
              {t('configEdit.guards.confirmYes')}
            </button>
            <button className="btn" onClick={() => setConfirming(null)} data-testid="config-edit-guard-confirm-no">
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
      {calls && <ChangePanel {...calls} onClose={() => setCalls(null)} />}
    </div>
  );
}

/** The Guard Policy lock in a memory file (tier 2): only that section changes, after its diff is shown. */
export function GuardLock({ projectId }) {
  const { t } = useTranslation();
  const [layer, setLayer] = useState('team');
  const [mode, setMode] = useState('strict');
  const [calls, setCalls] = useState(null);
  function show() {
    setCalls({
      preview: async () => {
        const r = await window.bridge.previewGuardLock(projectId, { layer, mode });
        return { command: r.file, dryRun: r.diff };
      },
      apply: async () => ({ ok: true, output: (await window.bridge.applyGuardLock(projectId)).file })
    });
  }
  return (
    <div className="config-edit" data-testid="config-edit-guard-lock">
      <p className="muted">{t('configEdit.lock.help')}</p>
      <div className="config-edit-grid">
        <label className="field">
          <span className="field-label">{t('configEdit.lock.layer')}</span>
          <select className="lcars-select" value={layer} onChange={(e) => setLayer(e.target.value)} data-testid="config-edit-guard-lock-layer">
            {GUARD_LOCK_LAYERS.map((l) => (
              <option key={l} value={l}>
                {`${l}.md`}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('configEdit.lock.mode')}</span>
          <select className="lcars-select" value={mode} onChange={(e) => setMode(e.target.value)} data-testid="config-edit-guard-lock-mode">
            {GUARD_LOCK_MODES.map((m) => (
              <option key={m} value={m}>
                {m === 'none' ? t('configEdit.lock.none') : m}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button className="btn" onClick={show} data-testid="config-edit-guard-lock-preview">
        {t('configEdit.lock.preview')}
      </button>
      {calls && <ChangePanel {...calls} onClose={() => setCalls(null)} />}
    </div>
  );
}

/** "xhigh (körs som high)" where the harness runs another level than the chosen one (opencode). */
function effortText(effort, applied, t) {
  const runs = applied?.[effort];
  return runs ? t('configEdit.models.runsAs', { effort, applied: runs }) : effort;
}

/** The estimate line under a model change's preview, always labelled as an estimate. */
function Estimate({ estimate }) {
  const { t } = useTranslation();
  if (!estimate) return <p className="muted" data-testid="config-edit-models-estimate">{t('configEdit.models.noEstimate')}</p>;
  const sign = estimate.delta > 0 ? '+' : estimate.delta < 0 ? '−' : '±';
  return (
    <p data-testid="config-edit-models-estimate">
      {t('configEdit.models.estimate', { before: formatUsd(estimate.before), after: formatUsd(estimate.after), delta: `${sign}${formatUsd(Math.abs(estimate.delta))}` })}
    </p>
  );
}

/**
 * Model and effort per agent, presets and group efforts (US-0904). Every agent with its configured value and
 * source, the model it ran on and its cost share, and a mark where the run differs from the configuration.
 * `fallback` (the read-only table) shows while the choices load or when the harness can't be changed here.
 */
export function ModelPicker({ projectId, harness, rows, fallback }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState(null);
  const [where, setWhere] = useState(null);
  const [agent, setAgent] = useState('');
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState('');
  const [preset, setPreset] = useState('');
  const [group, setGroup] = useState('');
  const [groupEffort, setGroupEffort] = useState('');
  const [calls, setCalls] = useState(null);
  const [check, setCheck] = useState(null);
  const getOptions = window.bridge.getModelOptions;

  useEffect(() => {
    if (!getOptions) return undefined;
    let live = true;
    setOptions(null);
    getOptions(projectId, harness)
      .then((o) => live && setOptions(o))
      .catch((err) => live && setOptions({ editable: false, reason: errorText(err) }));
    return () => {
      live = false;
    };
  }, [projectId, harness, getOptions]);

  if (!options) return fallback;
  if (!options.editable) {
    return (
      <>
        {fallback}
        <p className="muted" data-testid="config-edit-models-readonly">
          {options.reason}
        </p>
      </>
    );
  }

  const usage = options.usage;
  const compared = Object.fromEntries(compareModels({ agents: rows ?? [] }, usage?.agentModels ?? {}).map((c) => [c.agent, c]));
  const share = (a) => (usage?.totalUsd > 0 && usage.usdByAgent?.[a] != null ? `${Math.round((usage.usdByAgent[a] / usage.totalUsd) * 100)} %` : DASH);
  const preview = (change) =>
    setCalls({
      preview: () => window.bridge.previewModelChange(projectId, { harness, where, ...change }),
      apply: () => window.bridge.applyModelChange(projectId, { harness, where, ...change })
    });
  const effortOptions = (list) =>
    list.map((e) => (
      <option key={e} value={e}>
        {effortText(e, options.applied, t)}
      </option>
    ));

  return (
    <div className="config-edit" data-testid="config-edit-models">
      <table className="cost-table config-table">
        <thead>
          <tr>
            <th>{t('config.agent')}</th>
            <th>{t('config.model')}</th>
            <th>{t('config.effort')}</th>
            <th>{t('config.source')}</th>
            <th>{t('configEdit.models.ranOn')}</th>
            <th>{t('configEdit.models.share')}</th>
          </tr>
        </thead>
        <tbody>
          {(rows ?? []).map((r) => {
            const c = compared[r.agent];
            return (
              <tr key={r.agent} data-testid={`config-edit-models-row-${r.agent}`}>
                <td>{r.agent}</td>
                <td>{shown(r.model)}</td>
                <td>{r.effort ? effortText(r.effort, options.applied, t) : DASH}</td>
                <td>{r.modelSource === r.effortSource ? shown(r.modelSource) : `${shown(r.modelSource)} / ${shown(r.effortSource)}`}</td>
                <td>
                  {c?.actual?.length ? c.actual.join(', ') : DASH}
                  {c?.mismatch && (
                    <span className="tag tag-warn" title={t('configEdit.models.alignHint')} data-testid="config-edit-models-mismatch">
                      {t('configEdit.models.mismatch')}
                    </span>
                  )}
                </td>
                <td>{share(r.agent)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <WhereChoice name="config-edit-models" options={MODEL_WHERE} value={where} onChange={setWhere} />
      <div className="config-edit-grid">
        <label className="field">
          <span className="field-label">{t('config.agent')}</span>
          <select className="lcars-select" value={agent} onChange={(e) => setAgent(e.target.value)} data-testid="config-edit-models-agent">
            <option value="">{DASH}</option>
            {(rows ?? []).map((r) => (
              <option key={r.agent} value={r.agent}>
                {r.agent}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('config.model')}</span>
          <select className="lcars-select" value={model} onChange={(e) => setModel(e.target.value)} data-testid="config-edit-models-model">
            <option value="">{t('configEdit.models.keep')}</option>
            {options.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">{t('config.effort')}</span>
          <select className="lcars-select" value={effort} onChange={(e) => setEffort(e.target.value)} data-testid="config-edit-models-effort">
            <option value="">{t('configEdit.models.keep')}</option>
            {effortOptions(options.efforts)}
          </select>
        </label>
        <button
          className="btn"
          disabled={!where || !agent || (!model && !effort)}
          onClick={() => preview({ agent, ...(model ? { model } : {}), ...(effort ? { effort } : {}) })}
          data-testid="config-edit-models-preview-agent"
        >
          {t('configEdit.preview')}
        </button>
      </div>
      <div className="config-edit-grid">
        <label className="field">
          <span className="field-label">{t('configEdit.models.preset')}</span>
          <select className="lcars-select" value={preset} onChange={(e) => setPreset(e.target.value)} data-testid="config-edit-models-preset">
            <option value="">{DASH}</option>
            {PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button className="btn" disabled={!where || !preset} onClick={() => preview({ preset })} data-testid="config-edit-models-preview-preset">
          {t('configEdit.preview')}
        </button>
        <label className="field">
          <span className="field-label">{t('configEdit.models.group')}</span>
          <select className="lcars-select" value={group} onChange={(e) => setGroup(e.target.value)} data-testid="config-edit-models-group">
            <option value="">{DASH}</option>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {t(`configEdit.models.groups.${g}`)}
              </option>
            ))}
          </select>
        </label>
        <select className="lcars-select" value={groupEffort} onChange={(e) => setGroupEffort(e.target.value)} aria-label={t('config.effort')} data-testid="config-edit-models-group-effort">
          <option value="">{DASH}</option>
          {effortOptions(options.efforts.filter((e) => e !== 'default'))}
        </select>
        <button className="btn" disabled={!where || !group || !groupEffort} onClick={() => preview({ group, effort: groupEffort })} data-testid="config-edit-models-preview-group">
          {t('configEdit.preview')}
        </button>
      </div>
      {calls && <ChangePanel {...calls} onClose={() => setCalls(null)} renderExtra={(p) => <Estimate estimate={p.estimate} />} />}

      <p>
        <button
          className="btn"
          onClick={async () => {
            try {
              setCheck(await window.bridge.checkModels(projectId, harness));
            } catch (err) {
              setCheck({ ok: false, error: errorText(err) });
            }
          }}
          data-testid="config-edit-models-check"
        >
          {t('configEdit.models.check')}
        </button>{' '}
        {check && (
          <span className={check.ok ? 'muted' : 'refresh-error'} role="status" data-testid="config-edit-models-check-result">
            {check.ok ? check.output || t('configEdit.models.checkOk') : check.error}
          </span>
        )}
      </p>
    </div>
  );
}
