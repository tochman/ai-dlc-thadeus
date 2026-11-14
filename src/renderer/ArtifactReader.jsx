import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { t } from '../shared/i18n.js';

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
// Links never navigate the app window (main blocks navigation): a web link opens in the OS browser through main's
// window-open handler, any other link is shown as plain text.
const markdownComponents = {
  a: ({ children, href }) =>
    /^https?:\/\//.test(href ?? '') ? (
      <a className="md-link" href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <span className="md-link" title={href}>
        {children}
      </span>
    ),
  img: ({ alt }) => <span className="muted">{t('intents.files.image', { alt: alt ?? '' })}</span>
};

/** Markdown without raw HTML, pretty JSON, or plain text. Also used for files read from git (RefreshPanel). */
export function FileContent({ rel, content }) {
  return rel.endsWith('.md') ? (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  ) : (
    <pre className="code-block">{rel.endsWith('.json') ? prettyJson(content) : content}</pre>
  );
}

function FileView({ projectId, rel }) {
  const { t } = useTranslation();
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
          {bridge.platform === 'darwin' ? t('common.revealFinder') : t('common.revealFiles')}
        </button>
        <button className="btn" onClick={() => act(bridge.openInEditor)} data-testid="artifact-reader-open-editor">
          {t('common.openInEditor')}
        </button>
      </div>
      {error && (
        <p className="banner banner-error" role="alert">
          {error}
        </p>
      )}
      {content == null && !error && <p className="muted">{t('common.reading')}</p>}
      {content != null && <FileContent rel={rel} content={content} />}
    </div>
  );
}

export default function ArtifactReader({ projectId, groups, selected, onSelect }) {
  const { t } = useTranslation();
  if (groups.length === 0) return <p className="muted">{t('intents.files.none')}</p>;
  return (
    <div className="artifact-reader" data-testid="artifact-reader">
      <nav className="file-tree" aria-label={t('intents.files.label')}>
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
      {selected ? <FileView projectId={projectId} rel={selected} /> : <p className="muted">{t('intents.files.pick')}</p>}
    </div>
  );
}
