// US-1201 AC-4: the intent's comments tab: the comments and reviews of the story's pull request (found by the story
// number in its branch or title) with AI-DLC's open questions, approvals and review findings for the intent, oldest
// first. Each row shows its source, author and time. Read-only; a platform failure shows beside the AI-DLC rows.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime, stageTitle } from './format.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function rowText(row, t) {
  if (row.source === 'approval') return t('team.comments.approvedStage', { stage: stageTitle(row.stage ?? '–') });
  if (row.source === 'finding') return t('team.comments.verdict', { stage: stageTitle(row.stage ?? '–'), verdict: row.text });
  if (row.source === 'review') return row.text || t(`team.comments.reviewState.${row.state}`);
  return row.text;
}

function Row({ row }) {
  const { t } = useTranslation();
  return (
    <li className="lcars-card story-comment" data-testid="story-comments-row">
      <div className="lcars-card-head">
        <span className="lcars-chip" data-testid="story-comments-source">
          {t(`team.comments.source.${row.source}`)}
        </span>
        <span className="story-comment-author">{row.author ?? '–'}</span>
        <time dateTime={row.time ?? undefined}>{formatTime(row.time)}</time>
      </div>
      <div className="lcars-card-body">
        <p className="story-comment-text">{rowText(row, t)}</p>
      </div>
    </li>
  );
}

/** @param {{projectId: string, space: string, dirName: string}} props */
export default function StoryComments({ projectId, space, dirName }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    setData(null);
    window.bridge.getStoryComments(projectId, space, dirName).then(
      (d) => live && setData(d),
      (err) => live && setError(t('team.comments.loadFailed', { error: errorText(err) }))
    );
    return () => {
      live = false;
    };
  }, [projectId, space, dirName, t]);

  if (error) {
    return (
      <p className="refresh-error" role="alert">
        {error}
      </p>
    );
  }
  if (!data) return <p className="muted">{t('team.comments.loading')}</p>;
  return (
    <section className="story-comments" data-testid="story-comments">
      {data.pull ? (
        <p className="section-title" data-testid="story-comments-pull">
          {t('team.comments.pull', { number: data.pull.number, title: data.pull.title })}
        </p>
      ) : (
        data.rows.length > 0 && <p className="muted">{t('team.comments.noPull')}</p>
      )}
      {data.error && (
        <p className="refresh-error" data-testid="story-comments-error">
          {data.error.message}
        </p>
      )}
      {data.rows.length === 0 ? (
        <p className="muted" data-testid="story-comments-empty">
          {t('team.comments.empty')}
        </p>
      ) : (
        <ul className="story-comments-list">
          {data.rows.map((row, i) => (
            <Row key={`${row.source}-${row.time}-${i}`} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}
