import { useCallback, useEffect, useRef, useState } from 'react';
import ProjectView from './ProjectView.jsx';
import AuctumMark from './AuctumMark.jsx';
import Splash, { APP_NAME } from './Splash.jsx';

const bridge = window.bridge;

function errorText(err) {
  return String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

export default function App() {
  const [tabs, setTabs] = useState([]); // { projectId, root, name, detection }
  const [activeId, setActiveId] = useState(null);
  const [error, setError] = useState(null);
  const [restored, setRestored] = useState(false);
  const recentRef = useRef([]);

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

  return (
    <div className="app">
      <Splash ready={restored} />
      <header className="app-header elbow-top">
        <h1 className="app-title">
          <AuctumMark size={28} className="app-mark" decorative />
          {APP_NAME}
        </h1>
        <nav className="project-tabs" role="tablist" aria-label="Projekt" data-testid="project-tabs">
          {tabs.map((t) => (
            <div key={t.projectId} className={`project-tab ${t.projectId === activeId ? 'is-active' : ''}`}>
              <button
                role="tab"
                aria-selected={t.projectId === activeId}
                title={t.root}
                onClick={() => setActiveId(t.projectId)}
                data-testid="project-tabs-tab"
              >
                {t.name}
              </button>
              <button
                className="project-tab-close"
                aria-label={`Stäng ${t.name}`}
                onClick={() => closeTab(t.projectId)}
                data-testid="project-tabs-close"
              >
                ×
              </button>
            </div>
          ))}
          <button className="btn btn-accent" onClick={addProject} data-testid="project-tabs-add">
            + Öppna projekt
          </button>
        </nav>
      </header>

      {error && (
        <div className="banner banner-error" role="alert">
          <span>{error}</span>
          <button className="btn" onClick={() => setError(null)} data-testid="app-error-dismiss">
            Stäng
          </button>
        </div>
      )}

      <main className="app-main">
        {tabs.length === 0 && restored && (
          <div className="empty-state panel">
            <AuctumMark size={64} className="empty-state-mark" />
            <h2>Inget projekt öppet</h2>
            <p>Öppna en projektmapp som innehåller <code>aidlc/spaces/</code>.</p>
            <button className="btn btn-accent" onClick={addProject} data-testid="empty-state-open">
              Öppna projekt
            </button>
          </div>
        )}
        {/* Every tab stays mounted so its terminals and watchers survive tab switches (FR8.4). */}
        {tabs.map((t) => (
          <div key={t.projectId} className="project-pane" hidden={t.projectId !== activeId}>
            <ProjectView project={t} visible={t.projectId === activeId} />
          </div>
        ))}
      </main>
    </div>
  );
}
