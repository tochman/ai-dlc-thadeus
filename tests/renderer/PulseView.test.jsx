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
const { buildScene, fitRing, projectTilt, TILT } = await import('../../src/renderer/pulse/scene.js');

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
function pointAt(snapshot, pick, tilt = { yaw: 0, pitch: 0 }) {
  const scene = buildScene(snapshot, { name: (a) => a.label ?? t('pulse.unattributed') });
  const f = scene.files.find(pick);
  const { cx, cy, ri } = fitRing(1080, 720);
  const [x, y] = projectTilt(Math.cos(f.angle) * ri, Math.sin(f.angle) * ri * TILT, tilt);
  return { clientX: cx + x, clientY: cy + y };
}

function pointOnRing(radius = 1) {
  const { cx, cy, ri, ro } = fitRing(1080, 720);
  const r = ((ri + ro) / 2) * radius;
  return { clientX: cx + r, clientY: cy };
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
          this.cb = cb;
        }
        observe(target) {
          if (target.classList.contains('pulse-stage')) fire = (w, h) => this.cb([{ target, contentRect: { width: w, height: h } }]);
        }
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
      // the foot bar's top, 900, less a gap of 14, less the stage's top, 100 (step 18: Pulse has no message row),
      // less the footer strip's 0 px in jsdom and its 10 px gap (US-0419)
      expect(await stageHeight(true)).toBe('776px');
      expect(await stageHeight(false)).toBe('776px');
    } finally {
      HTMLElement.prototype.getBoundingClientRect = orig;
      shell.remove();
      vi.unstubAllGlobals();
    }
  });

  it('re-fits when the terminal is added after Astrometrics mounts (US-0419)', async () => {
    let notify;
    const observed = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(cb) {
          notify = cb;
        }
        observe(target) {
          observed.push(target);
        }
        disconnect() {}
      }
    );
    const orig = HTMLElement.prototype.getBoundingClientRect;
    let terminal;
    let terminalTop = 600;
    HTMLElement.prototype.getBoundingClientRect = function () {
      if (this.classList.contains('terminal-footbar')) return { top: terminalTop, bottom: terminalTop + 28, height: 28 };
      return { top: 100, bottom: 100, height: 0 };
    };
    window.bridge = { pulse: { list: vi.fn(async () => SNAP), onChanged: vi.fn(() => () => {}) } };
    try {
      render(<PulseView projectId="p1" />);
      await settle();
      const stage = screen.getByTestId('pulse-canvas').parentElement;
      expect(stage.style.height).toBe('160px');
      terminal = document.createElement('section');
      terminal.className = 'terminal-panel';
      terminal.innerHTML = '<div class="terminal-footbar"></div>';
      await act(async () => {
        document.body.append(terminal);
        await Promise.resolve();
      });
      expect(stage.style.height).toBe('476px');
      terminalTop = 500;
      await act(async () => {
        notify(observed.map((target) => ({ target, contentRect: { width: 800, height: 400 } })));
      });
      expect(stage.style.height).toBe('376px');
    } finally {
      terminal?.remove();
      HTMLElement.prototype.getBoundingClientRect = orig;
      vi.unstubAllGlobals();
    }
  });

  it('goes back with the header pill and with Esc (US-0419)', async () => {
    const onBack = vi.fn();
    window.bridge = { pulse: { list: vi.fn(async () => SNAP), onChanged: vi.fn(() => () => {}) } };
    render(<PulseView projectId="p1" onBack={onBack} />);
    await settle();
    fireEvent.click(screen.getByTestId('pulse-back'));
    expect(screen.getByTestId('pulse-back').textContent).toBe(t('app.back'));
    // US-0419: Back heads the body, above the canvas, so the terminal cannot cover it.
    expect(screen.getByTestId('pulse-back').closest('.lcars-df-top')).not.toBeNull();
    expect(screen.getByTestId('pulse-back').closest('.lcars-df-arm')).toBeNull();
    fireEvent.keyDown(screen.getByTestId('pulse-canvas'), { key: 'Escape' });
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it('keeps Back in reach and names the state while the pulse loads or is empty (US-0419)', async () => {
    const onBack = vi.fn();
    window.bridge = { pulse: { list: vi.fn(async () => ({ agents: [], files: [], touches: [] })), onChanged: vi.fn(() => () => {}) } };
    render(<PulseView projectId="p1" onBack={onBack} />);
    await settle();
    expect(screen.getByTestId('pulse-back').closest('.lcars-df-top')).not.toBeNull();
    expect(screen.getByText((_, el) => el.classList.contains('lcars-tagbox')).textContent).toContain(t('pulse.idle'));
    expect(screen.getByText((_, el) => el.classList.contains('lcars-tagbox')).textContent).toContain(t('pulse.agents', { n: 0 }));
    expect(screen.getByTestId('pulse-canvas')).toBeTruthy();
    // US-0419: the empty ring is an LCARS standby panel, with no row of empty bars.
    expect(screen.getByTestId('pulse-empty')).toBeTruthy();
    expect(screen.getByText(t('pulse.emptyTitle'))).toBeTruthy();
    expect(screen.getByText(t('pulse.empty'))).toBeTruthy();
    expect(screen.queryByTestId('pulse-foot')).toBeNull();
  });

  it('puts the fifteen-minute bars in the footer with their legend (US-0419)', async () => {
    mount();
    await settle();
    const foot = screen.getByTestId('pulse-foot');
    expect(foot.querySelector('[data-testid="pulse-bars"]')).not.toBeNull();
    expect(foot.textContent).toContain(t('pulse.window'));
    expect(foot.textContent).toContain(t('pulse.kind.read'));
    expect(foot.textContent).toContain(t('pulse.kind.write'));
    expect(foot.textContent).toContain(t('pulse.kind.delete'));
    expect(screen.getByText((_, el) => el.classList.contains('lcars-tagbox')).textContent).toContain(t('pulse.live'));
    expect(screen.getByText((_, el) => el.classList.contains('lcars-tagbox')).textContent).toContain(t('pulse.agents', { n: SNAP.agents.length }));
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

  it('tilts from a ring drag, captures the pointer, and keeps the orientation after release', async () => {
    mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    const start = pointOnRing();
    fireEvent.pointerDown(canvas, { ...start, pointerId: 7, button: 0, pointerType: 'mouse' });
    fireEvent.pointerMove(canvas, { ...start, clientX: start.clientX + 48, clientY: start.clientY - 32, pointerId: 7 });
    fireEvent.pointerUp(canvas, { ...start, clientX: start.clientX + 48, clientY: start.clientY - 32, pointerId: 7 });

    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
    const transforms = ctx.calls.filter((call) => call[0] === 'transform');
    expect(transforms.length).toBeGreaterThan(1);
    expect(transforms.at(-1).slice(1, 5)).not.toEqual([1, 0, 0, 1]);
  });

  it('keeps a press-and-release below the drag threshold as a file click', async () => {
    const open = mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    const file = pointAt(SNAP, (entry) => entry.path === 'src/a.js');
    fireEvent.pointerDown(canvas, { ...file, pointerId: 9, button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(canvas, { ...file, pointerId: 9 });
    fireEvent.click(canvas, file);
    expect(open).toHaveBeenCalledWith('src/a.js');
  });

  it('opens a file at its projected location after tilting the ring', async () => {
    const open = mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    const start = pointOnRing();
    fireEvent.pointerDown(canvas, { ...start, pointerId: 12, button: 0, pointerType: 'mouse' });
    fireEvent.pointerMove(canvas, { ...start, clientX: start.clientX + 32, clientY: start.clientY - 20, pointerId: 12 });
    fireEvent.pointerUp(canvas, { ...start, clientX: start.clientX + 32, clientY: start.clientY - 20, pointerId: 12 });
    const projectedFile = pointAt(SNAP, (entry) => entry.path === 'src/a.js', { yaw: 8, pitch: 5 });
    fireEvent.pointerDown(canvas, { ...projectedFile, pointerId: 13, button: 0, pointerType: 'mouse' });
    fireEvent.pointerUp(canvas, { ...projectedFile, pointerId: 13 });
    fireEvent.click(canvas, projectedFile);
    expect(open).toHaveBeenCalledWith('src/a.js');
  });

  it('does not open a file from the click synthesized after a drag', async () => {
    const open = mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    const file = pointAt(SNAP, (entry) => entry.path === 'src/a.js');
    fireEvent.pointerDown(canvas, { ...file, pointerId: 10, button: 0, pointerType: 'mouse' });
    fireEvent.pointerMove(canvas, { ...file, clientX: file.clientX + 12, pointerId: 10 });
    fireEvent.pointerMove(canvas, { ...file, pointerId: 10 });
    fireEvent.pointerUp(canvas, { ...file, pointerId: 10 });
    fireEvent.click(canvas, file);
    expect(open).not.toHaveBeenCalled();
  });

  it('does not begin a tilt drag away from the ring', async () => {
    mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    canvas.setPointerCapture = vi.fn();
    fireEvent.pointerDown(canvas, { clientX: 540, clientY: 245, pointerId: 8, button: 0, pointerType: 'mouse' });
    expect(canvas.setPointerCapture).not.toHaveBeenCalled();
  });

  it('ends a cancelled drag without resetting tilt or keeping pointer capture', async () => {
    mount();
    await settle();
    const canvas = screen.getByTestId('pulse-canvas');
    canvas.setPointerCapture = vi.fn();
    canvas.hasPointerCapture = vi.fn(() => true);
    canvas.releasePointerCapture = vi.fn();
    const start = pointOnRing();
    fireEvent.pointerDown(canvas, { ...start, pointerId: 11, button: 0, pointerType: 'mouse' });
    fireEvent.pointerMove(canvas, { ...start, clientX: start.clientX + 32, pointerId: 11 });
    fireEvent.pointerCancel(canvas, { ...start, clientX: start.clientX + 32, pointerId: 11 });

    expect(canvas.releasePointerCapture).toHaveBeenCalledWith(11);
    const transform = ctx.calls
      .filter((call) => call[0] === 'transform')
      .at(-1)
      .slice(1, 5);
    expect(transform).not.toEqual([1, 0, 0, 1]);
    fireEvent.pointerMove(canvas, { ...start, clientX: start.clientX + 80, pointerId: 11 });
    expect(
      ctx.calls
        .filter((call) => call[0] === 'transform')
        .at(-1)
        .slice(1, 5)
    ).toEqual(transform);
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
