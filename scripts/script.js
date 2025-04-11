document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const canvas = document.getElementById('bouncingBallsCanvas');
    const ctx = canvas.getContext('2d');
    const ballCountSlider = document.getElementById('ballCount');
    const ballCountValue = document.getElementById('ballCountValue');
    const ballSizeMinSlider = document.getElementById('ballSizeMin');
    const ballSizeMaxSlider = document.getElementById('ballSizeMax');
    const ballSizeValue = document.getElementById('ballSizeValue');

    const largeBallSize = document.getElementById('largeBallMin');
    const largeBallSizeSlider = document.getElementById('largeBallMin');
    const largeBallSizeValue = document.getElementById('largeBallSizeValue');


    const toggleAnimationButton = document.getElementById('toggleAnimation');

    const smallBallSpeedMinSlider = document.getElementById('ballSpeedMin');
    const smallBallSpeedMaxSlider = document.getElementById('ballSpeedMax');
    const smallBallSpeedValue = document.getElementById('smallBallSpeedValue');

    const totalSpeedValue = document.getElementById('totalSpeed');

    
    // Animation settings
    let ballCount = parseInt(ballCountSlider.value);
    let minBallSize = parseInt(ballSizeMinSlider.value);
    let maxBallSize = parseInt(ballSizeMaxSlider.value);
    let minDimension = parseInt(largeBallSizeSlider.value);
    let minBallSpeed = parseInt(smallBallSpeedMinSlider.value);
    let maxBallSpeed = parseInt(smallBallSpeedMaxSlider.value);
    let isRunning = true;
    let animationFrameId;
    let totalSpeed = 0;
    
    // Create a clearly visible container
    let container = {
        x: 0,
        y: 0,
        radius: 0,
        color: '#3498db',  // Solid blue color
        borderColor: '#2c3e50'  // Dark border
    };
    
    // Array to store balls
    let balls = [];
    
    // Initialize container
    function initContainer() {

        const padding = 20;
        
        container = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            radius: (minDimension / 2) - padding,
            color: '#3498db',  // Solid blue color
            borderColor: '#2c3e50',  // Dark border
            thickness: 5 
        };
    }
    
    // Initialize bouncing balls within the container
    function initBalls() {
        balls = [];
        
        for (let i = 0; i < ballCount; i++) {
            // Random size within the specified range
            const radius = minBallSize + (Math.random() * (maxBallSize - minBallSize));
            const speed = minBallSpeed + (Math.random() * (maxBallSpeed - minBallSpeed));
            
            // Simple placement - we'll manually prevent overlap later
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * (container.radius - radius - container.thickness - 5);
            const x = container.x + Math.cos(angle) * distance;
            const y = container.y + Math.sin(angle) * distance;
            
            balls.push({
                x: x,
                y: y,
                radius: radius,
                dx: (Math.random() - 0.5) * speed,
                dy: (Math.random() - 0.5) * speed,
                color: `rgb(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)})`
            });
            totalSpeed+=(balls[balls.length - 1].dx**2 + balls[balls.length - 1].dy**2)**0.5;
        }
    }
    
    // Draw the container
    function drawContainer() {
        // Draw a solid border first
        ctx.beginPath();
        ctx.arc(container.x, container.y, container.radius, 0, Math.PI * 2);
        ctx.fillStyle = container.color;
        ctx.fill();
        ctx.strokeStyle = container.borderColor;
        ctx.lineWidth = 5;
        ctx.stroke();
        ctx.closePath();
        
        // Draw a white interior to make it look like a ring
        ctx.beginPath();
        ctx.arc(container.x, container.y, container.radius - container.thickness, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.closePath();
    }
    
    // Draw a bouncing ball
    function drawBall(ball) {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = ball.color;
        ctx.fill();
        ctx.closePath();
    }
    
    // Update ball positions and handle collisions
    function updateBall(ball, index) {
        // Calculate distance from ball center to container center
        const dx = ball.x - container.x;
        const dy = ball.y - container.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance + ball.radius > container.radius - container.thickness) {
            // Calculate normal vector from container center to ball center
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Move ball back to valid position
            const overlap = distance + ball.radius - (container.radius - container.thickness);
            ball.x -= overlap * nx;
            ball.y -= overlap * ny;
            
            // Calculate dot product of velocity and normal
            const dotProduct = ball.dx * nx + ball.dy * ny;
            
            // Apply reflection
            ball.dx -= 2 * dotProduct * nx;
            ball.dy -= 2 * dotProduct * ny;
            

        }
        
        // Check for collisions with other balls
        for (let i = 0; i < balls.length; i++) {
            // Skip checking against self
            if (i === index) continue;
            
            const otherBall = balls[i];
            
            // Calculate distance between balls
            const ballDx = otherBall.x - ball.x;
            const ballDy = otherBall.y - ball.y;
            const ballDistance = Math.sqrt(ballDx * ballDx + ballDy * ballDy);
            
            // Check if balls are colliding
            const minDistance = ball.radius + otherBall.radius;
            if (ballDistance < minDistance) {
                // Calculate normal vector
                let nx = ballDx / ballDistance;
                let ny = ballDy / ballDistance;
                
                // Calculate relative velocity
                const relVelX = otherBall.dx - ball.dx;
                const relVelY = otherBall.dy - ball.dy;
                
                // Calculate relative velocity in terms of the normal direction
                const speedInNormal = relVelX * nx + relVelY * ny;
                
                // Do not resolve if objects are moving away from each other
                if (speedInNormal > 0) continue;
                
                // Calculate impulse scalar
                // For simplicity, assume equal masses
                
                // Apply impulse
                ball.dx += nx*speedInNormal;
                ball.dy += ny*speedInNormal;
                otherBall.dx -= nx*speedInNormal;
                otherBall.dy -= ny*speedInNormal;

                // Resolve overlap
                const overlap = minDistance - ballDistance;
                const moveX = nx * overlap * 0.5;
                const moveY = ny * overlap * 0.5;
                
                ball.x -= moveX;
                ball.y -= moveY;
                otherBall.x += moveX;
                otherBall.y += moveY;
            }
        }
        
        // Update position
        ball.x += ball.dx;
        ball.y += ball.dy;
        totalSpeed+=(ball.dx**2 + ball.dy**2)**0.5;


    }
    
    // Animation loop
    function animate() {
        if (!isRunning) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw container
        drawContainer();
        
        // Update and draw all balls
        totalSpeed = 0; // Reset total speed for this frame
        balls.forEach((ball, index) => {
            updateBall(ball, index);
            drawBall(ball);
        });
        setSpeedDisplay();
        
        animationFrameId = window.requestAnimationFrame(animate);
    }
    function setSpeedDisplay() {
        totalSpeedValue.textContent = `Total Speed: ${totalSpeed.toFixed(2)}`;

    }

    // Resize canvas to fit parent
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = 500;
        
        // Initialize container AFTER setting canvas dimensions
        initContainer();
        
        // Initialize balls AFTER container is initialized
        initBalls();

        setSpeedDisplay();
    }
    
    // Handle the min and max ball size sliders
    ballSizeMinSlider.addEventListener('input', () => {
        minBallSize = parseInt(ballSizeMinSlider.value);
        
        // Ensure min doesn't exceed max
        if (minBallSize > maxBallSize) {
            maxBallSize = minBallSize;
            ballSizeMaxSlider.value = minBallSize;
        }
        
        updateBallSizeDisplay();
        initBalls();
        setSpeedDisplay();
    });
    
    ballSizeMaxSlider.addEventListener('input', () => {
        maxBallSize = parseInt(ballSizeMaxSlider.value);
        
        // Ensure max doesn't go below min
        if (maxBallSize < minBallSize) {
            minBallSize = maxBallSize;
            ballSizeMinSlider.value = maxBallSize;
        }
        
        updateBallSizeDisplay();
        initBalls();
        setSpeedDisplay();
    });
    
    function updateBallSizeDisplay() {
        ballSizeValue.textContent = `${minBallSize}-${maxBallSize}`;
        
        // Update the slider track visual
        const percentage1 = ((minBallSize - ballSizeMinSlider.min) / (ballSizeMinSlider.max - ballSizeMinSlider.min)) * 100;
        const percentage2 = ((maxBallSize - ballSizeMaxSlider.min) / (ballSizeMaxSlider.max - ballSizeMaxSlider.min)) * 100;
        const track = document.querySelector('.range-slider-track');
        
        if (track) {
            track.style.background = `linear-gradient(to right, #ddd ${percentage1}%, #3498db ${percentage1}%, #3498db ${percentage2}%, #ddd ${percentage2}%)`;
        }
    }
    smallBallSpeedMinSlider.addEventListener('input', () => {
        minBallSpeed = parseInt(smallBallSpeedMinSlider.value);
        
        // Ensure min doesn't exceed max
        if (minBallSpeed > maxBallSpeed) {
            maxBallSpeed = minBallSpeed;
            smallBallSpeedMaxSlider.value = minBallSpeed;
        }
        smallBallSpeedValue.textContent = `${minBallSpeed}-${maxBallSpeed}`;

        updateBallSpeedDisplay();
        initBalls();
        setSpeedDisplay();
    });
    smallBallSpeedMaxSlider.addEventListener('input', () => {
        maxBallSpeed = parseInt(smallBallSpeedMaxSlider.value);
        
        // Ensure max doesn't go below min
        if (maxBallSpeed < minBallSpeed) {
            minBallSpeed = maxBallSpeed;
            smallBallSpeedMinSlider.value = maxBallSpeed;
        }
        smallBallSpeedValue.textContent = `${minBallSpeed}-${maxBallSpeed}`;
        updateBallSpeedDisplay();
        initBalls();
        setSpeedDisplay();
    });
    function updateBallSpeedDisplay(){
        smallBallSpeedMaxSlider.textContent = `${minBallSize}-${maxBallSize}`;
        
        // Update the slider track visual
        const percentage1 = ((minBallSize - smallBallSpeedMinSlider.min) / (smallBallSpeedMinSlider.max - smallBallSpeedMinSlider.min)) * 100;
        const percentage2 = ((maxBallSize - smallBallSpeedMaxSlider.min) / (smallBallSpeedMaxSlider.max - smallBallSpeedMaxSlider.min)) * 100;
        const track = document.querySelector('.range-slider-track');
        
        if (track) {
            track.style.background = `linear-gradient(to right, #ddd ${percentage1}%, #3498db ${percentage1}%, #3498db ${percentage2}%, #ddd ${percentage2}%)`;
        }

    }

    
    // Event listeners
    ballCountSlider.addEventListener('input', () => {
        ballCount = parseInt(ballCountSlider.value);
        ballCountValue.textContent = ballCount;
        initBalls();
        setSpeedDisplay();
    });
    
    largeBallSize.addEventListener('input', () => {
        minDimension = parseInt(largeBallSizeSlider.value);
        largeBallSizeValue.textContent = minDimension;
        initContainer();
        initBalls();
        setSpeedDisplay();
    });
    
    toggleAnimationButton.addEventListener('click', () => {
        isRunning = !isRunning;
        toggleAnimationButton.textContent = isRunning ? 'Pause' : 'Play';
        
        if (isRunning) {
            animate();
        } else {
            window.cancelAnimationFrame(animationFrameId);
        }
    });
    
    window.addEventListener('resize', resizeCanvas);
    
    // Initial setup
    resizeCanvas();
    updateBallSizeDisplay(); // Initialize the ball size display
    animate();
    
    // Force a redraw after a short delay to ensure everything is rendered
    setTimeout(() => {
        drawContainer();
        balls.forEach(drawBall);
    }, 500);
});