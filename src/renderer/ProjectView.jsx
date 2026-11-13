import IntentList from './IntentList.jsx';
import IntentDetail from './IntentDetail.jsx';
import CostPanel from './CostPanel.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import { useProject } from './useProject.js';

function AidlcProject({ project }) {
  const { detection, projectId } = project;
  const p = useProject(projectId, detection.activeSpace);

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
            newSeqFrom={p.newSeqFrom}
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

export default function ProjectView({ project, visible }) {
  return (
    <div className="project-view">
      {project.detection.isAidlc ? (
        <AidlcProject project={project} />
      ) : (
        <div className="panel empty-state" role="status" data-testid="project-not-aidlc">
          <h2>Inget AI-DLC-projekt</h2>
          <p>{project.detection.reason}</p>
          <p className="muted">{project.root}</p>
        </div>
      )}
      <TerminalPanel projectId={project.projectId} visible={visible} />
    </div>
  );
}
