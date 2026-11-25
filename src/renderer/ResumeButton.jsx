// "Fortsätt" for an in-flight intent (US-0501, FR2), shown for the selected intent only and enabled only while the
// agent tab is idle. Types into the agent tab; only the intent switch is submitted, `/aidlc` itself waits for the
// person's Enter (Q1: C).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { t as translate } from '../shared/i18n.js';
import { harnessCommand } from '../shared/harnesses.js';
import { ELSEWHERE_MS, workBlock } from '../shared/intentArchive.js';
import Tooltip from './Tooltip.jsx';
import { stageTitle } from './format.js';

const SAFE_DIR_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
export { ELSEWHERE_MS };

/** The intent switch is submitted with Enter, so the folder name must not carry anything a terminal would act on. US-0509 FR3.2. */
export const unsafeNameReason = (dirName) => (SAFE_DIR_NAME.test(dirName) ? null : translate('intents.resume.invalidName', { name: dirName }));

/** The last agent tab's harness, as the texts name it. */
const harnessNameOf = (terminal) => terminal.harness?.name ?? translate('terminal.agent');

/** Why nothing can be typed: the harness table lacks the AI-DLC command, or detection runs (US-0801 FR4.2, US-0509 FR1.5). */
export function missingCommandReason(terminal) {
  if (harnessCommand(terminal.harness)) return null;
  return terminal.harness ? translate('terminal.noCommand', { harness: harnessNameOf(terminal) }) : translate('terminal.checking');
}

/** The text for a block of the shared rule on the active intent's work (US-0501 FR2.4, US-0509 FR1.3, FR1.4). */
export const blockReason = (terminal, block, activeIntent) =>
  block && translate(`intents.resume.${block}`, { harness: harnessNameOf(terminal), intent: activeIntent?.slug ?? activeIntent?.dirName ?? '' });

/** US-0513 FR1.4: the rule Resume and Archive share, asked of the project's agent tabs as they are now. */
export const workBlockOf = (terminal, activeIntent) =>
  workBlock({
    busy: terminal?.anyBusy?.() ?? terminal?.state('agent') === 'busy',
    asking: terminal?.asking?.() ?? false,
    running: terminal?.running?.() ?? false,
    activeIntent,
    now: Date.now()
  });

/**
 * "Fortsätt vid <stage>", or "Fortsätt" without pipeline data (FR2.5). US-0037 FR3.2, FR3.4: a parked intent reads
 * "Avparkera och fortsätt vid <stage>" (its parked stage when there is no position); the step shows in the progress row only.
 */
export function resumeLabel(position, intent) {
  const stage = position?.stage ?? (intent?.parked && intent.parkedStage ? stageTitle(intent.parkedStage) : null);
  if (intent?.parked) return stage ? translate('intents.resume.unparkAtStage', { stage }) : translate('intents.resume.unpark');
  return stage ? translate('intents.resume.atStage', { stage }) : translate('intents.resume.label');
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
  const harnessName = harnessNameOf(terminal);
  const command = harnessCommand(terminal.harness); // the harness's AI-DLC command (US-0801 FR4.1)
  const missing = missingCommandReason(terminal);
  // Only an idle agent can pick up the work. While any agent tab works ("Arbetar"), or one waits on the person's answer,
  // the work is already running: the button waits, with the reason (FR2.4, EPIC-00 US-0005).
  // US-0510 FR4.4: a parked intent is unparked through main first, which needs the project.
  const noProject = intent.parked && !projectId ? t('intents.parked', { stage: intent.parkedStage ? stageTitle(intent.parkedStage) : '–' }) : null;
  const unavailable = missing ?? noProject ?? workingReason();

  // A live agent session with the active intent in flight is running the work, even while it is quiet (waiting on a
  // subagent, between steps). Every Resume in the project waits: a switch typed into it is wrong too (US-0007).
  function workingReason() {
    return blockReason(terminal, workBlockOf(terminal, activeIntent), activeIntent);
  }

  function resume(e) {
    e.stopPropagation();
    if (unavailable) return undefined; // aria-disabled, not disabled, so it keeps focus and its tooltip (US-0414 FR2.4)
    const reason = workingReason();
    if (reason) return setMessage(reason); // FR2.4
    setMessage(null);
    if (intent.parked) return unparkThenResume();
    if (intent.dirName === activeDirName) return terminal.type('agent', command, { submit: false });
    const unsafe = unsafeNameReason(intent.dirName);
    if (unsafe) return setMessage(unsafe);
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

  const label = resumeLabel(position, intent);
  // With two agent tabs open it goes to the last one used, and says which ("Fortsätt i opencode", US-0803).
  const main = terminal.agentTabs?.length > 1 ? t('intents.resume.inHarness', { label, harness: harnessName }) : label;
  return (
    <span className="resume">
      <Tooltip text={unavailable}>
        {/* US-0417 (Shape rule): Resume is an action, so a pill. */}
        <button className="resume-button lcars-pill lcars-pill--primary" onClick={resume} aria-disabled={!!unavailable} data-testid="intent-resume">
          <span className="resume-main">{main}</span>
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
