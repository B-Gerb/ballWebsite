class Server {
    constructor(canvasId) {
        // Create instances of the CircleBoard and Shop
        this.circleBoard = new CircleBoard(canvasId);
        this.shop = new Shop();
        
        // DOM elements
        this.elements = {
            // Sliders
            ballCountSlider: document.getElementById('ballCount'),
            ballCountValue: document.getElementById('ballCountValue'),
            ballSizeMinSlider: document.getElementById('ballSizeMin'),
            ballSizeMaxSlider: document.getElementById('ballSizeMax'),
            ballSizeValue: document.getElementById('ballSizeValue'),
            largeBallSizeSlider: document.getElementById('largeBallMin'),
            largeBallSizeValue: document.getElementById('largeBallSizeValue'),
            smallBallSpeedMinSlider: document.getElementById('ballSpeedMin'),
            smallBallSpeedMaxSlider: document.getElementById('ballSpeedMax'),
            smallBallSpeedValue: document.getElementById('smallBallSpeedValue'),
            
            // Buttons
            toggleAnimationButton: document.getElementById('toggleAnimation'),
            
            // Display elements
            totalEnergyValue: document.getElementById('totalBallEnergy'),
            shopBalanceDisplay: document.getElementById('shopBalance')
        };
        
        // Initialize the values from DOM elements if they exist
        this.initializeFromDOM();
        
        // Initialize the event listeners
        this.setupEventListeners();
    }
    
    // Initialize values from DOM elements
    initializeFromDOM() {
        if (this.elements.ballCountSlider) {
            this.circleBoard.ballCount = parseInt(this.elements.ballCountSlider.value);
        }
        
        if (this.elements.ballSizeMinSlider) {
            this.circleBoard.minBallSize = parseInt(this.elements.ballSizeMinSlider.value);
        }
        
        if (this.elements.ballSizeMaxSlider) {
            this.circleBoard.maxBallSize = parseInt(this.elements.ballSizeMaxSlider.value);
        }
        
        if (this.elements.largeBallSizeSlider) {
            this.circleBoard.minDimension = parseInt(this.elements.largeBallSizeSlider.value);
        }
        
        if (this.elements.smallBallSpeedMinSlider) {
            this.circleBoard.minBallSpeed = parseInt(this.elements.smallBallSpeedMinSlider.value);
        }
        
        if (this.elements.smallBallSpeedMaxSlider) {
            this.circleBoard.maxBallSpeed = parseInt(this.elements.smallBallSpeedMaxSlider.value);
        }
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Toggle animation button
        if (this.elements.toggleAnimationButton) {
            this.elements.toggleAnimationButton.addEventListener('click', () => {
                const isRunning = this.circleBoard.toggleAnimation();
                this.elements.toggleAnimationButton.textContent = isRunning ? 'Pause' : 'Play';
            });
        }
        
        // Window resize
        window.addEventListener('resize', () => {
            this.circleBoard.resizeCanvas();
        });
        
        const originalAnimate = this.circleBoard.animate;
        this.circleBoard.animate = (shop) => {
            originalAnimate.call(this.circleBoard, this.shop);
            
            this.updateEnergyDisplay();
            this.updateBalanceDisplay();
        };
    }
    
    // Update the energy display
    updateEnergyDisplay() {
        if (this.elements.totalEnergyValue) {
            this.elements.totalEnergyValue.textContent = this.circleBoard.totalEnergy.toFixed(2);
        }
    }
    
    // Update the balance display
    updateBalanceDisplay() {
        if (this.elements.shopBalanceDisplay) {
            this.elements.shopBalanceDisplay.textContent = this.shop.balance.toFixed(2);
        }
    }
    
    // Buy an item from the shop
    buyItem(itemName, amount = 1) {
        const item = this.shop.getItem(itemName);
        
        if (!item) {
            console.error(`Item ${itemName} not found`);
            return false;
        }
        
        const success = this.shop.buyItem(item, amount);
        
        if (success) {
            this.applyItemEffect(item);
            this.updateBalanceDisplay();
            this.saveGameState();
        }
        
        return success;
    }
    
    // Apply the effect of an item to the CircleBoard
    applyItemEffect(item) {
        switch (item.name) {
            case "Add Ball":
                this.circleBoard.ballCount = item.getValue();
                if (this.elements.ballCountSlider) {
                    this.elements.ballCountSlider.value = this.circleBoard.ballCount;
                }
                if (this.elements.ballCountValue) {
                    this.elements.ballCountValue.textContent = this.circleBoard.ballCount;
                }
                break;
                
            case "Increase Ball Size Range Min":
                this.circleBoard.minBallSize = item.getValue();
                if (this.elements.ballSizeMinSlider) {
                    this.elements.ballSizeMinSlider.value = this.circleBoard.minBallSize;
                }
                if (this.elements.ballSizeValue) {
                    this.elements.ballSizeValue.textContent = this.circleBoard.minBallSize;
                }
                break;
                
            case "Increase Ball Size Range Max":
                this.circleBoard.maxBallSize = item.getValue();
                if (this.elements.ballSizeMaxSlider) {
                    this.elements.ballSizeMaxSlider.value = this.circleBoard.maxBallSize;
                }
                if (this.elements.ballSizeValue) {
                    this.elements.ballSizeValue.textContent = this.circleBoard.maxBallSize;
                }
                break;
                
            case "Increase Ball Speed Min":
                this.circleBoard.minBallSpeed = item.getValue();
                if (this.elements.smallBallSpeedMinSlider) {
                    this.elements.smallBallSpeedMinSlider.value = this.circleBoard.minBallSpeed;
                }
                if (this.elements.smallBallSpeedValue) {
                    this.elements.smallBallSpeedValue.textContent = this.circleBoard.minBallSpeed;
                }
                break;
                
            case "Increase Ball Speed Max":
                this.circleBoard.maxBallSpeed = item.getValue();
                if (this.elements.smallBallSpeedMaxSlider) {
                    this.elements.smallBallSpeedMaxSlider.value = this.circleBoard.maxBallSpeed;
                }
                if(this.elements.smallBallSpeedValue) {
                    this.elements.smallBallSpeedValue.textContent = this.circleBoard.maxBallSpeed;
                }
                break;
                
            case "Decrease Large Circle Size":
                this.circleBoard.minDimension = item.getValue();
                if (this.elements.largeBallSizeSlider) {
                    this.elements.largeBallSizeSlider.value = this.circleBoard.minDimension;
                }
                if (this.elements.largeBallSizeValue) {
                    this.elements.largeBallSizeValue.textContent = this.circleBoard.minDimension;
                }
                break;
        }
        
        // Reinitialize the CircleBoard with new values
        this.circleBoard.initContainer();
        this.circleBoard.initBalls();
    }
    
    // Save game state to localStorage
    saveGameState() {
        const gameState = {
            circleBoard: {
                ballCount: this.circleBoard.ballCount,
                minBallSize: this.circleBoard.minBallSize,
                maxBallSize: this.circleBoard.maxBallSize,
                minDimension: this.circleBoard.minDimension,
                minBallSpeed: this.circleBoard.minBallSpeed,
                maxBallSpeed: this.circleBoard.maxBallSpeed,
                totalEnergy: this.circleBoard.totalEnergy,
                balls: this.circleBoard.balls.map(ball => ({
                    size: ball.radius,
                    position: {
                        x: ball.x,
                        y: ball.y
                    },
                    velocity: {
                        x: ball.dx,
                        y: ball.dy
                    },
                    color: ball.color,
                    mass: ball.mass
                })),
                container: {
                    x: this.circleBoard.container.x,
                    y: this.circleBoard.container.y,
                    radius: this.circleBoard.container.radius,
                    thickness: this.circleBoard.container.thickness,
                    color: this.circleBoard.container.color,
                    borderColor: this.circleBoard.container.borderColor
                }
            },
            shop: {
                balance: this.shop.balance,
                items: this.shop.items.map(item => ({
                    name: item.name,
                    price: item.price,
                    level: item.level
                }))
            }
        };
        
        localStorage.setItem('circleBoardGameState', JSON.stringify(gameState));
        return gameState;
    }
    
    // Load game state from localStorage
    loadGameState() {
        const savedState = localStorage.getItem('circleBoardGameState');
        
        if (!savedState) {
            console.log('No saved game state found');
            return false;
        }
        
        try {
            const gameState = JSON.parse(savedState);
            
            // Load CircleBoard state
            if (gameState.circleBoard) {
                this.circleBoard.ballCount = gameState.circleBoard.ballCount || this.circleBoard.ballCount;
                this.circleBoard.minBallSize = gameState.circleBoard.minBallSize || this.circleBoard.minBallSize;
                this.circleBoard.maxBallSize = gameState.circleBoard.maxBallSize || this.circleBoard.maxBallSize;
                this.circleBoard.minDimension = gameState.circleBoard.minDimension || this.circleBoard.minDimension;
                this.circleBoard.minBallSpeed = gameState.circleBoard.minBallSpeed || this.circleBoard.minBallSpeed;
                this.circleBoard.maxBallSpeed = gameState.circleBoard.maxBallSpeed || this.circleBoard.maxBallSpeed;
                this.circleBoard.totalEnergy = gameState.circleBoard.totalEnergy || this.circleBoard.totalEnergy;
                
                // Initialize container first
                this.circleBoard.canvas.width = this.circleBoard.canvas.parentElement.clientWidth;
                this.circleBoard.canvas.height = this.circleBoard.canvas.parentElement.clientHeight;
                this.circleBoard.calculateScaleFactor();
                this.circleBoard.initContainer();
                
                // Load container properties if they exist
                if (gameState.circleBoard.container) {
                    // Only override specific container properties, keeping the initialized structure
                    this.circleBoard.container.color = gameState.circleBoard.container.color || this.circleBoard.container.color;
                    this.circleBoard.container.borderColor = gameState.circleBoard.container.borderColor || this.circleBoard.container.borderColor;
                }
                
                // Load balls properly
                if (gameState.circleBoard.balls && Array.isArray(gameState.circleBoard.balls)) {
                    this.circleBoard.balls = gameState.circleBoard.balls.map(ballData => ({
                        x: ballData.position.x,
                        y: ballData.position.y,
                        radius: ballData.size,
                        mass: ballData.mass,
                        dx: ballData.velocity.x,
                        dy: ballData.velocity.y,
                        color: ballData.color
                    }));
                } else {
                    // If no saved balls, initialize them
                    this.circleBoard.initBalls();
                }
                
                // Update UI sliders
                if (this.elements.ballCountSlider) {
                    this.elements.ballCountSlider.value = this.circleBoard.ballCount;
                }
                if (this.elements.ballSizeMinSlider) {
                    this.elements.ballSizeMinSlider.value = this.circleBoard.minBallSize;
                }
                if (this.elements.ballSizeMaxSlider) {
                    this.elements.ballSizeMaxSlider.value = this.circleBoard.maxBallSize;
                }
                if (this.elements.largeBallSizeSlider) {
                    this.elements.largeBallSizeSlider.value = this.circleBoard.minDimension;
                }
                if (this.elements.smallBallSpeedMinSlider) {
                    this.elements.smallBallSpeedMinSlider.value = this.circleBoard.minBallSpeed;
                }
                if (this.elements.smallBallSpeedMaxSlider) {
                    this.elements.smallBallSpeedMaxSlider.value = this.circleBoard.maxBallSpeed;
                }
                
                // Update display values
                if (this.elements.ballCountValue) {
                    this.elements.ballCountValue.textContent = this.circleBoard.ballCount;
                }
                if (this.elements.ballSizeValue) {
                    this.elements.ballSizeValue.textContent = `${this.circleBoard.minBallSize} - ${this.circleBoard.maxBallSize}`;
                }
                if (this.elements.largeBallSizeValue) {
                    this.elements.largeBallSizeValue.textContent = this.circleBoard.minDimension;
                }
                if (this.elements.smallBallSpeedValue) {
                    this.elements.smallBallSpeedValue.textContent = `${this.circleBoard.minBallSpeed} - ${this.circleBoard.maxBallSpeed}`;
                }
            }
            
            // Load Shop state
            if (gameState.shop) {
                this.shop.balance = gameState.shop.balance || 0;
                
                if (gameState.shop.items && Array.isArray(gameState.shop.items)) {
                    gameState.shop.items.forEach(savedItem => {
                        const item = this.shop.getItem(savedItem.name);
                        if (item) {
                            item.price = savedItem.price;
                            item.level = savedItem.level;
                        }
                    });
                }
                
                this.updateBalanceDisplay();
            }
            
            // Start animation
            this.circleBoard.start();
            
            console.log('Game state loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }
    
    // Reset the game state
    resetGameState() {
        // Reset CircleBoard
        this.circleBoard.ballCount = 1;
        this.circleBoard.minBallSize = 5;
        this.circleBoard.maxBallSize = 15;
        this.circleBoard.minDimension = 750;
        this.circleBoard.minBallSpeed = 5;
        this.circleBoard.maxBallSpeed = 15;
        
        // Reset Shop
        this.shop.balance = 0;
        this.shop.items.forEach(item => {
            item.level = 1;
            item.price = item.name === "Add Ball" ? 1 : 
                        (item.name.includes("Ball Size") ? 20 : 
                        (item.name.includes("Ball Speed") ? 30 : 50));
        });
        
        // Update UI values
        if (this.elements.ballCountSlider) {
            this.elements.ballCountSlider.value = this.circleBoard.ballCount;
        }
        if (this.elements.ballCountValue) {
            this.elements.ballCountValue.textContent = this.circleBoard.ballCount;
        }
        if (this.elements.ballSizeMinSlider) {
            this.elements.ballSizeMinSlider.value = this.circleBoard.minBallSize;
        }
        if (this.elements.ballSizeMaxSlider) {
            this.elements.ballSizeMaxSlider.value = this.circleBoard.maxBallSize;
        }
        if (this.elements.largeBallSizeSlider) {
            this.elements.largeBallSizeSlider.value = this.circleBoard.minDimension;
        }
        if (this.elements.largeBallSizeValue) {
            this.elements.largeBallSizeValue.textContent = this.circleBoard.minDimension;
        }
        if (this.elements.smallBallSpeedMinSlider) {
            this.elements.smallBallSpeedMinSlider.value = this.circleBoard.minBallSpeed;
        }
        if (this.elements.smallBallSpeedMaxSlider) {
            this.elements.smallBallSpeedMaxSlider.value = this.circleBoard.maxBallSpeed;
        }
        
        this.updateBalanceDisplay();
        
        // Reinitialize
        this.circleBoard.initContainer();
        this.circleBoard.initBalls();
        
        // Remove from localStorage
        localStorage.removeItem('circleBoardGameState');
        
        console.log('Game state reset successfully');
    }
    
    // Initialize the game
    initialize() {
        // Try to load saved state
        if (!this.loadGameState()) {
            // No saved state, initialize with defaults
            this.circleBoard.initialize();
        }
        
        // Update displays
        this.updateEnergyDisplay();
        this.updateBalanceDisplay();
        
        // Force a redraw after a short delay to ensure everything is rendered
        setTimeout(() => {
            this.circleBoard.drawContainer();
            this.circleBoard.balls.forEach(ball => this.circleBoard.drawBall(ball));
        }, 500);
    }
}