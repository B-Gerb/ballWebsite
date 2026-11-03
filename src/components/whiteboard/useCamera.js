import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { centerOn, clampCamera, fitToBounds, zoomAt } from './camera.js';

/**
 * Session-only camera memory, keyed by `cameraKey`. Deliberately not
 * persisted to localStorage: a fresh page load starts with a fresh fit.
 */
const savedCameras = new Map();

const sameCamera = (a, b) => a && b && a.x === b.x && a.y === b.y && a.zoom === b.zoom;

/**
 * Camera state for one board. Owns the open rules (restore → fit at a
 * readable zoom → centre on focus), re-clamping on resize, and the session
 * memory. All math is delegated to the pure functions in `camera.js`.
 */
export default function useCamera({
  cameraKey,
  contentBounds,
  viewport,
  minZoom,
  maxZoom,
  readableZoom,
  initialFocus,
  fitPadding = 0,
}) {
  const [camera, setCameraState] = useState(() => savedCameras.get(cameraKey)?.camera ?? null);
  const cameraRef = useRef(camera);
  const userMovedRef = useRef(savedCameras.get(cameraKey)?.userMoved ?? false);

  const hasViewport = viewport.width > 0 && viewport.height > 0;

  const commit = useCallback(
    (next, { userMoved } = {}) => {
      if (userMoved !== undefined) userMovedRef.current = userMoved;
      if (!sameCamera(next, cameraRef.current)) {
        cameraRef.current = next;
        setCameraState(next);
      }
      savedCameras.set(cameraKey, { camera: cameraRef.current, userMoved: userMovedRef.current });
    },
    [cameraKey],
  );

  const clampToContent = useCallback(
    (cam) => clampCamera(cam, contentBounds, viewport),
    [contentBounds, viewport],
  );

  const fitCamera = useCallback(
    (readable) =>
      clampToContent(
        fitToBounds(contentBounds, viewport, {
          minZoom,
          maxZoom,
          readableZoom: readable,
          focus: initialFocus,
          padding: fitPadding,
        }),
      ),
    [clampToContent, contentBounds, viewport, minZoom, maxZoom, initialFocus, fitPadding],
  );

  // Open rules + resize/content changes. Runs before paint so the board
  // never flashes at the wrong position.
  useLayoutEffect(() => {
    if (!hasViewport) return;
    const current = cameraRef.current;
    if (current && userMovedRef.current) {
      commit(clampToContent(current));
    } else {
      commit(fitCamera(readableZoom));
    }
  }, [hasViewport, clampToContent, fitCamera, readableZoom, commit]);

  /** Programmatic or user camera change; always clamped. */
  const setCamera = useCallback(
    (updater) => {
      const prev = cameraRef.current;
      if (!prev) return;
      const next = typeof updater === 'function' ? updater(prev) : updater;
      commit(clampToContent(next), { userMoved: true });
    },
    [clampToContent, commit],
  );

  const panBy = useCallback(
    (dx, dy) => setCamera((c) => ({ ...c, x: c.x + dx, y: c.y + dy })),
    [setCamera],
  );

  const zoomAtPoint = useCallback(
    (factor, anchor) => setCamera((c) => zoomAt(c, factor, anchor, { minZoom, maxZoom })),
    [setCamera, minZoom, maxZoom],
  );

  const zoomBy = useCallback(
    (factor) => zoomAtPoint(factor, { x: viewport.width / 2, y: viewport.height / 2 }),
    [zoomAtPoint, viewport.width, viewport.height],
  );

  /** "Fit" button: show everything (down to minZoom) and resume auto-fitting. */
  const fit = useCallback(() => {
    if (!hasViewport) return;
    commit(fitCamera(minZoom), { userMoved: false });
  }, [hasViewport, commit, fitCamera, minZoom]);

  const centerOnPoint = useCallback(
    (point) => {
      if (!point) return;
      setCamera((c) => centerOn(point, viewport, Math.max(c.zoom, readableZoom)));
    },
    [setCamera, viewport, readableZoom],
  );

  return { camera, cameraRef, setCamera, panBy, zoomBy, zoomAtPoint, fit, centerOn: centerOnPoint };
}
