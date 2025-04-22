/**
 * CollisionPriorityQueue - A priority queue for collision events
 */
class CollisionPriorityQueue {
    constructor() {
        this.queue = [];
    }

    /**
     * Add a collision event to the queue
     */
    enqueue(event) {
        event.countA = event.objectA.collisionCount;
        if (event.objectB) {
            event.countB = event.objectB.collisionCount;
        }
        this.queue.push(event);
        this.queue.sort((a, b) => a.time - b.time);
    }
    
    /**
     * Get the next collision event
     */
    dequeue() {
        if (this.queue.length === 0) return null;
        
        const event = this.queue[0];
        if (event.objectA.collisionCount !== event.countA ||
            (event.objectB && event.objectB.collisionCount !== event.countB)) {
            this.queue.shift(); 
            return this.dequeue(); 
        }
        return this.queue.shift();
    }

    /**
     * Get the next collision time
     */
    getNextCollisionTime() {
        if (this.queue.length === 0) return Infinity;
        return this.queue[0].time;
    }
    
    /**
     * Check if the queue is empty
     */
    isEmpty() {
        return this.queue.length === 0;
    }
    
    /**
     * Clear all events from the queue
     */
    clear() {
        this.queue = [];
    }
}

class CircleBoard {
    constructor(canvasId) {
        // DOM elements
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Animation settings
        this.ballCount = 1;
        this.baseMinBallSize = 5;      
        this.baseMaxBallSize = 15;
        this.baseContainerThickness = 5;
        this.baseMinBallSpeed = 5;
        this.baseMaxBallSpeed = 15;
        this.isRunning = true;
        this.rng = new Math.seedrandom('userInput');
        
        // Collision tracking for time
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.wallHitsStack = [];
        this.ballCollisionsStack = [];

        // Initialize priority queue
        this.pq = new CollisionPriorityQueue();
        this.counter = 0;
        
        // Scaled properties
        this.minBallSize = this.baseMinBallSize;
        this.maxBallSize = this.baseMaxBallSize;
        this.minBallSpeed = this.baseMinBallSpeed;
        this.maxBallSpeed = this.baseMaxBallSpeed;
        
        // Create container
        this.container = {
            x: 0,
            y: 0,
            radius: 0,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: this.baseContainerThickness
        };
        
        this.shapes = {};   
        this.balls = [];
        
        // Scale factor based on screen size
        this.scaleFactor = 1;
        this.lastScaleFactor = 1;
        
        this.baseReferenceSize = 750; 
        

    }
    
    // Calculate scale factor based on canvas size
    calculateScaleFactor() {
        // Store the previous scale factor
        this.lastScaleFactor = this.scaleFactor;
        
        const smallerDimension = Math.min(this.canvas.width, this.canvas.height);
        this.scaleFactor = smallerDimension / this.baseReferenceSize;
        
        this.minBallSize = this.baseMinBallSize * this.scaleFactor;
        this.maxBallSize = this.baseMaxBallSize * this.scaleFactor;
        this.minBallSpeed = this.baseMinBallSpeed * this.scaleFactor;
        this.maxBallSpeed = this.baseMaxBallSpeed * this.scaleFactor;
    }
    
    // Initialize container
    initContainer() {
        const padding = 20 * this.scaleFactor;
        const smallerDimension = Math.min(this.canvas.width, this.canvas.height);
        
        this.container = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: (smallerDimension / 2) - padding,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: this.baseContainerThickness * this.scaleFactor
        };
    }
    
    addNewBalls(amount = 1) {
        this.ballCount += amount;
        for (let i = 0; i < amount; i++) {
            const ballA = this.createBall();
            this.balls.push(ballA);
            this.predictCollisions(ballA);
        }
    }
    
    createBall() {
        const radius = this.minBallSize + (this.rng() * (this.maxBallSize - this.minBallSize));
        const speed = this.minBallSpeed + (this.rng() * (this.maxBallSpeed - this.minBallSpeed));
            
        const angle = this.rng() * Math.PI * 2;
        const maxDistance = this.container.radius - radius - this.container.thickness - 5 * this.scaleFactor;
        const distance = this.rng() * (maxDistance * 0.9); // Use only 90% of available space
        const x = this.container.x + Math.cos(angle) * distance;
        const y = this.container.y + Math.sin(angle) * distance;
            
        const baseRadius = radius / this.scaleFactor; 
        const mass = baseRadius * baseRadius * Math.PI;
            
        const ball = {
            x: x,
            y: y,
            radius: radius,
            baseRadius: baseRadius, 
            mass: mass, 
            dx: (this.rng() - 0.5) * speed,
            dy: (this.rng() - 0.5) * speed,
            color: `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`,
            collisionCount: 0
        };
        
        // Ensure ball has minimum velocity
        const minSpeed = 0.5 * this.scaleFactor;
        const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
        if (currentSpeed < minSpeed) {
            const factor = minSpeed / Math.max(currentSpeed, 0.0001);
            ball.dx *= factor;
            ball.dy *= factor;
        }
        
        return ball;
    }
    
    // Initialize bouncing balls within the container
    initBalls() {
        this.balls = [];
        
        for (let i = 0; i < this.ballCount; i++) {
            this.balls.push(this.createBall());
        }
        
        // Reset collision counters
        this.resetCollisionCounters();
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
    
    // Draw a bouncing ball
    drawBall(ball) {
        this.ctx.beginPath();
        this.ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = ball.color;
        this.ctx.fill();
        this.ctx.closePath();
    }
    
    // Calculate time to collision between two balls
    calculateRoundedCollisionTime(ballA, ballB) {
        const dx = ballB.x - ballA.x;
        const dy = ballB.y - ballA.y;
        
        const dvx = ballB.dx - ballA.dx;
        const dvy = ballB.dy - ballA.dy;
        
        // Check for balls that are already overlapping
        const distanceSquared = dx * dx + dy * dy;
        const minDistance = ballA.radius + ballB.radius;
        
        if (distanceSquared < minDistance * minDistance) {
            return 0; // Immediate collision
        }
        
        // Check if the balls are moving toward each other
        const dotProduct = dx * dvx + dy * dvy;
        if (dotProduct >= 0) {
            return Infinity; // Moving away or parallel
        }
        
        const a = dvx * dvx + dvy * dvy;
        
        if (a === 0) return Infinity;
        
        const b = 2 * (dx * dvx + dy * dvy);
        const c = distanceSquared - minDistance * minDistance;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return Infinity;
        
        const t1 = (-b - Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b + Math.sqrt(discriminant)) / (2 * a);
        
        let collisionTime = Infinity;
        
        if (t1 > 0.001) collisionTime = t1;
        else if (t2 > 0.001) collisionTime = t2;
        
        return collisionTime !== Infinity ? Math.ceil(collisionTime) : Infinity;
    }

    // Calculate time to collision with container wall
    calculateRoundedWallCollisionTime(ball) {
        const dx = ball.x - this.container.x;
        const dy = ball.y - this.container.y;
        
        const currentDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Distance to wall
        const distanceToWall = this.container.radius - ball.radius;
        
        // Check if ball is already outside or at wall boundary
        if (currentDistance >= distanceToWall) {
            return 0; // Immediate collision
        }
        
        // Get normalized direction from center to ball
        const nx = dx / Math.max(currentDistance, 0.0001);
        const ny = dy / Math.max(currentDistance, 0.0001);
        
        // Calculate velocity component in the radial direction
        const radialVelocity = ball.dx * nx + ball.dy * ny;
        
        // If ball is moving toward wall
        if (radialVelocity > 0) {
            // Calculate time to collision
            const distanceToTravel = distanceToWall - currentDistance;
            const collisionTime = distanceToTravel / radialVelocity;
            
            return Math.max(1, Math.floor(collisionTime));
        }
        
        // Ball is moving away from wall or parallel to it
        return Infinity;
    }
    
    // Delete events involving a specific ball
    removeBallEvents(ball) {
        this.pq.queue = this.pq.queue.filter(event => 
            event.objectA !== ball && event.objectB !== ball
        );
    }
    
    // Predict all possible collisions for a ball
    predictCollisions(ball) {
        // Remove any existing collision events involving this ball
        this.removeBallEvents(ball);
        
        // Check for collisions with other balls
        this.balls.forEach(otherBall => {
            if (ball !== otherBall) {
                let collisionTime = this.calculateRoundedCollisionTime(ball, otherBall);
                if (collisionTime !== Infinity) {
                    this.pq.enqueue({
                        time: collisionTime + this.counter,
                        objectA: ball,
                        objectB: otherBall
                    });
                }
            }
        });
        
        // Check for collision with wall
        let wallCollisionTime = this.calculateRoundedWallCollisionTime(ball);
        if (wallCollisionTime !== Infinity) {
            this.pq.enqueue({
                time: wallCollisionTime + this.counter,
                objectA: ball,
                objectB: null
            });
        }
    }
    
    // Call at startup to create the first priority queue
    createPossibleCollisions() {
        // Clear existing queue
        this.pq.clear();
        
        // Reset counter
        this.counter = 0;
        
        // Predict collisions for all balls
        this.balls.forEach(ball => {
            this.predictCollisions(ball);
        });
    }
    
    // Handle collision between two balls
    handleBallCollision(ballA, ballB) {
        const dx = ballB.x - ballA.x;
        const dy = ballB.y - ballA.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate normal vector (direction from ballA to ballB)
        // Use a minimum distance to avoid division by zero
        const minDistance = 0.0001;
        const nx = dx / Math.max(distance, minDistance);
        const ny = dy / Math.max(distance, minDistance);
        
        // Calculate relative velocity
        const vx = ballB.dx - ballA.dx;
        const vy = ballB.dy - ballA.dy;
        
        // Calculate velocity along the normal direction
        const velocityAlongNormal = vx * nx + vy * ny;
        
        // If balls are moving away from each other, only fix overlap without changing velocities
        if (velocityAlongNormal > 0) {
            // Still fix overlap
            const overlap = (ballA.radius + ballB.radius) - distance;
            if (overlap > 0) {
                const massSum = ballA.mass + ballB.mass;
                const moveRatio1 = ballB.mass / massSum;
                const moveRatio2 = ballA.mass / massSum;
                
                ballA.x -= nx * overlap * moveRatio1 * 1.001; // Slightly more separation
                ballA.y -= ny * overlap * moveRatio1 * 1.001;
                ballB.x += nx * overlap * moveRatio2 * 1.001;
                ballB.y += ny * overlap * moveRatio2 * 1.001;
            }
            return true;
        }
    
        // Calculate impulse scalar - using conservation of momentum with perfect elasticity (1.0)
        const massSum = ballA.mass + ballB.mass;
        const impulse = (-(1 + 1.0) * velocityAlongNormal) / massSum;
        
        // Apply impulse
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;
        
        ballA.dx -= impulseX * ballB.mass;
        ballA.dy -= impulseY * ballB.mass;
        ballB.dx += impulseX * ballA.mass;
        ballB.dy += impulseY * ballA.mass;
        
        // Position correction to prevent overlap (with a small separation factor)
        const overlap = (ballA.radius + ballB.radius) - distance;
        if (overlap > 0) {
            const massSum = ballA.mass + ballB.mass;
            const moveRatio1 = ballB.mass / massSum;
            const moveRatio2 = ballA.mass / massSum;
            
            // Apply a bit more separation (1.001) to ensure balls don't stick
            ballA.x -= nx * overlap * moveRatio1 * 1.001;
            ballA.y -= ny * overlap * moveRatio1 * 1.001;
            ballB.x += nx * overlap * moveRatio2 * 1.001;
            ballB.y += ny * overlap * moveRatio2 * 1.001;
        }
        
        return true;
    }
    
    /**
     * Handle ball collision with the container wall without checking conditions
     * @param {Object} ball - Ball colliding with wall
     * @returns {boolean} Always returns true since we assume collision happens
     */
    handleWallCollision(ball) {
        const dx = ball.x - this.container.x;
        const dy = ball.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const nx = dx / Math.max(distance, 0.0001);
        const ny = dy / Math.max(distance, 0.0001);

        const overlap = distance + ball.radius - (this.container.radius - this.container.thickness);
        ball.x -= overlap * nx;
        ball.y -= overlap * ny;
        
        const dotProduct = ball.dx * nx + ball.dy * ny;
            
        ball.dx -= 2 * dotProduct * nx;
        ball.dy -= 2 * dotProduct * ny;
        
        return true;
    }
    
    /**
     * Process physics for one frame
     * Separated from animation to allow server to control updates
     * @param {Object} shop - Shop object for handling currency
     * @return {Object} Statistics for the current frame
     */
    updatePhysics() {
        if (!this.isRunning) return { totalWallHits: 0, totalBallCollisions: 0 };
        
        // Track collisions for this frame
        let totalWallHits = 0;
        let totalBallCollisions = 0;
        
        // Maximum number of collisions to process per frame to prevent infinite loops
        const maxCollisionsPerFrame = 200;
        let collisionsProcessed = 0;
        
        // Process all collisions scheduled for this frame
        while (!this.pq.isEmpty() && 
              this.pq.getNextCollisionTime() <= this.counter + 1 && 
              collisionsProcessed < maxCollisionsPerFrame) {
            
            const event = this.pq.dequeue();
            if (!event) break;
            
            // Validate that collision counts match
            if (event.objectA.collisionCount !== event.countA || 
                (event.objectB && event.objectB.collisionCount !== event.countB)) {
                continue;
            }
            
            // Handle ball-to-ball collision
            if (event.objectA && event.objectB) {
                if (this.handleBallCollision(event.objectA, event.objectB)) {
                    // Update collision counts
                    event.objectA.collisionCount++;
                    event.objectB.collisionCount++;
                    totalBallCollisions++;
                    
                    // Recalculate future collisions
                    this.predictCollisions(event.objectA);
                    this.predictCollisions(event.objectB);
                }
            } 
            // Handle ball-to-wall collision
            else if (event.objectA) {
                if (this.handleWallCollision(event.objectA)) {
                    // Update collision count
                    event.objectA.collisionCount++;
                    totalWallHits++;
                    
                    // Recalculate future collisions
                    this.predictCollisions(event.objectA);
                }
            }
            
            collisionsProcessed++;
        }
        
        // Move all balls forward by one frame
        this.balls.forEach(ball => {
            ball.x += ball.dx;
            ball.y += ball.dy;
            
            // Check if any ball went outside container (emergency wall collision detection)
            const dx = ball.x - this.container.x;
            const dy = ball.y - this.container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const validRadius = this.container.radius - this.container.thickness - ball.radius;
            
            if (distance > validRadius) {
                // Ball is outside container - immediate wall collision
                const nx = dx / distance;
                const ny = dy / distance;
                
                // Apply reflection
                const dotProduct = ball.dx * nx + ball.dy * ny;
                ball.dx -= 2 * dotProduct * nx;
                ball.dy -= 2 * dotProduct * ny;
                
                // Position correction
                ball.x = this.container.x + nx * (validRadius - 0.5 * this.scaleFactor);
                ball.y = this.container.y + ny * (validRadius - 0.5 * this.scaleFactor);
                
                // Update collision count
                ball.collisionCount++;
                totalWallHits++;
                
                // Recalculate collisions
                this.predictCollisions(ball);
            }
        });
        
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
        this.ballCollisionsStack.push(totalBallCollisions);
        this.ballCollisions += totalBallCollisions;
        
        // Increment counter
        this.counter++;
        
        // Return stats for this frame
        return {
            totalWallHits,
            totalBallCollisions
        };
    }
    
    /**
     * Render the current state without updating physics
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawContainer();
        this.balls.forEach(ball => this.drawBall(ball));
        

    }

    // Resize canvas to fit parent
    resizeCanvas() {
        // Save the current ball positions relative to container
        const ballStates = this.balls.map(ball => {
            return {
                relX: (ball.x - this.container.x) / this.container.radius,
                relY: (ball.y - this.container.y) / this.container.radius,
                baseRadius: ball.baseRadius,
                mass: ball.mass,
                originalDx: ball.dx,
                originalDy: ball.dy,
                color: ball.color,
                collisionCount: ball.collisionCount
            };
        });
        
        const oldContainerRadius = this.container.radius;
        
        const newWidth = this.canvas.parentElement.clientWidth;
        const newHeight = this.canvas.parentElement.clientHeight;
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        this.calculateScaleFactor();
        this.initContainer();
        
        const containerRatio = this.container.radius / oldContainerRadius;
        
        // Restore balls with proper scaling
        this.balls = ballStates.map(state => {
            const newX = this.container.x + (state.relX * this.container.radius);
            const newY = this.container.y + (state.relY * this.container.radius);
            
            const newRadius = state.baseRadius * this.scaleFactor;

            const newDx = state.originalDx * containerRatio;
            const newDy = state.originalDy * containerRatio;
            
            return {
                x: newX,
                y: newY,
                radius: newRadius,
                baseRadius: state.baseRadius,
                mass: state.mass, 
                dx: newDx,
                dy: newDy,
                color: state.color,
                collisionCount: state.collisionCount
            };
        });
        
        // Reset collision queue with new positions
        this.createPossibleCollisions();
        
        // Force a redraw
        this.render();
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
    getBallCollisionsPerSecond() {
        if (this.ballCollisionsStack.length === 0) return 0;
        return 60 * this.ballCollisions / this.ballCollisionsStack.length;
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
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        
        this.baseReferenceSize = 750; // Fixed reference size
        
        this.calculateScaleFactor();
        this.initContainer();
        
        // Add proper bounds checking when creating initial balls
        if (this.container.radius <= this.maxBallSize) {
            console.warn("Container too small for balls, adjusting sizes");
            this.minBallSize = Math.min(this.minBallSize, this.container.radius * 0.1);
            this.maxBallSize = Math.min(this.maxBallSize, this.container.radius * 0.2);
        }
        
        this.initBalls();
        this.resetCollisionCounters();
        this.createPossibleCollisions();
        this.createPossibleCollisions();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
}