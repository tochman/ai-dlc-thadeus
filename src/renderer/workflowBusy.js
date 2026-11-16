// "Is an AI-DLC workflow running here?" (US-0502 FR3.5, shared since US-0504 FR4): the refresh panel and the AI-DLC
// update rows disable their commands with the same rule.
import { useEffect, useState } from 'react';

export const WORKING_MS = 5 * 60 * 1000;

/**
 * US-0504 FR4: a busy agent tab (any of them, EPIC-08 US-0803), or an AI-DLC write in the last 5 minutes. A terminal
 * double without anyBusy falls back to the one agent tab; no terminal counts as not busy.
 */
export function isWorkflowRunning(terminal, lastIntentChangeAt, now) {
  const busy = terminal?.anyBusy ? terminal.anyBusy() : terminal?.state?.('agent') === 'busy';
  return !!busy || (!!lastIntentChangeAt && now - lastIntentChangeAt < WORKING_MS);
}

/** isWorkflowRunning that re-renders when the 5-minute window ends, so the buttons come back by themselves. */
export function useWorkflowRunning(terminal, lastIntentChangeAt) {
  const [, tick] = useState(0);
  useEffect(() => {
    const left = lastIntentChangeAt ? lastIntentChangeAt + WORKING_MS - Date.now() : 0;
    if (left <= 0) return undefined;
    const timer = setTimeout(() => tick((n) => n + 1), left);
    return () => clearTimeout(timer);
  }, [lastIntentChangeAt]);
  return isWorkflowRunning(terminal, lastIntentChangeAt, Date.now());
}
