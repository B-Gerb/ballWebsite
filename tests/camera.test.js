import assert from 'node:assert/strict';
import test from 'node:test';
import { clampCamera, fitToBounds, zoomAt } from '../src/components/whiteboard/camera.js';

const bounds = { minX: 0, minY: 0, maxX: 400, maxY: 300 };
const viewport = { width: 800, height: 600 };

/** Fraction of the content box visible on one axis. */
const visibleFraction = (cam, axis) => {
  const [lo, hi, size] = axis === 'x'
    ? [bounds.minX, bounds.maxX, viewport.width]
    : [bounds.minY, bounds.maxY, viewport.height];
  const offset = axis === 'x' ? cam.x : cam.y;
  const start = lo * cam.zoom + offset;
  const end = hi * cam.zoom + offset;
  const overlap = Math.min(end, size) - Math.max(start, 0);
  return { overlap, extent: end - start, size };
};

test('clampCamera leaves a camera that is already within limits untouched', () => {
  const cam = { x: 37, y: -12, zoom: 1 };
  assert.deepEqual(clampCamera(cam, bounds, viewport), cam);
});

test('clampCamera keeps at least 20% of the content visible at several zoom levels', () => {
  for (const zoom of [0.35, 0.6, 1, 1.8, 4]) {
    for (const [x, y] of [[-1e6, 0], [1e6, 0], [0, -1e6], [0, 1e6], [1e6, 1e6]]) {
      const clamped = clampCamera({ x, y, zoom }, bounds, viewport);
      for (const axis of ['x', 'y']) {
        const { overlap, extent, size } = visibleFraction(clamped, axis);
        const required = Math.min(extent * 0.2, size);
        assert.ok(
          overlap >= required - 1e-6,
          `zoom ${zoom} start (${x},${y}) axis ${axis}: ${overlap} < ${required}`,
        );
      }
    }
  }
});

test('clampCamera allows the content to be dragged well past the viewport centre', () => {
  // The old behaviour force-centred small content; now it must move freely.
  const moved = clampCamera({ x: 600, y: 400, zoom: 1 }, bounds, viewport);
  assert.equal(moved.x, 600);
  assert.equal(moved.y, 400);
});

test('zoomAt keeps the anchor point fixed on screen', () => {
  const cam = { x: 120, y: -40, zoom: 0.8 };
  const anchor = { x: 300, y: 250 };
  const worldBefore = { x: (anchor.x - cam.x) / cam.zoom, y: (anchor.y - cam.y) / cam.zoom };

  const next = zoomAt(cam, 1.5, anchor, { minZoom: 0.35, maxZoom: 1.8 });
  assert.ok(Math.abs(next.zoom - 1.2) < 1e-9);
  assert.ok(Math.abs(worldBefore.x * next.zoom + next.x - anchor.x) < 1e-9);
  assert.ok(Math.abs(worldBefore.y * next.zoom + next.y - anchor.y) < 1e-9);
});

test('zoomAt clamps to the zoom limits', () => {
  const cam = { x: 0, y: 0, zoom: 1 };
  assert.equal(zoomAt(cam, 10, { x: 0, y: 0 }, { minZoom: 0.35, maxZoom: 1.8 }).zoom, 1.8);
  assert.equal(zoomAt(cam, 0.01, { x: 0, y: 0 }, { minZoom: 0.35, maxZoom: 1.8 }).zoom, 0.35);
});

test('fitToBounds centres small content without magnifying past 1', () => {
  const cam = fitToBounds(bounds, viewport, { minZoom: 0.35, maxZoom: 1.8, readableZoom: 0.6 });
  assert.equal(cam.zoom, 1);
  // 400x300 box centred in 800x600 → top-left at (200,150)
  assert.equal(cam.x, 200);
  assert.equal(cam.y, 150);
});

test('fitToBounds never goes below readableZoom and falls back to the focus point', () => {
  const huge = { minX: 0, minY: 0, maxX: 5000, maxY: 4000 };
  const focus = { x: 2500, y: 100 };
  const cam = fitToBounds(huge, viewport, {
    minZoom: 0.35, maxZoom: 1.8, readableZoom: 0.6, focus,
  });
  assert.equal(cam.zoom, 0.6);
  assert.equal(focus.x * cam.zoom + cam.x, viewport.width / 2);
  assert.equal(focus.y * cam.zoom + cam.y, viewport.height / 2);
});

test('fitToBounds without a focus centres the content at readableZoom', () => {
  const huge = { minX: 0, minY: 0, maxX: 5000, maxY: 4000 };
  const cam = fitToBounds(huge, viewport, { minZoom: 0.35, maxZoom: 1.8, readableZoom: 0.6 });
  assert.equal(cam.zoom, 0.6);
  assert.equal(2500 * 0.6 + cam.x, 400);
});

test('fitToBounds with readableZoom at minZoom shows the whole content', () => {
  const wide = { minX: 0, minY: 0, maxX: 1600, maxY: 300 };
  const cam = fitToBounds(wide, viewport, { minZoom: 0.35, maxZoom: 1.8, readableZoom: 0.35 });
  assert.equal(cam.zoom, 0.5);
});

test('fitToBounds leaves padding around the content', () => {
  const cam = fitToBounds({ minX: 0, minY: 0, maxX: 1400, maxY: 300 }, viewport, {
    minZoom: 0.1, readableZoom: 0.1, padding: 100,
  });
  assert.equal(cam.zoom, 0.5); // 800 / (1400 + 200)
  assert.equal(700 * cam.zoom + cam.x, 400);
});
