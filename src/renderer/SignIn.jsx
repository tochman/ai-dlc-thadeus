// Whether a tool is signed in, and the way in (EPIC-08 US-0804): the state line of a row in Settings › Tools (FR2, FR3)
// and the one line in the terminal panel when an agent tab's tool is not signed in (FR4). Main runs the checks and gives
// only a state, an account and a reason; the sign-in itself is the tool's own command, typed without Enter (FR3.4).
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from './Lcars.jsx';
import { t as translate } from '../shared/i18n.js';
import { MANUAL_CHECK, SIGN_IN_IDS, signInCommand } from '../shared/signIn.js';

const COPIED_MS = 1500;

/** One check of one tool. A call that fails is "unknown", never "signed in" (FR1.6). */
async function ask(id) {
  try {
    return await window.bridge.checkSignIn(id);
  } catch (err) {
    console.warn('The sign-in check could not run:', err?.message);
    return { state: 'unknown', account: null, reason: translate('signIn.reason.failed') };
  }
}

/**
 * The last answer per key (a tool, or an agent tab), where an older answer never replaces a newer one (FR2.5).
 * `check(key, id)` asks again and keeps the last answer meanwhile; `forget(key)` drops it and any check under way.
 */
function useAnswers() {
  const [answers, setAnswers] = useState({});
  const [checking, setChecking] = useState({});
  const seq = useRef({});
  const next = (key) => (seq.current[key] = (seq.current[key] ?? 0) + 1);
  const check = useCallback(async (key, id) => {
    if (!window.bridge.checkSignIn) return;
    const n = next(key);
    setChecking((c) => ({ ...c, [key]: true }));
    const answer = await ask(id);
    if (seq.current[key] !== n) return;
    setAnswers((a) => ({ ...a, [key]: answer }));
    setChecking((c) => ({ ...c, [key]: false }));
  }, []);
  const forget = useCallback((key) => {
    next(key);
    setAnswers((a) => ({ ...a, [key]: null }));
    setChecking((c) => ({ ...c, [key]: false }));
  }, []);
  return { answers, checking, check, forget };
}

/**
 * US-0804 FR2: the sign-ins of Settings › Tools. `read(rows)` follows a scan: each found tool is checked, each alone, and
 * a missing one has no state (FR2.4). `rows` are the rows shown and `scanning` is true while they are read again. The
 * window's focus reads the sign-ins again while the tab shows (FR2.5), unless `onFocus` is false: the health check reads
 * them only with its scan (US-0805 FR1.4), and `read` resolves when its checks have.
 */
export function useSignIn(rows, scanning, { onFocus: readsOnFocus = true } = {}) {
  const { answers, checking, check, forget } = useAnswers();
  const read = useCallback(
    (scanned) => Promise.all(scanned.filter(({ id }) => SIGN_IN_IDS.includes(id)).map(({ id, found }) => (found ? check : forget)(id, id))),
    [check, forget]
  );
  const onFocus = useEffectEvent(() => {
    if (!scanning) read(rows.filter((r) => r.found)); // a scan under way checks when it is done
  });
  useEffect(() => {
    if (!readsOnFocus) return undefined;
    const listener = () => onFocus();
    window.addEventListener('focus', listener);
    return () => window.removeEventListener('focus', listener);
  }, [readsOnFocus]);

  /** What a row shows: {state, account, reason, again}, or null for none (FR2.1, FR2.3). */
  function of(row) {
    if (!row || row.found === false) return null;
    if (MANUAL_CHECK[row.id]) return row.found ? { state: 'unknown', reason: translate('signIn.byHand', { command: MANUAL_CHECK[row.id] }) } : null;
    if (!SIGN_IN_IDS.includes(row.id)) return null;
    const busy = scanning || checking[row.id] === true;
    if (answers[row.id]) return { ...answers[row.id], again: busy };
    return row.found && checking[row.id] ? { state: 'checking' } : null;
  }
  return { read, of };
}

/** FR5.2: says each tool's new state politely; a tool being read again says nothing until its answer is there. */
export function SignInStatus({ rows, signIn }) {
  const { t } = useTranslation();
  return (
    <p className="sr-only" aria-live="polite" data-testid="settings-signin-status">
      {rows
        .filter((r) => SIGN_IN_IDS.includes(r.id))
        .map((r) => {
          const shown = signIn.of(r);
          const said = shown && shown.state !== 'checking' && !shown.again;
          return (
            <span key={r.id}>{said ? `${t('signIn.announce', { tool: t(`settings.tools.${r.id}`), state: t(`signIn.state.${shown.state}`) })} ` : ''}</span>
          );
        })}
    </p>
  );
}

/**
 * FR3.3: with no project open, the command with a copy button. The health check shows its commands with it (US-0805
 * FR4.1, FR4.5), with its own `label`, `copyLabel` (the button's name, as its list has several) and test id prefix.
 */
export function CopyCommand({ id, command, label, copyLabel, testId = 'settings-signin' }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch (err) {
      setError(t('signIn.copyFailed', { error: String(err?.message ?? err) }));
    }
  }
  return (
    <div className="tool-signin-command" data-testid={`${testId}-command-${id}`}>
      <span className="muted">{label ?? t('signIn.anyTerminal')}</span>
      <code>{command}</code>
      <Pill tone="quiet" aria-label={copied ? undefined : copyLabel} onClick={copy} data-testid={`${testId}-copy-${id}`}>
        {copied ? t('signIn.copied') : t('signIn.copy')}
      </Pill>
      {error && (
        <span className="refresh-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/**
 * US-0804 FR2.1–FR2.3, FR3: the sign-in line of a tool's row, from the version's column: state, account, reason and
 * "Sign in". With a project open the command is typed into its Shell tab; without one it is shown to copy.
 */
export function SignInLine({ row, shown, terminal }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!shown) return null;
  const { id } = row;
  const { state, account, reason, again } = shown;
  const offered = SIGN_IN_IDS.includes(id) && ['out', 'none', 'unknown'].includes(state);
  const command = signInCommand(id, row.source === 'saved' ? row.path : null);
  return (
    <div className="tool-signin">
      <span className={`tool-chip tool-chip--${state}`} data-kind={state} data-testid={`settings-signin-state-${id}`}>
        {t(`signIn.state.${state}`)}
      </span>
      {account && (
        <span className="tool-signin-account" data-testid={`settings-signin-account-${id}`}>
          {account}
        </span>
      )}
      {reason && (
        <span className="tool-signin-reason" data-testid={`settings-signin-reason-${id}`}>
          {reason}
        </span>
      )}
      {again && (
        <span className="tool-signin-reason" data-testid={`settings-signin-checking-${id}`}>
          {t('signIn.again')}
        </span>
      )}
      {offered && (
        <Pill
          aria-label={t('signIn.signInTo', { tool: t(`settings.tools.${id}`) })}
          aria-expanded={terminal ? undefined : open}
          onClick={() => (terminal ? terminal.type('shell', command, { submit: false }) : setOpen((o) => !o))}
          data-testid={`settings-signin-${id}`}
        >
          {t('signIn.signIn')}
        </Pill>
      )}
      {offered && open && !terminal && <CopyCommand id={id} command={command} />}
    </div>
  );
}

/**
 * US-0804 FR4: the agent tabs' sign-ins. `start(tab, id)` follows a tab's start: it forgets the earlier answer and
 * dismissal and checks that tab's tool, once, in the background (NFR3). `lineFor(tab)` is true while its line shows.
 */
export function useTabSignIn(terminal) {
  const { answers, check, forget } = useAnswers();
  const [tabs, setTabs] = useState({}); // tab -> {id, dismissed, asked}: `asked` after "Sign in" from the line
  const set = (tab, change) => setTabs((all) => ({ ...all, [tab]: { ...all[tab], ...change } }));
  const lineFor = (tab) => answers[tab]?.state === 'out' && !tabs[tab]?.dismissed;

  function start(tab, id) {
    if (!SIGN_IN_IDS.includes(id)) return;
    forget(tab);
    set(tab, { id, dismissed: false, asked: false });
    check(tab, id);
  }

  async function signIn(tab) {
    const { id } = tabs[tab];
    set(tab, { asked: true });
    let saved = null;
    try {
      saved = (await window.bridge.getSettings()).toolPaths?.[id];
    } catch (err) {
      console.warn('The chosen tool path could not be read; the tool name is used:', err?.message);
    }
    await terminal.type('shell', signInCommand(id, saved), { submit: false });
  }

  // FR4.3: each time the Shell tab goes quiet after "Sign in", the tools whose line shows are checked again.
  const shell = terminal.state('shell');
  const before = useRef(shell);
  const onQuiet = useEffectEvent(() => {
    for (const [tab, { id, asked }] of Object.entries(tabs)) if (asked && lineFor(tab)) check(tab, id);
  });
  useEffect(() => {
    if (before.current === 'busy' && shell === 'idle') onQuiet();
    before.current = shell;
  }, [shell]);

  return { start, signIn, dismiss: (tab) => set(tab, { dismissed: true }), lineFor };
}

/** US-0804 FR4.1, FR4.2: the one line in the terminal panel's foot. */
export function SignInNotice({ tool, onSignIn, onOpenTools, onDismiss }) {
  const { t } = useTranslation();
  return (
    <span className="term-signin" data-testid="terminal-panel-signin">
      <span className="term-signin-text">{t('signIn.line', { tool })}</span>
      <Pill aria-label={t('signIn.signInTo', { tool })} onClick={onSignIn} data-testid="terminal-panel-signin-start">
        {t('signIn.signIn')}
      </Pill>
      <Pill tone="quiet" onClick={onOpenTools} data-testid="terminal-panel-signin-tools">
        {t('signIn.openTools')}
      </Pill>
      <Pill tone="quiet" onClick={onDismiss} data-testid="terminal-panel-signin-dismiss">
        {t('signIn.dismiss')}
      </Pill>
    </span>
  );
}
