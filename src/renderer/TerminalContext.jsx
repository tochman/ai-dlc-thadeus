// Shared terminal control for one project (FR1.1–FR1.4): other views type into the claude or shell tab
// through useTerminal() instead of reaching into TerminalPanel.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { READY_TIMEOUT_MS, runSequence, waitFor, withEnter } from './terminalControl.js';

const TerminalCtx = createContext(null);
const TAB_NAME = { claude: 'Claude', shell: 'Skalet' };

export function TerminalProvider({ children }) {
  const sessions = useRef({}); // tab -> { write, spawn, restart, focus, activity }
  const [view, setView] = useState({ open: true, active: 'claude' });
  const [states, setStates] = useState({ claude: 'exited', shell: 'exited' });
  const [error, setError] = useState(null);

  const register = useCallback((tab, session) => {
    sessions.current[tab] = session;
    setStates((s) => ({ ...s, [tab]: session.activity.state }));
    const off = session.activity.subscribe((next) => setStates((s) => ({ ...s, [tab]: next })));
    return () => {
      off();
      if (sessions.current[tab] === session) delete sessions.current[tab];
    };
  }, []);

  const show = useCallback((tab) => {
    setView({ open: true, active: tab });
    sessions.current[tab]?.focus();
  }, []);

  /** Starts an exited tab and waits for its first idle (FR1.3). */
  const ready = useCallback(async (tab) => {
    const s = sessions.current[tab];
    if (!s) throw new Error(`Terminalfliken ${tab} finns inte.`);
    if (s.activity.state === 'exited' && !(await s.spawn())) throw new Error(`${TAB_NAME[tab]} kunde inte startas.`);
    try {
      await waitFor(s.activity, 'idle', READY_TIMEOUT_MS);
    } catch {
      throw new Error(`${TAB_NAME[tab]} svarade inte inom ${READY_TIMEOUT_MS / 1000} s`);
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
        if (!s) throw new Error(`Terminalfliken ${tab} finns inte.`);
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
      register,
      show,
      state: (tab) => states[tab] ?? 'exited',
      exitCode: (tab) => sessions.current[tab]?.activity.exitCode ?? null,
      type: (tab, text, { submit = false } = {}) => run(tab, (s) => s.write(withEnter(text, submit))),
      sequence: (tab, steps) => run(tab, (s) => runSequence(s, steps)),
      restart: async (tab) => {
        setError(null);
        if (!(await sessions.current[tab]?.restart())) setError(`${TAB_NAME[tab]} kunde inte startas om.`);
      }
    }),
    [view, error, register, show, states, run]
  );

  return <TerminalCtx.Provider value={value}>{children}</TerminalCtx.Provider>;
}

/** null outside a TerminalProvider, so views that can type into the terminal render without it. */
export const useTerminal = () => useContext(TerminalCtx);
