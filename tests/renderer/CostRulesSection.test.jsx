import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CostRulesSection from '../../src/renderer/CostRulesSection.jsx';

// The shapes costRules:status and costRules:preview return (src/main/costRules.js, the texts kept in main).
const STATUS = {
  spaces: [
    {
      space: 'default',
      files: [
        { target: 'project', file: 'aidlc/spaces/default/memory/project.md', state: 'present' },
        { target: 'phases/construction', file: 'aidlc/spaces/default/memory/phases/construction.md', state: 'absent' }
      ]
    },
    {
      space: 'team-b',
      files: [
        { target: 'project', file: 'aidlc/spaces/team-b/memory/project.md', state: 'broken', problem: 'onlyStart' },
        { target: 'phases/construction', file: 'aidlc/spaces/team-b/memory/phases/construction.md', state: 'absent' }
      ]
    }
  ],
  on: true,
  lines: { project: ['ALWAYS be brief.', 'NEVER read node_modules.'], 'phases/construction': ['ALWAYS run only the test being worked on.'] }
};
const PREVIEW = {
  changes: [{ space: 'default', file: 'aidlc/spaces/default/memory/phases/construction.md', diff: '+ - ALWAYS run only the test being worked on.' }],
  errors: [{ space: 'team-b', file: 'aidlc/spaces/team-b/memory/project.md', problem: 'onlyStart' }],
  warnings: [
    {
      space: 'default',
      file: 'aidlc/spaces/default/memory/team.md',
      line: 'ALWAYS run only the test being worked on.',
      rule: '- **Suite green before merge**: the full suite must pass.'
    }
  ]
};

function mockBridge({ apply = { ok: true, files: ['f'], output: 'graph compiled' } } = {}) {
  window.bridge = {
    costRulesStatus: vi.fn(async () => STATUS),
    previewCostRules: vi.fn(async () => PREVIEW),
    applyCostRules: vi.fn(async () => apply)
  };
  return window.bridge;
}

const text = (id) => screen.getByTestId(id).textContent;

async function openPreview() {
  render(<CostRulesSection projectId="p1" />);
  await screen.findByTestId('cost-rules-space-default');
  fireEvent.click(screen.getByTestId('cost-rules-preview'));
  await screen.findByTestId('config-change-dry-run');
}

afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('CostRulesSection (US-0212)', () => {
  it('names every space with each file and whether the block is there, as text (FR1.2, NFR3)', async () => {
    mockBridge();
    render(<CostRulesSection projectId="p1" />);
    await screen.findByTestId('cost-rules-space-default');
    expect(text('cost-rules-space-default')).toContain('aidlc/spaces/default/memory/project.md');
    expect(text('cost-rules-space-default')).toContain('Finns');
    expect(text('cost-rules-space-default')).toContain('Saknas');
    expect(text('cost-rules-space-team-b')).toContain('Trasig');
    expect(text('cost-rules-space-team-b')).toContain('bara startmarkören');
  });

  it('shows the lines grouped by target file, editable, and previews exactly what was edited (FR1.1)', async () => {
    const bridge = mockBridge();
    render(<CostRulesSection projectId="p1" />);
    const project = await screen.findByTestId('cost-rules-lines-project');
    expect(project.value).toBe('ALWAYS be brief.\nNEVER read node_modules.');
    expect(screen.getByTestId('cost-rules-lines-phases-construction').value).toBe('ALWAYS run only the test being worked on.');
    fireEvent.change(project, { target: { value: 'ALWAYS be brief.\n\n  A new line.  ' } });
    fireEvent.click(screen.getByTestId('cost-rules-preview'));
    await waitFor(() =>
      expect(bridge.previewCostRules).toHaveBeenCalledWith('p1', {
        on: true,
        lines: { project: ['ALWAYS be brief.', 'A new line.'], 'phases/construction': ['ALWAYS run only the test being worked on.'] }
      })
    );
    fireEvent.click(screen.getByTestId('cost-rules-mode-off'));
    fireEvent.click(screen.getByTestId('cost-rules-preview'));
    await waitFor(() => expect(bridge.previewCostRules).toHaveBeenLastCalledWith('p1', expect.objectContaining({ on: false })));
  });

  it('shows the diff per file and writes only on confirm (FR5.1)', async () => {
    const bridge = mockBridge();
    await openPreview();
    expect(text('config-change-dry-run')).toContain('aidlc/spaces/default/memory/phases/construction.md');
    expect(text('config-change-dry-run')).toContain('+ - ALWAYS run only the test being worked on.');
    expect(bridge.applyCostRules).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('config-change-apply'));
    await waitFor(() => expect(bridge.applyCostRules).toHaveBeenCalledWith('p1'));
  });

  it('shows the compile output, and says every file was put back when the compile failed (FR5.3, FR5.4)', async () => {
    const bridge = mockBridge();
    await openPreview();
    fireEvent.click(screen.getByTestId('config-change-apply'));
    expect((await screen.findByTestId('config-change-result')).textContent).toContain('graph compiled');
    await waitFor(() => expect(bridge.costRulesStatus).toHaveBeenCalledTimes(2)); // reloaded after the save
    cleanup();

    mockBridge({ apply: { ok: false, files: ['f'], restored: true, error: 'graph broken' } });
    await openPreview();
    fireEvent.click(screen.getByTestId('config-change-apply'));
    const error = (await screen.findByTestId('config-change-error')).textContent;
    expect(error).toContain('graph broken');
    expect(error).toContain('sattes tillbaka');
  });

  it('offers the shipped lines a block lacks and adds them to the text without saving (US-0032 AC1)', async () => {
    const bridge = mockBridge();
    const line = 'On `main`, NEVER commit `docs/FEATURES.md`, `docs/features/` or `docs/releases/`; THADEUS commits and pushes them.';
    bridge.costRulesStatus.mockResolvedValue({ ...STATUS, missing: { project: [line] } });
    render(<CostRulesSection projectId="p1" />);
    expect((await screen.findByTestId('cost-rules-missing')).textContent).toContain(line);
    fireEvent.click(screen.getByTestId('cost-rules-add-missing'));
    expect(screen.getByTestId('cost-rules-lines-project').value).toBe(`ALWAYS be brief.\nNEVER read node_modules.\n${line}`);
    expect(screen.queryByTestId('cost-rules-missing')).toBeNull();
    expect(bridge.previewCostRules).not.toHaveBeenCalled();
    expect(bridge.applyCostRules).not.toHaveBeenCalled();
  });

  it('shows no offer when nothing is missing', async () => {
    mockBridge();
    render(<CostRulesSection projectId="p1" />);
    await screen.findByTestId('cost-rules-space-default');
    expect(screen.queryByTestId('cost-rules-missing')).toBeNull();
  });

  it('shows clash warnings and broken files without blocking the save (FR6.2, FR2.4)', async () => {
    mockBridge();
    await openPreview();
    expect(text('cost-rules-warnings')).toContain('Suite green before merge');
    expect(text('cost-rules-warnings')).toContain('ALWAYS run only the test being worked on.');
    expect(text('cost-rules-warnings')).toContain('aidlc/spaces/default/memory/team.md');
    expect(text('cost-rules-errors')).toContain('aidlc/spaces/team-b/memory/project.md');
    expect(text('cost-rules-errors')).toContain('bara startmarkören');
    expect(screen.getByTestId('config-change-apply').disabled).toBe(false);
  });
});
