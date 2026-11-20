// US-1402 FR6.2–FR6.4: one Spec Kit feature: its flow worked out from the files (BR6.3), its tasks by phase with
// Convergence rounds (BR6.4), and its files, each opened read-only through `onOpenFile` (BR6.5).
import { useTranslation } from 'react-i18next';

const STEPS = ['spec', 'clarify', 'plan', 'tasks', 'implement', 'converge'];

/** @param {{feature: object, onOpenFile: (rel: string) => void, openFile?: string|null}} props a feature from speckit:features (C5) */
export default function SpeckitFeatureDetail({ feature, onOpenFile, openFile = null }) {
  const { t } = useTranslation();
  const { flow, tasks, files, dir } = feature;
  const prefix = `specs/${dir}/`;
  return (
    <div className="speckit-feature" data-testid="speckit-feature-detail">
      <h3 className="section-title">{feature.number ? `${feature.number} · ${feature.name}` : feature.name}</h3>

      <ol className="speckit-flow" data-testid="speckit-feature-flow">
        {STEPS.map((step) => (
          <li key={step} className={flow[step] ? 'is-done' : 'is-todo'} data-done={flow[step]}>
            <span className="speckit-flow-step">{t(`speckit.features.step.${step}`)}</span>
            <span className="speckit-flow-state">{t(flow[step] ? 'speckit.features.done' : 'speckit.features.notDone')}</span>
          </li>
        ))}
      </ol>
      <p className="muted" data-testid="speckit-feature-flow-note">
        {t('speckit.features.flowNote')}
      </p>

      <section data-testid="speckit-feature-tasks">
        <p className="speckit-count" data-testid="speckit-feature-count">
          {t('speckit.features.count', { done: tasks.done, total: tasks.total })}
        </p>
        {tasks.skipped > 0 && <p className="muted">{t('speckit.features.skipped', { count: tasks.skipped })}</p>}
        {tasks.phases.map((phase, i) => (
          <div key={`${i}-${phase.name}`} className="speckit-phase">
            <h4 className="file-group">
              {phase.name || t('speckit.features.noPhase')}
              {phase.round !== null && ` · ${t('speckit.features.round', { round: phase.round })}`}
            </h4>
            <ul className="speckit-tasks">
              {phase.items.map((item) => (
                <li key={item.id}>
                  <label>
                    {/* Shown, never ticked from the app: Spec Kit's files are read-only (BR6.6). */}
                    <input type="checkbox" checked={item.done} disabled readOnly />
                    <code>{item.id}</code>
                    {item.parallel && <span className="speckit-tag">[P]</span>}
                    {item.story && <span className="speckit-tag">[{item.story}]</span>}
                    <span>{item.text}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {files.length > 0 && (
        <section>
          <h4 className="file-group">{t('speckit.features.files')}</h4>
          <ul className="speckit-files">
            {files.map((rel) => (
              <li key={rel}>
                <button
                  className={`link ${openFile === rel ? 'is-selected' : ''}`}
                  aria-current={openFile === rel}
                  onClick={() => onOpenFile(rel)}
                  data-testid="speckit-feature-file"
                >
                  {rel.startsWith(prefix) ? rel.slice(prefix.length) : rel}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
