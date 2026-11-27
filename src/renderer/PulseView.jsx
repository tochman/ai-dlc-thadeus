// US-0418 FR1, FR7, FR8, FR9, NFR3: the Pulse project view. The vendored pretty-events ring draws our agents and files
// on a canvas inside the LCARS diagonal frame (FR1); hovering a file or an agent names it with its last actions, as a
// canvas callout and as text for screen readers (FR8.1); clicking a file opens it in the editor (FR8.2); the arm shows
// the readouts and fifteen one-minute bars of reads, writes and deletes (FR9). With reduced motion the canvas is drawn
// once per change as a still frame (NFR3). Step 10: the canvas takes its frame's content size and the ring is fitted to it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DiagonalFrame, useEntrance } from './Lcars.jsx';
import { useEditor } from './editor/EditorContext.jsx';
import { buildScene, drawFrame, fitRing, hitTest, lcarsTheme, readouts, ringKey } from './pulse/scene.js';
import { createRing } from './pulse/vendor/components/ring.js';
import { createRandom } from './pulse/vendor/core/random.js';

// The size before the frame is measured (and in jsdom, which has no layout).
const START = { w: 1080, h: 720 };
const TIP_LINES = 3;
const STAGE_MIN = 160;
const BAR_H = 40;

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

export default function PulseView({ projectId }) {
  const { t } = useTranslation();
  const editor = useEditor();
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
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
  const hasCanvas = Boolean(snap) && !(snap.files.length === 0 && snap.touches.length === 0);
  useEffect(() => {
    const box = stageRef.current;
    if (!box || typeof ResizeObserver === 'undefined') return undefined;
    // The stage fills what is left of the project view below it, so the whole ring shows without scrolling.
    let view = box.parentElement;
    while (view && !view.classList.contains('project-mode') && !/(auto|scroll)/.test(getComputedStyle(view).overflowY)) view = view.parentElement;
    view = view ?? document.documentElement;
    // Step 15: the stage keeps its hidden-terminal size and runs under an open terminal, which is drawn on top (theme.css).
    const frame = box.closest('.pulse-view') ?? box;
    const term = document.querySelector('.terminal-panel');
    const under = () => {
      if (!term || term.classList.contains('is-collapsed')) return 0;
      return term.getBoundingClientRect().height - (term.querySelector('.terminal-footbar')?.getBoundingClientRect().height ?? 0);
    };
    const fit = () => {
      const pad = parseFloat(getComputedStyle(view).paddingBottom) || 0;
      const bottom = view.getBoundingClientRect().bottom + under() - pad;
      const b = box.getBoundingClientRect();
      const below = frame.getBoundingClientRect().bottom - b.bottom;
      box.style.height = `${Math.max(STAGE_MIN, Math.floor(bottom - b.top - below))}px`;
    };
    const ro = new ResizeObserver((entries) => {
      const entry = entries.find((e) => e.target !== view && e.target !== term);
      if (!entry) return fit();
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height) || Math.round((w * 2) / 3);
      if (w > 0) setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    fit();
    ro.observe(box);
    ro.observe(view);
    if (term) ro.observe(term); // the terminal opens, closes or is resized
    return () => ro.disconnect();
  }, [hasCanvas]);

  useEffect(() => {
    const ctx = scene && canvasRef.current?.getContext('2d');
    if (!ctx) return undefined;
    const key = `${geo.w}x${geo.h}:${ringKey(scene)}`;
    // FR1: the ring texture is rebuilt only when the size or the sectors change, never for new touches.
    if (ringRef.current?.key !== key) ringRef.current = { key, ring: createRing(geo, scene.layout, themes.base, createRandom(7)) };
    const { ring } = ringRef.current;
    const motion = document.documentElement.dataset.motion === 'full';
    const frame = () => (cloudRef.current = drawFrame(ctx, scene, ring, geo, themes, Date.now(), { motion, hover: tip }));
    frame();
    if (!motion) return undefined; // NFR3: one still frame per change
    let id = requestAnimationFrame(function tick() {
      frame();
      id = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(id);
  }, [scene, themes, tip, geo]);

  /** The pointer in ring coordinates; the canvas keeps its aspect ratio, so one scale holds for both axes. */
  const at = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = geo.w / (rect.width || geo.w);
    return hitTest(scene, (e.clientX - rect.left) * s - geo.cx, (e.clientY - rect.top) * s - geo.cy, geo.ri, cloudRef.current);
  };
  const onClick = (e) => {
    const f = at(e)?.file; // FR8.2: the outside mark, deleted files and folder marks have nothing to open.
    if (f && !f.outside && !f.deleted && !f.folder) editor?.open(f.path);
  };

  const r = snap && readouts(snap, Date.now(), name);
  const frameReadouts = r
    ? [
        { k: t('pulse.readout.rate'), v: <span data-testid="pulse-readout-rate">{r.perMinute}</span>, tone: 'steel', strip: 'live' },
        { k: t('pulse.readout.files'), v: <span data-testid="pulse-readout-files">{r.files}</span>, tone: 'deep' },
        { k: t('pulse.readout.busiest'), v: <span data-testid="pulse-readout-busiest">{r.busiest ?? t('pulse.none')}</span>, tone: 'deep' }
      ]
    : [];
  const empty = snap && snap.files.length === 0 && snap.touches.length === 0;

  return (
    <section className={`pulse-view${entering ? ' is-entering' : ''}`} data-testid="pulse-view">
      <DiagonalFrame title={t('pulse.title')} sub={t('pulse.meta')} readouts={frameReadouts} arm={r && <Bars bars={r.bars} />}>
        {error && (
          <p className="banner banner-error" role="alert">
            {error}
          </p>
        )}
        {!snap && !error && <p className="muted">{t('pulse.loading')}</p>}
        {empty && <p className="muted">{t('pulse.empty')}</p>}
        {snap && !empty && (
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
                onPointerMove={(e) => setHover(at(e))}
                onPointerLeave={() => setHover(null)}
                onClick={onClick}
              />
            </div>
            <p className="sr-only" aria-live="polite" data-testid="pulse-tooltip">
              {tip ? [tip.title, ...tip.lines].join(' · ') : ''}
            </p>
          </>
        )}
      </DiagonalFrame>
    </section>
  );
}
