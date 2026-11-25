import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { createActivity, dropText } from './terminalControl.js';
import { isAgentTab, useTerminal } from './TerminalContext.jsx';
import AuctumMark from './AuctumMark.jsx';
import { Bar, Pill } from './Lcars.jsx';
import { SignInNotice, useTabSignIn } from './SignIn.jsx'; // US-0804
import Tooltip from './Tooltip.jsx';
import { xtermTheme } from './tokens.js';
import { t as translate } from '../shared/i18n.js';
import { harnessCommand } from '../shared/harnesses.js';

const bridge = window.bridge;
const QUICK_COMMANDS = [' --status', ' --doctor', ' continue']; // after the harness's AI-DLC command (FR4.1)
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * One xterm bound to one pty. Stays mounted while hidden so the session survives view switches.
 * Registers itself with the TerminalProvider so other views can type into it (FR1.1).
 * `onInput` is told when the person types, which clears "Väntar på din Enter" (EPIC-04 FR3.6).
 * The agent tab passes its harness id (main looks up the command) and the harness's `quietMs` (US-0801 FR4.3);
 * `name` is what the texts call the tab. `tab` is the key it registers under (`agent:<id>` or `shell`, US-0803)
 * and `testId` the suffix of its data-testids. `onStart` is called after each successful start, Restart included, and
 * is not waited for (US-0804 FR4.1).
 */
function TermSession({ projectId, kind, tab = kind, testId = kind, harness, quietMs, name, shown, register, onInput, onStart }) {
  const { t } = useTranslation();
  const hostRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const idRef = useRef(null);
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const [activity] = useState(() => createActivity({ quietMs }));
  const [exited, setExited] = useState(null);
  const [error, setError] = useState(null);
  const [dropping, setDropping] = useState(false);

  // Dropped files (an image for Claude Code, say) are typed in as their quoted paths, without Enter. The default
  // is prevented so the window never opens the file; main blocks navigation too.
  const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
  const dragOver = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDropping(true);
  };
  const dragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setDropping(false);
  };
  const drop = (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    setDropping(false);
    const text = dropText(Array.from(e.dataTransfer.files, (f) => bridge.pathForFile?.(f)).filter(Boolean));
    if (!text || !idRef.current) return;
    bridge.ptyWrite(idRef.current, text).catch((err) => setError(errorText(err)));
    termRef.current?.focus();
  };

  /** Resolves true once the pty runs; output then drives the activity signal (FR1.2). */
  const spawn = useCallback(async () => {
    setExited(null);
    setError(null);
    const term = termRef.current;
    try {
      idRef.current = await bridge.ptySpawn({ projectId, kind, harness, cols: term.cols, rows: term.rows });
      activity.onData(); // counts as busy until the first quiet period
      onStartRef.current?.();
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  }, [projectId, kind, harness, activity]);

  useEffect(
    () =>
      register(tab, {
        activity,
        spawn,
        write: (text) => {
          if (!idRef.current) throw new Error(translate('terminal.notRunning', { kind: name }));
          bridge.ptyWrite(idRef.current, text).catch((err) => setError(errorText(err)));
        },
        focus: () => termRef.current?.focus(),
        /** The visible rows as text, wrapped rows joined (the question popup reads the picker, EPIC-00 US-0004). */
        screen: () => screenLines(termRef.current),
        /** Where the viewport sits in the buffer: viewportY < baseY means scrolled up (US-0006 debug only). */
        view: () => {
          const term = termRef.current;
          return { rows: term?.rows, viewportY: term?.buffer?.active?.viewportY, baseY: term?.buffer?.active?.baseY };
        },
        restart: async () => {
          const id = idRef.current;
          idRef.current = null; // the old session's exit event is ignored
          if (id) await bridge.ptyKill(id).catch(() => {});
          activity.onExit(null);
          return spawn();
        }
      }),
    [register, tab, name, activity, spawn]
  );

  useEffect(() => {
    const term = new Terminal({
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: false,
      theme: xtermTheme()
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    termRef.current = term;
    fitRef.current = fit;
    try {
      fit.fit();
    } catch {
      /* host not laid out yet; the ResizeObserver fits it later */
    }

    const offData = bridge.onPtyData(({ id, data }) => {
      if (id !== idRef.current) return;
      term.write(data);
      activity.onData();
    });
    const offExit = bridge.onPtyExit(({ id, exitCode }) => {
      if (id !== idRef.current) return;
      idRef.current = null;
      setExited(exitCode);
      activity.onExit(exitCode);
    });
    const input = term.onData((data) => {
      onInputRef.current?.(data);
      if (idRef.current) bridge.ptyWrite(idRef.current, data).catch((err) => setError(errorText(err)));
    });
    const resize = term.onResize(({ cols, rows }) => {
      if (idRef.current) bridge.ptyResize(idRef.current, cols, rows).catch(() => {});
    });
    const observer = new ResizeObserver(() => {
      if (hostRef.current?.offsetParent) fit.fit(); // skip while hidden (zero size)
    });
    observer.observe(hostRef.current);
    spawn();

    return () => {
      observer.disconnect();
      input.dispose();
      resize.dispose();
      offData();
      offExit();
      if (idRef.current) bridge.ptyKill(idRef.current).catch(() => {});
      activity.onExit(null);
      term.dispose();
    };
  }, [spawn, activity]);

  useEffect(() => {
    if (!shown) return;
    try {
      fitRef.current?.fit();
    } catch {
      /* ignore: not laid out */
    }
    termRef.current?.focus();
  }, [shown]);

  return (
    <div className="term-session" hidden={!shown}>
      {(exited !== null || error) && (
        <div className="term-status" role="status">
          <span>{error ? t('terminal.startFailed', { kind: name, error }) : t('terminal.exited', { kind: name, code: String(exited) })}</span>
          <button className="btn btn-accent" onClick={spawn} data-testid={`terminal-panel-restart-${testId}`}>
            {t('terminal.restart')}
          </button>
        </div>
      )}
      <div
        className={`term-host${dropping ? ' is-drop-target' : ''}`}
        ref={hostRef}
        onDragOver={dragOver}
        onDragLeave={dragLeave}
        onDrop={drop}
        data-testid={`terminal-panel-host-${testId}`}
      />
    </div>
  );
}

/**
 * The quick commands (FR4.1) as a tiny select in the dark segment of the bar above the terminal, so they take no row
 * of their own. A pick types the command into the agent tab without Enter and the select goes back to its placeholder.
 * Renders nothing when the harness has no command.
 */
function QuickSelect({ harness, onPick }) {
  const { t } = useTranslation();
  const name = harness?.name ?? t('terminal.agent');
  const items = QUICK_COMMANDS.map((suffix) => ({ suffix, cmd: harnessCommand(harness, suffix) }));
  if (!items.some(({ cmd }) => cmd)) return null;
  // A disabled <option> cannot host a DOM tooltip, so its reason joins the list's own (US-0414 FR2.5).
  const tip = [t('terminal.quickTitle', { harness: name }), items.some(({ cmd }) => !cmd) && t('terminal.noCommand', { harness: name })]
    .filter(Boolean)
    .join('\n');
  return (
    <Tooltip text={tip}>
      <select
        className="lcars-select lcars-select--bar"
        value=""
        aria-label={t('terminal.quickMenu')}
        onChange={(e) => e.target.value && onPick(e.target.value)}
        data-testid="terminal-panel-quick-select"
      >
        <option value="">{t('terminal.quickMenu')}</option>
        {items.map(({ suffix, cmd }) => (
          <option key={suffix} value={cmd ?? ''} disabled={!cmd} data-testid="terminal-panel-quick-command">
            {cmd ?? suffix.trim()}
          </option>
        ))}
      </select>
    </Tooltip>
  );
}

/**
 * Must sit inside a TerminalProvider: which tab is open and active is shared with the other views (FR1.4).
 * The agent tab runs `terminal.harness` (US-0801); while it is null (detection runs) or `terminal.harnessProblem`
 * is set, nothing starts there, and `onChooseHarness` opens the project settings (FR5.1).
 */
/** Scrollback rows read above the live screen, so a picker taller than the terminal is still read whole (US-0006). */
const LOOKBACK = 40;

/**
 * The live screen's rows as text (the bottom of the buffer, not the scrolled viewport, EPIC-00 US-0006), with up to
 * LOOKBACK rows of scrollback above it; a row the terminal wrapped is joined to the one before it.
 */
export function screenLines(term) {
  const buf = term?.buffer?.active;
  if (!buf) return [];
  const base = buf.baseY ?? 0;
  const lines = [];
  for (let y = Math.max(0, base - LOOKBACK); y < base + term.rows; y++) {
    const line = buf.getLine(y);
    if (!line) continue;
    const text = line.translateToString(true);
    if (line.isWrapped && lines.length) lines[lines.length - 1] += text;
    else lines.push(text);
  }
  return lines;
}

export default function TerminalPanel({ projectId, visible, onChooseHarness, onOpenTools }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const { open, active } = terminal.view;
  const { harnessProblem, agentTabs } = terminal;
  const first = terminal.harnessOf(agentTabs[0]); // the US-0801 tab; null while detection runs
  const tabs = [...agentTabs, 'shell'];
  const harnessIn = (tab) => terminal.harnessOf(tab);
  const tabLabel = (tab) => (isAgentTab(tab) ? (harnessIn(tab)?.name ?? t('terminal.agent')) : t(`terminal.${tab}`));
  // The first agent tab keeps the ids it always had; a second one is suffixed with its harness id.
  const testId = (tab) => (tab === agentTabs[0] ? 'agent' : isAgentTab(tab) ? `agent-${harnessIn(tab)?.id}` : tab);
  const activeHarness = isAgentTab(active) ? harnessIn(active) : null;
  const setOpen = (next) => terminal.setView((v) => ({ ...v, open: typeof next === 'function' ? next(v.open) : next }));
  // null = the CSS default clamp(180px, 24vh, 240px) on the open panel; a number once the person drags (F-01).
  const [height, setHeight] = useState(null);
  const panelRef = useRef(null);
  const bodyId = useId();
  const toggleRef = useRef(null);
  const toggled = useRef(false); // US-0417: focus stays on Hide / Show terminal after a click, not after a command
  useEffect(() => {
    if (!toggled.current) return;
    toggled.current = false;
    toggleRef.current?.focus({ preventScroll: true });
  }, [open]);
  const clampHeight = (h) => Math.round(Math.min(window.innerHeight * 0.6, Math.max(180, h)));
  const currentHeight = () => height ?? panelRef.current?.offsetHeight ?? 220;
  const pendingTabs = tabs.filter((tab) => terminal.pending(tab));
  // US-0804 FR4.1: the shown agent tab's tool is not signed in.
  const signIn = useTabSignIn(terminal);
  const signedOut = open && activeHarness && signIn.lineFor(active) ? activeHarness.label : null;

  function startDrag(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = currentHeight();
    const move = (ev) => setHeight(clampHeight(startH + startY - ev.clientY));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function nudgeHeight(e) {
    if (e.key === 'ArrowUp') setHeight(clampHeight(currentHeight() + 40));
    if (e.key === 'ArrowDown') setHeight(clampHeight(currentHeight() - 40));
  }

  // The Konsol mockup: the agent and Shell as blocks in the bottom arm with their state on the block, segmented
  // bars above and below the terminal, quick commands in a tiny select in the bar's dark segment (EPIC-04 FR3.6).
  // US-0417: Hide / Show terminal is the last segment of the window's foot bar, a pill like Full screen at the other
  // corner; the elbow keeps only the mark. Hidden, the panel is that one foot bar (the sessions stay mounted).
  return (
    <section
      ref={panelRef}
      className={`terminal-panel ${open ? '' : 'is-collapsed'}`}
      style={open && height != null ? { height } : undefined}
      aria-label={t('terminal.label')}
    >
      {open && (
        <div
          className="terminal-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label={t('terminal.resize')}
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={nudgeHeight}
          data-testid="terminal-panel-resize"
        />
      )}
      {open && (
        <div className="terminal-arm">
          <div role="tablist" aria-label={t('terminal.tabsLabel')} className="terminal-tabs">
            {tabs.map((tab) => {
              const agent = isAgentTab(tab);
              const state = terminal.state(tab);
              const on = active === tab;
              const breathing = agent && state === 'busy';
              const checking = agent && !harnessIn(tab);
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={on}
                  className={`lcars-block term-tab term-tab--${agent ? 'agent' : tab} lcars-block--${on ? 'light' : 'dark'} ${breathing ? 'is-breathing' : ''}`}
                  onClick={() => terminal.show(tab)} // an agent tab shown becomes the one 'agent' goes to (US-0803)
                  data-testid={`terminal-panel-tab-${testId(tab)}`}
                >
                  <span className={`term-state term-state-${state}`} data-testid={`terminal-panel-state-${testId(tab)}`}>
                    {checking ? t('terminal.checking') : t(`terminal.state.${state}`)}
                  </span>
                  <span className="term-tab-name" data-testid={`terminal-panel-name-${testId(tab)}`}>
                    {tabLabel(tab)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="terminal-elbow" aria-hidden="true" data-testid="terminal-panel-elbow">
            <AuctumMark size={96} className="terminal-elbow-mark" decorative />
          </div>
        </div>
      )}
      <div className="terminal-main">
        {open && (
          <Bar
            segs={[
              ['steel', 2],
              ['steel-deep', 90, activeHarness && <QuickSelect harness={activeHarness} onPick={(cmd) => terminal.type(active, cmd, { submit: false })} />],
              ['slate-3', 1]
            ]}
          />
        )}
        <div className="terminal-body" id={bodyId} hidden={!open}>
          {harnessProblem && (
            <div className="term-session" hidden={!(visible && open && active === agentTabs[0])}>
              <div className="term-status" role="status" data-testid="terminal-panel-harness-problem">
                <span>{harnessProblem}</span>
                {onChooseHarness && (
                  <button className="btn btn-accent" onClick={onChooseHarness} data-testid="terminal-panel-choose-harness">
                    {t('terminal.chooseHarness')}
                  </button>
                )}
              </div>
            </div>
          )}
          {/* One session per open harness, keyed by it: a switch closes the old session and starts the new CLI
              (FR6.1); a second harness runs beside the first with its own state and Restart (US-0803). */}
          {first &&
            !harnessProblem &&
            agentTabs.map((tab) => {
              const h = harnessIn(tab);
              return (
                <TermSession
                  key={tab}
                  projectId={projectId}
                  kind="agent"
                  tab={tab}
                  testId={testId(tab)}
                  harness={h.id}
                  quietMs={h.quietMs}
                  name={h.name}
                  shown={visible && open && active === tab}
                  register={terminal.register}
                  onInput={() => terminal.input(tab)}
                  onStart={() => signIn.start(tab, h.id)}
                />
              );
            })}
          <TermSession
            key="shell"
            projectId={projectId}
            kind="shell"
            name="shell"
            shown={visible && open && active === 'shell'}
            register={terminal.register}
            onInput={() => terminal.input('shell')}
          />
        </div>
        {/* US-0804 FR5.2: always there, so a line that appears is announced without moving focus. */}
        <span className="sr-only" aria-live="polite" data-testid="terminal-panel-signin-status">
          {signedOut && t('signIn.line', { tool: signedOut })}
        </span>
        {/* Only while something waits for Enter or went wrong, so the terminal keeps the height otherwise. */}
        {/* US-0019: no "two agents at once" notice; busy is guessed from output timing and the guess confused people. */}
        {(pendingTabs.length > 0 || terminal.error || signedOut) && (
          <div className="terminal-foot" data-testid="terminal-panel-foot">
            {signedOut && (
              <SignInNotice
                tool={signedOut}
                onSignIn={() => signIn.signIn(active)}
                onOpenTools={onOpenTools}
                onDismiss={() => {
                  signIn.dismiss(active);
                  terminal.show(active); // the line goes, so the focus moves to its terminal
                }}
              />
            )}
            {pendingTabs.map((tab) => (
              <span key={tab} className="term-pending-row">
                <span className="term-pending is-attn" data-testid={`terminal-panel-pending-${testId(tab)}`}>
                  {t('terminal.pending')}
                </span>
                <span className="term-pending-hint">{t('terminal.pendingHint', { tab: tabLabel(tab) })}</span>
              </span>
            ))}
            {terminal.error && (
              <span className="term-error" role="alert" data-testid="terminal-panel-error">
                {terminal.error}
              </span>
            )}
          </div>
        )}
        <div className="terminal-footbar" data-testid="terminal-panel-footbar">
          <span className="lcars-sseg terminal-footbar-head" aria-hidden="true" />
          <span className="lcars-sseg lcars-sseg--fix terminal-footbar-a" aria-hidden="true" />
          <span className="lcars-sseg lcars-sseg--deep" aria-hidden="true" />
          <span className="lcars-sseg lcars-sseg--steel terminal-footbar-b" aria-hidden="true" />
          <span className="lcars-sseg lcars-sseg--fix" aria-hidden="true" />
          <Pill
            ref={toggleRef}
            className="terminal-toggle"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => {
              toggled.current = true;
              setOpen((o) => !o);
            }}
            data-testid="terminal-panel-toggle"
          >
            {open ? t('terminal.hide') : t('terminal.show')}
          </Pill>
        </div>
      </div>
    </section>
  );
}
