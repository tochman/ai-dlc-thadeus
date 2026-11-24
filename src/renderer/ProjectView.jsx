import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import EditorPanel, { useEditorTabs } from './editor/EditorPanel.jsx';
import FileTree from './editor/FileTree.jsx';
import { EditorCtx } from './editor/EditorContext.jsx';
import { useTranslation } from 'react-i18next';
import IntentList from './IntentList.jsx';
import IntentDetail from './IntentDetail.jsx';
import CostPanel from './CostPanel.jsx';
import RefreshPanel from './RefreshPanel.jsx';
import MachinesView from './MachinesView.jsx';
import VelocityView from './VelocityView.jsx';
import SetupAidlc from './SetupAidlc.jsx';
import TerminalPanel from './TerminalPanel.jsx';
import LatestMessageStrip from './LatestMessageStrip.jsx'; // US-0506 u3
import AgentHooksStrip from './AgentHooksStrip.jsx'; // US-0506 u4
import FeaturesView from './FeaturesView.jsx';
import ConfigView from './ConfigView.jsx';
import PlansView from './PlansView.jsx';
import ProjectSettingsView, { AIDLC_SECTIONS, confirmHarnessSwitch } from './ProjectSettingsView.jsx';
import SpeckitShell from './SpeckitShell.jsx'; // US-1401
import { sectionsFor, shownViews } from '../shared/frameworkViews.js';
import CostRulesSection from './CostRulesSection.jsx';
import ModelProfilesSection from './ModelProfilesSection.jsx'; // US-0210
import ProfileSwitchDialog from './ProfileSwitchDialog.jsx'; // US-0210
import { Frame, RoundFrame } from './Lcars.jsx';
import { featureDocsPrompt, lifecycleRulePrompt } from './featureDocsPrompt.js';
import { DELIVERY_DEFAULT } from '../main/parsers/releases.js';
import { TerminalProvider, useTerminal } from './TerminalContext.jsx';
import { useProject } from './useProject.js';
import { useFeatures } from './useFeatures.js';
import { harnessCommand, resolveHarness, selectableHarness } from '../shared/harnesses.js';

const AIDLC_TABS = ['settings', 'plans']; // US-0905: the sub-views of Configuration › AI-DLC

/** Why the chosen harness cannot start, in one sentence, or null (US-0801 FR5.1). */
function harnessProblem(entry, detected, t) {
  const found = detected.find((d) => d.id === entry.id);
  if (found?.cli && !found.cli.found) return t('terminal.cliMissing', { harness: entry.label, cli: entry.cli });
  // A project with no harness at all is one AI-DLC is not set up in yet; the CLI then starts as before.
  if (!found?.installed && detected.some((d) => d.installed)) return t('terminal.notInstalled', { harness: entry.label });
  return null;
}

/**
 * Installed harnesses and CLI versions, detected in main when the project opened; null while that runs (NFR3).
 * A new `refresh` reads them again, after a setup that main re-detected for (US-0802 FR4.1).
 */
function useDetectedHarnesses(projectId, refresh) {
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
  }, [projectId, refresh]);
  return detected;
}

/** storyId -> dirNames turned into dirName -> storyIds, for the links back from an intent (FR2.6). */
function invertLinks(links) {
  const out = {};
  for (const [story, dirs] of Object.entries(links)) for (const dir of dirs) (out[dir] ??= []).push(story);
  return out;
}

/** Intents (list and detail), Kostnad or Github: one at a time, all fed by the same project data (FR2.2). */
function AidlcProject({ project, view, teamSection = 'refresh', onView, focusIntent, storiesByIntent, onOpenStory, onMeta, onActiveRecord }) {
  const { t } = useTranslation();
  const { detection, projectId } = project;
  const p = useProject(projectId, detection.activeSpace);
  const activeIntent = p.intents.find((i) => i.active) ?? null;
  const activeDirName = activeIntent?.dirName ?? null;

  // The editor's "the agent may change this file too" notice needs the active intent's record (US-1001).
  // US-0043: the effects below run on their trigger only and read the latest callbacks through effect events.
  const reportRecord = useEffectEvent((record) => onActiveRecord?.(record));
  useEffect(() => {
    reportRecord(activeDirName && p.space ? `aidlc/spaces/${p.space}/intents/${activeDirName}/` : null);
  }, [activeDirName, p.space]);

  // A story's link to an intent selects that intent (FR2.6).
  const selectIntent = useEffectEvent((dirName) => p.setSelected(dirName));
  useEffect(() => {
    if (focusIntent) selectIntent(focusIntent.dirName);
  }, [focusIntent]);

  // "N intents" at the foot of the left arm (FR2.2).
  useEffect(() => {
    onMeta?.(projectId, { intentCount: p.intents.length });
  }, [projectId, p.intents.length, onMeta]);

  // Settings › Tools disables the AI-DLC updates for 5 minutes after an AI-DLC write (US-0504 FR4).
  useEffect(() => {
    onMeta?.(projectId, { lastIntentChangeAt: p.lastIntentChangeAt });
  }, [projectId, p.lastIntentChangeAt, onMeta]);

  // Folding a view's panel in goes back to the intents view.
  const back = () => onView?.('intents');
  return (
    <>
      {view === 'cost' && <CostPanel cost={p.cost} models={p.models} open onToggle={back} />}
      {view === 'velocity' && <VelocityView projectId={projectId} space={p.space} />}
      {/* Kept mounted, so the fetched status and changes survive a switch to another view. */}
      <div hidden={view !== 'github' || teamSection === 'machines'}>
        <RefreshPanel
          projectId={projectId}
          space={p.space}
          lastIntentChangeAt={p.lastIntentChangeAt}
          open={view === 'github'}
          onToggle={back}
          activeDirName={activeDirName}
        />
      </div>
      {/* Who does what across my machines, the team view's second section in the arm (US-1201 AC-3). */}
      {view === 'github' && teamSection === 'machines' && <MachinesView projectId={projectId} space={p.space} />}
      <div className="project-body" hidden={view !== 'intents'}>
        {/* US-0417 with US-0415: the list column is the shared drawer (IntentList), folding to its slim stack. */}
        <aside className="intents-col" aria-label={t('intents.overview')}>
          <IntentList intents={p.intents} selected={p.selected} onSelect={p.setSelected} cost={p.cost} projectId={projectId}>
            {detection.spaces.length > 1 && (
              <label className="field">
                <span className="field-label">{t('intents.space')}</span>
                <select className="lcars-select" value={p.space} onChange={(e) => p.setSpace(e.target.value)} data-testid="project-space-select">
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
          </IntentList>
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
              space={p.space}
              detail={p.detail}
              intent={p.intents.find((i) => i.dirName === p.detail.dirName)}
              activeDirName={activeDirName}
              activeIntent={activeIntent}
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
    </>
  );
}

/** "Lägg till harness…" as a native modal <dialog>: focus stays inside, Esc and Avbryt close it (US-0802 FR3.1). */
function AddHarnessDialog({ open, onClose, setupProps }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (open && !d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    else if (!open && d.open) d.close ? d.close() : d.removeAttribute('open');
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="panel settings-dialog"
      aria-label={t('setup.addTitle')}
      onCancel={(e) => {
        e.preventDefault(); // Esc: close through our own state
        onClose();
      }}
      data-testid="add-harness-dialog"
    >
      {open && (
        <>
          <SetupAidlc {...setupProps} mode="add" />
          <div className="setup-actions">
            <button type="button" className="btn" onClick={onClose} data-testid="add-harness-cancel">
              {t('common.cancel')}
            </button>
          </div>
        </>
      )}
    </dialog>
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
 * The selected view lives in App, because the left arm selects it (FR2.2).
 * This reports back what the arm needs: whether Features is offered and how many intents there are.
 */
function ProjectContent({
  project,
  visible,
  view: chosenView = 'intents',
  section = 'docs',
  aidlcTab = 'settings',
  teamSection = 'refresh',
  featuresTab = 'epics',
  onView,
  onMeta,
  terminalCommand,
  editRequest,
  onOpenReply
}) {
  const { t } = useTranslation();
  const terminal = useTerminal();

  // Editing files (EPIC-10 US-1001): the open tabs live here, so they survive a switch to another view.
  const editor = useEditorTabs(project.projectId);
  const openEditor = editor.open;
  const openInApp = useCallback(
    (rel, options) => {
      openEditor(rel, options); // US-1201 AC-2: the merge note appends its section, unsaved
      onView?.('editor');
    },
    [openEditor, onView]
  );
  const editorCtx = useMemo(() => ({ open: openInApp }), [openInApp]);
  const [activeRecord, setActiveRecord] = useState(null);
  // Once per request, from the docs dialog; effect events read the latest values without rerunning (US-0043).
  const openRequest = useEffectEvent((request) => {
    if (request?.projectId === project.projectId) openInApp(request.rel);
  });
  useEffect(() => openRequest(editRequest), [editRequest]);

  // The Terminal menu (EPIC-04 US-0404 FR2.4): only the project it was sent for reacts; seq lets it repeat.
  const runTerminalCommand = useEffectEvent((terminalCommand) => {
    if (!terminalCommand || terminalCommand.projectId !== project.projectId) return;
    // The question popup's answer: keys for the agent tab, the view stays where it is (US-0505).
    if (terminalCommand.action === 'answer') {
      // It may wait a moment for Claude Code to draw its picker (EPIC-00 US-0006).
      terminal.answer(terminalCommand.question, terminalCommand.answer).then(
        () => terminalCommand.reply?.({ ok: true }),
        (err) => terminalCommand.reply?.({ ok: false, error: err.message, debug: err.debug })
      );
      return;
    }
    // US-0213 FR3.2: a handoff choice, typed into the event's agent tab once main says it is idle.
    if (terminalCommand.action === 'handoff') {
      terminal
        .sendHandoff(terminalCommand.event, terminalCommand.choice, { onWaiting: terminalCommand.onWaiting })
        .then(terminalCommand.reply, (err) => terminalCommand.reply?.({ ok: false, reason: err.message }));
      return;
    }
    // An AI-DLC update from Settings › Tools: typed into the shell tab for the person's Enter (US-0504 FR1.3, FR2.3).
    if (terminalCommand.action === 'type') {
      terminal.show('shell');
      terminal.type('shell', terminalCommand.text, { submit: false });
      return;
    }
    if (terminalCommand.action === 'restart') terminal.restart(terminal.view.active);
    else terminal.show(terminalCommand.action);
  });
  useEffect(() => runTerminalCommand(terminalCommand), [terminalCommand]); // once per command, not when the terminal state changes
  // US-1401 FR1.2: the framework and the shared views table decide what shows (AC1.1.5).
  const { framework, defaultView } = project.detection;
  const onAidlc = framework === 'aidlc';
  const wasAidlc = useRef(onAidlc);
  const [justSetUp, setJustSetUp] = useState(false);

  const restartAgent = useEffectEvent(() => terminal.restart('agent'));
  useEffect(() => {
    if (onAidlc && !wasAidlc.current) {
      setJustSetUp(true);
      restartAgent();
    }
    wasAidlc.current = onAidlc;
  }, [onAidlc]); // only the switch from "not AI-DLC" to AI-DLC matters here

  // Feature docs (EPIC-06): the view follows the project setting and whether the overview exists (FR2.1, FR3.2).
  const { features, settings, settingsLoaded, links, ruleStatus } = useFeatures(project.projectId, onAidlc ? project.detection.activeSpace : null);
  const delivery = settings.delivery ?? DELIVERY_DEFAULT; // US-0603 FR1.1

  // The agent tab's harness (US-0801 FR2.2): known once the saved choice and the detection are both in.
  const [detectRun, setDetectRun] = useState(0);
  const detected = useDetectedHarnesses(project.projectId, detectRun);
  // The open harness tabs (US-0803): the saved choice, else US-0801's single harness. The first tab is the saved
  // harness when it is among them; the others open beside it when they can run.
  const tabIds = settings.harnessTabs ?? null;
  const preferred = tabIds ? (tabIds.includes(settings.harness) ? settings.harness : tabIds[0]) : settings.harness;
  const harnessId = settingsLoaded && detected ? resolveHarness(preferred, detected) : null;
  const harness = harnessId ? selectableHarness(harnessId) : null;
  const problem = harness ? harnessProblem(harness, detected, t) : null;
  const extras = (harness && tabIds ? tabIds.filter((id) => id !== harness.id) : []).map(selectableHarness).filter((h) => h && !harnessProblem(h, detected, t));
  const extrasKey = extras.map((h) => h.id).join();
  const reportAgent = useEffectEvent(() => {
    terminal.setAgent({ harness, problem, extras });
    onMeta?.(project.projectId, { harness: problem ? null : harnessId }); // the question popup answers only a running harness
  });
  useEffect(() => reportAgent(), [harness, problem, extrasKey]); // extras compared by their ids
  // The agent tab's warning (FR5.1) and the hooks strip's Details (US-0506 u4 BR7.15) open Configuration › Agent (US-0012).
  const [hooksFocus, setHooksFocus] = useState(false);
  const openAgentSettings = (focusHooks) => {
    setHooksFocus(focusHooks);
    onView?.('config', { configSection: 'agent' });
  };
  const [addingHarness, setAddingHarness] = useState(false); // setup in add mode, from Projektinställningar (US-0802 FR3.1)
  // US-0210 FR2.1, FR3.1: main asks to switch the model profile; the answer runs with the agent tab's harness (FR5.1).
  const [profileAsk, setProfileAsk] = useState(null);
  useEffect(() => window.bridge.onModelProfileAsk?.((ask) => ask.projectId === project.projectId && setProfileAsk(ask)), [project.projectId]);
  // The switch offer after setup goes the same way as the dialog's: asked first while the tab works (FR4.2).
  async function switchHarness(id) {
    if (!confirmHarnessSwitch(terminal, harnessId, id, t)) return;
    try {
      await window.bridge.setProjectSettings(project.projectId, { harness: id });
    } catch (err) {
      console.error('Harness switch failed:', err);
      window.alert(t('settings.saveFailed', { error: String(err?.message ?? err) }));
    }
  }
  const setupProps = {
    project,
    harnesses: detected,
    currentHarness: harnessId,
    onApplied: () => setDetectRun((n) => n + 1),
    onSwitchHarness: switchHarness
  };
  const [featureDocsChoice, setFeatureDocsChoice] = useState(false); // lifted from SetupAidlc so it survives the switch (FR4.3)
  const [focusIntent, setFocusIntent] = useState(null);
  const [focusStory, setFocusStory] = useState(null);
  const storiesByIntent = useMemo(() => invertLinks(links), [links]);
  const docsExist = features?.available === true;
  const showFeatures = settings.featureDocs === 'show' || (settings.featureDocs === 'auto' && docsExist);
  // One view at a time: Features needs the feature docs, the rest the framework; otherwise its default view shows
  // (US-0901 FR1.1, US-1401 R-01). Configuration holds the project's own settings for every project, and the AI-DLC
  // configuration in an AI-DLC one (US-0012).
  const view = shownViews(project.detection.views, showFeatures).includes(chosenView) ? chosenView : defaultView;
  const configSection = sectionsFor(framework).includes(section) ? section : 'docs';
  const aidlcShown = view === 'config' && configSection === 'aidlc';
  // US-0905: Configuration › AI-DLC has two sub-views, its settings and the plans.
  const plansShown = aidlcShown && aidlcTab === 'plans';
  const settingsShown = aidlcShown && !plansShown;
  // The AI-DLC configuration mounts the first time it is chosen, so its CLI reads wait until then, and then stays (FR6.1).
  const [configShown, setConfigShown] = useState(false);
  useEffect(() => {
    if (settingsShown) setConfigShown(true);
  }, [settingsShown]);
  const setupDocs = () => terminal?.type('agent', featureDocsPrompt({ exists: docsExist, path: settings.featuresPath, delivery }), { submit: false });
  // US-0603 FR5.2: only a project with AI-DLC and feature docs has stories for the lifecycle rule to keep.
  const ruleNotice = onAidlc && docsExist && ruleStatus && ruleStatus !== 'current' ? ruleStatus : null;
  const offerSetup = onAidlc && !docsExist ? setupDocs : undefined; // FR3.6, FR4.5

  useEffect(() => {
    onMeta?.(project.projectId, { showFeatures, delivery }); // the arm offers Epics | Releases with Releases (US-0012)
  }, [project.projectId, showFeatures, delivery, onMeta]);

  // Whether any agent tab here is "Arbetar", so the update notice asks before a restart (EPIC-04 US-0407).
  const agentBusy = terminal.anyBusy();
  useEffect(() => {
    onMeta?.(project.projectId, { busy: agentBusy });
  }, [project.projectId, agentBusy, onMeta]);

  function openIntent(dirName) {
    onView?.('intents');
    setFocusIntent({ dirName });
  }
  function openStory(id) {
    onView?.('features');
    setFocusStory({ id });
  }

  return (
    <EditorCtx.Provider value={editorCtx}>
      <div className="project-view">
        <div className="project-main">
          <AgentHooksStrip projectId={project.projectId} onDetails={() => openAgentSettings(true)} />
          {ruleNotice && (
            <p className="banner banner-warn" role="status" data-testid="lifecycle-rule-notice">
              <span>{t(`features.rule.${ruleNotice}`, { delivery: t(`features.delivery.${delivery}`) })}</span>
              <button
                className="btn"
                onClick={() => terminal?.type('agent', lifecycleRulePrompt(delivery), { submit: false })}
                data-testid="lifecycle-rule-notice-run"
              >
                {t('features.rule.run')}
              </button>
            </p>
          )}
          {justSetUp && <SetupDone onClose={() => setJustSetUp(false)} onFeatureDocs={featureDocsChoice ? setupDocs : undefined} />}
          {/* Kept mounted while Features or Configuration is shown, so the intents view keeps its state (FR2.1). */}
          <div className="project-mode" hidden={['features', 'config', 'editor'].includes(view)}>
            {framework === 'speckit' && <SpeckitShell />}
            {onAidlc && (
              <AidlcProject
                project={project}
                view={view}
                teamSection={teamSection}
                onView={onView}
                focusIntent={focusIntent}
                storiesByIntent={storiesByIntent}
                onOpenStory={showFeatures ? openStory : undefined}
                onMeta={onMeta}
                onActiveRecord={setActiveRecord}
              />
            )}
            {framework === null && (
              <SetupAidlc {...setupProps} featureDocs={featureDocsChoice} onFeatureDocsChange={setFeatureDocsChoice} featureDocsExist={docsExist} />
            )}
          </div>
          {view === 'features' && (
            <FeaturesView
              projectId={project.projectId}
              features={features}
              links={links}
              focusStory={focusStory}
              delivery={delivery}
              tab={featuresTab}
              onTab={(id) => onView?.('features', { featuresTab: id })}
              onOpenIntent={onAidlc ? openIntent : undefined}
              onSetup={offerSetup}
            />
          )}
          <ProfileSwitchDialog
            ask={profileAsk}
            answer={(yes) => window.bridge.answerModelProfile(project.projectId, profileAsk.kind, yes, harnessId)}
            onClose={() => setProfileAsk(null)}
          />
          {/* US-0417: Configuration in the round frame, the section's title on its bar. The frame stays mounted while
              another view shows, so the AI-DLC configuration keeps its reads (FR6.1). */}
          {(view === 'config' || configShown) && (
            <div className="config-pane" hidden={view !== 'config'}>
              <RoundFrame
                className="config-frame"
                title={t(`settings.project.sections.${configSection}`)}
                sub={t('config.frameSub', { project: project.name })}
                footer={selectableHarness(harnessId)?.label}
              >
                {view === 'config' && configSection === 'costRules' && <CostRulesSection projectId={project.projectId} />}
                {view === 'config' && configSection === 'modelProfiles' && (
                  <ModelProfilesSection projectId={project.projectId} harness={harnessId} settings={settings} />
                )}
                {view === 'config' && !AIDLC_SECTIONS.includes(configSection) && (
                  <ProjectSettingsView
                    section={configSection}
                    agentHooksFocus={hooksFocus}
                    projectId={project.projectId}
                    settings={settings}
                    harness={harnessId}
                    harnesses={detected}
                    onSetup={offerSetup}
                    onAddHarness={onAidlc ? () => setAddingHarness(true) : undefined}
                  />
                )}
                {onAidlc && aidlcShown && (
                  // US-0417: the Settings | Plans switch as tiles with a top strip; the chosen one is brighter.
                  <div className="lcars-tiles" role="tablist" aria-label={t('config.tabsLabel')}>
                    {AIDLC_TABS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={(id === 'plans') === plansShown}
                        className={`lcars-tile lcars-e-block${(id === 'plans') === plansShown ? ' is-sel' : ''}`}
                        onClick={() => onView?.('config', { configSection: 'aidlc', aidlcTab: id })}
                        data-testid={`aidlc-view-tab-${id}`}
                      >
                        {id === 'plans' ? t('settings.project.sections.plans') : t('config.tabSettings')}
                      </button>
                    ))}
                  </div>
                )}
                {onAidlc && (configShown || settingsShown) && (
                  <div className="project-mode" hidden={!settingsShown}>
                    <ConfigView
                      projectId={project.projectId}
                      visible={visible && view === 'config'}
                      harnesses={detected}
                      defaultHarness={harnessId}
                      onSetup={() => setAddingHarness(true)}
                    />
                  </div>
                )}
                {onAidlc && plansShown && <PlansView projectId={project.projectId} visible={visible} harness={harnessId} />}
              </RoundFrame>
            </div>
          )}
          {view === 'editor' && (
            <div className="editor-view" data-testid="editor-view">
              <FileTree projectId={project.projectId} onOpen={editor.open} />
              <EditorPanel projectId={project.projectId} editor={editor} agentBusy={agentBusy} activeRecord={activeRecord} />
            </div>
          )}
        </div>
        {onAidlc && <AddHarnessDialog open={addingHarness} onClose={() => setAddingHarness(false)} setupProps={setupProps} />}
        <LatestMessageStrip projectId={project.projectId} onOpenReply={onOpenReply} />
        <TerminalPanel projectId={project.projectId} visible={visible} onChooseHarness={() => openAgentSettings(false)} />
      </div>
    </EditorCtx.Provider>
  );
}

export default function ProjectView({
  project,
  visible,
  view,
  section,
  aidlcTab,
  teamSection,
  featuresTab,
  onView,
  onMeta,
  terminalCommand,
  editRequest,
  askingIntents,
  onOpenReply
}) {
  return (
    <TerminalProvider askingIntents={askingIntents}>
      <ProjectContent
        project={project}
        visible={visible}
        view={view}
        section={section}
        aidlcTab={aidlcTab}
        teamSection={teamSection}
        featuresTab={featuresTab}
        onView={onView}
        onMeta={onMeta}
        terminalCommand={terminalCommand}
        editRequest={editRequest}
        onOpenReply={onOpenReply}
      />
    </TerminalProvider>
  );
}
