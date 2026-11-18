// US-0411: pipeline stages as LCARS cards with a unit level bar (FR1–FR3, FR5).
// US-0028: the runtime-graph note (FR1, FR2, FR4).
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import Pipeline, { levelBar } from '../../src/renderer/Pipeline.jsx';

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
    expect(part('.lcars-card-body')).toContain('01 · ');
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
