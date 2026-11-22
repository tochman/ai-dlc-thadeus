// "Inställningar" for the whole app (EPIC-04 US-0405): one view in the content frame, in the LCARS style. Since
// US-0410 it shows one tab at a time (Verktyg, Utseende, Notiser, Projekt, Om), chosen from the left rail, each in an
// LCARS frame. Everything is saved in the app's own settings.json and nothing is written into a project. Focus moves
// into the view when it opens (FR1.1–FR1.3).
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n, { LANGUAGE_SETTINGS } from '../shared/i18n.js';
import AuctumMark from './AuctumMark.jsx';
import AidlcUpdate from './AidlcUpdate.jsx';
import { Pill, useEntrance } from './Lcars.jsx';
import { ToolGroup, ToolLine, ToolRow, groupStrip, toolState } from './ToolRows.jsx';

/** The tabs in rail order (US-0410 FR1.1); main keeps the same list as SETTINGS_TABS. */
export const SETTINGS_TABS = ['tools', 'appearance', 'notifications', 'project', 'about'];
const ANIMATION_IDS = ['full', 'reduced', 'off'];
// Waiting questions from AI-DLC (EPIC-05 US-0505 FR4.1): the same three choices as before.
const ALERT_IDS = ['popup-notify', 'popup', 'off'];
const REPLY_IDS = ['dialog-notify', 'line', 'off']; // US-0506 u5 D1, M9
const SOUND_IDS = ['on', 'off'];
const TOOL_IDS = ['aidlc', 'claude', 'opencode', 'gh', 'glab', 'shell']; // US-0410 FR4.1, as main's TOOL_IDS (glab: US-1201)
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

/** A save that reports its failure on the panel's alert line (FR2.6: the same behaviour as before US-0410). */
function useSave() {
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
  return [save, error, setError];
}

function ErrorLine({ error }) {
  if (!error) return null;
  return (
    <p className="refresh-error" role="alert">
      {error}
    </p>
  );
}

/**
 * The panel of one tab in its LCARS frame (US-0410 FR3.1, FR6.1): the shared card with an elbow, a header strip with
 * the tab's name and a dark body. On Full the frame sweeps and the rows cascade in (FR3.2); otherwise no motion class.
 */
export function Section({ id, motion, title, children }) {
  const { t } = useTranslation();
  const moving = motion === 'full' ? ' settings-frame--sweep settings-cascade' : '';
  return (
    <section className={`lcars-card settings-frame${moving}`} aria-labelledby={`settings-section-${id}`} data-testid={`settings-view-${id}`}>
      <header className="lcars-card-head">
        <span className="settings-frame-elbow" aria-hidden="true" />
        <h2 id={`settings-section-${id}`}>{title ?? t(`settings.sections.${id}`)}</h2>
      </header>
      <div className="lcars-card-body">{children}</div>
    </section>
  );
}

/** LCARS radio blocks: a label.lcars-block around a visually hidden radio. Shared with the project settings (US-0012). */
export function RadioBlocks({ name, ids, labelKey, value, onPick, testIdPrefix }) {
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
            data-testid={`${testIdPrefix ?? `app-settings-${name}`}-${id}`}
          />
          {t(`${labelKey}.${id}`)}
        </label>
      ))}
    </div>
  );
}

/** A path that may wrap after each `/` and never mid-word (US-0410 FR4.4). */
export function PathText({ path }) {
  const parts = path.split(/(?<=\/)/);
  return parts.map((part, i) => (
    <Fragment key={i}>
      {part}
      {i < parts.length - 1 && <wbr />}
    </Fragment>
  ));
}

/**
 * US-1201 AC-1: the Bitbucket username and app password. They go to main, which keeps them encrypted in the keychain;
 * the view only learns whether they are set, and the password field is emptied after every save. US-0416: a row in Git
 * hosts whose Sign in pill opens the form under it.
 */
function BitbucketRow() {
  const { t } = useTranslation();
  const [set, setSet] = useState(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    window.bridge.bitbucket?.status().then(
      (s) => live && setSet(s.set),
      (err) => live && setError(errorText(err))
    );
    return () => {
      live = false;
    };
  }, []);

  async function run(action) {
    setError(null);
    try {
      setSet((await action()).set);
      setUsername('');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPassword(''); // never kept in the view, saved or not
    }
  }

  return (
    <ToolRow
      testId="settings-bitbucket"
      state={set ? 'found' : 'quiet'}
      name={t('settings.tools.bitbucket.title')}
      empty={t('settings.tools.bitbucket.what')}
      chip={set === null ? t('settings.tools.checking') : set ? t('settings.tools.bitbucket.set') : t('settings.tools.bitbucket.notSet')}
      chipTestId="settings-bitbucket-status"
      actions={
        <Pill tone={open ? 'quiet' : undefined} aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="settings-bitbucket-signin">
          {t('settings.tools.bitbucket.signIn')}
        </Pill>
      }
    >
      {open && (
        <div className="tool-row-form">
          <p className="muted settings-help">{t('settings.tools.bitbucket.help')}</p>
          <label className="field">
            <span className="field-label">{t('settings.tools.bitbucket.username')}</span>
            <input type="text" autoComplete="off" value={username} onChange={(e) => setUsername(e.target.value)} data-testid="settings-bitbucket-username" />
          </label>
          <label className="field">
            <span className="field-label">{t('settings.tools.bitbucket.appPassword')}</span>
            <input
              type="password"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="settings-bitbucket-password"
            />
          </label>
          <span className="tool-row-form-act">
            <Pill
              tone="primary"
              disabled={!username || !password}
              onClick={() => run(() => window.bridge.bitbucket.save(username, password))}
              data-testid="settings-bitbucket-save"
            >
              {t('settings.tools.bitbucket.save')}
            </Pill>
            {set && (
              <Pill tone="quiet" onClick={() => run(() => window.bridge.bitbucket.clear())} data-testid="settings-bitbucket-clear">
                {t('settings.tools.bitbucket.clear')}
              </Pill>
            )}
          </span>
        </div>
      )}
      {error && (
        <p className="refresh-error tool-row-note" role="alert">
          {error}
        </p>
      )}
    </ToolRow>
  );
}

/** US-0416 AC1: the groups after AI-DLC (which AidlcUpdate draws), with the tools each holds. */
const TOOL_GROUPS = [
  ['agents', ['claude', 'opencode']],
  ['git', ['gh', 'glab']],
  ['system', ['shell']]
];

/**
 * Verktyg: every tool with its path, where that path came from and the version it reports (FR2.1), grouped by purpose
 * since US-0416. "Check for updates" calls the shell's `onCheckUpdates` (the Update dialog) when given, and always checks
 * AI-DLC again; Rescan reads the tools again.
 */
function Tools({ settings, onReload, motion, activeProjectId = null, terminal = null, lastIntentChangeAt = null, onCheckUpdates }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState(() => TOOL_IDS.map((id) => emptyRow(id, null)));
  const [error, setError] = useState(null);
  const [rowError, setRowError] = useState({});
  const [checkRequest, setCheckRequest] = useState(0);
  const entering = useEntrance('settings-tools');

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

  async function run(id, action) {
    setRowError((e) => ({ ...e, [id]: null }));
    try {
      await action();
    } catch (err) {
      setRowError((e) => ({ ...e, [id]: errorText(err) }));
    }
  }
  const choose = (id) =>
    run(id, async () => {
      const file = await window.bridge.pickTool(id);
      if (!file) return; // cancelled: nothing changes
      await window.bridge.saveTool(id, file); // main checks it first, so an invalid path is never stored (FR2.3)
      await onReload();
    });
  const reset = (id) =>
    run(id, async () => {
      await window.bridge.resetTool(id);
      await onReload();
    });

  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  const missing = rows.filter((r) => r.found === false).length;
  function checkUpdates() {
    setCheckRequest((n) => n + 1);
    onCheckUpdates?.();
  }

  return (
    <Section id="tools" motion={motion}>
      <div className={`tools-view${entering ? ' is-entering' : ''}`} data-testid="settings-tools">
        <div className="tools-bar lcars-e-rise">
          <span className="muted" data-testid="settings-tools-summary">
            {t('settings.tools.summary', { n: rows.length, missing })}
          </span>
          <span className="tools-bar-pills">
            <Pill tone="quiet" onClick={checkUpdates} data-testid="settings-tools-check-updates">
              {t('aidlcUpdate.check')}
            </Pill>
            <Pill tone="quiet" onClick={refresh} data-testid="settings-tools-rescan">
              {t('settings.tools.rescan')}
            </Pill>
          </span>
        </div>
        {/* US-0504, US-0416: the AI-DLC CLI, its update and the active project's AI-DLC files, as one group. */}
        <AidlcUpdate
          projectId={activeProjectId}
          terminal={terminal}
          lastIntentChangeAt={lastIntentChangeAt}
          tool={byId.aidlc}
          error={rowError.aidlc}
          onChoose={choose}
          onReset={reset}
          checkRequest={checkRequest}
        />
        {TOOL_GROUPS.map(([group, ids]) => (
          <ToolGroup
            key={group}
            id={group}
            title={t(`settings.tools.groups.${group}`)}
            count={ids.length + (group === 'git' ? 1 : 0)}
            strip={groupStrip(ids.map((id) => (byId[id] ? toolState(byId[id]) : 'checking')))}
          >
            {ids.map((id) => byId[id] && <ToolLine key={id} row={byId[id]} error={rowError[id]} onChoose={choose} onReset={reset} />)}
            {group === 'git' && <BitbucketRow />}
          </ToolGroup>
        ))}
        {/* FR2.5: running sessions are left alone. */}
        <p className="muted settings-help">{t('settings.tools.nextStart')}</p>
        {error && (
          <p className="refresh-error" role="alert">
            {error}
          </p>
        )}
      </div>
    </Section>
  );
}

/** Utseende: animations, full screen at start and language, each with exactly the choices it has today (FR3.1, US-0410 FR2.2). */
function Appearance({ motion, animations, onAnimations, fullscreen = false, onFullscreen, language = 'auto', onLanguage }) {
  const { t } = useTranslation();
  const [save, error] = useSave();
  return (
    <Section id="appearance" motion={motion}>
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
      <ErrorLine error={error} />
    </Section>
  );
}

/** Notiser: questions from AI-DLC, the agent's replies and the sound, moved here from Utseende (US-0410 FR2.3, FR2.6). */
function Notifications({ motion, questionAlerts = 'popup-notify', replyAlerts = 'dialog-notify', notificationSound = true, onAlertSettings }) {
  const { t } = useTranslation();
  const [save, error] = useSave();
  return (
    <Section id="notifications" motion={motion}>
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
      {/* US-0506 u5 D1, PD59: when the agent finishes its turn; questions keep the row above. */}
      <fieldset className="settings-group">
        <legend>{t('settings.repliesLegend')}</legend>
        <RadioBlocks
          name="replies"
          ids={REPLY_IDS}
          labelKey="settings.replies"
          value={REPLY_IDS.includes(replyAlerts) ? replyAlerts : 'dialog-notify'}
          onPick={(id) => save(() => onAlertSettings({ replyAlerts: id }))}
        />
        <p className="muted settings-help">{t('settings.repliesHelp')}</p>
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
      <ErrorLine error={error} />
    </Section>
  );
}

/** US-0607 FR3.1, FR4.3: minutes between release planning pushes, for every project; saved when it is 1–120. */
function PlanningInterval({ settings, onReload, save }) {
  const { t } = useTranslation();
  const saved = settings?.planningPushMinutes ?? 10; // PLANNING_PUSH_DEFAULT in settings.js
  const [draft, setDraft] = useState(String(saved));
  useEffect(() => setDraft(String(saved)), [saved]);
  const n = Number(draft);
  const valid = Number.isInteger(n) && n >= 1 && n <= 120;
  function change(value) {
    setDraft(value);
    const minutes = Number(value);
    if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 120 && minutes !== saved) {
      save(async () => {
        await window.bridge.setSettings({ planningPushMinutes: minutes });
        await onReload?.();
      });
    }
  }
  return (
    <label className="field">
      <span className="field-label">{t('settings.planningInterval.label')}</span>
      <input
        type="number"
        min="1"
        max="120"
        step="1"
        className="lcars-input"
        value={draft}
        onChange={(e) => change(e.target.value)}
        aria-invalid={!valid}
        data-testid="settings-planning-interval"
      />
      <span className="muted">{t('settings.planningInterval.help')}</span>
      {!valid && (
        <span className="refresh-error" role="alert">
          {t('settings.planningInterval.invalid')}
        </span>
      )}
    </label>
  );
}

/** Projekt: the default folder, the recent projects and a way into each open project's settings (FR4.1–FR4.3). */
function Project({ motion, onReload, settings, recentProjects = [], onRemoveRecent, projects = [], onProjectSettings }) {
  const { t } = useTranslation();
  const [save, error] = useSave();
  const folder = settings?.defaultProjectFolder ?? null;
  const pickFolder = () =>
    save(async () => {
      if (await window.bridge.pickDefaultFolder()) await onReload();
    });
  const clearFolder = () =>
    save(async () => {
      await window.bridge.clearDefaultFolder();
      await onReload();
    });

  return (
    <Section id="project" motion={motion}>
      <div className="settings-folder">
        <span className="field-label">{t('settings.defaultFolder.label')}</span>
        <code data-testid="settings-default-folder">{folder ? <PathText path={folder} /> : t('settings.defaultFolder.none')}</code>
        <button type="button" className="btn" onClick={pickFolder} data-testid="settings-default-folder-pick">
          {t('settings.defaultFolder.pick')}
        </button>
        {folder && (
          <button
            type="button"
            className="btn btn-quiet"
            aria-label={t('settings.defaultFolder.resetFor')}
            onClick={clearFolder}
            data-testid="settings-default-folder-reset"
          >
            {t('settings.defaultFolder.reset')}
          </button>
        )}
      </div>
      <PlanningInterval settings={settings} onReload={onReload} save={save} />
      <h3 className="settings-subhead">{t('settings.recent.label')}</h3>
      {recentProjects.length === 0 ? (
        <p className="muted">{t('settings.recent.empty')}</p>
      ) : (
        <ul className="settings-list">
          {recentProjects.map((dir) => (
            <li key={dir} data-testid="settings-recent-item">
              <code>
                <PathText path={dir} />
              </code>
              <button
                type="button"
                className="btn"
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
              {/* Each open project's settings live in its Configuration view, reached from here (FR4.3, US-0012). */}
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
      <ErrorLine error={error} />
    </Section>
  );
}

/** "Ta bort hämtat paket efter uppdatering: På / Av" (EPIC-04 US-0407); På unless saved as Av. */
function UpdateCleanup({ settings, onReload, onError }) {
  const { t } = useTranslation();
  const on = settings?.updates?.deleteAfterInstall !== false;
  async function pick(id) {
    try {
      await window.bridge.setSettings({ updates: { deleteAfterInstall: id === 'on' } }); // main merges the rest
      await onReload();
    } catch (err) {
      onError(t('settings.saveFailed', { error: errorText(err) }));
    }
  }
  return (
    <div className="field" data-testid="settings-update-cleanup">
      <span className="field-label">{t('settings.update.cleanup')}</span>
      <RadioBlocks name="update-cleanup" ids={['on', 'off']} labelKey="settings.update.cleanupOption" value={on ? 'on' : 'off'} onPick={pick} />
    </div>
  );
}

/** Om: the app version, the AI-DLC version that was found, the mark and the two fixed links (FR5.1). */
function About({ motion, settings, onReload }) {
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
  const aidlcTool = info?.aidlc;
  return (
    <Section id="about" motion={motion}>
      <div className="settings-about">
        <AuctumMark size={72} className="settings-about-mark" />
        <div className="settings-about-text">
          <p data-testid="settings-app-version">{t('settings.about.version', { version: info?.version ?? '–' })}</p>
          <p data-testid="settings-aidlc-version">
            {aidlcTool?.found
              ? t('settings.about.aidlcVersion', { version: aidlcTool.version })
              : t('settings.about.aidlcNotFound', { error: aidlcTool?.error ?? '' })}
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
      <UpdateCleanup settings={settings} onReload={onReload} onError={setError} />
      <ErrorLine error={error} />
    </Section>
  );
}

const PANELS = { tools: Tools, appearance: Appearance, notifications: Notifications, project: Project, about: About };

/**
 * @param {{onClose: () => void, tab?: 'tools'|'appearance'|'notifications'|'project'|'about',
 *          animations?: 'full'|'reduced'|'off', onAnimations: (value: string) => Promise<unknown>,
 *          fullscreen?: boolean, onFullscreen: (on: boolean) => Promise<unknown>,
 *          language?: 'auto'|'sv'|'en', onLanguage: (value: string) => Promise<unknown>,
 *          questionAlerts?: 'popup-notify'|'popup'|'off', replyAlerts?: 'dialog-notify'|'line'|'off', notificationSound?: boolean,
 *          onAlertSettings: (partial: {questionAlerts?: string, replyAlerts?: string, notificationSound?: boolean}) => Promise<unknown>,
 *          recentProjects?: string[], onRemoveRecent?: (dir: string) => Promise<unknown>,
 *          projects?: Array<{projectId: string, name: string}>, onProjectSettings?: (projectId: string) => void,
 *          activeProjectId?: string|null, terminal?: {type: Function, anyBusy: Function}|null, lastIntentChangeAt?: number|null}} props
 *   tab: the one panel shown (US-0410 FR1.2, default Tools); animations: the mode in effect, which also picks the
 *   panel's motion (FR3.2, FR3.3); fullscreen: the saved "Helskärm vid start" state; projects: the open tabs;
 *   terminal: the active project's shell for the AI-DLC update commands (US-0504 FR1.3, FR2.3)
 */
export default function SettingsView({ onClose, tab = 'tools', animations = 'full', ...rest }) {
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

  const Panel = PANELS[tab] ?? Tools;
  return (
    <div
      className="settings-view"
      ref={ref}
      tabIndex={-1}
      role="region"
      aria-label={t('settings.title')}
      data-testid="settings-view"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose(); // closes like the arm's block; no modal here (FR1.1)
      }}
    >
      {/* No Close button (US-0012): any view block in the arm, or Esc, leaves Settings. */}
      {/* The key remounts the panel on a tab change, so its motion runs again (FR3.2). */}
      <Panel key={tab} motion={animations} animations={animations} settings={settings} onReload={loadSettings} {...rest} />
      <ErrorLine error={error} />
    </div>
  );
}
