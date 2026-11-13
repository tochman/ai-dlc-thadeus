import { useEffect, useRef, useState } from 'react';
import IntentList from './IntentList.jsx';
import IntentDetail from './IntentDetail.jsx';
import CostPanel from './CostPanel.jsx';
import RefreshPanel from './RefreshPanel.jsx';
import SetupAidlc from './SetupAidlc.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import { TerminalProvider, useTerminal } from './TerminalContext.jsx';
import { useProject } from './useProject.js';

function AidlcProject({ project }) {
  const { detection, projectId } = project;
  const p = useProject(projectId, detection.activeSpace);
  const activeDirName = p.intents.find((i) => i.active)?.dirName ?? null;

  return (
    <div className="project-body">
      <aside className="sidebar elbow-left">
        {detection.spaces.length > 1 && (
          <label className="field">
            <span className="field-label">Space</span>
            <select value={p.space} onChange={(e) => p.setSpace(e.target.value)} data-testid="project-space-select">
              {detection.spaces.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        {p.listWarning && (
          <p className="banner banner-warn" role="status">
            {p.listWarning} Visar senaste giltiga lista.
          </p>
        )}
        <CostPanel cost={p.cost} models={p.models} />
        <RefreshPanel projectId={projectId} space={p.space} lastIntentChangeAt={p.lastIntentChangeAt} />
        <IntentList intents={p.intents} selected={p.selected} onSelect={p.setSelected} cost={p.cost} />
      </aside>
      <section className="content">
        {p.error && (
          <p className="banner banner-error" role="alert">
            {p.error}
          </p>
        )}
        {p.detail ? (
          <IntentDetail
            projectId={projectId}
            detail={p.detail}
            intent={p.intents.find((i) => i.dirName === p.detail.dirName)}
            activeDirName={activeDirName}
            newKeys={p.newKeys}
            cost={p.cost}
            models={p.models}
          />
        ) : (
          <p className="muted">Välj en intent i listan.</p>
        )}
      </section>
    </div>
  );
}

/** Shown once AI-DLC appeared in this tab: restart Claude so it loads the hooks, then offer the first steps (FR4.7). */
function SetupDone({ onClose }) {
  const terminal = useTerminal();
  return (
    <div className="panel setup-done" role="status" data-testid="setup-aidlc-done">
      <span>AI-DLC är uppsatt. Claude startas om så att AI-DLC laddas.</span>
      <button className="btn" onClick={() => terminal.type('claude', '/aidlc --doctor')} data-testid="setup-aidlc-doctor">
        Kör /aidlc --doctor
      </button>
      <button className="btn btn-accent" onClick={() => terminal.type('claude', '/aidlc ')} data-testid="setup-aidlc-first-work">
        Starta första arbetet
      </button>
      <button className="btn btn-quiet" onClick={onClose}>
        Stäng
      </button>
    </div>
  );
}

function ProjectContent({ project, visible }) {
  const terminal = useTerminal();
  const isAidlc = project.detection.isAidlc;
  const wasAidlc = useRef(isAidlc);
  const [justSetUp, setJustSetUp] = useState(false);

  useEffect(() => {
    if (isAidlc && !wasAidlc.current) {
      setJustSetUp(true);
      terminal.restart('claude');
    }
    wasAidlc.current = isAidlc;
  }, [isAidlc]); // only the switch from "not AI-DLC" to AI-DLC matters here

  return (
    <div className="project-view">
      {justSetUp && <SetupDone onClose={() => setJustSetUp(false)} />}
      {isAidlc ? <AidlcProject project={project} /> : <SetupAidlc project={project} />}
      <TerminalPanel projectId={project.projectId} visible={visible} />
    </div>
  );
}

export default function ProjectView({ project, visible }) {
  return (
    <TerminalProvider>
      <ProjectContent project={project} visible={visible} />
    </TerminalProvider>
  );
}
