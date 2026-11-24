// US-1403 FR5.1, FR5.4 (contract C7): one Spec Kit command as an LCARS pill. It shows the text it types, is disabled
// with its reason while it cannot run (BR5.8, NFR6.1), and a click types the command and Enter into the agent tab
// (BR5.7, NFR4.4): one `type` call per click, never two while the first is on its way (NFR7.4).
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { commandName, speckitCommand } from '../shared/speckitCommands.js';

/** US-1403 BR5.8: why the command cannot run in the tab it goes to, or null. Harness and state come from that one tab. */
function blockedBy(t, terminal, harness, command) {
  if (!terminal?.lastAgent) return t('speckit.commands.noTab');
  if (!harness) return terminal.harnessProblem ?? t('terminal.checking');
  if (!command) return t('speckit.commands.unsupported', { harness: harness.name });
  if (terminal.state(terminal.lastAgent) === 'busy') return t('intents.resume.busy', { harness: harness.name });
  if (terminal.asking()) return t('intents.resume.asking', { harness: harness.name });
  return null;
}

/**
 * US-1403 BR5.7, BR5.8: `name` is a core stem (`plan`) or an extension command (`speckit.git.commit`); `args` follow it
 * as one plain line. `blocked` is the caller's own reason (specify without a description). `onSent(ok)` after each send.
 */
export default function SpeckitCommandButton({ name, args, submit = true, blocked = null, onSent, label, testId = 'speckit-commands-button' }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const inFlight = useRef(false); // set before the await, so a second click in the same render types nothing
  const full = commandName(name);
  if (!full) return null; // NFR4.2: an unsafe name gets no button

  const harness = terminal?.lastAgent ? terminal.harnessOf(terminal.lastAgent) : null;
  const command = speckitCommand(harness?.id, name);
  const reason = blockedBy(t, terminal, harness, command) ?? blocked;

  const send = async () => {
    if (reason || inFlight.current) return;
    inFlight.current = true;
    setSending(true);
    setFailed(false);
    let ok = false;
    try {
      ok = (await terminal.type('agent', speckitCommand(harness.id, name, args), { submit })) === true;
      if (!ok) console.warn(`[speckit] ${command} was not typed: the agent tab is gone`);
    } catch (err) {
      console.warn(`[speckit] ${command} was not typed`, err);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
    setFailed(!ok);
    onSent?.(ok);
  };

  return (
    <span className="speckit-command">
      <button className="btn btn-accent" disabled={Boolean(reason) || sending} onClick={send} data-testid={testId}>
        {label ?? command ?? `/${full}`}
      </button>
      {reason && (
        <span className="field-label" data-testid="speckit-commands-reason">
          {reason}
        </span>
      )}
      {failed && !reason && (
        <span className="speckit-command-failed" role="status" data-testid="speckit-commands-send-failed">
          {t('speckit.commands.sendFailed')}
        </span>
      )}
    </span>
  );
}
