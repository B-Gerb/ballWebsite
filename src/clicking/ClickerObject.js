import seedrandom from 'seedrandom';

/** Fixed logical drawing size; CSS scales the element, DPR only adds sharpness. */
export const CLICKER_LOGICAL_WIDTH = 300;
export const CLICKER_LOGICAL_HEIGHT = 180;

class ClickerObject {
    constructor(canvasElement) {
        // Use the provided canvas element directly
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.width = CLICKER_LOGICAL_WIDTH;
        this.height = CLICKER_LOGICAL_HEIGHT;
        this.syncCanvasResolution();
        this.seed = seedrandom();;
        
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
        this.animationFrameId = null;
        this.handleMouseUp = this.handleMouseUp.bind(this);
        
        // Set up event listeners
        this.setupEventListeners();
        
    }

    
    // Set up event listeners for interaction
    setupEventListeners() {
        // Mouse up and click handling

        this.canvas.addEventListener('mouseup', this.handleMouseUp);
    }

    /** Match the backing store to devicePixelRatio; logical size never changes. */
    syncCanvasResolution() {
        const dpr = Math.min(Math.max(globalThis.devicePixelRatio || 1, 1), 3);
        const backingWidth = Math.round(this.width * dpr);
        const backingHeight = Math.round(this.height * dpr);
        if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
            this.canvas.width = backingWidth;
            this.canvas.height = backingHeight;
        }
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Convert a pointer position to logical canvas coordinates. */
    toLogical(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (this.width / (rect.width || this.width)),
            y: (clientY - rect.top) * (this.height / (rect.height || this.height)),
        };
    }

    handleMouseUp(e) {
            const { x, y } = this.toLogical(e.clientX, e.clientY);
            if (this.isPointInClickArea(x, y)) {

                this.handleClick();
            }
    }
    setSeed(seed) { 
        this.seed = seed;
    }

    
    // Check if a point is inside the clickable area
    isPointInClickArea(x, y) {
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = Math.min(this.width, this.height) * 0.3;
        
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
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Calculate center and radius
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        let radius = Math.min(this.width, this.height) * 0.3;
        
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

    }
    
    // Animation loop for the clicker
    startAnimationLoop() {
        if (this.animationFrameId) return;

        const animate = () => {
            this.draw();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        this.animationFrameId = requestAnimationFrame(animate);
    }

    stopAnimationLoop() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    destroy() {
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    }
}
export default ClickerObject;
