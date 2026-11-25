// US-0509 FR2.4, FR2.5, FR2.7, FR4.1, NFR1: what a change of plan means for an intent's stages, and the description that
// tailors one. Pure, used by main's pipeline and by the renderer. The comparison is a preview: AI-DLC decides.

const DESCRIPTION_MAX = 500;
const REVERSE_ENGINEERING = 'reverse-engineering';
const OPEN = new Set(['in-progress', 'awaiting-approval', 'revising']);

/**
 * US-0509 FR4.1: whether a stage belongs to the work, as AI-DLC counts it: every done one, also when the plan no longer has
 * it, and every one the plan runs that was not skipped, less each one the work has passed without starting.
 */
export const stageRuns = (s) => s.status === 'done' || (s.mode !== 'SKIP' && s.status !== 'skipped' && !(s.behind && s.status === 'not-started'));

/** A new project, as AI-DLC reads `Project Type`: one that is missing counts as Greenfield. */
const isNewProject = (projectType) => (projectType || 'Greenfield').toLowerCase() === 'greenfield';

/**
 * US-0509 FR2.4, FR2.5: what switching to `plan` does to the work, each list in pipeline order. The work's own stages are the
 * base (a tailored plan's are in its state file), not its scope's. `passed` are the plan's stages that will not run: behind
 * the current one, or skipped earlier. Reverse Engineering is not run in a new project.
 * @param {{phases: Array<{stages: object[]}>}} pipeline mergePipeline's
 * @param {{execute: string[]}} plan getPlanStages' answer
 * @param {{projectType?: string|null}} [work]
 * @returns {{added: string[], dropped: string[], kept: string[], passed: string[], currentDropped: string|null}}
 */
export function planChange(pipeline, plan, { projectType } = {}) {
  const stages = pipeline.phases.flatMap((p) => p.stages);
  const has = new Set(plan.execute.filter((slug) => slug !== REVERSE_ENGINEERING || !isNewProject(projectType)));
  const isAhead = (s) => OPEN.has(s.status) || (s.status !== 'skipped' && !s.behind);
  const slugs = (test) => stages.filter((s) => s.status !== 'done' && test(s)).map((s) => s.slug);

  const dropped = slugs((s) => isAhead(s) && s.mode !== 'SKIP' && !has.has(s.slug));
  const listed = new Set(stages.map((s) => s.slug));
  return {
    added: [...slugs((s) => isAhead(s) && s.mode === 'SKIP' && has.has(s.slug)), ...[...has].filter((slug) => !listed.has(slug))],
    dropped,
    kept: stages.filter((s) => s.status === 'done').map((s) => s.slug),
    passed: slugs((s) => !isAhead(s) && has.has(s.slug)),
    currentDropped: stages.find((s) => s.current && dropped.includes(s.slug))?.slug ?? null
  };
}

/** US-0509 NFR1: one line for the agent tab: every control character, line and paragraph separator becomes a space. */
const oneLine = (text) =>
  String(text ?? '')
    .replace(/[\p{Cc}\p{Zl}\p{Zp}\s]+/gu, ' ')
    .trim();

/**
 * US-0509 FR2.7: the description as it is typed, one clean line, or why it cannot be.
 * @returns {{text: string} | {error: 'empty'|'tooLong'}}
 */
export function checkDescription(text) {
  const line = oneLine(text);
  if (!line) return { error: 'empty' };
  return line.length > DESCRIPTION_MAX ? { error: 'tooLong' } : { text: line };
}

/** US-0509 NFR1 (and US-0903): the person's text as one quoted argument on the agent line, `\` and `"` escaped. */
export function quoted(text) {
  return `"${oneLine(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}
