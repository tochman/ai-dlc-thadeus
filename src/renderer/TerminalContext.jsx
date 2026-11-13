// Shared terminal control for one project (FR1.1–FR1.4): other views type into the claude or shell tab
// through useTerminal() instead of reaching into TerminalPanel.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { READY_TIMEOUT_MS, runSequence, waitFor, withEnter } from './terminalControl.js';
import { t } from '../shared/i18n.js';

const TerminalCtx = createContext(null);
const tabName = (tab) => t(`terminal.tabName.${tab}`);

export function TerminalProvider({ children }) {
  const sessions = useRef({}); // tab -> { write, spawn, restart, focus, activity }
  const [view, setView] = useState({ open: true, active: 'claude' });
  const [states, setStates] = useState({ claude: 'exited', shell: 'exited' });
  const [error, setError] = useState(null);
  // A tab the app typed into without Enter, until the person types there or the session ends (EPIC-04 FR3.6).
  const [pending, setPending] = useState({ claude: false, shell: false });
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
      if (sessions.current[tab] === session) delete sessions.current[tab];
    };
  }, [markPending]);

  const show = useCallback((tab) => {
    setView({ open: true, active: tab });
    sessions.current[tab]?.focus();
  }, []);

  /** Starts an exited tab and waits for its first idle (FR1.3). */
  const ready = useCallback(async (tab) => {
    const s = sessions.current[tab];
    if (!s) throw new Error(t('terminal.noTab', { tab }));
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
        if (!s) throw new Error(t('terminal.noTab', { tab }));
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
    [view, error, register, show, states, run, pending, markPending]
  );

  return <TerminalCtx.Provider value={value}>{children}</TerminalCtx.Provider>;
}

/** null outside a TerminalProvider, so views that can type into the terminal render without it. */
export const useTerminal = () => useContext(TerminalCtx);
