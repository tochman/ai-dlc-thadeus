import { useState } from 'react';
import { COST_LABEL, STAGE_STATUS_LABEL, formatCost, formatDuration, formatTime, tokenBreakdown } from './format.js';

const filesForStage = (groups, slug) => groups.filter((g) => g.dir === slug || g.dir.endsWith(`/${slug}`));

/** @param {{stageCost?: object|null, stageModels?: string[]}} props from the ledger, when it has this stage (FR2.3, FR4.6) */
function StageRow({ stage, files, onOpenFile, stageCost, stageModels }) {
  const [open, setOpen] = useState(false);
  const muted = stage.mode === 'SKIP' || stage.status === 'skipped';
  const statusText = stage.mode === 'SKIP' ? 'Ingår inte (SKIP)' : STAGE_STATUS_LABEL[stage.status];
  const fileCount = files.reduce((n, g) => n + g.files.length, 0);

  return (
    <li className={`stage status-${stage.status} ${muted ? 'is-muted' : ''} ${stage.current ? 'is-current' : ''}`}>
      <button
        className="stage-row"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        disabled={fileCount === 0}
        data-testid="pipeline-stage"
      >
        <span className="stage-marker" aria-hidden="true" />
        <span className="stage-slug">{stage.slug}</span>
        <span className="status-text">{statusText}</span>
        {stage.current && <span className="tag tag-live">Aktuell</span>}
        {stage.mismatch && (
          <span
            className="tag tag-warn"
            title={`runtime-graph.json säger "${stage.graphStatus}", aidlc-state.md gäller`}
          >
            Avvikelse
          </span>
        )}
        <span className="stage-agent">
          {stage.agent ?? ''}
          {stageModels?.length ? ` · ${stageModels.join(', ')}` : ''}
        </span>
        <span className="stage-time">
          {formatTime(stage.startedAt)} → {stage.completedAt ? formatTime(stage.completedAt) : '…'}
        </span>
        <span className="stage-duration">{formatDuration(stage.durationMs)}</span>
        <span
          className="stage-cost"
          title={stageCost ? `${COST_LABEL} · ${tokenBreakdown(stageCost.tokens)}` : undefined}
          data-testid="pipeline-stage-cost"
        >
          {stageCost ? formatCost(stageCost) : ''}
        </span>
        <span className="stage-files">{fileCount ? `${fileCount} filer` : ''}</span>
      </button>
      {open && (
        <ul className="stage-file-list">
          {files.flatMap((g) =>
            g.files.map((f) => (
              <li key={f.rel}>
                <button className="link" onClick={() => onOpenFile(f.rel)} data-testid="pipeline-stage-file">
                  {g.dir}/{f.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
  );
}

export default function Pipeline({ pipeline, files, hasGraph, onOpenFile, cost }) {
  const stageCost = new Map((cost?.byStage ?? []).map((r) => [r.name, r]));
  if (pipeline.phases.length === 0) return <p className="muted">aidlc-state.md saknas eller har inga stages ännu.</p>;
  return (
    <div className="pipeline" data-testid="pipeline">
      {!hasGraph && (
        <p className="muted">runtime-graph.json saknas (den är git-ignorerad). Status kommer från aidlc-state.md.</p>
      )}
      {pipeline.phases.map((phase) => (
        <section key={phase.name} className="phase panel elbow-left">
          <h3 className="section-title">{phase.name}</h3>
          <ol className="stages">
            {phase.stages.map((s) => (
              <StageRow
                key={s.slug}
                stage={s}
                files={filesForStage(files, s.slug)}
                onOpenFile={onOpenFile}
                stageCost={stageCost.get(s.slug)}
                stageModels={cost?.stageModels[s.slug]}
              />
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
