// US-0506 u4 LC35 (BR7.15, BR7.20, RD39): Project settings > Agent dialogs. Each harness with each of its files and
// their status in words, and Install, Update or Remove as the status allows; a file the app cannot use shows its
// reason and offers no action. The status comes from agentHooks.status and every agent-hooks:changed push.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AgentHooksPreview, { harnessLabel, reasonText } from './AgentHooksPreview.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** US-0506 u4 C4: the project's hooks status, null until main answers (PD31). */
export function useAgentHooks(projectId) {
  const [harnesses, setHarnesses] = useState(null);
  useEffect(() => {
    const bridge = window.bridge?.agentHooks;
    if (!bridge?.status) return undefined;
    let gone = false;
    bridge
      .status(projectId)
      .then((h) => !gone && setHarnesses(h))
      .catch((err) => console.warn('Agent hooks status could not be read:', errorText(err)));
    const off = bridge.onChanged?.((change) => change?.projectId === projectId && setHarnesses(change.harnesses));
    return () => {
      gone = true;
      off?.();
    };
  }, [projectId]);
  return harnesses;
}

/** The actions a harness's status allows; none while a file has a reason (RD39). */
export const actionsFor = (h) =>
  h.files.some((f) => f.reason) ? [] : h.status === 'missing' ? ['install'] : h.status === 'current' ? ['remove'] : ['update', 'remove'];

/** @param {{projectId: string, focus?: boolean}} props  focus: opened from the M7 strip's Details */
export default function AgentHooksSection({ projectId, focus = false }) {
  const { t } = useTranslation();
  const harnesses = useAgentHooks(projectId);
  const [open, setOpen] = useState(null); // { harness, action }
  const [done, setDone] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!focus) return;
    ref.current?.scrollIntoView?.({ block: 'nearest' });
    ref.current?.focus();
  }, [focus]);

  const word = (status) => t(`agentHooks.status.${status}`);
  return (
    <fieldset ref={ref} tabIndex={-1} className="settings-group" data-testid="agent-hooks-section">
      <legend>{t('agentHooks.section.title')}</legend>
      <span className="muted">{t('agentHooks.section.help')}</span>
      {!harnesses && <p className="muted">{t('agentHooks.section.pending')}</p>}
      {harnesses?.map((h) => (
        <div key={h.harness}>
          <p>
            <strong>{t('agentHooks.section.harness', { harness: harnessLabel(h.harness), status: word(h.status) })}</strong>
          </p>
          <ul>
            {h.files.map((f) => (
              <li key={f.path}>
                {`${f.path}: ${word(f.status)}`}
                {f.reason ? ` ${reasonText(t, f)}` : ''}
              </li>
            ))}
          </ul>
          {actionsFor(h).map((action) => (
            <button
              key={action}
              type="button"
              className="btn"
              onClick={() => {
                setDone(null);
                setOpen({ harness: h.harness, action });
              }}
              data-testid={`agent-hooks-section-${h.harness}-${action}`}
            >
              {t(`agentHooks.action.${action}`)}
            </button>
          ))}
        </div>
      ))}
      {done && <p role="status">{done}</p>}
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
    </fieldset>
  );
}
