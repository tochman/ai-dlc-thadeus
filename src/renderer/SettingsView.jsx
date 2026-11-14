// "Inställningar" for the whole app (EPIC-04 US-0405): one view in the content frame, in the LCARS style, with
// the four sections Verktyg, Utseende, Projekt and Om. Everything is saved in the app's own settings.json and
// nothing is written into a project. Focus moves into the view when it opens (FR1.1–FR1.3).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_SETTINGS } from '../shared/i18n.js';
import AuctumMark from './AuctumMark.jsx';

const ANIMATION_IDS = ['full', 'reduced', 'off'];
// Waiting questions from AI-DLC (EPIC-05 US-0505 FR4.1): the same three choices as before.
const ALERT_IDS = ['popup-notify', 'popup', 'off'];
const SOUND_IDS = ['on', 'off'];
const TOOL_IDS = ['aidlc', 'claude', 'shell'];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** One tool row before any check has answered: the saved path, or nothing yet (NFR4). */
const emptyRow = (id, saved) => ({ id, path: saved ?? null, source: saved ? 'saved' : 'auto', found: null, version: null });

/**
 * Saves the "Språk / Language" choice, then switches to the language main resolved from it (auto follows the
 * OS). Every view re-renders in the new language, with no reload (EPIC-07 US-0701 FR4.4).
 */
export async function saveLanguage(language) {
  await window.bridge.setSettings({ language });
  await i18n.changeLanguage(await window.bridge.getLanguage());
}

/** An LCARS block of sections, labelled by its own heading (FR1.2). */
function Section({ id, children }) {
  const { t } = useTranslation();
  return (
    <section className="config-section settings-section" aria-labelledby={`settings-section-${id}`} data-testid={`settings-view-${id}`}>
      <h2 id={`settings-section-${id}`}>{t(`settings.sections.${id}`)}</h2>
      {children}
    </section>
  );
}

/** LCARS radio blocks: a label.lcars-block around a visually hidden radio. */
function RadioBlocks({ name, ids, labelKey, value, onPick }) {
  const { t } = useTranslation();
  return (
    <div className="lcars-radio-group">
      {ids.map((id) => (
        <label key={id} className={`lcars-block ${value === id ? 'lcars-block--active' : 'lcars-block--mid'}`}>
          <input
            type="radio"
            className="sr-only"
            name={`app-${name}`}
            checked={value === id}
            onChange={() => onPick(id)}
            data-testid={`app-settings-${name}-${id}`}
          />
          {t(`${labelKey}.${id}`)}
        </label>
      ))}
    </div>
  );
}

/** Verktyg: the three tools with their path, where that path came from, and the version each reports (FR2.1). */
function Tools({ settings, onReload }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(() => TOOL_IDS.map((id) => emptyRow(id, null)));
  const [error, setError] = useState(null);
  const [rowError, setRowError] = useState({});

  const refresh = useCallback(async () => {
    try {
      setRows(await window.bridge.getTools());
    } catch (err) {
      setError(t('settings.tools.loadFailed', { error: errorText(err) }));
    }
  }, [t]);

  // The saved paths show at once; the checks fill in versions and errors afterwards (NFR4).
  useEffect(() => {
    if (!settings) return;
    setRows(TOOL_IDS.map((id) => emptyRow(id, settings.toolPaths?.[id])));
    refresh();
  }, [settings, refresh]);

  async function choose(id) {
    setRowError((e) => ({ ...e, [id]: null }));
    try {
      const file = await window.bridge.pickTool(id);
      if (!file) return; // cancelled: nothing changes
      await window.bridge.saveTool(id, file); // main checks it first, so an invalid path is never stored (FR2.3)
      await onReload();
    } catch (err) {
      setRowError((e) => ({ ...e, [id]: errorText(err) }));
    }
  }

  async function reset(id) {
    setRowError((e) => ({ ...e, [id]: null }));
    try {
      await window.bridge.resetTool(id);
      await onReload();
    } catch (err) {
      setRowError((e) => ({ ...e, [id]: errorText(err) }));
    }
  }

  const label = (id) => t(`settings.tools.${id}`);
  return (
    <Section id="tools">
      {rows.map((r) => (
        <div className="settings-tool" key={r.id} data-testid={`settings-tool-${r.id}`}>
          <span className="settings-tool-name">{label(r.id)}</span>
          <span className="settings-tool-field">
            <span className="field-label">{t('settings.tools.pathLabel')}</span>
            <code>{r.path ?? t('settings.tools.checking')}</code>
          </span>
          <span className="settings-tool-field">
            <span className="field-label">{t('settings.tools.versionLabel')}</span>
            <span>{r.found === null ? t('settings.tools.checking') : r.found ? r.version : t('settings.tools.notFound')}</span>
          </span>
          <span className="settings-tool-source">{t(`settings.tools.source.${r.source}`)}</span>
          <span className="settings-tool-actions">
            <button
              type="button"
              className="btn"
              aria-label={t('settings.tools.pickFor', { tool: label(r.id) })}
              onClick={() => choose(r.id)}
              data-testid={`settings-tool-pick-${r.id}`}
            >
              {t('settings.tools.pick')}
            </button>
            {r.source === 'saved' && (
              <button
                type="button"
                className="btn btn-quiet"
                aria-label={t('settings.tools.resetFor', { tool: label(r.id) })}
                onClick={() => reset(r.id)}
                data-testid={`settings-tool-reset-${r.id}`}
              >
                {t('settings.tools.reset')}
              </button>
            )}
          </span>
          {rowError[r.id] && (
            <p className="refresh-error settings-tool-error" role="alert" data-testid={`settings-tool-error-${r.id}`}>
              {rowError[r.id]}
            </p>
          )}
          {r.error && !rowError[r.id] && <p className="muted settings-tool-error">{r.error}</p>}
        </div>
      ))}
      {/* FR2.5: running sessions are left alone. */}
      <p className="muted settings-help">{t('settings.tools.nextStart')}</p>
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}

/** Utseende: the five settings the app already had, each with exactly the choices it has today (FR3.1). */
function Appearance({ animations, onAnimations, fullscreen, onFullscreen, language, onLanguage, questionAlerts, notificationSound, onAlertSettings }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  async function save(run) {
    setError(null);
    try {
      await run();
    } catch (err) {
      setError(t('settings.saveFailed', { error: errorText(err) }));
    }
  }
  return (
    <Section id="appearance">
      <fieldset className="settings-group">
        <legend>{t('settings.animationsLegend')}</legend>
        <RadioBlocks name="animations" ids={ANIMATION_IDS} labelKey="settings.animations" value={animations} onPick={(id) => save(() => onAnimations(id))} />
        <p className="muted settings-help">{t('settings.animationsHelp')}</p>
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={fullscreen} onChange={(e) => save(() => onFullscreen(e.target.checked))} data-testid="settings-fullscreen" />
        {t('settings.fullscreenLabel')}
      </label>
      <label className="field">
        <span className="field-label">{t('settings.languageLegend')}</span>
        <select
          className="lcars-select"
          aria-label={t('settings.languageLegend')}
          value={language}
          onChange={(e) => save(() => onLanguage(e.target.value))}
          data-testid="settings-language"
        >
          {LANGUAGE_SETTINGS.map((id) => (
            <option key={id} value={id}>
              {t(`settings.language.${id}`)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="settings-group">
        <legend>{t('settings.alertsLegend')}</legend>
        <RadioBlocks
          name="alerts"
          ids={ALERT_IDS}
          labelKey="settings.alerts"
          value={questionAlerts}
          onPick={(id) => save(() => onAlertSettings({ questionAlerts: id }))}
        />
        <p className="muted settings-help">{t('settings.alertsHelp')}</p>
      </fieldset>
      <fieldset className="settings-group">
        <legend>{t('settings.soundLegend')}</legend>
        <RadioBlocks
          name="sound"
          ids={SOUND_IDS}
          labelKey="settings.sound"
          value={notificationSound ? 'on' : 'off'}
          onPick={(id) => save(() => onAlertSettings({ notificationSound: id === 'on' }))}
        />
      </fieldset>
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}

/** Projekt: the default folder, the recent projects and a way into each open project's settings (FR4.1–FR4.3). */
function Project({ settings, onReload, recentProjects = [], onRemoveRecent, projects = [], onProjectSettings }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const folder = settings?.defaultProjectFolder ?? null;

  async function pickFolder() {
    setError(null);
    try {
      if (await window.bridge.pickDefaultFolder()) await onReload();
    } catch (err) {
      setError(t('settings.saveFailed', { error: errorText(err) }));
    }
  }
  async function clearFolder() {
    setError(null);
    try {
      await window.bridge.clearDefaultFolder();
      await onReload();
    } catch (err) {
      setError(t('settings.saveFailed', { error: errorText(err) }));
    }
  }

  return (
    <Section id="project">
      <div className="settings-folder">
        <span className="field-label">{t('settings.defaultFolder.label')}</span>
        <code data-testid="settings-default-folder">{folder ?? t('settings.defaultFolder.none')}</code>
        <button type="button" className="btn" onClick={pickFolder} data-testid="settings-default-folder-pick">
          {t('settings.defaultFolder.pick')}
        </button>
        {folder && (
          <button type="button" className="btn btn-quiet" aria-label={t('settings.defaultFolder.resetFor')} onClick={clearFolder} data-testid="settings-default-folder-reset">
            {t('settings.defaultFolder.reset')}
          </button>
        )}
      </div>
      <h3 className="settings-subhead">{t('settings.recent.label')}</h3>
      {recentProjects.length === 0 ? (
        <p className="muted">{t('settings.recent.empty')}</p>
      ) : (
        <ul className="settings-list">
          {recentProjects.map((dir) => (
            <li key={dir} data-testid="settings-recent-item">
              <code>{dir}</code>
              <button
                type="button"
                className="btn btn-quiet"
                aria-label={t('settings.recent.remove', { path: dir })}
                onClick={() => onRemoveRecent?.(dir)}
                data-testid="settings-recent-remove"
              >
                {t('settings.recent.removeShort')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h3 className="settings-subhead">{t('settings.openProjects.label')}</h3>
      {projects.length === 0 ? (
        <p className="muted">{t('settings.openProjects.empty')}</p>
      ) : (
        <ul className="settings-list">
          {projects.map((p) => (
            <li key={p.projectId} data-testid="settings-project-item">
              <span>{p.name}</span>
              {/* The per-project settings stay in their own dialog, reached from here (FR4.3, FR6.2). */}
              <button
                type="button"
                className="btn"
                aria-label={t('settings.project.titleFor', { name: p.name })}
                onClick={() => onProjectSettings?.(p.projectId)}
                data-testid={`settings-project-settings-${p.projectId}`}
              >
                {t('settings.project.title')}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}

/** Om: the app version, the AI-DLC version that was found, the mark and the two fixed links (FR5.1). */
function About() {
  const { t } = useTranslation();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    window.bridge
      .getAppInfo()
      .then(setInfo)
      .catch((err) => setError(t('settings.about.loadFailed', { error: errorText(err) })));
  }, [t]);
  async function open(key) {
    setError(null);
    try {
      await window.bridge.openExternal(key);
    } catch (err) {
      setError(t('settings.about.loadFailed', { error: errorText(err) }));
    }
  }
  const aidlc = info?.aidlc;
  return (
    <Section id="about">
      <div className="settings-about">
        <AuctumMark size={72} className="settings-about-mark" />
        <div className="settings-about-text">
          <p data-testid="settings-app-version">{t('settings.about.version', { version: info?.version ?? '–' })}</p>
          <p data-testid="settings-aidlc-version">
            {aidlc?.found
              ? t('settings.about.aidlcVersion', { version: aidlc.version })
              : t('settings.about.aidlcNotFound', { error: aidlc?.error ?? '' })}
          </p>
          <div className="settings-about-links">
            <button type="button" className="btn" onClick={() => open('repo')} data-testid="settings-open-repo">
              {t('settings.about.repo')}
            </button>
            <button type="button" className="btn" onClick={() => open('features')} data-testid="settings-open-features">
              {t('settings.about.features')}
            </button>
          </div>
        </div>
      </div>
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </Section>
  );
}

/**
 * @param {{onClose: () => void, animations?: 'full'|'reduced'|'off', onAnimations: (value: string) => Promise<unknown>,
 *          fullscreen?: boolean, onFullscreen: (on: boolean) => Promise<unknown>,
 *          language?: 'auto'|'sv'|'en', onLanguage: (value: string) => Promise<unknown>,
 *          questionAlerts?: 'popup-notify'|'popup'|'off', notificationSound?: boolean,
 *          onAlertSettings: (partial: {questionAlerts?: string, notificationSound?: boolean}) => Promise<unknown>,
 *          recentProjects?: string[], onRemoveRecent?: (dir: string) => Promise<unknown>,
 *          projects?: Array<{projectId: string, name: string}>, onProjectSettings?: (projectId: string) => void}} props
 *   animations: the mode in effect; fullscreen: the saved "Helskärm vid start" state; projects: the open tabs
 */
export default function SettingsView({
  onClose,
  animations = 'full',
  onAnimations,
  fullscreen = false,
  onFullscreen,
  language = 'auto',
  onLanguage,
  questionAlerts = 'popup-notify',
  notificationSound = true,
  onAlertSettings,
  recentProjects = [],
  onRemoveRecent,
  projects = [],
  onProjectSettings
}) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [settings, setSettings] = useState(null); // toolPaths and defaultProjectFolder as saved
  const [error, setError] = useState(null);

  // Focus moves into the view when it opens, so the keyboard works without a click (FR1.3, NFR1).
  useEffect(() => {
    ref.current?.focus();
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettings(await window.bridge.getSettings());
    } catch (err) {
      setError(t('settings.saveFailed', { error: errorText(err) }));
    }
  }, [t]);
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <div
      className="settings-view"
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-labelledby="settings-view-title"
      data-testid="settings-view"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose(); // closes like the arm's block; no modal here (FR1.1)
      }}
    >
      <div className="settings-view-head">
        <h2 id="settings-view-title" className="settings-view-title">
          {t('settings.title')}
        </h2>
        <button type="button" className="btn" onClick={onClose} data-testid="settings-view-close">
          {t('common.close')}
        </button>
      </div>
      <Tools settings={settings} onReload={loadSettings} />
      <Appearance
        animations={animations}
        onAnimations={onAnimations}
        fullscreen={fullscreen}
        onFullscreen={onFullscreen}
        language={language}
        onLanguage={onLanguage}
        questionAlerts={questionAlerts}
        notificationSound={notificationSound}
        onAlertSettings={onAlertSettings}
      />
      <Project
        settings={settings}
        onReload={loadSettings}
        recentProjects={recentProjects}
        onRemoveRecent={onRemoveRecent}
        projects={projects}
        onProjectSettings={onProjectSettings}
      />
      <About />
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
