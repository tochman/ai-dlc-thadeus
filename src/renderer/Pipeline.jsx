// The intent's pipeline: phases of stages, each stage an LCARS card with a unit level bar (US-0411 FR1–FR5).
// US-0028: the note about runtime-graph.json shows only when stages are done and the file is not on this machine.
// US-0509 FR4.1: after a plan switch a done stage stays done, and one the work has passed is "not run".
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCost, formatDuration, formatTime, shortModel, stageStatusLabel, tokenBreakdown } from './format.js';
import { t as translate } from '../shared/i18n.js';
import { stageRuns } from '../shared/planChange.js';
import Tooltip from './Tooltip.jsx';

const filesForStage = (groups, slug) => groups.filter((g) => g.dir === slug || g.dir.endsWith(`/${slug}`));
/** Not a stage of the work: not in the plan, skipped, or passed without starting (the counts' rule, US-0509 FR4.1). */
export const isSkipped = (s) => !stageRuns(s);

/** US-0509 FR4.1: a stage's status as text. A done one is done whatever the plan says; one the work has passed is not run. */
function statusTextOf(t, s) {
  if (s.status !== 'done' && s.mode === 'SKIP') return t('pipeline.notIncluded');
  if (s.status === 'not-started' && s.behind) return t('pipeline.notRun');
  return stageStatusLabel(s.status) ?? s.status;
}

const DOT_OF = { done: 'done', 'in-progress': 'current', revising: 'current', 'awaiting-approval': 'attn' };
// In progress breathes, "needs you" pulses coral (FR3.4, FR4.1).
const EFFECT = { 'in-progress': 'is-breathing', revising: 'is-breathing', 'awaiting-approval': 'is-attn' };
/** US-0513 FR1.6: begun, but nothing runs or waits in it: mergePipeline gives an archived intent no current stage. */
const atRest = (s) => s.current === false && s.status in EFFECT;

/** One dot per executed stage, in pipeline order, for the intent's dot indicator (FR3.3). */
export function pipelineSteps(pipeline) {
  return pipeline.phases
    .flatMap((p) => p.stages)
    .filter((s) => !isSkipped(s))
    .map((s) => (atRest(s) ? 'todo' : (DOT_OF[s.status] ?? (s.current ? 'current' : 'todo'))));
}

const MAX_SEGMENTS = 8;

/**
 * US-0411 FR2: the card's level bar from the records. One segment per unit up to 8, approved lit;
 * above 8, 8 segments lit in proportion (rounded down); a stage without units has one segment, lit when done.
 */
export function levelBar(stage) {
  const u = stage.units;
  if (!u) {
    const done = stage.status === 'done';
    return { segments: [done], label: translate(done ? 'pipeline.levelDone' : 'pipeline.levelTodo') };
  }
  const count = Math.min(u.total, MAX_SEGMENTS);
  const on = u.total > MAX_SEGMENTS ? Math.floor((u.approved / u.total) * MAX_SEGMENTS) : u.approved;
  return { segments: Array.from({ length: count }, (_, i) => i < on), label: translate('pipeline.levelUnits', { approved: u.approved, total: u.total }) };
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

/** "aidlc-product-agent" -> "product" (US-0411 FR1.3). */
const agentShort = (agent) =>
  String(agent)
    .replace(/^aidlc-/, '')
    .replace(/-agent$/, '');

/** US-0411 FR2.4: the level bar's segments, read out by its label. */
function LevelBar({ stage }) {
  const bar = levelBar(stage);
  return (
    <Tooltip text={bar.label}>
      <span className="stage-level" role="img" aria-label={bar.label}>
        {bar.segments.map((on, i) => (
          <span key={i} className={`stage-level-seg ${on ? 'is-lit' : ''}`} />
        ))}
      </span>
    </Tooltip>
  );
}

/**
 * US-0411 FR1, FR3, FR5: a stage as an LCARS card. Name in the head; "NN · Status", flags, model and cost in the body;
 * agent, duration and the level bar in the foot. The card's colour comes from its state classes on the <li>.
 */
function StageBlock({ stage, index, open, onToggle, stageCost, stageModels, details }) {
  const { t } = useTranslation();
  const statusText = statusTextOf(t, stage);
  const extra = stage.current && stage.status !== 'in-progress' ? ` · ${t('pipeline.current')}` : '';
  const models = stage.current && stageModels?.length ? `${stageModels.map(shortModel).join(', ')} · ` : '';
  const code = [stage.agent ? agentShort(stage.agent) : null, stage.durationMs != null ? formatDuration(stage.durationMs) : null].filter(Boolean).join(' · ');
  const states = [
    `status-${stage.status}`,
    isSkipped(stage) && 'is-muted',
    stage.current && 'is-current',
    stage.mismatch && 'is-mismatch',
    stage.failed && 'is-failed'
  ];
  const mismatchTip = stage.mismatch ? t('pipeline.mismatchTitle', { status: String(stage.graphStatus) }) : null;
  const costTip = stageCost ? `${t('cost.label')} · ${tokenBreakdown(stageCost.tokens)}` : null;
  // US-0414 FR2.3: the parts' tooltips are hover-only; keyboard focus on the card shows them all.
  const focusText = [details, mismatchTip, costTip, levelBar(stage).label].filter(Boolean).join('\n');
  return (
    <li className={['stage', ...states].filter(Boolean).join(' ')}>
      <Tooltip text={details} focusText={focusText}>
        <button
          className={`lcars-card stage-card ${atRest(stage) ? '' : (EFFECT[stage.status] ?? (stage.current ? 'is-breathing' : ''))}`}
          onClick={onToggle}
          aria-expanded={open}
          data-testid="pipeline-stage"
        >
          <span className="lcars-card-head">
            <span className="stage-name">{stage.slug}</span>
          </span>
          <span className="lcars-card-body stage-top">
            <span>
              {index ?? '—'} · {statusText}
              {extra}
              {stage.mismatch && (
                <Tooltip text={mismatchTip}>
                  <span className="stage-flag"> · {t('pipeline.mismatch')}</span>
                </Tooltip>
              )}
              {stage.failed && <span className="stage-flag"> · {t('pipeline.failed', { outcome: String(stage.outcome) })}</span>}
            </span>
            <Tooltip text={costTip}>
              <span className="stage-cost" data-testid="pipeline-stage-cost">
                {stageCost ? `${models}${formatCost(stageCost)}` : ''}
              </span>
            </Tooltip>
          </span>
          <span className="lcars-card-foot">
            <span className="stage-code">{code}</span>
            <LevelBar stage={stage} />
          </span>
        </button>
      </Tooltip>
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
  // US-0028 FR1, FR2: a missing runtime-graph.json is normal on a new intent; say so only once stages are done without it.
  const timingsElsewhere = !hasGraph && pipeline.phases.some((p) => p.stages.some((s) => s.status === 'done'));

  return (
    <div className="pipeline" data-testid="pipeline">
      {timingsElsewhere && (
        <p className="muted" data-testid="pipeline-timings-note">
          {t('pipeline.noGraph')}
        </p>
      )}
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
