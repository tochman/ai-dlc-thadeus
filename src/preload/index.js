// Narrow, named API for the sandboxed renderer. No generic invoke/send is exposed.
import { contextBridge, ipcRenderer, webUtils } from 'electron';

const call =
  (channel) =>
  (...args) =>
    ipcRenderer.invoke(channel, ...args);

function subscribe(channel) {
  return (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('bridge', {
  platform: process.platform,
  pickProject: call('project:pick'),
  openProject: call('project:open'),
  closeProject: call('project:close'),
  getSpaces: call('project:spaces'),
  getIntents: call('project:intents'),
  getIntent: call('project:intent'),
  // US-0510 FR4.2, FR4.3: a project id and an intent name cross the bridge, never a command.
  parkIntent: call('intents:park'),
  unparkIntent: call('intents:unpark'),
  renameIntent: call('intents:rename'), // US-0508 FR1.2: a project id, a folder name and the new display name
  getCost: call('project:cost'),
  getVelocity: call('project:velocity'), // intent, story and project velocity (US-0303 FR3.5)
  // An intent's token readings by dir name (EPIC-02 US-0208); with a space, `{source, readings, wallMs, gap}`, rebuilt
  // from the transcripts for a finished intent without stored readings (US-0215 FR6).
  getTokenReadings: call('tokens:readings'),
  getModels: call('project:models'),
  detectHarnesses: call('harness:detect'), // installed harnesses and CLI versions (EPIC-08 US-0801)
  readFile: call('project:file'),
  // Editing files (EPIC-10 US-1001): relative paths only; main refuses engine-owned and out-of-root ones.
  readFileForEdit: call('file:read'),
  writeFile: call('file:write'),
  watchOpenFiles: call('file:watch'),
  listTree: call('project:listTree'),
  onFileChanged: subscribe('file:changed'),
  onConfirmClose: subscribe('app:confirmClose'),
  confirmClose: call('app:closeConfirmed'),
  revealInFinder: call('shell:reveal'),
  openInEditor: call('shell:openInEditor'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
  getLanguage: call('i18n:language'), // the language in effect, auto resolved (EPIC-07 FR4.4)
  // The Settings view (EPIC-04 US-0405): the three tools, their native file dialog, and the Om information.
  getTools: call('tools:info'),
  pickTool: call('tools:pick'),
  saveTool: call('tools:save'),
  resetTool: call('tools:reset'),
  // Is AI-DLC current (US-0504): a force flag and a project id cross the bridge, never a path or a command.
  getAidlcUpdateStatus: call('aidlc:updateStatus'),
  getAidlcProjectPlans: call('aidlc:projectPlans'),
  pickDefaultFolder: call('settings:pickDefaultFolder'),
  clearDefaultFolder: call('settings:clearDefaultFolder'),
  getAppInfo: call('app:info'),
  openExternal: call('app:openExternal'), // a fixed key, never a URL (US-0405 FR5.1)
  openLicenses: call('app:openLicenses'), // the bundled THIRD_PARTY_LICENSES.txt; resolves '' or an error text (US-1101 FR6.2)
  ptySpawn: call('pty:spawn'),
  ptyWrite: call('pty:write'),
  ptyResize: call('pty:resize'),
  ptyKill: call('pty:kill'),
  pathForFile: (file) => webUtils.getPathForFile(file), // a dropped File's path for the terminal; '' for non-disk files
  getGitStatus: call('git:status'),
  gitFetch: call('git:fetch'),
  getRemoteChanges: call('git:remoteChanges'),
  showRemoteFile: call('git:showRemote'),
  getConflicts: call('git:conflicts'),
  // Team collaboration (US-1201): a project id, a space and an intent dir name cross the bridge, never a path or a URL.
  getPlatform: call('team:platform'),
  getPulls: call('team:pulls'),
  getCollisions: call('team:collisions'),
  getMachines: call('team:machines'),
  getStoryComments: call('team:comments'),
  teamRefresh: call('team:refresh'),
  getMergeNote: call('team:mergeNote'),
  // The Bitbucket app password only goes in; main answers whether one is set (US-1201 AC-1).
  bitbucket: {
    status: () => ipcRenderer.invoke('credentials:bitbucket', { action: 'status' }),
    save: (username, appPassword) => ipcRenderer.invoke('credentials:bitbucket', { action: 'save', username, appPassword }),
    clear: () => ipcRenderer.invoke('credentials:bitbucket', { action: 'clear' })
  },
  getSetupInfo: call('setup:info'),
  runSetup: call('setup:run'), // runs the setup after the preview (US-0802 FR2.2)
  loadFeatures: call('features:load'),
  getStoryLinks: call('features:storyLinks'),
  // US-0603: a story id, a version and the read hashes cross the bridge, never a path.
  setStoryRelease: call('features:setRelease'),
  // US-0605: a version (and for delete the plan's read hash), never a path.
  createRelease: call('features:createRelease'),
  deleteRelease: call('features:deleteRelease'),
  // US-0607 FR4.1: the planning changes waiting to be pushed, and "Push now"; only the project id crosses the bridge.
  getPlanningStatus: call('features:planningStatus'),
  pushPlanning: call('features:pushPlanning'),
  // US-0608 FR5.3, FR7.2: "Use mine" / "Keep theirs" (an entry id and a fixed word), and the waiting list after each cycle.
  resolvePlanning: call('features:resolvePlanning'),
  onPlanningChanged: subscribe('features:planningChanged'),
  getLifecycleRuleStatus: call('features:ruleStatus'),
  getProjectSettings: call('projectSettings:get'),
  setProjectSettings: call('projectSettings:set'),
  getAidlcConfig: call('config:get'), // read-only AI-DLC configuration for one harness (EPIC-09 US-0901)
  getWorkingAgents: call('agents:working'), // the agents working now in the active intent (US-0901)
  // An intent's agent progress rows, by dir name (US-0507); with no dir name, or in a Spec Kit project, contract C9
  // { source, waiting, feature } (US-1410).
  getAgentProgress: call('agents:progress'),
  // US-0214: a project's activity rows from the hook events (main chats and their agents), and their changes.
  agentActivity: { list: call('agentActivity:list'), onChanged: subscribe('agent:activity') },
  // Changing AI-DLC settings (US-0902): a change is {kind, key, value, where}, never a command.
  previewConfigChange: call('config:preview'),
  applyConfigChange: call('config:apply'),
  previewGuardLock: call('config:guardLockPreview'),
  applyGuardLock: call('config:guardLockApply'),
  // The cost rule pack (US-0212): {on, lines} cross the bridge, never a path; apply writes the last preview.
  costRulesStatus: call('costRules:status'),
  previewCostRules: call('costRules:preview'),
  applyCostRules: call('costRules:apply'),
  // Plans (US-0903): a plan name and the three editable fields cross the bridge, never a path or a command.
  listPlans: call('plans:list'),
  getPlanStages: call('plans:stages'),
  savePlan: call('plans:save'),
  previewPlanEdit: call('plans:previewEdit'),
  applyPlanEdit: call('plans:applyEdit'),
  deletePlan: call('plans:delete'),
  // Models and effort per agent (US-0904).
  getModelOptions: call('models:options'),
  previewModelChange: call('models:preview'),
  applyModelChange: call('models:apply'),
  checkModels: call('models:check'),
  // The model profile switch (US-0210): saved profile names, the answer to a question, and the question itself.
  getSavedModelProfiles: call('modelProfile:saved'),
  answerModelProfile: call('modelProfile:answer'),
  onModelProfileAsk: subscribe('modelProfile:ask'),
  // The app updater (EPIC-04 US-0407): no URL, file or command crosses the bridge.
  checkUpdate: call('update:check'),
  downloadUpdate: call('update:download'),
  installUpdate: call('update:install'),
  relaunchApp: call('update:relaunch'),
  skipUpdate: call('update:skip'),
  revealUpdate: call('update:reveal'),
  onUpdateState: subscribe('update:state'),
  onConfigChanged: subscribe('config:changed'),
  onGitHeadChanged: subscribe('git:headChanged'), // US-0015
  onFeaturesChanged: subscribe('features:changed'),
  speckitFeatures: call('speckit:features'), // US-1402 FR6 (C5): a Spec Kit project's features, read-only
  onSpeckitChanged: subscribe('speckit:changed'), // US-1402 BR6.7: { projectId, paths }
  onProjectChanged: subscribe('project:changed'),
  onProjectDetected: subscribe('project:detected'),
  onWatchError: subscribe('project:watchError'),
  onPtyData: subscribe('pty:data'),
  onPtyExit: subscribe('pty:exit'),
  // Fullscreen and the app menu (EPIC-04 US-0404). menu:command only ever goes from main to the renderer.
  toggleFullscreen: call('window:toggleFullscreen'),
  isFullscreen: call('window:isFullscreen'),
  onFullscreen: subscribe('window:fullscreen'),
  sendMenuState: call('menu:state'),
  onMenuCommand: subscribe('menu:command'),
  openDocsUrl: call('app:openDocsUrl'),
  // Questions AI-DLC waits on (EPIC-05 US-0505). Read-only: nothing here writes or answers.
  listQuestions: call('questions:list'),
  onQuestions: subscribe('questions:changed'),
  setActiveProject: call('questions:activeProject'),
  // Agent dialogs (US-0506 u1, contract C4): an event id and option indexes cross the bridge, never a path or a pty.
  // `stamp` exists only in a timing run (OD1, --thadeus-timing) and is fire-and-forget, so Send never waits on it.
  agentEvents: {
    list: call('agentEvents:list'),
    answer: call('agentEvents:answer'),
    close: call('agentEvents:close'),
    latest: call('agentEvents:latest'), // US-0506 u3
    reopen: call('agentEvents:reopen'), // US-0506 u3
    onChanged: subscribe('agent-events:changed'),
    onFocus: subscribe('agent-events:focus'), // US-0506 u5 D6, SD53: a clicked notification names an event
    ...(process.argv.includes('--thadeus-timing') ? { stamp: (eventId, stamp) => ipcRenderer.send('agent-timing:stamp', eventId, stamp) } : {})
  },
  // The agent dialog hooks in a project (US-0506 u4, C4): a project, a harness, an action and a preview id cross the
  // bridge, never a path or file content (SD32, SD33).
  agentHooks: {
    status: call('agentHooks:status'),
    preview: call('agentHooks:preview'),
    apply: call('agentHooks:apply'),
    cancel: call('agentHooks:cancel'),
    onChanged: subscribe('agent-hooks:changed')
  },
  // The session handoff page (US-0213, US-0026): an event id and a fixed choice cross the bridge; main gives back the
  // fixed lines to type, never anything the renderer named (NFR4).
  handoff: {
    commands: call('handoff:commands'),
    park: call('handoff:park'), // US-0039: main types nothing itself; it answers an open gate or gives the fixed line
    idle: call('handoff:idle'),
    waitReady: call('handoff:waitReady'),
    waiting: call('handoff:waiting'),
    sent: call('handoff:sent')
  }
});
