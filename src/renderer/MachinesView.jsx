// US-1201 AC-3: who works on what across my machines, a section of the team view in the left arm. Per intent: the
// machines that worked on it (host and clone from the audit shard names), their last stage and when. Then origin's story
// branches with commits that are not in main, and the same story on two machines or two branches as a possible collision.
// Read-only: team:machines reads the shards and the remote refs git already has; nothing is fetched here.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime, stageTitle } from './format.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const FLAG_KEY = { machines: 'team.machines.onMachines', branches: 'team.machines.onBranches' };

function Flag({ flag }) {
  const { t } = useTranslation();
  return (
    <li data-testid="machines-view-flag">
      <span className="lcars-chip lcars-chip--warn">{t('team.machines.collision')}</span>
      {t(FLAG_KEY[flag.kind], { story: flag.story, n: flag.where.length, where: flag.where.join(', ') })}
    </li>
  );
}

function IntentMachines({ intent, flagged }) {
  const { t } = useTranslation();
  return (
    <div className="lcars-card machines-intent" data-testid="machines-view-intent">
      <div className="lcars-card-head">
        <h3>{intent.slug ?? intent.dirName}</h3>
        {intent.stories.map((s) => (
          <span key={s} className="lcars-chip">
            {s}
          </span>
        ))}
        {flagged && <span className="lcars-chip lcars-chip--warn">{t('team.machines.collision')}</span>}
      </div>
      <div className="lcars-card-body">
        <table className="machines-table">
          <thead>
            <tr>
              <th>{t('team.machines.host')}</th>
              <th>{t('team.machines.clone')}</th>
              <th>{t('team.machines.lastStage')}</th>
              <th>{t('team.machines.lastAt')}</th>
            </tr>
          </thead>
          <tbody>
            {intent.machines.map((m) => (
              <tr key={`${m.host}-${m.cloneId}`}>
                <td>{m.host}</td>
                <td>
                  <code>{m.cloneId}</code>
                </td>
                <td>{m.lastStage ? stageTitle(m.lastStage) : '–'}</td>
                <td>
                  <time dateTime={m.lastAt}>{formatTime(m.lastAt)}</time>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** @param {{projectId: string, space: string}} props */
export default function MachinesView({ projectId, space }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    window.bridge.getMachines(projectId, space).then(
      (d) => live && setData(d),
      (err) => live && setError(t('team.machines.loadFailed', { error: errorText(err) }))
    );
    return () => {
      live = false;
    };
  }, [projectId, space, t]);

  const withShards = data?.intents.filter((i) => i.machines.length > 0) ?? [];
  const flaggedStories = new Set((data?.flags ?? []).map((f) => f.story));
  return (
    <section className="machines-view" data-testid="machines-view">
      <div className="lcars-heading">
        <span className="section-title">{t('team.machines.title')}</span>
        <span className="lcars-heading-line" aria-hidden="true" />
        <span className="lcars-heading-meta">{t('team.machines.meta')}</span>
      </div>
      <p className="muted">{t('team.machines.intro')}</p>
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
      {data && (
        <>
          {data.flags.length > 0 && (
            <ul className="refresh-list machines-flags">
              {data.flags.map((f) => (
                <Flag key={`${f.story}-${f.kind}`} flag={f} />
              ))}
            </ul>
          )}
          {withShards.length === 0 && <p className="muted">{t('team.machines.none')}</p>}
          {withShards.map((i) => (
            <IntentMachines key={i.dirName} intent={i} flagged={i.inProgress && i.stories.some((s) => flaggedStories.has(s))} />
          ))}
          <h3 className="section-title">{t('team.machines.branches')}</h3>
          {data.branches.length === 0 && <p className="muted">{t('team.machines.noBranches')}</p>}
          <ul className="refresh-list">
            {data.branches.map((b) => (
              <li key={b.branch} data-testid="machines-view-branch">
                <code>{b.branch}</code> · {t('team.machines.branchAhead', { n: b.ahead })}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
