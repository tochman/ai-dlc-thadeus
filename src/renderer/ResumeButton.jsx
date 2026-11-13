// "Fortsätt" for an in-flight intent (US-0501, FR2). Types into the claude tab; only the intent switch
// is submitted, `/aidlc` itself waits for the person's Enter (Q1: C).
import { useState } from 'react';
import { useTerminal } from './TerminalContext.jsx';

export const BUSY_MESSAGE = 'Claude arbetar — vänta eller avbryt först';
const SAFE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** "Fortsätt vid <stage> (steg n av m)", or just "Fortsätt" without pipeline data (FR2.5). */
export function resumeLabel(position) {
  if (!position?.stage) return 'Fortsätt';
  return position.total ? `Fortsätt vid ${position.stage} (steg ${position.step} av ${position.total})` : `Fortsätt vid ${position.stage}`;
}

/**
 * @param {{intent: {dirName: string, status: string|null}, activeDirName: string|null,
 *          position?: {stage: string|null, step?: number, total?: number}}} props
 */
export default function ResumeButton({ intent, activeDirName, position }) {
  const terminal = useTerminal();
  const [message, setMessage] = useState(null);
  if (!terminal || intent?.status !== 'in-flight') return null;

  function resume(e) {
    e.stopPropagation();
    if (terminal.state('claude') === 'busy') return setMessage(BUSY_MESSAGE); // FR2.4
    setMessage(null);
    if (intent.dirName === activeDirName) return terminal.type('claude', '/aidlc', { submit: false });
    // The name is submitted with Enter, so it must not carry anything a terminal would act on.
    if (!SAFE_DIR_NAME.test(intent.dirName)) return setMessage(`Ogiltigt intent-namn: ${intent.dirName}`);
    return terminal.sequence('claude', [
      { text: `/aidlc intent ${intent.dirName}`, submit: true },
      { text: '/aidlc', submit: false }
    ]);
  }

  return (
    <span className="resume">
      <button className="btn btn-accent resume-button" onClick={resume} data-testid="intent-resume">
        {resumeLabel(position)}
      </button>
      {message && (
        <span className="resume-message" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
