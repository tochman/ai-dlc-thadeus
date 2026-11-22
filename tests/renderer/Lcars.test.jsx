// US-0417: the shared LCARS pieces every view builds on (theme.css rules panel, the approved mockup).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import {
  BARS,
  Block,
  DiagonalFrame,
  Elbow,
  Hairline,
  ListDrawer,
  Meter,
  Pill,
  ReadoutTable,
  RoundFrame,
  SectionHeading,
  SegBar,
  SegMeter,
  elbowRadii,
  useEntrance
} from '../../src/renderer/Lcars.jsx';

let stored;
beforeEach(() => {
  stored = { listFolded: {} };
  window.bridge = {
    getSettings: vi.fn(async () => structuredClone(stored)),
    setSettings: vi.fn(async (partial) => {
      stored = { ...stored, ...partial };
      return stored;
    })
  };
  document.documentElement.dataset.motion = 'full';
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.documentElement.dataset.motion;
});

describe('round elbow (circular arcs from the reference elbow)', () => {
  it('takes the outer radius as 0.7 x arm and the inner as 1.4 x bar, at most half the arm', () => {
    expect(BARS).toEqual({ thin: 18, medium: 30, large: 42, wide: 60, thick: 150 });
    expect(elbowRadii(150, 18)).toEqual({ outer: 105, inner: 25.2 });
    expect(elbowRadii(150, 30)).toEqual({ outer: 105, inner: 42 });
    expect(elbowRadii(60, 42)).toEqual({ outer: 42, inner: 30 }); // capped at half the arm
  });

  it('draws one element with the radii as CSS variables, for the top or the bottom corner', () => {
    render(<Elbow arm={150} bar={30} corner="bottom" />);
    const el = screen.getByTestId('lcars-elbow');
    expect(el.className).toContain('lcars-elbow--bottom');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.style.getPropertyValue('--elbow-ro')).toBe('105px');
    expect(el.style.getPropertyValue('--elbow-ri')).toBe('42px');
    expect(el.style.getPropertyValue('--elbow-arm')).toBe('150px');
  });
});

describe('segmented bar with title, sub-label and trailing pill', () => {
  it('heads the bar with the title at its level, then the sub-label, filler segments and the pill last', () => {
    render(<SegBar as="h2" level="frame" title="Tools" sub="8 tools" trailing={<Pill onClick={() => {}}>Back</Pill>} />);
    const bar = screen.getByTestId('lcars-segbar');
    expect(bar.className).toContain('lcars-segbar--frame');
    expect(within(bar).getByRole('heading', { level: 2 }).textContent).toBe('Tools');
    expect(within(bar).getByText('8 tools').className).toContain('lcars-seg-lab');
    expect(bar.lastElementChild.tagName).toBe('BUTTON'); // the trailing slot ends the bar
    expect(bar.querySelectorAll('.lcars-sseg[aria-hidden="true"]').length).toBeGreaterThanOrEqual(2);
  });

  it('leaves out the sub-label and the trailing slot when not given', () => {
    render(<SegBar level="section" title="Per model" />);
    const bar = screen.getByTestId('lcars-segbar');
    expect(bar.querySelector('.lcars-seg-lab')).toBeNull();
    expect(bar.lastElementChild.tagName).toBe('SPAN');
  });

  it('makes a pill a real button: actions only', () => {
    const onClick = vi.fn();
    render(<Pill onClick={onClick}>Resume</Pill>);
    const pill = screen.getByRole('button', { name: 'Resume' });
    expect(pill.getAttribute('type')).toBe('button');
    expect(pill.className).toContain('lcars-pill');
    fireEvent.click(pill);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('hairline and block', () => {
  it('a hairline is decoration only', () => {
    render(<Hairline />);
    expect(screen.getByTestId('lcars-hairline').getAttribute('aria-hidden')).toBe('true');
  });

  it('a block carries its state strip, its figure cell and its label; selection is a class, not a colour of its own', () => {
    const onClick = vi.fn();
    render(
      <Block as="button" strip="live" figure="52" selected onClick={onClick} data-testid="arm-intents">
        Intents
      </Block>
    );
    const block = screen.getByTestId('arm-intents');
    expect(block.tagName).toBe('BUTTON');
    expect(block.className).toMatch(/lcars-nb\b/);
    expect(block.className).toContain('lcars-strip--live');
    expect(block.className).toContain('is-sel');
    expect(block.querySelector('.lcars-nb-fig').textContent).toBe('52');
    expect(block.querySelector('.lcars-nb-label').textContent).toBe('Intents');
    fireEvent.click(block);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a block without figure or strip has neither cell nor strip class, and defaults to a div', () => {
    render(<Block data-testid="b">Plain</Block>);
    const block = screen.getByTestId('b');
    expect(block.tagName).toBe('DIV');
    expect(block.querySelector('.lcars-nb-fig')).toBeNull();
    expect(block.className).not.toContain('lcars-strip--');
  });
});

describe('readout table', () => {
  const columns = [{ label: 'Model' }, { label: 'USD', align: 'right', value: true }, { label: 'Share', align: 'right' }];
  const rows = [
    { id: 'opus', legend: 'white', cells: ['claude-opus-5-5', '291.40', '71 %'] },
    { id: 'sonnet', legend: 'steel', cells: ['claude-sonnet-5', '104.86', '25 %'] }
  ];

  it('is a real table with a square legend key, the top row lit and value columns steel', () => {
    render(<ReadoutTable caption="Per model" columns={columns} rows={rows} total={['Total', '396.26', '']} />);
    const table = screen.getByRole('table', { name: 'Per model' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Model', 'USD', 'Share']);
    const [top, second, total] = table.querySelectorAll('tbody tr, tfoot tr');
    expect(top.className).toContain('is-top');
    expect(second.className).not.toContain('is-top');
    expect(top.querySelector('.lcars-key--white')).toBeTruthy();
    expect(second.cells[1].className).toContain('is-value');
    expect(second.cells[1].className).toContain('is-right');
    expect(total.className).toContain('is-total');
    expect(total.textContent).toContain('396.26');
  });

  it('renders nothing without rows', () => {
    const { container } = render(<ReadoutTable columns={columns} rows={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('meters never look like controls', () => {
  it('a flat meter is an image with its value in words, no slider, no focus stop, the fill clamped to 0–100', () => {
    render(
      <>
        <Meter label="Cache read" value={71} text="71 %" />
        <Meter label="Over" value={150} text="150 %" />
        <Meter label="Under" value={-5} text="–" />
      </>
    );
    const [read, over, under] = screen.getAllByTestId('lcars-meter');
    expect(read.getAttribute('role')).toBe('img');
    expect(read.getAttribute('aria-label')).toBe('Cache read: 71 %');
    expect(read.hasAttribute('tabindex')).toBe(false);
    expect(read.querySelector('.lcars-meter-fill').style.width).toBe('71%');
    expect(over.querySelector('.lcars-meter-fill').style.width).toBe('100%');
    expect(under.querySelector('.lcars-meter-fill').style.width).toBe('0%');
    expect(screen.queryByRole('slider')).toBeNull();
  });

  it('a segmented meter shows one cell per segment in its tone, as an image', () => {
    render(<SegMeter label="4 of 8 stages done, 1 running" segments={['done', 'done', 'done', 'done', 'live', 'off', 'off', 'off']} />);
    const m = screen.getByRole('img', { name: '4 of 8 stages done, 1 running' });
    expect(m.querySelectorAll('span')).toHaveLength(8);
    expect(m.querySelectorAll('.is-live')).toHaveLength(1);
    expect(m.hasAttribute('tabindex')).toBe(false);
    expect(screen.queryByRole('slider')).toBeNull();
  });
});

describe('section heading row', () => {
  it('puts the title, the rule, the controls and the drawer toggle last on one row', () => {
    render(<SectionHeading title="Intents" controls={<button type="button">Sort</button>} toggle={<button type="button">‹</button>} />);
    const row = screen.getByTestId('section-heading');
    expect(within(row).getByRole('heading', { level: 2 }).textContent).toBe('Intents');
    expect(row.querySelector('.lcars-sect-rule')).toBeTruthy();
    expect(row.lastElementChild.textContent).toBe('‹');
  });
});

describe('list drawer (US-0415 in the US-0417 look)', () => {
  function renderDrawer(props = {}) {
    return render(
      <ListDrawer viewId="intents" title="Intents" count={52} live {...props}>
        <ul>
          <li>release-0-2-14</li>
        </ul>
      </ListDrawer>
    );
  }

  it('starts open with the toggle as the last element of the heading row, wired to the list', async () => {
    renderDrawer();
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    const drawer = screen.getByTestId('list-drawer');
    const heading = within(drawer).getByTestId('section-heading');
    const toggle = within(drawer).getByTestId('list-fold-toggle');
    expect(heading.lastElementChild).toBe(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const content = document.getElementById(toggle.getAttribute('aria-controls'));
    expect(content.textContent).toContain('release-0-2-14');
    expect(content.hasAttribute('inert')).toBe(false);
    expect(drawer.className).not.toContain('is-folded');
  });

  it('folds to the slim stack: count, live segment, vertical label, focus on the › block; and opens again from it', async () => {
    renderDrawer();
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    fireEvent.click(screen.getByTestId('list-fold-toggle'));
    const drawer = screen.getByTestId('list-drawer');
    expect(drawer.className).toContain('is-folded');
    const open = screen.getByTestId('list-drawer-open');
    expect(document.activeElement).toBe(open);
    expect(open.textContent).toBe('›');
    expect(open.getAttribute('aria-expanded')).toBe('false');
    expect(open.getAttribute('aria-label')).toBe('Visa listan (52)');
    const stack = screen.getByTestId('list-drawer-stack');
    expect(stack.querySelector('.lcars-drawer-count').textContent).toBe('52');
    expect(stack.querySelector('.lcars-drawer-live')).toBeTruthy();
    expect(stack.querySelector('.lcars-drawer-label').textContent).toBe('Intents');
    const toggle = screen.getByTestId('list-fold-toggle');
    expect(document.getElementById(toggle.getAttribute('aria-controls')).hasAttribute('inert')).toBe(true);
    await waitFor(() => expect(window.bridge.setSettings).toHaveBeenCalledWith({ listFolded: { intents: true } }));

    fireEvent.click(open);
    expect(drawer.className).not.toContain('is-folded');
    expect(document.activeElement).toBe(screen.getByTestId('list-fold-toggle'));
  });

  it('keeps the › block out of the tab order while open, and has no live segment when nothing runs', async () => {
    renderDrawer({ live: false });
    await waitFor(() => expect(window.bridge.getSettings).toHaveBeenCalled());
    expect(screen.getByTestId('list-drawer-open').tabIndex).toBe(-1);
    expect(screen.getByTestId('list-drawer-stack').querySelector('.lcars-drawer-live')).toBeNull();
  });

  it('opens folded when the view was saved folded', async () => {
    stored = { listFolded: { intents: true } };
    renderDrawer();
    await waitFor(() => expect(screen.getByTestId('list-drawer').className).toContain('is-folded'));
  });
});

describe('the shared entrance sequence', () => {
  it('runs once per view entry: on, off after the sequence, not again on a re-render, again for another view', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ view }) => useEntrance(view), { initialProps: { view: 'intents' } });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
    rerender({ view: 'intents' });
    expect(result.current).toBe(false);
    rerender({ view: 'cost' });
    expect(result.current).toBe(true);
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current).toBe(false);
  });

  it('never runs with reduced or no motion', () => {
    for (const motion of ['reduced', 'off']) {
      document.documentElement.dataset.motion = motion;
      const { result, rerender, unmount } = renderHook(({ view }) => useEntrance(view), { initialProps: { view: 'a' } });
      expect(result.current).toBe(false);
      rerender({ view: 'b' });
      expect(result.current).toBe(false);
      unmount();
    }
  });
});

describe('curved diagonal frame', () => {
  it('heads its bar with the title and sub-label, holds the readout blocks in its arm and the content in its body', () => {
    render(
      <DiagonalFrame
        title="Cost"
        sub="all intents"
        tag="aidlc-dash"
        readouts={[
          { k: 'Total', v: '$412', tone: 'steel', strip: 'live' },
          { k: 'Intents', v: '52' }
        ]}
      >
        <p>chart</p>
      </DiagonalFrame>
    );
    const frame = screen.getByTestId('lcars-diagonal-frame');
    expect(within(frame).getByRole('heading', { level: 2 }).textContent).toBe('Cost');
    expect(within(frame).getByText('all intents')).toBeTruthy();
    expect(within(frame).getByText('aidlc-dash').className).toContain('lcars-tagbox');
    const blocks = within(frame).getAllByTestId('lcars-diagonal-readout');
    expect(blocks.map((b) => b.textContent)).toEqual(['Total$412', 'Intents52']);
    expect(blocks[0].className).toContain('lcars-strip--live');
    expect(frame.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    expect(within(frame).getByTestId('lcars-diagonal-body').textContent).toBe('chart');
  });
});

describe('round frame (US-0417: Configuration and the dialogs)', () => {
  it('heads its top bar with the title, takes circular radii from its arm and bars, and holds its body', () => {
    render(
      <RoundFrame title="Feature docs" titleId="t1" sub="Project settings · app" footer="claude" arm={30} top={42} bottom={18}>
        form
      </RoundFrame>
    );
    const frame = screen.getByTestId('lcars-round-frame');
    expect(screen.getByRole('heading', { name: 'Feature docs' }).id).toBe('t1');
    expect(within(frame).getByTestId('lcars-segbar').textContent).toContain('Project settings · app');
    expect(within(frame).getByTestId('lcars-round-body').textContent).toBe('form');
    expect(frame.style.getPropertyValue('--rf-ro')).toBe(`${elbowRadii(30, 42).outer}px`);
    expect(frame.style.getPropertyValue('--rf-ri')).toBe(`${elbowRadii(30, 42).inner}px`);
    expect(frame.style.getPropertyValue('--rf-rob')).toBe(`${elbowRadii(30, 18).outer}px`);
    expect(frame.textContent).toContain('claude'); // the bottom bar's label
  });

  it('an arm with readouts is not filled; a corner block takes the arm column of the top elbow', () => {
    render(
      <RoundFrame title="About" corner={<span>brand</span>} arm={150} top={30} bottom={18} armContent={<span>v</span>}>
        x
      </RoundFrame>
    );
    const frame = screen.getByTestId('lcars-round-frame');
    expect(frame.className).toContain('has-corner');
    expect(frame.querySelector('.lcars-rf-arm').textContent).toBe('v');
    expect(frame.querySelector('.lcars-rf-tl').textContent).toBe('brand');
  });
});
