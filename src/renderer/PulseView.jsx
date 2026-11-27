// US-0418 FR1, FR7, FR8, FR9, NFR3: the Pulse project view. The vendored pretty-events ring draws our agents and files
// on a canvas inside the LCARS diagonal frame (FR1); hovering a file or an agent names it with its last actions, as a
// canvas callout and as text for screen readers (FR8.1); clicking a file opens it in the editor (FR8.2); the arm shows
// the readouts and fifteen one-minute bars of reads, writes and deletes (FR9). With reduced motion the canvas is drawn
// once per change as a still frame (NFR3). Step 10: the canvas takes its frame's content size and the ring is fitted to it.
// US-0419: Back and the live state sit in the LCARS title bar, bars are the footer, and the stage counts both when it fits.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DiagonalFrame, Pill, useEntrance } from './Lcars.jsx';
import { useEditor } from './editor/EditorContext.jsx';
import { buildScene, clampTilt, drawFrame, fitRing, hitTest, isOnRing, lcarsTheme, readouts, ringKey } from './pulse/scene.js';
import { createRing } from './pulse/vendor/components/ring.js';
import { createRandom } from './pulse/vendor/core/random.js';

// The size before the frame is measured (and in jsdom, which has no layout).
const START = { w: 1080, h: 720 };
const TIP_LINES = 3;
const STAGE_MIN = 160;
const BAR_H = 40;
const DRAG_THRESHOLD = 4;
const DEGREES_PER_DRAG_PIXEL = 0.25;

const errorText = (err) => String(err?.message ?? err).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
const keyOf = (x) => (x.outside ? 'outside' : x.path);

/** FR9.1: fifteen one-minute bars, oldest left, reads, writes and deletes stacked. */
function Bars({ bars }) {
  const { t } = useTranslation();
  const max = Math.max(1, ...bars.map((b) => b.read + b.write + b.delete));
  const h = (n) => (n / max) * BAR_H;
  return (
    <svg
      className="pulse-bars"
      viewBox={`0 0 ${bars.length * 4} ${BAR_H}`}
      width="100%"
      height={BAR_H}
      preserveAspectRatio="none"
      role="img"
      aria-label={t('pulse.bars', {
        read: bars.reduce((s, b) => s + b.read, 0),
        write: bars.reduce((s, b) => s + b.write, 0),
        delete: bars.reduce((s, b) => s + b.delete, 0)
      })}
      data-testid="pulse-bars"
    >
      {bars.map((b, i) => {
        let y = BAR_H;
        return ['read', 'write', 'delete'].map((k) => {
          y -= h(b[k]);
          return b[k] > 0 && <rect key={`${i}${k}`} className={`is-${k}`} x={i * 4 + 0.5} y={y} width={3} height={h(b[k])} />;
        });
      })}
    </svg>
  );
}

export default function PulseView({ projectId, onBack }) {
  const { t } = useTranslation();
  const editor = useEditor();
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [tilt, setTilt] = useState({ yaw: 0, pitch: 0 });
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const canvasRef = useRef(null);
  const ringRef = useRef(null);
  const stageRef = useRef(null);
  const cloudRef = useRef([]);
  const [size, setSize] = useState(START);
  const geo = useMemo(() => fitRing(size.w, size.h), [size]);
  const entering = useEntrance(`pulse:${projectId}`);
  // US-0418 step 15: the main session has no agent type; name it, so "other" stays for changes no one can be tied to.
  const name = useCallback((a) => a.label ?? t(a.id.startsWith('main:') ? 'pulse.main' : 'pulse.unattributed'), [t]);
  const kind = useCallback((k) => t(`pulse.kind.${k}`), [t]);

  useEffect(() => {
    let live = true;
    window.bridge.pulse
      .list(projectId)
      .then((s) => live && (setSnap(s), setError(null)))
      .catch((err) => live && setError(t('pulse.loadFailed', { error: errorText(err) })));
    const off = window.bridge.pulse.onChanged((c) => c.projectId === projectId && setSnap(c.snapshot));
    return () => {
      live = false;
      off?.();
    };
  }, [projectId, t]);

  const scene = useMemo(() => snap && buildScene(snap, { name }), [snap, name]);
  const themes = useMemo(() => {
    const style = getComputedStyle(document.documentElement);
    return lcarsTheme((v) => style.getPropertyValue(v));
  }, []);

  // FR8.1: the hovered thing's name and its last actions, newest first.
  const tip = useMemo(() => {
    if (!hover || !snap) return null;
    const agentName = new Map(snap.agents.map((a) => [a.id, name(a)]));
    if (hover.file) {
      const f = hover.file;
      const own = (x) => keyOf(x) === f.key || (f.folder && x.path?.startsWith(`${f.path}/`));
      const title = f.outside ? t('pulse.outside') : f.folder ? t('pulse.folder', { path: f.path, n: f.count ?? 0 }) : f.path;
      const lines = snap.touches
        .filter(own)
        .slice(-TIP_LINES)
        .reverse()
        .map((x) => `${kind(x.kind)} · ${agentName.get(x.agent)}`);
      return { angle: f.angle, title, lines, alert: f.deleted };
    }
    const { word } = hover;
    const lines = snap.touches
      .filter((x) => word.ids.includes(x.agent))
      .slice(-TIP_LINES)
      .reverse()
      .map((x) => `${kind(x.kind)} · ${x.outside ? t('pulse.outside') : x.path}`);
    return { at: [word.x, word.y], title: word.name, lines };
  }, [hover, snap, name, kind, t]);

  // Step 10: follow the frame's content size. A frame with no height yet gets a 3:2 canvas.
  // ponytail: canvas pixels are CSS pixels, so it is soft on retina screens; scale by devicePixelRatio if that shows.
  // US-0419: the ring is always drawn, even with nothing on it; the standby panel sits inside it.
  const hasCanvas = Boolean(snap);
  useEffect(() => {
    const box = stageRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    // The stage fills what is left of the project view below it, so the whole ring shows without scrolling.
    let view = box.parentElement;
    while (view && !view.classList.contains('project-mode') && !/(auto|scroll)/.test(getComputedStyle(view).overflowY)) view = view.parentElement;
    view = view ?? document.documentElement;
    // Step 16: the stage runs down to the terminal's foot bar, open or closed; the open terminal is drawn over it
    // (theme.css), so the ring keeps one size whatever the terminal does. Step 18: Pulse has no latest-message row.
    // US-0419: the footer strip sits below the stage, so its height is taken off the stage, not the frame's padding.
    const frame = box.closest('.pulse-view') ?? box;
    const fit = () => {
      const foot = document.querySelector('.terminal-footbar');
      const bottom = foot
        ? foot.getBoundingClientRect().top - 14
        : view.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(view).paddingBottom) || 0);
      const b = box.getBoundingClientRect();
      const strip = frame.querySelector('.pulse-foot');
      const below = strip ? strip.getBoundingClientRect().height + 10 : 0;
      box.style.height = `${Math.max(STAGE_MIN, Math.floor(bottom - b.top - below))}px`;
    };
    const strip = frame.querySelector('.pulse-foot');
    let panel = null;
    const ro = new ResizeObserver((entries) => {
      if (entries.some((e) => e.target !== box)) fit();
      const entry = entries.find((e) => e.target === box);
      if (!entry) return; // the view, the footer or the terminal moved: only the fit changes
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height) || Math.round((w * 2) / 3);
      if (w > 0) setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    fit();
    // The footer's height is only known once it is laid out; one frame later and on every resize of it, fit again.
    const raf = requestAnimationFrame(fit);
    ro.observe(box);
    ro.observe(view);
    if (strip) ro.observe(strip);
    const observeTerminal = () => {
      const current = document.querySelector('.terminal-panel');
      if (current && current !== panel) {
        panel = current;
        ro.observe(panel); // catches terminal open/close after this view has mounted
        fit();
      }
    };
    observeTerminal();
    const mo = new MutationObserver(observeTerminal);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
    };
  }, [hasCanvas]);

  useEffect(() => {
    const ctx = scene && canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;
    const key = `${geo.w}x${geo.h}:${ringKey(scene)}`;
    // FR1: the ring texture is rebuilt only when the size or the sectors change, never for new touches.
    if (ringRef.current?.key !== key) ringRef.current = { key, ring: createRing(geo, scene.layout, themes.base, createRandom(7)) };
    const { ring } = ringRef.current;
    const motion = document.documentElement.dataset.motion === 'full';
    const frame = () => (cloudRef.current = drawFrame(ctx, scene, ring, geo, themes, Date.now(), { motion, hover: tip, tilt }));
    frame();
    if (!motion) return undefined; // NFR3: one still frame per change
    let id = requestAnimationFrame(function tick() {
      frame();
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [scene, themes, tip, geo, tilt]);

  /** Pointer coordinates relative to the ring centre in canvas CSS-pixel coordinates. */
  const canvasPoint = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = geo.w / (rect.width || geo.w);
    return [(e.clientX - rect.left) * s - geo.cx, (e.clientY - rect.top) * s - geo.cy];
  };
  /** The pointer in canvas coordinates; hitTest inverts the current view and ellipse projections. */
  const at = (e) => {
    const [x, y] = canvasPoint(e);
    return scene && hitTest(scene, x, y, geo.ri, cloudRef.current, tilt);
  };
  const onPointerDown = (e) => {
    if (!scene || e.button !== 0) return;
    const [x, y] = canvasPoint(e);
    if (!isOnRing(x, y, geo, tilt)) return;
    suppressClickRef.current = false;
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, initialTilt: tilt, dragging: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.dragging && Math.hypot(dx, dy) <= DRAG_THRESHOLD) {
        setHover(at(e));
        return;
      }
      drag.dragging = true;
      setHover(null);
      setTilt(clampTilt({ yaw: drag.initialTilt.yaw + dx * DEGREES_PER_DRAG_PIXEL, pitch: drag.initialTilt.pitch - dy * DEGREES_PER_DRAG_PIXEL }));
      return;
    }
    setHover(at(e));
  };
  const finishDrag = (e) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    suppressClickRef.current = drag.dragging;
    if (!drag.dragging) setHover(at(e));
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onClick = (e) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.preventDefault();
      return;
    }
    const f = at(e)?.file; // FR8.2: the outside mark, deleted files and folder marks have nothing to open.
    if (f && !f.outside && !f.deleted && !f.folder) editor?.open(f.path);
  };

  const r = snap && readouts(snap, Date.now(), name);
  const working = Boolean(snap?.agents.some((a) => a.active));
  const frameReadouts = r
    ? [
        { k: t('pulse.readout.rate'), v: <span data-testid="pulse-readout-rate">{r.perMinute}</span>, tone: 'steel', strip: 'live' },
        { k: t('pulse.readout.files'), v: <span data-testid="pulse-readout-files">{r.files}</span>, tone: 'deep' },
        { k: t('pulse.readout.busiest'), v: <span data-testid="pulse-readout-busiest">{r.busiest ?? t('pulse.none')}</span>, tone: 'deep' }
      ]
    : [];
  const empty = snap && snap.files.length === 0 && snap.touches.length === 0;
  const hasTouches = Boolean(snap?.touches.length);

  return (
    <section className={`pulse-view${entering ? ' is-entering' : ''}`} data-testid="pulse-view" onKeyDown={(e) => e.key === 'Escape' && onBack?.()}>
      {/* US-0419: Back rides the title bar's right end, clear of the elbow and the thin line; the state rides its tag. */}
      <DiagonalFrame
        title={t('pulse.title')}
        sub={t('pulse.meta')}
        tag={snap ? `${t(working ? 'pulse.live' : 'pulse.idle')} · ${t('pulse.agents', { n: snap.agents.length })}` : undefined}
        trailing={
          onBack && (
            <Pill className="pulse-back" onClick={onBack} data-testid="pulse-back">
              {t('app.back')}
            </Pill>
          )
        }
        readouts={frameReadouts}
      >
        {error && (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        )}
        {!snap && !error && <p className="muted">{t('pulse.loading')}</p>}
        {snap && (
          <>
            <div className="pulse-stage" ref={stageRef}>
              <canvas
                ref={canvasRef}
                className="pulse-canvas"
                width={geo.w}
                height={geo.h}
                role="img"
                aria-label={t('pulse.canvas', { agents: snap.agents.length, files: snap.files.length })}
                data-testid="pulse-canvas"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onLostPointerCapture={finishDrag}
                onPointerLeave={() => !dragRef.current && setHover(null)}
                onClick={onClick}
              />
              {empty && (
                <div className="pulse-empty" data-testid="pulse-empty">
                  <span className="pulse-empty-state" aria-hidden="true">
                    <i />
                    {t('pulse.idle')}
                  </span>
                  <p className="pulse-empty-title">{t('pulse.emptyTitle')}</p>
                  <p className="pulse-empty-text">{t('pulse.empty')}</p>
                  <p className="pulse-empty-hint">{t('pulse.emptyHint')}</p>
                </div>
              )}
            </div>
            <p className="sr-only" aria-live="polite" data-testid="pulse-tooltip">
              {tip ? [tip.title, ...tip.lines].join(' · ') : ''}
            </p>
          </>
        )}
        {/* US-0419: the bars are a footer readout, under the canvas, where the terminal cannot hide them. */}
        {r && hasTouches && (
          <div className="pulse-foot" data-testid="pulse-foot">
            <span className="pulse-foot-label">{t('pulse.window')}</span>
            <Bars bars={r.bars} />
            <span className="pulse-legend" aria-hidden="true">
              <span>
                <i className="pulse-key pulse-key--read" />
                {t('pulse.kind.read')}
              </span>
              <span>
                <i className="pulse-key pulse-key--write" />
                {t('pulse.kind.write')}
              </span>
              <span>
                <i className="pulse-key pulse-key--delete" />
                {t('pulse.kind.delete')}
              </span>
            </span>
          </div>
        )}
      </DiagonalFrame>
    </section>
  );
}
