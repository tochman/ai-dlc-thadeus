// "Uppdatera från GitHub" in the sidebar (US-0502, FR3). The app only reads from git; every command that
// changes the working tree is typed into the shell tab without Enter, for the person to run (NFR1).
import { useEffect, useState } from 'react';
import { useTerminal } from './TerminalContext.jsx';
import { FileContent } from './ArtifactReader.jsx';

const WORKING_MS = 5 * 60 * 1000;
export const WAIT_MESSAGE = 'Vänta tills AI-DLC-steget är klart eller parkera arbetet först';
export const PULL = { rebase: 'git pull --rebase --autostash', merge: 'git pull --no-rebase --autostash' };
export const FROM_MAIN = { rebase: 'git fetch && git rebase origin/main', merge: 'git fetch && git merge origin/main' };
const STRATEGY_TEXT = {
  rebase: 'Rebase lägger dina lokala commits ovanpå fjärrens, så historiken blir rak.',
  merge: 'Merge förenar båda sidorna i en merge-commit och skriver inte om något.'
};
const CONFLICT_HELP = {
  'intents.json': 'Behåll raderna från båda sidor: varje intent är en egen rad.',
  'aidlc-state.md': 'Välj den sida som körde stegen senast, eller be Claude i claude-fliken att lösa konflikten.'
};

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const baseName = (rel) => rel.slice(rel.lastIndexOf('/') + 1);

/** Re-renders when the 5-minute "AI-DLC skrev nyss" window ends, so the buttons come back by themselves. */
function useRecent(at, windowMs) {
  const [, tick] = useState(0);
  useEffect(() => {
    const left = at ? at + windowMs - Date.now() : 0;
    if (left <= 0) return undefined;
    const t = setTimeout(() => tick((n) => n + 1), left);
    return () => clearTimeout(t);
  }, [at, windowMs]);
  return !!at && Date.now() - at < windowMs;
}

function Choice({ commands, disabled, onPick, testId }) {
  return (
    <div className="refresh-choice" data-testid={testId}>
      {['rebase', 'merge'].map((k) => (
        <div key={k} className="refresh-choice-row">
          <button className="btn" disabled={disabled} onClick={() => onPick(commands[k])} data-testid={`${testId}-${k}`}>
            {k === 'rebase' ? 'Rebase' : 'Merge'}
          </button>
          <span className="muted">
            {STRATEGY_TEXT[k]} <code>{commands[k]}</code>
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusLine({ status, working }) {
  return (
    <dl className="refresh-status" data-testid="refresh-panel-status">
      <div>
        <dt>Gren</dt>
        <dd>{status.branch ?? '–'}</dd>
      </div>
      <div>
        <dt>Jämförs med</dt>
        <dd>{status.upstream ?? 'ingen fjärr'}</dd>
      </div>
      {status.upstream && (
        <div>
          <dt>Före / efter</dt>
          <dd>
            {status.ahead} / {status.behind}
          </dd>
        </div>
      )}
      <div>
        <dt>Ej committat</dt>
        <dd>
          aidlc/ {status.dirtyAidlc} · övrigt {status.dirtyOther}
        </dd>
      </div>
      <div>
        <dt>AI-DLC</dt>
        <dd>{working ? 'arbetar' : 'vilar'}</dd>
      </div>
    </dl>
  );
}

/** @param {{projectId: string, space: string, lastIntentChangeAt: number|null}} props */
export default function RefreshPanel({ projectId, space, lastIntentChangeAt }) {
  const terminal = useTerminal();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [changes, setChanges] = useState(null);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(false);
  const [choose, setChoose] = useState(null); // 'pull' | 'main' | null
  const [conflicts, setConflicts] = useState(null);
  const [remoteFile, setRemoteFile] = useState(null); // {rel, content?, error?}
  const recentWrite = useRecent(lastIntentChangeAt, WORKING_MS);
  const working = terminal?.state('claude') === 'busy' || recentWrite; // FR3.5
  const bridge = window.bridge;

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(`Git-kommandot misslyckades: ${errorText(err)}`); // shown here, never in the shared banner (NFR2)
    } finally {
      setBusy(false);
    }
  }

  const loadStatus = () => act(async () => setStatus(await bridge.getGitStatus(projectId)));

  // The local status shows as soon as the panel opens, before any fetch (FR3.5).
  useEffect(() => {
    if (open && !status) loadStatus();
  }, [open]);

  // "Uppdatera" is the only thing that fetches (FR3.2, Q3: C).
  const refresh = () =>
    act(async () => {
      await bridge.gitFetch(projectId);
      const s = await bridge.getGitStatus(projectId);
      setStatus(s);
      setChanges(s.upstream ? await bridge.getRemoteChanges(projectId, s.upstream, space) : null);
    });

  async function openRemote(rel) {
    setRemoteFile({ rel });
    try {
      setRemoteFile({ rel, content: await bridge.showRemoteFile(projectId, changes.ref, rel) });
    } catch (err) {
      setRemoteFile({ rel, error: `Filen kunde inte läsas från ${changes.ref}: ${errorText(err)}` });
    }
  }

  const typeInShell = (cmd) => terminal?.type('shell', cmd, { submit: false });
  const badge = changes?.aidlcCommits ? `${changes.aidlcCommits} nya ändringar i AI-DLC på ${changes.ref}` : null;

  return (
    <section className="refresh-panel" data-testid="refresh-panel">
      <button className="cost-panel-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open} data-testid="refresh-panel-toggle">
        <span className="section-title">GitHub</span>
        {badge && <span className="tag tag-active">{changes.aidlcCommits} nya</span>}
        <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div className="refresh-body">
          {error && (
            <p className="refresh-error" role="alert">
              {error}
            </p>
          )}
          {status && !status.isRepo && <p className="muted">Mappen är inte ett git-repo, så det finns inget att hämta.</p>}
          {status?.isRepo && (
            <>
              <StatusLine status={status} working={working} />
              <button className="btn btn-accent" onClick={refresh} disabled={busy} data-testid="refresh-panel-update">
                {busy ? 'Hämtar…' : 'Uppdatera'}
              </button>
              {!status.upstream && (
                <p className="muted">Ingen fjärr att jämföra med: grenen har ingen upstream och origin/main finns inte.</p>
              )}
              {changes && (
                <p className="refresh-badge" data-testid="refresh-panel-badge">
                  {badge ?? `Inget nytt i AI-DLC på ${changes.ref}.`}
                  <br />
                  <span className="muted">{changes.otherFiles.length} ändrade filer utanför aidlc/ kommer också in.</span>
                </p>
              )}
              {changes && (changes.aidlcFiles.length > 0 || changes.newIntents.length > 0) && (
                <button className="btn" onClick={() => setDetails((d) => !d)} aria-expanded={details} data-testid="refresh-panel-details">
                  {details ? 'Dölj' : 'Visa'}
                </button>
              )}
              {details && changes && (
                <div className="refresh-details" data-testid="refresh-panel-detail-list">
                  {changes.newIntents.length > 0 && (
                    <ul className="refresh-list">
                      {changes.newIntents.map((i) => (
                        <li key={i.dirName}>
                          {i.slug ?? i.dirName} <span className="tag tag-live">på GitHub</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="muted">{changes.auditLines} nya rader i audit-loggarna.</p>
                  <ul className="refresh-list">
                    {changes.aidlcFiles.map((rel) => (
                      <li key={rel}>
                        <button className="link" onClick={() => openRemote(rel)} data-testid="refresh-panel-remote-file">
                          {rel.slice('aidlc/'.length)}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {remoteFile && (
                    <div className="refresh-remote-file">
                      <div className="file-actions">
                        <code className="file-path">
                          {changes.ref}:{remoteFile.rel} (skrivskyddad)
                        </code>
                        <button className="btn" onClick={() => setRemoteFile(null)}>
                          Stäng
                        </button>
                      </div>
                      {remoteFile.error && <p className="refresh-error">{remoteFile.error}</p>}
                      {remoteFile.content != null && <FileContent rel={remoteFile.rel} content={remoteFile.content} />}
                    </div>
                  )}
                </div>
              )}
              {status.upstream && (
                <div className="refresh-actions">
                  {working && (
                    <p className="refresh-wait" role="status">
                      {WAIT_MESSAGE}
                    </p>
                  )}
                  {status.tracking && (
                    <button className="btn" disabled={working} onClick={() => setChoose((c) => (c === 'pull' ? null : 'pull'))} data-testid="refresh-panel-pull">
                      Hämta in
                    </button>
                  )}
                  {status.branch !== 'main' && (
                    <button className="btn" disabled={working} onClick={() => setChoose((c) => (c === 'main' ? null : 'main'))} data-testid="refresh-panel-from-main">
                      Uppdatera från main
                    </button>
                  )}
                  {choose && !working && (
                    <Choice commands={choose === 'pull' ? PULL : FROM_MAIN} disabled={working} onPick={typeInShell} testId="refresh-panel-choice" />
                  )}
                </div>
              )}
              <button className="btn btn-quiet" onClick={() => act(async () => setConflicts(await bridge.getConflicts(projectId)))} data-testid="refresh-panel-conflicts">
                Visa konflikter
              </button>
              {conflicts && conflicts.length === 0 && <p className="muted">Inga konflikter.</p>}
              {conflicts && conflicts.length > 0 && (
                <div className="refresh-conflicts" data-testid="refresh-panel-conflict-list">
                  <ul className="refresh-list">
                    {conflicts.map((rel) => (
                      <li key={rel}>
                        <code>{rel}</code>
                        {CONFLICT_HELP[baseName(rel)] && <span className="muted"> {CONFLICT_HELP[baseName(rel)]}</span>}
                      </li>
                    ))}
                  </ul>
                  <p className="muted">Appen löser inga konflikter själv. Vill du avbryta, skriv kommandot i shell-fliken:</p>
                  <button className="btn btn-quiet" onClick={() => typeInShell('git rebase --abort')}>
                    git rebase --abort
                  </button>
                  <button className="btn btn-quiet" onClick={() => typeInShell('git merge --abort')}>
                    git merge --abort
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
