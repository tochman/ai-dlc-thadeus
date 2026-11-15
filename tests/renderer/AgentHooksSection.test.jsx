// US-0506 u4 LC35: Project settings > Agent dialogs, in the Swedish locale (BR7.15, BR7.20, RD39, AC4.1.2).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AgentHooksSection from '../../src/renderer/AgentHooksSection.jsx';
import en from '../../src/shared/locales/en.json';
import sv from '../../src/shared/locales/sv.json';

const files = (settings, script, reason) => [
  { path: '.claude/settings.json', status: settings, ...(reason ? { reason } : {}) },
  { path: '.thadeus/hooks/dialog.sh', status: script }
];
const status = (claude, claudeFiles, opencode = 'missing') => [
  { harness: 'claude', used: true, status: claude, files: claudeFiles },
  { harness: 'opencode', used: false, status: opencode, files: [{ path: '.opencode/plugins/thadeus-dialog.js', status: opencode }] }
];

let bridge, changed;
async function mount(value) {
  bridge = {
    status: vi.fn(async () => value),
    preview: vi.fn(async () => ({ previewId: 'x', harness: 'claude', action: 'remove', canApply: true, files: [] })),
    apply: vi.fn(),
    cancel: vi.fn(),
    onChanged: vi.fn((fn) => ((changed = fn), () => {}))
  };
  window.bridge = { agentHooks: bridge };
  render(<AgentHooksSection projectId="p1" />);
  await waitFor(() => expect(bridge.status).toHaveBeenCalled());
  await act(async () => {});
}
const buttons = () => [...screen.getByTestId('agent-hooks-section').querySelectorAll('button')].map((b) => b.dataset.testid);
afterEach(() => {
  cleanup();
  delete window.bridge;
});

describe('AgentHooksSection', () => {
  it('lists each file with its status in words', async () => {
    await mount(status('outOfDate', files('current', 'outOfDate'), 'editedByHand'));
    const text = screen.getByTestId('agent-hooks-section').textContent;
    expect(text).toContain('.claude/settings.json: finns och är aktuella');
    expect(text).toContain('.thadeus/hooks/dialog.sh: inaktuella');
    expect(text).toContain('.opencode/plugins/thadeus-dialog.js: ändrade för hand');
    expect(text).toContain('Claude Code: inaktuella');
  });

  it('offers Install for missing, Update and Remove for out of date, Remove for current', async () => {
    await mount(status('missing', files('missing', 'missing'), 'current'));
    expect(buttons()).toEqual(['agent-hooks-section-claude-install', 'agent-hooks-section-opencode-remove']);
    act(() => changed({ projectId: 'p1', harnesses: status('editedByHand', files('editedByHand', 'current')) }));
    expect(buttons()).toEqual(['agent-hooks-section-claude-update', 'agent-hooks-section-claude-remove', 'agent-hooks-section-opencode-install']);
    fireEvent.click(screen.getByTestId('agent-hooks-section-claude-remove'));
    await waitFor(() => expect(bridge.preview).toHaveBeenCalledWith('p1', 'claude', 'remove'));
  });

  it('offers no action for a harness with a file the app cannot use, and shows the reason (RD39)', async () => {
    await mount(status('missing', files('missing', 'current', 'unexpectedShape')));
    expect(buttons()).toEqual(['agent-hooks-section-opencode-install']);
    expect(screen.getByTestId('agent-hooks-section').textContent).toContain('.claude/settings.json har hooks i en form som appen inte ändrar.');
  });

  it('updates on agent-hooks:changed for this project only', async () => {
    await mount(status('missing', files('missing', 'missing')));
    act(() => changed({ projectId: 'other', harnesses: status('current', files('current', 'current')) }));
    expect(screen.getByTestId('agent-hooks-section').textContent).toContain('Claude Code: saknas');
    act(() => changed({ projectId: 'p1', harnesses: status('current', files('current', 'current')) }));
    expect(screen.getByTestId('agent-hooks-section').textContent).toContain('Claude Code: finns och är aktuella');
  });

  it('has a key in both locale files for every refusal value and partiallyWritten (PD36)', () => {
    const values = ['previewUnknown', 'changedSincePreview', 'invalidJson', 'unexpectedShape', 'cannotRead', 'cannotWrite', 'outsideRoot', 'partiallyWritten'];
    for (const locale of [sv, en]) for (const v of values) expect(typeof locale.agentHooks.refusal[v], v).toBe('string');
    for (const locale of [sv, en])
      for (const s of ['current', 'outOfDate', 'missing', 'editedByHand']) expect(typeof locale.agentHooks.status[s]).toBe('string');
  });
});
