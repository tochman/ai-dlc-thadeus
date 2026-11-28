// US-0906 FR1.1, FR1.2, FR2.1–FR2.3, FR3.1–FR3.3, FR4.1: framework-bounded, accessible plan editor.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { checkHookEdit, checkStageEdit, SPECKIT_SPINE } from '../shared/planDesign.js';

const errorText = (error) => String(error?.message ?? error).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** US-0906 FR1.1, FR2.1, FR3.1: edits remain local until the proposed diff is explicitly applied. */
export default function PlanDesigner({ projectId, planName, framework, harness, graph = [], stages = {}, defaults = {}, extensions = [], onReload }) {
  const { t } = useTranslation();
  const [stageMap, setStageMap] = useState(stages);
  const [available, setAvailable] = useState([]);
  const [candidate, setCandidate] = useState('');
  const [preview, setPreview] = useState(null);
  const [problem, setProblem] = useState('');
  const [extension, setExtension] = useState(extensions[0]?.id ?? '');
  const [command, setCommand] = useState(extensions[0]?.commands?.[0] ?? '');
  const [target, setTarget] = useState(SPECKIT_SPINE[1]);
  const [position, setPosition] = useState('before');
  const [mode, setMode] = useState('optional');
  const nodes = useMemo(() => graph.map(({ slug, phase }) => ({ slug, phase, enabled: stageMap[slug] === 'EXECUTE' })), [graph, stageMap]);

  useEffect(() => {
    setStageMap(stages);
    setPreview(null);
  }, [stages]);
  useEffect(() => {
    const off = window.bridge.onConfigChanged?.((event) => {
      if (event?.projectId !== projectId) return;
      onReload?.();
      if (framework === 'aidlc' && harness) {
        window.bridge
          .getPlanStages(projectId, harness, planName)
          .then((result) => {
            setStageMap(Object.fromEntries(result.ordered.map((slug) => [slug, result.execute.includes(slug) ? 'EXECUTE' : 'SKIP'])));
          })
          .catch((error) => setProblem(errorText(error)));
      }
    });
    return () => {
      off?.();
    };
  }, [projectId, framework, harness, planName, onReload]);
  useEffect(() => {
    setAvailable(graph.filter((item) => stageMap[item.slug] !== 'EXECUTE' && item.phase !== 'initialization').map((item) => item.slug));
  }, [graph, stageMap]);

  async function showPreview(edit, valid) {
    if (!valid.ok) {
      setProblem(t('planDesigner.refused', { reason: t(`planDesigner.reason.${valid.reason}`) }));
      return;
    }
    setProblem('');
    try {
      if (framework === 'speckit') {
        const result = await window.bridge.previewSpeckitHookEdit(projectId, edit);
        setPreview({ kind: 'speckit', edit, result });
      } else {
        const result = await window.bridge.previewPlanEdit(projectId, planName, edit);
        setPreview({ kind: 'aidlc', edit, result });
      }
    } catch (error) {
      setProblem(errorText(error));
    }
  }

  async function applyPreview() {
    if (!preview) return;
    try {
      if (preview.kind === 'speckit') await window.bridge.applySpeckitHookEdit(projectId);
      else await window.bridge.applyPlanEdit(projectId);
      if (preview.kind === 'aidlc') setStageMap(preview.edit.stages);
      setPreview(null);
      setProblem(t('planDesigner.saved'));
      onReload?.();
    } catch (error) {
      setPreview(null);
      setProblem(errorText(error));
      onReload?.();
    }
  }

  if (framework === 'speckit') {
    const hook = { action: 'add', extension, command, when: position, target, mode };
    const valid = checkHookEdit({ ...hook, extensions: extensions.map((item) => item.id) });
    async function removeHook(item) {
      const edit = { action: 'remove', ...item };
      await showPreview(edit, checkHookEdit({ ...edit, extensions: extensions.map((entry) => entry.id) }));
    }
    return (
      <section className="plan-designer lcars-panel" data-testid="plan-designer-root">
        <h3 className="section-title">{t('planDesigner.title')}</h3>
        <ol className="plan-designer-spine" data-testid="plan-designer-speckit-spine" aria-label={t('planDesigner.speckitSpine')}>
          {SPECKIT_SPINE.map((step) => (
            <li key={step} aria-disabled="true">
              {step}
              <span className="tag">{t('planDesigner.locked')}</span>
            </li>
          ))}
        </ol>
        <ul className="plan-designer-hooks" data-testid="plan-designer-speckit-hooks" aria-label={t('planDesigner.currentHooks')}>
          {extensions
            .flatMap((item) => (item.hooks ?? []).map((current) => ({ ...current, extension: item.id })))
            .map((item) => (
              <li key={`${item.extension}-${item.when}-${item.target}-${item.command}`}>
                <span>
                  {t(`planDesigner.${item.when}`)} <code>{item.target}</code> →{' '}
                  <code>
                    {item.extension}.{item.command}
                  </code>
                </span>
                <span className="tag">{t(`planDesigner.${item.mode === 'off' ? 'disabled' : item.mode}`)}</span>
                <button
                  type="button"
                  className="btn"
                  onClick={() => removeHook(item)}
                  aria-label={`${t('planDesigner.removeHook')}: ${item.extension}.${item.command}`}
                  data-testid={`plan-designer-hook-remove-${`${item.extension}-${item.command}`.replace(/[^a-z0-9-]/gi, '-')}`}
                >
                  {t('planDesigner.removeHook')}
                </button>
              </li>
            ))}
        </ul>
        <div className="plan-designer-hook-form">
          <label className="field">
            <span className="field-label">{t('planDesigner.hookExtension')}</span>
            <select
              className="lcars-select"
              value={extension}
              onChange={(event) => setExtension(event.target.value)}
              data-testid="plan-designer-hook-extension"
            >
              {extensions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.id}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('planDesigner.hookCommand')}</span>
            <select className="lcars-select" value={command} onChange={(event) => setCommand(event.target.value)} data-testid="plan-designer-hook-command">
              {(extensions.find((item) => item.id === extension)?.commands ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('planDesigner.hookTarget')}</span>
            <select className="lcars-select" value={target} onChange={(event) => setTarget(event.target.value)} data-testid="plan-designer-hook-target">
              {SPECKIT_SPINE.map((step) => (
                <option key={step} value={step}>
                  {step}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('planDesigner.hookPosition')}</span>
            <select className="lcars-select" value={position} onChange={(event) => setPosition(event.target.value)} data-testid="plan-designer-hook-position">
              {['before', 'after'].map((value) => (
                <option key={value} value={value}>
                  {t(`planDesigner.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">{t('planDesigner.hookMode')}</span>
            <select className="lcars-select" value={mode} onChange={(event) => setMode(event.target.value)} data-testid="plan-designer-hook-mode">
              {['mandatory', 'optional', 'off'].map((value) => (
                <option key={value} value={value}>
                  {t(`planDesigner.${value === 'off' ? 'disabled' : value}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-accent" onClick={() => showPreview(hook, valid)} data-testid="plan-designer-hook-add">
            {t('planDesigner.addHook')}
          </button>
        </div>
        {problem && (
          <p role="status" aria-live="polite" data-testid="plan-designer-problem">
            {problem}
          </p>
        )}
        {preview && <Preview preview={preview} onApply={applyPreview} onCancel={() => setPreview(null)} />}
      </section>
    );
  }

  function toggle(slug, enabled) {
    const edit = { stages: { ...stageMap, [slug]: enabled ? 'EXECUTE' : 'SKIP' } };
    showPreview(edit, checkStageEdit(graph, stageMap, { slug, enabled }));
  }
  function addStage() {
    if (!candidate) return;
    const edit = { stages: { ...stageMap, [candidate]: 'EXECUTE' } };
    showPreview(edit, checkStageEdit(graph, stageMap, { slug: candidate, enabled: true }));
  }
  function removeStage(slug) {
    const next = { ...stageMap };
    delete next[slug];
    showPreview({ stages: next }, checkStageEdit(graph, stageMap, { slug, action: 'remove' }));
  }
  function handleStageKeyDown(event, slug) {
    if (event.target !== event.currentTarget) return;
    if (event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      toggle(slug, stageMap[slug] !== 'EXECUTE');
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const index = graph.findIndex((item) => item.slug === slug);
      const targetIndex = index + (event.key === 'ArrowUp' ? -1 : 1);
      showPreview({ stages: stageMap }, checkStageEdit(graph, stageMap, { slug, index: targetIndex }));
    }
  }

  return (
    <section className="plan-designer lcars-panel" data-testid="plan-designer-root">
      <h3 className="section-title">{t('planDesigner.title')}</h3>
      <div className="plan-designer-layout">
        <div>
          <h4>{t('planDesigner.stages')}</h4>
          <ol className="plan-designer-stages">
            {nodes.map((node) => (
              <li
                key={node.slug}
                className={`plan-designer-stage ${node.enabled ? 'is-on' : 'is-off'}`}
                data-testid={`plan-designer-stage-${node.slug}`}
                data-stage={node.slug}
                tabIndex={0}
                aria-keyshortcuts="Space ArrowUp ArrowDown"
                onKeyDown={(event) => handleStageKeyDown(event, node.slug)}
              >
                <code>{node.slug}</code>
                <span className="tag">{node.phase === 'initialization' ? t('planDesigner.locked') : t(`planDesigner.${node.enabled ? 'on' : 'off'}`)}</span>
                <button
                  type="button"
                  className="btn"
                  disabled={node.phase === 'initialization'}
                  onClick={() => toggle(node.slug, !node.enabled)}
                  aria-pressed={node.enabled}
                  aria-label={`${t(node.enabled ? 'planDesigner.off' : 'planDesigner.on')}: ${node.slug}`}
                  data-testid={`plan-designer-toggle-${node.slug}`}
                >
                  {t(node.enabled ? 'planDesigner.off' : 'planDesigner.on')}
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={!node.enabled || node.phase === 'initialization'}
                  onClick={() => removeStage(node.slug)}
                  aria-label={`${t('planDesigner.removeStage')}: ${node.slug}`}
                  data-testid={`plan-designer-remove-${node.slug}`}
                >
                  {t('planDesigner.removeStage')}
                </button>
              </li>
            ))}
          </ol>
          <div className="config-change-actions">
            <label className="field">
              <span className="field-label">{t('planDesigner.addStage')}</span>
              <select className="lcars-select" value={candidate} onChange={(event) => setCandidate(event.target.value)} data-testid="plan-designer-add-select">
                <option value="" />
                {available.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn" disabled={!candidate} onClick={addStage} data-testid="plan-designer-add-stage">
              {t('planDesigner.addStage')}
            </button>
          </div>
        </div>
        <aside className="plan-designer-defaults" data-testid="plan-designer-defaults">
          <h4>{t('planDesigner.defaults')}</h4>
          <dl>
            {Object.entries(defaults)
              .filter(([, value]) => value != null && value !== '')
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{t(`plans.defaults.${key}`, { defaultValue: key })}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
        </aside>
      </div>
      {problem && (
        <p role="status" aria-live="polite" data-testid="plan-designer-problem">
          {problem}
        </p>
      )}
      {preview && <Preview preview={preview} onApply={applyPreview} onCancel={() => setPreview(null)} />}
    </section>
  );
}

function Preview({ preview, onApply, onCancel }) {
  const { t } = useTranslation();
  return (
    <div className="panel plan-designer-preview" data-testid="plan-designer-preview">
      <p role="status">{t('planDesigner.previewReady')}</p>
      <code>{preview.result.file}</code>
      <pre>{preview.result.diff}</pre>
      <div className="config-change-actions">
        <button className="btn btn-accent" onClick={onApply} data-testid="plan-designer-apply">
          {t('planDesigner.apply')}
        </button>
        <button className="btn" onClick={onCancel} data-testid="plan-designer-cancel">
          {t('planDesigner.cancel')}
        </button>
      </div>
    </div>
  );
}
