// US-1404 FR7 (contract C6): Configuration › Spec Kit, the project's constitution, extensions and hooks. Reads
// `speckit:rules` on mount and once per `speckit:changed` push (NFR7.4); the constitution through the artifact reader,
// raw HTML as text (NFR5.1); what could not be read is named (FR7.3). Nothing here writes a Spec Kit file.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { useEditor } from './editor/EditorContext.jsx';
import { FileView } from './ArtifactReader.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
// NFR3.4: the one path this view hands the editor, a constant, never one taken from the result.
const CONSTITUTION = '.specify/memory/constitution.md';
// ponytail: typed straight into the agent tab, as SpeckitFeatures does; C7's speckitCommand replaces it when US-1403 (U5) lands.
const RUN_CONSTITUTION = '/speckit-constitution ';

/** One hook row: before or after which command, the command it runs, its mode and the condition note (AC4.2.2). */
function HookRow({ hook }) {
  const { t } = useTranslation();
  return (
    <li className="speckit-rules-hook" data-testid="speckit-rules-hook">
      <span>{t(`speckit.rules.when.${hook.when}`)}</span> <code>{hook.target}</code> <span aria-hidden="true">→</span> <code>{hook.command}</code>{' '}
      <span className={`speckit-tag speckit-mode-${hook.mode}`}>{t(`speckit.rules.mode.${hook.mode}`)}</span>
      {hook.condition && <span className="muted"> {t('speckit.rules.condition', { condition: hook.condition })}</span>}
    </li>
  );
}

/** One extension: its id, its commands and its hooks. */
function ExtensionCard({ extension }) {
  const { t } = useTranslation();
  return (
    <li className="speckit-rules-extension" data-testid="speckit-rules-extension">
      <h4 className="file-group">{extension.id}</h4>
      {extension.commands.length > 0 && (
        <p>
          <span className="field-label">{t('speckit.rules.commands')}</span>{' '}
          {extension.commands.map((c) => (
            <code key={c} className="speckit-rules-command" data-testid="speckit-rules-command">
              {c}
            </code>
          ))}
        </p>
      )}
      {extension.hooks.length > 0 && (
        <>
          <span className="field-label">{t('speckit.rules.hooks')}</span>
          <ul className="speckit-tasks">
            {extension.hooks.map((h, i) => (
              <HookRow key={`${i}-${h.when}-${h.target}-${h.command}`} hook={h} />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}

/** @param {{projectId: string}} props */
export default function SpeckitRules({ projectId }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const editor = useEditor();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [reads, setReads] = useState(0); // one per answer, so the constitution is read again with it
  const alive = useRef(true);

  const load = useCallback(
    () =>
      Promise.resolve()
        .then(() => window.bridge.speckitRules(projectId))
        .then(
          (r) => {
            if (!alive.current) return;
            setResult(r);
            setError(null);
            setReads((n) => n + 1);
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

  const exists = result?.constitution.exists === true;
  const constitutionError = result?.errors.some((e) => e.path === CONSTITUTION);

  return (
    <div className="speckit-rules" data-testid="speckit-rules-root">
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      {!result && !error && <p className="muted">{t('common.reading')}</p>}

      {result && (
        <>
          <section className="speckit-rules-part">
            <h3 className="section-title">{t('speckit.rules.constitution')}</h3>
            {exists && (
              <div data-testid="speckit-rules-constitution">
                {editor && (
                  <button className="btn btn-accent" onClick={() => editor.open(CONSTITUTION)} data-testid="speckit-rules-edit">
                    {t('speckit.rules.edit')}
                  </button>
                )}
                <FileView key={reads} projectId={projectId} rel={CONSTITUTION} editable={false} html="text" />
              </div>
            )}
            {!exists && !constitutionError && (
              <div className="speckit-empty" data-testid="speckit-rules-no-constitution">
                <p className="muted">{t('speckit.rules.noConstitution')}</p>
                {terminal && (
                  <button
                    className="btn btn-accent"
                    onClick={() => terminal.type('agent', RUN_CONSTITUTION, { submit: false })}
                    data-testid="speckit-rules-constitution-run"
                  >
                    {t('speckit.rules.runConstitution')}
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="speckit-rules-part">
            <h3 className="section-title">{t('speckit.rules.extensions')}</h3>
            {!result.hooksChecked && (
              <p className="banner banner-warn" role="status" data-testid="speckit-rules-unchecked">
                {t('speckit.rules.unchecked')}
              </p>
            )}
            {result.extensions.length === 0 ? (
              <p className="muted">{t('speckit.rules.noExtensions')}</p>
            ) : (
              <ul className="speckit-list speckit-rules-extensions">
                {result.extensions.map((x) => (
                  <ExtensionCard key={x.id} extension={x} />
                ))}
              </ul>
            )}
            {result.skipped > 0 && (
              <p className="muted" data-testid="speckit-rules-skipped">
                {t('speckit.rules.skipped', { count: result.skipped })}
              </p>
            )}
          </section>

          {result.errors.length > 0 && (
            <section data-testid="speckit-rules-errors">
              <h4 className="file-group">{t('speckit.rules.errors')}</h4>
              <ul>
                {result.errors.map((e, i) => (
                  <li key={`${i}-${e.path}`}>
                    <code>{e.path}</code> {e.reason}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
