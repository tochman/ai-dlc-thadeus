// Shared terminal control for one project (FR1.1–FR1.4): other views type into the agent or shell tab
// through useTerminal() instead of reaching into TerminalPanel.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { READY_TIMEOUT_MS, runSequence, waitFor, withEnter } from './terminalControl.js';
import { t } from '../shared/i18n.js';

const TerminalCtx = createContext(null);
const NO_AGENT = { harness: null, problem: null };

export function TerminalProvider({ children }) {
  const sessions = useRef({}); // tab -> { write, spawn, restart, focus, activity }
  const [view, setView] = useState({ open: true, active: 'agent' });
  const [states, setStates] = useState({ agent: 'exited', shell: 'exited' });
  const [error, setError] = useState(null);
  // A tab the app typed into without Enter, until the person types there or the session ends (EPIC-04 FR3.6).
  const [pending, setPending] = useState({ agent: false, shell: false });
  // The agent tab's harness (a table entry, null while detection runs) and why it cannot start, if so (US-0801).
  const [agent, setAgentState] = useState(NO_AGENT);
  const agentRef = useRef(agent);
  agentRef.current = agent;
  const setAgent = useCallback(
    ({ harness = null, problem = null }) =>
      setAgentState((a) => (a.harness === harness && a.problem === problem ? a : { harness, problem })),
    []
  );
  const tabName = (tab) => (tab === 'agent' ? (agentRef.current.harness?.name ?? t('terminal.agent')) : t(`terminal.tabName.${tab}`));
  const markPending = useCallback((tab, on) => setPending((p) => (p[tab] === on ? p : { ...p, [tab]: on })), []);

  const register = useCallback((tab, session) => {
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
  }, [markPending]);

  // No agent session while detection runs or the harness cannot start: say why rather than "no such tab" (FR5.1).
  const noTabText = (tab) =>
    tab === 'agent' ? (agentRef.current.problem ?? t('terminal.checking')) : t('terminal.noTab', { tab });

  const show = useCallback((tab) => {
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
    async (tab, fn) => {
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

  const value = useMemo(
    () => ({
      view,
      setView,
      error,
      harness: agent.harness,
      harnessProblem: agent.problem,
      setAgent,
      register,
      show,
      state: (tab) => states[tab] ?? 'exited',
      exitCode: (tab) => sessions.current[tab]?.activity.exitCode ?? null,
      /** True while text the app typed into `tab` waits for the person's Enter. */
      pending: (tab) => pending[tab] === true,
      /** The person typed in `tab` (any key, Enter included): nothing waits on the app's text any more. */
      input: (tab) => markPending(tab, false),
      type: async (tab, text, { submit = false } = {}) => {
        const ok = await run(tab, (s) => s.write(withEnter(text, submit)));
        if (ok) markPending(tab, !submit && text !== '');
        return ok;
      },
      sequence: async (tab, steps) => {
        const ok = await run(tab, (s) => runSequence(s, steps));
        const last = steps.at(-1);
        if (ok && last) markPending(tab, !last.submit && last.text !== '');
        return ok;
      },
      restart: async (tab) => {
        setError(null);
        markPending(tab, false);
        if (!(await sessions.current[tab]?.restart())) setError(t('terminal.cannotRestart', { name: tabName(tab) }));
      }
    }),
    [view, error, agent, setAgent, register, show, states, run, pending, markPending]
  );

  return <TerminalCtx.Provider value={value}>{children}</TerminalCtx.Provider>;
}

/** null outside a TerminalProvider, so views that can type into the terminal render without it. */
export const useTerminal = () => useContext(TerminalCtx);
