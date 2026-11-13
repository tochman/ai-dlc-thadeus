import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const bridge = window.bridge;
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function prettyJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text; // half-written or invalid JSON is shown as-is
  }
}

// Raw HTML in artifacts is never rendered: react-markdown escapes it unless rehype-raw is added (FR6.4).
// Links do not navigate the app window (main blocks navigation); they are shown as plain text links.
const markdownComponents = {
  a: ({ children, href }) => <span className="md-link" title={href}>{children}</span>,
  img: ({ alt }) => <span className="muted">[bild: {alt}]</span>
};

function FileView({ projectId, rel }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setContent(null);
    setError(null);
    bridge
      .readFile(projectId, rel)
      .then((text) => !cancelled && setContent(text))
      .catch((err) => !cancelled && setError(errorText(err)));
    return () => {
      cancelled = true;
    };
  }, [projectId, rel]);

  async function act(fn) {
    try {
      setError(null);
      await fn(projectId, rel);
    } catch (err) {
      setError(errorText(err));
    }
  }

  return (
    <div className="file-view">
      <div className="file-actions">
        <code className="file-path">{rel}</code>
        <button className="btn" onClick={() => act(bridge.revealInFinder)} data-testid="artifact-reader-reveal">
          {bridge.platform === 'darwin' ? 'Visa i Finder' : 'Visa i filhanteraren'}
        </button>
        <button className="btn" onClick={() => act(bridge.openInEditor)} data-testid="artifact-reader-open-editor">
          Öppna i editor
        </button>
      </div>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      {content == null && !error && <p className="muted">Läser…</p>}
      {content != null &&
        (rel.endsWith('.md') ? (
          <div className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <pre className="code-block">{rel.endsWith('.json') ? prettyJson(content) : content}</pre>
        ))}
    </div>
  );
}

export default function ArtifactReader({ projectId, groups, selected, onSelect }) {
  if (groups.length === 0) return <p className="muted">Inga artefakter i intentens fasmappar ännu.</p>;
  return (
    <div className="artifact-reader" data-testid="artifact-reader">
      <nav className="file-tree panel elbow-left" aria-label="Artefakter">
        {groups.map((g) => (
          <section key={g.dir}>
            <h4 className="file-group">{g.dir}</h4>
            <ul>
              {g.files.map((f) => (
                <li key={f.rel}>
                  <button
                    className={`link ${selected === f.rel ? 'is-selected' : ''}`}
                    aria-current={selected === f.rel}
                    onClick={() => onSelect(f.rel)}
                    data-testid="artifact-reader-file"
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      {selected ? <FileView projectId={projectId} rel={selected} /> : <p className="muted">Välj en fil.</p>}
    </div>
  );
}
