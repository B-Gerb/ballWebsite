class CircleBoard {
    constructor(canvasId) {
        // DOM elements
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Animation settings
        this.ballCount = 1;
        this.minBallSize = 5;
        this.maxBallSize = 15;
        this.minDimension = 750;
        this.minBallSpeed = 5;
        this.maxBallSpeed = 15;
        this.isRunning = true;
        this.animationFrameId = null;
        this.totalEnergy = 0;
        this.rng = new Math.seedrandom('userInput');
        
        // Create a clearly visible container
        this.container = {
            x: 0,
            y: 0,
            radius: 0,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: 5
        };
        
        // Array to store balls
        this.balls = [];
        
        // Previous container radius for resizing
        this.previousContainerRadius = 0;
    }
    
    // Initialize container
    initContainer() {
        const padding = 20;
        
        this.container = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            radius: (this.minDimension / 2) - padding,
            color: '#3498db',
            borderColor: '#2c3e50',
            thickness: 5
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
            
            // Simple placement - we'll manually prevent overlap later
            const angle = this.rng() * Math.PI * 2;
            const distance = this.rng() * (this.container.radius - radius - this.container.thickness - 5);
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
        this.ctx.lineWidth = 5;
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
    updateBall(ball, index) {
        // Calculate distance from ball center to container center
        const dx = ball.x - this.container.x;
        const dy = ball.y - this.container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Handle container collision
        if (distance + ball.radius > this.container.radius - this.container.thickness) {
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
    animate() {
        if (!this.isRunning) return;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw container
        this.drawContainer();
        
        // Update and draw all balls
        this.totalEnergy = 0; // Reset total energy for this frame
        this.balls.forEach((ball, index) => {
            this.updateBall(ball, index);
            this.drawBall(ball);
            this.totalEnergy += this.energyOfBall(ball);
        });
        
        this.animationFrameId = window.requestAnimationFrame(() => this.animate());
    }
    
    // Resize canvas to fit parent
    resizeCanvas() {
        const newWidth = this.canvas.parentElement.clientWidth;
        const newHeight = 500;
        
        // Save the state of balls relative to container
        const ballStates = this.balls.map(ball => {
            const relX = (ball.x - this.container.x) / this.container.radius;
            const relY = (ball.y - this.container.y) / this.container.radius;
            
            return {
                relX: relX,
                relY: relY,
                radius: ball.radius,
                mass: ball.mass,
                dx: ball.dx,
                dy: ball.dy,
                color: ball.color
            };
        });
        
        this.previousContainerRadius = this.container.radius;
        
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        this.initContainer();
        
        // Restore balls with proper positioning
        this.balls = ballStates.map(state => {
            const newX = this.container.x + (state.relX * this.container.radius);
            const newY = this.container.y + (state.relY * this.container.radius);
            
            let scaledDx = state.dx;
            let scaledDy = state.dy;
            
            if (this.previousContainerRadius > 0) {
                const sizeRatio = this.container.radius / this.previousContainerRadius;
                // Can apply scaling to velocity if needed
            }
            
            return {
                x: newX,
                y: newY,
                radius: state.radius,
                mass: state.mass,
                dx: scaledDx,
                dy: scaledDy,
                color: state.color
            };
        });
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
        this.resizeCanvas();
        this.initContainer();
        this.initBalls();
        this.start();
    }
}