// The health check (EPIC-08 US-0805): whether the tools the app needs are there and signed in, on the "No project open"
// screen and as one line above a project, with the commands to copy. The scan is the tools' own (US-0410) and the
// sign-in checks (US-0804); ready or not is decided in shared/health.js. The app only shows a command (FR4.4).
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pill } from './Lcars.jsx';
import { CopyCommand, useSignIn } from './SignIn.jsx';
import { ToolRow, toolState } from './ToolRows.jsx';
import { healthOf } from '../shared/health.js';
import { HEALTH_IDS, installFor } from '../shared/installCommands.js';
import { signInCommand } from '../shared/signIn.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
/** A tool no scan has answered for yet. */
const emptyRow = (id) => ({ id, path: null, source: 'auto', found: null, version: null });

/** FR3.3: what is wrong, as whole sentences: missing, not answering, not signed in. With neither of a pair, "A or B". */
function problemTexts(tools, t) {
  const names = { missing: [], noAnswer: [], out: [] };
  const problems = tools.filter((x) => x.problem);
  const pair = problems.filter((x) => x.need === 'either');
  for (const { id, state, need } of problems) if (need !== 'either') names[state].push(t(`settings.tools.${id}`));
  if (pair.length) {
    const [a, b] = pair.map(({ id }) => t(`settings.tools.${id}`));
    names[pair.some((x) => x.state === 'missing') ? 'missing' : 'noAnswer'].push(t('health.either', { a, b }));
  }
  const kinds = Object.keys(names).filter((kind) => names[kind].length);
  return kinds.map((kind) => t(`health.${kind}`, { tools: names[kind].join(', ') }));
}

/** What the check says as a whole: the problems, ready, being checked, or that it could not check. */
function statusTexts(health, t) {
  if (health.status === 'problems') return problemTexts(health.tools, t);
  if (health.status === 'ready') return [t('health.ready')];
  return [health.busy ? t('health.checking') : t('health.notChecked')];
}

/**
 * US-0805 FR1.4: the scan, one per app. It runs once when `ready`, on `check` ("Check again") and on `refresh` (a tool's
 * path was changed), and never two at a time (NFR2): `check` during a scan does nothing, `refresh` runs one more after
 * it. The result is for `framework`, the active project's (FR2.1); `said` is what to announce, after `check` only.
 */
export function useHealth({ ready, framework }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [scanning, setScanning] = useState(true); // the tools are being read; the first scan is always to come
  const [busy, setBusy] = useState(true); // a scan is under way, its sign-in checks included
  const [error, setError] = useState(null);
  const [said, setSaid] = useState('');
  const [dismissed, setDismissed] = useState([]); // the ids the line showed when it was dismissed, in memory only (FR3.3)
  const running = useRef(false);
  const queued = useRef(false);
  const asked = useRef(false);
  const signIn = useSignIn(rows, scanning, { onFocus: false });
  const { read } = signIn;

  const scan = useCallback(async () => {
    running.current = true;
    setBusy(true);
    setSaid('');
    do {
      queued.current = false;
      setScanning(true);
      let next = [];
      try {
        next = await window.bridge.getTools(); // reads the login shell's PATH again (FR3.4)
        setRows(next);
        setError(null);
      } catch (err) {
        console.warn('The tools could not be read:', errorText(err));
        setError(errorText(err)); // the last rows stay (NFR2)
      }
      setScanning(false);
      await read(next); // each check alone; a failed one is "unknown" with its reason
    } while (queued.current);
    running.current = false;
    setBusy(false);
  }, [read]);

  useEffect(() => {
    if (ready && !running.current) scan();
  }, [ready, scan]);

  function check() {
    if (running.current) return;
    asked.current = true;
    scan();
  }
  const refresh = useCallback(() => {
    if (running.current) queued.current = true;
    else scan();
  }, [scan]);

  const shown = Object.fromEntries(rows.map((r) => [r.id, signIn.of(r)]));
  const signIns = Object.fromEntries(rows.map((r) => [r.id, shown[r.id]?.state]));
  const checking = scanning ? HEALTH_IDS : HEALTH_IDS.filter((id) => shown[id]?.again || shown[id]?.state === 'checking');
  const { status, tools } = healthOf({ rows, signIns, framework, checking });
  // The last answers amount to ready, also while they are read again: the list folds (FR3.2).
  const foldable = healthOf({ rows, signIns, framework, checking: [] }).status === 'ready';

  const announce = useEffectEvent(() => setSaid(error ? '' : statusTexts({ status, tools, busy }, t).join(' '))); // an error is its own alert
  useEffect(() => {
    if (busy || !asked.current) return;
    asked.current = false;
    announce();
  }, [busy]);

  // FR3.3: a dismissed tool that works again can bring the line back; being checked or signed out is not working.
  const working = tools.filter((x) => x.state === 'ok').map((x) => x.id);
  if (dismissed.some((id) => working.includes(id))) setDismissed(dismissed.filter((id) => !working.includes(id)));
  const problems = tools.filter((x) => x.problem).map((x) => x.id);

  return {
    status,
    tools,
    rows,
    checking,
    busy,
    error,
    foldable,
    said,
    signInOf: (id) => shown[id] ?? null,
    check,
    refresh,
    lineShown: problems.some((id) => !dismissed.includes(id)),
    dismiss: () => setDismissed([...new Set([...dismissed, ...problems])])
  };
}

/** FR5.2: the result of "Check again", said politely. Always mounted, as the line goes when everything is ready. */
export function HealthStatus({ health }) {
  return (
    <p className="sr-only" aria-live="polite" data-testid="health-status">
      {health.said}
    </p>
  );
}

/** FR3.4: "Check again". Never `disabled`, so it keeps the focus; a press while it checks does nothing. */
function CheckAgain({ health }) {
  const { t } = useTranslation();
  return (
    <Pill tone="quiet" aria-disabled={health.busy || undefined} onClick={health.check} data-testid="health-check-again">
      {t('health.checkAgain')}
    </Pill>
  );
}

/** FR4.1–FR4.3: the install command with Copy, what it needs first, and the tool's own page, opened by its key (NFR1). */
function Install({ id, tool }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const { command, needs } = installFor(id, window.bridge.platform);
  async function openPage() {
    setError(null);
    try {
      await window.bridge.openExternal(`install-${id}`);
    } catch (err) {
      setError(t('app.browserFailed', { error: errorText(err) }));
    }
  }
  return (
    <div className="health-command">
      <CopyCommand
        id={id}
        command={command}
        label={needs ? t('health.installNeeds', { needs }) : t('health.install')}
        copyLabel={t('health.copyInstall', { tool })}
        testId="health-install"
      />
      <Pill tone="quiet" aria-label={t('health.pageFor', { tool })} onClick={openPage} data-testid={`health-page-${id}`}>
        {t('health.page')}
      </Pill>
      {error && (
        <span className="refresh-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

/** FR1.2, FR4.5: the sign-in state with its reason, and the sign-in command when there is something to sign in to. */
function SignInState({ row, tool, shown }) {
  const { t } = useTranslation();
  return (
    <div className="health-signin">
      <span className={`tool-chip tool-chip--${shown.state}`} data-kind={shown.state} data-testid={`health-signin-state-${row.id}`}>
        {t(`signIn.state.${shown.state}`)}
      </span>
      {shown.reason && <span className="tool-signin-reason">{shown.reason}</span>}
      {['out', 'none'].includes(shown.state) && (
        <CopyCommand
          id={row.id}
          command={signInCommand(row.id, row.source === 'saved' ? row.path : null)}
          label={t('health.signIn')}
          copyLabel={t('health.copySignIn', { tool })}
          testId="health-signin"
        />
      )}
    </div>
  );
}

/** One tool (FR2.3): its state, whether it is needed and what for, and what to do about it. */
function HealthTool({ health, tool: { id, need, state, problem } }) {
  const { t } = useTranslation();
  const row = health.rows.find((r) => r.id === id) ?? emptyRow(id);
  const name = t(`settings.tools.${id}`);
  const kind = toolState(row);
  const shown = health.signInOf(id);
  let chip = t(`settings.tools.chip.${kind}`);
  if (kind === 'checking' && !health.busy) chip = t('health.chipNotChecked');
  if (state === 'noAnswer') chip = t('health.chipNoAnswer');
  return (
    <ToolRow
      testId={`health-tool-${id}`}
      state={kind === 'missing' && !problem ? 'quiet' : kind} // coral only for what counts
      name={name}
      version={row.found ? row.version : null}
      path={row.path}
      empty={row.found === false ? t('settings.tools.notOnPath') : ''}
      chip={chip}
      chipTestId={`health-tool-chip-${id}`}
    >
      <p className="muted tool-row-note health-need">
        <span data-testid={`health-need-${id}`}>
          <b>{t(`health.need.${need}`)}</b> {t(`settings.tools.neededFor.${id}`)}
        </span>
        {row.found !== null && health.checking.includes(id) && <span data-testid={`health-checking-${id}`}>{t('signIn.again')}</span>}
      </p>
      {row.error && <p className="muted tool-row-note">{row.error}</p>}
      {shown && <SignInState row={row} tool={name} shown={shown} />}
      {state === 'missing' && <Install id={id} tool={name} />}
    </ToolRow>
  );
}

/** The list both views show, problems first (FR3.2, FR3.3). */
function HealthList({ health }) {
  const { t } = useTranslation();
  return (
    <div className="health-list" data-testid="health-list">
      {health.rows.some((r) => r.pathFallback) && <p className="muted tool-row-note">{t('settings.tools.pathFallback')}</p>}
      {health.tools.map((tool) => (
        <HealthTool key={tool.id} health={health} tool={tool} />
      ))}
    </div>
  );
}

/** NFR2: why the last scan failed. */
function ScanError({ health }) {
  const { t } = useTranslation();
  if (!health.error) return null;
  return (
    <p className="refresh-error health-error" role="alert">
      {t('settings.tools.loadFailed', { error: health.error })}
    </p>
  );
}

/** The texts of the whole, each a sentence of its own. */
function StatusText({ health }) {
  const { t } = useTranslation();
  return statusTexts(health, t).map((text) => <span key={text}>{text}</span>);
}

/** US-0805 FR3.1, FR3.2: under "Open project" with no project open: the open list, or one line that opens when ready. */
export function HealthPanel({ health }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const shown = !health.foldable || open;
  return (
    <section className="health-panel" aria-label={t('health.title')} data-testid="health-panel">
      <div className="health-bar">
        {health.foldable ? (
          <button type="button" className="health-fold" aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="health-panel-fold">
            <StatusText health={health} />
          </button>
        ) : (
          <p className="health-title" data-testid="health-panel-title">
            <StatusText health={health} />
          </p>
        )}
        <CheckAgain health={health} />
      </div>
      <ScanError health={health} />
      {shown && <HealthList health={health} />}
    </section>
  );
}

/** US-0805 FR3.3: the line above a project that is not ready; "Show" opens the list in place. */
export function HealthLine({ health }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!health.lineShown) return null;
  return (
    <section className="health-line" aria-label={t('health.title')} data-testid="health-line">
      <div className="health-bar">
        <p className="health-title" data-testid="health-line-text">
          <StatusText health={health} />
        </p>
        {open && <CheckAgain health={health} />}
        <Pill aria-expanded={open} onClick={() => setOpen((o) => !o)} data-testid="health-line-show">
          {open ? t('health.hide') : t('health.show')}
        </Pill>
        <Pill tone="quiet" onClick={health.dismiss} data-testid="health-line-dismiss">
          {t('signIn.dismiss')}
        </Pill>
      </div>
      {open && <ScanError health={health} />}
      {open && <HealthList health={health} />}
    </section>
  );
}
