// Editing files in the app (EPIC-10 US-1001): editor tabs in the project view, Monaco loaded on first use.
// main writes a file only when it still has the hash it was opened with; otherwise the conflict dialog offers
// keep mine, take the disk version, or compare. Engine-owned, binary and large files open read-only.
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileContent } from '../ArtifactReader.jsx';
import ConflictDialog from './ConflictDialog.jsx';
import { markDirty } from './EditorContext.jsx';
import Tooltip from '../Tooltip.jsx';

const MonacoPane = lazy(() => import('./MonacoPane.jsx'));
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

const LANGUAGES = {
  md: 'markdown',
  markdown: 'markdown',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  css: 'css',
  scss: 'scss',
  less: 'less',
  html: 'html',
  htm: 'html',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  py: 'python',
  xml: 'xml',
  svg: 'xml',
  plist: 'xml',
  ini: 'ini',
  toml: 'ini',
  cfg: 'ini',
  sql: 'sql'
};

/** The Monaco language for a path, from its extension (or the name Dockerfile); `plaintext` for anything else. */
export function languageFor(rel) {
  const name = String(rel).split('/').pop();
  if (/^dockerfile$/i.test(name)) return 'dockerfile';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return LANGUAGES[ext] ?? 'plaintext';
}

const isDirty = (tab) => !tab.readOnly && tab.base != null && tab.text !== tab.base.content;
// A binary file or one over 10 MB comes without content: only its read-only reason shows.
const fromDisk = (r) => ({
  text: r.content ?? '',
  base: r.content == null ? null : { content: r.content, mtimeMs: r.mtimeMs, hash: r.hash },
  readOnly: r.readOnly
});

/**
 * The open files of one project. `open(rel)` opens or shows a file; `close(rel)` asks first when it has unsaved changes.
 * Every open file is watched: a clean one reloads quietly when it changes on disk, a dirty one gets a notice.
 */
export function useEditorTabs(projectId) {
  const { t } = useTranslation();
  const [tabs, setTabs] = useState([]);
  const [active, setActive] = useState(null);
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const patch = useCallback((rel, change) => setTabs((list) => list.map((tab) => (tab.rel === rel ? { ...tab, ...change(tab) } : tab))), []);

  const open = useCallback(
    async (rel) => {
      setActive(rel);
      if (tabsRef.current.some((tab) => tab.rel === rel)) return;
      setTabs((list) => [...list, { rel, text: '', base: null, readOnly: null, loading: true }]);
      try {
        const r = await window.bridge.readFileForEdit(projectId, rel);
        patch(rel, () => ({ ...fromDisk(r), loading: false }));
      } catch (err) {
        patch(rel, () => ({ loading: false, error: errorText(err) }));
      }
    },
    [projectId, patch]
  );

  function close(rel) {
    const tab = tabs.find((x) => x.rel === rel);
    if (tab && isDirty(tab) && !window.confirm(t('editor.closeDirty', { file: rel }))) return false;
    const rest = tabs.filter((x) => x.rel !== rel);
    setTabs(rest);
    if (active === rel) setActive(rest.at(-1)?.rel ?? null);
    return true;
  }

  async function save(rel, expect) {
    const tab = tabsRef.current.find((x) => x.rel === rel);
    if (!tab || tab.readOnly || !tab.base) return;
    try {
      const r = await window.bridge.writeFile(projectId, rel, tab.text, expect ?? { mtimeMs: tab.base.mtimeMs, hash: tab.base.hash });
      if (r.conflict) patch(rel, () => ({ conflict: r.disk }));
      else patch(rel, () => ({ base: { content: tab.text, mtimeMs: r.mtimeMs, hash: r.hash }, conflict: null, notice: null, error: null }));
    } catch (err) {
      patch(rel, () => ({ error: errorText(err) }));
    }
  }
  const keepMine = (rel) => {
    const disk = tabsRef.current.find((x) => x.rel === rel)?.conflict;
    if (disk) save(rel, { mtimeMs: disk.mtimeMs, hash: disk.hash });
  };
  const takeDisk = (rel) => patch(rel, (tab) => ({ text: tab.conflict.content, base: { ...tab.conflict }, conflict: null, notice: null }));
  const edit = (rel, text) => patch(rel, () => ({ text }));

  // The unsaved files, for closing the project and quitting; and the watch on exactly the open files.
  const dirtyKey = tabs
    .filter(isDirty)
    .map((x) => x.rel)
    .join('\n');
  useEffect(() => markDirty(projectId, dirtyKey ? dirtyKey.split('\n') : []), [projectId, dirtyKey]);
  useEffect(() => () => markDirty(projectId, []), [projectId]);
  const openKey = tabs.map((x) => x.rel).join('\n');
  useEffect(() => {
    window.bridge.watchOpenFiles?.(projectId, openKey ? openKey.split('\n') : []).catch((err) => console.warn('Open files are not watched:', errorText(err)));
  }, [projectId, openKey]);
  useEffect(
    () =>
      window.bridge.onFileChanged?.(async (c) => {
        if (c.projectId !== projectId) return;
        const tab = tabsRef.current.find((x) => x.rel === c.rel);
        if (!tab?.base) return;
        try {
          const r = await window.bridge.readFileForEdit(projectId, c.rel);
          if (r.hash === tab.base.hash) return; // our own save, or no real change
          patch(c.rel, (now) => (isDirty(now) ? { notice: 'changedOnDisk' } : { ...fromDisk(r), notice: null }));
        } catch (err) {
          patch(c.rel, () => ({ notice: 'changedOnDisk', error: errorText(err) }));
        }
      }),
    [projectId, patch]
  );

  return { tabs, active, setActive, open, close, save, keepMine, takeDisk, edit };
}

/**
 * @param {{projectId: string, editor: ReturnType<typeof useEditorTabs>, agentBusy: boolean, activeRecord: string|null}} props
 *   activeRecord: the active intent's record folder (`aidlc/spaces/<space>/intents/<dir>/`), or null
 */
export default function EditorPanel({ projectId, editor, agentBusy = false, activeRecord = null }) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(true);
  const tab = editor.tabs.find((x) => x.rel === editor.active) ?? null;
  const language = tab ? languageFor(tab.rel) : 'plaintext';

  function onKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (tab) editor.save(tab.rel);
    }
  }
  async function openOutside() {
    try {
      await window.bridge.openInEditor(projectId, tab.rel);
    } catch (err) {
      window.alert(errorText(err));
    }
  }

  if (!editor.tabs.length) return <p className="muted editor-empty">{t('editor.empty')}</p>;
  return (
    <div className="editor-panel" onKeyDown={onKeyDown} data-testid="editor-panel">
      <div className="editor-tabs" role="tablist">
        {editor.tabs.map((x) => (
          <span key={x.rel} className={`editor-tab ${x.rel === editor.active ? 'is-active' : ''}`}>
            <Tooltip text={x.rel}>
              <button role="tab" aria-selected={x.rel === editor.active} onClick={() => editor.setActive(x.rel)} data-testid="editor-tab">
                {x.rel.split('/').pop()}
                {isDirty(x) && (
                  <span className="editor-dirty" aria-label={t('editor.unsaved')} data-testid="editor-tab-dirty">
                    {' '}
                    ●
                  </span>
                )}
              </button>
            </Tooltip>
            <button
              className="editor-tab-close"
              aria-label={t('editor.close', { file: x.rel })}
              onClick={() => editor.close(x.rel)}
              data-testid="editor-tab-close"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {tab && (
        <>
          <div className="file-actions">
            <code className="file-path">{tab.rel}</code>
            {!tab.readOnly && tab.base && (
              <button className="btn btn-accent" disabled={!isDirty(tab)} onClick={() => editor.save(tab.rel)} data-testid="editor-save">
                {t('common.save')}
              </button>
            )}
            {language === 'markdown' && (
              <button className="btn" aria-pressed={preview} onClick={() => setPreview((p) => !p)} data-testid="editor-preview-toggle">
                {t('editor.preview')}
              </button>
            )}
            <button className="btn btn-quiet" onClick={openOutside} data-testid="editor-open-outside">
              {t('common.openInEditor')}
            </button>
          </div>
          {tab.readOnly && (
            <p className="muted" data-testid="editor-read-only">
              {t(`editor.readOnly.${tab.readOnly}`)}
            </p>
          )}
          {tab.notice === 'changedOnDisk' && (
            <p className="banner banner-warn" role="status" data-testid="editor-changed-on-disk">
              {t('editor.changedOnDisk')}
            </p>
          )}
          {agentBusy && activeRecord && tab.rel.startsWith(activeRecord) && (
            <p className="muted" role="status" data-testid="editor-agent-notice">
              {t('editor.agentWorking')}
            </p>
          )}
          {tab.error && (
            <p className="refresh-error" role="alert">
              {tab.error}
            </p>
          )}
          {tab.conflict && (
            <ConflictDialog
              rel={tab.rel}
              mine={tab.text}
              disk={tab.conflict.content}
              language={language}
              onKeepMine={() => editor.keepMine(tab.rel)}
              onTakeDisk={() => editor.takeDisk(tab.rel)}
            />
          )}
          {tab.loading ? (
            <p className="muted">{t('common.reading')}</p>
          ) : (
            tab.base && (
              <div className={`editor-body ${language === 'markdown' && preview ? 'has-preview' : ''}`}>
                <div className="editor-monaco">
                  <Suspense fallback={<p className="muted">{t('editor.loading')}</p>}>
                    <MonacoPane path={tab.rel} language={language} value={tab.text} readOnly={!!tab.readOnly} onChange={(text) => editor.edit(tab.rel, text)} />
                  </Suspense>
                </div>
                {language === 'markdown' && preview && (
                  <div className="editor-preview" data-testid="editor-preview">
                    <FileContent rel={tab.rel} content={tab.text} />
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
