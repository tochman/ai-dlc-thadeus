// US-0411: pipeline stages as LCARS cards with a unit level bar (FR1–FR3, FR5).
// US-0028: the runtime-graph note (FR1, FR2, FR4).
// US-0412: the elbow card and its effects (FR1–FR3, FR5).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Pipeline, { levelBar, pipelineSteps, stageChanges } from '../../src/renderer/Pipeline.jsx';

afterEach(cleanup);

const lit = (bar) => bar.segments.filter(Boolean).length;

describe('levelBar', () => {
  it('shows one segment per unit up to 8, approved units lit (FR2.1)', () => {
    const bar = levelBar({ status: 'in-progress', units: { approved: 2, total: 5 } });
    expect(bar.segments).toEqual([true, true, false, false, false]);
  });

  it('keeps 8 segments above 8 units, lit in proportion and rounded down (FR2.2)', () => {
    const half = levelBar({ status: 'in-progress', units: { approved: 5, total: 10 } });
    expect(half.segments).toHaveLength(8);
    expect(lit(half)).toBe(4);
    // 8 of 9 rounds down to 7: all 8 only when every unit is approved.
    expect(lit(levelBar({ status: 'in-progress', units: { approved: 8, total: 9 } }))).toBe(7);
    expect(lit(levelBar({ status: 'done', units: { approved: 9, total: 9 } }))).toBe(8);
  });

  it('gives any other stage one segment, lit when the stage is done (FR2.3)', () => {
    expect(levelBar({ status: 'done', units: null }).segments).toEqual([true]);
    expect(levelBar({ status: 'in-progress', units: null }).segments).toEqual([false]);
    expect(levelBar({ status: 'not-started' }).segments).toEqual([false]);
  });
});

const stageOf = (slug, status, extra = {}) => ({
  slug,
  status,
  mode: 'EXECUTE',
  agent: null,
  durationMs: null,
  units: null,
  mismatch: false,
  failed: false,
  graphStatus: null,
  current: false,
  ...extra
});

describe('stageChanges (US-0412 FR3)', () => {
  const units = (approved, total = 5) => ({ units: { approved, total } });
  const before = [stageOf('a', 'in-progress'), stageOf('b', 'not-started'), stageOf('c', 'in-progress', units(2))];

  it('gives nothing on the first render (AC3.1.2, AC3.3.2)', () => {
    expect(stageChanges(null, before)).toEqual({});
  });

  it('gives nothing when no stage changed', () => {
    expect(
      stageChanges(
        before,
        before.map((s) => ({ ...s }))
      )
    ).toEqual({});
  });

  it('gives a sweep for a status change that is not to done (AC3.1.1)', () => {
    const after = [stageOf('a', 'awaiting-approval'), before[1], before[2]];
    expect(stageChanges(before, after)).toEqual({ a: { effect: 'sweep' } });
  });

  it('gives a flash, not a sweep, for a change to done (AC3.2.1, AC3.2.2)', () => {
    const after = [stageOf('a', 'done'), before[1], before[2]];
    expect(stageChanges(before, after).a.effect).toBe('flash');
  });

  it('gives every change in one update (AC3.1.3)', () => {
    const after = [stageOf('a', 'done'), stageOf('b', 'in-progress'), before[2]];
    const changes = stageChanges(before, after);
    expect(Object.keys(changes).sort()).toEqual(['a', 'b']);
    expect(changes.b).toEqual({ effect: 'sweep' });
  });

  it('gives the old lit count when more level segments are lit (AC3.3.1)', () => {
    const after = [before[0], before[1], stageOf('c', 'in-progress', units(3))];
    expect(stageChanges(before, after)).toEqual({ c: { litFrom: 2 } });
  });

  it('gives nothing for a stage new to the list', () => {
    expect(stageChanges(before, [...before, stageOf('d', 'in-progress')])).toEqual({});
  });
});

const PIPELINE = {
  phases: [
    {
      name: 'construction',
      stages: [
        stageOf('requirements-analysis', 'done', { agent: 'aidlc-product-agent', durationMs: 90 * 1000 }),
        stageOf('code-generation', 'in-progress', { agent: 'aidlc-developer-agent', units: { approved: 2, total: 5 }, current: true }),
        stageOf('user-stories', 'awaiting-approval', { current: true }),
        stageOf('build-and-test', 'not-started', { mismatch: true, graphStatus: 'done' }),
        stageOf('unit-design', 'done', { failed: true, outcome: 'rejected' }),
        stageOf('refined-mockups', 'not-started', { mode: 'SKIP' })
      ]
    }
  ]
};
const FILES = [{ dir: 'construction/code-generation', files: [{ rel: 'construction/code-generation/plan.md', name: 'plan.md' }] }];

function renderPipeline() {
  const onOpenFile = vi.fn();
  render(<Pipeline pipeline={PIPELINE} files={FILES} hasGraph onOpenFile={onOpenFile} cost={null} />);
  const card = (slug) => screen.getAllByTestId('pipeline-stage').find((b) => within(b).queryByText(slug));
  return { onOpenFile, card };
}

describe('Pipeline cards', () => {
  it('renders each stage as an lcars-card: name in the head, agent and duration in the foot (FR1)', () => {
    const { card } = renderPipeline();
    const done = card('requirements-analysis');
    const part = (cls) => done.querySelector(cls)?.textContent ?? null;
    expect([...done.classList]).toEqual(expect.arrayContaining(['lcars-card', 'stage-card']));
    expect(part('.lcars-card-head')).toBe('requirements-analysis');
    expect(part('.stage-num')).toBe('01'); // US-0412 AC1.1.2: the number sits in the elbow
    expect(part('.lcars-card-body')).toMatch(/^Klar/);
    expect(part('.lcars-card-foot')).toContain('product');
    expect(part('.lcars-card-foot')).toContain('1 min 30 s');
    expect(part('.lcars-card-foot')).not.toContain('aidlc-');
  });

  it('labels the level bar with the real count (FR2.4)', () => {
    const { card } = renderPipeline();
    expect(within(card('code-generation')).getByRole('img', { name: '2 av 5 enheter godkända' })).toBeTruthy();
    expect(within(card('requirements-analysis')).getByRole('img', { name: 'Klar' })).toBeTruthy();
    expect(within(card('user-stories')).getByRole('img', { name: 'Inte klar' })).toBeTruthy();
  });

  it('colours the card by state: current, awaiting approval, done, skipped, mismatch and failure (FR3)', () => {
    const { card } = renderPipeline();
    const classes = (slug) => [...card(slug).closest('li').classList];
    expect(classes('code-generation')).toEqual(expect.arrayContaining(['is-current', 'status-in-progress']));
    expect(classes('user-stories')).toContain('status-awaiting-approval');
    expect(classes('requirements-analysis')).toContain('status-done');
    expect(classes('build-and-test')).toContain('is-mismatch');
    expect(classes('unit-design')).toContain('is-failed');
    expect(card('unit-design').querySelector('.lcars-card-body').textContent).toContain('Misslyckades (rejected)');
    fireEvent.click(screen.getByRole('button', { name: 'Visa' }));
    expect(classes('refined-mockups')).toContain('is-muted');
  });

  it('still opens the stage files on click (FR5)', () => {
    const { card, onOpenFile } = renderPipeline();
    const button = card('code-generation');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(screen.getByTestId('pipeline-stage-file'));
    expect(onOpenFile).toHaveBeenCalledWith('construction/code-generation/plan.md');
  });
});

describe('card effects (US-0412 FR2, FR3)', () => {
  const pipelineOf = (...stages) => ({
    phases: [
      { name: 'inception', stages: stages.slice(0, 1) },
      { name: 'construction', stages: stages.slice(1) }
    ]
  });
  const FIRST = [
    stageOf('user-stories', 'done'),
    stageOf('code-generation', 'in-progress', { units: { approved: 1, total: 3 } }),
    stageOf('build-and-test', 'not-started')
  ];
  const ui = (stages) => <Pipeline pipeline={pipelineOf(...stages)} files={[]} hasGraph onOpenFile={vi.fn()} cost={null} />;
  const card = (slug) => screen.getAllByTestId('pipeline-stage').find((b) => within(b).queryByText(slug));
  const effects = () => document.querySelectorAll('.stage-sweep, .stage-card.is-flashing, .stage-level-seg.is-new').length;
  const withStatus = (slug, status, extra = {}) => FIRST.map((s) => (s.slug === slug ? { ...s, status, ...extra } : s));
  afterEach(() => vi.useRealTimers());

  it('gives each card its order across phases for the power-up (AC2.1.1)', () => {
    render(ui(FIRST));
    const order = screen.getAllByTestId('pipeline-stage').map((b) => b.closest('li').style.getPropertyValue('--i'));
    expect(order).toEqual(['0', '1', '2']);
  });

  it('marks nothing on the first render (AC3.1.2)', () => {
    render(ui(FIRST));
    expect(effects()).toBe(0);
  });

  it('sweeps only the card whose status changed, and adds no text (AC3.1.1, AC1.1.5)', () => {
    const { rerender } = render(ui(FIRST));
    const text = card('build-and-test').textContent;
    rerender(ui(withStatus('build-and-test', 'in-progress')));
    expect(card('build-and-test').querySelectorAll('.stage-sweep')).toHaveLength(1);
    expect(card('build-and-test').querySelector('.stage-sweep').getAttribute('aria-hidden')).toBe('true');
    expect(document.querySelectorAll('.stage-sweep')).toHaveLength(1);
    expect(card('build-and-test').textContent).toBe(text.replace('Ej startad', 'Pågår'));
  });

  it('flashes a card that becomes done instead of sweeping it, and clears the effect after 900 ms (AC3.2.2)', () => {
    vi.useFakeTimers();
    const { rerender } = render(ui(FIRST));
    rerender(ui(withStatus('code-generation', 'done')));
    expect(card('code-generation').classList.contains('is-flashing')).toBe(true);
    expect(card('code-generation').querySelector('.stage-sweep')).toBeNull();
    act(() => vi.advanceTimersByTime(900));
    expect(effects()).toBe(0);
  });

  it('marks every card that changed in one update (AC3.1.3)', () => {
    const { rerender } = render(ui(FIRST));
    rerender(ui(FIRST.map((s) => (s.slug === 'user-stories' ? s : { ...s, status: s.status === 'not-started' ? 'in-progress' : 'awaiting-approval' }))));
    expect(card('code-generation').querySelector('.stage-sweep')).toBeTruthy();
    expect(card('build-and-test').querySelector('.stage-sweep')).toBeTruthy();
    expect(card('user-stories').querySelector('.stage-sweep')).toBeNull();
  });

  it('fills the newly lit level segment (AC3.3.1)', () => {
    const { rerender } = render(ui(FIRST));
    rerender(ui(withStatus('code-generation', 'in-progress', { units: { approved: 2, total: 3 } })));
    const segs = [...card('code-generation').querySelectorAll('.stage-level-seg')].map((s) => s.classList.contains('is-new'));
    expect(segs).toEqual([false, true, false]);
  });
});

describe('after a plan switch (US-0509 FR4.1)', () => {
  const SWITCHED = {
    phases: [
      {
        name: 'inception',
        stages: [
          stageOf('user-stories', 'done', { mode: 'SKIP', behind: true }), // done, and the new plan drops it
          stageOf('domain-design', 'not-started', { behind: true }), // the new plan has it, and the work has passed it
          stageOf('refined-mockups', 'not-started', { mode: 'SKIP', behind: true })
        ]
      },
      { name: 'construction', stages: [stageOf('code-generation', 'in-progress', { current: true }), stageOf('build-and-test', 'not-started')] }
    ]
  };
  // US-0412 AC1.1.2: the number (or "—") in the elbow, then the body starting with the status.
  const bodyOf = (slug) => {
    const card = screen.getAllByTestId('pipeline-stage').find((b) => within(b).queryByText(slug));
    return card && `${card.querySelector('.stage-num').textContent} | ${card.querySelector('.lcars-card-body').textContent}`;
  };

  it('shows a done stage the plan no longer has as done, and one the work has passed as "Körs inte"', () => {
    render(<Pipeline pipeline={SWITCHED} files={[]} hasGraph onOpenFile={vi.fn()} cost={null} />);
    expect(bodyOf('user-stories')).toBe('01 | Klar');
    expect(bodyOf('code-generation')).toMatch(/^02 \| /);
    expect(bodyOf('domain-design')).toBeUndefined(); // with the others that do not run, behind "Visa"
    fireEvent.click(screen.getByRole('button', { name: 'Visa' }));
    expect(bodyOf('domain-design')).toBe('— | Körs inte');
    expect(bodyOf('refined-mockups')).toBe('— | Ingår inte');
  });

  it('the dots agree: one per stage that counts, the done one included', () => {
    expect(pipelineSteps(SWITCHED)).toEqual(['done', 'current', 'todo']);
  });
});

describe('runtime-graph note (US-0028)', () => {
  const notDone = [stageOf('code-generation', 'in-progress', { current: true }), stageOf('build-and-test', 'not-started')];
  const NEW_INTENT = { phases: [{ name: 'construction', stages: notDone }] };
  const show = (pipeline, hasGraph) => render(<Pipeline pipeline={pipeline} files={[]} hasGraph={hasGraph} onOpenFile={vi.fn()} cost={null} />);

  it('shows no note about the file when there is no graph and no done stage (FR1)', () => {
    show(NEW_INTENT, false);
    expect(screen.queryByTestId('pipeline-timings-note')).toBeNull();
    expect(screen.queryByText(/runtime-graph\.json/)).toBeNull();
  });

  it('shows one calm sentence when there is no graph but a stage is done (FR2, FR4)', () => {
    show(PIPELINE, false);
    expect(screen.getByTestId('pipeline-timings-note').textContent).toBe(
      'Tidsuppgifter finns bara på den dator som körde arbetet. Status kommer från aidlc-state.md.'
    );
  });

  it('shows no note when the graph is there (FR2)', () => {
    show(PIPELINE, true);
    expect(screen.queryByTestId('pipeline-timings-note')).toBeNull();
  });
});
