class CircleBoard {
    constructor(canvasId) {
        // DOM elements
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Store initial dimensions
        this.initialWidth = this.canvas.width;
        this.initialHeight = this.canvas.height;
        
        // Animation settings
        this.ballCount = 1;
        this.baseMinBallSize = 5;      
        this.baseMaxBallSize = 15;
        this.baseContainerThickness = 5;
        this.baseReferenceSize = Math.min(this.initialWidth, this.initialHeight);  
        this.baseMinBallSpeed = 5;
        this.baseMaxBallSpeed = 15;
        this.isRunning = true;
        this.animationFrameId = null;
        this.totalEnergy = 0;
        this.rng = new Math.seedrandom('userInput');
        
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
        
        // Array to store balls
        this.balls = [];
        
        // Scale factor based on screen size
        this.scaleFactor = 1;
        this.lastScaleFactor = 1;
    }
    
    // Calculate scale factor based on canvas size
    calculateScaleFactor() {
        // Store the previous scale factor
        this.lastScaleFactor = this.scaleFactor;
        
        // Calculate new scale factor - simple ratio of current to initial size
        const smallerDimension = Math.min(this.canvas.width, this.canvas.height);
        this.scaleFactor = smallerDimension / this.baseReferenceSize;
        
        console.log(`Scale factor changed from ${this.lastScaleFactor.toFixed(2)} to ${this.scaleFactor.toFixed(2)}`);
        
        // Update scaled properties proportionally
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
    
    // Calculate energy of a ball
    energyOfBall(ball) {
        return 0.5 * ball.mass * (ball.dx**2 + ball.dy**2);
    }
    
    // Initialize bouncing balls within the container
    initBalls() {
        this.balls = [];
        this.totalEnergy = 0;
        
        for (let i = 0; i < this.ballCount; i++) {
            // Random size within the specified range
            const radius = this.minBallSize + (this.rng() * (this.maxBallSize - this.minBallSize));
            const speed = this.minBallSpeed + (this.rng() * (this.maxBallSpeed - this.minBallSpeed));
            
            // Simple placement
            const angle = this.rng() * Math.PI * 2;
            const distance = this.rng() * (this.container.radius - radius - this.container.thickness - 5 * this.scaleFactor);
            const x = this.container.x + Math.cos(angle) * distance;
            const y = this.container.y + Math.sin(angle) * distance;
            
            const ball = {
                x: x,
                y: y,
                radius: radius,
                mass: radius * radius * Math.PI,
                dx: (this.rng() - 0.5) * speed,
                dy: (this.rng() - 0.5) * speed,
                color: `rgb(${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)}, ${Math.floor(this.rng() * 255)})`
            };
            
            this.balls.push(ball);
            this.totalEnergy += this.energyOfBall(ball);
        }
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
    
    // Update ball positions and handle collisions
    updateBall(ball, index, shop) {
        // Calculate distance from ball center to container center
        const dx = ball.x - this.container.x;
        const dy = ball.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Handle container collision
        if (distance + ball.radius > this.container.radius - this.container.thickness) {
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
            
            // Calculate dot product of velocity and normal
            const dotProduct = ball.dx * nx + ball.dy * ny;
            
            // Apply reflection
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
        
        // Update position
        ball.x += ball.dx;
        ball.y += ball.dy;
    }
    
    // Animation loop
    animate(shop) {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw container
        this.drawContainer();
        
        // Update and draw all balls
        this.totalEnergy = 0; // Reset total energy for this frame
        this.balls.forEach((ball, index) => {
            this.updateBall(ball, index, shop);
            this.drawBall(ball);
            this.totalEnergy += this.energyOfBall(ball);
        });
        
        this.animationFrameId = window.requestAnimationFrame(() => this.animate(shop));
    }
    
    // Resize canvas to fit parent
    resizeCanvas() {
        // Calculate initial total energy before resize
        const initialTotalEnergy = this.balls.reduce((sum, ball) => sum + this.energyOfBall(ball), 0);
        
        // Save the current ball positions relative to container
        const ballStates = this.balls.map(ball => {
            return {
                relX: (ball.x - this.container.x) / this.container.radius,
                relY: (ball.y - this.container.y) / this.container.radius,
                relRadius: ball.radius / this.container.radius,
                originalDx: ball.dx,
                originalDy: ball.dy,
                color: ball.color
            };
        });
        
        // Update canvas size
        const newWidth = this.canvas.parentElement.clientWidth;
        const newHeight = this.canvas.parentElement.clientHeight;
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // Calculate new scale factor and update container
        this.calculateScaleFactor();
        this.initContainer();
        
        // Calculate the scale ratio between old and new
        const scaleRatio = this.scaleFactor / this.lastScaleFactor;
        console.log(`Scale ratio: ${scaleRatio.toFixed(4)}`);
        
        // Restore balls with proper scaling
        this.balls = ballStates.map(state => {
            // Scale position and size proportionally
            const newRadius = state.relRadius * this.container.radius;
            const newX = this.container.x + (state.relX * this.container.radius);
            const newY = this.container.y + (state.relY * this.container.radius);
            
            // Scale velocities by the same ratio (proportional scaling)
            // but multiply by energy adjustment factor
            // Energy should be multiplied by 1/scaleRatio when container shrinks
            const energyMultiplier = 1 / scaleRatio;
            
            // Calculate the velocity multiplier to achieve the desired energy effect
            // v_new = v_old * √(energyMultiplier / scaleRatio²)
            const velocityMultiplier = Math.sqrt(energyMultiplier / (scaleRatio * scaleRatio));
            
            const newDx = state.originalDx * velocityMultiplier;
            const newDy = state.originalDy * velocityMultiplier;
            
            // Calculate new mass based on radius
            const newMass = newRadius * newRadius * Math.PI;
            
            return {
                x: newX,
                y: newY,
                radius: newRadius,
                mass: newMass,
                dx: newDx,
                dy: newDy,
                color: state.color
            };
        });
        
        // Calculate new total energy after resize
        const newTotalEnergy = this.balls.reduce((sum, ball) => sum + this.energyOfBall(ball), 0);
        
        // Log energy changes
        console.log(`Energy: Initial=${initialTotalEnergy.toFixed(2)}, After=${newTotalEnergy.toFixed(2)}, Ratio=${(newTotalEnergy/initialTotalEnergy).toFixed(2)}`);
        
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
    
    // Initialize and start the simulation
    initialize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        
        // Set initial reference size based on the first initialization
        this.baseReferenceSize = Math.min(this.canvas.width, this.canvas.height);
        
        this.calculateScaleFactor();
        this.initContainer();
        this.initBalls();
        
        this.start();
        
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }
}