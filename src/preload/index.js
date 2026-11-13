// Narrow, named API for the sandboxed renderer. No generic invoke/send is exposed.
import { contextBridge, ipcRenderer } from 'electron';

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
  readFile: call('project:file'),
  revealInFinder: call('shell:reveal'),
  openInEditor: call('shell:openInEditor'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
  getLanguage: call('i18n:language'), // the language in effect, auto resolved (EPIC-07 FR4.4)
  ptySpawn: call('pty:spawn'),
  ptyWrite: call('pty:write'),
  ptyResize: call('pty:resize'),
  ptyKill: call('pty:kill'),
  getGitStatus: call('git:status'),
  gitFetch: call('git:fetch'),
  getRemoteChanges: call('git:remoteChanges'),
  showRemoteFile: call('git:showRemote'),
  getConflicts: call('git:conflicts'),
  getSetupInfo: call('setup:info'),
  buildSetupCommand: call('setup:command'),
  loadFeatures: call('features:load'),
  getStoryLinks: call('features:storyLinks'),
  getProjectSettings: call('projectSettings:get'),
  setProjectSettings: call('projectSettings:set'),
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
