import { boundsOf, geometryOf } from './collisionGeometry.js';

/** Cells per side are kept between these. */
export const GRID_LIMITS = { min: 6, max: 64 };

/**
 * Cells per side for a region `width` wide, given the shapes' average
 * bounding radius: cells about 3x that radius (1.5 shape widths), so a
 * crowded cell holds a handful of shapes. Big shapes simply cover several cells.
 */
export function gridSizeFor(meanRadius, width) {
    const size = Math.floor(width / (3 * meanRadius));
    if (!(size >= GRID_LIMITS.min)) return GRID_LIMITS.min;
    return Math.min(GRID_LIMITS.max, size);
}

/**
 * Uniform broad-phase grid over a square region, reused between steps.
 *
 *   grid.build(shapes, { x, y, width, height }, size?, beforePlace?)
 *   for each cell c: items[start[c] .. start[c + 1]) are shape indexes, in
 *   the same order as `shapes`.
 *   grid.ownerCell(a, b) -> the first cell (lowest index) both shapes are in.
 *   grid.radius[i] -> shape i's bounding-circle radius (for a cheap reject).
 *
 * A pair that shares several cells is handled only in its owner cell, which
 * is exactly the first cell it would be found in when walking cells in index
 * order, so no "already seen" set is needed.
 *
 * Shapes are placed by their axis-aligned bounds, clamped to the region: a
 * shape poking out of it lands in the edge cells; one entirely outside it, or
 * with no valid bounds (NaN), is in no cell and never paired. A shape bigger
 * than a cell is placed in every cell it covers.
 */
export class SpatialGrid {
    constructor() {
        this.size = 0;
        this.n = 0;
        this.minX = new Int32Array(0);
        this.minY = new Int32Array(0);
        this.maxX = new Int32Array(0);
        this.maxY = new Int32Array(0);
        this.radius = new Float64Array(0);
        this.start = new Int32Array(0);
        this.fill = new Int32Array(0);
        this.items = new Int32Array(0);
        this.box = new Float64Array(4);
    }

    /**
     * Cell range of every shape, then a counting sort into `items`.
     * `beforePlace(shape, i)` runs just before shape i is measured (the board
     * pushes shapes back inside the arena there). Without a `size`, it is
     * picked from the shapes' sizes (gridSizeFor).
     */
    build(shapes, bounds, size = null, beforePlace = null) {
        const n = shapes.length;
        if (this.minX.length < n) {
            const cap = Math.max(n, this.minX.length * 2, 64);
            this.minX = new Int32Array(cap);
            this.minY = new Int32Array(cap);
            this.maxX = new Int32Array(cap);
            this.maxY = new Int32Array(cap);
            this.radius = new Float64Array(cap);
        }
        const radius = this.radius;
        let radiusSum = 0;
        for (let i = 0; i < n; i++) {
            const r = geometryOf(shapes[i]).R;
            radius[i] = r;
            radiusSum += r;
        }
        if (size == null) size = n ? gridSizeFor(radiusSum / n, bounds.width) : GRID_LIMITS.min;
        const cellCount = size * size;
        if (this.start.length < cellCount + 1) {
            this.start = new Int32Array(cellCount + 1);
            this.fill = new Int32Array(cellCount + 1);
        }
        this.size = size;
        this.n = n;
        const start = this.start;
        start.fill(0, 0, cellCount + 1);

        const bx = bounds.x, by = bounds.y;
        const bx1 = bounds.x + bounds.width, by1 = bounds.y + bounds.height;
        const cellW = bounds.width / size, cellH = bounds.height / size;
        const box = this.box;
        let total = 0;

        for (let i = 0; i < n; i++) {
            const shape = shapes[i];
            if (beforePlace) beforePlace(shape, i);
            boundsOf(shape, box);
            const startX = Math.max(bx, box[0]);
            const endX = Math.min(bx1, box[2]);
            const startY = Math.max(by, box[1]);
            const endY = Math.min(by1, box[3]);
            const sx = Math.max(0, Math.floor((startX - bx) / cellW));
            const ex = Math.min(size - 1, Math.floor((endX - bx) / cellW));
            const sy = Math.max(0, Math.floor((startY - by) / cellH));
            const ey = Math.min(size - 1, Math.floor((endY - by) / cellH));
            if (sx <= ex && sy <= ey) {
                this.minX[i] = sx; this.maxX[i] = ex;
                this.minY[i] = sy; this.maxY[i] = ey;
                for (let cy = sy; cy <= ey; cy++) {
                    for (let cx = sx; cx <= ex; cx++) start[cx + cy * size + 1]++;
                }
                total += (ex - sx + 1) * (ey - sy + 1);
            } else {
                // Not in any cell (e.g. NaN position): never paired.
                this.minX[i] = 1; this.maxX[i] = 0;
                this.minY[i] = 1; this.maxY[i] = 0;
            }
        }

        for (let c = 0; c < cellCount; c++) start[c + 1] += start[c];
        if (this.items.length < total) this.items = new Int32Array(Math.max(total, this.items.length * 2));
        const fill = this.fill;
        fill.set(start.subarray(0, cellCount));
        const items = this.items;
        for (let i = 0; i < n; i++) {
            const sx = this.minX[i], ex = this.maxX[i];
            const sy = this.minY[i], ey = this.maxY[i];
            for (let cy = sy; cy <= ey; cy++) {
                for (let cx = sx; cx <= ex; cx++) items[fill[cx + cy * size]++] = i;
            }
        }
        return this;
    }

    /** The first cell (lowest index) that shapes a and b are both in. */
    ownerCell(a, b) {
        const x = this.minX[a] > this.minX[b] ? this.minX[a] : this.minX[b];
        const y = this.minY[a] > this.minY[b] ? this.minY[a] : this.minY[b];
        return x + y * this.size;
    }
}
