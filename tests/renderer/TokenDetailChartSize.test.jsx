// US-0024 FR1–FR3: the "Tokens over time" chart gets a box with a height. visx's real ParentSize is used here (no
// mock): its outer box defaults to `height: 100%`, which is 0 px in the token detail section and clips the chart.
// jsdom does no layout, so the test checks the inline height on the size box, not a measured one.
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

vi.mock('../../src/renderer/TerminalContext.jsx', () => ({ useTerminal: () => ({ state: () => 'idle', type: () => {}, sequence: () => {} }) }));
const { default: TokenDetail } = await import('../../src/renderer/TokenDetail.jsx');

const DIR = '261116-chart';
const reading = (s, n) => ({
  at: 1_000_000 + s * 1000,
  input: 300 * n,
  output: 150 * n,
  cacheWrite5m: 20 * n,
  cacheWrite1h: 10 * n,
  cacheRead: 500 * n,
  usd: 0.4 * n
});

async function renderDetail(readings) {
  window.bridge = { getTokenReadings: vi.fn(async () => readings), getAgentProgress: vi.fn(async () => []) };
  render(<TokenDetail projectId="p1" dirName={DIR} intent={null} cost={null} live={false} onBack={() => {}} />);
  await waitFor(() => expect(window.bridge.getTokenReadings).toHaveBeenCalledWith('p1', DIR, 'default')); // US-0215: the space goes along
  await act(async () => {});
}

// jsdom has no ResizeObserver; ParentSize only needs one to exist.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    disconnect() {}
  };
});
afterEach(() => {
  cleanup();
  delete window.bridge;
});

it('US-0024 FR1: with two readings the chart box has the chart height, not 100% of a section with none', async () => {
  await renderDetail([reading(0, 1), reading(40, 4)]);
  const box = document.querySelector('.token-detail-size');
  expect(box).toBeTruthy();
  expect(box.style.height).toBe('260px');
  expect(screen.getByTestId('token-detail-legend')).toBeTruthy();
});

it('US-0024 FR2: with one reading Diagram says so in one sentence and draws no chart box', async () => {
  await renderDetail([reading(0, 1)]);
  expect(screen.getByTestId('token-detail-over-time-empty').textContent).toBe('Bara en avläsning än; diagrammet börjar med nästa.');
  expect(document.querySelector('.token-detail-size')).toBeNull();
});
