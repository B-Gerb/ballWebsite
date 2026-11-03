import { useEffect, useMemo, useRef, useState } from 'react';
import useCamera from './useCamera.js';
import { zoomAt } from './camera.js';
import './Whiteboard.css';

/** A move shorter than this is still a click; longer is a drag. */
const DRAG_THRESHOLD = 6;
const KEY_PAN_STEP = 60;
const BUTTON_ZOOM = 1.2;
const ANIMATION_MS = 260;

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Layer 1: a pannable, zoomable camera over arbitrary world-space children.
 * It knows nothing about what it shows; pass the content's world-space
 * box as `contentBounds` (used for the 20%-visible soft limit) and the
 * breathing room to leave around it when fitting as `fitPadding`.
 *
 * Drag anywhere (mouse, finger or pen) to pan, including drags that start
 * on a child button: the click is suppressed once the pointer moves more
 * than DRAG_THRESHOLD. Wheel zooms at the cursor, pinch zooms at the
 * fingers' midpoint, arrows and +/- work while the viewport has focus.
 */
export default function Whiteboard({
  contentBounds,
  cameraKey = 'default',
  initialFocus = null,
  focusPoint = null,
  minZoom = 0.35,
  maxZoom = 1.8,
  readableZoom = 0.6,
  fitPadding = 48,
  controls = false,
  overlay = null,
  onBackgroundClick,
  children,
}) {
  const viewportRef = useRef(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Value-memoised so a parent re-render with equal numbers doesn't re-run
  // the camera's open/resize logic.
  const { minX, minY, maxX, maxY } = contentBounds;
  const bounds = useMemo(() => ({ minX, minY, maxX, maxY }), [minX, minY, maxX, maxY]);
  const focusX = initialFocus?.x;
  const focusY = initialFocus?.y;
  const focus = useMemo(
    () => (focusX == null || focusY == null ? null : { x: focusX, y: focusY }),
    [focusX, focusY],
  );

  const cam = useCamera({
    cameraKey,
    contentBounds: bounds,
    viewport,
    minZoom,
    maxZoom,
    readableZoom,
    initialFocus: focus,
    fitPadding,
  });

  /* ── viewport size ───────────────────────────────────────────────── */

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const measure = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setViewport((v) => (v.width === width && v.height === height ? v : { width, height }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ── pointer pan / pinch ─────────────────────────────────────────── */

  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const suppressClick = useRef(false);

  const localPoint = (clientX, clientY) => {
    const rect = viewportRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    gesture.current = {
      type: 'pinch',
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      camera: cam.cameraRef.current,
    };
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      // A mouse has one pointer; drop any press whose release we missed
      // (released outside the viewport before the drag started).
      pointers.current.clear();
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    suppressClick.current = false;

    if (pointers.current.size === 1) {
      gesture.current = {
        type: 'pending',
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        camera: cam.cameraRef.current,
      };
    } else if (pointers.current.size === 2) {
      startPinch();
      suppressClick.current = true;
      setIsDragging(true);
    }
  };

  const handlePointerMove = (e) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;

    if (g.type === 'pinch' && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const factor = Math.hypot(a.x - b.x, a.y - b.y) / g.distance;
      const anchor = localPoint((a.x + b.x) / 2, (a.y + b.y) / 2);
      cam.setCamera(() => zoomAt(g.camera, factor, anchor, { minZoom, maxZoom }));
      return;
    }

    if (e.pointerId !== g.pointerId) return;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;

    if (g.type === 'pending') {
      if (Math.hypot(dx, dy) <= DRAG_THRESHOLD) return;
      g.type = 'pan';
      suppressClick.current = true;
      setIsDragging(true);
      // Capture only once it's a real drag, so a plain click still reaches
      // the button under the pointer.
      viewportRef.current?.setPointerCapture?.(e.pointerId);
    }

    if (g.type === 'pan') {
      cam.setCamera(() => ({ ...g.camera, x: g.camera.x + dx, y: g.camera.y + dy }));
    }
  };

  const handlePointerEnd = (e) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (viewportRef.current?.hasPointerCapture?.(e.pointerId)) {
      viewportRef.current.releasePointerCapture(e.pointerId);
    }

    if (pointers.current.size === 1) {
      // Pinch → pan with the remaining finger, without a jump.
      const [[pointerId, p]] = [...pointers.current.entries()];
      gesture.current = { type: 'pan', pointerId, startX: p.x, startY: p.y, camera: cam.cameraRef.current };
    } else if (pointers.current.size === 0) {
      gesture.current = null;
      setIsDragging(false);
    }
  };

  const handleClickCapture = (e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleClick = (e) => {
    if (!onBackgroundClick) return;
    if (e.target.closest?.('button, a, input, [data-wb-interactive]')) return;
    onBackgroundClick(e);
  };

  /* ── wheel (non-passive so we can preventDefault) ────────────────── */

  const { zoomAtPoint } = cam;
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (e.ctrlKey) return; // browser zoom
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAtPoint(Math.exp(-delta * 0.0015), { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  /* ── browser scrolling (focus / scrollIntoView) ──────────────────── */

  // The viewport is overflow:hidden, but the browser still scrolls it to
  // reveal a focused child (e.g. tabbing to a node). Turn that scroll into
  // a camera pan so the overlays stay put and the camera stays the truth.
  const handleScroll = (e) => {
    const el = e.currentTarget;
    const { scrollLeft, scrollTop } = el;
    if (!scrollLeft && !scrollTop) return;
    el.scrollLeft = 0;
    el.scrollTop = 0;
    cam.panBy(-scrollLeft, -scrollTop);
  };

  /* ── keyboard ────────────────────────────────────────────────────── */

  const handleKeyDown = (e) => {
    const pan = {
      ArrowLeft: [KEY_PAN_STEP, 0],
      ArrowRight: [-KEY_PAN_STEP, 0],
      ArrowUp: [0, KEY_PAN_STEP],
      ArrowDown: [0, -KEY_PAN_STEP],
    }[e.key];
    if (pan) {
      e.preventDefault();
      cam.panBy(pan[0], pan[1]);
    } else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      cam.zoomBy(BUTTON_ZOOM);
    } else if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      cam.zoomBy(1 / BUTTON_ZOOM);
    }
  };

  /* ── animated buttons ────────────────────────────────────────────── */

  const animationTimer = useRef(null);
  useEffect(() => () => clearTimeout(animationTimer.current), []);

  const animated = (action) => () => {
    if (!prefersReducedMotion()) {
      setIsAnimating(true);
      clearTimeout(animationTimer.current);
      animationTimer.current = setTimeout(() => setIsAnimating(false), ANIMATION_MS);
    }
    action();
  };

  const stop = (e) => e.stopPropagation();
  const camera = cam.camera;

  return (
    <div
      ref={viewportRef}
      className={`wb-viewport ${isDragging ? 'is-dragging' : ''}`}
      tabIndex={0}
      role="application"
      aria-label="Board. Drag to pan, scroll or pinch to zoom, arrow keys to pan, plus and minus to zoom."
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onClickCapture={handleClickCapture}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
    >
      {camera && (
        <div
          className={`wb-content ${isAnimating ? 'is-animating' : ''}`}
          style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}
        >
          {children}
        </div>
      )}

      {overlay}

      {controls && (
        <div className="wb-controls" onPointerDown={stop} onClick={stop}>
          <button type="button" onClick={() => cam.zoomBy(BUTTON_ZOOM)} aria-label="Zoom in" title="Zoom in">
            +
          </button>
          <button type="button" onClick={() => cam.zoomBy(1 / BUTTON_ZOOM)} aria-label="Zoom out" title="Zoom out">
            −
          </button>
          <button type="button" onClick={animated(cam.fit)} aria-label="Fit to view" title="Fit to view">
            ⤢
          </button>
          <button
            type="button"
            onClick={animated(() => cam.centerOn(focusPoint))}
            disabled={!focusPoint}
            aria-label="Center on selection"
            title="Center on selection"
          >
            ◎
          </button>
        </div>
      )}
    </div>
  );
}
