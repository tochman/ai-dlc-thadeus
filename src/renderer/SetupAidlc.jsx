// "Initiera AI-DLC" on the "not an AI-DLC project" screen (US-0503, FR4). Nothing in the folder changes
// until the person presses Enter on the command chain typed into the shell tab.
import { useState } from 'react';
import { useTerminal } from './TerminalContext.jsx';

export const INSTALL_URL = 'https://github.com/awslabs/aidlc-workflows';
export const FAILED_MESSAGE = 'Uppsättningen misslyckades — se terminalen. Kör `aidlc doctor` för att se vad som saknas.';
const PRESET_TEXT = {
  thorough: 'Starkare modeller och mer eftertanke: bäst resultat, högre kostnad.',
  balanced: 'En blandning som passar de flesta projekt.',
  minimal: 'Snabbare och billigare modeller för små ändringar.'
};

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

function Prerequisites({ info }) {
  return (
    <ul className="setup-checks" data-testid="setup-aidlc-checks">
      <li>
        <strong>AI-DLC:</strong> {info.aidlc.installed ? `installerat (${info.aidlc.version})` : 'saknas'}
      </li>
      <li>
        <strong>Git:</strong> {info.git.isRepo ? 'mappen är ett git-repo' : 'inget git-repo, så git init -b main läggs först'}
      </li>
      <li>
        <strong>Andra harnesses:</strong> {info.harnesses.length ? info.harnesses.join(', ') : 'inga'}
      </li>
    </ul>
  );
}

function Preview({ preview }) {
  if (!preview) return null;
  const counts = ['create', 'update', 'merge', 'preserve', 'remove', 'conflict'].filter((k) => preview[k] != null);
  return (
    <div className="setup-preview" data-testid="setup-aidlc-preview">
      {preview.error && <p className="refresh-error">{preview.error}</p>}
      {(preview.notes ?? []).map((n) => (
        <p key={n} className="tag-warn" role="note" data-testid="setup-aidlc-note">
          {n}
        </p>
      ))}
      {counts.length > 0 && <p>{counts.map((k) => `${k}: ${preview[k]}`).join(' · ')}</p>}
      {preview.conflicts.length > 0 && (
        <>
          <p className="refresh-error">Dessa filer krockar med befintliga filer. Lös det innan AI-DLC sätts upp:</p>
          <ul className="refresh-list">
            {preview.conflicts.map((f) => (
              <li key={f}>
                <code>{f}</code>
              </li>
            ))}
          </ul>
        </>
      )}
      {preview.raw && (
        <details>
          <summary>Hela förhandsvisningen</summary>
          <pre className="code-block">{preview.raw}</pre>
        </details>
      )}
    </div>
  );
}

function Advanced({ plugins, presets, chosen, setChosen, preset, setPreset }) {
  const toggle = (p) => setChosen((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));
  return (
    <details className="setup-advanced" data-testid="setup-aidlc-advanced">
      <summary>Avancerade inställningar</summary>
      <fieldset>
        <legend>Plugins</legend>
        {plugins.length === 0 && <p className="muted">Inga plugins att välja.</p>}
        {plugins.map((p) => (
          <label key={p} className="check">
            <input type="checkbox" checked={chosen.includes(p)} onChange={() => toggle(p)} data-testid="setup-aidlc-plugin" />
            {p}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>Modellnivå</legend>
        <label className="check">
          <input type="radio" name="preset" checked={preset === null} onChange={() => setPreset(null)} />
          Standard (ingen förinställning)
        </label>
        {presets.map((p) => (
          <label key={p} className="check">
            <input type="radio" name="preset" checked={preset === p} onChange={() => setPreset(p)} data-testid={`setup-aidlc-preset-${p}`} />
            {p} <span className="muted">{PRESET_TEXT[p]}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

/** Without the CLI there is nothing to set up with, so the flow stops here (FR4.2). */
function MissingTool() {
  return (
    <p data-testid="setup-aidlc-missing">
      Installera AI-DLC:s kommandoverktyg först, enligt anvisningen på{' '}
      <a href={INSTALL_URL} target="_blank" rel="noreferrer">
        {INSTALL_URL}
      </a>
      . Kontrollera sedan igen.
    </p>
  );
}

/** Offer separate feature docs (EPIC-06 FR4.1, FR4.2). Nothing is created here; SetupDone offers the request afterwards. */
function FeatureDocsChoice({ checked, onChange, exist }) {
  return (
    <div className="setup-feature-docs">
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} data-testid="setup-aidlc-feature-docs" />
        Använd separata feature-beskrivningar (FEATURES.md + en fil per epic)
      </label>
      <p className="muted">
        {exist
          ? 'Feature-beskrivningar finns redan. Valet lägger bara till en projektregel om att hålla dem uppdaterade.'
          : 'En översikt med epics i docs/FEATURES.md och en fil per epic med user stories, till exempel docs/features/epic-01-inloggning.md. Claude skapar dem efter uppsättningen, när du har bekräftat.'}
      </p>
    </div>
  );
}

/**
 * @param {{project: {projectId: string, root: string, detection: {reason: string}},
 *          featureDocs?: boolean, onFeatureDocsChange?: (on: boolean) => void, featureDocsExist?: boolean}} props
 *   featureDocs is held by ProjectContent so the choice survives the switch to the project view (FR4.3)
 */
export default function SetupAidlc({ project, featureDocs = false, onFeatureDocsChange, featureDocsExist = false }) {
  const terminal = useTerminal();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chosen, setChosen] = useState([]);
  const [preset, setPreset] = useState(null);
  const [started, setStarted] = useState(false);
  const bridge = window.bridge;

  async function check() {
    setLoading(true);
    setError(null);
    try {
      setInfo(await bridge.getSetupInfo(project.projectId));
    } catch (err) {
      setError(`Förutsättningarna kunde inte läsas: ${errorText(err)}`);
    } finally {
      setLoading(false);
    }
  }

  async function initiate() {
    setError(null);
    try {
      const cmd = await bridge.buildSetupCommand(project.projectId, { needsGit: !info.git.isRepo, plugins: chosen, preset });
      if (await terminal?.type('shell', cmd, { submit: false })) setStarted(true);
    } catch (err) {
      setError(`Kommandot kunde inte byggas: ${errorText(err)}`);
    }
  }

  const hasConflicts = (info?.preview?.conflicts.length ?? 0) > 0 || (info?.preview?.conflict ?? 0) > 0;
  const installed = info?.aidlc.installed === true;
  const blocked = !installed || hasConflicts;
  // The shell tab ending with an error before aidlc/spaces/ appeared (FR4.8). Nothing is rolled back.
  const shellCode = terminal?.exitCode('shell') ?? 0;
  const failed = started && terminal?.state('shell') === 'exited' && shellCode !== 0;

  return (
    <div className="panel empty-state setup-panel" role="status" data-testid="project-not-aidlc">
      <h2>Inget AI-DLC-projekt</h2>
      <p>{project.detection.reason}</p>
      <p className="muted">{project.root}</p>
      {!info && (
        <button className="btn btn-accent" onClick={check} disabled={loading} data-testid="setup-aidlc-start">
          {loading ? 'Kontrollerar…' : 'Initiera AI-DLC'}
        </button>
      )}
      {error && (
        <p className="refresh-error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <>
          <Prerequisites info={info} />
          {installed ? (
            <>
              <Preview preview={info.preview} />
              {info.warning && <p className="muted">{info.warning}</p>}
              <Advanced plugins={info.plugins} presets={info.presets} chosen={chosen} setChosen={setChosen} preset={preset} setPreset={setPreset} />
              {onFeatureDocsChange && <FeatureDocsChoice checked={featureDocs} onChange={onFeatureDocsChange} exist={featureDocsExist} />}
            </>
          ) : (
            <MissingTool />
          )}
          <div className="setup-actions">
            <button className="btn btn-accent" onClick={initiate} disabled={blocked} data-testid="setup-aidlc-run">
              Initiera
            </button>
            <button className="btn" onClick={check} disabled={loading}>
              Kontrollera igen
            </button>
          </div>
          {started && !failed && (
            <p className="muted">Kommandot står i shell-fliken. Tryck Enter där för att köra det. Vyn växlar när AI-DLC finns i mappen.</p>
          )}
          {failed && (
            <p className="refresh-error" role="alert" data-testid="setup-aidlc-failed">
              {FAILED_MESSAGE}
            </p>
          )}
        </>
      )}
    </div>
  );
}
