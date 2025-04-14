//if class draws pop up in spot based on class.draw
//if not a class draws pop up contents will contains a dictionary
/*
contents {
    message
    buttons: [
        button1: function(){}
        button2: function(){}
    ]
}

*/
function popUps(contents, isClass = false, spot, backDrop = true) {
    if(!isClass){
        const popUp = document.createElement('div');
        popUp.className = 'pop-up';

        const backDropElement = document.createElement('div');
        backDropElement.className = 'backdrop';
                
        const message = document.createElement('p');
        message.textContent = contents.message;
        message.style.fontSize = '16px';
        message.style.margin = '0';
        message.style.padding = '10px';
        popUp.appendChild(message);

        const buttons = document.createElement('div');
        buttons.className = 'buttons';
        contents.buttons.forEach((button) => {
            const buttonText = button.text;
            const buttonFunction = button.function;

            const buttonElement = document.createElement('button');
            buttonElement.textContent = buttonText;
            buttonElement.className = 'pop-up-button';
            buttonElement.addEventListener('click', () => {
                buttonFunction();
                document.body.removeChild(popUp);
                if(backDrop){
                    document.body.removeChild(backDropElement);
                }
            } );
            buttonElement.style.margin = '5px';
            buttons.appendChild(buttonElement);
        })
        popUp.appendChild(buttons);

        // check if it exists
        if (spot) {
            // If spot is an element, position near it
            if (spot instanceof HTMLElement) {
                const rect = spot.getBoundingClientRect();
                popUp.style.top = `${rect.bottom + 10}px`;
                popUp.style.left = `${rect.left}px`;
            }
            // If spot is an object with x,y coordinates
            else if (typeof spot === 'object' && 'x' in spot && 'y' in spot) {
                popUp.style.top = `${spot.y}px`;
                popUp.style.left = `${spot.x}px`;
            }
            // If spot is a string describing position
            else if (typeof spot === 'string') {
                switch (spot.toLowerCase()) {
                    case 'center':
                        popUp.style.top = '50%';
                        popUp.style.left = '50%';
                        popUp.style.transform = 'translate(-50%, -50%)';
                        break;
                    case 'top':
                        popUp.style.top = '20px';
                        popUp.style.left = '50%';
                        popUp.style.transform = 'translateX(-50%)';
                        break;
                    case 'bottom':
                        popUp.style.bottom = '20px';
                        popUp.style.left = '50%';
                        popUp.style.transform = 'translateX(-50%)';
                        break;
                    case 'left':   
                        popUp.style.top = '50%';
                        popUp.style.left = '20px';
                        popUp.style.transform = 'translateY(-50%)';
                        break;
                    case 'right':
                        popUp.style.top = '50%';
                        popUp.style.right = '20px';
                        popUp.style.transform = 'translateY(-50%)';
                        break;
                    default:
                        popUp.style.top = '50%';
                        popUp.style.left = '50%';
                        popUp.style.transform = 'translate(-50%, -50%)';
                        break;
                    }
                    
            }
        } 
        
        // Default to center if no position specified
        else {
            popUp.style.top = '50%';
            popUp.style.left = '50%';
            popUp.style.transform = 'translate(-50%, -50%)';
        }
        if(backDrop){
            backDropElement.addEventListener('click', () => {
                document.body.removeChild(backDropElement);
                document.body.removeChild(popUp);
            });
            document.body.appendChild(backDropElement); 
        }
        document.body.appendChild(popUp);        
    }

}
class Server {
    constructor(canvasId) {
        // Create instances of the CircleBoard and Shop
        this.circleBoard = new CircleBoard(canvasId);
        this.shop = new Shop();
        
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
        
        // Initialize the event listeners
        this.setupEventListeners();
    }


    // Setup event listeners for pause reset and save
    setupMenuButtons() {
        
        if (this.elements.pauseButton) {
            this.elements.pauseButton.addEventListener('click', () => {
                console.log("pauseButton")
                const isRun = this.circleBoard.toggleAnimation();
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
                                this.shop.resetShop();
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
        
        const originalAnimate = this.circleBoard.animate;
        this.circleBoard.animate = (shop) => {
            if (!this.circleBoard.isRunning) return;

            originalAnimate.call(this.circleBoard, this.shop);
            
            this.updateCollisionDisplay();
            this.updateBalanceDisplay();
        };
    }
    
    // Update the collision display
    updateCollisionDisplay() {
        if (this.elements.offWallB) {
            this.elements.offWallB.textContent = this.circleBoard.wallHitsPerSecond.toFixed(2);
        }
        if (this.elements.offBallB) {
            this.elements.offBallB.textContent = this.circleBoard.ballCollisionsPerSecond.toFixed(2);
        }
    }
    
    // Update the balance display
    updateBalanceDisplay() {
        if (this.elements.shopBalanceDisplay) {
            this.elements.shopBalanceDisplay.textContent = this.shop.balance.toFixed(2);
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
        this.shop.items.forEach(item => {
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
                    alert(`Not enough balance to buy ${item.name}. Need ${this.shop.itemCost(item, 1)[0].toFixed(2)}, have ${this.shop.balance.toFixed(2)}`);
                }
            });
            
            shopContainer.appendChild(button);
        });
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
                            baseRadius: baseRadius
                        };
                    });
                } else {
                    // If no saved balls, initialize them
                    this.circleBoard.initBalls();
                }
            }
         
            // Load Shop state
            if ("shop" in gameState) {

                
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
                this.setupShopUI();
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
        localStorage.removeItem('circleBoardGameState');
        this.circleBoard = new CircleBoard(this.circleBoard.canvas.id);
        this.shop   = new Shop();
        // this.circleBoard.ballCount = 1;
        // this.circleBoard.baseMinBallSize = 5;
        // this.circleBoard.baseMaxBallSize = 15;
        // this.circleBoard.baseReferenceSize = 750;
        // this.circleBoard.baseMinBallSpeed = 5;
        // this.circleBoard.baseMaxBallSpeed = 15;
        
        // Update scaled properties
        this.circleBoard.calculateScaleFactor();
        
        // Reset Shop
        // this.shop.balance = 0;
        // this.shop.items.forEach(item => {
        //     item.level = 1;
        //     item.price = item.name === "Add Ball" ? 1 : 
        //                 (item.name.includes("Ball Size") ? 20 : 
        //                 (item.name.includes("Ball Speed") ? 30 : 50));
        // });
        
        this.updateBalanceDisplay();
        this.setupShopUI();
        
        // Reinitialize
        this.circleBoard.initContainer();
        this.circleBoard.initBalls();
        
        // Remove from localStorage
        
        console.log('Game state reset successfully');
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
        }
        
        // Update displays
        this.updateCollisionDisplay();
        this.updateBalanceDisplay();
        
        // Force a redraw after a short delay to ensure everything is rendered
        setTimeout(() => {
            this.circleBoard.drawContainer();
            this.circleBoard.balls.forEach(ball => this.circleBoard.drawBall(ball));
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