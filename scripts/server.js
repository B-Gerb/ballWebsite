class Server {
    constructor(canvasId) {
        // Create instances of the CircleBoard and Shop
        this.circleBoard = new CircleBoard(canvasId);
        this.baseUpgradeShop = new baseUpgradeShop();
        
        // DOM elements
        this.elements = {
            // Display elements
            offWallB: document.getElementById('offWallB'),
            offBallB: document.getElementById('offBallB'),
            shopBalanceDisplay: document.getElementById('shopBalance'),
            
            // Container
            shopContainer: document.getElementById('shopContainer'),

            pauseButton: document.getElementById('pauseButton'),
            resetButton: document.getElementById('resetButton'),
            saveButton: document.getElementById('saveButton'),
        };
        
        // Animation and physics timing
        this.animationFrameId = null;
        this.physicsUpdateInterval = 1000 / 60; // 60 fps
        this.lastPhysicsUpdate = 0;
        this.physicsTimerId = null;
        
        // Initialize the event listeners
        this.setupEventListeners();
    }

    // Setup event listeners for pause, reset and save
    setupMenuButtons() {
        if (this.elements.pauseButton) {
            this.elements.pauseButton.addEventListener('click', () => {
                console.log("pauseButton");
                const isRun = this.toggleAnimation();
                const buttonText = isRun ? 'Pause' : 'Resume';
                this.elements.pauseButton.textContent = buttonText;
            });
        }
        
        if (this.elements.resetButton) {
            this.elements.resetButton.addEventListener('click', () => {
                popUps({
                    message: 'Are you sure you want to reset the game?',
                    buttons: [
                        {
                            text: 'Yes',
                            function: () => {
                                this.resetGameState();
                                this.baseUpgradeShop.resetShop();
                            }
                        },
                        {
                            text: 'No',
                            function: () => {
                            }
                        }
                    ]
                }, false, 'center', true);
            });
        }

        if (this.elements.saveButton) {
            this.elements.saveButton.addEventListener('click', () => {
                this.saveGameState();
            });
        }
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => {
            this.circleBoard.resizeCanvas();
        });
    }
    
    // Start animation loop
    startAnimationLoop() {
        if (this.animationFrameId) return; // Already running
        
        const animate = () => {
            if (!this.circleBoard.isRunning) return;
            
            // Render the current state
            this.circleBoard.render();
            
            // Continue animation
            this.animationFrameId = window.requestAnimationFrame(animate);
        };
        
        // Start the animation loop
        this.animationFrameId = window.requestAnimationFrame(animate);
    }
    
    // Stop animation loop
    stopAnimationLoop() {
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    // Start physics update loop
    startPhysicsLoop() {
        if (this.physicsTimerId) return; // Already running
        
        this.lastPhysicsUpdate = performance.now();
        
        // Setup regular physics updates
        this.physicsTimerId = setInterval(() => {
            this.updatePhysics();
        }, this.physicsUpdateInterval);
    }
    
    // Stop physics update loop
    stopPhysicsLoop() {
        if (this.physicsTimerId) {
            clearInterval(this.physicsTimerId);
            this.physicsTimerId = null;
        }
    }
    
    // Update physics - called on a fixed interval
    updatePhysics() {
        if (!this.circleBoard.isRunning) return;
        
        // Update physics
        const stats = this.circleBoard.updatePhysics();
        
        // Add wall hits to balance
        if (stats.totalWallHits > 0) {
            this.baseUpgradeShop.addBalance(stats.totalWallHits);
        }
        
        // Update displays
        this.updateCollisionDisplay();
        this.updateBalanceDisplay();
        
        // Reset counters every second
        const now = Date.now();
        if (now - this.circleBoard.lastCounterReset >= this.circleBoard.counterResetInterval) {
            const timeDelta = (now - this.circleBoard.lastCounterReset) / 1000;
            
            if (timeDelta > 0) {
                this.circleBoard.wallHitsPerSecond = this.circleBoard.wallHits / timeDelta;
                this.circleBoard.ballCollisionsPerSecond = this.circleBoard.ballCollisions / timeDelta;
            }
            
            this.circleBoard.wallHits = 0;
            this.circleBoard.ballCollisions = 0;
            this.circleBoard.wallHitsStack = [];
            this.circleBoard.ballCollisionsStack = [];
            this.circleBoard.lastCounterReset = now;
        }
    }
    
    // Toggle animation state
    toggleAnimation() {
        if (this.circleBoard.toggleSimulation()) {

            this.startAnimationLoop();
            this.startPhysicsLoop();

        } else {
            this.stopAnimationLoop();
            this.stopPhysicsLoop();      

        }
        return this.circleBoard.isRunning;
    }
    
    // Update the collision display
    updateCollisionDisplay() {
        if (this.elements.offWallB) {
            this.elements.offWallB.textContent = this.circleBoard.getWallHitsPerSecond().toFixed(2);
        }
        if (this.elements.offBallB) {
            this.elements.offBallB.textContent = this.circleBoard.getBallCollisionsPerSecond().toFixed(2);
        }
    }
    
    // Update the balance display
    updateBalanceDisplay() {
        if (this.elements.shopBalanceDisplay) {
            this.elements.shopBalanceDisplay.textContent = this.baseUpgradeShop.getBalance().toFixed(2);
        }
    }
    
    // Setup shop UI elements
    setupShopUI() {
        const shopContainer = this.elements.shopContainer;
        
        if (!shopContainer) {
            console.error('Shop container element not found');
            return;
        }
        
        // Clear existing content
        shopContainer.innerHTML = '';
        
        // Add shop items
        this.baseUpgradeShop.items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'shop-item-button';
            button.innerHTML = `
                <h3>${item.name}</h3>
                <p>Level: <span id="${item.name.replace(/\s+/g, '-')}-level">${item.level}</span></p>
                <p>Cost: <span id="${item.name.replace(/\s+/g, '-')}-cost">${item.price.toFixed(2)}</span></p>
            `;
            
            button.addEventListener('click', () => {
                const success = this.buyItem(item.name);
                
                if (success) {
                    // Update button text after purchase
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                } else {
                    // Show message if not enough balance
                    alert(`Not enough balance to buy ${item.name}. Need ${this.baseUpgradeShop.itemCost(item, 1)[0].toFixed(2)}, have ${this.baseUpgradeShop.balance.toFixed(2)}`);
                }
            });
            
            shopContainer.appendChild(button);
        });
    }
    
    // Buy an item from the shop
    buyItem(itemName, amount = 1) {
        const item = this.baseUpgradeShop.getItem(itemName);
        
        if (!item) {
            console.error(`Item ${itemName} not found`);
            return false;
        }
        
        const success = this.baseUpgradeShop.buyItem(item, amount);
        
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
                this.circleBoard.addNewBalls(1);
                break;
                
            case "Increase Ball Size Range Min":
                this.circleBoard.baseMinBallSize = item.getValue();
                break;
                
            case "Increase Ball Size Range Max":
                this.circleBoard.baseMaxBallSize = item.getValue();
                break;
                
            case "Increase Ball Speed Min":
                this.circleBoard.baseMinBallSpeed = item.getValue();
                break;
                
            case "Increase Ball Speed Max":
                this.circleBoard.baseMaxBallSpeed = item.getValue();
                break;
                
            case "Decrease Large Circle Size":
                this.circleBoard.baseReferenceSize = item.getValue();
                break;
        }
        
        // Update scaled properties based on current scale factor
        this.circleBoard.calculateScaleFactor();
        
        // Reinitialize the CircleBoard with new values
        this.circleBoard.initContainer();
    }
    
    // Save game state to localStorage
    saveGameState() {
        const gameState = {
            circleBoard: {
                ballCount: this.circleBoard.ballCount,
                baseMinBallSize: this.circleBoard.baseMinBallSize,
                baseMaxBallSize: this.circleBoard.baseMaxBallSize,
                baseReferenceSize: this.circleBoard.baseReferenceSize,
                baseMinBallSpeed: this.circleBoard.baseMinBallSpeed,
                baseMaxBallSpeed: this.circleBoard.baseMaxBallSpeed,
                balls: this.circleBoard.balls.map(ball => ({
                    size: ball.radius,
                    baseRadius: ball.baseRadius,
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
                balance: this.baseUpgradeShop.balance,
                items: this.baseUpgradeShop.items.map(item => ({
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
            
            if (gameState.circleBoard) {
                this.circleBoard.ballCount = gameState.circleBoard.ballCount || this.circleBoard.ballCount;
                this.circleBoard.baseMinBallSize = gameState.circleBoard.baseMinBallSize || this.circleBoard.baseMinBallSize;
                this.circleBoard.baseMaxBallSize = gameState.circleBoard.baseMaxBallSize || this.circleBoard.baseMaxBallSize;
                this.circleBoard.baseReferenceSize = gameState.circleBoard.baseReferenceSize || this.circleBoard.baseReferenceSize;
                this.circleBoard.baseMinBallSpeed = gameState.circleBoard.baseMinBallSpeed || this.circleBoard.baseMinBallSpeed;
                this.circleBoard.baseMaxBallSpeed = gameState.circleBoard.baseMaxBallSpeed || this.circleBoard.baseMaxBallSpeed;
                this.circleBoard.canvas.width = this.circleBoard.canvas.parentElement.clientWidth;
                this.circleBoard.canvas.height = this.circleBoard.canvas.parentElement.clientHeight;
                this.circleBoard.calculateScaleFactor();
                this.circleBoard.initContainer();
                
                if (gameState.circleBoard.container) {
                    this.circleBoard.container.color = gameState.circleBoard.container.color || this.circleBoard.container.color;
                    this.circleBoard.container.borderColor = gameState.circleBoard.container.borderColor || this.circleBoard.container.borderColor;
                }
                
                if (gameState.circleBoard.balls && Array.isArray(gameState.circleBoard.balls)) {
                    this.circleBoard.balls = gameState.circleBoard.balls.map(ballData => {
                        // Ensure baseRadius is present, calculate if missing
                        const baseRadius = ballData.baseRadius || 
                            (ballData.size / this.circleBoard.scaleFactor);
                        
                        return {
                            x: ballData.position.x,
                            y: ballData.position.y,
                            radius: ballData.size,
                            mass: ballData.mass,
                            dx: ballData.velocity.x,
                            dy: ballData.velocity.y,
                            color: ballData.color,
                            baseRadius: baseRadius,
                            collisionCount: 0
                        };
                    });
                } else {
                    // If no saved balls, initialize them
                    this.circleBoard.initBalls();
                }
            }
         
            // Load Shop state
            if ("shop" in gameState) {
                this.baseUpgradeShop.balance = gameState.shop.balance || 0;
                
                if (gameState.shop.items && Array.isArray(gameState.shop.items)) {
                    gameState.shop.items.forEach(savedItem => {
                        const item = this.baseUpgradeShop.getItem(savedItem.name);
                        if (item) {
                            item.price = savedItem.price;
                            item.level = savedItem.level;
                        }
                    });
                }
                
                this.updateBalanceDisplay();
                this.setupShopUI();
            }
            
            // Create initial collision predictions
            this.circleBoard.createPossibleCollisions();
            
            // Start animation and physics loop
            this.startGame();
            
            console.log('Game state loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }
    
    // Reset the game state
    resetGameState() {
        // Stop existing loops
        this.stopAnimationLoop();
        this.stopPhysicsLoop();
        
        // Reset CircleBoard
        localStorage.removeItem('circleBoardGameState');
        this.circleBoard = new CircleBoard(this.circleBoard.canvas.id);
        this.baseUpgradeShop.resetShop();
        
        // Update scaled properties
        this.circleBoard.calculateScaleFactor();
        
        this.updateBalanceDisplay();
        this.setupShopUI();
        
        // Reinitialize
        this.circleBoard.initContainer();
        this.circleBoard.initBalls();
        this.circleBoard.createPossibleCollisions();
        
        // Start animation and physics loop
        this.startGame();
        
        console.log('Game state reset successfully');
    }
    
    // Start the game (animation and physics)
    startGame() {
        this.startAnimationLoop();
        this.startPhysicsLoop();
    }
    
    // Initialize the game
    initialize() {
        // Setup the shop UI
        this.setupShopUI();
        this.setupMenuButtons();
        
        // Try to load saved state
        if (!this.loadGameState()) {
            // No saved state, initialize with defaults
            this.circleBoard.initialize();
            this.startGame();
        }
        
        // Update displays
        this.updateCollisionDisplay();
        this.updateBalanceDisplay();
        
        // Force a redraw after a short delay to ensure everything is rendered
        setTimeout(() => {
            this.circleBoard.render();
        }, 500);
    }
    
    // Static method to start the game
    static startGame(canvasId) {
        // Create and initialize the server which will manage everything
        const gameServer = new Server(canvasId);
        gameServer.initialize();
        return gameServer;
    }
}