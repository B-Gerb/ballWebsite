class CircleBoard {
    constructor(canvasId) {
        // DOM elements
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
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
            }
        };



        this.isRunning = true;
        this.rng = new Math.seedrandom();
        
        // Collision tracking for time
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.wallHitsStack = [];
        this.ballCollisionsStack = [];

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
        
        // Scale factor based on screen size
        this.scaleFactor = 1;
        this.lastScaleFactor = 1;
        
        this.baseReferenceSize = 750; 
        

    }
    setSeed(seed){
        this.rng = seed;
    }
    
    // Calculate scale factor based on canvas size
    calculateScaleFactor() {
        // Store the previous scale factor
        this.lastScaleFactor = this.scaleFactor;
        
        const smallerDimension = Math.min(this.canvas.width, this.canvas.height);
        this.scaleFactor = smallerDimension / this.baseReferenceSize;
        
        for( const shape of Object.keys(this.shapeInfo)){
            for(const prop of Object.keys(this.shapeInfo[shape])){
                this.shapeInfoScaled[shape][prop] = this.shapeInfo[shape][prop] * this.scaleFactor;
                
            }
        }

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

        
        const ball = Circle.create(x, y, radius, color, velocityX, velocityY);
        ball.baseRadius = radius / this.scaleFactor; 
        

        // Ensure ball has minimum velocity
        const minSpeed = this.shapeInfo['Circle'].baseMinBallSpeed * this.scaleFactor;
        const currentSpeed = Math.sqrt(ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y);
        if (currentSpeed < minSpeed) {
            const factor = minSpeed / Math.max(currentSpeed, 0.0001);
            ball.velocity.x *= factor;
            ball.velocity.y *= factor;
        }

        
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
        
        const square = Square.create(x, y, side, rotation, color, velocityX, velocityY, side/this.scaleFactor);

        // Ensure square has minimum velocity
        const minSpeed = this.shapeInfo['Square'].baseMinSpeed * this.scaleFactor;
        const currentSpeed = Math.sqrt(square.velocity.x * square.velocity.x + square.velocity.y * square.velocity.y);
        if (currentSpeed < minSpeed) {
            const factor = minSpeed / Math.max(currentSpeed, 0.0001);
            square.velocity.x *= factor;
            square.velocity.y *= factor;
        }
        return square;
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
    
 
    
    
    // Handle collision between two balls
    handleBallCollision(ballA, ballB) {
        const dx = ballB.center.x - ballA.center.x;
        const dy = ballB.center.y - ballA.center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate normal vector (direction from ballA to ballB)
        // Use a minimum distance to avoid division by zero
        const minDistance = 0.0001;
        const nx = dx / Math.max(distance, minDistance);
        const ny = dy / Math.max(distance, minDistance);
        
        // Calculate relative velocity
        const vx = ballB.velocity.x - ballA.velocity.x;
        const vy = ballB.velocity.y - ballA.velocity.y;
        
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
                
                ballA.center.x -= nx * overlap * moveRatio1 * 1.001; // Slightly more separation
                ballA.center.y -= ny * overlap * moveRatio1 * 1.001;
                ballB.center.x += nx * overlap * moveRatio2 * 1.001;
                ballB.center.y += ny * overlap * moveRatio2 * 1.001;
            }
            return true;
        }
    
        // Calculate impulse scalar - using conservation of momentum with perfect elasticity (1.0)
        const massSum = ballA.mass + ballB.mass;
        const impulse = (-(1 + 1.0) * velocityAlongNormal) / massSum;
        
        // Apply impulse
        const impulseX = impulse * nx;
        const impulseY = impulse * ny;
        
        ballA.velocity.x -= impulseX * ballB.mass;
        ballA.velocity.y -= impulseY * ballB.mass;
        ballB.velocity.x += impulseX * ballA.mass;
        ballB.velocity.y += impulseY * ballA.mass;
        
        // Position correction to prevent overlap (with a small separation factor)
        const overlap = (ballA.radius + ballB.radius) - distance;
        if (overlap > 0) {
            const massSum = ballA.mass + ballB.mass;
            const moveRatio1 = ballB.mass / massSum;
            const moveRatio2 = ballA.mass / massSum;
            
            // Apply a bit more separation (1.001) to ensure balls don't stick
            ballA.center.x -= nx * overlap * moveRatio1 * 1.001;
            ballA.center.y -= ny * overlap * moveRatio1 * 1.001;
            ballB.center.x += nx * overlap * moveRatio2 * 1.001;
            ballB.center.y += ny * overlap * moveRatio2 * 1.001;
        }
        
        return true;
    }
    
    /**
     * Handle shape collision with the container wall without checking conditions
     * Assumes if object is not a circle it contains getVertices method
     * @param {Object} shape - shape colliding with wall
     * @returns {boolean} Always returns true since we assume collision happens
     */
    handleWallCollision(shape) {
        const dx = shape.center.x - this.container.x;
        const dy = shape.center.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const nx = dx / Math.max(distance, 0.0001);
        const ny = dy / Math.max(distance, 0.0001);


        if(shape.getName() === "Circle"){
            const overlap = distance + shape.radius - (this.container.radius - this.container.thickness);
            shape.center.x -= overlap * nx;
            shape.center.y -= overlap * ny;
            
            const dotProduct = shape.velocity.x * nx + shape.velocity.y * ny;
                
            shape.velocity.x -= 2 * dotProduct * nx;
            shape.velocity.y -= 2 * dotProduct * ny;
            return true;
        }
        else{ 
            if(shape.getVertices()){
                const vertices = shape.getVertices();
                let maxOverlap = 0;
                let collisionNormalX = 0;
                let collisionNormalY = 0;
                for(const vertex of vertices){
                    const vx = vertex.x - this.container.x;
                    const vy = vertex.y - this.container.y;
                    const distance = Math.sqrt(vx * vx + vy * vy);
                    const overlap = distance - (this.container.radius - this.container.thickness);
                    if(overlap > maxOverlap){
                        maxOverlap = overlap;
                        collisionNormalX = vx / Math.max(distance, 0.0001);
                        collisionNormalY = vy / Math.max(distance, 0.0001);
                    }

                }
                shape.center.x -= (maxOverlap + 0.1) * collisionNormalX;
                shape.center.y -= (maxOverlap + 0.1) * collisionNormalY;
                
                // Calculate reflection for velocity
                const dotProduct = shape.velocity.x * collisionNormalX + 
                                shape.velocity.y * collisionNormalY;
                
                shape.velocity.x -= 2 * dotProduct * collisionNormalX;
                shape.velocity.y -= 2 * dotProduct * collisionNormalY;
                                
                return true;

            }

        }

        
        console.log(shape);
        return false;
    }

    isWallCollision(shape) {
        if (shape.getName() === "Circle"){
            const dx = shape.center.x - this.container.x;
            const dy = shape.center.y - this.container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Check if circle is outside or touching the container wall
            return distance + shape.radius >= this.container.radius - this.container.thickness;
        }
        else if (shape.getVertices) {
            // For shapes with vertices, check if any vertex is outside the container
            const vertices = shape.getVertices();
            for (const vertex of vertices) {

                const dx = vertex.x - this.container.x;
                const dy = vertex.y - this.container.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance >= this.container.radius - this.container.thickness) {
                    return true;
                }
            }
            return false;
        }
        console.log("unknown shape", shape);
        return false;
    }

    
    /**
     * Process physics for one frame
     * Separated from animation to allow server to control updates
     * @param {Object} shop - Shop object for handling currency
     * @return {Object} Statistics for the current frame
     */
    updatePhysics(speedMultipler = 1) {
        if (!this.isRunning) return {total: { totalWallHits: 0, totalShapeCollisions: 0 }};

        const returnValues = {total: { totalWallHits: 0, totalShapeCollisions: 0 }};
        
        // Track collisions for this frame
        let totalWallHits = 0;
        let totalShapeCollisions = 0;
        
        // Move all balls forward by one frame
        this.shapes.forEach(shape => {
            if(this.isWallCollision(shape)){
                this.handleWallCollision(shape);
                totalWallHits++;
                if(shape.getName() in returnValues){
                    returnValues[shape.getName()].totalWallHits += 1;
                }
                else{
                    returnValues[shape.getName()] = {totalWallHits: 0, totalShapeCollisions: 0};
                    returnValues[shape.getName()].totalWallHits = 1;  
                }
            }

            this.shapes.forEach(shapeB => {  
                if (shape !== shapeB) {
                    const axises = new Set([...shape.axes(shapeB), ...shapeB.axes(shape)]);
                    for (const axis of axises) {
                        const projectionA = shape.projection(axis);
                        const projectionB = shapeB.projection(axis);
                        if (projectionA[1] > projectionB[0] && projectionB[1] > projectionA[0]) {

                            totalShapeCollisions++;
                            if(shape.type in returnValues){
                                returnValues[shape.type].totalShapeCollisions += 1;
                            }
                            else{
                                returnValues[shape.type] = {totalWallHits: 0, totalShapeCollisions: 0};
                                returnValues[shape.type].totalShapeCollisions = 1;  
                            }
                            if(shapeB.type in returnValues){
                                returnValues[shapeB.type].totalShapeCollisions += 1;
                            }
                            else{
                                returnValues[shapeB.type] = {totalWallHits: 0, totalShapeCollisions: 0};
                                returnValues[shapeB.type].totalShapeCollisions = 1;  
                            }
                            // collision detected
                            // somehow handle it
                            //console.log("Collision detected between shapes", shape, shapeB);
                            
                        }

                    }
                }
            });
            shape.update(speedMultipler);



        });
        returnValues.total.totalWallHits = totalWallHits;
        returnValues.total.totalShapeCollisions = totalShapeCollisions;
        
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
     * Render the current state without updating physics
     */
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawContainer();
        this.shapes.forEach(shape => shape.draw(this.ctx));
        

    }
    updateCanvasSize(size) {
        const shapeStates = this.shapes.map(shape => {    
            const info = shape.getInformation();
            const dx = info.center.x - this.container.x;
            const dy = info.center.y - this.container.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return {
                shape: shape,
                info: info,
                dirX: dx / Math.max(distance, 0.0001), // Avoid division by zero
                dirY: dy / Math.max(distance, 0.0001),
                relDist: distance / this.container.radius // Store distance as percentage of container radius
            };
        });
        
        const oldContainerRadius = this.container ? this.container.radius : size / 2;
        
        this.canvas.width = size;
        this.canvas.height = size;
        
        this.calculateScaleFactor();
        
        this.initContainer();
        

        const sizeRatio = this.container.radius / oldContainerRadius;
    
        shapeStates.forEach(state => {
            const shape = state.shape;
            
            // Calculate new position based on relative distance to container center
            const newDist = state.relDist * this.container.radius;
            const newX = this.container.x + (state.dirX * newDist);
            const newY = this.container.y + (state.dirY * newDist);
            
            // Update shape position
            shape.center.x = newX;
            shape.center.y = newY;
            
            // Scale velocity by size ratio
            shape.velocity.x *= sizeRatio;
            shape.velocity.y *= sizeRatio;
            
            // Scale radius if it's a Circle
            if (shape instanceof Circle) {
                shape.radius = shape.baseRadius * this.scaleFactor;
            }
            
            
        });
        
        this.render();
        
        return this.scaleFactor;
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
        this.resetCollisionCounters();

        
    }
}