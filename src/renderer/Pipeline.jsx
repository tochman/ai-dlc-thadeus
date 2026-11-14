import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCost, formatDuration, formatTime, shortModel, stageStatusLabel, tokenBreakdown } from './format.js';
import { t as translate } from '../shared/i18n.js';

const filesForStage = (groups, slug) => groups.filter((g) => g.dir === slug || g.dir.endsWith(`/${slug}`));
export const isSkipped = (s) => s.mode === 'SKIP' || s.status === 'skipped';

const DOT_OF = { done: 'done', 'in-progress': 'current', revising: 'current', 'awaiting-approval': 'attn' };
// In progress breathes, "needs you" pulses coral (FR3.4, FR4.1).
const EFFECT = { 'in-progress': 'is-breathing', revising: 'is-breathing', 'awaiting-approval': 'is-attn' };

/** One dot per executed stage, in pipeline order, for the intent's dot indicator (FR3.3). */
export function pipelineSteps(pipeline) {
  return pipeline.phases
    .flatMap((p) => p.stages)
    .filter((s) => !isSkipped(s))
    .map((s) => DOT_OF[s.status] ?? (s.current ? 'current' : 'todo'));
}

function stageDetails(stage, stageModels, fileCount) {
  return [
    [stage.agent, stageModels?.length ? stageModels.map(shortModel).join(', ') : null].filter(Boolean).join(' · ') || null,
    `${formatTime(stage.startedAt)} → ${stage.completedAt ? formatTime(stage.completedAt) : '…'}`,
    formatDuration(stage.durationMs),
    fileCount ? translate('pipeline.files', { n: fileCount }) : translate('pipeline.noFiles')
  ]
    .filter(Boolean)
    .join(' · ');
}

/** "NN · Status" at the top, the name at the bottom right; model and cost on the stage in progress (FR3.4). */
function StageBlock({ stage, index, open, onToggle, stageCost, stageModels, details }) {
  const { t } = useTranslation();
  const statusText = stage.mode === 'SKIP' ? t('pipeline.notIncluded') : (stageStatusLabel(stage.status) ?? stage.status);
  const extra = stage.current && stage.status !== 'in-progress' ? ` · ${t('pipeline.current')}` : '';
  const models = stage.current && stageModels?.length ? `${stageModels.map(shortModel).join(', ')} · ` : '';
  return (
    <li className={`stage status-${stage.status} ${isSkipped(stage) ? 'is-muted' : ''} ${stage.current ? 'is-current' : ''}`}>
      <button className={`stage-block ${EFFECT[stage.status] ?? ''}`} onClick={onToggle} aria-expanded={open} title={details} data-testid="pipeline-stage">
        <span className="stage-top">
          <span>
            {index ?? '—'} · {statusText}
            {extra}
            {stage.mismatch && (
              <span className="stage-flag" title={t('pipeline.mismatchTitle', { status: String(stage.graphStatus) })}>
                {' '}
                · {t('pipeline.mismatch')}
              </span>
            )}
          </span>
          <span
            className="stage-cost"
            title={stageCost ? `${t('cost.label')} · ${tokenBreakdown(stageCost.tokens)}` : undefined}
            data-testid="pipeline-stage-cost"
          >
            {stageCost ? `${models}${formatCost(stageCost)}` : ''}
          </span>
        </span>
        <span className="stage-name">{stage.slug}</span>
      </button>
    </li>
  );
}

/** Details and files of the opened stage, under its phase row. */
function StageFiles({ files, details, onOpenFile }) {
  const { t } = useTranslation();
  const list = files.flatMap((g) => g.files.map((f) => ({ ...f, dir: g.dir })));
  return (
    <div className="stage-files">
      <p className="stage-files-meta">{details}</p>
      {list.length === 0 ? (
        <p className="muted">{t('pipeline.noStageFiles')}</p>
      ) : (
        <ul className="stage-file-list">
          {list.map((f) => (
            <li key={f.rel}>
              <button className="link" onClick={() => onOpenFile(f.rel)} data-testid="pipeline-stage-file">
                {f.dir}/{f.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function Pipeline({ pipeline, files, hasGraph, onOpenFile, cost }) {
  const { t } = useTranslation();
  const [openSlug, setOpenSlug] = useState(null);
  const [showSkipped, setShowSkipped] = useState(false);
  const stageCost = new Map((cost?.byStage ?? []).map((r) => [r.name, r]));
  if (pipeline.phases.length === 0) return <p className="muted">{t('pipeline.noStages')}</p>;

  // Executed stages are numbered across phases; those not included get "—" and hide behind "Visa".
  const numbers = new Map();
  pipeline.phases
    .flatMap((p) => p.stages)
    .filter((s) => !isSkipped(s))
    .forEach((s, i) => numbers.set(s.slug, String(i + 1).padStart(2, '0')));
  const skipped = pipeline.phases.map((p) => [p.name, p.stages.filter(isSkipped).length]).filter(([, n]) => n > 0);
  const skippedTotal = skipped.reduce((sum, [, n]) => sum + n, 0);
  const fileCount = (slug) => filesForStage(files, slug).reduce((n, g) => n + g.files.length, 0);
  const detailsOf = (s) => stageDetails(s, cost?.stageModels[s.slug], fileCount(s.slug));

  return (
    <div className="pipeline" data-testid="pipeline">
      {!hasGraph && <p className="muted">{t('pipeline.noGraph')}</p>}
      {pipeline.phases.map((phase) => {
        const stages = showSkipped ? phase.stages : phase.stages.filter((s) => !isSkipped(s));
        if (stages.length === 0) return null;
        const opened = stages.find((s) => s.slug === openSlug);
        return (
          <section key={phase.name} aria-label={phase.name}>
            <div className="phase-row">
              <h3 className="phase-block">{phase.name}</h3>
              <ol className="stage-grid">
                {stages.map((s) => (
                  <StageBlock
                    key={s.slug}
                    stage={s}
                    index={numbers.get(s.slug)}
                    open={openSlug === s.slug}
                    onToggle={() => setOpenSlug((cur) => (cur === s.slug ? null : s.slug))}
                    stageCost={stageCost.get(s.slug)}
                    stageModels={cost?.stageModels[s.slug]}
                    details={detailsOf(s)}
                  />
                ))}
              </ol>
            </div>
            {opened && <StageFiles files={filesForStage(files, opened.slug)} details={detailsOf(opened)} onOpenFile={onOpenFile} />}
          </section>
        );
      })}
      {skippedTotal > 0 && (
        <div className="pipeline-skipped">
          <span>{t('pipeline.skipped', { list: skipped.map(([name, n]) => `${name} · ${n}`).join(', '), n: skippedTotal })}</span>
          <button className="lcars-chip" onClick={() => setShowSkipped((v) => !v)} aria-expanded={showSkipped}>
            {showSkipped ? t('common.hide') : t('common.show')}
          </button>
        </div>
      )}
    </div>
  );
}
