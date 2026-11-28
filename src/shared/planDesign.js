// US-0906 FR1.1, FR1.2, FR2.2, FR2.3: framework-bounded plan and Spec Kit hook editing rules.
const SAFE_NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/;

export const SPECKIT_SPINE = ['constitution', 'specify', 'clarify', 'plan', 'tasks', 'analyze', 'implement'];

/** US-0906 FR1.1: render every available stage in compiled pipeline order, including disabled stages. */
export function designOf(graph, stages = {}) {
  return graph.map(({ slug, phase }) => ({
    slug,
    enabled: stages[slug] === 'EXECUTE',
    locked: phase === 'initialization'
  }));
}

/** US-0906 FR2.2: reject stage changes outside the graph, out of order, or leaving no executable stage. */
export function checkStageEdit(graph, stages, edit) {
  if (edit?.stages && !Object.values(edit.stages).includes('EXECUTE')) return { ok: false, reason: 'emptyPlan' };
  const index = graph.findIndex((stage) => stage.slug === edit?.slug);
  if (index < 0) return { ok: false, reason: 'unknownStage' };
  if (edit.index !== undefined && edit.index !== index) return { ok: false, reason: 'pipelineOrder' };
  if (graph[index].phase === 'initialization' && edit.enabled === false) return { ok: false, reason: 'initializationLocked' };
  const next = { ...stages };
  if (edit.action === 'remove' || edit.enabled === false) delete next[edit.slug];
  else next[edit.slug] = 'EXECUTE';
  if (!Object.values(next).includes('EXECUTE')) return { ok: false, reason: 'emptyPlan' };
  return { ok: true };
}

/** US-0906 FR2.3: hooks may only use known spine points, installed extensions and safe command names. */
export function checkHookEdit(edit) {
  if (edit?.action === 'remove-spine') return { ok: false, reason: 'lockedSpine' };
  if (!SPECKIT_SPINE.includes(edit?.target)) return { ok: false, reason: 'unknownSpineStep' };
  if (!SAFE_NAME.test(edit?.command ?? '')) return { ok: false, reason: 'unsafeCommand' };
  if (!Array.isArray(edit?.extensions) || !edit.extensions.includes(edit.extension)) return { ok: false, reason: 'unknownExtension' };
  if (!['before', 'after'].includes(edit.when) || !['mandatory', 'optional', 'off'].includes(edit.mode ?? 'optional'))
    return { ok: false, reason: 'invalidHook' };
  return { ok: true };
}
