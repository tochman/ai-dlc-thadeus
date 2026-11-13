import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import IntentList from './IntentList.jsx';
import IntentDetail from './IntentDetail.jsx';
import CostPanel from './CostPanel.jsx';
import RefreshPanel from './RefreshPanel.jsx';
import SetupAidlc from './SetupAidlc.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import FeaturesView from './FeaturesView.jsx';
import ProjectSettingsDialog from './ProjectSettingsDialog.jsx';
import { Frame } from './Lcars.jsx';
import { featureDocsPrompt } from './featureDocsPrompt.js';
import { TerminalProvider, useTerminal } from './TerminalContext.jsx';
import { useProject } from './useProject.js';
import { useFeatures } from './useFeatures.js';
import { harnessCommand, resolveHarness, selectableHarness } from '../shared/harnesses.js';

/** Why the chosen harness cannot start, in one sentence, or null (US-0801 FR5.1). */
function harnessProblem(entry, detected, t) {
  const found = detected.find((d) => d.id === entry.id);
  if (found?.cli && !found.cli.found) return t('terminal.cliMissing', { harness: entry.label, cli: entry.cli });
  // A project with no harness at all is one AI-DLC is not set up in yet; the CLI then starts as before.
  if (!found?.installed && detected.some((d) => d.installed)) return t('terminal.notInstalled', { harness: entry.label });
  return null;
}

/** Installed harnesses and CLI versions, detected in main when the project opened; null while that runs (NFR3). */
function useDetectedHarnesses(projectId) {
  const [detected, setDetected] = useState(null);
  useEffect(() => {
    let live = true;
    Promise.resolve(window.bridge.detectHarnesses?.(projectId) ?? [])
      .then((list) => live && setDetected(Array.isArray(list) ? list : []))
      .catch((err) => {
        console.error('Harness detection failed:', err); // the agent tab falls back to the default harness
        if (live) setDetected([]);
      });
    return () => {
      live = false;
    };
  }, [projectId]);
  return detected;
}

/** storyId -> dirNames turned into dirName -> storyIds, for the links back from an intent (FR2.6). */
function invertLinks(links) {
  const out = {};
  for (const [story, dirs] of Object.entries(links)) for (const dir of dirs) (out[dir] ??= []).push(story);
  return out;
}

function AidlcProject({ project, focusIntent, storiesByIntent, onOpenStory, panels, onMeta }) {
  const { t } = useTranslation();
  const { detection, projectId } = project;
  const p = useProject(projectId, detection.activeSpace);
  const activeDirName = p.intents.find((i) => i.active)?.dirName ?? null;

  // A story's link to an intent selects that intent (FR2.6).
  useEffect(() => {
    if (focusIntent) p.setSelected(focusIntent.dirName);
  }, [focusIntent]);

  // "N intents" at the foot of the left arm (FR2.2).
  useEffect(() => {
    onMeta?.(projectId, { intentCount: p.intents.length });
  }, [projectId, p.intents.length, onMeta]);

  return (
    <div className="project-body">
      <aside className="sidebar" aria-label={t('intents.overview')}>
        {detection.spaces.length > 1 && (
          <label className="field">
            <span className="field-label">{t('intents.space')}</span>
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
            {t('intents.listStale', { warning: p.listWarning })}
          </p>
        )}
        <CostPanel cost={p.cost} models={p.models} open={panels.costOpen} onToggle={panels.onToggleCost} />
        <RefreshPanel
          projectId={projectId}
          space={p.space}
          lastIntentChangeAt={p.lastIntentChangeAt}
          open={panels.githubOpen}
          onToggle={panels.onToggleGithub}
        />
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
          <Frame>
            <p className="muted">{t('intents.pick')}</p>
          </Frame>
        )}
      </section>
    </div>
  );
}

/** Shown once AI-DLC appeared in this tab: restart the agent so it loads the hooks, then offer the first steps (FR4.7). */
function SetupDone({ onClose, onFeatureDocs }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const doctor = harnessCommand(terminal.harness, ' --doctor');
  const firstWork = harnessCommand(terminal.harness, ' ');
  return (
    <div className="panel setup-done" role="status" data-testid="setup-aidlc-done">
      <span>{t('setup.done', { harness: terminal.harness?.name ?? t('terminal.agent') })}</span>
      <button className="btn" disabled={!doctor} onClick={() => terminal.type('agent', doctor)} data-testid="setup-aidlc-doctor">
        {t('setup.runDoctor')}
      </button>
      <button className="btn btn-accent" disabled={!firstWork} onClick={() => terminal.type('agent', firstWork)} data-testid="setup-aidlc-first-work">
        {t('setup.firstWork')}
      </button>
      {/* The feature-docs choice from the setup dialog (EPIC-06 FR4.4). */}
      {onFeatureDocs && (
        <button className="btn" onClick={onFeatureDocs} data-testid="setup-aidlc-feature-docs-run">
          {t('setup.createFeatureDocs')}
        </button>
      )}
      <button className="btn btn-quiet" onClick={onClose}>
        {t('common.close')}
      </button>
    </div>
  );
}

/**
 * The selected view and the open sidebar panels live in App, because the left arm selects them (FR2.2).
 * This reports back what the arm needs: whether Features is offered and how many intents there are.
 */
function ProjectContent({ project, visible, settingsOpen = false, onCloseSettings, view: chosenView = 'intents', onView, panels, onMeta, terminalCommand }) {
  const { t } = useTranslation();
  const terminal = useTerminal();

  // The Terminal menu (EPIC-04 US-0404 FR2.4): only the project it was sent for reacts; seq lets it repeat.
  useEffect(() => {
    if (!terminalCommand || terminalCommand.projectId !== project.projectId) return;
    if (terminalCommand.action === 'restart') terminal.restart(terminal.view.active);
    else terminal.show(terminalCommand.action);
  }, [terminalCommand]); // runs once per command, not when the terminal state changes
  const isAidlc = project.detection.isAidlc;
  const wasAidlc = useRef(isAidlc);
  const [justSetUp, setJustSetUp] = useState(false);

  useEffect(() => {
    if (isAidlc && !wasAidlc.current) {
      setJustSetUp(true);
      terminal.restart('agent');
    }
    wasAidlc.current = isAidlc;
  }, [isAidlc]); // only the switch from "not AI-DLC" to AI-DLC matters here

  // Feature docs (EPIC-06): the view follows the project setting and whether the overview exists (FR2.1, FR3.2).
  const { features, settings, settingsLoaded, links } = useFeatures(project.projectId, isAidlc ? project.detection.activeSpace : null);

  // The agent tab's harness (US-0801 FR2.2): known once the saved choice and the detection are both in.
  const detected = useDetectedHarnesses(project.projectId);
  const harnessId = settingsLoaded && detected ? resolveHarness(settings.harness, detected) : null;
  const harness = harnessId ? selectableHarness(harnessId) : null;
  const problem = harness ? harnessProblem(harness, detected, t) : null;
  useEffect(() => {
    terminal.setAgent({ harness, problem });
  }, [harness, problem]); // setAgent is stable
  const [choosingHarness, setChoosingHarness] = useState(false); // opened from the agent tab's warning (FR5.1)
  const [featureDocsChoice, setFeatureDocsChoice] = useState(false); // lifted from SetupAidlc so it survives the switch (FR4.3)
  const [focusIntent, setFocusIntent] = useState(null);
  const [focusStory, setFocusStory] = useState(null);
  const storiesByIntent = useMemo(() => invertLinks(links), [links]);
  const docsExist = features?.available === true;
  const showFeatures = settings.featureDocs === 'show' || (settings.featureDocs === 'auto' && docsExist);
  const view = showFeatures ? chosenView : 'intents';
  const setupDocs = () =>
    terminal?.type('agent', featureDocsPrompt({ exists: docsExist, path: settings.featuresPath }), { submit: false });
  const offerSetup = isAidlc && !docsExist ? setupDocs : undefined; // FR3.6, FR4.5

  useEffect(() => {
    onMeta?.(project.projectId, { showFeatures });
  }, [project.projectId, showFeatures, onMeta]);

  function openIntent(dirName) {
    onView?.('intents');
    setFocusIntent({ dirName });
  }
  function openStory(id) {
    onView?.('features');
    setFocusStory({ id });
  }

  return (
    <div className="project-view">
      <div className="project-main">
        {justSetUp && <SetupDone onClose={() => setJustSetUp(false)} onFeatureDocs={featureDocsChoice ? setupDocs : undefined} />}
        {/* Kept mounted while Features is shown, so the intents view keeps its state (FR2.1). */}
        <div className="project-mode" hidden={view === 'features'}>
          {isAidlc ? (
            <AidlcProject
              project={project}
              focusIntent={focusIntent}
              storiesByIntent={storiesByIntent}
              onOpenStory={showFeatures ? openStory : undefined}
              panels={panels}
              onMeta={onMeta}
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
      </div>
      <TerminalPanel projectId={project.projectId} visible={visible} onChooseHarness={() => setChoosingHarness(true)} />
      <ProjectSettingsDialog
        open={settingsOpen || choosingHarness}
        onClose={() => {
          setChoosingHarness(false);
          onCloseSettings?.();
        }}
        projectId={project.projectId}
        name={project.name}
        settings={settings}
        harness={harnessId}
        harnesses={detected}
        onSetup={offerSetup}
      />
    </div>
  );
}

export default function ProjectView({
  project,
  visible,
  settingsOpen,
  onCloseSettings,
  view,
  onView,
  costOpen,
  onToggleCost,
  githubOpen,
  onToggleGithub,
  onMeta,
  terminalCommand
}) {
  const panels = { costOpen, onToggleCost, githubOpen, onToggleGithub };
  return (
    <TerminalProvider>
      <ProjectContent
        project={project}
        visible={visible}
        settingsOpen={settingsOpen}
        onCloseSettings={onCloseSettings}
        view={view}
        onView={onView}
        panels={panels}
        onMeta={onMeta}
        terminalCommand={terminalCommand}
      />
    </TerminalProvider>
  );
}
