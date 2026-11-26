// US-1203 (was US-1201 AC-4): the intent's Review tab. "Needs you" first: AI-DLC questions waiting for an answer,
// NOT-READY review findings still standing, the pull request's change requests and unresolved threads, each with what
// to do and an action that opens the right place. Then the pull request (found by the story number in its branch or
// title) as a readout and its review threads, newest first, resolved ones folded. Approvals stay in Timeline.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatTime, stageTitle } from './format.js';
import { Pill, ReadoutTable, SectionHeading, useEntrance } from './Lcars.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** US-1203: the file a finding's review is in, `<stage>/reviews/review-NN.md` among the intent's files, or null. */
export function reviewFile(groups, stage, iteration) {
  const tail = `/${stage}/reviews/review-${String(iteration ?? 1).padStart(2, '0')}.md`;
  return (groups ?? []).flatMap((g) => g.files ?? []).find((f) => f.rel.endsWith(tail))?.rel ?? null;
}

function whereText(x, t) {
  if (!x.path) return t('team.review.conversation');
  return x.line != null ? t('team.review.where', { path: x.path, line: x.line }) : x.path;
}

/** Opens the comment on its platform through the window-open handler (main/index.js), the app's way out to the browser. */
function OpenOn({ url, platform }) {
  const { t } = useTranslation();
  if (!url) return null;
  return (
    <a className="lcars-pill lcars-pill--quiet" href={url} target="_blank" rel="noreferrer" data-testid="review-open">
      {t('team.review.action.open', { platform: platform?.name ?? '–' })}
    </a>
  );
}

function NeedRow({ need, data, files, onOpenFile }) {
  const { t } = useTranslation();
  const text = {
    question: () => t('team.review.needs.question', { text: need.text }),
    finding: () => t('team.review.needs.finding', { stage: stageTitle(need.stage ?? '–') }),
    changes: () => t('team.review.needs.changes', { author: need.author ?? '–' }),
    thread: () => t('team.review.needs.thread', { where: whereText(need, t), author: need.author ?? '–' })
  }[need.kind]();
  let action = <OpenOn url={need.url ?? data.pull?.url} platform={data.platform} />;
  if (need.kind === 'question') {
    action = (
      <Pill tone="primary" onClick={() => onOpenFile?.(need.file)}>
        {t('team.review.action.answer')}
      </Pill>
    );
  }
  if (need.kind === 'finding') {
    action = (
      <Pill tone="primary" onClick={() => onOpenFile?.(reviewFile(files, need.stage, need.iteration))}>
        {t('team.review.action.readReview')}
      </Pill>
    );
  }
  return (
    <li className="review-row lcars-strip--alert lcars-e-rise" data-testid="review-needs-row" data-kind={need.kind}>
      <p className="review-row-text">{text}</p>
      {action}
    </li>
  );
}

function Thread({ thread, platform }) {
  const { t } = useTranslation();
  const strip = thread.resolved ? 'done' : thread.resolved === false ? 'live' : 'quiet';
  return (
    <li className={`review-row review-thread lcars-strip--${strip}`} data-testid="review-thread">
      <div className="review-thread-head">
        <span className="review-thread-where" data-testid="review-thread-where">
          {whereText(thread, t)}
        </span>
        <OpenOn url={thread.url} platform={platform} />
      </div>
      <ul className="review-comments">
        {thread.comments.map((c, i) => (
          <li key={`${c.time}-${i}`} className="review-comment" data-testid="review-comment">
            <span className="story-comment-author">{c.author ?? '–'}</span>
            <time dateTime={c.time ?? undefined}>{formatTime(c.time)}</time>
            {c.state && <span className="lcars-chip">{t(`team.review.reviewState.${c.state}`)}</span>}
            <p className="story-comment-text">{c.body}</p>
          </li>
        ))}
      </ul>
    </li>
  );
}

function PullSection({ data }) {
  const { t } = useTranslation();
  const { pull, stories = [] } = data;
  if (!pull) {
    const text = stories.length ? t('team.review.noPull', { stories: stories.join(', '), first: stories[0] }) : t('team.review.noStory');
    return (
      <p className="muted" data-testid="review-no-pull">
        {text}
      </p>
    );
  }
  const states = pull.reviewers.map((r) => r.state);
  const state = states.includes('changes') ? 'changes' : states.includes('approved') ? 'approved' : 'waiting';
  const reviewers = pull.reviewers.length
    ? pull.reviewers.map((r) => t('team.review.reviewer', { author: r.author ?? '–', state: t(`team.review.reviewState.${r.state}`) })).join(', ')
    : t('team.review.noReviewers');
  const open = data.threads.filter((th) => !th.resolved);
  const resolved = data.threads.filter((th) => th.resolved);
  return (
    <div data-testid="review-pull">
      <p className="review-pull-title">{pull.title}</p>
      <ReadoutTable
        caption={t('team.review.pullCaption', { number: pull.number, title: pull.title })}
        columns={[
          { label: t('team.review.columns.number') },
          { label: t('team.review.columns.state'), value: true },
          { label: t('team.review.columns.reviewers') }
        ]}
        rows={[{ id: 'pull', cells: [`#${pull.number}`, t(`team.review.state.${state}`), reviewers] }]}
      />
      {data.threads.length === 0 && <p className="muted">{t('team.review.noThreads')}</p>}
      <ul className="review-list">
        {open.map((th) => (
          <Thread key={th.id} thread={th} platform={data.platform} />
        ))}
      </ul>
      {/* US-0050 item 7: the resolved threads open with the shared fold. */}
      {resolved.length > 0 && (
        <details className="review-resolved lcars-reveal" data-testid="review-resolved">
          <summary>{t('team.review.resolved', { n: resolved.length })}</summary>
          <ul className="review-list">
            {resolved.map((th) => (
              <Thread key={th.id} thread={th} platform={data.platform} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

/** @param {{projectId: string, space: string, dirName: string, files?: Array<object>, onOpenFile?: (rel: string|null) => void}} props */
export default function StoryComments({ projectId, space, dirName, files, onOpenFile }) {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const entering = useEntrance(`review:${dirName}`);

  useEffect(() => {
    let live = true;
    setData(null);
    window.bridge.getStoryComments(projectId, space, dirName).then(
      (d) => live && setData(d),
      (err) => live && setError(t('team.review.loadFailed', { error: errorText(err) }))
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
  if (!data) return <p className="muted">{t('team.review.loading')}</p>;
  return (
    <section className={`story-comments${entering ? ' is-entering' : ''}`} data-testid="review">
      <SectionHeading title={t('team.review.title')} as="h3" />
      <p className="muted" data-testid="review-description">
        {t('team.review.description')}
      </p>
      {data.error && (
        <p className="refresh-error" data-testid="review-error">
          {data.error.message}
        </p>
      )}
      <SectionHeading title={t('team.review.needsTitle')} as="h4" />
      {data.needs.length === 0 ? (
        <p className="muted" data-testid="review-needs-none">
          {t('team.review.nothing')}
        </p>
      ) : (
        <ul className="review-list">
          {data.needs.map((n, i) => (
            <NeedRow key={`${n.kind}-${i}`} need={n} data={data} files={files} onOpenFile={onOpenFile} />
          ))}
        </ul>
      )}
      <SectionHeading title={t('team.review.pullTitle')} as="h4" />
      <PullSection data={data} />
    </section>
  );
}
