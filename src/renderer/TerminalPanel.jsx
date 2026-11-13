import { useCallback, useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

const bridge = window.bridge;
const QUICK_COMMANDS = ['/aidlc --status', '/aidlc --doctor', '/aidlc continue'];
const KINDS = [
  { id: 'claude', label: 'claude' },
  { id: 'shell', label: 'shell' }
];
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

const THEME = {
  background: '#0b0b10',
  foreground: '#e8e6f0',
  cursor: '#ff9c3a',
  selectionBackground: '#4a3f6b'
};

/** One xterm bound to one pty. Stays mounted while hidden so the session survives view switches. */
function TermSession({ projectId, kind, shown, sessionRef }) {
  const hostRef = useRef(null);
  const termRef = useRef(null);
  const fitRef = useRef(null);
  const idRef = useRef(null);
  const [exited, setExited] = useState(null);
  const [error, setError] = useState(null);

  const spawn = useCallback(async () => {
    setExited(null);
    setError(null);
    const term = termRef.current;
    try {
      idRef.current = await bridge.ptySpawn({ projectId, kind, cols: term.cols, rows: term.rows });
    } catch (err) {
      setError(errorText(err));
    }
  }, [projectId, kind]);

  useEffect(() => {
    const term = new Terminal({
      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
      fontSize: 13,
      cursorBlink: true,
      allowProposedApi: false,
      theme: THEME
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

    const offData = bridge.onPtyData(({ id, data }) => id === idRef.current && term.write(data));
    const offExit = bridge.onPtyExit(({ id, exitCode }) => {
      if (id !== idRef.current) return;
      idRef.current = null;
      setExited(exitCode);
    });
    const input = term.onData((data) => {
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
      term.dispose();
    };
  }, [spawn]);

  useEffect(() => {
    if (!shown) return;
    try {
      fitRef.current?.fit();
    } catch {
      /* ignore: not laid out */
    }
    termRef.current?.focus();
  }, [shown]);

  // Quick actions type into the claude session without pressing Enter (FR8.5).
  if (sessionRef) {
    sessionRef.current = {
      insert: (text) => {
        if (!idRef.current) return;
        bridge.ptyWrite(idRef.current, text).catch((err) => setError(errorText(err)));
        termRef.current?.focus();
      }
    };
  }

  return (
    <div className="term-session" hidden={!shown}>
      {(exited !== null || error) && (
        <div className="term-status" role="status">
          <span>{error ? `Kunde inte starta ${kind}: ${error}` : `${kind} avslutades (kod ${exited}).`}</span>
          <button className="btn btn-accent" onClick={spawn} data-testid={`terminal-panel-restart-${kind}`}>
            Starta om
          </button>
        </div>
      )}
      <div className="term-host" ref={hostRef} />
    </div>
  );
}

export default function TerminalPanel({ projectId, visible }) {
  const [open, setOpen] = useState(true);
  const [height, setHeight] = useState(320);
  const [active, setActive] = useState('claude');
  const claudeRef = useRef(null);

  function startDrag(e) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const move = (ev) => setHeight(Math.min(window.innerHeight - 160, Math.max(140, startH + startY - ev.clientY)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function nudgeHeight(e) {
    if (e.key === 'ArrowUp') setHeight((h) => Math.min(window.innerHeight - 160, h + 40));
    if (e.key === 'ArrowDown') setHeight((h) => Math.max(140, h - 40));
  }

  return (
    <section className={`terminal-panel elbow-bottom ${open ? '' : 'is-collapsed'}`} aria-label="Terminal">
      {open && (
        <div
          className="terminal-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Ändra terminalens höjd (pil upp/ned)"
          tabIndex={0}
          onPointerDown={startDrag}
          onKeyDown={nudgeHeight}
          data-testid="terminal-panel-resize"
        />
      )}
      <div className="terminal-bar">
        <button className="btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="terminal-panel-toggle">
          {open ? 'Dölj terminal' : 'Visa terminal'}
        </button>
        <div role="tablist" aria-label="Terminaler" className="terminal-tabs">
          {KINDS.map((k) => (
            <button
              key={k.id}
              role="tab"
              aria-selected={active === k.id}
              className={`detail-tab ${active === k.id ? 'is-active' : ''}`}
              onClick={() => {
                setActive(k.id);
                setOpen(true);
              }}
              data-testid={`terminal-panel-tab-${k.id}`}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="quick-actions">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              className="btn btn-quiet"
              title="Skriver in kommandot i claude-fliken utan att skicka det"
              onClick={() => {
                setActive('claude');
                setOpen(true);
                claudeRef.current?.insert(cmd);
              }}
              data-testid="terminal-panel-quick-command"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
      <div className="terminal-body" style={{ height: open ? height : 0 }} hidden={!open}>
        {KINDS.map((k) => (
          <TermSession
            key={k.id}
            projectId={projectId}
            kind={k.id}
            shown={visible && open && active === k.id}
            sessionRef={k.id === 'claude' ? claudeRef : null}
          />
        ))}
      </div>
    </section>
  );
}
