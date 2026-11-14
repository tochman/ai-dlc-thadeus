// Narrow, named API for the sandboxed renderer. No generic invoke/send is exposed.
import { contextBridge, ipcRenderer, webUtils } from 'electron';

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

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
  getCost: call('project:cost'),
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
  pickDefaultFolder: call('settings:pickDefaultFolder'),
  clearDefaultFolder: call('settings:clearDefaultFolder'),
  getAppInfo: call('app:info'),
  openExternal: call('app:openExternal'), // a fixed key, never a URL (US-0405 FR5.1)
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
  getSetupInfo: call('setup:info'),
  runSetup: call('setup:run'), // runs the setup after the preview (US-0802 FR2.2)
  loadFeatures: call('features:load'),
  getStoryLinks: call('features:storyLinks'),
  getProjectSettings: call('projectSettings:get'),
  setProjectSettings: call('projectSettings:set'),
  getAidlcConfig: call('config:get'), // read-only AI-DLC configuration for one harness (EPIC-09 US-0901)
  getWorkingAgents: call('agents:working'), // the agents working now in the active intent (US-0901)
  // Changing AI-DLC settings (US-0902): a change is {kind, key, value, where}, never a command.
  previewConfigChange: call('config:preview'),
  applyConfigChange: call('config:apply'),
  previewGuardLock: call('config:guardLockPreview'),
  applyGuardLock: call('config:guardLockApply'),
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
  // The app updater (EPIC-04 US-0407): no URL, file or command crosses the bridge.
  checkUpdate: call('update:check'),
  downloadUpdate: call('update:download'),
  installUpdate: call('update:install'),
  relaunchApp: call('update:relaunch'),
  skipUpdate: call('update:skip'),
  revealUpdate: call('update:reveal'),
  onUpdateState: subscribe('update:state'),
  onConfigChanged: subscribe('config:changed'),
  onFeaturesChanged: subscribe('features:changed'),
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
  onQuestionFocus: subscribe('questions:focus'),
  setActiveProject: call('questions:activeProject')
});
