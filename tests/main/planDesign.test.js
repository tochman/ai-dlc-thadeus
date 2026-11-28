import { describe, expect, it } from 'vitest';
import { checkHookEdit, checkStageEdit, designOf, SPECKIT_SPINE } from '../../src/shared/planDesign.js';

const graph = [
  { slug: 'workspace-scaffold', phase: 'initialization' },
  { slug: 'scope-definition', phase: 'ideation' },
  { slug: 'requirements-analysis', phase: 'inception' },
  { slug: 'code-generation', phase: 'construction' }
];

describe('US-0906 plan design rules', () => {
  it('shows selected stages in pipeline order with explicit off states', () => {
    expect(designOf(graph, { 'code-generation': 'EXECUTE', 'scope-definition': 'SKIP' })).toEqual([
      { slug: 'workspace-scaffold', enabled: false, locked: true },
      { slug: 'scope-definition', enabled: false, locked: false },
      { slug: 'requirements-analysis', enabled: false, locked: false },
      { slug: 'code-generation', enabled: true, locked: false }
    ]);
  });

  it.each([
    [{ slug: 'not-a-stage', enabled: true }, 'unknownStage'],
    [{ slug: 'code-generation', enabled: true, index: 0 }, 'pipelineOrder'],
    [{ slug: 'workspace-scaffold', enabled: false }, 'initializationLocked'],
    [{ stages: {} }, 'emptyPlan']
  ])('refuses a disallowed AI-DLC edit with a reason key', (edit, reason) => {
    expect(checkStageEdit(graph, { 'scope-definition': 'EXECUTE' }, edit)).toEqual({ ok: false, reason });
  });

  it('allows a Spec Kit hook on a spine step', () => {
    expect(checkHookEdit({ action: 'add', extension: 'custom', command: 'custom.run', when: 'before', target: 'specify', extensions: ['custom'] })).toEqual({
      ok: true
    });
  });

  it.each([
    [{ target: 'unknown' }, 'unknownSpineStep'],
    [{ command: '../unsafe' }, 'unsafeCommand'],
    [{ extension: 'missing' }, 'unknownExtension'],
    [{ action: 'remove-spine', target: SPECKIT_SPINE[0] }, 'lockedSpine']
  ])('refuses invalid Spec Kit hook edits with a reason key', (override, reason) => {
    const edit = { action: 'add', extension: 'custom', command: 'custom.run', when: 'after', target: 'specify', extensions: ['custom'], ...override };
    expect(checkHookEdit(edit)).toEqual({ ok: false, reason });
  });
});
