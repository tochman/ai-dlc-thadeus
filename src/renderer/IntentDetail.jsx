import { useState } from 'react';
import Pipeline from './Pipeline.jsx';
import Timeline from './Timeline.jsx';
import BoltDag from './BoltDag.jsx';
import ArtifactReader from './ArtifactReader.jsx';
import CostTab from './CostTab.jsx';
import { isInFlight } from './format.js';

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'timeline', label: 'Tidslinje' },
  { id: 'units', label: 'Units' },
  { id: 'cost', label: 'Kostnad' },
  { id: 'files', label: 'Filer' }
];

export default function IntentDetail({ projectId, detail, intent, newSeqFrom, cost, models }) {
  const [tab, setTab] = useState('pipeline');
  const [openFile, setOpenFile] = useState(null);
  const { state, pipeline } = detail;
  const intentCost = cost?.available ? cost.perIntent[detail.dirName] ?? null : null;

  function showFile(rel) {
    setOpenFile(rel);
    setTab('files');
  }

  return (
    <article className="intent-detail" data-testid="intent-detail">
      <header className="panel elbow-top intent-header">
        <div className="intent-title-row">
          <h2>{intent?.slug ?? detail.dirName}</h2>
          {isInFlight(intent?.status) && (
            <span className="tag tag-live">
              <span className="live-dot" aria-hidden="true" /> Live
            </span>
          )}
          {detail.stale && <span className="tag tag-warn">Visar senaste giltiga data</span>}
        </div>
        <dl className="facts">
          <div>
            <dt>Scope</dt>
            <dd>{intent?.scope ?? state?.scope ?? '–'}</dd>
          </div>
          <div>
            <dt>Depth</dt>
            <dd>{state?.depth ?? '–'}</dd>
          </div>
          <div>
            <dt>Test strategy</dt>
            <dd>{state?.testStrategy ?? '–'}</dd>
          </div>
          <div>
            <dt>Stages</dt>
            <dd>
              {pipeline.done}/{pipeline.executed} klara
            </dd>
          </div>
          <div>
            <dt>Aktuell stage</dt>
            <dd>{state?.currentStage ?? '–'}</dd>
          </div>
          {detail.directive?.stage && (
            <div>
              <dt>Direktiv</dt>
              <dd>
                {detail.directive.kind} · {detail.directive.stage} · {detail.directive.delivery}
              </dd>
            </div>
          )}
        </dl>
        {detail.request && <p className="request-text">{detail.request}</p>}
        {detail.warnings.map((w) => (
          <p key={w} className="banner banner-warn" role="status">
            {w}
          </p>
        ))}
      </header>

      <div className="detail-tabs" role="tablist" aria-label="Intent-vyer">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`detail-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => setTab(t.id)}
            data-testid={`intent-detail-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="detail-body" role="tabpanel">
        {tab === 'pipeline' && (
          <Pipeline pipeline={pipeline} files={detail.files} hasGraph={!!detail.graph} onOpenFile={showFile} cost={intentCost} />
        )}
        {tab === 'cost' && <CostTab cost={cost} intentCost={intentCost} pipeline={pipeline} models={models} />}
        {tab === 'timeline' && <Timeline events={detail.events} newSeqFrom={newSeqFrom} />}
        {tab === 'units' && <BoltDag dag={detail.graph?.boltDag ?? null} statuses={detail.units} />}
        {tab === 'files' && (
          <ArtifactReader projectId={projectId} groups={detail.files} selected={openFile} onSelect={setOpenFile} />
        )}
      </div>
    </article>
  );
}
