// US-1402 FR6.2–FR6.4: one Spec Kit feature: its flow worked out from the files (BR6.3), its tasks by phase with
// Convergence rounds (BR6.4), and its files, each opened read-only through `onOpenFile` (BR6.5).
// US-1403 FR5.1: the next command for the active feature (BR5.2, BR5.4), and the converge note (BR5.3).
// US-1411 FR2.1: an archived feature shows its mark in place of the next command.
import { useTranslation } from 'react-i18next';
import { nextCommand } from '../shared/speckitCommands.js';
import SpeckitCommandButton from './SpeckitCommandButton.jsx';
import { Changed, stagger } from './Lcars.jsx';

const STEPS = ['spec', 'clarify', 'plan', 'tasks', 'implement', 'converge'];

/** US-1403 BR5.4: the next command for the active feature; for another, the note naming the active one (or none). */
function NextCommand({ feature, activeName }) {
  const { t } = useTranslation();
  if (!feature.active) {
    return (
      <p className="muted" data-testid="speckit-commands-not-active">
        {activeName ? t('speckit.commands.notActive', { name: activeName }) : t('speckit.commands.noActive')}
      </p>
    );
  }
  const next = nextCommand(feature);
  return (
    <div className="speckit-commands-row" data-testid="speckit-commands-next">
      <span className="field-label">{t('speckit.commands.next')}</span>
      <SpeckitCommandButton name={next.name} />
      {next.converged === 'unknown' && (
        <p className="muted" data-testid="speckit-commands-converge-note">
          {t('speckit.commands.convergeNote')}
        </p>
      )}
    </div>
  );
}

/**
 * @param {{feature: object, activeName?: string|null, onOpenFile: (rel: string) => void, openFile?: string|null,
 *          actions?: import('react').ReactNode}} props
 * a feature from speckit:features (C5), the active feature's name, or null when none is active, and what stands beside
 * the title (US-1411: Archive or Unarchive)
 */
export default function SpeckitFeatureDetail({ feature, activeName = null, onOpenFile, openFile = null, actions = null }) {
  const { t } = useTranslation();
  const { flow, tasks, files, dir } = feature;
  const prefix = `specs/${dir}/`;
  return (
    <div className="speckit-feature" data-testid="speckit-feature-detail">
      <div className="speckit-feature-head">
        <h3 className="section-title">{feature.number ? `${feature.number} · ${feature.name}` : feature.name}</h3>
        {actions}
      </div>
      {feature.archived ? (
        <div className="speckit-commands-row">
          <span className="intent-parked" data-testid="speckit-feature-archived">
            {t('intents.archive.mark')}
          </span>
        </div>
      ) : (
        <NextCommand feature={feature} activeName={activeName} />
      )}

      <ol className="speckit-flow" data-testid="speckit-feature-flow">
        {/* US-0050 item 6: the flow steps rise with the view's entrance, staggered. */}
        {STEPS.map((step, n) => (
          <li key={step} className={`${flow[step] ? 'is-done' : 'is-todo'} lcars-e-rise`} style={stagger(n)} data-done={flow[step]}>
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
              {/* US-0050 item 8: a task that becomes done (or not) glows once. */}
              {phase.items.map((item) => (
                <Changed as="li" key={item.id} value={item.done}>
                  <label>
                    {/* Shown, never ticked from the app: Spec Kit's files are read-only (BR6.6). */}
                    <input type="checkbox" checked={item.done} disabled readOnly />
                    <code>{item.id}</code>
                    {item.parallel && <span className="speckit-tag">[P]</span>}
                    {item.story && <span className="speckit-tag">[{item.story}]</span>}
                    <span>{item.text}</span>
                  </label>
                </Changed>
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
