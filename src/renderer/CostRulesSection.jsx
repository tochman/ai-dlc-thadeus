// The THADEUS cost rule pack in Configuration (US-0212 FR1). Lists every space and whether its files hold the block
// (FR1.2), edits the pack's lines per target file (FR1.1), and saves through a diff the person confirms (FR5.1).
// Clash warnings and broken files show with the diff and never block the save (FR6.2, FR2.4). Main keeps the
// previewed texts; only {on, lines} cross the bridge. US-0032 AC1: shipped lines a block lacks are offered, and adding
// them only edits the text; the usual preview and save write them.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COST_RULES_TARGETS } from '../shared/costRules.js';
import { ChangePanel } from './ConfigEdit.jsx';
import { RadioBlocks, Section } from './SettingsView.jsx';

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const testId = (target) => `cost-rules-lines-${target.replace('/', '-')}`;
const toLines = (text) =>
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
const STATE_TAG = { present: 'tag tag-done', absent: 'tag', broken: 'tag tag-error' };

function FileState({ file, state, problem }) {
  const { t } = useTranslation();
  return (
    <li>
      <code>{file}</code> <span className={STATE_TAG[state] ?? 'tag'}>{t(`costRules.state.${state}`)}</span>
      {problem && <span className="muted"> {t(`costRules.problem.${problem}`)}</span>}
    </li>
  );
}

/** The warnings and broken files of a preview, shown under its diff. */
function PreviewNotes({ preview }) {
  const { t } = useTranslation();
  const { warnings = [], errors = [] } = preview;
  return (
    <>
      {!preview.command && !preview.error && <p className="muted">{t('costRules.noChanges')}</p>}
      {warnings.length > 0 && (
        <div data-testid="cost-rules-warnings">
          <p className="field-label">{t('costRules.warningsTitle')}</p>
          <ul>
            {warnings.map((w, i) => (
              <li key={i}>
                <span className="tag tag-warn">{t('costRules.warning')}</span> {t('costRules.clash', { ...w })}
              </li>
            ))}
          </ul>
        </div>
      )}
      {errors.length > 0 && (
        <div data-testid="cost-rules-errors">
          <p className="field-label">{t('costRules.errorsTitle')}</p>
          <ul>
            {errors.map((e) => (
              <li key={e.file}>
                <span className="tag tag-error">{t('costRules.notWritten')}</span> <code>{e.file}</code> {t(`costRules.problem.${e.problem}`)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

/** US-0212 FR1: the cost rule pack's sub-block in an AI-DLC project's Configuration. */
export default function CostRulesSection({ projectId, motion }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [on, setOn] = useState(true);
  const [texts, setTexts] = useState({});
  const [calls, setCalls] = useState(null);

  function load() {
    return Promise.resolve()
      .then(() => window.bridge.costRulesStatus(projectId))
      .then((s) => {
        setStatus(s);
        setOn(s.on);
        setTexts(Object.fromEntries(COST_RULES_TARGETS.map((k) => [k, (s.lines[k] ?? []).join('\n')])));
        setLoadError(null);
      })
      .catch((err) => setLoadError(errorText(err)));
  }
  useEffect(() => {
    load();
  }, [projectId]);

  // US-0032 AC1: the shipped lines a present block lacks and the text does not hold yet.
  const missing = COST_RULES_TARGETS.flatMap((k) => {
    const have = toLines(texts[k] ?? '');
    return (status?.missing?.[k] ?? []).filter((l) => !have.includes(l)).map((line) => [k, line]);
  });
  function addMissing() {
    setTexts((cur) => {
      const next = { ...cur };
      for (const [k, line] of missing) next[k] = next[k] ? `${next[k]}\n${line}` : line;
      return next;
    });
  }

  function show() {
    const choice = { on, lines: Object.fromEntries(COST_RULES_TARGETS.map((k) => [k, toLines(texts[k] ?? '')])) };
    setCalls({
      preview: async () => {
        const r = await window.bridge.previewCostRules(projectId, choice);
        return {
          command: r.changes.map((c) => c.file).join(', ') || null,
          dryRun: r.changes.map((c) => `${c.file}\n${c.diff}`).join('\n\n') || null,
          warnings: r.warnings,
          errors: r.errors
        };
      },
      apply: async () => {
        const r = await window.bridge.applyCostRules(projectId);
        await load();
        if (r.ok) return { ok: true, output: r.output || t('costRules.compiled') };
        const key = r.restored ? 'costRules.restored' : 'costRules.notRestored';
        return { ok: false, error: t(key, { error: r.error, files: (r.notRestored ?? []).join(', ') }) };
      }
    });
  }

  return (
    <div className="project-settings" data-testid="cost-rules-section">
      <Section id="project-cost-rules" motion={motion} title={t('settings.project.sections.costRules')}>
        <p className="muted">{t('costRules.help')}</p>
        {loadError && (
          <p className="refresh-error" role="alert" data-testid="cost-rules-load-error">
            {loadError}
          </p>
        )}
        {!status && !loadError && (
          <p className="muted" role="status">
            {t('costRules.loading')}
          </p>
        )}
        {status && (
          <>
            <div className="field">
              <span className="field-label">{t('costRules.spacesTitle')}</span>
              {status.spaces.map(({ space, files }) => (
                <div key={space} data-testid={`cost-rules-space-${space}`}>
                  <strong>{space}</strong>
                  <ul>
                    {files.map((f) => (
                      <FileState key={f.file} {...f} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="field">
              <span className="field-label">{t('costRules.modeLegend')}</span>
              <RadioBlocks
                name={`cost-rules-${projectId}`}
                ids={['on', 'off']}
                labelKey="costRules.mode"
                value={on ? 'on' : 'off'}
                onPick={(id) => setOn(id === 'on')}
                testIdPrefix="cost-rules-mode"
              />
            </div>
            {on && missing.length > 0 && (
              <div className="field" data-testid="cost-rules-missing">
                <span className="field-label">{t('costRules.missingTitle')}</span>
                <ul>
                  {missing.map(([k, line]) => (
                    <li key={`${k}:${line}`}>
                      <span className="tag tag-warn">{`${k}.md`}</span> {line}
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn" onClick={addMissing} data-testid="cost-rules-add-missing">
                  {t('costRules.addMissing')}
                </button>
              </div>
            )}
            {COST_RULES_TARGETS.map((target) => (
              <label key={target} className="field">
                <span className="field-label">{t('costRules.linesFor', { file: `${target}.md` })}</span>
                <textarea
                  className="cost-rules-lines"
                  rows={4}
                  value={texts[target] ?? ''}
                  disabled={!on}
                  onChange={(e) => setTexts((cur) => ({ ...cur, [target]: e.target.value }))}
                  data-testid={testId(target)}
                />
              </label>
            ))}
            <button type="button" className="btn" onClick={show} data-testid="cost-rules-preview">
              {t('costRules.preview')}
            </button>
            {calls && <ChangePanel {...calls} onClose={() => setCalls(null)} renderExtra={(p) => <PreviewNotes preview={p} />} />}
          </>
        )}
      </Section>
    </div>
  );
}
