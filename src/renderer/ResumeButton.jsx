// "Fortsätt" for an in-flight intent (US-0501, FR2), shown for the selected intent only and enabled only while the
// agent tab is idle. Types into the agent tab; only the intent switch is submitted, `/aidlc` itself waits for the
// person's Enter (Q1: C).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { t as translate } from '../shared/i18n.js';
import { harnessCommand } from '../shared/harnesses.js';
import Tooltip from './Tooltip.jsx';
import { stageTitle } from './format.js';

const SAFE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
// ponytail: a quiet log for this long means the outside agent stopped; a long silent step can re-enable Resume early.
// The button re-checks on the next refresh, not on a timer.
export const ELSEWHERE_MS = 10 * 60_000;

/** ["Fortsätt vid <stage>", "(steg n av m)"], or just ["Fortsätt", ""] without pipeline data (FR2.5). */
export function resumeLabel(position) {
  if (!position?.stage) return [translate('intents.resume.label'), ''];
  const main = translate('intents.resume.atStage', { stage: position.stage });
  return [main, position.total ? translate('intents.resume.step', { step: position.step, total: position.total }) : ''];
}

/**
 * @param {{intent: {dirName: string, status: string|null}, activeDirName: string|null,
 *          activeIntent?: {dirName: string, slug?: string, status: string|null}|null,
 *          position?: {stage: string|null, step?: number, total?: number}}} props activeIntent is the project's
 *   active intent (the one an agent session runs)
 */
export default function ResumeButton({ projectId, intent, activeDirName, activeIntent = null, position }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [message, setMessage] = useState(null);
  if (!terminal || intent?.status !== 'in-flight') return null;
  const harnessName = terminal.harness?.name ?? t('terminal.agent');
  const command = harnessCommand(terminal.harness); // the harness's AI-DLC command (US-0801 FR4.1)
  // Nothing is typed when the table lacks the command, or while detection runs (FR4.2).
  const missing = command ? null : terminal.harness ? t('terminal.noCommand', { harness: harnessName }) : t('terminal.checking');
  // Only an idle agent can pick up the work. While any agent tab works ("Arbetar"), or one waits on the person's answer,
  // the work is already running: the button waits, with the reason (FR2.4, EPIC-00 US-0005).
  // US-0510 FR4.4: a parked intent is unparked through main first, which needs the project.
  // ponytail: the intents list is not handed its project yet, so its Resume on a parked intent waits with the mark's text; the detail's works.
  const noProject = intent.parked && !projectId ? t('intents.parked', { stage: intent.parkedStage ? stageTitle(intent.parkedStage) : '–' }) : null;
  const unavailable = missing ?? noProject ?? workingReason();

  function workingReason() {
    if (terminal.anyBusy?.() ?? terminal.state('agent') === 'busy') return t('intents.resume.busy', { harness: harnessName });
    if (terminal.asking?.()) return t('intents.resume.asking', { harness: harnessName });
    if (activeIntent?.parked) return null; // parked: no agent runs it, though parking just wrote its audit
    // A live agent session with the active intent in flight is running the work, even while it is quiet (waiting
    // on a subagent, between steps). Every Resume in the project waits: a switch typed into it is wrong too (US-0007).
    if (terminal.running?.() && activeIntent?.status === 'in-flight') {
      return t('intents.resume.running', { harness: harnessName, intent: activeIntent.slug ?? activeIntent.dirName });
    }
    // An agent outside the app (another terminal) is running the active intent: AI-DLC wrote its audit log within
    // the last few minutes. The app cannot see that session, so it goes by the log (US-0009).
    if (activeIntent?.status === 'in-flight' && Date.now() - (activeIntent.activityAt ?? 0) < ELSEWHERE_MS) {
      return t('intents.resume.elsewhere', { intent: activeIntent.slug ?? activeIntent.dirName });
    }
    return null;
  }

  function resume(e) {
    e.stopPropagation();
    if (unavailable) return undefined; // aria-disabled, not disabled, so it keeps focus and its tooltip (US-0414 FR2.4)
    const reason = workingReason();
    if (reason) return setMessage(reason); // FR2.4
    setMessage(null);
    if (intent.parked) return unparkThenResume();
    if (intent.dirName === activeDirName) return terminal.type('agent', command, { submit: false });
    // The name is submitted with Enter, so it must not carry anything a terminal would act on.
    if (!SAFE_DIR_NAME.test(intent.dirName)) return setMessage(t('intents.resume.invalidName', { name: intent.dirName }));
    return terminal.sequence('agent', [
      { text: `${command} intent ${intent.dirName}`, submit: true },
      { text: command, submit: false }
    ]);
  }

  /** US-0510 FR4.4, FR4.5: unpark (switching to the intent when needed), then type the command; a failure types nothing. */
  async function unparkThenResume() {
    let res;
    try {
      res = await window.bridge.unparkIntent(projectId, intent.dirName);
    } catch (err) {
      res = { ok: false, error: String(err?.message ?? err) };
    }
    if (!res?.ok) return setMessage(res?.error ?? '');
    return terminal.type('agent', command, { submit: false });
  }

  // The amber block in two parts (mockup): where it picks up, then the step. The text reads as one label.
  const [label, step] = resumeLabel(position);
  // With two agent tabs open it goes to the last one used, and says which ("Fortsätt i opencode", US-0803).
  const main = terminal.agentTabs?.length > 1 ? t('intents.resume.inHarness', { label, harness: harnessName }) : label;
  return (
    <span className="resume">
      <Tooltip text={unavailable}>
        <button className="resume-button" onClick={resume} aria-disabled={!!unavailable} data-testid="intent-resume">
          <span className="resume-main">{main}</span>
          <span className="resume-step">{step ? ` ${step}` : ''}</span>
        </button>
      </Tooltip>
      {message && (
        <span className="resume-message" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
