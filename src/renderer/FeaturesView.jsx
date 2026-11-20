// Features view (EPIC-06 US-0602): epics and user stories from the project's feature docs. Read-only, except a
// story's release, which main writes as a "for vX.Y.Z" marker (US-0603 FR2). With the Releases delivery setting
// the view also lists releases (US-0603 FR3), where releases are made, filled and deleted by hand (US-0605); with
// Continuous deployment all of it is hidden (FR4.1, US-0605 FR5).
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileContent } from './ArtifactReader.jsx';
import { useEditor } from './editor/EditorContext.jsx';
import { Frame } from './Lcars.jsx';
import Tooltip from './Tooltip.jsx';
import { withSlots } from './format.js';
import { STATUS_MARKER } from '../main/parsers/features.js';
import { DELIVERY_DEFAULT, buildReleases, canDelete, newReleaseError, nextVersions, releaseOf, releaseOptions } from '../main/parsers/releases.js';
import { EMPTY_FILTERS, NO_RELEASE, filterOptions, isActive, matches, storyRows } from './storyFilter.js';
import { useFold } from './useFold.js'; // US-0415

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
// Pågår is steel (active), Klar and Driftsatt a light slate block, Planerad an outline (FR1.3, US-0603 FR6).
const STATUS_CLASS = { planned: 'tag', progress: 'tag tag-live', done: 'tag tag-done', deployed: 'tag tag-done' };

/**
 * Status as marker and text, never colour alone (NFR3), with the docs' own status text as its tooltip (US-0414 FR2.2).
 * `focusable` only where the badge stands alone; inside a row button a tab stop of its own would nest one in the button.
 */
export function StatusBadge({ status, text, focusable = false }) {
  const { t } = useTranslation();
  return (
    <Tooltip text={text || undefined} focusable={focusable}>
      <span className={STATUS_CLASS[status] ?? 'tag'}>
        {status ? `${STATUS_MARKER[status]} ${t(`features.status.${status}`)}` : text || t('features.unknownStatus')}
      </span>
    </Tooltip>
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
 * shows its release and no picker. A refused or failed write is shown under it. US-0608 FR1.2: `locked` and `write`
 * are the view's, so the picker and the release list share one lock.
 */
function ReleasePicker({ projectId, features, epic, story, locked, write }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const { planned, released } = releaseOf(story.statusText);
  if (released) return <p className="features-release">{t('features.release.releasedIn', { version: released })}</p>;
  const options = releaseOptions(features.epics, features.tags, features.plans); // plan files too (US-0605 FR2.1)
  if (planned && !options.includes(planned)) options.unshift(planned); // a stale marker still shows as chosen

  async function pick(value) {
    setError(null);
    try {
      const res = await write(() =>
        window.bridge.setStoryRelease(projectId, {
          storyId: story.id,
          version: value || null,
          epicHash: epic.hash,
          overviewHash: features.overviewHash
        })
      );
      if (res?.conflict) setError(t('features.release.conflict', { file: res.conflict }));
      else if (res?.error) setError(planningErrorText(t, res.error));
    } catch (err) {
      setError(t('features.release.failed', { error: errorText(err) }));
    }
  }

  return (
    <div className="features-release">
      <label className="field">
        <span className="field-label">{t('features.release.label')}</span>
        <select
          className="lcars-select"
          value={planned ?? ''}
          disabled={locked}
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

/** US-0605 FR1, FR1.1: the New release form, with the next patch, minor and major as suggestions that fill the input. */
function NewRelease({ tags, locked, onCreate }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(null); // null while closed
  const suggestions = nextVersions(tags);
  async function submit(e) {
    e.preventDefault();
    if (await onCreate(draft.trim())) setDraft(null);
  }
  return (
    <>
      <div className="features-release">
        <button className="btn btn-accent" disabled={locked} onClick={() => setDraft(draft === null ? '' : null)} data-testid="releases-new">
          {t('features.release.new.button')}
        </button>
      </div>
      {draft !== null && (
        <form className="features-release" onSubmit={submit}>
          <label className="field">
            <span className="field-label">{t('features.release.new.label')}</span>
            <input type="text" value={draft} placeholder="vX.Y.Z" onChange={(e) => setDraft(e.target.value)} autoFocus data-testid="releases-new-version" />
          </label>
          {suggestions.length > 0 && <span className="muted">{t('features.release.new.suggestions')}</span>}
          {suggestions.map((v) => (
            <button key={v} type="button" className="btn btn-quiet" onClick={() => setDraft(v)} data-testid="releases-new-suggestion">
              {v}
            </button>
          ))}
          <button type="submit" className="btn" disabled={locked} data-testid="releases-new-create">
            {t('features.release.new.create')}
          </button>
        </form>
      )}
    </>
  );
}

/** US-0608 FR1.2: the docs' hashes as one key, to tell the reload that belongs to a write from one that does not. */
const hashesOf = (f) => JSON.stringify([f?.overviewHash ?? null, (f?.epics ?? []).map((e) => e.hash ?? null), (f?.plans ?? []).map((p) => p.hash ?? null)]);

/** US-0607 FR3.5, US-0606 FR4.2: one sentence for a planning error from main ({kind, reason?, files?}). */
function planningErrorText(t, error) {
  const kind = ['offline', 'conflict', 'push', 'commit'].includes(error?.kind) ? error.kind : 'git';
  return t(`features.planning.error.${kind}`, { reason: error?.reason ?? '', files: (error?.files ?? []).join(', ') });
}

/** US-0608 FR7.1: one line for a waiting change: what it does, then its stories. */
function entryText(t, e) {
  // US-0609 FR3.8: a waiting app file (`.thadeus/`, a harness file) by its name.
  if (e.kind === 'thadeus') return t('features.planning.thadeus', { file: e.file });
  const what =
    e.kind === 'content' ? t('features.planning.entry.content', { file: e.file }) : t(`features.planning.entry.${e.kind}`, { version: e.version ?? 'none' });
  return e.storyIds?.length ? `${what} · ${t('features.planning.entry.stories', { ids: e.storyIds.join(', ') })}` : what;
}

/**
 * US-0608 FR5.3: a conflicting change names its file and offers Use mine, Keep theirs and Open both: the file in the
 * editor and the app's text read-only here.
 */
function PlanningConflict({ entry, busy, onResolve }) {
  const { t } = useTranslation();
  const editor = useEditor();
  const [both, setBoth] = useState(false);
  return (
    <>
      <span className="tag-warn" role="note">
        {t('features.planning.conflict', { file: entry.file })}
      </span>{' '}
      <button className="btn btn-quiet" disabled={busy} onClick={() => onResolve(entry.id, 'mine')} data-testid="planning-use-mine">
        {t('features.planning.useMine')}
      </button>
      <button className="btn btn-quiet" disabled={busy} onClick={() => onResolve(entry.id, 'theirs')} data-testid="planning-keep-theirs">
        {t('features.planning.keepTheirs')}
      </button>
      <button
        className="btn btn-quiet"
        onClick={() => {
          editor?.open(entry.file);
          setBoth(true);
        }}
        data-testid="planning-open-both"
      >
        {t('features.planning.openBoth')}
      </button>
      {both && (
        <pre className="code-block" aria-label={t('features.planning.mine')} data-testid="planning-mine">
          {entry.content}
        </pre>
      )}
    </>
  );
}

/**
 * US-0607 FR4.1, FR1.3, FR3.3–FR3.5, US-0608 FR7: the planning sub-block: each change still waiting, with its stories
 * and its target, Push now, and the last cycle's outcome. Nothing shows while nothing waits. The first read, as the
 * list opens, asks main to apply lost actions again (not from a story detail, `reapply` false); later reads follow
 * each reload of the docs, and every cycle main sends replaces the list (FR7.2).
 */
function PlanningSync({ projectId, features, reapply = true }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const opened = useRef(reapply);
  useEffect(() => {
    let live = true;
    const first = opened.current;
    opened.current = false;
    window.bridge
      .getPlanningStatus(projectId, first)
      .then((s) => live && setStatus(s))
      .catch((err) => live && setStatus({ pending: 0, error: { kind: 'git', reason: errorText(err) } }));
    return () => {
      live = false;
    };
  }, [projectId, features]);
  useEffect(() => window.bridge.onPlanningChanged?.((msg) => msg?.projectId === projectId && msg.status && setStatus(msg.status)), [projectId]);

  async function run(call) {
    setBusy(true);
    try {
      setStatus(await call());
    } catch (err) {
      setStatus((s) => ({ ...s, error: { kind: 'git', reason: errorText(err) } }));
    } finally {
      setBusy(false);
    }
  }
  const pushNow = () => run(() => window.bridge.pushPlanning(projectId));
  const resolve = (id, choice) => run(() => window.bridge.resolvePlanning(projectId, id, choice));

  const entries = status?.entries ?? [];
  if (!status || !(status.pending > 0 || entries.length > 0 || status.reapplied > 0 || status.prOffer || status.error)) return null;
  return (
    <div className="features-release" data-testid="planning-sync">
      <div className="lcars-heading">
        <h3 className="section-title">{t('features.planning.title')}</h3>
        <span className="lcars-heading-line" aria-hidden="true" />
      </div>
      {status.pending > 0 && <p data-testid="planning-pending">{t('features.planning.pending', { n: status.pending })}</p>}
      {entries.length > 0 && (
        <>
          {status.target && (
            <p className="muted" data-testid="planning-target">
              {t('features.planning.target', { target: status.target })}
            </p>
          )}
          <ul className="features-release-stories" aria-label={t('features.planning.title')}>
            {entries.map((e) => (
              <li key={e.id} data-testid="planning-entry">
                {entryText(t, e)} {e.state === 'conflict' && <PlanningConflict entry={e} busy={busy} onResolve={resolve} />}
              </li>
            ))}
          </ul>
        </>
      )}
      {status.reapplied > 0 && (
        <p role="status" data-testid="planning-reapplied">
          {t('features.planning.reapplied', { n: status.reapplied })}
        </p>
      )}
      {status.noRemote && status.pending > 0 && (
        <p className="muted" data-testid="planning-no-remote">
          {t('features.planning.noRemote')}
        </p>
      )}
      {status.error && (
        <p className="refresh-error" role="alert" data-testid="planning-error">
          {planningErrorText(t, status.error)}
        </p>
      )}
      {status.prOffer && <p data-testid="planning-pr-offer">{t('features.planning.prOffer', { branch: status.prOffer.branch })}</p>}
      {status.pending > 0 && !status.noRemote && (
        <button className="lcars-block lcars-block--sm" disabled={busy} onClick={pushNow} data-testid="planning-push-now">
          {t('features.planning.pushNow')}
        </button>
      )}
    </div>
  );
}

/** US-0605 FR3: the stories with no planned or released version, for a release's Add story picker. */
const storiesWithoutRelease = (epics) =>
  (epics ?? []).flatMap((e) =>
    (e.parsed?.stories ?? [])
      .filter((s) => {
        const { planned, released } = releaseOf(s.statusText);
        return !planned && !released;
      })
      .map((story) => ({ epicId: e.id, story }))
  );

/**
 * US-0603 FR3: every release from the markers, the tags and the plan files, newest first; a story opens its detail
 * (FR3.3). US-0605: New release, Add story and Remove under a planned release, and Delete for a deletable one. Writes
 * go through the view's shared lock (`locked`, `lockedWrite`, US-0608 FR1.2); a refusal or failure is said in one
 * sentence (NFR3).
 */
function ReleasesView({ projectId, features, onOpenStory, locked, lockedWrite }) {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const releases = buildReleases(features.epics, features.tags, features.plans);
  const unassigned = storiesWithoutRelease(features.epics);
  const bridge = window.bridge;

  async function write(call, failedKey) {
    setError(null);
    try {
      const res = await lockedWrite(call);
      if (res?.ok) return true;
      // US-0606 FR4.2: a refused commit names its reason and files; the change itself was kept.
      setError(res?.error ? planningErrorText(t, res.error) : t('features.release.conflict', { file: res?.conflict }));
    } catch (err) {
      setError(t(failedKey, { error: errorText(err) }));
    }
    return false;
  }
  function setStory(epicId, storyId, version) {
    const epicHash = features.epics.find((e) => e.id === epicId)?.hash;
    return write(() => bridge.setStoryRelease(projectId, { storyId, version, epicHash, overviewHash: features.overviewHash }), 'features.release.failed');
  }
  async function create(version) {
    const refused = newReleaseError(version, releases);
    if (refused) {
      setError(t(`features.release.new.${refused}`, { version }));
      return false;
    }
    return write(() => bridge.createRelease(projectId, version), 'features.release.new.failed');
  }

  return (
    <>
      <PlanningSync projectId={projectId} features={features} />
      <NewRelease tags={features.tags} locked={locked} onCreate={create} />
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
      {releases.length === 0 ? (
        <p className="muted">{t('features.releases.empty')}</p>
      ) : (
        <ul className="intent-rows" aria-label={t('features.releases.title')}>
          {releases.map((r) => (
            <li key={r.version} className="intent-row" data-testid="features-view-release">
              <span className="intent-row-top">
                <span className="intent-slug">{r.version}</span>
                <span className={r.released ? 'tag tag-done' : 'tag'}>
                  {!r.released
                    ? t('features.releases.planned')
                    : r.date
                      ? t('features.releases.releasedOn', { date: r.date })
                      : t('features.releases.released')}
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
                      <StatusBadge status={story.status} text={story.statusText} focusable />
                      {stale && <StaleFlag version={r.version} />}
                      {!r.released && (
                        <button
                          className="btn btn-quiet"
                          disabled={locked}
                          aria-label={t('features.release.removeLabel', { version: r.version })}
                          onClick={() => setStory(epicId, story.id, null)}
                          data-testid="releases-remove-story"
                        >
                          {t('features.release.remove')}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!r.released && (
                <span className="features-release">
                  {unassigned.length > 0 && (
                    <select
                      className="lcars-select"
                      value=""
                      disabled={locked}
                      aria-label={t('features.release.add')}
                      onChange={(e) => {
                        const pick = unassigned.find(({ story }) => story.id === e.target.value);
                        if (pick) setStory(pick.epicId, pick.story.id, r.version);
                      }}
                      data-testid="releases-add-story"
                    >
                      <option value="">{t('features.release.add')}</option>
                      {unassigned.map(({ story }) => (
                        <option key={story.id} value={story.id}>
                          {story.id}: {story.title}
                        </option>
                      ))}
                    </select>
                  )}
                  {canDelete(r) && (
                    <button
                      className="btn btn-quiet"
                      disabled={locked}
                      onClick={() => write(() => bridge.deleteRelease(projectId, { version: r.version, hash: r.plan.hash }), 'features.release.delete.failed')}
                      data-testid="releases-delete"
                    >
                      {t('features.release.delete.button')}
                    </button>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function StoryDetail({ id, story, links, onOpenIntent, release }) {
  const { t } = useTranslation();
  return (
    <div id={id} className="file-view features-story" role="region" aria-label={story.id} data-testid="features-view-story-detail">
      {release && <ReleasePicker {...release} story={story} />}
      {release && <PlanningSync projectId={release.projectId} features={release.features} reapply={false} />}
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

/**
 * US-0604 FR3, NFR2: labelled filters for state, release (when `options.releases`), epic (when `options.epics`),
 * priority, complexity and text, the polite count of matches, and Clear filters while any is set. Test ids are
 * `<prefix>-<field>`, so the Epics tab and the epic page each keep their own.
 */
function StoryFilters({ prefix, filters, setFilters, options, count }) {
  const { t } = useTranslation();
  const epicTitle = (id) => `${id}: ${options.epics.find((e) => e.id === id).title}`;
  const select = (key, testKey, label, values, name = (v) => v) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <select
        className="lcars-select"
        value={filters[key]}
        onChange={(e) => setFilters({ ...filters, [key]: e.target.value })}
        data-testid={`${prefix}-${testKey}`}
      >
        <option value="">{t('features.all')}</option>
        {values.map((v) => (
          <option key={v} value={v}>
            {name(v)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="filters" data-testid={`${prefix}s`}>
      {select('state', 'status', t('features.statusLabel'), options.states, (k) => t(`features.status.${k}`))}
      {options.releases &&
        select('release', 'release', t('features.release.label'), options.releases, (v) => (v === NO_RELEASE ? t('features.filter.noRelease') : v))}
      {options.epics &&
        select(
          'epic',
          'epic',
          t('features.filter.epic'),
          options.epics.map((e) => e.id),
          epicTitle
        )}
      {select('priority', 'priority', t('features.priority'), options.priorities)}
      {select('complexity', 'complexity', t('features.filter.complexity'), options.complexities)}
      <label className="field">
        <span className="field-label">{t('features.filter.text')}</span>
        <input type="search" value={filters.text} onChange={(e) => setFilters({ ...filters, text: e.target.value })} data-testid={`${prefix}-text`} />
      </label>
      <span className="muted" aria-live="polite" data-testid={`${prefix}-count`}>
        {t('features.filter.count', { n: count })}
      </span>
      {isActive(filters) && (
        <button className="btn btn-quiet" onClick={() => setFilters(EMPTY_FILTERS)} data-testid={`${prefix}-clear`}>
          {t('features.filter.clear')}
        </button>
      )}
    </div>
  );
}

/**
 * `features`: given with the Releases delivery setting, so each story gets its release picker (US-0603 FR2).
 * `releases`: the release filter's values, or null to hide it (US-0604 FR2, FR4.2).
 */
function EpicDetail({ projectId, epic, links, storyId, setStoryId, onOpenIntent, features, releases, lock }) {
  const { t } = useTranslation();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const stories = epic.parsed?.stories ?? [];
  const { states, priorities, complexities } = filterOptions([epic]);
  const shown = storyRows([epic])
    .filter((row) => matches(row, filters))
    .map((row) => row.story);
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
          <StoryFilters
            prefix="features-view-filter"
            filters={filters}
            setFilters={setFilters}
            options={{ states, priorities, complexities, releases }}
            count={shown.length}
          />
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
                        release={features ? { projectId, features, epic, ...lock } : null}
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
  const [filters, setFilters] = useState(EMPTY_FILTERS); // never saved: empty each time the view opens (US-0604 FR5)
  const fold = useFold('features'); // US-0415 FR5.1: the epic list folds to a strip
  const setTab = (id) => id !== tab && onTab?.(id); // Epics | Releases (US-0603 FR3.1)
  const releases = delivery === 'releases';
  const showReleases = releases && tab === 'releases';

  // US-0608 FR1.2: one lock for the release list and the story picker. A write that changed the docs here keeps it
  // until a load whose hashes differ from those it went out with; any other answer unlocks at once.
  // ponytail: a lost features:changed keeps the lock until the next reload; a timeout if that is ever seen.
  const hashes = hashesOf(features);
  const [sentWith, setSentWith] = useState(null);
  const locked = sentWith === hashes;
  useEffect(() => {
    if (sentWith !== null && sentWith !== hashes) setSentWith(null);
  }, [hashes, sentWith]);
  async function lockedWrite(call) {
    setSentWith(hashes);
    try {
      const res = await call();
      if (!(res?.ok && res.inPlace && res.changed)) setSentWith(null);
      return res;
    } catch (err) {
      setSentWith(null);
      throw err;
    }
  }

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
    const options = filterOptions(epics, features.tags, features.plans);
    if (!releases) options.releases = null; // hidden with Continuous deployment (US-0604 FR4.2)
    const found = storyRows(epics).filter((row) => matches(row, filters));
    body = (
      <div className="project-body">
        <aside className={`sidebar${fold.folded ? ' is-folded' : ''}`} aria-label={t('features.epics')} onClick={fold.folded ? fold.toggle : undefined}>
          <button {...fold.toggleProps} />
          <div className="lcars-heading">
            <h2 className="section-title">{t('features.epics')}</h2>
            <span className="lcars-heading-line" aria-hidden="true" />
            <span className="lcars-heading-meta">{t('features.count', { n: epics.length })}</span>
          </div>
          {features.intro && <p className="muted features-intro">{features.intro}</p>}
          <StoryFilters prefix="features-view-all-filter" filters={filters} setFilters={setFilters} options={options} count={found.length} />
          {isActive(filters) ? (
            // US-0604 FR1.1: the matches of every epic replace the epic list; a row opens the story on its epic's page.
            <ul className="intent-rows" aria-label={t('features.filter.matches')} data-testid="features-view-matches">
              {found.map(({ epicId: id, story }) => (
                <li key={story.id}>
                  <button className="intent-row" onClick={() => openStory(id, story.id)} data-testid="features-view-match">
                    <span className="intent-row-top">
                      <span className="intent-slug">
                        {story.id}: {story.title}
                      </span>
                      <StatusBadge status={story.status} text={story.statusText} />
                    </span>
                    <span className="muted">{id}</span>
                  </button>
                </li>
              ))}
              {found.length === 0 && <li className="muted">{t('features.noMatch')}</li>}
            </ul>
          ) : (
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
          )}
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
              releases={options.releases}
              lock={{ locked, write: lockedWrite }}
            />
          </Frame>
        </section>
      </div>
    );
    if (showReleases) {
      body = (
        <Frame>
          <ReleasesView projectId={projectId} features={features} onOpenStory={openStory} locked={locked} lockedWrite={lockedWrite} />
        </Frame>
      );
    }
  }

  // US-0036 FR2.4, FR2.5: where the planning comes from: the remote ref, the local branch without one, or this checkout.
  const source = features.source;
  const sourceText = !source
    ? null
    : source.inPlace
      ? t('features.source.here', { branch: source.branch })
      : t(source.remote ? 'features.source.remote' : 'features.source.local', { ref: source.ref });

  return (
    <div className="features-view" data-testid="features-view">
      {sourceText && (
        <p className="muted" data-testid="features-source">
          {sourceText}
        </p>
      )}
      {(features.warnings ?? []).map((w) => (
        <p key={w} className="banner banner-warn" role="status">
          {w}
        </p>
      ))}
      {body}
    </div>
  );
}
