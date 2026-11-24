// US-0506 u4 LC35, M8 (BR7.7–BR7.9, BR7.18, BR7.20, PD33–PD36): the preview of an Install, Update or Remove of the
// agent dialog hooks. A native modal <dialog> as the other setup dialogs: focus on Cancel at open, Esc cancels the
// preview in main (agentHooks.cancel), no key applies. The renderer sees only paths, summaries and diff text, never the
// bytes to write (SD33); apply names only the preview id.
import { Fragment, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { selectableHarness } from '../shared/harnesses.js';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const CAUSES = new Set(['EACCES', 'EPERM', 'EROFS', 'ENOSPC', 'ENOTDIR', 'notAFile', 'link', 'changedSincePreview']);

/** The harness's name as the app shows it. */
export const harnessLabel = (id) => selectableHarness(id)?.label ?? id;

/** PD36: a short translated cause for the codes the app names, else the bare code. */
export const causeText = (t, cause) => (!cause ? t('agentHooks.cause.unknown') : CAUSES.has(cause) ? t(`agentHooks.cause.${cause}`) : cause);

/** PD36: one sentence for a refusal or a partial write, with the path exactly as on disk. */
export const refusalText = (t, out) =>
  t(`agentHooks.refusal.${out.result === 'partiallyWritten' ? 'partiallyWritten' : out.refusal}`, { file: out.file ?? '', cause: causeText(t, out.cause) });

/** RD39: why a file cannot be used, in one sentence. */
export const reasonText = (t, file) => t(`agentHooks.reason.${file.reason}`, { file: file.path, cause: causeText(t, file.cause) });

/** A unified diff split into its hunks, each a list of lines that keep their sign (PD35). */
const hunks = (diff) =>
  diff
    .split('\n')
    .reduce((out, line) => (line.startsWith('@@') || !out.length ? [...out, [line]] : (out.at(-1).push(line), out)), [])
    .filter((h) => h.length);

/**
 * @param {{projectId: string, harness: 'claude'|'opencode', action: 'install'|'update'|'remove',
 *          onClose: (doneLine: string|null) => void}} props  onClose gets the result line after a successful apply
 */
export default function AgentHooksPreview({ projectId, harness, action, onClose }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const cancelRef = useRef(null);
  const closed = useRef(false);
  const busyRef = useRef(false);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const [final, setFinal] = useState(false); // a refusal that a new preview cannot fix: no apply button

  const load = () =>
    window.bridge.agentHooks
      .preview(projectId, harness, action)
      .then((p) => {
        if (p?.refusal) {
          setMessage(refusalText(t, p));
          setFinal(true);
        } else setPreview(p);
      })
      .catch((err) => {
        setMessage(errorText(err));
        setFinal(true);
      });
  const loadOnOpen = useEffectEvent(load); // US-0043: the latest load, without rerunning the open effect

  useEffect(() => {
    loadOnOpen();
    const d = ref.current;
    if (d && !d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    cancelRef.current?.focus();
    return () => {
      if (d?.open) d.close ? d.close() : d.removeAttribute('open');
    };
  }, []); // one preview per opened dialog

  function close(doneLine) {
    if (closed.current) return;
    closed.current = true;
    if (doneLine === null && preview?.previewId) window.bridge.agentHooks.cancel(projectId, preview.previewId); // SD31
    onClose(doneLine);
  }

  async function apply() {
    if (busyRef.current || !preview) return; // PD33: a second click makes no call
    busyRef.current = true;
    setBusy(true);
    try {
      const out = await window.bridge.agentHooks.apply(projectId, preview.previewId);
      if (out.result === 'written' || out.result === 'nothingToChange') return close(t(`agentHooks.done.${action}`, { harness: harnessLabel(harness) }));
      setMessage(refusalText(t, out));
      if (out.preview && !out.preview.refusal)
        setPreview(out.preview); // W6: decide again on the new preview
      else if (out.refusal === 'previewUnknown')
        load(); // W7: the open dialog refreshes its preview
      else setFinal(true);
    } catch (err) {
      setMessage(errorText(err));
      setFinal(true);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const titleId = `agent-hooks-preview-title-${projectId}`;
  return (
    <dialog
      ref={ref}
      className="panel settings-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close(null);
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.preventDefault();
        e.stopPropagation(); // the Project settings dialog around it stays open
        close(null);
      }}
      data-testid="agent-hooks-preview"
    >
      <div className="setup-actions">
        <h2 id={titleId}>{t(`agentHooks.preview.title.${action}`)}</h2>
        <button ref={cancelRef} type="button" className="btn" onClick={() => close(null)} data-testid="agent-hooks-preview-cancel">
          {t('common.cancel')}
        </button>
      </div>
      <p>{t('agentHooks.preview.committed')}</p>
      <p>{t('agentHooks.preview.teammates')}</p>
      {message && (
        <p className="refresh-error" role="alert">
          {message}
        </p>
      )}
      {!preview && !message && <p className="muted">{t('agentHooks.preview.loading')}</p>}
      {preview?.files.map((f) => (
        <section
          key={f.path}
          tabIndex={0}
          aria-label={t('agentHooks.preview.fileLabel', { path: f.path, change: t(`agentHooks.preview.change.${f.change}`) })}
          data-testid="agent-hooks-preview-file"
        >
          <p>
            <code>{f.path}</code> <span className="muted">{f.summary}</span>
          </p>
          {f.replacesHandEdit && <p>{t('agentHooks.summary.replacesHandEdit')}</p>}
          {f.diff &&
            hunks(f.diff).map((lines, i) => (
              <pre key={i}>
                {lines.map((line, j) => (
                  <Fragment key={j}>
                    <span>{line}</span>
                    {j < lines.length - 1 ? '\n' : ''}
                  </Fragment>
                ))}
              </pre>
            ))}
        </section>
      ))}
      {preview && !preview.canApply && <p>{t('agentHooks.preview.nothing')}</p>}
      {preview?.canApply && !final && (
        <div className="setup-actions">
          <button type="button" className="btn btn-accent" disabled={busy} onClick={apply} data-testid="agent-hooks-preview-apply">
            {busy ? t('agentHooks.busy') : t(`agentHooks.action.${action}`)}
          </button>
        </div>
      )}
    </dialog>
  );
}
