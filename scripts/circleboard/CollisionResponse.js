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
        CollisionResponse.separateShapes(shapeA, shapeB, mtv);

        // Calculate relative velocity
        CollisionResponse.applyCollision(shapeA, shapeB, mtv.normal, restitution);
        return true; // Collision handled


   }


    /**
     * Find the Minimum Translation Vector (MTV) - the smallest vector to separate shapes
     * @param {Object} shapeA - First shape
     * @param {Object} shapeB - Second shape
     * @returns {Object|null} MTV object with normal and magnitude, or null if no collision
    */
    static findMTV(shapeA, shapeB) {
        const axes = new Set([...shapeA.axes(shapeB), ...shapeB.axes(shapeA)]);
        
        let minOverlap = Infinity;
        let mtvAxis = null;
        
        for (const axis of axes) {
            const projA = shapeA.projection(axis);
            const projB = shapeB.projection(axis);
            
            // Check for separation
            if (!(projA[1] > projB[0] && projB[1] > projA[0])) {
                return null;
            }
            
            // Calculate overlap
            const overlap = Math.min(projA[1] - projB[0], projB[1] - projA[0]);
            
            if (overlap < minOverlap) {
                minOverlap = overlap;
                mtvAxis = axis;
            }
        }
        
        if (!mtvAxis) return null;
        
        // Ensure MTV points from shapeA to shapeB
        const centerDiff = {
            x: shapeB.center.x - shapeA.center.x,
            y: shapeB.center.y - shapeA.center.y
        };
        
        const dot = centerDiff.x * mtvAxis.x + centerDiff.y * mtvAxis.y;
        if (dot < 0) {
            mtvAxis = { x: -mtvAxis.x, y: -mtvAxis.y };
        }
        
        return {
            normal: mtvAxis,
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
        if(shape.getVertices()){
            const vertices = shape.getVertices();
            let maxOverlap = 0;
            let collisionNormalX = 0;
            let collisionNormalY = 0;
            let collisionDetected = false;

            for (const vertex of vertices) {
                const vx = vertex.x - container.x;
                const vy = vertex.y - container.y;
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