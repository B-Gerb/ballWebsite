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
        this.animationFrameId = null;
        this.rng = new Math.seedrandom('userInput');
        
        // Collision tracking
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.wallHitsPerSecond = 0;
        this.ballCollisionsPerSecond = 0;
        this.lastCounterReset = Date.now();
        this.counterResetInterval = 1000; // Reset counters every 1 second
        
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
    addNewBalls(amount = 1){
        this.ballCount += amount;
        for (let i = 0; i < amount; i++) {
            this.balls.push(this.createBall());
        }
    }
    
    createBall(){
        const radius = this.minBallSize + (this.rng() * (this.maxBallSize - this.minBallSize));
            const speed = this.minBallSpeed + (this.rng() * (this.maxBallSpeed - this.minBallSpeed));
            
            const angle = this.rng() * Math.PI * 2;
            const distance = this.rng() * (this.container.radius - radius - this.container.thickness - 5 * this.scaleFactor);
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
                color: `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`
            };
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
        const now = Date.now();
        const timeDelta = (now - this.lastCounterReset) / 1000; // Convert to seconds
        
        if (timeDelta > 0) {
            this.wallHitsPerSecond = this.wallHits / timeDelta;
            this.ballCollisionsPerSecond = this.ballCollisions / timeDelta;
        }
        
        this.wallHits = 0;
        this.ballCollisions = 0;
        this.lastCounterReset = now;
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
    
    //claude helped with physics
    // Update ball positions and handle collisions
    updateBall(ball, index, shop) {
        // Calculate distance from ball center to container center
        const dx = ball.x - this.container.x;
        const dy = ball.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Handle container collision
        if (distance + ball.radius > this.container.radius - this.container.thickness) {
            // Increment wall hit counter
            this.wallHits++;
            
            if (shop && typeof shop.addBalance === 'function') {
                shop.addBalance(1); // Add 1 to balance for each collision with the container
            }
            
            // Calculate normal vector from container center to ball center
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Move ball back to valid position
            const overlap = distance + ball.radius - (this.container.radius - this.container.thickness);
            ball.x -= overlap * nx;
            ball.y -= overlap * ny;
            
            const dotProduct = ball.dx * nx + ball.dy * ny;
            
            ball.dx -= 2 * dotProduct * nx;
            ball.dy -= 2 * dotProduct * ny;
        }
        
        // Check for collisions with other balls
        for (let i = 0; i < this.balls.length; i++) {
            if (i === index) continue;
            
            const otherBall = this.balls[i];
            
            const ballDx = otherBall.x - ball.x;
            const ballDy = otherBall.y - ball.y;
            const ballDistance = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
            
            const minDistance = ball.radius + otherBall.radius;
            if (ballDistance < minDistance) {
                // Increment ball collision counter (once per collision pair)
                if (i > index) {
                    this.ballCollisions++;
                }
                
                // Calculate normal vector
                let nx = ballDx / ballDistance;
                let ny = ballDy / ballDistance;
                
                const relVelX = otherBall.dx - ball.dx;
                const relVelY = otherBall.dy - ball.dy;
                
                const speedInNormal = relVelX * nx + relVelY * ny;
                
                // objects moving away
                if (speedInNormal > 0) continue;
                
                const massSum = ball.mass + otherBall.mass;
                const impulse = 2 * speedInNormal / massSum;

                ball.dx += nx * impulse * otherBall.mass;
                ball.dy += ny * impulse * otherBall.mass;
                otherBall.dx -= nx * impulse * ball.mass;
                otherBall.dy -= ny * impulse * ball.mass;

                const overlap = minDistance - ballDistance;
                const moveRatio1 = otherBall.mass / massSum;
                const moveRatio2 = ball.mass / massSum;
                
                ball.x -= nx * overlap * moveRatio1;
                ball.y -= ny * overlap * moveRatio1;
                otherBall.x += nx * overlap * moveRatio2;
                otherBall.y += ny * overlap * moveRatio2;
            }
        }
        
        ball.x += ball.dx;
        ball.y += ball.dy;
    }
    
    animate(shop) {
        if (!this.isRunning) return;
        
        const now = Date.now();
        
        // Reset counters every second
        if (now - this.lastCounterReset >= this.counterResetInterval) {
            this.resetCollisionCounters();
        }
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.drawContainer();
        
        // Update and draw all balls
        this.balls.forEach((ball, index) => {
            this.updateBall(ball, index, shop);
            this.drawBall(ball);
        });
        

        
        this.animationFrameId = window.requestAnimationFrame(() => this.animate(shop));
    }
    
    // Resize canvas to fit parent
    //claude helped
    resizeCanvas() {
        // Save the current ball positions relative to container
        const ballStates = this.balls.map(ball => {
            return {
                relX: (ball.x - this.container.x) / this.container.radius,
                relY: (ball.y - this.container.y) / this.container.radius,
                baseRadius: ball.baseRadius, // Keep original base radius
                mass: ball.mass, // Keep mass constant
                originalDx: ball.dx,
                originalDy: ball.dy,
                color: ball.color
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
                color: state.color
            };
        });

        
        // Force a redraw
        if (this.isRunning) {
            this.draw();
        } else {
            // Even if not running, draw a frame to show the current state
            this.draw();
        }
    }
    
    // Draw a single frame without animation
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawContainer();
        this.balls.forEach(ball => this.drawBall(ball));
        
        // Draw collision rates on canvas
        this.ctx.font = '14px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText(`Wall hits/sec: ${this.wallHitsPerSecond.toFixed(1)}`, 10, 20);
        this.ctx.fillText(`Ball collisions/sec: ${this.ballCollisionsPerSecond.toFixed(1)}`, 10, 40);
    }
    
    // Start the animation
    start() {
        this.isRunning = true;
        this.animate();
    }
    
    // Pause the animation
    pause() {
        this.isRunning = false;
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
        }
    }
    
    // Toggle animation state
    toggleAnimation() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
        return this.isRunning;
    }
    
    // Get the current wall hits per second
    getWallHitsPerSecond() {
        return this.wallHitsPerSecond;
    }
    
    // Get the current ball collisions per second
    getBallCollisionsPerSecond() {
        return this.ballCollisionsPerSecond;
    }
    
    // Initialize and start the simulation
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
        
        this.start();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
}