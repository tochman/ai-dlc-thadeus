import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import ProjectView from './ProjectView.jsx';
import AuctumMark from './AuctumMark.jsx';
import Splash from './Splash.jsx';
import AppSettingsDialog from './AppSettingsDialog.jsx';
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
  const recentRef = useRef([]);
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

  async function addProject() {
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

  /** Kostnad and Github fold their panel out in the sidebar; from Features they switch back to it first. */
  const togglePanel = (key) => setUiOf(active.projectId, (c) => ({ view: 'intents', [key]: c.view === 'intents' ? !c[key] : true }));

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
                  onClick={() => {
                    setActiveId(t.projectId);
                    setSettingsFor(t.projectId);
                  }}
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
        <button className="lcars-block lcars-block--sm lcars-block--deep" onClick={addProject} data-testid="project-tabs-add">
          + Öppna
        </button>
        <span className="arm-spacer" aria-hidden="true" />
        {active && (
          <>
            <ArmBlock current={view === 'intents'} onClick={() => setUiOf(active.projectId, { view: 'intents' })} data-testid="project-view-switch-intents">
              {firstLabel}
            </ArmBlock>
            {activeMeta.showFeatures && (
              <ArmBlock current={view === 'features'} onClick={() => setUiOf(active.projectId, { view: 'features' })} data-testid="project-view-switch-features">
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
        <ArmBlock tone="dark" onClick={() => setAppSettingsOpen(true)} data-testid="app-settings-open">
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
              <button className="btn btn-accent" onClick={addProject} data-testid="empty-state-open">
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
              />
            </div>
          );
        })}
      </main>

      <AppSettingsDialog open={appSettingsOpen} onClose={() => setAppSettingsOpen(false)} value={motion} onChange={saveAnimations} />
    </div>
  );
}
