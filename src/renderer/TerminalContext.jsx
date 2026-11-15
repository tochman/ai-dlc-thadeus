// Shared terminal control for one project (FR1.1–FR1.4): other views type into the agent or shell tab
// through useTerminal() instead of reaching into TerminalPanel.
//
// Agent tabs (EPIC-08 US-0803): one per open harness, keyed `agent:<id>`, beside `shell`. The name 'agent'
// stays an alias for the last agent tab used, so Fortsätt, the quick commands, "Answer in …" and the setup
// offers go there, and every caller that names 'agent' keeps working.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { READY_TIMEOUT_MS, runSequence, waitFor, withEnter } from './terminalControl.js';
import { t } from '../shared/i18n.js';
import { waitForAnswer } from './picker.js';

const TerminalCtx = createContext(null);
const NO_AGENT = { harness: null, problem: null, extras: [] };
const ALIAS = 'agent';

/** The tab key of one harness's agent tab. */
export const agentTab = (harness) => `agent:${harness.id}`;
export const isAgentTab = (tab) => tab === ALIAS || String(tab).startsWith('agent:');

export function TerminalProvider({ children, askingIntents = [] }) {
  const sessions = useRef({}); // tab -> { write, spawn, restart, focus, activity }
  const [view, setView] = useState({ open: true, active: ALIAS });
  const [states, setStates] = useState({ shell: 'exited' });
  const [error, setError] = useState(null);
  // A tab the app typed into without Enter, until the person types there or the session ends (EPIC-04 FR3.6).
  const [pending, setPending] = useState({});
  // The first agent tab's harness (a table entry, null while detection runs), why it cannot start, if so
  // (US-0801), and the harnesses opened beside it (US-0803).
  const [agent, setAgentState] = useState(NO_AGENT);
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const setAgent = useCallback(
    ({ harness = null, problem = null, extras = [] }) =>
      setAgentState((a) =>
        a.harness === harness && a.problem === problem && a.extras.map((h) => h.id).join() === extras.map((h) => h.id).join() ? a : { harness, problem, extras }
      ),
    []
  );
  // The agent tabs in order; before detection (or without a harness) one placeholder tab under the alias.
  const agentTabs = useMemo(() => (agent.harness ? [agent.harness, ...agent.extras].map(agentTab) : [ALIAS]), [agent]);
  const harnessOf = (tab) => [agentRef.current.harness, ...agentRef.current.extras].find((h) => h && agentTab(h) === tab) ?? null;
  const [lastAgent, setLastAgent] = useState(null);
  const lastRef = useRef(ALIAS);
  lastRef.current = agentTabs.includes(lastAgent) ? lastAgent : agentTabs[0];
  /** 'agent' -> the last agent tab used; any other tab as it is. */
  const resolve = (tab) => (tab === ALIAS ? lastRef.current : tab);
  const noteAgent = (tab) => {
    if (isAgentTab(tab) && tab !== ALIAS) setLastAgent(tab);
  };
  const tabName = (tab) =>
    isAgentTab(tab) ? (harnessOf(resolve(tab))?.name ?? agentRef.current.harness?.name ?? t('terminal.agent')) : t(`terminal.tabName.${tab}`);
  const markPending = useCallback((tab, on) => setPending((p) => (!!p[tab] === on ? p : { ...p, [tab]: on })), []);

  const register = useCallback(
    (tab, session) => {
      sessions.current[tab] = session;
      setStates((s) => ({ ...s, [tab]: session.activity.state }));
      const off = session.activity.subscribe((next) => {
        setStates((s) => ({ ...s, [tab]: next }));
        if (next === 'exited') markPending(tab, false);
      });
      return () => {
        off();
        if (sessions.current[tab] !== session) return;
        delete sessions.current[tab];
        setStates((s) => ({ ...s, [tab]: 'exited' })); // e.g. the agent tab after a harness switch
      };
    },
    [markPending]
  );

  // No agent session while detection runs or the harness cannot start: say why rather than "no such tab" (FR5.1).
  const noTabText = (tab) => (isAgentTab(tab) ? (agentRef.current.problem ?? t('terminal.checking')) : t('terminal.noTab', { tab }));

  const show = useCallback((name) => {
    const tab = resolve(name);
    noteAgent(tab);
    setView({ open: true, active: tab });
    sessions.current[tab]?.focus();
  }, []);

  /** Starts an exited tab and waits for its first idle (FR1.3). */
  const ready = useCallback(async (tab) => {
    const s = sessions.current[tab];
    if (!s) throw new Error(noTabText(tab));
    if (s.activity.state === 'exited' && !(await s.spawn())) throw new Error(t('terminal.cannotStart', { name: tabName(tab) }));
    try {
      await waitFor(s.activity, 'idle', READY_TIMEOUT_MS);
    } catch {
      throw new Error(t('terminal.noResponse', { name: tabName(tab), seconds: READY_TIMEOUT_MS / 1000 }));
    }
    return s;
  }, []);

  /** Shows the tab, makes sure it runs, then does `fn`. Errors are shown in the terminal panel. */
  const run = useCallback(
    async (name, fn) => {
      const tab = resolve(name);
      setError(null);
      show(tab);
      try {
        const s = sessions.current[tab]?.activity.state === 'exited' ? await ready(tab) : sessions.current[tab];
        if (!s) throw new Error(noTabText(tab));
        await fn(s);
        s.focus();
        return true;
      } catch (err) {
        setError(err.message);
        return false;
      }
    },
    [ready, show]
  );

  const stateOf = (tab) => states[resolve(tab)] ?? 'exited';
  const lastHarness = harnessOf(lastRef.current) ?? agent.harness;

  const value = useMemo(
    () => ({
      view: { ...view, active: resolve(view.active) },
      setView,
      error,
      /** The last agent tab's harness, which 'agent' goes to; buttons name it ("Fortsätt i opencode"). */
      harness: lastHarness,
      harnessProblem: agent.problem,
      setAgent,
      agentTabs,
      harnessOf,
      lastAgent: lastRef.current,
      register,
      show,
      state: stateOf,
      /** True when any agent tab is "Arbetar" (US-0803: busy checks count every agent tab). */
      anyBusy: () => agentTabs.some((tab) => states[tab] === 'busy'),
      /**
       * True while an agent waits on the person in this project: a question or gate asked since the app started
       * (US-0505 `early: false`), with an agent tab still running (EPIC-00 US-0005).
       */
      asking: () => askingIntents.length > 0 && agentTabs.some((tab) => (states[tab] ?? 'exited') !== 'exited'),
      /** True while any agent tab's session is alive (not exited), quiet or not (EPIC-00 US-0007). */
      running: () => agentTabs.some((tab) => (states[tab] ?? 'exited') !== 'exited'),
      /** How many agent tabs are "Arbetar" now. */
      busyAgents: () => agentTabs.filter((tab) => states[tab] === 'busy').length,
      exitCode: (tab) => sessions.current[resolve(tab)]?.activity.exitCode ?? null,
      /** True while text the app typed into `tab` waits for the person's Enter. */
      pending: (tab) => pending[resolve(tab)] === true,
      /** The person typed in `tab` (any key, Enter included): nothing waits on the app's text any more. */
      input: (tab) => {
        noteAgent(tab);
        markPending(resolve(tab), false);
      },
      type: async (tab, text, { submit = false } = {}) => {
        const key = resolve(tab);
        const ok = await run(key, (s) => s.write(withEnter(text, submit)));
        if (ok) markPending(key, !submit && text !== '');
        return ok;
      },
      /**
       * The question popup's answer, without showing the tab (US-0505). An option goes only to the agent tab whose
       * picker shows that question, as the picker's own key (EPIC-00 US-0004); an own answer with no picker on screen
       * is typed with Enter into the last agent tab. It waits up to `waitMs` for the picker to be drawn (US-0006).
       * Rejects, with the reason, when nothing can be sent.
       */
      answer: async (q, answer, { waitMs } = {}) => {
        const read = () => agentTabs.filter((tab) => sessions.current[tab]?.screen).map((tab) => ({ tab, lines: sessions.current[tab].screen() }));
        const { found, screens } = await waitForAnswer(read, q, answer, { waitMs });
        // Development only (EPIC-00 US-0006): a refused send carries what the picker reader saw, for QuestionPopup to log.
        const fail = (message) => {
          const err = new Error(message);
          if (import.meta.env.DEV) {
            err.debug = {
              found,
              screens: screens.map(({ tab, lines }) => ({ tab, view: sessions.current[tab]?.view?.(), lines: lines.slice(-30) }))
            };
          }
          return err;
        };
        if (found.error === 'noPicker' && answer.own !== undefined) {
          const s = sessions.current[lastRef.current];
          if (!s) throw fail(noTabText(ALIAS));
          return s.write(withEnter(answer.own, true));
        }
        if (found.error) throw fail(t(`app.question.${found.error}`, { harness: harnessOf(lastRef.current)?.name ?? t('terminal.agent') }));
        const s = sessions.current[found.tab];
        for (const key of found.keys) s.write(key);
      },
      sequence: async (tab, steps) => {
        const key = resolve(tab);
        const ok = await run(key, (s) => runSequence(s, steps));
        const last = steps.at(-1);
        if (ok && last) markPending(key, !last.submit && last.text !== '');
        return ok;
      },
      restart: async (tab) => {
        const key = resolve(tab);
        setError(null);
        markPending(key, false);
        if (!(await sessions.current[key]?.restart())) setError(t('terminal.cannotRestart', { name: tabName(key) }));
      }
    }),
    [view, error, agent, agentTabs, lastAgent, setAgent, register, show, states, run, pending, markPending, askingIntents.join('\n')]
  );

  return <TerminalCtx.Provider value={value}>{children}</TerminalCtx.Provider>;
}

/** null outside a TerminalProvider, so views that can type into the terminal render without it. */
export const useTerminal = () => useContext(TerminalCtx);
