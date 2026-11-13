import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { createActivity } from './terminalControl.js';
import { useTerminal } from './TerminalContext.jsx';
import AuctumMark from './AuctumMark.jsx';
import { Bar } from './Lcars.jsx';
import { xtermTheme } from './tokens.js';
import { t as translate } from '../shared/i18n.js';
import { harnessCommand } from '../shared/harnesses.js';

const bridge = window.bridge;
const QUICK_COMMANDS = [' --status', ' --doctor', ' continue']; // after the harness's AI-DLC command (FR4.1)
const KINDS = ['agent', 'shell'];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/**
 * One xterm bound to one pty. Stays mounted while hidden so the session survives view switches.
 * Registers itself with the TerminalProvider so other views can type into it (FR1.1).
 * `onInput` is told when the person types, which clears "Väntar på din Enter" (EPIC-04 FR3.6).
 * The agent tab passes its harness id (main looks up the command) and the harness's `quietMs` (US-0801 FR4.3);
 * `name` is what the texts call the tab.
 */
function TermSession({ projectId, kind, harness, quietMs, name, shown, register, onInput }) {
  const { t } = useTranslation();
  const hostRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const idRef = useRef(null);
  const onInputRef = useRef(onInput);
  onInputRef.current = onInput;
  const [activity] = useState(() => createActivity({ quietMs }));
  const [exited, setExited] = useState(null);
  const [error, setError] = useState(null);

  /** Resolves true once the pty runs; output then drives the activity signal (FR1.2). */
  const spawn = useCallback(async () => {
    setExited(null);
    setError(null);
    const term = termRef.current;
    try {
      idRef.current = await bridge.ptySpawn({ projectId, kind, harness, cols: term.cols, rows: term.rows });
      activity.onData(); // counts as busy until the first quiet period
      return true;
    } catch (err) {
      setError(errorText(err));
      return false;
    }
  }, [projectId, kind, harness, activity]);

  useEffect(
    () =>
      register(kind, {
        activity,
        spawn,
        write: (text) => {
          if (!idRef.current) throw new Error(translate('terminal.notRunning', { kind: name }));
          bridge.ptyWrite(idRef.current, text).catch((err) => setError(errorText(err)));
        },
        focus: () => termRef.current?.focus(),
        restart: async () => {
          const id = idRef.current;
          idRef.current = null; // the old session's exit event is ignored
          if (id) await bridge.ptyKill(id).catch(() => {});
          activity.onExit(null);
          return spawn();
        }
      }),
    [register, kind, name, activity, spawn]
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
          <button className="btn btn-accent" onClick={spawn} data-testid={`terminal-panel-restart-${kind}`}>
            {t('terminal.restart')}
          </button>
        </div>
      )}
      <div className="term-host" ref={hostRef} />
    </div>
  );
}

/**
 * Must sit inside a TerminalProvider: which tab is open and active is shared with the other views (FR1.4).
 * The agent tab runs `terminal.harness` (US-0801); while it is null (detection runs) or `terminal.harnessProblem`
 * is set, nothing starts there, and `onChooseHarness` opens the project settings (FR5.1).
 */
export default function TerminalPanel({ projectId, visible, onChooseHarness }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const { open, active } = terminal.view;
  const { harness, harnessProblem } = terminal;
  const tabLabel = (kind) => (kind === 'agent' ? (harness?.name ?? t('terminal.agent')) : t(`terminal.${kind}`));
  const setOpen = (next) => terminal.setView((v) => ({ ...v, open: typeof next === 'function' ? next(v.open) : next }));
  const setActive = (tab) => terminal.setView((v) => ({ ...v, active: tab }));
  // null = the CSS default clamp(180px, 24vh, 240px) on the open panel; a number once the person drags (F-01).
  const [height, setHeight] = useState(null);
  const panelRef = useRef(null);
  const clampHeight = (h) => Math.round(Math.min(window.innerHeight * 0.6, Math.max(180, h)));
  const currentHeight = () => height ?? panelRef.current?.offsetHeight ?? 220;

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
  // bars above and below the terminal, quick commands as outline buttons (EPIC-04 FR3.6).
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
      <div className="terminal-arm">
        <div role="tablist" aria-label={t('terminal.tabsLabel')} className="terminal-tabs">
          {KINDS.map((kind) => {
            const state = terminal.state(kind);
            const on = active === kind;
            const breathing = kind === 'agent' && state === 'busy';
            const checking = kind === 'agent' && !harness;
            return (
              <button
                key={kind}
                role="tab"
                aria-selected={on}
                className={`lcars-block term-tab term-tab--${kind} lcars-block--${on ? 'active' : 'mid'} ${breathing ? 'is-breathing' : ''}`}
                onClick={() => {
                  setActive(kind);
                  setOpen(true);
                }}
                data-testid={`terminal-panel-tab-${kind}`}
              >
                <span className={`term-state term-state-${state}`} data-testid={`terminal-panel-state-${kind}`}>
                  {checking ? t('terminal.checking') : t(`terminal.state.${state}`)}
                </span>
                <span className="term-tab-name" data-testid={`terminal-panel-name-${kind}`}>
                  {tabLabel(kind)}
                </span>
              </button>
            );
          })}
        </div>
        <button className="terminal-elbow" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="terminal-panel-toggle">
          <AuctumMark size={96} className="terminal-elbow-mark" decorative />
          <span className="terminal-elbow-label">{open ? t('terminal.hide') : t('terminal.show')}</span>
        </button>
      </div>
      <div className="terminal-main">
        {open && <Bar segs={[['steel', 2], ['steel-deep', 90], ['slate-3', 1]]} />}
        <div className="terminal-body" hidden={!open}>
          {harnessProblem && (
            <div className="term-session" hidden={!(visible && open && active === 'agent')}>
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
          {/* Keyed by harness: a switch closes the old session and starts the new CLI (FR6.1). */}
          {harness && !harnessProblem && (
            <TermSession
              key={`agent-${harness.id}`}
              projectId={projectId}
              kind="agent"
              harness={harness.id}
              quietMs={harness.quietMs}
              name={harness.name}
              shown={visible && open && active === 'agent'}
              register={terminal.register}
              onInput={() => terminal.input('agent')}
            />
          )}
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
        <div className="terminal-foot">
          <div className="quick-actions">
            {QUICK_COMMANDS.map((suffix) => {
              const cmd = harnessCommand(harness, suffix);
              const name = harness?.name ?? t('terminal.agent');
              return (
                <button
                  key={suffix}
                  className="btn btn-quiet"
                  title={cmd ? t('terminal.quickTitle', { harness: name }) : t('terminal.noCommand', { harness: name })}
                  disabled={!cmd}
                  onClick={() => terminal.type('agent', cmd, { submit: false })}
                  data-testid="terminal-panel-quick-command"
                >
                  {cmd ?? suffix.trim()}
                </button>
              );
            })}
          </div>
          {KINDS.filter((kind) => terminal.pending(kind)).map((kind) => (
            <span key={kind} className="term-pending-row">
              <span className="term-pending is-attn" data-testid={`terminal-panel-pending-${kind}`}>
                {t('terminal.pending')}
              </span>
              <span className="term-pending-hint">{t('terminal.pendingHint', { tab: tabLabel(kind) })}</span>
            </span>
          ))}
          {terminal.error && (
            <span className="term-error" role="alert" data-testid="terminal-panel-error">
              {terminal.error}
            </span>
          )}
        </div>
        <Bar segs={[['slate-3', 2], ['steel-deep', 70], ['slate-2', 1]]} />
      </div>
    </section>
  );
}
