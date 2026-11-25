import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { selectableHarness } from '../../src/shared/harnesses.js';

let terminal;
vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => terminal }));
const { default: PlansView } = await import('../../src/renderer/PlansView.jsx');

// The shape plans:list returns (src/main/plans.js listPlans plus the active intent).
const DEFAULTS = {
  review_cap: 'none',
  sensors: 'off',
  learnings: 'off',
  summary_confirmation: 'off',
  plan_approval: 'on',
  guard_policy: 'off',
  collaborators: 'off'
};
const list = (overrides = {}) => ({
  active: { dirName: '261114-custom-plans', slug: 'custom-plans', plan: null, scope: 'ultra-express' },
  plans: [
    {
      name: 'ultra-express',
      description: 'Plan saved from 261113-i18n-foundation, based on bugfix',
      depth: 'Minimal',
      defaults: DEFAULTS,
      own: true,
      active: true,
      stageCount: 8,
      intents: [{ dirName: '261114-custom-plans', slug: 'custom-plans', running: true }]
    },
    {
      name: 'bugfix',
      description: 'Fix a specific bug',
      depth: 'Minimal',
      defaults: { ...DEFAULTS, review_cap: 'advisory', sensors: 'on' },
      own: false,
      active: false,
      stageCount: 9,
      intents: []
    },
    { name: 'spare', description: 'Old plan', depth: 'Standard', defaults: DEFAULTS, own: true, active: false, stageCount: 3, intents: [] }
  ],
  ...overrides
});

beforeEach(() => {
  terminal = { harness: selectableHarness('claude'), type: vi.fn(async () => true) };
  window.bridge = {
    listPlans: vi.fn(async () => list()),
    getPlanStages: vi.fn(async () => ({ execute: ['requirements-analysis', 'code-generation'], skip: ['market-research'] })),
    savePlan: vi.fn(async () => ({ ok: true, output: 'saved' })),
    previewPlanEdit: vi.fn(),
    applyPlanEdit: vi.fn(),
    deletePlan: vi.fn(),
    onConfigChanged: vi.fn(() => () => {})
  };
});
afterEach(cleanup);

const renderView = () => render(<PlansView projectId="p1" visible harness="claude" />);
const plan = async (name) => (await screen.findAllByTestId('plans-plan')).find((li) => within(li).getByTestId('plans-open').textContent === name);

describe('PlansView (EPIC-09 US-0903)', () => {
  it('lists every plan with depth, stage count and defaults, own and stock marked', async () => {
    renderView();
    const own = await plan('ultra-express');
    expect(window.bridge.listPlans).toHaveBeenCalledWith('p1', 'claude');
    expect(within(own).getByTestId('plans-facts').textContent).toBe(
      'Djup Minimal · 8 steg · granskningar: none · sensorer: off · lärdomar: off · sammanfattningsbekräftelse: off · plangodkännande: on · skyddspolicy: off · medarbetare: off'
    );
    expect(own.textContent).toContain('projektets egen');
    expect(own.textContent).toContain('aktiv intent');
    expect((await plan('bugfix')).textContent).toContain('AI-DLC:s egen, skrivskyddad');
  });

  it('opens a plan and shows the stages it runs and skips', async () => {
    renderView();
    fireEvent.click(within(await plan('bugfix')).getByTestId('plans-open'));
    expect(window.bridge.getPlanStages).toHaveBeenCalledWith('p1', 'claude', 'bugfix');
    expect((await screen.findByTestId('plans-stages-execute')).textContent).toBe('Körs (2)requirements-analysiscode-generation');
    expect(screen.getByTestId('plans-stages-skip').textContent).toBe('Hoppas över (1)market-research');
  });

  it('types New plan and Start with plan into the agent tab without Enter, quotes escaped', async () => {
    renderView();
    fireEvent.click(await screen.findByTestId('plans-new'));
    fireEvent.change(screen.getByTestId('plans-new-ask-input'), { target: { value: 'A "quick" fix \t for login' } });
    fireEvent.click(screen.getByTestId('plans-new-ask-send'));
    expect(terminal.type).toHaveBeenLastCalledWith('agent', '/aidlc compose "A \\"quick\\" fix for login"', { submit: false });

    fireEvent.click(within(await plan('spare')).getByTestId('plans-start'));
    fireEvent.change(screen.getByTestId('plans-start-ask-input'), { target: { value: 'a dark mode' } });
    fireEvent.click(screen.getByTestId('plans-start-ask-send'));
    expect(terminal.type).toHaveBeenLastCalledWith('agent', '/aidlc --scope spare "a dark mode"', { submit: false });
  });

  it('types no control character from the person’s text (US-0509 NFR1)', async () => {
    renderView();
    fireEvent.click(await screen.findByTestId('plans-new'));
    fireEvent.change(screen.getByTestId('plans-new-ask-input'), { target: { value: 'a\u001bb\u009bc back\\slash' } });
    fireEvent.click(screen.getByTestId('plans-new-ask-send'));
    expect(terminal.type).toHaveBeenLastCalledWith('agent', '/aidlc compose "a b c back\\\\slash"', { submit: false });
  });

  it('refuses an invalid plan name before calling the bridge, and saves a valid one', async () => {
    window.bridge.listPlans.mockResolvedValue(list({ active: { dirName: '261114-x', slug: 'x', plan: 'x-composed', scope: 'bugfix' } }));
    renderView();
    fireEvent.click(await screen.findByTestId('plans-save'));
    fireEvent.change(screen.getByTestId('plans-save-ask-input'), { target: { value: 'Bad Name' } });
    expect(screen.getByTestId('plans-save-ask-problem').textContent).toMatch(/Bad Name/);
    expect(screen.getByTestId('plans-save-ask-send').disabled).toBe(true);
    fireEvent.submit(screen.getByTestId('plans-save-ask'));
    expect(window.bridge.savePlan).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId('plans-save-ask-input'), { target: { value: 'my-plan' } });
    fireEvent.click(screen.getByTestId('plans-save-ask-send'));
    expect((await screen.findByTestId('config-change-command')).textContent).toBe('aidlc engine scope save --name my-plan');
  });

  it('disables Delete, with the reason, for a plan an intent in progress uses', async () => {
    renderView();
    const used = await plan('ultra-express');
    expect(within(used).getByTestId('plans-delete').disabled).toBe(true);
    expect(within(used).getByTestId('plans-delete-reason').textContent).toBe('Används av en pågående intent: custom-plans');
    expect(within(await plan('spare')).getByTestId('plans-delete').disabled).toBe(false);
  });

  it('offers no Edit or Delete on a stock plan, and no Save plan for an intent on a saved plan', async () => {
    renderView();
    const stock = await plan('bugfix');
    expect(within(stock).queryByTestId('plans-edit-open')).toBeNull();
    expect(within(stock).queryByTestId('plans-delete')).toBeNull();
    expect(screen.queryByTestId('plans-save')).toBeNull();
    await waitFor(() => expect(within(stock).getByTestId('plans-start')).toBeTruthy());
  });
});
