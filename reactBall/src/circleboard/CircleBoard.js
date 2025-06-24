import seedrandom from 'seedrandom';
import Circle from './circle.js';
import Square from './square.js';
import CollisionResponse from './CollisionResponse.js';
class CircleBoard {
    constructor(canvasElement) {
        this.canvas = canvasElement;
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
        this.counter = 0; // For unique shape IDs



        this.isRunning = true;
        this.rng = seedrandom();
        
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
    
 
    createSpatialGrid(size =4){
        const bounds = {
            x: this.container.x - this.container.radius,
            y: this.container.y - this.container.radius,
            width: this.container.radius * 2,
            height: this.container.radius * 2

        }
        const widthBoxes = bounds.width / size;
        const heightBoxes = bounds.height / size;
        return {
            cells: Array.from({ length: size**2}, () => []), // 4x4 grid
            bounds: bounds,
            widthBoxes: widthBoxes,
            heightBoxes: heightBoxes,
        }
    }


    getShapeCells(shape, grid) {
        const cellSpots = [];
        // Use bounding boxes
        if(shape.getName() === "Circle"){
            const radius = shape.radius;
            const centerX = shape.center.x;
            const centerY = shape.center.y;
            
            const startX = Math.max(grid.bounds.x, centerX- radius);
            const endX = Math.min(grid.bounds.x + grid.bounds.width, centerX + radius);
            const startY = Math.max(grid.bounds.y, centerY - radius);
            const endY = Math.min(grid.bounds.y + grid.bounds.height, centerY + radius);

        

            for (let x = startX; x <= endX; x += grid.widthBoxes) {
                for (let y = startY; y <= endY; y += grid.heightBoxes) {

                    cellSpots.push({
                        x: Math.floor((x - grid.bounds.x) / grid.widthBoxes),
                        y: Math.floor((y - grid.bounds.y) / grid.heightBoxes)
                    });
                }
            }
        }
        else{
            const vertices = shape.getVertices();
            let startX = Infinity;
            let endX = -Infinity;
            let startY = Infinity;
            let endY = -Infinity;

            for (const vertex of vertices) {
                startX = Math.min(startX, vertex.x);
                endX = Math.max(endX, vertex.x);
                startY = Math.min(startY, vertex.y);
                endY = Math.max(endY, vertex.y);
                
            }
            // Ensure we stay within grid bounds
            startX = Math.max(grid.bounds.x, startX);
            endX = Math.min(grid.bounds.x + grid.bounds.width, endX);
            startY = Math.max(grid.bounds.y, startY);
            endY = Math.min(grid.bounds.y + grid.bounds.height, endY);
            for (let x = startX; x <= endX; x += grid.widthBoxes) {
                for (let y = startY; y <= endY; y += grid.heightBoxes) {
                    cellSpots.push({
                        x: Math.floor((x - grid.bounds.x) / grid.widthBoxes),
                        y: Math.floor((y - grid.bounds.y) / grid.heightBoxes)
                    });
                }
            }
        }
        return cellSpots;
    }

    
    
    /**
     * Process physics for one frame
     * Separated from animation to allow server to control updates
     * @param {Object} shop - Shop object for handling currency
     * @return {Object} Statistics for the current frame
     */
    updatePhysics(speedMultipliers = {}) {
        if (!this.isRunning) return {total: { totalWallHits: 0, totalShapeCollisions: 0 }};

        const returnValues = {total: { totalWallHits: 0, totalShapeCollisions: 0 }};
        
        // Track collisions for this frame
        let totalWallHits = 0;
        let totalShapeCollisions = 0;
        const size = 6; // Size of the spatial grid

        const grid = this.createSpatialGrid(size);

        // Populate the spatial grid
        this.shapes.forEach(shape => {
            if(CollisionResponse.handleContainerCollision(shape, this.container)){

                totalWallHits++;
                if(shape.getName() in returnValues){
                    returnValues[shape.getName()].totalWallHits += 1;
                }
                else{
                    returnValues[shape.getName()] = {totalWallHits: 0, totalShapeCollisions: 0};
                    returnValues[shape.getName()].totalWallHits = 1;  
                }
            }
            const cells = this.getShapeCells(shape, grid);
            cells.forEach(cell => {
                const index = cell.x + cell.y * size; //  a 4x4 grid
                grid.cells[index].push(shape);
            });
        });
        const proccessedCollisions = new Set();
        for (let i = 0; i < grid.cells.length; i++) {
            const cell = grid.cells[i];
            if (cell.length < 2) continue; // No collisions possible in this cell
            for (let j = 0; j < cell.length-1; j++) {
                for ( let k = j + 1; k < cell.length; k++) {
                    const shapeA = cell[j];
                    const shapeB = cell[k];
                    if(shapeA.id === shapeB.id) continue; // Skip self-collision
                    const pairKey = shapeA.id < shapeB.id ? 
                    `${shapeA.id}-${shapeB.id}` : 
                    `${shapeB.id}-${shapeA.id}`;
                    if (!proccessedCollisions.has(pairKey)) {
                        proccessedCollisions.add(pairKey);
                        if (CollisionResponse.handleCollision(shapeA, shapeB))

                            totalShapeCollisions++;
                            if(!(shapeA.getName() in returnValues)){
                                returnValues[shapeA.getName()] = {totalWallHits: 0, totalShapeCollisions: 0};
                            }
                            returnValues[shapeA.getName()].totalShapeCollisions += 1;
                            
                            if(!(shapeB.getName() in returnValues)){
                                returnValues[shapeB.getName()] = {totalWallHits: 0, totalShapeCollisions: 0};
                            }
                            returnValues[shapeB.getName()].totalShapeCollisions += 1;
   


                            
                        }
                    }
                }

            }
        
        this.shapes.forEach(shape => {
            // Update shape position and velocity
            shape.update(speedMultipliers[shape.getName().toLowerCase()] || 1);
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
                relDist: distance / this.container.radius, // Store distance as percentage of container radius
                velocity: { ...shape.velocity } // Store original velocity
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
            
            // Scale velocity by size ratio while maintaining speed
            shape.velocity.x *= sizeRatio;
            shape.velocity.y *= sizeRatio;

            // Scale radius if it's a Circle
            if (shape instanceof Circle) {
                shape.radius = shape.baseRadius * this.scaleFactor;
            }
            // Scale side if it's a Square
            else if (shape instanceof Square) {
                shape.side = shape.baseSide * this.scaleFactor;
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

export default CircleBoard;
