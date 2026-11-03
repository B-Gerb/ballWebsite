/**
 * Pure camera math for the Whiteboard.
 *
 * A camera is `{ x, y, zoom }`: a world point `p` appears on screen at
 * `p * zoom + (x, y)`, measured from the viewport's top-left corner.
 * Bounds are world-space boxes `{ minX, minY, maxX, maxY }`; viewports are
 * `{ width, height }` in CSS pixels.
 */

export const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));

/** Clamp one axis so `minVisible` of the content (or the whole viewport) stays on screen. */
function clampAxis(offset, lo, hi, zoom, size, minVisible) {
  const extent = (hi - lo) * zoom;
  const required = Math.min(extent * minVisible, size);
  // Right/bottom edge must stay at least `required` into the viewport,
  // and the left/top edge at most `size - required`.
  const min = required - hi * zoom;
  const max = size - required - lo * zoom;
  return clamp(offset, min, max);
}

/**
 * Soft limits: the camera may move freely as long as at least `minVisible`
 * of the content box stays inside the viewport on each axis. A camera that
 * already satisfies that is returned unchanged (no auto-centring).
 */
export function clampCamera(cam, bounds, viewport, minVisible = 0.2) {
  const x = clampAxis(cam.x, bounds.minX, bounds.maxX, cam.zoom, viewport.width, minVisible);
  const y = clampAxis(cam.y, bounds.minY, bounds.maxY, cam.zoom, viewport.height, minVisible);
  if (x === cam.x && y === cam.y) return cam;
  return { x, y, zoom: cam.zoom };
}

/** Multiply the zoom by `factor`, keeping the screen point `anchor` fixed. */
export function zoomAt(cam, factor, anchor, { minZoom = 0.35, maxZoom = 1.8 } = {}) {
  const zoom = clamp(cam.zoom * factor, minZoom, maxZoom);
  const ratio = zoom / cam.zoom;
  return {
    zoom,
    x: anchor.x - (anchor.x - cam.x) * ratio,
    y: anchor.y - (anchor.y - cam.y) * ratio,
  };
}

/** Camera that puts world point `point` in the middle of the viewport. */
export function centerOn(point, viewport, zoom) {
  return {
    zoom,
    x: viewport.width / 2 - point.x * zoom,
    y: viewport.height / 2 - point.y * zoom,
  };
}

/**
 * Fit the content into the viewport, never magnifying past 1 and never
 * going below `readableZoom`. When the content does not fit at
 * `readableZoom`, centre on `focus` (or the content's centre) instead.
 */
export function fitToBounds(
  bounds,
  viewport,
  { minZoom = 0.35, maxZoom = 1.8, readableZoom = minZoom, focus = null, padding = 0 } = {},
) {
  const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
  const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
  const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
  const fit = Math.min(viewport.width / width, viewport.height / height, 1, maxZoom);
  const floor = Math.max(minZoom, readableZoom);

  if (fit >= floor) return centerOn(center, viewport, fit);
  return centerOn(focus ?? center, viewport, floor);
}
