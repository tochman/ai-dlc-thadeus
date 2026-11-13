// "AI-DLC-dokumentation" from the Hjälp menu (EPIC-04 US-0404 FR2.1): the active project's docs/README.md,
// rendered like the artifact reader (Markdown without raw HTML). A native modal <dialog>, closed on Esc.
import { useEffect, useRef } from 'react';
import { FileContent } from './ArtifactReader.jsx';

/** @param {{doc: {name: string, content: string} | null, onClose: () => void}} props */
export default function DocsDialog({ doc, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (doc && !d.open) d.showModal ? d.showModal() : d.setAttribute('open', '');
    if (!doc && d.open) d.close ? d.close() : d.removeAttribute('open');
  }, [doc]);

  return (
    <dialog
      ref={ref}
      className="settings-dialog docs-dialog"
      aria-labelledby="docs-dialog-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      data-testid="docs-dialog"
    >
      {doc && (
        <div>
          <h2 id="docs-dialog-title">{doc.name} • docs/README.md</h2>
          <FileContent rel="docs/README.md" content={doc.content} />
          <div className="setup-actions">
            <button type="button" className="btn" onClick={onClose} data-testid="docs-dialog-close">
              Stäng
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
