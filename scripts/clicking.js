// Simple clickable circle class
class ClickerObject {
    constructor(canvasId) {
        // Create or get the canvas
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            document.body.appendChild(this.canvas);
        }
        
        // Get drawing context
        this.ctx = this.canvas.getContext('2d');
        
        // Properties for the clickable object
        this.color = '#4CAF50';
        this.hoverColor = '#3E8E41';
        this.clickColor = '#2E6830';
        this.currentColor = this.color;
        
        // Click state
        this.clickCount = 0;
        
        // Animation properties
        this.clickAnimationDuration = 300; // ms
        this.clickAnimationStart = 0;
        this.isAnimating = false;
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.startAnimationLoop();
    }

    
    // Set up event listeners for interaction
    setupEventListeners() {
        // Mouse up and click handling

        this.canvas.addEventListener('mouseup', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (this.isPointInClickArea(x, y)) {

                this.handleClick();
            }
            
        });
    }
    
    // Check if a point is inside the clickable area
    isPointInClickArea(x, y) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        return distance <= radius;
    }
    

    
    // Handle a click on the object - can be overridden by Server class
    handleClick() {
        this.clickCount++;
        
        // Trigger click animation
        this.isAnimating = true;
        this.clickAnimationStart = performance.now();
        
        // The Server class will extend this functionality by adding callback
    }
    
    // Set callback for clicks
    setClickCallback(callback) {
        this.clickCallback = callback;
    }
    
    // Draw the clickable object on the canvas
    draw() {
        if (!this.ctx) return;
        
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate center and radius
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        let radius = Math.min(this.canvas.width, this.canvas.height) * 0.3;
        
        // Handle click animation
        if (this.isAnimating) {
            const now = performance.now();
            const elapsed = now - this.clickAnimationStart;
            const progress = Math.min(elapsed / this.clickAnimationDuration, 1);
            
            // Scale down and then back up
            const scale = progress < 0.5 
                ? 1 - 0.2 * (progress * 2) 
                : 0.8 + 0.2 * ((progress - 0.5) * 2);
            
            radius *= scale;
            
            // End animation when complete
            if (progress >= 1) {
                this.isAnimating = false;
            }
        }
        
        // Draw the circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.currentColor;
        this.ctx.fill();
        
        // Draw border
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();
        
        // Draw text
        this.ctx.font = 'bold 18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText('CLICK ME', centerX, centerY);
    }
    
    // Animation loop for the clicker
    startAnimationLoop() {
        const animate = () => {
            this.draw();
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
    }
}