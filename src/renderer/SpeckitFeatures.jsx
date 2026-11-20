// US-1402 FR6 (contract C5): a Spec Kit project's features. Reads `speckit:features` on mount and on each
// `speckit:changed` push (NFR7.4), shows the version warning (BR6.9), the list with the active mark (BR6.1, BR6.2)
// or the empty state (BR6.8), the selected feature's detail, its file read-only (NFR3.2), and what could not be read (BR6.10).
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { FileView } from './ArtifactReader.jsx';
import SpeckitFeatureDetail from './SpeckitFeatureDetail.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
// ponytail: typed straight into the agent tab; C7's speckitCommand(harness, 'specify') replaces this when US-1405 (U5) lands.
const SPECIFY = '/speckit-specify ';

/** @param {{projectId: string}} props */
export default function SpeckitFeatures({ projectId }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [openFile, setOpenFile] = useState(null);
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

  const select = (dir) => {
    setSelected(dir);
    setOpenFile(null);
  };
  const feature = result?.features.find((f) => f.dir === selected) ?? null;
  const version = result?.version;

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

      {result && result.features.length === 0 && (
        <div className="speckit-empty">
          <p className="muted" data-testid="speckit-features-empty">
            {t('speckit.features.empty')}
          </p>
          {terminal && (
            <button className="btn btn-accent" onClick={() => terminal.run('agent', (s) => s.write(SPECIFY))} data-testid="speckit-features-specify">
              {t('speckit.features.specify')}
            </button>
          )}
        </div>
      )}

      {result && result.features.length > 0 && (
        <div className="speckit-layout">
          <nav aria-label={t('speckit.features.title')}>
            <h3 className="section-title">{t('speckit.features.title')}</h3>
            <ul className="speckit-list">
              {result.features.map((f) => (
                <li key={f.dir}>
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
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {feature && (
            <div className="speckit-detail">
              <SpeckitFeatureDetail feature={feature} openFile={openFile} onOpenFile={setOpenFile} />
              {openFile && <FileView projectId={projectId} rel={openFile} editable={false} html="text" />}
            </div>
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
