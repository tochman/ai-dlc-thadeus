// A save that met a changed file (EPIC-10 US-1001): keep mine, take the disk version, or compare the two in
// Monaco's diff editor. Shown inside the editor panel, never as a modal that hides the text.
import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MonacoPane = lazy(() => import('./MonacoPane.jsx'));

/** @param {{rel: string, mine: string, disk: string, language: string, onKeepMine: () => void, onTakeDisk: () => void}} props */
export default function ConflictDialog({ rel, mine, disk, language, onKeepMine, onTakeDisk }) {
  const { t } = useTranslation();
  const [compare, setCompare] = useState(false);
  return (
    <div
      className="panel config-change editor-conflict"
      role="alertdialog"
      aria-label={t('editor.conflict.title', { file: rel })}
      data-testid="editor-conflict"
    >
      <p>{t('editor.conflict.text', { file: rel })}</p>
      <div className="config-change-actions">
        <button className="btn btn-accent" onClick={onKeepMine} data-testid="editor-conflict-keep">
          {t('editor.conflict.keepMine')}
        </button>
        <button className="btn" onClick={onTakeDisk} data-testid="editor-conflict-disk">
          {t('editor.conflict.takeDisk')}
        </button>
        <button className="btn" aria-pressed={compare} onClick={() => setCompare((c) => !c)} data-testid="editor-conflict-compare">
          {t('editor.conflict.compare')}
        </button>
      </div>
      {compare && (
        <div className="editor-diff" data-testid="editor-conflict-diff">
          <Suspense fallback={<p className="muted">{t('editor.loading')}</p>}>
            <MonacoPane path={`diff:${rel}`} language={language} original={disk} value={mine} readOnly />
          </Suspense>
        </div>
      )}
    </div>
  );
}
