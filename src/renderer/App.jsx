import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ProjectView from './ProjectView.jsx';
import AuctumMark from './AuctumMark.jsx';
import Splash from './Splash.jsx';
import AppSettingsDialog from './AppSettingsDialog.jsx';
import DocsDialog from './DocsDialog.jsx';
import QuestionPopup from './QuestionPopup.jsx';
import { Bar, Frame } from './Lcars.jsx';

const bridge = window.bridge;
const UI_DEFAULT = { view: 'intents', cost: false, github: false };

function errorText(err) {
  return String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

/** The saved "Animationer" choice, or Dämpad when the OS asks for reduced motion, else Full (FR4.2). */
export function motionMode(saved) {
  if (saved) return saved;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'reduced' : 'full';
}

/** A labelled block in the left arm. The current or expanded one is light with a steel tab, as in the mockup. */
function ArmBlock({ current = false, expanded, tone = 'mid', children, ...rest }) {
  const lit = current || expanded === true;
  const block = (
    <button
      className={`lcars-block lcars-block--${lit ? 'light' : tone}`}
      aria-current={current ? 'page' : undefined}
      aria-expanded={expanded}
      {...rest}
    >
      {children}
    </button>
  );
  if (!lit) return block;
  return (
    <div className="lcars-tabbed">
      <span className="lcars-tab" aria-hidden="true" />
      {block}
    </div>
  );
}

export default function App() {
  const [tabs, setTabs] = useState([]); // { projectId, root, name, detection }
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState(null);
  const [restored, setRestored] = useState(false);
  const [settingsFor, setSettingsFor] = useState(null); // projectId whose "Projektinställningar" is open (EPIC-06 FR3.1)
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [animations, setAnimations] = useState(null); // saved choice; null means the default applies
  const [ui, setUi] = useState({}); // projectId -> {view, cost, github}: what the arm has selected per project
  const [meta, setMeta] = useState({}); // projectId -> {showFeatures, intentCount}, reported by ProjectView
  const [branch, setBranch] = useState(null);
  const [fullscreen, setFullscreen] = useState(false); // the window's real mode, from main (US-0404 FR1.2)
  const [terminalCommand, setTerminalCommand] = useState(null); // {seq, action, projectId} from the Terminal menu
  const [docs, setDocs] = useState(null); // {name, content} of the docs/README.md shown from Hjälp
  const [alertSettings, setAlertSettings] = useState({}); // {questionAlerts, notificationSound} as saved (US-0505 FR4.1)
  const [questions, setQuestions] = useState([]); // waiting questions of every open project, from main (FR1.4)
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupFocus, setPopupFocus] = useState(null); // {id} named by a clicked notification (FR3.2)
  const recentRef = useRef([]);
  const menuCommandRef = useRef(null);
  const seenQuestionsRef = useRef(new Set());
  const questionAlertsRef = useRef('popup-notify');
  questionAlertsRef.current = alertSettings.questionAlerts ?? 'popup-notify';
  const motion = motionMode(animations);

  // Before paint, so the first frame already runs in the chosen mode (FR4.2).
  useLayoutEffect(() => {
    document.documentElement.dataset.motion = motion;
  }, [motion]);

  const openPath = useCallback(async (dir) => {
    const info = await bridge.openProject(dir);
    setTabs((t) => [...t, info]);
    setActiveId(info.projectId);
    recentRef.current = [info.root, ...recentRef.current.filter((p) => p !== info.root)].slice(0, 10);
    return info;
  }, []);

  // Reopen the tabs from the last session (FR1.5).
  useEffect(() => {
    (async () => {
      try {
        const s = await bridge.getSettings();
        recentRef.current = s.recentProjects;
        setAnimations(s.animations ?? null);
        setAlertSettings({ questionAlerts: s.questionAlerts, notificationSound: s.notificationSound });
        const failed = [];
        let activeInfo = null;
        for (const dir of s.openProjects) {
          try {
            const info = await openPath(dir);
            if (info.root === s.activeProject) activeInfo = info;
          } catch (err) {
            failed.push(`${dir}: ${errorText(err)}`);
          }
        }
        if (activeInfo) setActiveId(activeInfo.projectId);
        if (failed.length) setError(`Kunde inte öppna igen: ${failed.join('; ')}`);
      } catch (err) {
        setError(`Kunde inte läsa inställningar: ${errorText(err)}`);
      } finally {
        setRestored(true);
      }
    })();
  }, [openPath]);

  // A folder that got AI-DLC set up switches to the project view in the same tab (FR4.6).
  useEffect(
    () =>
      bridge.onProjectDetected(({ projectId, detection }) =>
        setTabs((t) => t.map((tab) => (tab.projectId === projectId ? { ...tab, detection } : tab)))
      ),
    []
  );

  // Persist open tabs after every change, but only once the restore has finished.
  useEffect(() => {
    if (!restored) return;
    const active = tabs.find((t) => t.projectId === activeId);
    bridge
      .setSettings({
        openProjects: tabs.map((t) => t.root),
        recentProjects: recentRef.current,
        activeProject: active?.root ?? null
      })
      .catch((err) => setError(`Kunde inte spara inställningar: ${errorText(err)}`));
  }, [tabs, activeId, restored]);

  // The branch in the header. Read-only; it is only a label, so a failure just leaves it out.
  useEffect(() => {
    setBranch(null);
    if (!activeId || !bridge.getGitStatus) return undefined;
    let cancelled = false;
    bridge
      .getGitStatus(activeId)
      .then((s) => !cancelled && setBranch(s?.isRepo ? s.branch ?? null : null))
      .catch((err) => console.warn('Grenen kunde inte läsas:', errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const reportMeta = useCallback(
    (projectId, partial) => setMeta((m) => ({ ...m, [projectId]: { ...m[projectId], ...partial } })),
    []
  );
  const setUiOf = useCallback(
    (projectId, change) =>
      setUi((u) => {
        const cur = { ...UI_DEFAULT, ...u[projectId] };
        return { ...u, [projectId]: { ...cur, ...(typeof change === 'function' ? change(cur) : change) } };
      }),
    []
  );

  // The label follows the real mode, also when it changes from the menu, the shortcut or macOS' green button.
  useEffect(() => {
    bridge
      .isFullscreen()
      .then((on) => setFullscreen(on === true))
      .catch((err) => console.warn('Helskärmsläget kunde inte läsas:', errorText(err)));
    return bridge.onFullscreen((on) => setFullscreen(on === true));
  }, []);

  // Waiting questions (US-0505). Only an id not seen before and not waiting since the start opens the popup
  // (FR1.4); with "Av" it never opens by itself (FR4.2). Optional: an older preload has no question API.
  useEffect(() => {
    const receive = (list) => {
      if (!Array.isArray(list)) return;
      const seen = seenQuestionsRef.current;
      const fresh = list.some((q) => !q.early && !seen.has(q.id));
      for (const q of list) seen.add(q.id);
      setQuestions(list);
      if (fresh && questionAlertsRef.current !== 'off') setPopupOpen(true);
    };
    bridge.listQuestions?.()
      .then(receive)
      .catch((err) => console.warn('Väntande frågor kunde inte läsas:', errorText(err)));
    const offQuestions = bridge.onQuestions?.(receive);
    const offFocus = bridge.onQuestionFocus?.((id) => {
      if (typeof id !== 'string') return;
      setPopupFocus({ id });
      setPopupOpen(true);
    });
    return () => {
      offQuestions?.();
      offFocus?.();
    };
  }, []);

  // Main decides on notifications and needs to know which project is shown (FR3.1).
  useEffect(() => {
    bridge.setActiveProject?.(activeId).catch((err) => console.warn('Aktivt projekt kunde inte skickas:', errorText(err)));
  }, [activeId]);

  // New questions first, then the ones that waited from the start (FR2.2). The popup closes by itself once
  // none of the questions that opened it waits any longer (FR2.4).
  const popupQuestions = [...questions.filter((q) => !q.early), ...questions.filter((q) => q.early)];
  const hasNewQuestion = questions.some((q) => !q.early);
  useEffect(() => {
    if (!hasNewQuestion) setPopupOpen(false);
  }, [hasNewQuestion]);

  function closePopup() {
    setPopupOpen(false);
    setPopupFocus(null);
  }
  /** "Svara i Claude": that project, its Claude tab open and focused (FR2.3). Sets projectId directly, since
   *  runTerminal reads the active project from this render (developer scan, finding 6). */
  function answerInClaude(q) {
    closePopup();
    setActiveId(q.projectId);
    setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action: 'claude', projectId: q.projectId }));
  }
  async function saveAlertSettings(partial) {
    setAlertSettings((s) => ({ ...s, ...partial }));
    await bridge.setSettings(partial); // a failure is shown in the dialog
  }

  // Every menu command runs the same named function as the arm's button (US-0404 FR2.4); unknown ones are ignored.
  useEffect(() => bridge.onMenuCommand((payload) => menuCommandRef.current?.(payload)), []);

  async function openProject() {
    setError(null);
    try {
      const dir = await bridge.pickProject();
      if (!dir) return;
      const existing = tabs.find((t) => t.root === dir);
      if (existing) setActiveId(existing.projectId);
      else await openPath(dir);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function closeTab(projectId) {
    const rest = tabs.filter((t) => t.projectId !== projectId);
    setTabs(rest);
    if (activeId === projectId) setActiveId(rest[rest.length - 1]?.projectId ?? null);
    try {
      await bridge.closeProject(projectId);
    } catch (err) {
      setError(errorText(err));
    }
  }

  async function saveAnimations(next) {
    setAnimations(next);
    await bridge.setSettings({ animations: next }); // a failure is shown in the dialog
  }

  const active = tabs.find((t) => t.projectId === activeId) ?? null;
  const activeUi = active ? { ...UI_DEFAULT, ...ui[active.projectId] } : UI_DEFAULT;
  const activeMeta = (active && meta[active.projectId]) || {};
  const isAidlc = active?.detection.isAidlc === true;
  const view = activeMeta.showFeatures ? activeUi.view : 'intents';
  const firstLabel = isAidlc ? 'Intents' : 'Uppsättning';

  const showFeatures = activeMeta.showFeatures === true;

  // Named actions shared by the left arm and the app menu (US-0404 FR2.4).
  function closeActiveProject() {
    if (activeId) closeTab(activeId); // nothing open: Cmd/Ctrl+W does nothing (FR2.6)
  }
  function showView(next) {
    if (active) setUiOf(active.projectId, { view: next });
  }
  /** Kostnad and Github fold their panel out in the sidebar; from Features they switch back to it first. */
  function togglePanel(key) {
    if (!active || !isAidlc) return;
    setUiOf(active.projectId, (c) => ({ view: 'intents', [key]: c.view === 'intents' ? !c[key] : true }));
  }
  const openAppSettings = () => setAppSettingsOpen(true);
  function openProjectSettings(projectId) {
    if (!projectId) return;
    setActiveId(projectId);
    setSettingsFor(projectId);
  }
  function runTerminal(action) {
    if (active) setTerminalCommand((c) => ({ seq: (c?.seq ?? 0) + 1, action, projectId: active.projectId }));
  }
  /** The project's docs/README.md when it has one, else AI-DLC's web page (FR2.1 Hjälp, Q2). */
  async function openDocs() {
    if (active) {
      try {
        setDocs({ name: active.name, content: await bridge.readFile(active.projectId, 'docs/README.md') });
        return;
      } catch (err) {
        console.info('Ingen docs/README.md i projektet, öppnar AI-DLC:s webbsida:', errorText(err));
      }
    }
    bridge.openDocsUrl().catch((err) => setError(`Webbläsaren kunde inte öppnas: ${errorText(err)}`));
  }
  const pick = (value, allowed, fn) => allowed.includes(value) && fn(value);
  const menuCommands = {
    openProject: () => openProject(),
    closeProject: () => closeActiveProject(),
    projectSettings: () => openProjectSettings(activeId),
    appSettings: () => openAppSettings(),
    view: ({ view: v }) => pick(v, ['intents', 'features'], showView),
    panel: ({ panel }) => pick(panel, ['cost', 'github'], togglePanel),
    terminal: ({ action }) => pick(action, ['claude', 'shell', 'restart'], runTerminal),
    docs: () => openDocs()
  };
  menuCommandRef.current = (payload) => {
    if (typeof payload?.command === 'string' && Object.hasOwn(menuCommands, payload.command)) menuCommands[payload.command](payload);
  };

  // Main enables and hides menu items from this (FR2.5).
  const hasProject = active !== null;
  useEffect(() => {
    bridge
      .sendMenuState({ hasProject, isAidlc, showFeatures })
      .catch((err) => console.warn('Menyläget kunde inte skickas:', errorText(err)));
  }, [hasProject, isAidlc, showFeatures]);

  function toggleFullscreen() {
    bridge.toggleFullscreen().catch((err) => setError(`Helskärm kunde inte växlas: ${errorText(err)}`));
  }

  return (
    <div className="app">
      <Splash ready={restored} />
      <header className="app-header">
        <div className="app-brand">
          <AuctumMark size={46} className="app-mark" />
          <span className="app-brand-text">
            <span>Auctum</span>
            <span className="app-brand-sub">Aidlc control</span>
          </span>
        </div>
        <div className="app-header-main">
          <Bar segs={[['slate-4', 3], ['steel-deep', 90], ['slate-3', 1], ['slate-5', 54]]} />
          <div className="app-header-row">
            {branch && (
              <>
                <span className="app-meta-label">Gren</span>
                <span className="app-branch" title={branch}>
                  {branch}
                </span>
              </>
            )}
            <h1 className="app-title">
              {active ? (
                <>
                  {active.name} <span className="app-title-sep" aria-hidden="true">•</span> {view === 'features' ? 'Features' : firstLabel}
                </>
              ) : (
                'Inget projekt'
              )}
            </h1>
            <span className="app-header-deco" aria-hidden="true">
              <span />
              <span />
            </span>
            <button
              className={`lcars-block lcars-block--sm app-fullscreen lcars-block--${fullscreen ? 'active' : 'dark'}`}
              aria-pressed={fullscreen}
              onClick={toggleFullscreen}
              data-testid="fullscreen-toggle"
            >
              {fullscreen ? 'Lämna helskärm' : 'Helskärm'}
            </button>
          </div>
        </div>
      </header>

      <nav className="app-arm" aria-label="Projekt och vyer" data-testid="project-tabs">
        {tabs.map((t) => {
          const on = t.projectId === activeId;
          return (
            <div key={t.projectId} className={`arm-project ${on ? 'is-active' : ''}`}>
              <button
                className={`lcars-block ${on ? 'lcars-block--active' : 'lcars-block--dark'}`}
                aria-current={on ? 'true' : undefined}
                title={t.root}
                onClick={() => setActiveId(t.projectId)}
                data-testid="project-tabs-tab"
              >
                <span className="lcars-label">{t.name}</span>
              </button>
              <span className="arm-tools">
                <button
                  className="arm-tool"
                  aria-label={`Projektinställningar för ${t.name}`}
                  title={`Projektinställningar för ${t.name}`}
                  onClick={() => openProjectSettings(t.projectId)}
                  data-testid="project-settings-open"
                >
                  ⚙
                </button>
                <button className="arm-tool" aria-label={`Stäng ${t.name}`} title={`Stäng ${t.name}`} onClick={() => closeTab(t.projectId)} data-testid="project-tabs-close">
                  ×
                </button>
              </span>
            </div>
          );
        })}
        <button className="lcars-block lcars-block--sm lcars-block--deep" onClick={openProject} data-testid="project-tabs-add">
          + Öppna
        </button>
        <span className="arm-spacer" aria-hidden="true" />
        {active && (
          <>
            <ArmBlock current={view === 'intents'} onClick={() => showView('intents')} data-testid="project-view-switch-intents">
              {firstLabel}
            </ArmBlock>
            {showFeatures && (
              <ArmBlock current={view === 'features'} onClick={() => showView('features')} data-testid="project-view-switch-features">
                Features
              </ArmBlock>
            )}
            <ArmBlock
              expanded={isAidlc ? view === 'intents' && activeUi.cost : undefined}
              disabled={!isAidlc}
              onClick={() => togglePanel('cost')}
              data-testid="arm-cost"
            >
              Kostnad
            </ArmBlock>
            <ArmBlock
              tone="dark"
              expanded={isAidlc ? view === 'intents' && activeUi.github : undefined}
              disabled={!isAidlc}
              onClick={() => togglePanel('github')}
              data-testid="arm-github"
            >
              Github
            </ArmBlock>
          </>
        )}
        <ArmBlock tone="dark" onClick={openAppSettings} data-testid="app-settings-open">
          Inställningar
        </ArmBlock>
        <div className="arm-foot">
          <AuctumMark size={128} className="arm-foot-mark" decorative />
          <span className="arm-foot-label">{isAidlc ? `${activeMeta.intentCount ?? 0} intents` : 'Auctum'}</span>
        </div>
      </nav>

      {error && (
        <div className="banner banner-error app-error" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={() => setError(null)} data-testid="app-error-dismiss">
            Stäng
          </button>
        </div>
      )}

      <main className="app-main">
        {tabs.length === 0 && restored && (
          <div className="empty-state">
            <Frame>
              <AuctumMark size={96} className="empty-state-mark" />
              <h2>Inget projekt öppet</h2>
              <p>
                Öppna en projektmapp som innehåller <code>aidlc/spaces/</code>.
              </p>
              <button className="btn btn-accent" onClick={openProject} data-testid="empty-state-open">
                Öppna projekt
              </button>
            </Frame>
          </div>
        )}
        {/* Every tab stays mounted so its terminals and watchers survive tab switches (FR8.4). */}
        {tabs.map((t) => {
          const tabUi = { ...UI_DEFAULT, ...ui[t.projectId] };
          return (
            <div key={t.projectId} className="project-pane" hidden={t.projectId !== activeId}>
              <ProjectView
                project={t}
                visible={t.projectId === activeId}
                settingsOpen={settingsFor === t.projectId}
                onCloseSettings={() => setSettingsFor(null)}
                view={tabUi.view}
                onView={(v) => setUiOf(t.projectId, { view: v })}
                costOpen={tabUi.cost}
                onToggleCost={() => setUiOf(t.projectId, (c) => ({ cost: !c.cost }))}
                githubOpen={tabUi.github}
                onToggleGithub={() => setUiOf(t.projectId, (c) => ({ github: !c.github }))}
                onMeta={reportMeta}
                terminalCommand={terminalCommand}
              />
            </div>
          );
        })}
      </main>

      <AppSettingsDialog
        open={appSettingsOpen}
        onClose={() => setAppSettingsOpen(false)}
        value={motion}
        onChange={saveAnimations}
        questionAlerts={alertSettings.questionAlerts ?? 'popup-notify'}
        notificationSound={alertSettings.notificationSound !== false}
        onSave={saveAlertSettings}
      />
      <DocsDialog doc={docs} onClose={() => setDocs(null)} />
      <QuestionPopup open={popupOpen} questions={popupQuestions} focus={popupFocus} onAnswer={answerInClaude} onClose={closePopup} />
    </div>
  );
}
