// Plans view (EPIC-09 US-0903): the project's own plans and the harness's stock ones, with their stages and
// defaults. Composing, starting and changing steps are agent requests typed into the agent tab without Enter;
// saving runs `aidlc engine scope save` (tier 1); editing and deleting an own plan go through main after a diff
// or a confirmation (tier 2). The view reloads on config:changed, which the watch on the plan folders sends.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { harnessCommand } from '../shared/harnesses.js';
import { validPlanName } from '../shared/planName.js';
import { ChangePanel } from './ConfigEdit.jsx';
import { useTerminal } from './TerminalContext.jsx';

const DEPTHS = ['Minimal', 'Standard', 'Comprehensive'];
const DEFAULT_KEYS = ['review_cap', 'sensors', 'learnings', 'summary_confirmation', 'plan_approval', 'guard_policy', 'collaborators'];
const SAVE_COMMAND = ['aidlc', 'engine', 'scope', 'save', '--name']; // shown before main runs it
const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

/** The person's text as one quoted argument on the agent line: one line, `\` and `"` escaped. */
export function quoted(text) {
  return `"${String(text).replace(/\s+/g, ' ').trim().replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

/** One text field with a send button; `check` returns an error text or null and disables the button. */
function Ask({ label, check, button, onSend, onCancel, testid }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const problem = text.trim() ? check?.(text.trim()) ?? null : null;
  return (
    <form
      className="panel config-change plans-ask"
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim() && !problem) onSend(text.trim());
      }}
      data-testid={testid}
    >
      <label className="field">
        <span className="field-label">{label}</span>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} autoFocus data-testid={`${testid}-input`} />
      </label>
      {problem && (
        <p className="refresh-error" role="alert" data-testid={`${testid}-problem`}>
          {problem}
        </p>
      )}
      <div className="config-change-actions">
        <button className="btn btn-accent" type="submit" disabled={!text.trim() || !!problem} data-testid={`${testid}-send`}>
          {button}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function EditForm({ plan, onPreview, onCancel }) {
  const { t } = useTranslation();
  const [description, setDescription] = useState(plan.description ?? '');
  const [depth, setDepth] = useState(plan.depth ?? DEPTHS[0]);
  const [keywords, setKeywords] = useState('');
  return (
    <div className="panel config-change" data-testid="plans-edit">
      <label className="field">
        <span className="field-label">{t('plans.description')}</span>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="plans-edit-description" />
      </label>
      <label className="field">
        <span className="field-label">{t('plans.depth')}</span>
        <select className="lcars-select" value={depth} onChange={(e) => setDepth(e.target.value)} data-testid="plans-edit-depth">
          {DEPTHS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="field-label">{t('plans.keywords')}</span>
        <input type="text" value={keywords} placeholder={t('plans.keywordsHint')} onChange={(e) => setKeywords(e.target.value)} data-testid="plans-edit-keywords" />
      </label>
      <div className="config-change-actions">
        <button
          className="btn btn-accent"
          onClick={() =>
            onPreview({
              description,
              depth,
              ...(keywords.trim() ? { keywords: keywords.split(',').map((w) => w.trim()).filter(Boolean) } : {})
            })
          }
          data-testid="plans-edit-preview"
        >
          {t('plans.showDiff')}
        </button>
        <button className="btn" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </div>
  );
}

function Stages({ stages }) {
  const { t } = useTranslation();
  if (stages.error) return <p className="refresh-error" role="alert">{stages.error}</p>;
  if (!stages.execute) return <p className="muted" role="status">{t('plans.loading')}</p>;
  return (
    <div className="config-row" data-testid="plans-stages">
      {[
        ['execute', stages.execute],
        ['skip', stages.skip]
      ].map(([kind, list]) => (
        <div key={kind} className="plans-stage-list" data-testid={`plans-stages-${kind}`}>
          <h3>{t(`plans.${kind}`, { n: list.length })}</h3>
          <ul>
            {list.map((s) => (
              <li key={s}>
                <code>{s}</code>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * @param {{projectId: string, visible: boolean, harness: string|null}} props  harness: the agent tab's harness id
 */
export default function PlansView({ projectId, visible, harness }) {
  const { t } = useTranslation();
  const terminal = useTerminal();
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [open, setOpen] = useState(null); // {name, stages}
  const [action, setAction] = useState(null); // {kind, plan?, calls?}
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!harness) return;
    const n = ++seq.current;
    try {
      const data = await window.bridge.listPlans(projectId, harness);
      if (n === seq.current) setState({ loading: false, data, error: null });
    } catch (err) {
      if (n === seq.current) setState({ loading: false, data: null, error: errorText(err) });
    }
  }, [projectId, harness]);
  useEffect(() => {
    load();
  }, [load]);

  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const stale = useRef(false);
  useEffect(
    () =>
      window.bridge.onConfigChanged?.((c) => {
        if (c.projectId !== projectId) return;
        if (visibleRef.current) load();
        else stale.current = true;
      }),
    [projectId, load]
  );
  useEffect(() => {
    if (visible && stale.current) {
      stale.current = false;
      load();
    }
  }, [visible, load]);

  async function openPlan(name) {
    if (open?.name === name) return setOpen(null);
    setOpen({ name, stages: {} });
    try {
      const stages = await window.bridge.getPlanStages(projectId, harness, name);
      setOpen((o) => (o?.name === name ? { name, stages } : o));
    } catch (err) {
      setOpen((o) => (o?.name === name ? { name, stages: { error: errorText(err) } } : o));
    }
  }

  const agentBase = harnessCommand(terminal?.harness); // the harness's own command, or null without one
  function typeLine(suffix) {
    setAction(null);
    terminal?.type('agent', [agentBase, suffix].join(' '), { submit: false });
  }

  function save(name) {
    setAction({
      kind: 'saveRun',
      calls: {
        preview: async () => ({ command: SAVE_COMMAND.concat(name).join(' '), dryRun: null }),
        apply: () => window.bridge.savePlan(projectId, name)
      }
    });
  }
  function previewEdit(plan, edit) {
    setAction({
      kind: 'editRun',
      plan,
      calls: {
        preview: async () => {
          const r = await window.bridge.previewPlanEdit(projectId, plan.name, edit);
          return { command: r.file, dryRun: r.diff || t('plans.noChange') };
        },
        apply: async () => {
          const r = await window.bridge.applyPlanEdit(projectId);
          return r.ok ? { ok: true, output: r.output } : r;
        }
      }
    });
  }
  async function remove(plan) {
    if (!window.confirm(t('plans.deleteConfirm', { name: plan.name }))) return;
    try {
      const r = await window.bridge.deletePlan(projectId, plan.name);
      if (!r.ok) setState((s) => ({ ...s, error: r.error }));
      if (open?.name === plan.name) setOpen(null);
    } catch (err) {
      window.alert(errorText(err));
    }
  }

  const d = state.data;
  const active = d?.active ?? null;
  return (
    <div className="config-view plans-view" data-testid="plans-view">
      <div className="config-change-actions">
        <button className="btn btn-accent" disabled={!agentBase} onClick={() => setAction({ kind: 'new' })} data-testid="plans-new">
          {t('plans.new')}
        </button>
        {active?.plan && (
          <button className="btn" onClick={() => setAction({ kind: 'save' })} data-testid="plans-save">
            {t('plans.save')}
          </button>
        )}
      </div>
      {action?.kind === 'new' && (
        <Ask
          label={t('plans.newAsk')}
          button={t('plans.type')}
          onSend={(text) => typeLine(`compose ${quoted(text)}`)}
          onCancel={() => setAction(null)}
          testid="plans-new-ask"
        />
      )}
      {action?.kind === 'save' && (
        <Ask
          label={t('plans.saveAsk', { intent: active.slug ?? active.dirName })}
          button={t('plans.save')}
          check={(name) => (validPlanName(name) ? null : t('errors.invalidPlanName', { name }))}
          onSend={save}
          onCancel={() => setAction(null)}
          testid="plans-save-ask"
        />
      )}
      {action?.kind === 'saveRun' && <ChangePanel {...action.calls} onClose={() => setAction(null)} />}

      {state.loading || !harness ? (
        <p className="muted" role="status">
          {t('plans.loading')}
        </p>
      ) : state.error ? (
        <p className="refresh-error" role="alert" data-testid="plans-error">
          {state.error}
        </p>
      ) : null}
      {d && (
        <ul className="config-plans plans-list">
          {d.plans.map((p) => {
            const users = p.intents.filter((i) => i.running);
            const isActive = active && (active.plan ?? active.scope) === p.name;
            const mine = action?.plan?.name === p.name ? action : null;
            return (
              <li key={p.name} className={isActive ? 'is-active' : ''} data-testid="plans-plan">
                <div className="plans-head">
                  <button className="btn-link" aria-expanded={open?.name === p.name} onClick={() => openPlan(p.name)} data-testid="plans-open">
                    <strong>{p.name}</strong>
                  </button>
                  <span className="tag">{p.own ? t('plans.own') : t('plans.stock')}</span>
                  {isActive && <span className="tag tag-active">{t('plans.active')}</span>}
                  {p.description && <span className="muted">{p.description}</span>}
                </div>
                <p className="muted" data-testid="plans-facts">
                  {[
                    t('plans.facts', { depth: p.depth ?? '—', n: p.stageCount ?? 0 }),
                    ...DEFAULT_KEYS.filter((k) => p.defaults?.[k]).map((k) => `${t(`plans.defaults.${k}`)}: ${p.defaults[k]}`)
                  ].join(' · ')}
                </p>
                <div className="config-change-actions">
                  <button className="btn" disabled={!agentBase} onClick={() => setAction({ kind: 'start', plan: p })} data-testid="plans-start">
                    {t('plans.start')}
                  </button>
                  <button className="btn" disabled={!agentBase} onClick={() => setAction({ kind: 'steps', plan: p })} data-testid="plans-steps">
                    {t('plans.steps')}
                  </button>
                  {p.own && (
                    <>
                      <button className="btn" onClick={() => setAction({ kind: 'edit', plan: p })} data-testid="plans-edit-open">
                        {t('plans.edit')}
                      </button>
                      <button className="btn" disabled={users.length > 0} onClick={() => remove(p)} data-testid="plans-delete">
                        {t('plans.delete')}
                      </button>
                      {users.length > 0 && (
                        <span className="muted" data-testid="plans-delete-reason">
                          {t('plans.inUse', { intents: users.map((i) => i.slug ?? i.dirName).join(', ') })}
                        </span>
                      )}
                    </>
                  )}
                </div>
                {mine?.kind === 'start' && (
                  <Ask
                    label={t('plans.startAsk', { name: p.name })}
                    button={t('plans.type')}
                    onSend={(text) => typeLine(['--scope', p.name, quoted(text)].join(' '))}
                    onCancel={() => setAction(null)}
                    testid="plans-start-ask"
                  />
                )}
                {mine?.kind === 'steps' && (
                  <Ask
                    label={t('plans.stepsAsk', { name: p.name })}
                    button={t('plans.type')}
                    onSend={(text) => typeLine(`compose ${quoted(t('plans.stepsRequest', { name: p.name, what: text }))}`)}
                    onCancel={() => setAction(null)}
                    testid="plans-steps-ask"
                  />
                )}
                {mine?.kind === 'edit' && <EditForm plan={p} onPreview={(edit) => previewEdit(p, edit)} onCancel={() => setAction(null)} />}
                {mine?.kind === 'editRun' && <ChangePanel {...mine.calls} onClose={() => setAction(null)} />}
                {open?.name === p.name && <Stages stages={open.stages} />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
