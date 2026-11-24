// US-1410 FR10 (contract C9): the agent progress readout at the top of a Spec Kit project's view. It reads
// `agents:progress` and shows the waiting question and the active feature, each with its source, or one empty line
// (BR10.5). A hook push or `speckit:changed` for this project reads it again, nothing is polled (BR10.7, NFR7.1,
// NFR7.2); pushes during a call give one more call, not one each (NFR7.4). The texts are plain text nodes (NFR5.1).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** @param {{projectId: string}} props */
export default function SpeckitProgress({ projectId }) {
  const { t } = useTranslation();
  const [state, setState] = useState({ result: null, failed: false });
  const [refresh, setRefresh] = useState(0);
  const busy = useRef(false);
  const again = useRef(false);

  useEffect(() => {
    const bump = (e) => {
      if (e?.projectId !== projectId) return;
      if (busy.current) again.current = true;
      else setRefresh((n) => n + 1);
    };
    const offs = [window.bridge.agentEvents?.onChanged(bump), window.bridge.onSpeckitChanged(bump)];
    return () => offs.forEach((off) => off?.());
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    busy.current = true;
    // ponytail: one busy flag per component; a project switch mid-call can let the old call clear it early, costing at most one extra call.
    Promise.resolve()
      .then(() => window.bridge.getAgentProgress(projectId))
      .then(
        (result) => alive && setState({ result, failed: false }),
        (err) => {
          console.warn('Agentens framsteg kunde inte läsas:', err?.message ?? err);
          if (alive) setState({ result: null, failed: true });
        }
      )
      .finally(() => {
        busy.current = false;
        if (alive && again.current) {
          again.current = false;
          setRefresh((n) => n + 1);
        }
      });
    return () => {
      alive = false;
    };
  }, [projectId, refresh]);

  const { result, failed } = state;
  const waiting = result?.waiting;
  const feature = result?.feature;
  return (
    <div className="speckit-progress" data-testid="speckit-progress-root">
      <h3 className="section-title">{t('speckit.progress.title')}</h3>
      {failed && (
        <p className="banner banner-error" role="alert" data-testid="speckit-progress-error">
          {t('speckit.progress.failed')}
        </p>
      )}
      {waiting && (
        <p className="speckit-progress-part is-waiting" data-testid="speckit-progress-waiting">
          <span>{t('speckit.progress.waiting', waiting)}</span>
          <span className="speckit-tag">{t('speckit.progress.fromHooks')}</span>
        </p>
      )}
      {feature && (
        <p className="speckit-progress-part" data-testid="speckit-progress-feature">
          <span>{t('speckit.progress.feature', feature)}</span>
          <span className="speckit-tag">{t('speckit.progress.fromTasks')}</span>
        </p>
      )}
      {result && !waiting && !feature && (
        <p className="muted" data-testid="speckit-progress-empty">
          {t('speckit.progress.nothingYet')}
        </p>
      )}
    </div>
  );
}
