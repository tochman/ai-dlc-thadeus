import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { default: IntentDetail, ParkControls, RequestText } = await import('../../src/renderer/IntentDetail.jsx');

// jsdom has no layout: fake the clamped paragraph's heights (two lines visible, `full` px of content).
function fakeHeights(full) {
  const proto = HTMLElement.prototype;
  const saved = ['scrollHeight', 'clientHeight'].map((p) => [p, Object.getOwnPropertyDescriptor(proto, p)]);
  Object.defineProperty(proto, 'scrollHeight', { configurable: true, get: () => full });
  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: () => 42 });
  return () => saved.forEach(([p, d]) => (d ? Object.defineProperty(proto, p, d) : delete proto[p]));
}

let restore = () => {};
afterEach(() => {
  cleanup();
  restore();
});

describe('IntentDetail description (F-01)', () => {
  it('"Visa mer" toggles aria-expanded and the clamp on a long description', () => {
    restore = fakeHeights(126);
    render(<RequestText text={'rad\n'.repeat(6)} />);
    const toggle = screen.getByTestId('intent-detail-description-toggle');
    const text = screen.getByTestId('intent-detail-description');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.textContent).toBe('Visa mer');
    expect(text.classList.contains('is-clamped')).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.textContent).toBe('Visa mindre');
    expect(text.classList.contains('is-clamped')).toBe(false);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows no toggle when the description fits in two lines', () => {
    restore = fakeHeights(42);
    render(<RequestText text="Kort beställning" />);
    expect(screen.queryByTestId('intent-detail-description-toggle')).toBeNull();
  });
});

describe('IntentDetail park and unpark (US-0510)', () => {
  const intent = { dirName: '261120-a', slug: 'a', status: 'in-flight', active: true, parked: false, parkedStage: null };
  afterEach(() => delete window.bridge);

  it('offers Park only on the active in-flight intent that is not parked, and parks through the bridge (AC4.1.2)', async () => {
    window.bridge = { parkIntent: vi.fn(async () => ({ ok: true })) };
    const { rerender } = render(<ParkControls projectId="p1" intent={intent} activeDirName="261120-a" />);
    fireEvent.click(screen.getByTestId('intent-park'));
    expect(window.bridge.parkIntent).toHaveBeenCalledWith('p1');
    await waitFor(() => expect(screen.getByTestId('intent-park').disabled).toBe(false));

    rerender(<ParkControls projectId="p1" intent={intent} activeDirName="261120-other" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
    rerender(<ParkControls projectId="p1" intent={{ ...intent, status: 'complete' }} activeDirName="261120-a" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
    rerender(<ParkControls projectId="p1" intent={{ ...intent, parked: true }} activeDirName="261120-a" />);
    expect(screen.queryByTestId('intent-park')).toBeNull();
  });

  it('a refused Park shows its reason (AC4.1.5)', async () => {
    window.bridge = { parkIntent: vi.fn(async () => ({ ok: false, error: 'Refused: in the middle of a stage' })) };
    render(<ParkControls projectId="p1" intent={intent} activeDirName="261120-a" />);
    fireEvent.click(screen.getByTestId('intent-park'));
    expect((await screen.findByRole('alert')).textContent).toBe('Refused: in the middle of a stage');
  });
});

describe('IntentDetail head, one control per state (US-0037)', () => {
  const DIR = '261119-spec-kit-framework';
  const base = { dirName: DIR, slug: 'spec-kit-framework', scope: 'feature', status: 'in-flight', active: true, parked: false, parkedStage: null };
  const parkedIntent = { ...base, parked: true, parkedStage: 'functional-design' };
  const detailOf = () => ({
    dirName: DIR,
    state: { currentStage: 'functional-design' },
    pipeline: {
      phases: [
        {
          name: 'construction',
          stages: [
            { slug: 'requirements-analysis', status: 'done' },
            { slug: 'functional-design', status: 'in-progress' },
            { slug: 'code-generation', status: 'pending' }
          ]
        }
      ],
      done: 1,
      executed: 3
    },
    files: [],
    warnings: [],
    events: [],
    graph: null,
    units: {}
  });
  const cost = { available: true, perIntent: { [DIR]: { total: { usd: 136.12, currentUsd: 134.67 }, byModel: [], stageModels: {} } } };
  const show = (intent, activeDirName = DIR) =>
    render(<IntentDetail projectId="p1" detail={detailOf()} intent={intent} activeDirName={activeDirName} cost={cost} models={null} />);
  afterEach(() => delete window.bridge);

  it('a parked intent shows its parked state once and one "Avparkera och fortsätt vid <stage>", no Unpark or Park (FR3.2)', () => {
    show(parkedIntent);
    expect(screen.queryByTestId('intent-unpark')).toBeNull();
    expect(screen.queryByTestId('intent-park')).toBeNull();
    expect(screen.getAllByTestId('intent-resume')).toHaveLength(1);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Avparkera och fortsätt vid Functional Design');
    expect(screen.getAllByTestId('intent-parked')).toHaveLength(1);
    expect(screen.getByTestId('intent-parked').textContent).toBe('Parkerad vid Functional Design');
  });

  it('the progress row says a parked intent is parked at its stage, not "Pågår" (FR3.3)', () => {
    show(parkedIntent);
    const row = screen.getByTestId('intent-progress');
    expect(row.textContent).not.toMatch(/Pågår/);
    expect(row.contains(screen.getByTestId('intent-parked'))).toBe(true);
  });

  it('an intent in progress keeps "Pågår · <stage>" in its progress row (FR3.3)', () => {
    show(base);
    expect(screen.getByTestId('intent-progress').textContent).toMatch(/Pågår · Functional Design/);
    expect(screen.queryByTestId('intent-parked')).toBeNull();
  });

  it('shows the step once, in the progress row; the resume button names only the stage; the sidebar count reads as done stages (FR3.4)', () => {
    show(base);
    expect(screen.getByTestId('intent-resume').textContent).toBe('Fortsätt vid Functional Design');
    expect(screen.getByTestId('intent-detail').textContent.match(/steg 2 av 3/gi)).toHaveLength(1);
    expect(screen.getByTestId('intent-detail-stages').textContent).toBe('Klara stages 1/3'); // US-0417: on the frame's foot bar
  });

  it('puts Park and Resume side by side in one actions group on the active intent in flight (FR3.1, FR3.6)', () => {
    show(base);
    const actions = screen.getByTestId('intent-head-actions');
    expect(actions.contains(screen.getByTestId('intent-park'))).toBe(true);
    expect(actions.contains(screen.getByTestId('intent-resume'))).toBe(true);
  });

  describe('an archived intent (US-0513 AC2.1.1, AC2.1.3)', () => {
    const archived = { ...base, status: 'archived', active: false, stateStatus: 'Archived', archivedFrom: 'Completed' };
    /** The detail as main gives it: no stage is current. */
    const archivedDetail = () => {
      const d = detailOf();
      d.state = { ...d.state, currentStatus: 'Archived', archivedFrom: 'Completed' };
      for (const s of d.pipeline.phases[0].stages) s.current = false;
      return d;
    };
    const showArchived = (over = {}) =>
      render(
        <IntentDetail
          projectId="p1"
          detail={archivedDetail()}
          intent={{ ...archived, ...over }}
          activeDirName={null}
          cost={null}
          models={null}
          activeSpace="default"
        />
      );
    beforeEach(() => {
      window.bridge = { getStoryComments: vi.fn(() => new Promise(() => {})) };
    });

    it('has the Archived mark in its progress row and its mode, and Unarchive; no Archive, Resume, Park or Unpark', () => {
      showArchived();
      const row = screen.getByTestId('intent-progress');
      expect(row.contains(screen.getByTestId('intent-archived'))).toBe(true);
      expect(screen.getByTestId('intent-archived').textContent).toBe('Arkiverad');
      expect(row.textContent).not.toMatch(/Pågår/);
      expect(screen.getAllByText('Arkiverad')).toHaveLength(2); // the mark and the Mode readout
      expect(screen.getByTestId('intent-unarchive')).toBeTruthy();
      for (const id of ['intent-archive', 'intent-resume', 'intent-park', 'intent-unpark', 'intent-parked']) expect(screen.queryByTestId(id)).toBeNull();
    });

    it('shows nothing as running: no current step, no breathing stage (AC1.2.4)', () => {
      showArchived();
      expect(screen.getByTestId('intent-progress').querySelector('.lcars-dot--current')).toBeNull();
      expect(screen.getByTestId('pipeline').querySelector('.is-breathing')).toBeNull();
    });

    it('opens every tab, and counts as finished in its velocity when it was complete (AC6.1.2)', () => {
      showArchived();
      for (const id of ['timeline', 'units', 'cost', 'comments', 'files', 'velocity']) {
        fireEvent.click(screen.getByTestId(`intent-detail-tab-${id}`));
        expect(screen.getByTestId(`intent-detail-tab-${id}`).getAttribute('aria-selected')).toBe('true');
      }
      expect(screen.queryByTestId('velocity-intent-unfinished')).toBeNull();
    });

    it('shows as parked again after it was unarchived, with Archive beside Resume', () => {
      const { rerender } = showArchived();
      rerender(<IntentDetail projectId="p1" detail={detailOf()} intent={parkedIntent} activeDirName={null} cost={null} models={null} activeSpace="default" />);
      expect(screen.getByTestId('intent-parked').textContent).toBe('Parkerad vid Functional Design');
      expect(screen.queryByTestId('intent-archived')).toBeNull();
      expect(screen.getByTestId('intent-head-actions').contains(screen.getByTestId('intent-archive'))).toBe(true);
    });

    it('in another space than AI-DLC’s active one offers neither action', () => {
      render(
        <IntentDetail projectId="p1" space="default" detail={detailOf()} intent={base} activeDirName={DIR} cost={null} models={null} activeSpace="team" />
      );
      expect(screen.getByTestId('intent-archive-space')).toBeTruthy();
      expect(screen.queryByTestId('intent-archive')).toBeNull();
    });
  });

  describe('a changed plan (US-0509)', () => {
    /** The detail with its state's plan and scope, and its counts. */
    const changed = (state, counts = {}) => {
      const d = detailOf();
      return { ...d, state: { ...d.state, ...state }, pipeline: { ...d.pipeline, ...counts } };
    };
    const ui = (detail, intent = base) => <IntentDetail projectId="p1" detail={detail} intent={intent} activeDirName={DIR} cost={null} models={null} />;
    const chip = () => screen.getByTestId('intent-detail').querySelector('.lcars-chips .lcars-chip');

    it('shows the new plan after a switch from a tailored one, while the list still has the old scope (FR4.2)', () => {
      const { rerender } = render(ui(changed({ plan: 'i18n-express', scope: 'feature' })));
      expect(chip().textContent).toBe('i18n-express');
      rerender(ui(changed({ plan: null, scope: 'express' }))); // base.scope is still feature
      expect(chip().textContent).toBe('express');
      expect(screen.getByTestId('intent-detail').textContent).not.toMatch(/i18n-express|feature/);
      rerender(ui(changed({})));
      expect(chip().textContent).toBe('feature'); // a state without a scope: the list's
    });

    it('"Steg n av m" and the stage count follow a new detail (FR4.1)', () => {
      const { rerender } = render(ui(changed({})));
      rerender(ui(changed({}, { done: 2, executed: 7 })));
      expect(screen.getByTestId('intent-progress').textContent).toMatch(/steg 3 av 7/i);
      expect(screen.getByTestId('intent-detail-stages').textContent).toBe('Klara stages 2/7');
    });

    it('"Byt plan" sits in the head’s actions (FR1.1)', () => {
      render(ui(changed({ scope: 'feature' })));
      expect(screen.getByTestId('intent-head-actions').contains(screen.getByTestId('plan-change-open'))).toBe(true);
    });
  });

  it('gives the cost pair the compact readout size so it fits its column (FR3.5)', () => {
    show(base);
    const value = screen.getByTestId('intent-detail-cost');
    expect(value.textContent).toBe('registrerat $136.12 · till dagens priser $134.67');
    expect(value.classList.contains('readout-value--cost')).toBe(true);
  });
});
