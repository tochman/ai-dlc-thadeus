// US-0506 u4 LC35, M7 (BR7.15, BR7.20, RD39, PD31): the fallback notice at the top of the project view. One line per
// harness the project uses whose hooks are not current, naming each file's status in words, with Install (missing) or
// Update (out of date, edited by hand) and Details, which opens Project settings at Agent dialogs. A file the app
// cannot use shows its reason with Details only. Hidden while the status is pending, and for this run once dismissed.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgentHooksPreview, { harnessLabel, reasonText } from './AgentHooksPreview.jsx';
import { useAgentHooks } from './AgentHooksSection.jsx';

/** @param {{projectId: string, onDetails: () => void}} props */
export default function AgentHooksStrip({ projectId, onDetails }) {
  const { t } = useTranslation();
  const harnesses = useAgentHooks(projectId);
  const [dismissed, setDismissed] = useState(false);
  const [open, setOpen] = useState(null); // { harness, action }
  const [done, setDone] = useState(null);

  const shown = dismissed ? [] : (harnesses ?? []).filter((h) => h.used && h.status !== 'current');
  const lineOf = (h) => {
    const bad = h.files.find((f) => f.reason);
    if (bad) return reasonText(t, bad);
    const files = h.files
      .filter((f) => f.status !== 'current')
      .map((f) => t('agentHooks.strip.fileStatus', { path: f.path, status: t(`agentHooks.status.${f.status}`) }))
      .join(', ');
    return t(`agentHooks.strip.${h.status === 'missing' ? 'missing' : 'outOfDate'}`, { harness: harnessLabel(h.harness), files });
  };

  return (
    <>
      {shown.map((h) => {
        const action = h.files.some((f) => f.reason) ? null : h.status === 'missing' ? 'install' : 'update';
        return (
          <div key={h.harness} className="latest-message" role="status" data-testid="agent-hooks-strip">
            <span>{lineOf(h)}</span>{' '}
            {action && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDone(null);
                  setOpen({ harness: h.harness, action });
                }}
                data-testid="agent-hooks-strip-action"
              >
                {t(`agentHooks.action.${action}`)}
              </button>
            )}{' '}
            <button type="button" className="btn" onClick={onDetails} data-testid="agent-hooks-strip-details">
              {t('agentHooks.strip.details')}
            </button>{' '}
            <button type="button" className="btn" onClick={() => setDismissed(true)} data-testid="agent-hooks-strip-dismiss">
              {t('agentHooks.strip.dismiss')}
            </button>
          </div>
        );
      })}
      {done && (
        <div className="latest-message" role="status" data-testid="agent-hooks-done">
          {done}
        </div>
      )}
      {open && (
        <AgentHooksPreview
          projectId={projectId}
          harness={open.harness}
          action={open.action}
          onClose={(line) => {
            setOpen(null);
            if (line) setDone(line);
          }}
        />
      )}
    </>
  );
}
