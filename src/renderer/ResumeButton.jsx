// "Fortsätt" for an in-flight intent (US-0501, FR2). Types into the claude tab; only the intent switch
// is submitted, `/aidlc` itself waits for the person's Enter (Q1: C).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { t as translate } from '../shared/i18n.js';

const SAFE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** ["Fortsätt vid <stage>", "(steg n av m)"], or just ["Fortsätt", ""] without pipeline data (FR2.5). */
export function resumeLabel(position) {
  if (!position?.stage) return [translate('intents.resume.label'), ''];
  const main = translate('intents.resume.atStage', { stage: position.stage });
  return [main, position.total ? translate('intents.resume.step', { step: position.step, total: position.total }) : ''];
}

/**
 * @param {{intent: {dirName: string, status: string|null}, activeDirName: string|null,
 *          position?: {stage: string|null, step?: number, total?: number}}} props
 */
export default function ResumeButton({ intent, activeDirName, position }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [message, setMessage] = useState(null);
  if (!terminal || intent?.status !== 'in-flight') return null;

  function resume(e) {
    e.stopPropagation();
    if (terminal.state('claude') === 'busy') return setMessage(t('intents.resume.busy')); // FR2.4
    setMessage(null);
    if (intent.dirName === activeDirName) return terminal.type('claude', '/aidlc', { submit: false });
    // The name is submitted with Enter, so it must not carry anything a terminal would act on.
    if (!SAFE_DIR_NAME.test(intent.dirName)) return setMessage(t('intents.resume.invalidName', { name: intent.dirName }));
    return terminal.sequence('claude', [
      { text: `/aidlc intent ${intent.dirName}`, submit: true },
      { text: '/aidlc', submit: false }
    ]);
  }

  // The amber block in two parts (mockup): where it picks up, then the step. The text reads as one label.
  const [main, step] = resumeLabel(position);
  return (
    <span className="resume">
      <button className="resume-button" onClick={resume} data-testid="intent-resume">
        <span className="resume-main">{main}</span>
        <span className="resume-step">{step ? ` ${step}` : ''}</span>
      </button>
      {message && (
        <span className="resume-message" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
