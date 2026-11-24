// "Model profiles" in an AI-DLC project's Configuration (US-0210 US1.1): which plans are critical (FR1.1), the critical
// and economy profiles, each an optional AI-DLC saved profile plus a model per agent (FR1.2, FR1.3), "Ask before
// switching back" (FR1.4) and the active profile (FR4.1). Saved in the app's own settings (FR1.5); main sets `active`.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Section } from './SettingsView.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const KINDS = ['critical', 'economy'];
const EMPTY = { criticalPlans: [], critical: { models: {} }, economy: { models: {} }, askBeforeBack: false };

/** The editable part of the saved profiles; `active` is main's and is never sent from here. */
function draftOf(saved) {
  const mp = saved ?? EMPTY;
  return {
    criticalPlans: mp.criticalPlans ?? [],
    critical: { ...(mp.critical?.from ? { from: mp.critical.from } : {}), models: { ...mp.critical?.models } },
    economy: { ...(mp.economy?.from ? { from: mp.economy.from } : {}), models: { ...mp.economy?.models } },
    askBeforeBack: mp.askBeforeBack === true
  };
}

/**
 * One profile's pickers: the AI-DLC saved profile and a model per agent, empty meaning unchanged (AC1.1.2, AC1.1.3).
 * US-0417: an outlined card, the active profile's brighter (selection is brightness).
 */
function ProfileFields({ kind, profile, saved, chosen, onChange }) {
  const { t } = useTranslation();
  const setModel = (agent, model) => {
    const models = { ...profile.models, [agent]: model };
    if (!model) delete models[agent];
    onChange({ ...profile, models });
  };
  return (
    <fieldset
      className={`settings-group lcars-pcard${chosen ? ' is-chosen' : ''}`}
      aria-current={chosen ? 'true' : undefined}
      data-testid={`model-profiles-${kind}`}
    >
      <legend className="field-label lcars-pcard-title">{t(`modelProfiles.kindLegend.${kind}`)}</legend>
      {saved.names.length > 0 && (
        <label className="field">
          <span className="field-label">{t('modelProfiles.from')}</span>
          <select
            className="lcars-select"
            value={profile.from ?? ''}
            onChange={(e) => {
              const rest = { ...profile };
              delete rest.from;
              onChange(e.target.value ? { ...rest, from: e.target.value } : rest);
            }}
            data-testid={`model-profiles-from-${kind}`}
          >
            <option value="">{t('modelProfiles.fromNone')}</option>
            {saved.names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      {saved.editable &&
        saved.agents.map((agent) => (
          <label key={agent} className="field">
            <span className="field-label">{t('modelProfiles.modelFor', { agent })}</span>
            <select
              className="lcars-select"
              value={profile.models[agent] ?? ''}
              onChange={(e) => setModel(agent, e.target.value)}
              data-testid={`model-profiles-model-${kind}-${agent}`}
            >
              <option value="">{t('modelProfiles.modelUnchanged')}</option>
              {saved.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        ))}
    </fieldset>
  );
}

/** @param {{projectId: string, harness: string|null, settings: object, motion?: string}} props */
export default function ModelProfilesSection({ projectId, harness, settings, motion }) {
  const { t } = useTranslation();
  const [plans, setPlans] = useState(null);
  const [saved, setSaved] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [draft, setDraft] = useState(() => draftOf(settings?.modelProfiles));
  const [status, setStatus] = useState(null); // {ok: boolean, text?: string}
  const active = settings?.modelProfiles?.active ?? 'none';

  // The draft follows the saved profiles when their content changes, not on every new settings object (US-0043).
  const savedKey = JSON.stringify(settings?.modelProfiles ?? null);
  useEffect(() => setDraft(draftOf(JSON.parse(savedKey))), [savedKey]);
  useEffect(() => {
    if (!harness) return;
    Promise.all([window.bridge.listPlans(projectId, harness), window.bridge.getSavedModelProfiles(projectId, harness)])
      .then(([p, s]) => {
        setPlans(p.plans.map((x) => x.name));
        setSaved(s);
        setLoadError(null);
      })
      .catch((err) => setLoadError(errorText(err)));
  }, [projectId, harness]);

  const togglePlan = (name, on) => setDraft((d) => ({ ...d, criticalPlans: on ? [...d.criticalPlans, name] : d.criticalPlans.filter((p) => p !== name) }));

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    try {
      await window.bridge.setProjectSettings(projectId, { modelProfiles: draft });
      setStatus({ ok: true });
    } catch (err) {
      setStatus({ ok: false, text: errorText(err) });
    }
  }

  return (
    <div className="project-settings" data-testid="model-profiles-section">
      <form onSubmit={submit}>
        <Section id="project-model-profiles" motion={motion} title={t('settings.project.sections.modelProfiles')}>
          <p className="muted">{t('modelProfiles.help')}</p>
          <p data-testid="model-profiles-active">{t('modelProfiles.active', { profile: t(`modelProfiles.profile.${active}`) })}</p>
          {loadError && (
            <p className="refresh-error" role="alert">
              {loadError}
            </p>
          )}
          {!saved && !loadError && (
            <p className="muted" role="status">
              {t('modelProfiles.loading')}
            </p>
          )}
          {saved && (
            <>
              <fieldset className="settings-group" data-testid="model-profiles-plans">
                <legend className="field-label">{t('modelProfiles.plansLegend')}</legend>
                {plans.length === 0 && <span className="muted">{t('modelProfiles.noPlans')}</span>}
                {plans.map((name) => (
                  <label key={name} className="check">
                    <input
                      type="checkbox"
                      checked={draft.criticalPlans.includes(name)}
                      onChange={(e) => togglePlan(name, e.target.checked)}
                      data-testid={`model-profiles-plan-${name}`}
                    />
                    {name} <span className="muted">{t('modelProfiles.critical')}</span>
                  </label>
                ))}
              </fieldset>
              {saved.names.length === 0 && (
                <p className="muted" data-testid="model-profiles-save-as-hint">
                  {t('modelProfiles.saveAsHint')}
                </p>
              )}
              {!saved.editable && saved.reason && (
                <p className="muted" data-testid="model-profiles-reason">
                  {saved.reason}
                </p>
              )}
              {KINDS.map((kind) => (
                <ProfileFields
                  key={kind}
                  kind={kind}
                  profile={draft[kind]}
                  saved={saved}
                  chosen={active === kind}
                  onChange={(p) => setDraft((d) => ({ ...d, [kind]: p }))}
                />
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={draft.askBeforeBack}
                  onChange={(e) => setDraft((d) => ({ ...d, askBeforeBack: e.target.checked }))}
                  data-testid="model-profiles-ask-back"
                />
                {t('modelProfiles.askBeforeBack')}
              </label>
            </>
          )}
          {status && !status.ok && (
            <p className="refresh-error" role="alert">
              {status.text}
            </p>
          )}
          <div className="settings-actions">
            <button type="submit" className="btn btn-accent" data-testid="model-profiles-save">
              {t('common.save')}
            </button>
            {status?.ok && (
              <span className="muted" role="status" data-testid="model-profiles-saved">
                {t('settings.project.saved')}
              </span>
            )}
          </div>
        </Section>
      </form>
    </div>
  );
}
