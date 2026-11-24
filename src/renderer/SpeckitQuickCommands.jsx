// US-1403 FR5.2 (contracts C6, C7): the Spec Kit quick commands: specify with a description, clarify, analyze and
// constitution, then each installed extension's commands grouped by id (BR5.5). Reads `speckit:rules` on mount and once
// per `speckit:changed` push, as SpeckitRules does (NFR7.1); a failed read keeps the core four with one note (NFR5.1).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { specifyText } from '../shared/speckitCommands.js';
import SpeckitCommandButton from './SpeckitCommandButton.jsx';

const CORE = ['clarify', 'analyze', 'constitution'];

/** @param {{projectId: string}} props */
export default function SpeckitQuickCommands({ projectId }) {
  const { t } = useTranslation();
  const [extensions, setExtensions] = useState([]);
  const [rulesError, setRulesError] = useState(false);
  const [description, setDescription] = useState('');
  const alive = useRef(true);

  const load = useCallback(
    () =>
      Promise.resolve()
        .then(() => window.bridge.speckitRules(projectId))
        .then(
          (r) => {
            if (!alive.current) return;
            setExtensions(r.extensions);
            setRulesError(r.errors.length > 0 || !r.hooksChecked);
          },
          (err) => {
            console.warn('[speckit] speckit:rules failed', err);
            if (alive.current) setRulesError(true);
          }
        ),
    [projectId]
  );

  useEffect(() => {
    alive.current = true;
    load();
    const off = window.bridge.onSpeckitChanged((e) => {
      if (e?.projectId === projectId) load();
    });
    return () => {
      alive.current = false;
      off?.();
    };
  }, [projectId, load]);

  const args = specifyText(description);

  return (
    <section className="speckit-commands" data-testid="speckit-commands-root">
      <h3 className="section-title">{t('speckit.commands.title')}</h3>
      <div className="speckit-commands-row">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('speckit.commands.describe')}
          aria-label={t('speckit.commands.describe')}
          maxLength={2000}
          data-testid="speckit-commands-specify-input"
        />
        <SpeckitCommandButton
          name="specify"
          args={args}
          blocked={args ? null : t('speckit.commands.needDescription')}
          onSent={(ok) => ok && setDescription('')}
        />
      </div>
      <div className="speckit-commands-row">
        {CORE.map((name) => (
          <SpeckitCommandButton key={name} name={name} />
        ))}
      </div>
      {extensions
        .filter((x) => x.commands.length > 0)
        .map((x) => (
          <div key={x.id} className="speckit-commands-row" data-testid="speckit-commands-extension">
            <span className="field-label">{x.id}</span>
            {x.commands.map((c) => (
              <SpeckitCommandButton key={c} name={c} />
            ))}
          </div>
        ))}
      {rulesError && (
        <p className="muted" role="status" data-testid="speckit-commands-rules-error">
          {t('speckit.commands.rulesError')}
        </p>
      )}
    </section>
  );
}
