// Features view (EPIC-06 US-0602): epics and user stories from the project's feature docs. Read-only, except a
// story's release, which main writes as a "for vX.Y.Z" marker (US-0603 FR2). With the Releases delivery setting
// the view also lists releases (US-0603 FR3); with Continuous deployment both are hidden (FR4.1).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileContent } from './ArtifactReader.jsx';
import { useEditor } from './editor/EditorContext.jsx';
import { Frame } from './Lcars.jsx';
import { withSlots } from './format.js';
import { STATUS_MARKER } from '../main/parsers/features.js';
import { DELIVERY_DEFAULT, buildReleases, releaseOf, releaseOptions } from '../main/parsers/releases.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
// Pågår is steel (active), Klar and Driftsatt a light slate block, Planerad an outline (FR1.3, US-0603 FR6).
const STATUS_CLASS = { planned: 'tag', progress: 'tag tag-live', done: 'tag tag-done', deployed: 'tag tag-done' };
const STATUSES = Object.keys(STATUS_MARKER);

/** Status as marker and text, never colour alone (NFR3). */
export function StatusBadge({ status, text }) {
  const { t } = useTranslation();
  return (
    <span className={STATUS_CLASS[status] ?? 'tag'} title={text || undefined}>
      {status ? `${STATUS_MARKER[status]} ${t(`features.status.${status}`)}` : text || t('features.unknownStatus')}
    </span>
  );
}

const storiesDone = (epic) => (epic.parsed?.stories ?? []).filter((s) => s.status === 'done').length;

function FormatHelp({ path, reason, onSetup }) {
  const { t } = useTranslation();
  return (
    <div className="panel features-empty" data-testid="features-view-empty">
      <h2>{t('features.emptyTitle')}</h2>
      {reason ? <p className="refresh-error">{reason}</p> : <p>{withSlots('features.noOverview', { path: <code>{path}</code> })}</p>}
      <p>
        {withSlots('features.formatHelp', {
          folder: <code>docs/features/</code>,
          example: <code>{t('features.exampleStory')}</code>
        })}
      </p>
      {onSetup && (
        <button className="btn btn-accent" onClick={onSetup} data-testid="features-view-setup">
          {t('features.setup')}
        </button>
      )}
    </div>
  );
}

function FileActions({ projectId, rel }) {
  const { t } = useTranslation();
  const editor = useEditor(); // the epic file opens in the app's editor (EPIC-10 US-1001)
  const [error, setError] = useState(null);
  const bridge = window.bridge;
  async function act(fn) {
    try {
      setError(null);
      await fn(projectId, rel);
    } catch (err) {
      setError(errorText(err));
    }
  }
  return (
    <div className="file-actions">
      <code className="file-path">{rel}</code>
      {editor && (
        <button className="btn btn-accent" onClick={() => editor.open(rel)} data-testid="features-view-edit">
          {t('common.edit')}
        </button>
      )}
      <button className="btn" onClick={() => act(bridge.revealInFinder)} data-testid="features-view-reveal">
        {bridge.platform === 'darwin' ? t('common.revealFinder') : t('common.revealFiles')}
      </button>
      <button className="btn btn-quiet" onClick={() => act(bridge.openInEditor)} data-testid="features-view-open-editor">
        {t('common.openInEditor')}
      </button>
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const isTagged = (tags, version) => (tags ?? []).some((tag) => tag.name === version);

/** US-0603 FR7: a story still marked "for vX.Y.Z" when tag vX.Y.Z exists. */
function StaleFlag({ version }) {
  const { t } = useTranslation();
  return (
    <span className="tag-warn" role="note" data-testid="features-view-release-stale">
      {t('features.release.stale', { version })}
    </span>
  );
}

/**
 * US-0603 FR2.1–FR2.4: the story's release, as a picker of the planned and next versions and None. A released story
 * shows its release and no picker. A refused or failed write is shown under it.
 */
function ReleasePicker({ projectId, features, epic, story }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const { planned, released } = releaseOf(story.statusText);
  if (released) return <p className="features-release">{t('features.release.releasedIn', { version: released })}</p>;
  const options = releaseOptions(features.epics, features.tags);
  if (planned && !options.includes(planned)) options.unshift(planned); // a stale marker still shows as chosen

  async function pick(value) {
    setBusy(true);
    setError(null);
    try {
      const res = await window.bridge.setStoryRelease(projectId, {
        storyId: story.id,
        version: value || null,
        epicHash: epic.hash,
        overviewHash: features.overviewHash
      });
      if (res?.conflict) setError(t('features.release.conflict', { file: res.conflict }));
    } catch (err) {
      setError(t('features.release.failed', { error: errorText(err) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="features-release">
      <label className="field">
        <span className="field-label">{t('features.release.label')}</span>
        <select
          className="lcars-select"
          value={planned ?? ''}
          disabled={busy}
          onChange={(e) => pick(e.target.value)}
          data-testid="features-view-release-picker"
        >
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
          <option value="">{t('features.release.none')}</option>
        </select>
      </label>
      {planned && isTagged(features.tags, planned) && <StaleFlag version={planned} />}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** US-0603 FR3: every release from the markers and the tags, newest first; a story opens its detail (FR3.3). */
function ReleasesView({ features, onOpenStory }) {
  const { t } = useTranslation();
  const releases = buildReleases(features.epics, features.tags);
  if (releases.length === 0) return <p className="muted">{t('features.releases.empty')}</p>;
  return (
    <ul className="intent-rows" aria-label={t('features.releases.title')}>
      {releases.map((r) => (
        <li key={r.version} className="intent-row" data-testid="features-view-release">
          <span className="intent-row-top">
            <span className="intent-slug">{r.version}</span>
            <span className={r.released ? 'tag tag-done' : 'tag'}>
              {!r.released ? t('features.releases.planned') : r.date ? t('features.releases.releasedOn', { date: r.date }) : t('features.releases.released')}
            </span>
          </span>
          <span className="muted">{t('features.releases.storyCount', { n: r.stories.length })}</span>
          {r.stories.length > 0 && (
            <ul className="features-release-stories">
              {r.stories.map(({ epicId, story, stale }) => (
                <li key={story.id}>
                  <button className="btn btn-quiet" onClick={() => onOpenStory(epicId, story.id)}>
                    {story.id}: {story.title}
                  </button>{' '}
                  <StatusBadge status={story.status} text={story.statusText} />
                  {stale && <StaleFlag version={r.version} />}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function StoryDetail({ id, story, links, onOpenIntent, release }) {
  const { t } = useTranslation();
  return (
    <div id={id} className="file-view features-story" role="region" aria-label={story.id} data-testid="features-view-story-detail">
      {release && <ReleasePicker {...release} story={story} />}
      {links.length > 0 && (
        <p className="features-links">
          <span className="field-label">{t('features.intents')}</span>
          {links.map((dir) => (
            <button key={dir} className="btn btn-quiet" onClick={() => onOpenIntent?.(dir)} data-testid="features-view-intent-link">
              {dir}
            </button>
          ))}
        </p>
      )}
      <FileContent rel="story.md" content={story.raw} />
    </div>
  );
}

/** `features`: given with the Releases delivery setting, so each story gets its release picker (US-0603 FR2). */
function EpicDetail({ projectId, epic, links, storyId, setStoryId, onOpenIntent, features }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const stories = epic.parsed?.stories ?? [];
  const priorities = [...new Set(stories.map((s) => s.priority).filter(Boolean))];
  const shown = stories.filter((s) => (!status || s.status === status) && (!priority || s.priority === priority));
  const openRef = useRef(null);
  // The opened story, from a click or an intent's story link, is scrolled into view (FR2.6).
  useEffect(() => {
    openRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [storyId]);

  return (
    <div className="features-epic">
      <header className="features-epic-head">
        <h2>
          {epic.id}: {epic.parsed?.title || epic.title}
        </h2>
        {epic.parsed?.intro && stories.length > 0 && (
          <div className="features-epic-intro" data-testid="features-view-epic-intro">
            <FileContent rel="intro.md" content={epic.parsed.intro} />
          </div>
        )}
        {epic.file && <FileActions projectId={projectId} rel={epic.file} />}
        {(epic.parsed?.warnings ?? []).map((w) => (
          <p key={w} className="tag-warn" role="note">
            {w}
          </p>
        ))}
      </header>
      {!epic.parsed && <p className="muted">{t('features.epicUnreadable')}</p>}
      {epic.parsed && stories.length === 0 && (
        <div className="file-view" data-testid="features-view-fallback">
          <FileContent rel={epic.file} content={epic.parsed.raw} />
        </div>
      )}
      {stories.length > 0 && (
        <>
          <div className="filters">
            <label className="field">
              <span className="field-label">{t('features.statusLabel')}</span>
              <select className="lcars-select" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="features-view-filter-status">
                <option value="">{t('features.all')}</option>
                {STATUSES.map((k) => (
                  <option key={k} value={k}>
                    {t(`features.status.${k}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">{t('features.priority')}</span>
              <select className="lcars-select" value={priority} onChange={(e) => setPriority(e.target.value)} data-testid="features-view-filter-priority">
                <option value="">{t('features.all')}</option>
                {priorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <ul className="intent-rows">
            {shown.map((s) => {
              const open = s.id === storyId;
              return (
                <li key={s.id} ref={open ? openRef : undefined}>
                  <button
                    className={`intent-row features-story-row ${open ? 'is-selected' : ''}`}
                    aria-expanded={open}
                    aria-controls={open ? `story-${s.id}` : undefined}
                    onClick={() => setStoryId(open ? null : s.id)}
                    data-testid="features-view-story"
                  >
                    <span className="intent-row-top">
                      <span className="intent-slug">
                        {s.id}: {s.title}
                      </span>
                      <StatusBadge status={s.status} text={s.statusText} />
                    </span>
                    <span className="intent-row-meta">
                      {s.priority && <span>{t('features.priorityValue', { value: s.priority })}</span>}
                      {s.complexity && <span>{t('features.complexityValue', { value: s.complexity })}</span>}
                      <span>{t('features.criteria', { done: s.done, total: s.total })}</span>
                      {links[s.id] && <span>{t('features.intentCount', { n: links[s.id].length })}</span>}
                    </span>
                  </button>
                  {open && (
                    <div className="features-story-reveal">
                      <StoryDetail
                        id={`story-${s.id}`}
                        story={s}
                        links={links[s.id] ?? []}
                        onOpenIntent={onOpenIntent}
                        release={features ? { projectId, features, epic } : null}
                      />
                    </div>
                  )}
                </li>
              );
            })}
            {shown.length === 0 && <li className="muted">{t('features.noMatch')}</li>}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * @param {{projectId: string, features: object|null, links: Record<string, string[]>, focusStory?: {id: string}|null,
 *          delivery?: 'releases'|'continuous', onOpenIntent?: (dirName: string) => void, onSetup?: () => void,
 *          tab?: 'epics'|'releases', onTab?: (id: string) => void}} props
 *   tab, onTab: Epics | Releases, chosen in the left arm like every other section (US-0012)
 */
export default function FeaturesView({
  projectId,
  features,
  links = {},
  focusStory = null,
  delivery = DELIVERY_DEFAULT,
  onOpenIntent,
  onSetup,
  tab = 'epics',
  onTab
}) {
  const { t } = useTranslation();
  const epics = features?.available ? features.epics : [];
  const [epicId, setEpicId] = useState(null);
  const [storyId, setStoryId] = useState(null);
  const setTab = (id) => id !== tab && onTab?.(id); // Epics | Releases (US-0603 FR3.1)
  const releases = delivery === 'releases';
  const showReleases = releases && tab === 'releases';

  // A story link from an intent opens that story (FR2.6).
  useEffect(() => {
    const epic = focusStory && epics.find((e) => e.parsed?.stories.some((s) => s.id === focusStory.id));
    if (!epic) return;
    setTab('epics');
    setEpicId(epic.id);
    setStoryId(focusStory.id);
  }, [focusStory, features]);

  /** A story in the Releases view opens under its epic, as in the epic view (US-0603 FR3.3). */
  function openStory(epic, story) {
    setTab('epics');
    setEpicId(epic);
    setStoryId(story);
  }

  if (!features)
    return (
      <p className="muted" data-testid="features-view">
        {t('features.reading')}
      </p>
    );

  let body;
  if (!features.available) {
    body = <FormatHelp path={features.overviewPath} reason={features.reason} onSetup={onSetup} />;
  } else if (epics.length === 0) {
    // Nothing could be read as epics: show the overview as Markdown instead of an empty view (FR1.4).
    body = (
      <div className="file-view" data-testid="features-view-fallback">
        <FileContent rel={features.overviewPath} content={features.overviewText} />
      </div>
    );
  } else {
    const epic = epics.find((e) => e.id === epicId) ?? epics[0];
    body = (
      <div className="project-body">
        <aside className="sidebar" aria-label={t('features.epics')}>
          <div className="lcars-heading">
            <h2 className="section-title">{t('features.epics')}</h2>
            <span className="lcars-heading-line" aria-hidden="true" />
            <span className="lcars-heading-meta">{t('features.count', { n: epics.length })}</span>
          </div>
          {features.intro && <p className="muted features-intro">{features.intro}</p>}
          <ul className="intent-rows" aria-label={t('features.epics')}>
            {epics.map((e) => {
              const total = e.parsed?.stories.length ?? 0;
              return (
                <li key={e.id}>
                  <button
                    className={`intent-row ${e.id === epic.id ? 'is-selected' : ''}`}
                    aria-current={e.id === epic.id}
                    onClick={() => {
                      setEpicId(e.id);
                      setStoryId(null);
                    }}
                    data-testid="features-view-epic"
                  >
                    <span className="intent-row-top">
                      <span className="intent-slug">
                        {e.id}: {e.title}
                      </span>
                    </span>
                    <span className="muted">{e.topic}</span>
                    <span className="intent-row-meta">
                      <StatusBadge status={e.statusKind} text={e.status} />
                      <span>{e.parsed ? t('features.storiesDone', { done: storiesDone(e), total }) : t('features.unreadable')}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
        <section className="content">
          <Frame>
            <EpicDetail
              key={epic.id}
              projectId={projectId}
              epic={epic}
              links={links}
              storyId={storyId}
              setStoryId={setStoryId}
              onOpenIntent={onOpenIntent}
              features={releases ? features : null}
            />
          </Frame>
        </section>
      </div>
    );
    if (showReleases) {
      body = (
        <Frame>
          <ReleasesView features={features} onOpenStory={openStory} />
        </Frame>
      );
    }
  }

  return (
    <div className="features-view" data-testid="features-view">
      {(features.warnings ?? []).map((w) => (
        <p key={w} className="banner banner-warn" role="status">
          {w}
        </p>
      ))}
      {body}
    </div>
  );
}
