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
  ptySpawn: call('pty:spawn'),
  ptyWrite: call('pty:write'),
  ptyResize: call('pty:resize'),
  ptyKill: call('pty:kill'),
  onProjectChanged: subscribe('project:changed'),
  onWatchError: subscribe('project:watchError'),
  onPtyData: subscribe('pty:data'),
  onPtyExit: subscribe('pty:exit')
});
