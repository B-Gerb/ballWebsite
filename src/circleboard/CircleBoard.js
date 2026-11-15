import seedrandom from 'seedrandom';
import Circle from './circle.js';
import Square from './square.js';
import Triangle from './triangle.js';
import CollisionResponse from './CollisionResponse.js';
import { SpatialGrid } from './spatialGrid.js';
import { applyMassBonus, fuseShapes } from './fusion.js';
import { SHAPE_TIERS } from '../data/skillTree.js';

/**
 * The board always simulates in a fixed logical coordinate space of
 * LOGICAL_SIZE x LOGICAL_SIZE units. CSS decides how big it looks; the
 * backing store is only multiplied by devicePixelRatio for sharpness.
 * Resizing the window therefore never changes physics, speeds or saves.
 */
export const LOGICAL_SIZE = 800;

/** Fusion limits, in base (unscaled) units per frame / size. */
export const FUSION_LIMITS = {
    maxSpeed: 30,
    maxBaseSize: { Circle: 60, Square: 100, Triangle: 110 },
};

/** What earns money for each shape: wall hits or shape-on-shape collisions. */
export const SCORES_ON = { Circle: 'wall', Square: 'collision', Triangle: 'collision' };

/** How long the black hole / supernova flash shows. */
export const COSMIC_FLASH_FRAMES = 60;

/** Chain lightning limits: strikes per bolt and how long a flash shows. */
export const LIGHTNING_LIMITS = { maxChain: 12, maxFlashes: 40, flashFrames: 14 };

class CircleBoard {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.logicalSize = LOGICAL_SIZE;
        
        this.baseContainerThickness = 5;


        
        // Properties
        this.shapeInfo = {
            'Circle': {
                baseMinBallSize: 5,
                baseMaxBallSize: 15,
                baseMinBallSpeed: 5,
                baseMaxBallSpeed: 15,
            },
            'Square': {
                baseMinSide: 5,
                baseMaxSide: 15,
                baseMinSpeed: 5,
                baseMaxSpeed: 15,
            },
            'Triangle': {
                baseMinSide: 5,
                baseMaxSide: 15,
                baseMinSpeed: 5,
                baseMaxSpeed: 15,
            }
        };
        this.counter = 0; // For unique shape IDs



        this.isRunning = true;
        this.rng = seedrandom();
        // Chance (0-1) that a same-type collision fuses the pair (Shape Fusion skill).
        // Rolled on its own RNG so fusion never shifts the seeded spawn sequence.
        this.fusionChance = 0;
        this.fusionRng = Math.random;
        // Other skill effects (see setSkillEffects). Lightning has its own RNG too.
        this.fusionPromoteChance = 0;
        this.fusionSpeedBonus = 0;
        this.fusionMassBonus = 0;
        this.lightningChance = 0;
        this.lightningChainChance = 0;
        this.lightningChargeBonus = 0;
        this.lightningRng = Math.random;
        this.lightningFlashes = [];
        this.cosmicFlash = null;
        
        // Collision tracking for time
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.wallHitsStack = [];
        this.ballCollisionsStack = [];
        this.totalShapeCollisions = 0;

        

        // Initialize priority queue
        this.counter = 0;
        
        // Scaled properties
        this.shapeInfoScaled = {
            Circle: {
                baseMinBallSize: 5,
                baseMaxBallSize: 15,
                baseMinBallSpeed: 5,
                baseMaxBallSpeed: 15,
            },
            Square: {
                baseMinSide: 5,
                baseMaxSide: 15,
                baseMinSpeed: 5,
                baseMaxSpeed: 15,
            },
            Triangle: {
                baseMinSide: 5,
                baseMaxSide: 15,
                baseMinSpeed: 5,
                baseMaxSpeed: 15,
            }
        };

        
        // Create container
        this.container = {
            x: 0,
            y: 0,
            radius: 0,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: this.baseContainerThickness
        };
        
        this.shapes = [];   

        // Collision grid cells per side. 6 resolves collisions in the same
        // order as always. null sizes cells from the shapes (about 13% faster
        // when crowded, but the different order gives ~4% more collisions on a
        // packed board), see bench/physics.bench.mjs --grid auto.
        this.gridSize = 6;
        
        // Scale factor based on screen size
        this.scaleFactor = 1;
        this.lastScaleFactor = 1;
        
        this.baseReferenceSize = 750; 
        

    }
    setSeed(seed){
        this.rng = seed;
    }

    /** Take the skill effects that act on the board (see skillTree EMPTY_EFFECTS). */
    setSkillEffects(effects = {}) {
        this.fusionChance = effects.fusionChance ?? 0;
        this.fusionPromoteChance = effects.fusionPromoteChance ?? 0;
        this.fusionSpeedBonus = effects.fusionSpeedBonus ?? 0;
        this.fusionMassBonus = effects.fusionMassBonus ?? 0;
        this.lightningChance = effects.lightningChance ?? 0;
        this.lightningChainChance = effects.lightningChainChance ?? 0;
        this.lightningChargeBonus = effects.lightningChargeBonus ?? 0;
    }
    
    // Calculate scale factor based on canvas size
    calculateScaleFactor() {
        // Store the previous scale factor
        this.lastScaleFactor = this.scaleFactor;
        
        this.scaleFactor = this.logicalSize / this.baseReferenceSize;
        
        for( const shape of Object.keys(this.shapeInfo)){
            for(const prop of Object.keys(this.shapeInfo[shape])){
                this.shapeInfoScaled[shape][prop] = this.shapeInfo[shape][prop] * this.scaleFactor;
                
            }
        }

    }
    
    // Initialize container
    initContainer() {
        const padding = 20 * this.scaleFactor;
        this.container = {
            x: this.logicalSize / 2,
            y: this.logicalSize / 2,
            radius: (this.logicalSize / 2) - padding,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: this.baseContainerThickness * this.scaleFactor
        };
    }
    
    // Shape creation
    addNewBalls(amount = 1) {
        for (let i = 0; i < amount; i++) {
            const ballA = this.createBall();
            this.shapes.push(ballA);
        }
    }
    
    createBall() {
        const radius = this.shapeInfo['Circle'].baseMinBallSize + (this.rng() * (this.shapeInfo['Circle'].baseMaxBallSize - this.shapeInfo['Circle'].baseMinBallSize));
        const speed = this.shapeInfo['Circle'].baseMinBallSpeed + (this.rng() * (this.shapeInfo['Circle'].baseMaxBallSpeed - this.shapeInfo['Circle'].baseMinBallSpeed));
           
        const angle = this.rng() * Math.PI * 2;
        const maxDistance = this.container.radius - radius - this.container.thickness - 5 * this.scaleFactor;
        const distance = this.rng() * (maxDistance * 0.9); // Use only 90% of available space
        const x = this.container.x + Math.cos(angle) * distance;
        const y = this.container.y + Math.sin(angle) * distance;
        const color = `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`

        
        const velocityAngle = this.rng() * Math.PI * 2;
        const velocityX = Math.cos(velocityAngle) * speed * (this.rng() - 0.5);
        const velocityY = Math.sin(velocityAngle) * speed * (this.rng() - 0.5);

        
        const ball = Circle.create(x, y, radius * this.scaleFactor, color, velocityX, velocityY, radius);
        

        // Ensure ball has minimum velocity
        const minSpeed = this.shapeInfo['Circle'].baseMinBallSpeed * this.scaleFactor;
        const currentSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        if (currentSpeed < minSpeed) {
            const factor = minSpeed / Math.max(currentSpeed, 0.0001);
            ball.velocity.x *= factor;
            ball.velocity.y *= factor;
        }
        ball.id = this.counter++;
            
        return ball;
    }

    addNewSquares(amount = 1) {
        for (let i = 0; i < amount; i++) {
            const squareA = this.createSquare();
            this.shapes.push(squareA);
        }
    }
    createSquare() {
        const side = this.shapeInfo['Square'].baseMinSide + (this.rng() * (this.shapeInfo['Square'].baseMaxSide - this.shapeInfo['Square'].baseMinSide));
        const speed = this.shapeInfo['Square'].baseMinSpeed + (this.rng() * (this.shapeInfo['Square'].baseMaxSpeed - this.shapeInfo['Square'].baseMinSpeed));
        const angle = this.rng() * Math.PI * 2;
        const maxDistance = this.container.radius - side - this.container.thickness - 5 * this.scaleFactor;
        const distance = this.rng() * (maxDistance * 0.9); // Use only 90% of available space
        const x = this.container.x + Math.cos(angle) * distance;
        const y = this.container.y + Math.sin(angle) * distance;
        const color = `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`
        const velocityAngle = this.rng() * Math.PI * 2;
        const velocityX = Math.cos(velocityAngle) * speed * (this.rng() - 0.5);
        const velocityY = Math.sin(velocityAngle) * speed * (this.rng() - 0.5);
        const rotation = this.rng() * 360;
        
        const square = Square.create(x, y, side*this.scaleFactor, rotation, color, velocityX, velocityY, side);

        // Ensure square has minimum velocity
        const minSpeed = this.shapeInfo['Square'].baseMinSpeed * this.scaleFactor;
        const currentSpeed = Math.sqrt(square.velocity.x * square.velocity.x + square.velocity.y * square.velocity.y);
        if (currentSpeed < minSpeed) {
            const factor = minSpeed / Math.max(currentSpeed, 0.0001);
            square.velocity.x *= factor;
            square.velocity.y *= factor;
        }

        square.id = this.counter++;
        return square;
    }

    addNewTriangles(amount = 1) {
        for (let i = 0; i < amount; i++) this.shapes.push(this.createTriangle());
    }

    createTriangle() {
        const info = this.shapeInfo.Triangle;
        const side = info.baseMinSide + this.rng() * (info.baseMaxSide - info.baseMinSide);
        const speed = info.baseMinSpeed + this.rng() * (info.baseMaxSpeed - info.baseMinSpeed);
        const angle = this.rng() * Math.PI * 2;
        const distance = this.rng() * Math.max(0, this.container.radius - side - this.container.thickness) * 0.9;
        const velocityAngle = this.rng() * Math.PI * 2;
        const triangle = Triangle.create(
            this.container.x + Math.cos(angle) * distance,
            this.container.y + Math.sin(angle) * distance,
            side * this.scaleFactor,
            this.rng() * 360,
            `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`,
            Math.cos(velocityAngle) * speed * (this.rng() - 0.5),
            Math.sin(velocityAngle) * speed * (this.rng() - 0.5),
            side,
        );
        triangle.id = this.counter++;
        return triangle;
    }

    
    // Reset collision counters and calculate rates
    resetCollisionCounters() {
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.wallHitsStack = [];
        this.ballCollisionsStack = [];
    }
    
    // Draw the container
    drawContainer() {
        // Draw a solid border first
        this.ctx.beginPath();
        this.ctx.arc(this.container.x, this.container.y, this.container.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.container.color;
        this.ctx.fill();
        this.ctx.strokeStyle = this.container.borderColor;
        this.ctx.lineWidth = this.container.thickness;
        this.ctx.stroke();
        this.ctx.closePath();
        
        // Draw a white interior to make it look like a ring
        this.ctx.beginPath();
        this.ctx.arc(this.container.x, this.container.y, this.container.radius - this.container.thickness, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fill();
        this.ctx.closePath();
    }
    
 
    /**
     * Process physics for one frame
     * Separated from animation to allow server to control updates
     * @param {Object} shop - Shop object for handling currency
     * @return {Object} Statistics for the current frame
     */
    updatePhysics(speedMultipliers = {}, { spawnSpeed = {}, spawnMass = 1, substeps = 1 } = {}) {
        if (!this.isRunning) return {total: { totalWallHits: 0, totalShapeCollisions: 0, maxImpactSpeed: 0 }};

        // Upgrades only affect shapes bought after them: a shape locks in its
        // own speed, permanent speed multiplier and mass scale the first frame it exists.
        const spawn = { spawnSpeed, spawnMass };
        for (const shape of this.shapes) this.lockInSpawnStats(shape, spawn);

        // How far a shape really moves per frame (speedMultipliers are per substep).
        const typeFrameSpeed = {};
        const frameSpeedOf = (shape) => {
            const name = shape.getName();
            const typeSpeed = typeFrameSpeed[name]
                ??= (speedMultipliers[name.toLowerCase()] || 1) * substeps;
            return typeSpeed * shape.speedMultiplier;
        };
        let maxImpactSpeed = 0;

        const returnValues = {total: { totalWallHits: 0, totalShapeCollisions: 0, fusions: 0, lightningStrikes: 0, maxImpactSpeed: 0 }};
        // Per-type counts (how many hits) and values (what they are worth:
        // a fused shape counts once but is worth all the shapes inside it).
        const statsFor = (name) => (returnValues[name] ??= {
            totalWallHits: 0, totalShapeCollisions: 0, wallHitValue: 0, collisionValue: 0,
        });
        const fusing = new Set();
        const fusions = [];
        // Shapes that just earned money and rolled a lightning strike.
        const lightningSources = [];
        const rollLightning = (shape) => {
            if (this.lightningChance > 0 && this.lightningRng() < this.lightningChance) {
                lightningSources.push(shape);
            }
        };
        
        // Track collisions for this frame
        let totalWallHits = 0;
        let totalShapeCollisions = 0;
        const shapes = this.shapes;
        const container = this.container;
        const bounds = {
            x: container.x - container.radius,
            y: container.y - container.radius,
            width: container.radius * 2,
            height: container.radius * 2,
        };
        // Wall bounces first, then place the shape in the grid.
        const grid = (this.spatialGrid ??= new SpatialGrid()).build(shapes, bounds, this.gridSize, (shape) => {
            if (CollisionResponse.handleContainerCollision(shape, container)) {
                totalWallHits++;
                const shapeStats = statsFor(shape.getName());
                shapeStats.totalWallHits += 1;
                shapeStats.wallHitValue += shape.value ?? 1;
                if (SCORES_ON[shape.getName()] === 'wall') rollLightning(shape);
            }
        });

        // Each pair is tested once, in the first cell both shapes are in.
        const scratchMTV = { normal: { x: 0, y: 0 }, magnitude: 0 };
        const { start, items, radius } = grid;
        const cellCount = grid.size * grid.size;
        for (let cell = 0; cell < cellCount; cell++) {
            const from = start[cell];
            const to = start[cell + 1];
            if (to - from < 2) continue; // No collisions possible in this cell
            for (let j = from; j < to - 1; j++) {
                const a = items[j];
                const shapeA = shapes[a];
                const centerA = shapeA.center;
                const radiusA = radius[a];
                for (let k = j + 1; k < to; k++) {
                    const b = items[k];
                    const shapeB = shapes[b];
                    // Bounding circles apart: cannot touch (findMTV does the same check).
                    const dx = shapeB.center.x - centerA.x;
                    const dy = shapeB.center.y - centerA.y;
                    const reach = (radiusA + radius[b]) * (1 + 1e-9) + 1e-9;
                    if (dx * dx + dy * dy > reach * reach) continue;
                    if (grid.ownerCell(a, b) !== cell) continue; // tested in an earlier cell
                    if(shapeA.id === shapeB.id) continue; // Skip self-collision
                    if (fusing.size && (fusing.has(shapeA) || fusing.has(shapeB))) continue; // already merged this frame
                    const mtv = CollisionResponse.findMTV(shapeA, shapeB, scratchMTV);
                    if (!mtv) continue;

                    // Relative speed before the bounce (for supernovas).
                    const kA = frameSpeedOf(shapeA);
                    const kB = frameSpeedOf(shapeB);
                    const impactSpeed = Math.hypot(
                        shapeA.velocity.x * kA - shapeB.velocity.x * kB,
                        shapeA.velocity.y * kA - shapeB.velocity.y * kB,
                    );
                    CollisionResponse.applyCollision(shapeA, shapeB, mtv.normal, 1.0);
                    CollisionResponse.separateShapes(shapeA, shapeB, mtv);

                    if (impactSpeed > maxImpactSpeed) maxImpactSpeed = impactSpeed;
                    totalShapeCollisions++;
                    this.totalShapeCollisions++;
                    const statsA = statsFor(shapeA.getName());
                    statsA.totalShapeCollisions += 1;
                    statsA.collisionValue += shapeA.value ?? 1;
                    const statsB = statsFor(shapeB.getName());
                    statsB.totalShapeCollisions += 1;
                    statsB.collisionValue += shapeB.value ?? 1;
                    if (SCORES_ON[shapeA.getName()] === 'collision') rollLightning(shapeA);
                    if (SCORES_ON[shapeB.getName()] === 'collision') rollLightning(shapeB);

                    if (this.fusionChance > 0
                        && shapeA.getName() === shapeB.getName()
                        && !fusing.has(shapeA) && !fusing.has(shapeB)
                        && this.fusionRng() < this.fusionChance) {
                        const fused = this.fuse(shapeA, shapeB);
                        if (fused) {
                            fusing.add(shapeA);
                            fusing.add(shapeB);
                            fusions.push(fused);
                            break; // shapeA is gone: its other pairs are skipped anyway
                        }
                    }
                }
            }
        }

        if (fusions.length) {
            this.shapes = this.shapes.filter(shape => !fusing.has(shape));
            this.shapes.push(...fusions);
        }

        if (lightningSources.length) {
            returnValues.total.lightningStrikes = this.strikeLightning(lightningSources, statsFor);
        }

        this.shapes.forEach(shape => {
            this.lockInSpawnStats(shape, spawn);
            // Collisions only change direction: speed never leaks between shapes.
            this.restoreOwnSpeed(shape);
            const multiplier = (speedMultipliers[shape.getName().toLowerCase()] || 1) * shape.speedMultiplier;
            shape.update(multiplier);
        });
        returnValues.total.totalWallHits = totalWallHits;
        returnValues.total.totalShapeCollisions = totalShapeCollisions;
        returnValues.total.fusions = fusions.length;
        returnValues.total.maxImpactSpeed = maxImpactSpeed;
        
        // Update the collision statistics
        if (this.wallHitsStack.length >= 120) {
            let old = this.wallHitsStack.shift();
            this.wallHits -= old;
        }
        this.wallHitsStack.push(totalWallHits);
        this.wallHits += totalWallHits;
        
        if (this.ballCollisionsStack.length >= 120) {
            let old = this.ballCollisionsStack.shift();
            this.ballCollisions -= old;
        }
        this.ballCollisionsStack.push(totalShapeCollisions);
        this.ballCollisions += totalShapeCollisions;
        
        // Increment counter
        this.counter++;
        
        // Return stats for this frame
        // going to be more detailed
        return returnValues;
    }

    
    /**
     * Fuse two same-type shapes into a new one (null if over the size cap).
     * With the Ascension pick it may upgrade into the next shape tier; if
     * that would be too big it falls back to a normal fusion.
     */
    fuse(shapeA, shapeB) {
        const name = shapeA.getName();
        const tier = SHAPE_TIERS.indexOf(name);
        const next = tier >= 0 ? SHAPE_TIERS[tier + 1] : undefined;
        const options = {
            scaleFactor: this.scaleFactor,
            maxSpeed: FUSION_LIMITS.maxSpeed * this.scaleFactor,
            speedBonus: this.fusionSpeedBonus,
            massBonus: this.fusionMassBonus,
        };
        let fused = null;
        if (next && this.fusionPromoteChance > 0 && this.fusionRng() < this.fusionPromoteChance) {
            fused = fuseShapes(shapeA, shapeB, {
                ...options,
                promoteTo: next,
                maxBaseSize: FUSION_LIMITS.maxBaseSize[next] ?? Infinity,
            });
        }
        fused ??= fuseShapes(shapeA, shapeB, {
            ...options,
            maxBaseSize: FUSION_LIMITS.maxBaseSize[name] ?? Infinity,
        });
        if (fused) {
            fused.id = this.counter++;
            fused.cruiseSpeed = Math.hypot(fused.velocity.x, fused.velocity.y);
            fused.speedMultiplier = Math.max(shapeA.speedMultiplier ?? 1, shapeB.speedMultiplier ?? 1);
            fused.massScale = Math.max(shapeA.massScale ?? 1, shapeB.massScale ?? 1);
            fused.mass *= fused.massScale;
        }
        return fused;
    }

    /**
     * Give a new shape its own speed (`cruiseSpeed`, from its velocity), the
     * permanent speed multiplier in effect right now and the current spawn
     * mass scale (black holes make new shapes lighter). Later upgrades never
     * change these, so they only affect shapes bought after them.
     */
    lockInSpawnStats(shape, { spawnSpeed = {}, spawnMass = 1 } = {}) {
        if (!(shape.cruiseSpeed >= 0)) shape.cruiseSpeed = Math.hypot(shape.velocity.x, shape.velocity.y);
        if (!(shape.speedMultiplier > 0)) {
            const value = spawnSpeed[shape.getName().toLowerCase()];
            shape.speedMultiplier = Number.isFinite(value) && value > 0 ? value : 1;
        }
        if (!(shape.massScale > 0)) {
            shape.massScale = Number.isFinite(spawnMass) && spawnMass > 0 ? spawnMass : 1;
            shape.mass *= shape.massScale;
        }
    }

    /** Sum of every shape's mass (what a black hole is measured against). */
    getTotalMass() {
        let total = 0;
        for (const shape of this.shapes) total += shape.mass;
        return total;
    }

    /** Black hole / supernova: remove every shape and play the event flash. */
    clearShapes(kind = null) {
        this.shapes = [];
        this.lightningFlashes = [];
        if (kind) this.cosmicFlash = { kind, life: COSMIC_FLASH_FRAMES };
    }

    /** Rescale the velocity back to the shape's own speed, keeping its direction. */
    restoreOwnSpeed(shape) {
        const target = shape.cruiseSpeed;
        if (!(target > 0)) return;
        const speed = Math.hypot(shape.velocity.x, shape.velocity.y);
        if (speed === 0) {
            const angle = Math.random() * Math.PI * 2;
            shape.velocity.x = Math.cos(angle) * target;
            shape.velocity.y = Math.sin(angle) * target;
        } else if (Math.abs(speed - target) > target * 1e-9) {
            shape.velocity.x *= target / speed;
            shape.velocity.y *= target / speed;
        }
    }

    /**
     * Chain lightning: each source strikes one random other shape that can
     * earn money, which earns its value as if it had scored. With Forked
     * Bolt the struck shape can strike again. Returns the number of strikes.
     * Picking targets by random index keeps this O(strikes), not O(shapes).
     */
    strikeLightning(sources, statsFor) {
        const shapes = this.shapes;
        if (shapes.length < 2) return 0;
        const maxSpeed = FUSION_LIMITS.maxSpeed * this.scaleFactor;
        const pickTarget = (from) => {
            for (let tries = 0; tries < 4; tries++) {
                const shape = shapes[Math.floor(this.lightningRng() * shapes.length) % shapes.length];
                if (shape !== from && SCORES_ON[shape.getName()]) return shape;
            }
            return null;
        };

        let strikes = 0;
        for (const source of sources) {
            let from = source;
            for (let jump = 0; jump < LIGHTNING_LIMITS.maxChain; jump++) {
                const target = pickTarget(from);
                if (!target) break;
                strikes += 1;
                const stats = statsFor(target.getName());
                if (SCORES_ON[target.getName()] === 'wall') stats.wallHitValue += target.value ?? 1;
                else stats.collisionValue += target.value ?? 1;

                if (this.lightningChargeBonus > 0) this.chargeShape(target, this.lightningChargeBonus, maxSpeed);
                this.addLightningFlash(from, target);

                from = target;
                if (!(this.lightningChainChance > 0 && this.lightningRng() < this.lightningChainChance)) break;
            }
        }
        return strikes;
    }

    /** Supercharge: a permanent bump in speed (up to the cap) and weight. */
    chargeShape(shape, bonus, maxSpeed) {
        const speed = shape.cruiseSpeed ?? Math.hypot(shape.velocity.x, shape.velocity.y);
        if (speed > 0) {
            const factor = Math.min(1 + bonus, maxSpeed / speed);
            if (factor > 1) {
                // Only the struck shape's own speed goes up.
                shape.cruiseSpeed = speed * factor;
                shape.velocity.x *= factor;
                shape.velocity.y *= factor;
            }
        }
        applyMassBonus(shape, 1 + bonus);
    }

    /** A short-lived jagged bolt between two shapes (drawn by render). */
    addLightningFlash(from, to) {
        const flashes = this.lightningFlashes;
        if (flashes.length >= LIGHTNING_LIMITS.maxFlashes) flashes.shift();
        const x1 = from.center.x, y1 = from.center.y;
        const x2 = to.center.x, y2 = to.center.y;
        const len = Math.hypot(x2 - x1, y2 - y1) || 1;
        const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
        const points = [{ x: x1, y: y1 }];
        const segments = 5;
        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            const offset = (Math.random() - 0.5) * Math.min(40, len * 0.25);
            points.push({ x: x1 + (x2 - x1) * t + nx * offset, y: y1 + (y2 - y1) * t + ny * offset });
        }
        points.push({ x: x2, y: y2 });
        flashes.push({ points, life: LIGHTNING_LIMITS.flashFrames });
    }

    drawLightning() {
        const flashes = this.lightningFlashes;
        if (!flashes.length) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        for (const flash of flashes) {
            const alpha = flash.life / LIGHTNING_LIMITS.flashFrames;
            ctx.beginPath();
            flash.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 * alpha})`;
            ctx.lineWidth = 6 * this.scaleFactor;
            ctx.stroke();
            ctx.strokeStyle = `rgba(240, 249, 255, ${alpha})`;
            ctx.lineWidth = 2 * this.scaleFactor;
            ctx.stroke();
            flash.life -= 1;
        }
        ctx.restore();
        this.lightningFlashes = flashes.filter((flash) => flash.life > 0);
    }

    /**
     * Render the current state without updating physics
     */
    render() {
        this.ctx.clearRect(0, 0, this.logicalSize, this.logicalSize);
        this.drawContainer();
        this.shapes.forEach(shape => shape.draw(this.ctx));
        this.drawLightning();
        this.drawCosmicFlash();
    }

    /**
     * Black hole: a dark disc that collapses into the centre.
     * Supernova: a bright ring that blasts outward.
     */
    drawCosmicFlash() {
        const flash = this.cosmicFlash;
        if (!flash) return;
        const ctx = this.ctx;
        const t = 1 - flash.life / COSMIC_FLASH_FRAMES; // 0 → 1
        const { x, y, radius } = this.container;
        ctx.save();
        if (flash.kind === 'blackHole') {
            const r = Math.max(1, radius * (1 - t));
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${1 - t * 0.5})`);
            gradient.addColorStop(0.7, `rgba(76, 29, 149, ${0.8 * (1 - t)})`);
            gradient.addColorStop(1, 'rgba(76, 29, 149, 0)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = `rgba(254, 240, 138, ${1 - t})`;
            ctx.lineWidth = 30 * (1 - t) + 2;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, radius * t), 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * (1 - t) ** 2})`;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
        flash.life -= 1;
        if (flash.life <= 0) this.cosmicFlash = null;
    }
    /**
     * Match the canvas backing store to devicePixelRatio, recompute the
     * scale factor and container, and move existing shapes into the new
     * container if it changed (a save made at an older canvas size, or a
     * changed baseReferenceSize). Safe to call on every window resize: when
     * only the DPR changes, the simulation is untouched.
     *
     * With `keepShapes`, existing shapes keep their size and speed (only their
     * positions move into the new container); their base sizes are rewritten
     * so they stay that size from now on.
     */
    syncCanvasResolution({ keepShapes = false } = {}) {
        const dpr = Math.min(Math.max(globalThis.devicePixelRatio || 1, 1), 3);
        const backing = Math.round(this.logicalSize * dpr);
        if (this.canvas.width !== backing || this.canvas.height !== backing) {
            this.canvas.width = backing;
            this.canvas.height = backing;
        }
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const old = this.container;
        this.calculateScaleFactor();
        this.initContainer();
        const next = this.container;

        const changed = old.radius !== next.radius || old.x !== next.x || old.y !== next.y;
        if (changed && old.radius > 0) {
            const sizeRatio = next.radius / old.radius;
            this.shapes.forEach(shape => {
                const dx = shape.center.x - old.x;
                const dy = shape.center.y - old.y;
                // Keep each shape at the same relative spot in the container.
                shape.center.x = next.x + dx * sizeRatio;
                shape.center.y = next.y + dy * sizeRatio;
                if (keepShapes) {
                    if (shape instanceof Circle) shape.baseRadius = shape.radius / this.scaleFactor;
                    else shape.baseSide = shape.side / this.scaleFactor;
                    return;
                }
                if (shape.cruiseSpeed >= 0) shape.cruiseSpeed *= sizeRatio;
                shape.velocity.x *= sizeRatio;
                shape.velocity.y *= sizeRatio;

                if (shape instanceof Circle) {
                    shape.radius = shape.baseRadius * this.scaleFactor;
                } else if (shape instanceof Square) {
                    shape.side = shape.baseSide * this.scaleFactor;
                } else if (shape instanceof Triangle) {
                    shape.side = shape.baseSide * this.scaleFactor;
                    shape.mass = (Math.sqrt(3) / 4) * shape.side * shape.side * (shape.massBonus ?? 1) * (shape.massScale ?? 1);
                }
            });
        }

        this.render();
        return this.scaleFactor;
    }

    /** "Decrease Large Circle Size": only shapes bought afterwards are bigger. */
    setReferenceSize(size) {
        this.baseReferenceSize = size;
        return this.syncCanvasResolution({ keepShapes: true });
    }

    // Toggle simulation state
    toggleSimulation() {
        this.isRunning = !this.isRunning;
        return this.isRunning;
    }
    
    // Get the current wall hits per second
    getWallHitsPerSecond() {
        if (this.wallHitsStack.length === 0) return 0;
        return 60 * this.wallHits / this.wallHitsStack.length;
    }
    
    // Get the current ball collisions per second
    getShapeCollisionsPerSecond() {
        if (this.ballCollisionsStack.length === 0) return 0;
        return 60 * this.ballCollisions / this.ballCollisionsStack.length;
    }

    getTotalShapeCollisions() {
        return this.totalShapeCollisions;
    }

    restoreTotalShapeCollisions(totalShapeCollisions) {
        if (Number.isFinite(totalShapeCollisions) && totalShapeCollisions >= 0) {
            this.totalShapeCollisions = totalShapeCollisions;
        }
    }

    updateWallHits(amount) {
        this.wallHits += amount;
        if (this.wallHitsStack.length >= 120) {
            let old = this.wallHitsStack.shift();
            this.wallHits -= old;
        }
        this.wallHitsStack.push(amount);
    }
    updateBallCollisions(amount) {
        this.ballCollisions += amount;
        if (this.ballCollisionsStack.length >= 120) {
            let old = this.ballCollisionsStack.shift();
            this.ballCollisions -= old;
        }
        this.ballCollisionsStack.push(amount);
    }
    
    // Initialize the simulation
    initialize() {
        this.syncCanvasResolution();
        this.resetCollisionCounters();
    }
}

export default CircleBoard;
