import { useEffect, useMemo, useRef, useState } from 'react';
import IntentList from './IntentList.jsx';
import IntentDetail from './IntentDetail.jsx';
import CostPanel from './CostPanel.jsx';
import RefreshPanel from './RefreshPanel.jsx';
import SetupAidlc from './SetupAidlc.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import FeaturesView from './FeaturesView.jsx';
import ProjectSettingsDialog from './ProjectSettingsDialog.jsx';
import { featureDocsPrompt } from './featureDocsPrompt.js';
import { TerminalProvider, useTerminal } from './TerminalContext.jsx';
import { useProject } from './useProject.js';
import { useFeatures } from './useFeatures.js';

/** storyId -> dirNames turned into dirName -> storyIds, for the links back from an intent (FR2.6). */
function invertLinks(links) {
  const out = {};
  for (const [story, dirs] of Object.entries(links)) for (const dir of dirs) (out[dir] ??= []).push(story);
  return out;
}

/** "Intents | Features" at the top of the project view (EPIC-06 FR2.1); plain buttons, so it works with the keyboard. */
function ViewSwitch({ mode, setMode, firstLabel }) {
  const options = [
    ['intents', firstLabel],
    ['features', 'Features']
  ];
  return (
    <div className="view-switch" role="group" aria-label="Vy" data-testid="project-view-switch">
      {options.map(([id, label]) => (
        <button
          key={id}
          className={`detail-tab ${mode === id ? 'is-active' : ''}`}
          aria-pressed={mode === id}
          onClick={() => setMode(id)}
          data-testid={`project-view-switch-${id}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function AidlcProject({ project, focusIntent, storiesByIntent, onOpenStory }) {
  const { detection, projectId } = project;
  const p = useProject(projectId, detection.activeSpace);
  const activeDirName = p.intents.find((i) => i.active)?.dirName ?? null;

  // A story's link to an intent selects that intent (FR2.6).
  useEffect(() => {
    if (focusIntent) p.setSelected(focusIntent.dirName);
  }, [focusIntent]);

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
            stories={storiesByIntent?.[p.detail.dirName] ?? []}
            onOpenStory={onOpenStory}
          />
        ) : (
          <p className="muted">Välj en intent i listan.</p>
        )}
      </section>
    </div>
  );
}

/** Shown once AI-DLC appeared in this tab: restart Claude so it loads the hooks, then offer the first steps (FR4.7). */
function SetupDone({ onClose, onFeatureDocs }) {
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
      {/* The feature-docs choice from the setup dialog (EPIC-06 FR4.4). */}
      {onFeatureDocs && (
        <button className="btn" onClick={onFeatureDocs} data-testid="setup-aidlc-feature-docs-run">
          Skapa feature-beskrivningar
        </button>
      )}
      <button className="btn btn-quiet" onClick={onClose}>
        Stäng
      </button>
    </div>
  );
}

function ProjectContent({ project, visible, settingsOpen = false, onCloseSettings }) {
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

  // Feature docs (EPIC-06): the switch follows the project setting and whether the overview exists (FR2.1, FR3.2).
  const { features, settings, links } = useFeatures(project.projectId, isAidlc ? project.detection.activeSpace : null);
  const [mode, setMode] = useState('intents'); // kept per project tab for as long as it is open
  const [featureDocsChoice, setFeatureDocsChoice] = useState(false); // lifted from SetupAidlc so it survives the switch (FR4.3)
  const [focusIntent, setFocusIntent] = useState(null);
  const [focusStory, setFocusStory] = useState(null);
  const storiesByIntent = useMemo(() => invertLinks(links), [links]);
  const docsExist = features?.available === true;
  const showSwitch = settings.featureDocs === 'show' || (settings.featureDocs === 'auto' && docsExist);
  const view = showSwitch ? mode : 'intents';
  const setupDocs = () =>
    terminal?.type('claude', featureDocsPrompt({ exists: docsExist, path: settings.featuresPath }), { submit: false });
  const offerSetup = isAidlc && !docsExist ? setupDocs : undefined; // FR3.6, FR4.5

  function openIntent(dirName) {
    setMode('intents');
    setFocusIntent({ dirName });
  }
  function openStory(id) {
    setMode('features');
    setFocusStory({ id });
  }

  return (
    <div className="project-view">
      {justSetUp && <SetupDone onClose={() => setJustSetUp(false)} onFeatureDocs={featureDocsChoice ? setupDocs : undefined} />}
      {showSwitch && <ViewSwitch mode={view} setMode={setMode} firstLabel={isAidlc ? 'Intents' : 'Uppsättning'} />}
      {/* Kept mounted while Features is shown, so the intents view keeps its state (FR2.1). */}
      <div className="project-mode" hidden={view === 'features'}>
        {isAidlc ? (
          <AidlcProject
            project={project}
            focusIntent={focusIntent}
            storiesByIntent={storiesByIntent}
            onOpenStory={showSwitch ? openStory : undefined}
          />
        ) : (
          <SetupAidlc
            project={project}
            featureDocs={featureDocsChoice}
            onFeatureDocsChange={setFeatureDocsChoice}
            featureDocsExist={docsExist}
          />
        )}
      </div>
      {view === 'features' && (
        <FeaturesView
          projectId={project.projectId}
          features={features}
          links={links}
          focusStory={focusStory}
          onOpenIntent={isAidlc ? openIntent : undefined}
          onSetup={offerSetup}
        />
      )}
      <TerminalPanel projectId={project.projectId} visible={visible} />
      <ProjectSettingsDialog
        open={settingsOpen}
        onClose={() => onCloseSettings?.()}
        projectId={project.projectId}
        name={project.name}
        settings={settings}
        onSetup={offerSetup}
      />
    </div>
  );
}

export default function ProjectView({ project, visible, settingsOpen, onCloseSettings }) {
  return (
    <TerminalProvider>
      <ProjectContent project={project} visible={visible} settingsOpen={settingsOpen} onCloseSettings={onCloseSettings} />
    </TerminalProvider>
  );
}
