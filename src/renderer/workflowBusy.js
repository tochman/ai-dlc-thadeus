// "Is an AI-DLC workflow running here?" (US-0502 FR3.5, shared since US-0504 FR4, narrowed by US-0041): the refresh
// panel and the AI-DLC update rows disable their commands with the same rule.
import { useEffect, useState } from 'react';
import { stageTitle } from './format.js';

// US-0041 AC3: the notice goes away by itself within a minute of the last stage write.
export const WORKING_MS = 60 * 1000;

/**
 * US-0041 AC1: the active intent while it is in flight and not parked, as `{name, stage}`; null for a complete or parked
 * active intent, or none.
 */
export function inFlightIntent(intents) {
  const i = intents.find((x) => x.active);
  if (!i || i.parked || i.status === 'complete' || /^complete/i.test(i.stateStatus ?? '')) return null;
  return { name: i.slug ?? i.dirName, stage: i.currentStage ?? null };
}

/**
 * US-0504 FR4, US-0041 AC1–AC3: with an in-flight intent (`workflow`, `{name, stage, at}` from useProject, null when
 * none), a busy agent tab (any of them, EPIC-08 US-0803) or a stage write (`at`) in the last minute. A terminal double
 * without anyBusy falls back to the one agent tab; no terminal counts as not busy.
 */
export function isWorkflowRunning(terminal, workflow, now) {
  if (!workflow) return false;
  const busy = terminal?.anyBusy ? terminal.anyBusy() : terminal?.state?.('agent') === 'busy';
  return !!busy || (!!workflow.at && now - workflow.at < WORKING_MS);
}

/** isWorkflowRunning that re-renders when the one-minute window ends, so the buttons come back by themselves. */
export function useWorkflowRunning(terminal, workflow) {
  const [, tick] = useState(0);
  const at = workflow?.at;
  useEffect(() => {
    const left = at ? at + WORKING_MS - Date.now() : 0;
    if (left <= 0) return undefined;
    const timer = setTimeout(() => tick((n) => n + 1), left);
    return () => clearTimeout(timer);
  }, [at]);
  return isWorkflowRunning(terminal, workflow, Date.now());
}

/** US-0041 AC4: the notice names the intent and stage to wait for; the general one when no stage is known. */
export function waitText(t, workflow) {
  return workflow?.stage ? t('github.waitFor', { intent: workflow.name, stage: stageTitle(workflow.stage) }) : t('github.wait');
}
