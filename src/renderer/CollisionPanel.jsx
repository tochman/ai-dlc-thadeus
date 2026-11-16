// US-1201 AC-2 (US-1202): the collision warning in the refresh panel. It reads team:collisions, which only uses the
// app's read-only git calls and the platform's pull requests: how far the branch is behind main, the other open pull
// requests that change the same files, and the files that would conflict (git merge-tree). It never fetches; the panel's
// Uppdatera does, and then bumps `refreshKey`. After a merge that went wrong, the merge note opens the intent's
// test-results.md in the editor with the "Efter merge med main" section added, unsaved, for the person to fill in.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useEditor } from './editor/EditorContext.jsx';
import Tooltip from './Tooltip.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function Behind({ behind, base }) {
  const { t } = useTranslation();
  const key = behind == null ? 'noBase' : behind > 0 ? 'behind' : 'upToDate';
  return (
    <p className={behind > 0 ? 'refresh-wait' : 'muted'} data-testid="collision-panel-behind">
      {t(`team.collision.${key}`, { n: behind ?? 0, base })}
    </p>
  );
}

function Conflicts({ files }) {
  const { t } = useTranslation();
  if (files == null) return <p className="muted">{t('team.collision.unknownConflicts')}</p>;
  if (files.length === 0) return <p className="muted">{t('team.collision.clean')}</p>;
  return (
    <p className="refresh-error" data-testid="collision-panel-conflicts">
      {t('team.collision.conflicts')}
      {files.map((f) => (
        <code key={f}>{f}</code>
      ))}
    </p>
  );
}

/** @param {{projectId: string, space: string, activeDirName: string|null, refreshKey: number}} props */
export default function CollisionPanel({ projectId, space, activeDirName, refreshKey }) {
  const { t } = useTranslation();
  const editor = useEditor();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    window.bridge.getCollisions(projectId).then(
      (r) => {
        if (!live) return;
        setResult(r);
        setError(null);
      },
      (err) => live && setError(errorText(err))
    );
    return () => {
      live = false;
    };
  }, [projectId, refreshKey]);

  async function openMergeNote() {
    try {
      const note = await window.bridge.getMergeNote(projectId, space, activeDirName);
      editor?.open(note.rel, { append: note.section });
    } catch (err) {
      setError(errorText(err));
    }
  }

  if (error && !result) {
    return (
      <p className="refresh-error" role="alert">
        {error}
      </p>
    );
  }
  if (!result?.isRepo) return null;
  return (
    <section className="lcars-card collision-panel" data-testid="collision-panel">
      <div className="lcars-card-head">
        <h3>{t('team.collision.title')}</h3>
      </div>
      <div className="lcars-card-body">
        <Behind behind={result.behind} base={result.base} />
        {result.error && (
          <p className="refresh-error" data-testid="collision-panel-error">
            {result.error.message}
          </p>
        )}
        {error && (
          <p className="refresh-error" role="alert">
            {error}
          </p>
        )}
        {!result.error && result.collisions.length === 0 && <p className="muted">{t('team.collision.noOverlap')}</p>}
        <ul className="refresh-list">
          {result.collisions.map((c) => (
            <li key={c.number} data-testid="collision-panel-pull">
              {t('team.collision.shared', { number: c.number, title: c.title })}
              <ul className="refresh-list">
                {c.shared.map((f) => (
                  <li key={f}>
                    <code>{f}</code>
                  </li>
                ))}
              </ul>
              <Conflicts files={c.conflicts} />
            </li>
          ))}
        </ul>
        {activeDirName && (
          <Tooltip text={t('team.collision.mergeNoteHelp')}>
            <button className="btn btn-quiet" onClick={openMergeNote} data-testid="collision-panel-merge-note">
              {t('team.collision.mergeNote')}
            </button>
          </Tooltip>
        )}
      </div>
    </section>
  );
}
