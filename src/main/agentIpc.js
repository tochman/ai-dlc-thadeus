// US-0506 u1 LC6 (plan K10): the renderer-facing part of IpcRouter for agent dialogs. A factory with no Electron
// import, so the wiring at spawn, exit and shutdown (RD5) and the argument checks (SD4) are tested in plain Node.
// ipc.js only spreads `handlers` into its table, registers `listeners` with ipcMain.on, and calls spawn and shutdown.
import { t } from '../shared/i18n.js';

const MAX_ID = 64;
const isIndexList = (v) => Array.isArray(v) && v.every((n) => Number.isInteger(n) && n >= 0);

/** An object with exactly these keys. */
const onlyKeys = (obj, keys) => typeof obj === 'object' && obj !== null && Object.keys(obj).length === keys.length && keys.every((k) => Object.hasOwn(obj, k));

/**
 * SD4, before the store sees it: an id of at most 64 characters and exactly one C3 Answer shape, a question's
 * { picks, own } or (US-0506 u2 SD10) a permission's { choice } with a non-negative integer.
 */
function checkAnswer(eventId, answer) {
  const idOk = typeof eventId === 'string' && eventId.length > 0 && eventId.length <= MAX_ID;
  const q = answer?.question;
  const p = answer?.permission;
  const question =
    onlyKeys(answer, ['question']) &&
    onlyKeys(q, ['picks', 'own']) &&
    Array.isArray(q.picks) &&
    q.picks.every(isIndexList) &&
    Array.isArray(q.own) &&
    q.own.every((o) => o === null || typeof o === 'string');
  const permission = onlyKeys(answer, ['permission']) && onlyKeys(p, ['choice']) && Number.isInteger(p.choice) && p.choice >= 0;
  if (!idOk || !(question || permission)) throw new Error(t('agentDialog.errors.doesNotFit'));
}

/** US-0506 u3 SD9: a reply answer is { reply: { text } }, text a string of at most 262 144 UTF-16 units. */
const MAX_REPLY_UNITS = 262_144;
function checkReply(eventId, answer) {
  checkId(eventId, 'agentDialog.errors.doesNotFit');
  const text = answer?.reply?.text;
  if (typeof text !== 'string' || text.length > MAX_REPLY_UNITS) throw new Error(t('agentDialog.errors.doesNotFit'));
}

function checkId(id, key = 'agentDialog.errors.unknownEvent') {
  if (typeof id !== 'string' || id.length === 0 || id.length > MAX_ID) throw new Error(t(key));
}

/**
 * @param {{channel, store, timing: {on: boolean, stampFromRenderer: Function}, hooksCurrent: (root, harness) => Promise<boolean>|boolean,
 *   senders: () => Iterable<{isDestroyed: () => boolean, send: Function}>}} deps
 */
export function createAgentIpc({ channel, store, timing, hooksCurrent, senders }) {
  const live = new Set(); // sessionIds with a running pty

  const push = (payload) => {
    for (const s of senders()) if (!s.isDestroyed()) s.send('agent-events:changed', payload);
  };
  store.onChanged(push);

  /** RD5: the store first (every event ends, nothing is written), then the channel folder. */
  async function end(sessionId) {
    live.delete(sessionId);
    store.endSession(sessionId);
    await channel.closeSession(sessionId);
  }

  return {
    /**
     * pty:spawn for one tab. An agent tab whose hooks are current (BR2.7; until u4 the THADEUS_AGENT_HOOKS switch, K4)
     * gets a channel session and its three variables; every other tab spawns exactly as before.
     * @param {(extra: {env?: object, onExit?: Function}) => Promise<string>} spawnFn spawnSession with the tab's own arguments
     */
    async spawn({ projectId, root, kind, harness }, spawnFn) {
      if (kind !== 'agent' || !(await hooksCurrent(root, harness))) return spawnFn({});
      const tabId = `agent:${harness}`;
      const { sessionId, env, waitSeconds } = await channel.openSession({ projectId, tabId, harness });
      let ptyId;
      try {
        ptyId = await spawnFn({ env, onExit: () => end(sessionId) });
      } catch (err) {
        await channel.closeSession(sessionId);
        throw err;
      }
      channel.bindPty({ sessionId, ptyId });
      live.add(sessionId);
      store.startSession({ sessionId, projectId, tabId, harness, waitSeconds });
      return ptyId;
    },
    handlers: {
      'agentEvents:list': async (_event, projectId) => {
        if (typeof projectId !== 'string') throw new Error(t('errors.invalidProjectId'));
        return store.list(projectId);
      },
      'agentEvents:answer': async (_event, eventId, answer) => {
        (answer?.reply ? checkReply : checkAnswer)(eventId, answer);
        return store.answer(eventId, answer);
      },
      'agentEvents:close': async (_event, eventId) => {
        checkId(eventId);
        return store.close(eventId);
      },
      // US-0506 u3 C4
      'agentEvents:latest': async (_event, projectId) => {
        if (typeof projectId !== 'string') throw new Error(t('errors.invalidProjectId'));
        return store.latest(projectId);
      },
      'agentEvents:reopen': async (_event, eventId) => {
        checkId(eventId);
        return store.reopen(eventId);
      }
    },
    /** US-0506 u3 C2: called by pty:write before writeSession; the person's input moves the tab's reply on (BR6.6). */
    terminalInput: (ptyId, data) => store.terminalInput(ptyId, data),
    // OD1: registered only with THADEUS_TIMING=1; fire and forget, so Send never waits on it.
    listeners: timing.on ? { 'agent-timing:stamp': (_event, eventId, stamp) => timing.stampFromRenderer(eventId, stamp, store.harnessOf(eventId)) } : {},
    /** Pushes a project's list, e.g. after its audit questions changed (they are listed when no hook session runs). */
    publish: (projectId) => push({ projectId, events: store.list(projectId) }),
    /** App quit: every session is closed before the ptys are killed (RD5). */
    async shutdown() {
      await Promise.all([...live].map(end));
      store.dispose?.();
      await channel.dispose?.();
    }
  };
}
