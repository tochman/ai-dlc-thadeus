// "Uppdatera från GitHub" in the sidebar (US-0502, FR3). The app only reads from git; every command that
// changes the working tree is typed into the shell tab without Enter, for the person to run (NFR1).
// US-1201 AC-5: named after the platform of origin ("Uppdatera från GitLab"), and it holds the collision warning (AC-2).
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTerminal } from './TerminalContext.jsx';
import { FileContent } from './ArtifactReader.jsx';
import { useWorkflowRunning, waitText } from './workflowBusy.js';
import CollisionPanel from './CollisionPanel.jsx';

export const PULL = { rebase: 'git pull --rebase --autostash', merge: 'git pull --no-rebase --autostash' };
export const FROM_MAIN = { rebase: 'git fetch && git rebase origin/main', merge: 'git fetch && git merge origin/main' };
const CONFLICT_HELP_KEY = { 'intents.json': 'github.conflictIntents', 'aidlc-state.md': 'github.conflictState' };

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const baseName = (rel) => rel.slice(rel.lastIndexOf('/') + 1);

function Choice({ commands, disabled, onPick, testId }) {
  const { t } = useTranslation();
  return (
    <div className="refresh-choice" data-testid={testId}>
      {['rebase', 'merge'].map((k) => (
        <div key={k} className="refresh-choice-row">
          <button className="btn" disabled={disabled} onClick={() => onPick(commands[k])} data-testid={`${testId}-${k}`}>
            {t(`github.${k}`)}
          </button>
          <span className="muted">
            {t(`github.${k}Text`)} <code>{commands[k]}</code>
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusLine({ status, working }) {
  const { t } = useTranslation();
  return (
    <dl className="refresh-status" data-testid="refresh-panel-status">
      <div>
        <dt>{t('github.branch')}</dt>
        <dd>{status.branch ?? '–'}</dd>
      </div>
      <div>
        <dt>{t('github.comparedWith')}</dt>
        <dd>{status.upstream ?? t('github.noRemote')}</dd>
      </div>
      {status.upstream && (
        <div>
          <dt>{t('github.aheadBehind')}</dt>
          <dd>
            {status.ahead} / {status.behind}
          </dd>
        </div>
      )}
      <div>
        <dt>{t('github.uncommitted')}</dt>
        <dd>{t('github.dirty', { aidlc: status.dirtyAidlc, other: status.dirtyOther })}</dd>
      </div>
      <div>
        <dt>{t('github.aidlc')}</dt>
        <dd>{working ? t('github.working') : t('github.resting')}</dd>
      </div>
    </dl>
  );
}

/** US-1201 AC-1, AC-5: origin's platform ({name, …}), null for plain git, undefined while it is read. */
function usePlatform(projectId) {
  const [platform, setPlatform] = useState(undefined);
  useEffect(() => {
    let live = true;
    Promise.resolve(window.bridge.getPlatform?.(projectId) ?? null).then(
      (p) => live && setPlatform(p ?? null),
      (err) => {
        console.warn('The platform of origin could not be read:', errorText(err)); // the panel is named after git
        if (live) setPlatform(null);
      }
    );
    return () => {
      live = false;
    };
  }, [projectId]);
  return platform;
}

/**
 * @param {{projectId: string, space: string, lastIntentChangeAt: {name: string, stage: string|null, at: number|null}|null,
 *   open?: boolean, onToggle?: () => void, activeDirName?: string|null}} props
 *   lastIntentChangeAt is useProject's in-flight intent, null when none (US-0041 AC1, AC4);
 *   open/onToggle let the left arm's "Github" block drive the panel (FR2.2); without them it keeps its own state;
 *   activeDirName is the intent the merge note goes into (US-1201 AC-2)
 */
export default function RefreshPanel({ projectId, space, lastIntentChangeAt, open: openProp, onToggle, activeDirName = null }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const toggle = onToggle ?? (() => setOwnOpen((o) => !o));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [changes, setChanges] = useState(null);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(false);
  const [choose, setChoose] = useState(null); // 'pull' | 'main' | null
  const [conflicts, setConflicts] = useState(null);
  const [remoteFile, setRemoteFile] = useState(null); // {rel, content?, error?}
  const working = useWorkflowRunning(terminal, lastIntentChangeAt); // FR3.5, the rule shared with US-0504 FR4
  const platform = usePlatform(projectId);
  const [refreshKey, setRefreshKey] = useState(0); // the collision warning reads again after each fetch (US-1201 AC-2)
  const bridge = window.bridge;

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(t('github.failed', { error: errorText(err) })); // shown here, never in the shared banner (NFR2)
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
      setRefreshKey((k) => k + 1);
    });

  async function openRemote(rel) {
    setRemoteFile({ rel });
    try {
      setRemoteFile({ rel, content: await bridge.showRemoteFile(projectId, changes.ref, rel) });
    } catch (err) {
      setRemoteFile({ rel, error: t('github.remoteFileFailed', { ref: changes.ref, error: errorText(err) }) });
    }
  }

  const typeInShell = (cmd) => terminal?.type('shell', cmd, { submit: false });
  const badge = changes?.aidlcCommits ? t('github.badge', { n: changes.aidlcCommits, ref: changes.ref }) : null;

  return (
    <section className="refresh-panel" data-testid="refresh-panel">
      <button className="cost-panel-toggle lcars-heading" onClick={toggle} aria-expanded={open} data-testid="refresh-panel-toggle">
        <span className="section-title">{platform ? t('github.titleOn', { platform: platform.name }) : t('github.titleGit')}</span>
        <span className="lcars-heading-line" aria-hidden="true" />
        {badge && <span className="tag tag-active">{t('github.newCount', { n: changes.aidlcCommits })}</span>}
        <span className="lcars-heading-meta">{t('github.meta')}</span>
        <span className="toggle-arrow" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>
      {open && (
        <div className="refresh-body">
          {error && (
            <p className="refresh-error" role="alert">
              {error}
            </p>
          )}
          {status && !status.isRepo && <p className="muted">{t('github.notRepo')}</p>}
          {status?.isRepo && (
            <>
              <StatusLine status={status} working={working} />
              <button className="btn btn-accent" onClick={refresh} disabled={busy} data-testid="refresh-panel-update">
                {busy ? t('github.fetching') : t('github.update')}
              </button>
              {!status.upstream && <p className="muted">{t('github.noUpstream')}</p>}
              {changes && (
                <p className="refresh-badge" data-testid="refresh-panel-badge">
                  {badge ?? t('github.nothingNew', { ref: changes.ref })}
                  <br />
                  <span className="muted">{t('github.otherFiles', { n: changes.otherFiles.length })}</span>
                </p>
              )}
              {changes && (changes.aidlcFiles.length > 0 || changes.newIntents.length > 0) && (
                <button className="btn" onClick={() => setDetails((d) => !d)} aria-expanded={details} data-testid="refresh-panel-details">
                  {details ? t('common.hide') : t('common.show')}
                </button>
              )}
              {details && changes && (
                <div className="refresh-details" data-testid="refresh-panel-detail-list">
                  {changes.newIntents.length > 0 && (
                    <ul className="refresh-list">
                      {changes.newIntents.map((i) => (
                        <li key={i.dirName}>
                          {i.slug ?? i.dirName}{' '}
                          <span className="tag tag-live">{platform ? t('github.onPlatform', { platform: platform.name }) : t('github.onRemote')}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="muted">{t('github.auditLines', { n: changes.auditLines })}</p>
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
                        <code className="file-path">{t('github.readOnlyFile', { ref: changes.ref, rel: remoteFile.rel })}</code>
                        <button className="btn" onClick={() => setRemoteFile(null)}>
                          {t('common.close')}
                        </button>
                      </div>
                      {remoteFile.error && <p className="refresh-error">{remoteFile.error}</p>}
                      {remoteFile.content != null && <FileContent rel={remoteFile.rel} content={remoteFile.content} />}
                    </div>
                  )}
                </div>
              )}
              <CollisionPanel projectId={projectId} space={space} activeDirName={activeDirName} refreshKey={refreshKey} />
              {status.upstream && (
                <div className="refresh-actions">
                  {working && (
                    <p className="refresh-wait" role="status">
                      {waitText(t, lastIntentChangeAt)}
                    </p>
                  )}
                  {status.tracking && (
                    <button
                      className="btn"
                      disabled={working}
                      onClick={() => setChoose((c) => (c === 'pull' ? null : 'pull'))}
                      data-testid="refresh-panel-pull"
                    >
                      {t('github.pull')}
                    </button>
                  )}
                  {status.branch !== 'main' && (
                    <button
                      className="btn"
                      disabled={working}
                      onClick={() => setChoose((c) => (c === 'main' ? null : 'main'))}
                      data-testid="refresh-panel-from-main"
                    >
                      {t('github.fromMain')}
                    </button>
                  )}
                  {choose && !working && (
                    <Choice commands={choose === 'pull' ? PULL : FROM_MAIN} disabled={working} onPick={typeInShell} testId="refresh-panel-choice" />
                  )}
                </div>
              )}
              <button
                className="btn btn-quiet"
                onClick={() => act(async () => setConflicts(await bridge.getConflicts(projectId)))}
                data-testid="refresh-panel-conflicts"
              >
                {t('github.showConflicts')}
              </button>
              {conflicts && conflicts.length === 0 && <p className="muted">{t('github.noConflicts')}</p>}
              {conflicts && conflicts.length > 0 && (
                <div className="refresh-conflicts" data-testid="refresh-panel-conflict-list">
                  <ul className="refresh-list">
                    {conflicts.map((rel) => {
                      const help = CONFLICT_HELP_KEY[baseName(rel)];
                      return (
                        <li key={rel}>
                          <code>{rel}</code>
                          {help && <span className="muted"> {t(help, { harness: terminal?.harness?.name ?? t('terminal.agent') })}</span>}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="muted">{t('github.abortHelp')}</p>
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
