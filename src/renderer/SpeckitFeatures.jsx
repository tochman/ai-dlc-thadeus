// US-1402 FR6 (contract C5): a Spec Kit project's features. Reads `speckit:features` on mount and on each
// `speckit:changed` push (NFR7.4), shows the version warning (BR6.9), the list with the active mark (BR6.1, BR6.2)
// or the empty state (BR6.8), the selected feature's detail, its file read-only (NFR3.2), and what could not be read (BR6.10).
// US-1403 FR5.2: the quick commands above the list, also in the empty state, where specify starts the first feature (BR5.9).
// US-1411 FR3: the list and the count leave archived features out; the "Archived (N)" filter shows them alone.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileView } from './ArtifactReader.jsx';
import SpeckitArchive from './SpeckitArchive.jsx';
import SpeckitFeatureDetail from './SpeckitFeatureDetail.jsx';
import SpeckitQuickCommands from './SpeckitQuickCommands.jsx';
import { TabIn, stagger } from './Lcars.jsx';

const ALL = '';
const ARCHIVED = 'archived';
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** @param {{projectId: string, onMeta?: (projectId: string, partial: object) => void}} props */
export default function SpeckitFeatures({ projectId, onMeta }) {
  const { t } = useTranslation();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [openFile, setOpenFile] = useState(null);
  const [filter, setFilter] = useState(ALL);
  const listRef = useRef(null);
  const alive = useRef(true);

  const load = useCallback(
    () =>
      Promise.resolve()
        .then(() => window.bridge.speckitFeatures(projectId))
        .then(
          (r) => {
            if (!alive.current) return;
            setResult(r);
            setError(null);
            // AC4.1.1: the selection stays while its folder exists, otherwise the active feature.
            setSelected((prev) => (prev && r.features.some((f) => f.dir === prev) ? prev : r.active));
          },
          (err) => alive.current && setError(errorText(err))
        ),
    [projectId]
  );

  useEffect(() => {
    alive.current = true;
    load();
    const off = window.bridge.onSpeckitChanged((e) => {
      if (e?.projectId === projectId) load();
    });
    return () => {
      alive.current = false;
      off?.();
    };
  }, [projectId, load]);

  const archived = result?.features.filter((f) => f.archived) ?? [];
  if (filter === ARCHIVED && archived.length === 0) setFilter(ALL); // US-1411 FR3.3: the last one came back
  const visible = filter === ARCHIVED ? archived : (result?.features.filter((f) => !f.archived) ?? []);
  const getList = useCallback(() => listRef.current, []);

  // US-0048 L1: "N features" at the foot of the left arm, without the archived ones (US-1411 FR3.1); a failed read keeps
  // the last count.
  const featureCount = result ? result.features.length - archived.length : undefined;
  useEffect(() => {
    if (featureCount !== undefined) onMeta?.(projectId, { featureCount });
  }, [projectId, featureCount, onMeta]);

  const select = (dir) => {
    setSelected(dir);
    setOpenFile(null);
  };
  const feature = result?.features.find((f) => f.dir === selected) ?? null;
  const version = result?.version;
  const activeName = result?.features.find((f) => f.dir === result.active)?.name ?? null;

  return (
    <div className="speckit-features" data-testid="speckit-features-root">
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      {!result && !error && <p className="muted">{t('speckit.empty')}</p>}
      {version && !version.supported && (
        <p className="banner banner-warn" role="status" data-testid="speckit-features-version-warning">
          {version.found ? t('speckit.features.versionWarning', { version: version.found }) : t('speckit.features.versionUnknown')}
        </p>
      )}

      {result && <SpeckitQuickCommands projectId={projectId} />}

      {result && result.features.length === 0 && (
        <p className="muted" data-testid="speckit-features-empty">
          {t('speckit.features.empty')}
        </p>
      )}

      {result && result.features.length > 0 && (
        <div className="speckit-layout">
          <nav aria-label={t('speckit.features.title')}>
            <h3 className="section-title">{t('speckit.features.title')}</h3>
            {archived.length > 0 && (
              <div className="filters">
                <select
                  className="lcars-select"
                  aria-label={t('speckit.archive.filterLabel')}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  data-testid="speckit-features-filter"
                >
                  <option value={ALL}>{t('speckit.archive.all')}</option>
                  <option value={ARCHIVED}>{t('intents.archive.filter', { n: archived.length })}</option>
                </select>
              </div>
            )}
            {visible.length === 0 && (
              <p className="muted" data-testid="speckit-features-all-archived">
                {t('speckit.archive.allArchived', { n: archived.length })}
              </p>
            )}
            <ul ref={listRef} className="speckit-list" tabIndex={-1} aria-label={t('speckit.features.title')} data-testid="speckit-features-list">
              {/* US-0050 item 6: the rows block in with the view's entrance, staggered. */}
              {visible.map((f, n) => (
                <li key={f.dir} className="lcars-e-block" style={stagger(n)}>
                  <button
                    className={`link ${selected === f.dir ? 'is-selected' : ''}`}
                    aria-current={selected === f.dir}
                    onClick={() => select(f.dir)}
                    data-testid="speckit-features-row"
                  >
                    {f.number && <code>{f.number}</code>} <span>{f.name}</span>
                    {f.active && (
                      <span className="speckit-tag" data-testid="speckit-features-active">
                        {t('speckit.features.active')}
                      </span>
                    )}
                    {f.archived && (
                      <span className="intent-parked" data-testid="speckit-features-archived">
                        {t('intents.archive.mark')}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {/* US-0050 item 6: another feature's detail slides in as a tab does. */}
          {feature && (
            <TabIn tab={feature.dir} className="speckit-detail">
              <SpeckitFeatureDetail
                feature={feature}
                activeName={activeName}
                openFile={openFile}
                onOpenFile={setOpenFile}
                actions={<SpeckitArchive key={feature.dir} projectId={projectId} feature={feature} onChanged={load} getList={getList} />}
              />
              {openFile && <FileView projectId={projectId} rel={openFile} editable={false} html="text" />}
            </TabIn>
          )}
        </div>
      )}

      {result?.errors.length > 0 && (
        <section data-testid="speckit-features-errors">
          <h4 className="file-group">{t('speckit.features.errors')}</h4>
          <ul>
            {result.errors.map((e) => (
              <li key={e.path}>
                <code>{e.path}</code> {e.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
