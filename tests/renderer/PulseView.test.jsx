// US-0418 FR1, FR3.4, FR8, FR9, NFR3: the Pulse project view, with the vendored drawing against a stub canvas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { t } from '../../src/shared/i18n.js';
import { EditorCtx } from '../../src/renderer/editor/EditorContext.jsx';

vi.mock('../../src/renderer/pulse/vendor/components/ring.js', async (orig) => {
  const real = await orig();
  return { createRing: vi.fn(real.createRing) };
});
const { createRing } = await import('../../src/renderer/pulse/vendor/components/ring.js');
const { default: PulseView } = await import('../../src/renderer/PulseView.jsx');
const { buildScene, fitRing } = await import('../../src/renderer/pulse/scene.js');

const MIN = 60000;
const NOW = Date.UTC(2026, 10, 27, 12);

let ctx;
function stubCtx() {
  const calls = [];
  return new Proxy(
    { calls, measureText: (s) => ({ width: String(s).length * 5 }) },
    {
      get: (target, key) => (key in target ? target[key] : (...args) => calls.push([key, ...args])),
      set: (target, key, value) => ((target[key] = value), true)
    }
  );
}
const lines = () => ctx.calls.filter((c) => c[0] === 'quadraticCurveTo').length;

const SNAP = {
  agents: [
    { id: 'a1', label: 'main', group: 'pulse-view', active: true, count: 3 },
    { id: 'unattributed', label: null, group: null, active: false, count: 1 }
  ],
  files: [
    { path: 'src/a.js', kind: 'write', weight: 1, deleted: false, lastAt: NOW - 400, agents: ['a1'] },
    { path: 'src/gone.js', kind: 'delete', weight: 1, deleted: true, lastAt: NOW - 2 * MIN, agents: ['a1'] },
    { outside: true, kind: 'read', weight: 1, deleted: false, lastAt: NOW - 3 * MIN, agents: ['unattributed'] }
  ],
  touches: [
    { agent: 'unattributed', outside: true, kind: 'read', at: NOW - 3 * MIN },
    { agent: 'a1', path: 'src/gone.js', kind: 'delete', at: NOW - 2 * MIN },
    { agent: 'a1', path: 'src/a.js', kind: 'write', at: NOW - 400 }
  ]
};

let changed;
function mount(snapshot = SNAP, open = vi.fn()) {
  window.bridge = {
    pulse: {
      list: vi.fn(async () => snapshot),
      onChanged: vi.fn((cb) => {
        changed = cb;
        return () => {};
      })
    }
  };
  render(
    <EditorCtx.Provider value={{ open }}>
      <PulseView projectId="p1" />
    </EditorCtx.Provider>
  );
  return open;
}

/** Points at a file's angle on the canvas (1080 x 720 logical, the stub rect is the same size). */
function pointAt(snapshot, pick) {
  const scene = buildScene(snapshot, { name: (a) => a.label ?? t('pulse.unattributed') });
  const f = scene.files.find(pick);
  const { cx, cy, ri } = fitRing(1080, 720);
  return { clientX: cx + Math.cos(f.angle) * ri, clientY: cy + Math.sin(f.angle) * ri };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  vi.setSystemTime(NOW);
  ctx = stubCtx();
  // The view's canvas records; the ring's offscreen texture gets its own stub, so its tick lines do not count.
  HTMLCanvasElement.prototype.getContext = function () {
    return this.dataset.testid === 'pulse-canvas' ? ctx : stubCtx();
  };
  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1080, height: 720 });
  document.documentElement.dataset.motion = 'full';
  createRing.mockClear();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete document.documentElement.dataset.motion;
});

const settle = () => act(async () => {});

describe('PulseView', () => {
  it('shows the diagonal frame with the readouts and no latest actions list (FR9, step 14)', async () => {
    mount();
    await settle();
    expect(screen.getByTestId('lcars-diagonal-frame')).toBeTruthy();
    expect(screen.getByTestId('pulse-readout-rate').textContent).toBe('1');
    expect(screen.getByTestId('pulse-readout-files').textContent).toBe('3');
    expect(screen.getByTestId('pulse-readout-busiest').textContent).toBe('main');
    expect(screen.queryAllByTestId('pulse-latest-row')).toHaveLength(0);
    expect(screen.getByTestId('pulse-bars').querySelectorAll('rect').length).toBeGreaterThan(0);
  });

  it('fits the canvas to its frame and rebuilds the ring only when the size changes (step 10)', async () => {
    let fire;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb) {
          fire = (w, h) => cb([{ contentRect: { width: w, height: h } }]);
        }
        observe() {}
        disconnect() {}
      }
    );
    mount();
    await settle();
    await act(async () => fire(600, 0));
    const canvas = screen.getByTestId('pulse-canvas');
    expect([canvas.width, canvas.height]).toEqual([600, 400]);
    expect(createRing).toHaveBeenCalledTimes(2);
    await act(async () => fire(600, 0));
    expect(createRing).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });

  it('keeps the stage the same size with the terminal open or closed, down to the foot bar (step 16)', async () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    const rects = { 'terminal-footbar': { top: 900, height: 28 } };
    const orig = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      const key = Object.keys(rects).find((k) => this.classList.contains(k));
      return { top: 100, bottom: 100, height: 0, ...rects[key] };
    };
    const shell = document.createElement('div');
    shell.innerHTML = '<section class="terminal-panel"><div class="terminal-footbar"></div></section>';
    document.body.append(shell);
    const term = shell.querySelector('.terminal-panel');
    const stageHeight = async (collapsed) => {
      cleanup();
      term.classList.toggle('is-collapsed', collapsed);
      term.style.height = collapsed ? '28px' : '240px';
      window.bridge = { pulse: { list: vi.fn(async () => SNAP), onChanged: vi.fn(() => () => {}) } };
      render(<PulseView projectId="p1" />);
      await settle();
      return screen.getByTestId('pulse-canvas').parentElement.style.height;
    };
    try {
      // the foot bar's top, 900, less a gap of 14, less the stage's top, 100 (step 18: Pulse has no message row)
      expect(await stageHeight(true)).toBe('786px');
      expect(await stageHeight(false)).toBe('786px');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = orig;
      shell.remove();
      vi.unstubAllGlobals();
    }
  });

  it('goes back with its arm block and with Esc (steps 16-17)', async () => {
    const onBack = vi.fn();
    window.bridge = { pulse: { list: vi.fn(async () => SNAP), onChanged: vi.fn(() => () => {}) } };
    render(<PulseView projectId="p1" onBack={onBack} />);
    await settle();
    fireEvent.click(screen.getByTestId('pulse-back'));
    expect(screen.getByTestId('pulse-back').textContent).toBe(t('app.back'));
    // step 17: the back button is the arm's last block, not a pill over the frame's corner
    expect(screen.getByTestId('pulse-back').closest('.lcars-df-arm')).not.toBeNull();
    fireEvent.keyDown(screen.getByTestId('pulse-canvas'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('builds the ring once and keeps it while only the touches change (FR1)', async () => {
    mount();
    await settle();
    expect(createRing).toHaveBeenCalledTimes(1);
    await act(async () => changed({ projectId: 'p1', snapshot: { ...SNAP, touches: SNAP.touches.slice(1) } }));
    await act(async () => changed({ projectId: 'other', snapshot: { agents: [], files: [], touches: [] } }));
    expect(createRing).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByTestId('pulse-latest-row')).toHaveLength(0);
  });

  it('draws a fresh ribbon and none once it has faded (FR3.4)', async () => {
    mount();
    await settle();
    act(() => vi.advanceTimersByTime(16));
    expect(lines()).toBeGreaterThan(0);
    act(() => vi.advanceTimersByTime(5000)); // the word and its lines are gone after 4 s
    ctx.calls.length = 0;
    act(() => vi.advanceTimersByTime(16));
    expect(lines()).toBe(0);
  });

  it('draws one still frame with no ribbons under reduced motion (NFR3)', async () => {
    document.documentElement.dataset.motion = 'reduced';
    mount();
    await settle();
    const frames = ctx.calls.filter((c) => c[0] === 'drawImage').length;
    act(() => vi.advanceTimersByTime(500));
    expect(ctx.calls.filter((c) => c[0] === 'drawImage').length).toBe(frames);
    expect(frames).toBeGreaterThan(0);
    expect(lines()).toBe(0);
  });

  it('shows the hovered file name and its last actions (FR8.1)', async () => {
    mount();
    await settle();
    fireEvent.pointerMove(
      screen.getByTestId('pulse-canvas'),
      pointAt(SNAP, (f) => f.path === 'src/a.js')
    );
    const tip = screen.getByTestId('pulse-tooltip').textContent;
    expect(tip).toContain('src/a.js');
    expect(tip).toContain(t('pulse.kind.write'));
    fireEvent.pointerLeave(screen.getByTestId('pulse-canvas'));
    expect(screen.getByTestId('pulse-tooltip').textContent).toBe('');
  });

  it('opens a clicked file, but not the outside mark or a deleted file (FR8.2)', async () => {
    const open = mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    fireEvent.click(
      canvas,
      pointAt(SNAP, (f) => f.outside)
    );
    fireEvent.click(
      canvas,
      pointAt(SNAP, (f) => f.path === 'src/gone.js')
    );
    expect(open).not.toHaveBeenCalled();
    fireEvent.click(
      canvas,
      pointAt(SNAP, (f) => f.path === 'src/a.js')
    );
    expect(open).toHaveBeenCalledWith('src/a.js');
  });

  it('names a grouped folder mark with its file count and does not open it (FR7.2, FR8.2)', async () => {
    const snap = {
      agents: SNAP.agents.slice(0, 1),
      files: [{ path: 'lib', folder: true, count: 4, kind: 'write', weight: 4, deleted: false, lastAt: NOW - 400, agents: ['a1'] }],
      touches: [{ agent: 'a1', path: 'lib/x.js', kind: 'write', at: NOW - 400 }]
    };
    const open = mount(snap);
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    fireEvent.pointerMove(
      canvas,
      pointAt(snap, (f) => f.folder === true)
    );
    expect(screen.getByTestId('pulse-tooltip').textContent).toContain(t('pulse.folder', { path: 'lib', n: 4 }));
    fireEvent.click(
      canvas,
      pointAt(snap, (f) => f.folder === true)
    );
    expect(open).not.toHaveBeenCalled();
  });

  it('names the main session "main agent", not "other" (step 15)', async () => {
    mount({ ...SNAP, agents: [{ id: 'main:s1', label: null, group: null, active: true, count: 9 }, ...SNAP.agents] });
    await settle();
    expect(screen.getByTestId('pulse-readout-busiest').textContent).toBe(t('pulse.main'));
    expect(t('pulse.main')).toBe('Huvudagent');
  });

  it('says so when nothing has been touched yet, and when the snapshot cannot be read', async () => {
    mount({ agents: [], files: [], touches: [] });
    await settle();
    expect(screen.getByText(t('pulse.empty'))).toBeTruthy();
    cleanup();
    window.bridge.pulse.list = vi.fn(async () => {
      throw new Error('gone');
    });
    render(<PulseView projectId="p1" />);
    await settle();
    expect(screen.getByRole('alert').textContent).toBe(t('pulse.loadFailed', { error: 'gone' }));
  });
});
