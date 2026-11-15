// Physics benchmark for CircleBoard.updatePhysics.
//
//   node bench/physics.bench.mjs [--src <dir containing circleboard/>] [--frames N]
//                                [--only name,name] [--fusion] [--json]
//                                [--grid cellsPerSide|auto] [--max-substeps N] [--warmup N] [--seed s]
//
// Builds boards of seeded circles/squares/triangles at several densities and
// runs whole frames the way Server.js does (2-8 substeps once there are 25+
// shapes). Reports ms/frame, collisions/frame and a hash of the final state so
// two versions of the physics can be checked for identical results.
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import seedrandom from 'seedrandom';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(`--${name}`);

const srcDir = path.resolve(opt('src', path.join(import.meta.dirname, '..', 'src')));
const FRAMES = Number(opt('frames', 120));
const WARMUP = Number(opt('warmup', 30));
const only = opt('only', null)?.split(',');

const { default: CircleBoard } = await import(pathToFileURL(path.join(srcDir, 'circleboard', 'CircleBoard.js')).href);
const { default: Circle } = await import(pathToFileURL(path.join(srcDir, 'circleboard', 'circle.js')).href);
const { default: Square } = await import(pathToFileURL(path.join(srcDir, 'circleboard', 'square.js')).href);
const { default: Triangle } = await import(pathToFileURL(path.join(srcDir, 'circleboard', 'triangle.js')).href);

const SCALE = 1.0667;
const CONTAINER = { x: 400, y: 400, radius: 375, thickness: 5 };
const ARENA_AREA = Math.PI * (CONTAINER.radius - CONTAINER.thickness) ** 2;

function makeBoard(seed) {
    const board = new CircleBoard({ getContext: () => ({}) });
    board.container = { ...CONTAINER };
    board.scaleFactor = SCALE;
    board.rng = seedrandom(seed);
    board.fusionRng = seedrandom(`${seed}-fusion`);
    board.lightningRng = seedrandom(`${seed}-lightning`);
    const grid = opt('grid', null);
    if (grid) board.gridSize = grid === 'auto' ? null : Number(grid);
    return board;
}

const areaOf = (s) => (s instanceof Circle ? Math.PI * s.radius ** 2
    : s instanceof Square ? s.side ** 2 : (Math.sqrt(3) / 4) * s.side ** 2);

/**
 * Seeded shapes. `big` is the share of shapes made fused-size (base size
 * 20-60), which span several grid cells. Stops at `count` shapes or when the
 * total shape area reaches `fill` of the arena.
 */
function populate(board, { count = Infinity, fill = Infinity, big = 0, seed }) {
    const rng = seedrandom(`${seed}-shapes`);
    const r = CONTAINER.radius - CONTAINER.thickness;
    let area = 0;
    let n = 0;
    while (n < count && area < fill * ARENA_AREA) {
        const kind = Math.floor(rng() * 3);
        const isBig = rng() < big;
        const base = isBig ? 20 + rng() * 40 : 5 + rng() * 10;
        const speed = 5 + rng() * 10;
        const dir = rng() * Math.PI * 2;
        const dist = Math.sqrt(rng()) * (r - base * SCALE * 1.2);
        const x = CONTAINER.x + Math.cos(dir) * dist;
        const y = CONTAINER.y + Math.sin(dir) * dist;
        const va = rng() * Math.PI * 2;
        const vx = Math.cos(va) * speed * 0.4;
        const vy = Math.sin(va) * speed * 0.4;
        const rot = rng() * 360;
        let shape;
        if (kind === 0) shape = Circle.create(x, y, base * SCALE, 'red', vx, vy, base);
        else if (kind === 1) shape = Square.create(x, y, base * SCALE, rot, 'red', vx, vy, base);
        else shape = Triangle.create(x, y, base * SCALE, rot, 'red', vx, vy, base);
        shape.id = board.counter++;
        board.shapes.push(shape);
        area += areaOf(shape);
        n++;
    }
    return area / ARENA_AREA;
}

// Same rule as Server.js; --max-substeps caps it (to see what fewer substeps would change).
const MAX_SUB = Number(opt('max-substeps', 8));
const subIntervalsFor = (n) => (n < 25 ? 1 : Math.min(MAX_SUB, 8, Math.max(2, Math.ceil(n / 75))));

function frame(board) {
    const sub = subIntervalsFor(board.shapes.length);
    const mult = { circle: 1 / sub, square: 1 / sub, triangle: 1 / sub };
    let collisions = 0, wall = 0, maxImpact = 0, fusions = 0, strikes = 0;
    for (let i = 0; i < sub; i++) {
        const stats = board.updatePhysics(mult, { substeps: sub });
        collisions += stats.total.totalShapeCollisions;
        wall += stats.total.totalWallHits;
        maxImpact = Math.max(maxImpact, stats.total.maxImpactSpeed);
        fusions += stats.total.fusions ?? 0;
        strikes += stats.total.lightningStrikes ?? 0;
    }
    return { collisions, wall, maxImpact, sub, fusions, strikes };
}

function stateHash(board) {
    // Order-independent-ish but precise: FNV over every shape's numbers.
    let h = 2166136261 >>> 0;
    const buf = new Float64Array(1);
    const bytes = new Uint8Array(buf.buffer);
    for (const s of board.shapes) {
        for (const v of [s.id, s.center.x, s.center.y, s.velocity.x, s.velocity.y]) {
            buf[0] = v;
            for (const b of bytes) h = Math.imul(h ^ b, 16777619) >>> 0;
        }
    }
    return h.toString(16).padStart(8, '0');
}

const SCENARIOS = [
    { name: 'n200', count: 200 },
    { name: 'n500', count: 500 },
    { name: 'n1000', count: 1000 },
    { name: 'n2000', count: 2000 },
    { name: 'packed70', fill: 0.7 },
    { name: 'packedBig', fill: 0.7, big: 0.1 },
];

const results = [];
for (const sc of SCENARIOS) {
    if (only && !only.includes(sc.name)) continue;
    const seed = `${sc.name}${opt('seed', '')}`;
    const board = makeBoard(seed);
    if (flag('fusion')) board.setSkillEffects({ fusionChance: 0.02, lightningChance: 0.01, lightningChainChance: 0.3 });
    const fill = populate(board, { ...sc, seed });
    for (let i = 0; i < WARMUP; i++) frame(board);
    let collisions = 0, wall = 0, maxImpact = 0, sub = 0, fusions = 0, strikes = 0;
    const times = [];
    for (let i = 0; i < FRAMES; i++) {
        const t0 = performance.now();
        const f = frame(board);
        times.push(performance.now() - t0);
        collisions += f.collisions; wall += f.wall; sub = f.sub; fusions += f.fusions; strikes += f.strikes;
        maxImpact = Math.max(maxImpact, f.maxImpact);
    }
    times.sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    const median = times[Math.floor(times.length / 2)];
    const r = Math.hypot;
    const outside = board.shapes.filter((s) => r(s.center.x - 400, s.center.y - 400) > CONTAINER.radius).length;
    const row = {
        name: sc.name, shapes: board.shapes.length, fill: +fill.toFixed(2), substeps: sub,
        msMean: +mean.toFixed(2), msMedian: +median.toFixed(2),
        collPerFrame: +(collisions / FRAMES).toFixed(1), wallPerFrame: +(wall / FRAMES).toFixed(1),
        maxImpact: +maxImpact.toFixed(3), fusions, strikes, outside, hash: stateHash(board),
    };
    results.push(row);
    if (!flag('json')) console.log(JSON.stringify(row));
}
if (flag('json')) console.log(JSON.stringify(results));
