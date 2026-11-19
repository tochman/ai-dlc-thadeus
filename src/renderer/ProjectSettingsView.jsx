// A project's settings in its Configuration view (EPIC-06 FR3, US-0012): one section at a time, chosen in the left arm
// like the Settings tabs, in the same LCARS frames. Saved in the app's own settings, never in the project.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFeaturesPath } from '../main/parsers/features.js';
import { isValidRatesPath } from '../main/reprice.js';
import { HARNESSES, selectableHarness } from '../shared/harnesses.js';
import { useTerminal } from './TerminalContext.jsx';
import AgentHooksSection from './AgentHooksSection.jsx'; // US-0506 u4
import { DELIVERY, DELIVERY_DEFAULT, PLANNING_BRANCH_DEFAULT, isValidBranchName } from '../main/parsers/releases.js';
import { RadioBlocks, Section } from './SettingsView.jsx';
import { HANDOFF_DEFAULTS, THRESHOLD_MAX, THRESHOLD_MIN } from '../main/sessionHandoff.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MODES = ['auto', 'show', 'hide'];
/**
 * The sections in the arm (US-0012); `aidlc` is the AI-DLC configuration, shown by ConfigView; `costRules` is the
 * cost rule pack (US-0212), shown by CostRulesSection; `modelProfiles` is the model profile switch (US-0210), shown by
 * ModelProfilesSection. All three only in AI-DLC projects (AIDLC_SECTIONS). The lists live in the shared views table (US-1401).
 */
export { AIDLC_SECTIONS, PROJECT_SECTIONS } from '../shared/frameworkViews.js';

/**
 * The "Agent-terminal" options (US-0801 FR2.1): the selectable harnesses with their CLI version, and the
 * detected ones that are not supported yet, disabled.
 */
function harnessOptions(detected, t) {
  const byId = Object.fromEntries((detected ?? []).map((d) => [d.id, d]));
  return HARNESSES.filter((h) => h.selectable || byId[h.id]?.installed || byId[h.id]?.cli?.found).map((h) => {
    const cli = byId[h.id]?.cli;
    const note = !h.selectable ? t('settings.project.harnessUnsupported') : cli?.found ? cli.version : cli ? t('settings.project.harnessNotFound') : null;
    return { id: h.id, disabled: !h.selectable, text: note ? `${h.label} (${note})` : h.label };
  });
}

/**
 * Switching the agent tab closes its session: true at once while it is free or ended, else the person is
 * asked first (US-0801 FR6.1). Shared with the switch offer after setup (US-0802 FR4.2).
 */
export function confirmHarnessSwitch(terminal, from, to, t) {
  if (terminal?.state('agent') !== 'busy') return true;
  return window.confirm(t('settings.project.harnessSwitchConfirm', { from: selectableHarness(from)?.label ?? from, to: selectableHarness(to)?.label ?? to }));
}

/** One section's form: Save sends `partial()`, Reset goes back to the saved values; the result shows below. */
function useSectionSave(projectId) {
  const [status, setStatus] = useState(null); // {ok: boolean, text: string}
  const [saving, setSaving] = useState(false);
  async function save(partial) {
    setSaving(true);
    setStatus(null);
    try {
      await window.bridge.setProjectSettings(projectId, partial);
      setStatus({ ok: true });
    } catch (err) {
      setStatus({ ok: false, text: errorText(err) });
    } finally {
      setSaving(false);
    }
  }
  return { save, saving, status, clear: () => setStatus(null) };
}

function Actions({ canSave, saving, status, onReset }) {
  const { t } = useTranslation();
  return (
    <>
      {status && !status.ok && (
        <p className="refresh-error" role="alert">
          {status.text}
        </p>
      )}
      <div className="settings-actions">
        <button type="submit" className="btn btn-accent" disabled={!canSave || saving} data-testid="project-settings-save">
          {t('common.save')}
        </button>
        <button type="button" className="btn" onClick={onReset} data-testid="project-settings-cancel">
          {t('settings.project.reset')}
        </button>
        {status?.ok && (
          <span className="muted" role="status" data-testid="project-settings-saved">
            {t('settings.project.saved')}
          </span>
        )}
      </div>
    </>
  );
}

/** Feature docs: when the view shows, how the project ships (US-0603 FR1.1) and where the overview is. */
function DocsSection({ projectId, settings, onSetup, motion }) {
  const { t } = useTranslation();
  const savedDelivery = settings.delivery ?? DELIVERY_DEFAULT;
  const savedBranch = settings.planningBranch ?? PLANNING_BRANCH_DEFAULT;
  const [mode, setMode] = useState(settings.featureDocs);
  const savedRates = settings.ratesPath ?? ''; // US-0211 FR1.2: empty = no project rate table
  const [path, setPath] = useState(settings.featuresPath);
  const [delivery, setDelivery] = useState(savedDelivery);
  const [branch, setBranch] = useState(savedBranch);
  const [rates, setRates] = useState(savedRates);
  const { save, saving, status, clear } = useSectionSave(projectId);
  const load = () => {
    setMode(settings.featureDocs);
    setPath(settings.featuresPath);
    setDelivery(savedDelivery);
    setBranch(savedBranch);
    setRates(savedRates);
  };
  const reset = () => {
    load();
    clear();
  };
  useEffect(load, [settings.featureDocs, settings.featuresPath, savedDelivery, savedBranch, savedRates]); // the saved values, also after our own save
  const validPath = isValidFeaturesPath(path);
  const validBranch = isValidBranchName(branch);
  const validRates = isValidRatesPath(rates);
  const canSave = validPath && validBranch && validRates;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Like the harness, an unchanged delivery or docs branch is not saved, so the default is not pinned.
        if (canSave) {
          save({
            featureDocs: mode,
            featuresPath: path,
            ...(delivery !== savedDelivery ? { delivery } : {}),
            ...(branch !== savedBranch ? { planningBranch: branch } : {}),
            ...(rates !== savedRates ? { ratesPath: rates } : {})
          });
        }
      }}
    >
      <Section id="project-docs" motion={motion} title={t('settings.project.sections.docs')}>
        <div className="field">
          <span className="field-label">{t('settings.project.featureDocsLegend')}</span>
          <RadioBlocks
            name={`feature-docs-${projectId}`}
            ids={MODES}
            labelKey="settings.project.mode"
            value={mode}
            onPick={setMode}
            testIdPrefix="project-settings-mode"
          />
          <span className="muted">{t(`settings.project.modeHelp.${mode}`)}</span>
        </div>
        <div className="field">
          <span className="field-label">{t('settings.project.deliveryLegend')}</span>
          <RadioBlocks
            name={`delivery-${projectId}`}
            ids={DELIVERY}
            labelKey="features.delivery"
            value={delivery}
            onPick={setDelivery}
            testIdPrefix="project-settings-delivery"
          />
          <span className="muted">{t(`settings.project.deliveryHelp.${delivery}`)}</span>
        </div>
        {delivery === 'releases' && (
          <label className="field">
            <span className="field-label">{t('settings.project.planningBranchLabel')}</span>
            <input
              type="text"
              className="lcars-input"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              aria-invalid={!validBranch}
              data-testid="project-settings-planning-branch"
            />
            <span className="muted">{t('settings.project.planningBranchHelp')}</span>
            {!validBranch && (
              <span className="refresh-error" role="alert">
                {t('settings.project.planningBranchInvalid')}
              </span>
            )}
          </label>
        )}
        <label className="field">
          <span className="field-label">{t('settings.project.pathLabel')}</span>
          <input
            type="text"
            className="lcars-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            aria-invalid={!validPath}
            aria-describedby={validPath ? undefined : `project-settings-path-error-${projectId}`}
            data-testid="project-settings-path"
          />
        </label>
        {!validPath && (
          <p className="refresh-error" id={`project-settings-path-error-${projectId}`} role="alert">
            {t('settings.project.pathInvalid')}
          </p>
        )}
        <label className="field">
          <span className="field-label">{t('settings.project.ratesPathLabel')}</span>
          <input
            type="text"
            className="lcars-input"
            value={rates}
            onChange={(e) => setRates(e.target.value)}
            aria-invalid={!validRates}
            aria-describedby={validRates ? undefined : `project-settings-rates-path-error-${projectId}`}
            data-testid="project-settings-rates-path"
          />
          <span className="muted">{t('settings.project.ratesPathHelp')}</span>
        </label>
        {!validRates && (
          <p className="refresh-error" id={`project-settings-rates-path-error-${projectId}`} role="alert">
            {t('settings.project.ratesPathInvalid')}
          </p>
        )}
        {onSetup && (
          <p className="settings-setup">
            <span className="muted">{t('settings.project.noDocs')}</span>
            <button type="button" className="btn" onClick={onSetup} data-testid="project-settings-setup">
              {t('features.setup')}
            </button>
          </p>
        )}
        <Actions canSave={canSave} saving={saving} status={status} onReset={reset} />
      </Section>
    </form>
  );
}

/** Agent: the harness the agent tab runs (US-0801), the tabs side by side (US-0803) and the app's hooks (US-0506 u4). */
function AgentSection({ projectId, settings, harness, harnesses, onAddHarness, agentHooksFocus, motion }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  // The agent tabs side by side (US-0803), offered only when two selectable harnesses are installed here.
  const runnable = HARNESSES.filter((h) => h.selectable && (harnesses ?? []).some((d) => d.id === h.id && d.installed)).map((h) => h.id);
  const savedTabs = settings.harnessTabs ?? (harness ? [harness] : []);
  const [chosen, setChosen] = useState(harness);
  const [tabs, setTabs] = useState(savedTabs);
  const { save, saving, status, clear } = useSectionSave(projectId);
  const load = () => {
    setChosen(harness);
    setTabs(savedTabs);
  };
  const reset = () => {
    load();
    clear();
  };
  useEffect(load, [harness, savedTabs.join()]); // detection finished, or the saved values after a save

  function submit(e) {
    e.preventDefault();
    // Only a changed harness or tab list is saved, so the detected default is not pinned.
    const switching = chosen && chosen !== harness;
    if (switching && !confirmHarnessSwitch(terminal, harness, chosen, t)) return;
    const tabsChanged = runnable.length > 1 && tabs.length > 0 && tabs.join() !== savedTabs.join();
    save({ ...(switching ? { harness: chosen } : {}), ...(tabsChanged ? { harnessTabs: tabs } : {}) });
  }

  return (
    <>
      <form onSubmit={submit}>
        <Section id="project-agent" motion={motion} title={t('settings.project.sections.agent')}>
          <label className="field">
            <span className="field-label">{t('settings.project.harnessLabel')}</span>
            <select
              className="lcars-select"
              value={chosen ?? ''}
              onChange={(e) => setChosen(e.target.value)}
              disabled={!harness}
              data-testid="project-settings-harness"
            >
              {!harness && <option value="">{t('terminal.checking')}</option>}
              {harnessOptions(harnesses, t).map((o) => (
                <option key={o.id} value={o.id} disabled={o.disabled}>
                  {o.text}
                </option>
              ))}
            </select>
          </label>
          {runnable.length > 1 && (
            <fieldset className="settings-group" data-testid="project-settings-tabs">
              <legend className="field-label">{t('settings.project.tabsLegend')}</legend>
              {runnable.map((id) => (
                <label key={id} className="check">
                  <input
                    type="checkbox"
                    checked={tabs.includes(id)}
                    // At least one tab stays open; the order follows the harness table.
                    disabled={tabs.length === 1 && tabs.includes(id)}
                    onChange={(e) => setTabs((cur) => runnable.filter((h) => (h === id ? e.target.checked : cur.includes(h))))}
                    data-testid={`project-settings-tab-${id}`}
                  />
                  {selectableHarness(id).label}
                </label>
              ))}
              <span className="muted">{t('settings.project.tabsHelp')}</span>
            </fieldset>
          )}
          {onAddHarness && (
            <p className="settings-setup">
              <span className="muted" data-testid="project-settings-installed-harnesses">
                {t('settings.project.installedHarnesses', {
                  list:
                    (harnesses ?? [])
                      .filter((d) => d.installed)
                      .map((d) => d.label)
                      .join(', ') || '–'
                })}
              </span>
              <button type="button" className="btn" onClick={onAddHarness} data-testid="project-settings-add-harness">
                {t('settings.project.addHarness')}
              </button>
            </p>
          )}
          <Actions canSave={!!harness} saving={saving} status={status} onReset={reset} />
        </Section>
      </form>
      <Section id="project-hooks" motion={motion} title={t('agentHooks.section.title')}>
        <AgentHooksSection projectId={projectId} focus={agentHooksFocus} />
      </Section>
      <HandoffSection projectId={projectId} settings={settings} motion={motion} />
    </>
  );
}

const HANDOFF_FLAGS = ['onThreshold', 'onStage', 'onGate', 'autoCompactWindow'];

/** US-0213 FR6.1, FR6.3: when the session handoff page shows, per project; saved whole, so the defaults get pinned once. */
function HandoffSection({ projectId, settings, motion }) {
  const { t } = useTranslation();
  const saved = { ...HANDOFF_DEFAULTS, ...settings.handoff };
  const [form, setForm] = useState({ ...saved, threshold: String(saved.threshold) });
  const { save, saving, status, clear } = useSectionSave(projectId);
  const threshold = Number(form.threshold);
  const valid = Number.isInteger(threshold) && threshold >= THRESHOLD_MIN && threshold <= THRESHOLD_MAX;
  const reset = () => {
    setForm({ ...saved, threshold: String(saved.threshold) });
    clear();
  };
  function submit(e) {
    e.preventDefault();
    if (valid) save({ handoff: { threshold, ...Object.fromEntries(HANDOFF_FLAGS.map((k) => [k, form[k]])) } });
  }
  return (
    <form onSubmit={submit}>
      <Section id="project-handoff" motion={motion} title={t('settings.project.handoff.title')}>
        <label className="field">
          <span className="field-label">{t('settings.project.handoff.threshold')}</span>
          <input
            type="number"
            className="lcars-input"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={1000}
            value={form.threshold}
            onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
            data-testid="project-settings-handoff-threshold"
          />
        </label>
        {!valid && (
          <p className="refresh-error" role="alert" data-testid="project-settings-handoff-invalid">
            {t('settings.project.handoff.invalid', { min: THRESHOLD_MIN, max: THRESHOLD_MAX })}
          </p>
        )}
        <fieldset className="settings-group">
          {HANDOFF_FLAGS.map((k) => (
            <label key={k} className="check">
              <input
                type="checkbox"
                checked={form[k]}
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))}
                data-testid={`project-settings-handoff-${k}`}
              />
              {t(`settings.project.handoff.${k}`)}
            </label>
          ))}
        </fieldset>
        {status && !status.ok && (
          <p className="refresh-error" role="alert">
            {status.text}
          </p>
        )}
        <div className="settings-actions">
          <button type="submit" className="btn btn-accent" disabled={!valid || saving} data-testid="project-settings-handoff-save">
            {t('common.save')}
          </button>
          <button type="button" className="btn" onClick={reset} data-testid="project-settings-handoff-cancel">
            {t('settings.project.reset')}
          </button>
          {status?.ok && <span className="muted">{t('settings.project.handoff.saved')}</span>}
        </div>
      </Section>
    </form>
  );
}

/**
 * @param {{section: 'docs'|'agent', projectId: string, settings: {featureDocs: string, featuresPath: string},
 *          onSetup?: () => void, harness?: string|null, harnesses?: Array<object>|null, onAddHarness?: () => void,
 *          agentHooksFocus?: boolean, motion?: string}} props
 *   onSetup: given when the project uses AI-DLC but has no feature docs (FR3.6, FR4.5)
 *   harness: the harness the agent tab runs now; harnesses: the detection, null while it runs (US-0801)
 *   onAddHarness: given in an AI-DLC project; opens setup in add mode (US-0802 FR3.1)
 *   agentHooksFocus: opened from the agent hooks strip's Details; the Agent dialogs section takes focus (US-0506 u4 BR7.15)
 */
export default function ProjectSettingsView({ section = 'docs', ...props }) {
  return (
    <div className="project-settings" data-testid="project-settings-view">
      {section === 'agent' ? <AgentSection {...props} /> : <DocsSection {...props} />}
    </div>
  );
}
