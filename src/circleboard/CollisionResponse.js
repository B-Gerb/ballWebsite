import { geometryOf } from './collisionGeometry.js';

// Scratch space for findMTV (at most 4 + 4 axes) and projection results.
const AXES = new Float64Array(16);
let projMin = 0;
let projMax = 0;

/** Write `shape`'s SAT axes against `other` into AXES at `at`; returns the new end. */
function pushAxes(shape, g, other, at) {
    if (g.kind === 0) {
        // Circle.axes(): unit vector from this centre towards the other's.
        const dx = other.center.x - shape.center.x;
        const dy = other.center.y - shape.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance === 0) return at;
        AXES[at] = dx / distance;
        AXES[at + 1] = dy / distance;
        return at + 2;
    }
    const axes = g.axes;
    const len = g.nAxes * 2;
    for (let i = 0; i < len; i++) AXES[at + i] = axes[i];
    return at + len;
}

/** shape.projection(axis) into projMin / projMax. */
function project(shape, g, ax, ay) {
    if (g.kind === 0) {
        const centerProjection = shape.center.x * ax + shape.center.y * ay;
        projMin = centerProjection - shape.radius;
        projMax = centerProjection + shape.radius;
        return;
    }
    const v = g.verts;
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < v.length; i += 2) {
        const p = v[i] * ax + v[i + 1] * ay;
        min = Math.min(min, p);
        max = Math.max(max, p);
    }
    projMin = min;
    projMax = max;
}

class CollisionResponse {
    /*
        Handle the response between two colliding objects.
        This class does not have a constructor as it is meant to be used statically.
        It uses impulse based collision to handle the response between two objects.

    */


    /*
    @param {Object} shapeA - The first shape involved in the collision.
    @param {Object} shapeB - The second shape involved in the collision.
    @param {number} restitution - The coefficient of restitution, which determines how elastic the collision is.
    returns boolean True if the collison happened false if not
    */

   static handleCollision(shapeA, shapeB, restitution= 1.0, ) {
        const mtv = CollisionResponse.findMTV(shapeA, shapeB);
        if (!mtv) {
            return false; // No collision
        }

        // Separate shapes using the MTV

        // Calculate relative velocity
        CollisionResponse.applyCollision(shapeA, shapeB, mtv.normal, restitution);
        CollisionResponse.separateShapes(shapeA, shapeB, mtv);

        return true; // Collision handled


   }


    /**
     * Find the Minimum Translation Vector (MTV) - the smallest vector to separate shapes
     * @param {Object} shapeA - First shape
     * @param {Object} shapeB - Second shape
     * @param {Object} [out] - Optional { normal: {x, y}, magnitude } to fill in instead of allocating
     * @returns {Object|null} MTV object with normal and magnitude, or null if no collision
    */
    static findMTV(shapeA, shapeB, out = null) {
        // Same separating-axis test as Circle/Square/Triangle .axes() and
        // .projection(), on cached geometry and without per-pair allocations.
        // Axes are A's then B's, in the shapes' own order, so the chosen
        // axis (first strictly smallest overlap) is unchanged.
        const ga = geometryOf(shapeA);
        const gb = geometryOf(shapeB);
        const cdx = shapeB.center.x - shapeA.center.x;
        const cdy = shapeB.center.y - shapeA.center.y;

        // Bounding circles apart: the centre-to-centre axis (a circle's axis)
        // or one of the polygons' edge normals separates them, so SAT would
        // say no collision too.
        const reach = (ga.R + gb.R) * (1 + 1e-9) + 1e-9;
        if (cdx * cdx + cdy * cdy > reach * reach) return null;

        const n = pushAxes(shapeA, ga, shapeB, 0);
        const count = pushAxes(shapeB, gb, shapeA, n);

        let minOverlap = Infinity;
        let best = -1;
        for (let i = 0; i < count; i += 2) {
            const ax = AXES[i];
            const ay = AXES[i + 1];
            project(shapeA, ga, ax, ay);
            const minA = projMin, maxA = projMax;
            project(shapeB, gb, ax, ay);
            const minB = projMin, maxB = projMax;

            // Check for separation
            if (!(maxA > minB && maxB > minA)) {
                return null;
            }

            const overlap = Math.min(maxA - minB, maxB - minA);
            if (overlap < minOverlap) {
                minOverlap = overlap;
                best = i;
            }
        }

        if (best < 0) return null;

        let nx = AXES[best];
        let ny = AXES[best + 1];
        // Ensure MTV points from shapeA to shapeB
        const dot = cdx * nx + cdy * ny;
        if (dot < 0) {
            nx = -nx;
            ny = -ny;
        }

        if (out) {
            out.normal.x = nx;
            out.normal.y = ny;
            out.magnitude = minOverlap;
            return out;
        }
        return {
            normal: { x: nx, y: ny },
            magnitude: minOverlap
        };
    }
    

    static separateShapes(shapeA, shapeB, mtv) {
        // Move shapes apart by the MTV
        const massA = shapeA.mass || 1;
        const massB = shapeB.mass || 1;
        const totalMass = massA + massB;

        const seperationA = (massB / totalMass) * mtv.magnitude;
        const seperationB = (massA / totalMass) * mtv.magnitude;
        const totalSeperation = mtv.magnitude+.001;

        const ratioA = seperationA / totalSeperation;
        const ratioB = seperationB / totalSeperation;

        shapeA.center.x -= mtv.normal.x * totalSeperation * ratioA;
        shapeA.center.y -= mtv.normal.y * totalSeperation * ratioA;
        shapeB.center.x += mtv.normal.x * totalSeperation * ratioB;
        shapeB.center.y += mtv.normal.y * totalSeperation * ratioB;

    }

    static applyCollision( shapeA, shapeB, normal, restitution = 1.0) {
        // Shapes collide along the normal axis
        const relativeVelocity = {
            x: shapeB.velocity.x - shapeA.velocity.x,
            y: shapeB.velocity.y - shapeA.velocity.y
        }

        const velocityAlongNormal = relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;
        if (velocityAlongNormal > 0) {
            return;
        }

        const impulseMagnitude = -(1 + restitution) * velocityAlongNormal / (1/(shapeA.mass || 1) + 1/(shapeB.mass || 1));

        const impulse = {
            x: impulseMagnitude * normal.x,
            y: impulseMagnitude * normal.y
        };

        shapeA.velocity.x -= impulse.x / (shapeA.mass || 1);
        shapeA.velocity.y -= impulse.y / (shapeA.mass || 1);
        shapeB.velocity.x += impulse.x / (shapeB.mass || 1);
        shapeB.velocity.y += impulse.y / (shapeB.mass || 1);
        

    }

    /*
    @param {Object} Shape
    @param {Object} container
    @param {rest} restitution
    @returns {boolean} True if the shape is colliding with the container, false otherwise
    */
   static handleContainerCollision(shape, container, restitution = 1.0) {
        const dx = shape.center.x - container.x;
        const dy = shape.center.y - container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const nx = dx / Math.max(distance, .0001)
        const ny = dy / Math.max(distance, .0001);

        if(shape.getName() === "Circle"){
            const radius = shape.radius;
            const containerRadius = container.radius - container.thickness;

            if (distance + radius > containerRadius) {
                // Calculate the overlap
                const overlap = distance + radius - containerRadius;

                // Separate the shape from the container
                shape.center.x -= nx * overlap;
                shape.center.y -= ny * overlap;

                // Reflect the velocity
                const dotProduct = shape.velocity.x * nx + shape.velocity.y * ny;
                shape.velocity.x -= (1+restitution) * dotProduct * nx;
                shape.velocity.y -= (1+restitution)* dotProduct * ny;
                
                return true; // Collision handled
            }
            else {
                return false; // No collision
            }
            
        }
        if(shape.getVertices){
            const vertices = geometryOf(shape).verts;
            let maxOverlap = 0;
            let collisionNormalX = 0;
            let collisionNormalY = 0;
            let collisionDetected = false;

            for (let i = 0; i < vertices.length; i += 2) {
                const vx = vertices[i] - container.x;
                const vy = vertices[i + 1] - container.y;
                const distance = Math.sqrt(vx * vx + vy * vy);
                const overlap = distance - (container.radius - container.thickness);
                if (overlap > maxOverlap){
                    collisionDetected = true;
                    maxOverlap = overlap;
                    collisionNormalX = vx / Math.max(distance, .0001);
                    collisionNormalY = vy / Math.max(distance, .0001);
                }
                
            }
            if (collisionDetected) {
                // Separate the shape from the container
                shape.center.x -= (maxOverlap + 0.1) * collisionNormalX;
                shape.center.y -= (maxOverlap + 0.1) * collisionNormalY;

                // Reflect the velocity
                const dotProduct = shape.velocity.x * collisionNormalX + 
                                shape.velocity.y * collisionNormalY;
                shape.velocity.x -= 2 * dotProduct * collisionNormalX;
                shape.velocity.y -= 2 * dotProduct * collisionNormalY;
            }
            return collisionDetected; // Return true if any vertex collided
        }
    }

}
export default CollisionResponse;