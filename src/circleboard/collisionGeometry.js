/**
 * Cached collision geometry for the physics hot path.
 *
 *   geometryOf(shape) -> { kind, R, verts, axes, nAxes }
 *
 * - kind: 0 circle, 1 square, 2 triangle.
 * - R: bounding-circle radius around shape.center (a shape never reaches
 *   further than this from its centre).
 * - verts: Float64Array [x0, y0, x1, y1, ...] in world space (polygons).
 * - axes: Float64Array [x0, y0, ...] SAT axes (polygons), nAxes of them.
 *
 * Every number is computed with exactly the same arithmetic, in the same
 * order, as the shape classes' getVertices() / axes(), so collisions come out
 * bit-for-bit the same as before; they are just not recomputed for every pair.
 * The parts that only depend on size and rotation are kept until those
 * change; the world-space parts are kept until the centre moves.
 */
const KIND = { Circle: 0, Square: 1, Triangle: 2 };

function staticPart(shape) {
    const kind = KIND[shape.getName()];
    const g = {
        kind, side: shape.side, rotation: shape.rotation, radius: shape.radius,
        R: 0, offsets: null, verts: null, axes: null, nAxes: 0, cx: NaN, cy: NaN,
    };
    if (kind === 0) {
        g.R = shape.radius;
    } else if (kind === 1) {
        const halfSide = shape.side / 2;
        const radians = (shape.rotation * Math.PI) / 180;
        // Same products Square.getVertices uses: halfSide * cos / sin.
        g.offsets = new Float64Array([halfSide * Math.cos(radians), halfSide * Math.sin(radians)]);
        g.verts = new Float64Array(8);
        g.axes = new Float64Array([
            Math.cos(radians), Math.sin(radians),
            Math.cos(radians + Math.PI / 2), Math.sin(radians + Math.PI / 2),
            Math.cos(radians + Math.PI), Math.sin(radians + Math.PI),
            Math.cos(radians + (3 * Math.PI) / 2), Math.sin(radians + (3 * Math.PI) / 2),
        ]);
        g.nAxes = 4;
        g.R = Math.abs(halfSide) * Math.SQRT2;
    } else if (kind === 2) {
        const radius = shape.side / Math.sqrt(3);
        const radians = (shape.rotation * Math.PI) / 180;
        g.offsets = new Float64Array(6);
        for (let index = 0; index < 3; index++) {
            const angle = radians - Math.PI / 2 + (index * 2 * Math.PI) / 3;
            g.offsets[index * 2] = radius * Math.cos(angle);
            g.offsets[index * 2 + 1] = radius * Math.sin(angle);
        }
        g.verts = new Float64Array(6);
        g.axes = new Float64Array(6);
        g.nAxes = 3;
        g.R = Math.abs(radius);
    }
    return g;
}

function refreshWorld(shape, g) {
    const cx = shape.center.x;
    const cy = shape.center.y;
    if (cx === g.cx && cy === g.cy) return;
    g.cx = cx;
    g.cy = cy;
    const o = g.offsets;
    const v = g.verts;
    if (g.kind === 1) {
        const hc = o[0], hs = o[1];
        v[0] = cx - hc - hs; v[1] = cy - hs + hc;
        v[2] = cx + hc - hs; v[3] = cy + hs + hc;
        v[4] = cx + hc + hs; v[5] = cy + hs - hc;
        v[6] = cx - hc + hs; v[7] = cy - hs - hc;
    } else {
        for (let i = 0; i < 6; i += 2) {
            v[i] = cx + o[i];
            v[i + 1] = cy + o[i + 1];
        }
        // Triangle.axes(): edge normals from the world-space vertices.
        const a = g.axes;
        for (let i = 0; i < 3; i++) {
            const n = (i + 1) % 3;
            const dx = v[n * 2] - v[i * 2];
            const dy = v[n * 2 + 1] - v[i * 2 + 1];
            const length = Math.hypot(dx, dy) || 1;
            a[i * 2] = -dy / length;
            a[i * 2 + 1] = dx / length;
        }
    }
}

export function geometryOf(shape) {
    let g = shape._geometry;
    if (!g || g.side !== shape.side || g.rotation !== shape.rotation || g.radius !== shape.radius) {
        g = staticPart(shape);
        Object.defineProperty(shape, '_geometry', { value: g, writable: true, configurable: true, enumerable: false });
    }
    if (g.kind !== 0) refreshWorld(shape, g);
    return g;
}

/** Axis-aligned bounds of a shape: [minX, minY, maxX, maxY] written into `out`. */
export function boundsOf(shape, out) {
    const g = geometryOf(shape);
    if (g.kind === 0) {
        const r = shape.radius;
        out[0] = shape.center.x - r; out[1] = shape.center.y - r;
        out[2] = shape.center.x + r; out[3] = shape.center.y + r;
        return out;
    }
    const v = g.verts;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < v.length; i += 2) {
        minX = Math.min(minX, v[i]); maxX = Math.max(maxX, v[i]);
        minY = Math.min(minY, v[i + 1]); maxY = Math.max(maxY, v[i + 1]);
    }
    out[0] = minX; out[1] = minY; out[2] = maxX; out[3] = maxY;
    return out;
}
