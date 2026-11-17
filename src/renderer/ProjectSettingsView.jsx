// A project's settings in its Configuration view (EPIC-06 FR3, US-0012): one section at a time, chosen in the left arm
// like the Settings tabs, in the same LCARS frames. Saved in the app's own settings, never in the project.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidFeaturesPath } from '../main/parsers/features.js';
import { HARNESSES, selectableHarness } from '../shared/harnesses.js';
import { useTerminal } from './TerminalContext.jsx';
import AgentHooksSection from './AgentHooksSection.jsx'; // US-0506 u4
import { DELIVERY, DELIVERY_DEFAULT } from '../main/parsers/releases.js';
import { RadioBlocks, Section } from './SettingsView.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const MODES = ['auto', 'show', 'hide'];
/**
 * The sections in the arm (US-0012); `aidlc` is the AI-DLC configuration, shown by ConfigView; `costRules` is the
 * cost rule pack (US-0212), shown by CostRulesSection. Both only in AI-DLC projects (AIDLC_SECTIONS).
 */
export const PROJECT_SECTIONS = ['docs', 'agent', 'aidlc', 'costRules'];
export const AIDLC_SECTIONS = ['aidlc', 'costRules'];

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
  const [mode, setMode] = useState(settings.featureDocs);
  const [path, setPath] = useState(settings.featuresPath);
  const [delivery, setDelivery] = useState(savedDelivery);
  const { save, saving, status, clear } = useSectionSave(projectId);
  const load = () => {
    setMode(settings.featureDocs);
    setPath(settings.featuresPath);
    setDelivery(savedDelivery);
  };
  const reset = () => {
    load();
    clear();
  };
  useEffect(load, [settings.featureDocs, settings.featuresPath, savedDelivery]); // the saved values, also after our own save
  const validPath = isValidFeaturesPath(path);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Like the harness, an unchanged delivery is not saved, so the default is not pinned.
        if (validPath) save({ featureDocs: mode, featuresPath: path, ...(delivery !== savedDelivery ? { delivery } : {}) });
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
        {onSetup && (
          <p className="settings-setup">
            <span className="muted">{t('settings.project.noDocs')}</span>
            <button type="button" className="btn" onClick={onSetup} data-testid="project-settings-setup">
              {t('features.setup')}
            </button>
          </p>
        )}
        <Actions canSave={validPath} saving={saving} status={status} onReset={reset} />
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
    </>
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
