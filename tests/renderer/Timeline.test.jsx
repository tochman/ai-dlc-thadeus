import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Timeline from '../../src/renderer/Timeline.jsx';
import { categoryOf, mergeAudits } from '../../src/main/parsers/audit.js';

// jsdom has no layout: give the scroll container ~600px and every row 34px so the virtualiser can compute a window.
const VIEWPORT = 600;
const ROW = 34;
const heightOf = (el) => (el.dataset?.testid === 'timeline-scroll' ? VIEWPORT : ROW);
const saved = {};
beforeAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight']) {
    saved[prop] = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop);
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return heightOf(this);
      }
    });
  }
  saved.rect = HTMLElement.prototype.getBoundingClientRect;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const h = heightOf(this);
    return { x: 0, y: 0, top: 0, left: 0, right: 800, bottom: h, width: 800, height: h, toJSON() {} };
  };
});
afterAll(() => {
  for (const prop of ['offsetHeight', 'clientHeight']) {
    if (saved[prop]) Object.defineProperty(HTMLElement.prototype, prop, saved[prop]);
    else delete HTMLElement.prototype[prop]; // inherited from Element
  }
  HTMLElement.prototype.getBoundingClientRect = saved.rect;
});
afterEach(cleanup);

// Events in the shape projectService returns: mergeAudits over shard texts, plus category.
const block = (event, minute) =>
  `## ${event}\n**Timestamp**: ${new Date(Date.UTC(2026, 10, 13, 0, minute)).toISOString()}\n**Event**: ${event}\n**Stage**: code-generation\n`;
const shard = (source, minutes) => ({ source, text: minutes.map((m) => block(`STAGE_STARTED`, m)).join('---\n') });
const toEvents = (files) => mergeAudits(files).map((e) => ({ ...e, category: categoryOf(e.event) }));
const range = (n, from = 0) => Array.from({ length: n }, (_, i) => from + i);

describe('Timeline', () => {
  it('shows every event with no cap but renders only a window (FR1.1, FR1.2)', () => {
    render(<Timeline events={toEvents([shard('a.md', range(3000))])} newKeys={null} />);
    expect(screen.getByText('3000 av 3000 händelser')).toBeTruthy();
    const rendered = screen.getAllByTestId('timeline-event');
    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(100);
    expect(screen.getByRole('list').querySelector('[aria-posinset="1"]').getAttribute('aria-setsize')).toBe('3000');
  });

  it('marks exactly the new event, even when its timestamp is older (FR2.3)', () => {
    const a = shard('a.md', [10, 20, 30, 40]);
    const { rerender } = render(<Timeline events={toEvents([a])} newKeys={null} />);
    const b = shard('b.md', [25]); // another machine's file, older than the newest rows
    rerender(<Timeline events={toEvents([a, b])} newKeys={new Set(['b.md#0'])} />);

    const marked = document.querySelectorAll('.event.is-new');
    expect(marked).toHaveLength(1);
    expect(marked[0].getAttribute('aria-posinset')).toBe('3'); // 40, 30, 25 (new), 20, 10
    expect(marked[0].querySelector('.event-row').getAttribute('aria-label')).toContain('ny');
    expect(screen.queryByTestId('timeline-new-counter')).toBeNull(); // it is in view
  });

  it('shows a counter for new events outside the window and jumps to them (FR2.4)', () => {
    const a = shard('a.md', range(3000, 100));
    const { rerender } = render(<Timeline events={toEvents([a])} newKeys={null} />);
    const late = shard('b.md', [1, 2]); // oldest, so they land at the far end of a newest-first list
    rerender(<Timeline events={toEvents([a, late])} newKeys={new Set(['b.md#0', 'b.md#1'])} />);

    const counter = screen.getByTestId('timeline-new-counter');
    expect(counter.textContent).toBe('2 nya händelser');
    fireEvent.click(counter); // scrolls; jsdom cannot move, but the click must not throw
    rerender(<Timeline events={toEvents([a, late])} newKeys={null} />); // highlight expired
    expect(screen.queryByTestId('timeline-new-counter')).toBeNull();
  });

  // US-0050 item 7: an event's fields open with the shared fold.
  it('opens an event’s fields with the shared fold', () => {
    render(<Timeline events={toEvents([shard('a.md', [10, 20])])} newKeys={null} />);
    fireEvent.click(screen.getAllByTestId('timeline-event')[1]);
    expect(document.querySelector('.event-fields').classList.contains('lcars-reveal')).toBe(true);
  });

  it('keeps an expanded row expanded when events update (FR1.3)', () => {
    const a = shard('a.md', [10, 20]);
    const { rerender } = render(<Timeline events={toEvents([a])} newKeys={null} />);
    fireEvent.click(screen.getAllByTestId('timeline-event')[1]);
    expect(document.querySelectorAll('.event-fields')).toHaveLength(1);

    rerender(<Timeline events={toEvents([a, shard('b.md', [30])])} newKeys={new Set(['b.md#0'])} />);
    const rows = screen.getAllByTestId('timeline-event');
    expect(rows[2].getAttribute('aria-expanded')).toBe('true'); // same event, now third
    expect(rows[0].getAttribute('aria-expanded')).toBe('false');
  });
});
