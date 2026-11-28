import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PlanDesigner from '../../src/renderer/PlanDesigner.jsx';

const graph = [
  { slug: 'workspace-scaffold', phase: 'initialization' },
  { slug: 'scope-definition', phase: 'ideation' },
  { slug: 'code-generation', phase: 'construction' }
];

beforeEach(() => {
  window.bridge = {
    previewPlanEdit: vi.fn(async () => ({ file: 'aidlc/scopes/demo.md', diff: 'stage diff' })),
    applyPlanEdit: vi.fn(async () => ({ ok: true })),
    onConfigChanged: vi.fn(() => () => {}),
    previewSpeckitHookEdit: vi.fn(async () => ({ file: '.specify/extensions.yml', diff: 'hook diff' })),
    applySpeckitHookEdit: vi.fn(async () => ({ ok: true }))
  };
});
afterEach(cleanup);

describe('PlanDesigner (US-0906)', () => {
  it('shows ordered framework stages, marks skipped stages off, and keeps defaults in a side panel', () => {
    render(
      <PlanDesigner
        projectId="p"
        planName="demo"
        framework="aidlc"
        graph={graph}
        stages={{ 'workspace-scaffold': 'EXECUTE', 'code-generation': 'EXECUTE' }}
        defaults={{ plan_approval: 'on' }}
      />
    );
    const nodes = screen.getAllByTestId(/plan-designer-stage-/);
    expect(nodes.map((node) => node.dataset.stage)).toEqual(['workspace-scaffold', 'scope-definition', 'code-generation']);
    expect(screen.getByTestId('plan-designer-stage-scope-definition').textContent).toContain('Av');
    expect(screen.getByTestId('plan-designer-defaults').textContent).toContain('on');
  });

  it('previews a keyboard toggle and does not apply until Apply is selected', async () => {
    render(
      <PlanDesigner
        projectId="p"
        planName="demo"
        framework="aidlc"
        graph={graph}
        stages={{ 'workspace-scaffold': 'EXECUTE', 'scope-definition': 'EXECUTE' }}
        defaults={{}}
      />
    );
    fireEvent.click(screen.getByTestId('plan-designer-toggle-scope-definition'));
    await waitFor(() => expect(window.bridge.previewPlanEdit).toHaveBeenCalled());
    expect(window.bridge.applyPlanEdit).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('plan-designer-apply'));
    expect(window.bridge.applyPlanEdit).toHaveBeenCalledWith('p');
  });

  it('routes stage additions and removals through preview without writing early', async () => {
    render(
      <PlanDesigner
        projectId="p"
        planName="demo"
        framework="aidlc"
        graph={graph}
        stages={{ 'workspace-scaffold': 'EXECUTE', 'code-generation': 'EXECUTE' }}
        defaults={{}}
      />
    );
    fireEvent.change(screen.getByTestId('plan-designer-add-select'), { target: { value: 'scope-definition' } });
    fireEvent.click(screen.getByTestId('plan-designer-add-stage'));
    await waitFor(() =>
      expect(window.bridge.previewPlanEdit).toHaveBeenCalledWith('p', 'demo', {
        stages: { 'workspace-scaffold': 'EXECUTE', 'code-generation': 'EXECUTE', 'scope-definition': 'EXECUTE' }
      })
    );
    expect(window.bridge.applyPlanEdit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('plan-designer-cancel'));

    fireEvent.click(screen.getByTestId('plan-designer-remove-code-generation'));
    await waitFor(() => expect(window.bridge.previewPlanEdit).toHaveBeenLastCalledWith('p', 'demo', { stages: { 'workspace-scaffold': 'EXECUTE' } }));
    expect(window.bridge.applyPlanEdit).not.toHaveBeenCalled();
  });

  it('toggles a focused stage with Space and explains that arrow moves cannot change pipeline order', async () => {
    render(
      <PlanDesigner
        projectId="p"
        planName="demo"
        framework="aidlc"
        graph={graph}
        stages={{ 'workspace-scaffold': 'EXECUTE', 'scope-definition': 'EXECUTE' }}
        defaults={{}}
      />
    );
    const stage = screen.getByTestId('plan-designer-stage-scope-definition');
    stage.focus();
    fireEvent.keyDown(stage, { key: ' ', code: 'Space' });
    await waitFor(() => expect(window.bridge.previewPlanEdit).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('plan-designer-cancel'));
    fireEvent.keyDown(stage, { key: 'ArrowUp' });
    expect((await screen.findByTestId('plan-designer-problem')).textContent).toContain('ordning');
  });

  it('shows the Spec Kit spine locked and sends hook edits through preview before Apply', async () => {
    render(
      <PlanDesigner
        projectId="p"
        planName="speckit"
        framework="speckit"
        graph={[]}
        stages={{}}
        defaults={{}}
        extensions={[{ id: 'git', commands: ['git.push'] }]}
      />
    );
    expect(screen.getByTestId('plan-designer-speckit-spine').textContent).toContain('implement');
    fireEvent.click(screen.getByTestId('plan-designer-hook-add'));
    await waitFor(() => expect(window.bridge.previewSpeckitHookEdit).toHaveBeenCalled());
    expect(window.bridge.applySpeckitHookEdit).not.toHaveBeenCalled();
  });

  it('shows existing Spec Kit hooks and previews their removal', async () => {
    const onReload = vi.fn();
    render(
      <PlanDesigner
        projectId="p"
        planName="speckit"
        framework="speckit"
        graph={[]}
        stages={{}}
        defaults={{}}
        extensions={[{ id: 'git', commands: ['git.push'], hooks: [{ when: 'after', target: 'tasks', command: 'git.push', mode: 'optional' }] }]}
        onReload={onReload}
      />
    );
    expect(screen.getByTestId('plan-designer-speckit-hooks').textContent).toContain('git.push');
    fireEvent.click(screen.getByTestId('plan-designer-hook-remove-git-git-push'));
    await waitFor(() =>
      expect(window.bridge.previewSpeckitHookEdit).toHaveBeenCalledWith('p', expect.objectContaining({ action: 'remove', target: 'tasks', when: 'after' }))
    );
    expect(window.bridge.applySpeckitHookEdit).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('plan-designer-apply'));
    await waitFor(() => expect(onReload).toHaveBeenCalledTimes(1));
  });

  it('reloads the selected AI-DLC plan after a matching configuration change', async () => {
    let changed;
    window.bridge.onConfigChanged.mockImplementation((listener) => {
      changed = listener;
      return () => {};
    });
    window.bridge.getPlanStages = vi.fn(async () => ({
      ordered: ['workspace-scaffold', 'code-generation'],
      execute: ['workspace-scaffold', 'code-generation']
    }));
    const onReload = vi.fn();
    render(
      <PlanDesigner
        projectId="p"
        planName="demo"
        framework="aidlc"
        harness="claude"
        graph={graph}
        stages={{ 'workspace-scaffold': 'EXECUTE', 'scope-definition': 'EXECUTE' }}
        defaults={{}}
        onReload={onReload}
      />
    );

    changed({ projectId: 'other' });
    expect(window.bridge.getPlanStages).not.toHaveBeenCalled();
    changed({ projectId: 'p' });

    await waitFor(() => expect(window.bridge.getPlanStages).toHaveBeenCalledWith('p', 'claude', 'demo'));
    await waitFor(() => expect(screen.getByTestId('plan-designer-toggle-scope-definition').getAttribute('aria-pressed')).toBe('false'));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
