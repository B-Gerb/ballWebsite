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
        return popUp;
       
    }

}

class Server {
    constructor(canvasId) {
        // Create instances of the CircleBoard and Shop
        this.circleBoard = new CircleBoard(canvasId);
        this.baseUpgradeShop = new baseUpgradeShop();
        this.clickShop = new clickShop();
        this.loadVersions = window.loadVersions;


        this.temporaryMultipliers = {
            clickValue: 1,
            ballValue: 1,
            circleSpeed: 1,
        };
        this.temporaryMultipliersActiveFrames = {};

        // DOM elements
        this.elements = {
            // Display elements
            offWallB: document.getElementById('offWallB'),
            offBallB: document.getElementById('offBallB'),
            shopBalanceDisplay: document.getElementById('shopBalance'),
            clickShopDisplay: document.getElementById('clickShopBalance'),
            
            // Container
            shopContainer: document.getElementById('shopContainer'),
            
            // Menu buttons
            pauseButton: document.getElementById('pauseButton'),
            resetButton: document.getElementById('resetButton'),
            saveButton: document.getElementById('saveButton'),
            
            clickerCanvas: null
        };
        this.createGameContainer();
        
        this.clickerObject = null;
        this.clickerValue = 1;

        // Animation and physics timing
        this.animationFrameId = null;
        this.physicsUpdateInterval = 1000 / 60; 
        this.lastPhysicsUpdate = 0;
        this.physicsTimerId = null;
        this.frameCount = 0;
        
        this.setupEventListeners();
        this.seed = new Math.seedrandom();

    }
    setSeed(seed) {
        this.seed = seed;
    }
    createGameContainer() {
        let container = document.getElementById('game-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'game-container';
            container.style.display = 'flex';
            container.style.width = '100%';
            container.style.justifyContent = 'center';
            container.style.gap = '20px';
            container.style.margin = '0 auto 20px auto';
            container.style.maxWidth = '1200px'; // Maximum width for very large screens
            
            // Create a wrapper div for the CircleBoard to ensure square aspect ratio
            const circleBoardWrapper = document.createElement('div');
            circleBoardWrapper.style.position = 'relative';
            circleBoardWrapper.className = 'canvas-container';
            
            // Get the CircleBoard canvas
            const circleBoardCanvas = this.circleBoard.canvas;
            const circleBoardParent = circleBoardCanvas.parentElement;
            
            // Replace the canvas with our wrapper + canvas
            circleBoardParent.insertBefore(container, circleBoardCanvas);
            circleBoardWrapper.appendChild(circleBoardCanvas);
            container.appendChild(circleBoardWrapper);
            
            // Create canvas for clicker
            const clickerCanvas = document.createElement('canvas');
            clickerCanvas.id = 'clickerCanvas';
            clickerCanvas.style.border = '1px solid #ddd';
            clickerCanvas.style.borderRadius = '8px';
            clickerCanvas.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
            clickerCanvas.style.backgroundColor = '#f8f8f8';
            clickerCanvas.style.cursor = 'pointer';
            
            container.appendChild(clickerCanvas);
            this.elements.clickerCanvas = clickerCanvas;
        }
    }
    initializeClickerObject() {
        this.clickerObject = new ClickerObject('clickerCanvas');
        const originalHandleClick = this.clickerObject.handleClick;
        this.clickerObject.handleClick = () => {
            if(!this.circleBoard.isRunning) return;
            originalHandleClick.call(this.clickerObject); // for animation purposes

            this.clickShop.addBalance(this.clickerValue * this.temporaryMultipliers.clickValue);

            this.updateBalanceDisplay();
            this.updateButtonAppearance();
        };
        this.clickerObject.setSeed(this.seed);
    }
    handleResize() { 
        const windowWidth = window.innerWidth;
        const container = document.getElementById('game-container');
        if (!container) return;
        
        container.style.display = 'flex';
        container.style.width = '100%';
        

        //large screen
        if (windowWidth >= 800) {
            container.style.flexDirection = 'row';
            container.style.justifyContent = 'space-around'; 
            container.style.alignItems = 'center';
            
            let boardSize;
            if (windowWidth <= 800) {
                boardSize = 500;
            } else if (windowWidth >= 1600) {
                boardSize = 800;
            } else {
                boardSize = 500 + (300 * (windowWidth - 800) / 800);
            }
            
            boardSize = Math.round(boardSize);
            
            const boardContainer = this.circleBoard.canvas.parentElement;
            
            boardContainer.style.width = `${boardSize}px`;
            boardContainer.style.height = `${boardSize}px`;
            boardContainer.style.minWidth = `${boardSize}px`;
            boardContainer.style.minHeight = `${boardSize}px`;
            boardContainer.style.maxWidth = `${boardSize}px`;
            boardContainer.style.maxHeight = `${boardSize}px`;
            boardContainer.style.margin = '10px';

            this.circleBoard.updateCanvasSize(boardSize);
            
            this.circleBoard.canvas.style.width = `${boardSize}px`;
            this.circleBoard.canvas.style.height = `${boardSize}px`;
            
            const clickerCanvas = document.getElementById('clickerCanvas');
            if (clickerCanvas) {
                let clickerWidth;
                if (windowWidth <= 800) {
                    clickerWidth = 250;
                } else if (windowWidth >= 1600) {
                    clickerWidth = 300;
                } else {
                    clickerWidth = 250 + (50 * (windowWidth - 800) / 800);
                }
                clickerWidth = Math.round(clickerWidth);
                
                const clickerHeight = Math.round(boardSize * 0.8);
                
                clickerCanvas.style.width = `${clickerWidth}px`;
                clickerCanvas.style.height = `${clickerHeight}px`;
                clickerCanvas.width = clickerWidth;
                clickerCanvas.height = clickerHeight;
                clickerCanvas.style.margin = '10px';
            }
        } else {
            // small screen
            container.style.flexDirection = 'column';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            
            const boardSize = Math.round(Math.min(windowWidth * 0.85, 450));
            
            const boardContainer = this.circleBoard.canvas.parentElement;
            boardContainer.style.width = `${boardSize}px`;
            boardContainer.style.height = `${boardSize}px`;
            boardContainer.style.minWidth = `${boardSize}px`;
            boardContainer.style.minHeight = `${boardSize}px`;
            boardContainer.style.maxWidth = `${boardSize}px`;
            boardContainer.style.maxHeight = `${boardSize}px`;
            boardContainer.style.margin = '0 0 20px 0';
    
            this.circleBoard.updateCanvasSize(boardSize);
            
            this.circleBoard.canvas.style.width = `${boardSize}px`;
            this.circleBoard.canvas.style.height = `${boardSize}px`;
            
            const clickerCanvas = document.getElementById('clickerCanvas');
            if (clickerCanvas) {
                const clickerWidth = Math.round(Math.min(windowWidth * 0.75, 280));
                const clickerHeight = Math.min(180, windowWidth * 0.4); 
                
                clickerCanvas.style.width = `${clickerWidth}px`;
                clickerCanvas.style.height = `${clickerHeight}px`;
                clickerCanvas.width = clickerWidth;
                clickerCanvas.height = clickerHeight;
                clickerCanvas.style.margin = '20px 0 0 0';
                
                clickerCanvas.style.backgroundColor = 'rgba(245, 245, 245, 0.1)';
            }
        }
        
        this.circleBoard.render();
        
        if (this.clickerObject) {
            this.clickerObject.draw();
        }
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
                // Create the popup with a seed input field
                const popup = popUps({
                    message: 'Are you sure you want to reset the game?',
                    buttons: [
                        {
                            text: 'Yes',
                            function: () => {
                                const seedInput = document.getElementById('game-seed-input');
                                const seed = seedInput ? seedInput.value : null;
                                
                                this.resetGameState(seed);
                                this.baseUpgradeShop.resetShop();
                            }
                        },
                        {
                            text: 'No',
                            function: () => {}
                        }
                    ]
                }, false, 'center', true);
                
                // Use the returned popup reference instead of querying the DOM
                const seedDiv = document.createElement('div');
                seedDiv.style.margin = '10px 0';
                
                const inputId = 'game-seed-input';
                
                const seedLabel = document.createElement('label');
                seedLabel.htmlFor = inputId;
                seedLabel.textContent = 'Custom seed (optional):';
                seedLabel.style.display = 'block';
                seedLabel.style.marginBottom = '5px';
                
                const input = document.createElement('input');
                input.type = 'text';
                input.id = inputId;
                input.placeholder = 'Leave empty for random seed';
                input.style.padding = '5px';
                input.style.width = '100%';
                input.style.boxSizing = 'border-box';
                
                seedLabel.appendChild(input);
                seedDiv.appendChild(seedLabel);
                popup.appendChild(seedDiv);

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
            this.handleResize();
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
            for (let key in this.temporaryMultipliersActiveFrames) {
                let value =  this.temporaryMultipliersActiveFrames[key];
                value.frames--;
                if (value.frames <= 0) {
                    switch(value.name) {
                        case "tclickValue":
                            this.temporaryMultipliers.clickValue /= value.multiplier;
                            delete this.temporaryMultipliersActiveFrames[key];
                            break;
                        case "tcircleValue":
                            this.temporaryMultipliers.ballValue /= value.multiplier;
                            delete this.temporaryMultipliersActiveFrames[key];
                            break;
                        case "tcircleSpeed":
                            this.temporaryMultipliers.circleSpeed /= value.multiplier;
                            delete this.temporaryMultipliersActiveFrames[key];
                            break;
                    }
                }

            };
        
        }
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
        const stats = this.circleBoard.updatePhysics(1*this.temporaryMultipliers.circleSpeed);
        
        // Add wall hits to balance
        if (stats.totalWallHits > 0) {
            this.baseUpgradeShop.addBalance(stats.totalWallHits * this.temporaryMultipliers.ballValue);
            this.updateButtonAppearance();
        }
        
        // Update displays
        this.updateCollisionDisplay();
        this.updateBalanceDisplay();
        this.frameCount++;
        if(this.frameCount > 60){
            this.saveGameState();
            this.frameCount = 0;
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
        if(this.elements.clickShopDisplay){
            this.elements.clickShopDisplay.textContent = this.clickShop.getBalance().toFixed(2);
        }

    }
    updateButtonAppearance() {
        const buttons = document.querySelectorAll('.shop-item-button');
        
        buttons.forEach(button => {
            const itemName = button.querySelector('h3').textContent;
            
            // Check if item is in baseUpgradeShop
            const baseItem = this.baseUpgradeShop.items.find(i => i.name === itemName);
            if (baseItem) {
                const canAfford = this.baseUpgradeShop.balance >= this.baseUpgradeShop.itemCost(baseItem, 1)[0];
                
                if (canAfford) {
                    button.classList.remove('cannot-afford');
                } else {
                    button.classList.add('cannot-afford');
                }
                return; // Skip the rest if we found the item in baseUpgradeShop
            }
            
            // Check if item is in clickShop
            const clickItem = this.clickShop.items.find(i => i.name === itemName);
            if (clickItem) {
                const canAfford = this.clickShop.balance >= this.clickShop.itemCost(clickItem, 1)[0];
                
                if (canAfford) {
                    button.classList.remove('cannot-afford');
                } else {
                    button.classList.add('cannot-afford');
                }
            }
        });
    }
    // Setup shop UI elements
    // For ClickingShop and CircleBoardShop
    setupShopUI() {
        const shopContainer = this.elements.shopContainer;
        
        if (!shopContainer) {
            console.error('Shop container element not found');
            return;
        }
        
        // Clear existing content
        shopContainer.innerHTML = '';
        shopContainer.appendChild(document.createElement('h2')).textContent = 'Circle Shop';
        
        // Add shop items
        this.baseUpgradeShop.items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'shop-item-button';
            const canAfford = this.baseUpgradeShop.balance >= this.baseUpgradeShop.itemCost(item, 1)[0];
            if (!canAfford) {
                button.classList.add('cannot-afford');
            }

            button.innerHTML = `
                <h3 class="base-upgrade-itemNames">${item.name}</h3>
                <p>Level: <span id="${item.name.replace(/\s+/g, '-')}-level">${item.level}</span></p>
                <p>Cost: <span id="${item.name.replace(/\s+/g, '-')}-cost">${item.price.toFixed(2)}</span></p>
            `;
            
            button.addEventListener('click', () => {
                const success = this.buyItemBShop(item.name);
                
                if (success) {
                    // Update button text after purchase
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    this.updateButtonAppearance();

                }
            });
            
            shopContainer.appendChild(button);
        });
        // Add clickShop items
        shopContainer.appendChild(document.createElement('h2')).textContent = 'Click Shop';

        this.clickShop.items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'shop-item-button';
            const canAfford = this.clickShop.balance >= this.clickShop.itemCost(item, 1)[0];
            if (!canAfford) {
                button.classList.add('cannot-afford');
            }

            button.innerHTML = `
                <h3 class="base-upgrade-itemNames">${item.name}</h3>
                <p>Level: <span id="${item.name.replace(/\s+/g, '-')}-level">${item.level}</span></p>
                <p>Cost: <span id="${item.name.replace(/\s+/g, '-')}-cost">${item.price.toFixed(2)}</span></p>
            `;
            
            button.addEventListener('click', () => {
                const success = this.buyItemCShop(item.name);
                
                if (success) {
                    // Update button text after purchase
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    this.updateButtonAppearance();

                }
            });
            
            shopContainer.appendChild(button);

        });

    }
    
    // Buy an item from the shop
    buyItemBShop(itemName, amount = 1) {
        const item = this.baseUpgradeShop.getItem(itemName);
        
        if (!item) {
            console.error(`Item ${itemName} not found`);
            return false;
        }
        
        const success = this.baseUpgradeShop.buyItem(item, amount);
        
        if (success) {
            this.applyItemEffectBShop(item);
            this.updateBalanceDisplay();
            this.saveGameState();
        }
        
        return success;
    }
    
    // Apply the effect of an item to the CircleBoard
    applyItemEffectBShop(item) {
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
    buyItemCShop(itemName, amount = 1) {
        const item = this.clickShop.getItem(itemName);
        
        if (!item) {
            console.error(`Item ${itemName} not found`);
            return false;
        }
        
        const success = this.clickShop.buyItem(item, amount);
        
        if (success) {
            this.applyItemEffectCShop(item);
            this.updateBalanceDisplay();
            this.saveGameState();
        }
        
        return success;
    }

    applyItemEffectCShop(item) {
        switch (item.name) {
            case "Increase Click Value":
                this.clickerValue = item.getValue();
                break;
                
            case "Temporary Click Value Multiplier":
                if('tclickValue' in this.temporaryMultipliersActiveFrames){
                    this.temporaryMultipliers.clickValue /= this.temporaryMultipliersActiveFrames.tclickValue.multiplier;
                    this.temporaryMultipliers.clickValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tclickValue.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tclickValue.multiplier = item.getValue();
                }
                else{
                    this.temporaryMultipliers.clickValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tclickValue = {
                        multiplier: item.getValue(),
                        frames: 600, // 10 seconds
                        name: "tclickValue"
                    };
                }

                break;
                
            case "Temporary Ball Value Multiplier":
                if('tcircleValue' in this.temporaryMultipliersActiveFrames){
                    this.temporaryMultipliers.ballValue /= this.temporaryMultipliersActiveFrames.tcircleValue.multiplier;
                    this.temporaryMultipliers.ballValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tcircleValue.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tcircleValue.multiplier = item.getValue();
                }

                else{
                    this.temporaryMultipliers.ballValue *= item.getValue();

                    this.temporaryMultipliersActiveFrames.tcircleValue = {
                        multiplier: item.getValue(),
                        frames: 600, // 10 seconds
                        name: "tcircleValue"
                    };
                }

                break;
            case "Temporary Speed Multiplier":
                if('tcircleSpeed' in this.temporaryMultipliersActiveFrames){
                    this.temporaryMultipliers.circleSpeed /= this.temporaryMultipliersActiveFrames.tcircleSpeed.multiplier;
                    this.temporaryMultipliers.circleSpeed *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tcircleSpeed.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tcircleSpeed.multiplier = item.getValue();
                }
                else{
                    this.temporaryMultipliers.circleSpeed *= item.getValue();

                    this.temporaryMultipliersActiveFrames.tcircleSpeed = {
                        multiplier: item.getValue(),
                        frames: 600, // 10 seconds
                        name: "tcircleSpeed"
                    };
                }
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
            shops: {
                clickShop: {
                    balance: this.clickShop.balance,
                    items: this.clickShop.items.map(item => ({
                        name: item.name,
                        price: item.price,
                        level: item.level
                    }))
                },
                baseUpgradeShop: {
                    balance: this.baseUpgradeShop.balance,
                    items: this.baseUpgradeShop.items.map(item => ({
                        name: item.name,
                        price: item.price,
                        level: item.level
                    }))
                },
            },
            tempMultiplier: {
                frames: this.temporaryMultipliersActiveFrames,
                values: this.temporaryMultipliers
            },
            // Add clicker data to save state if needed
            clicker: {
                clickCount: this.clickerObject ? this.clickerObject.clickCount : 0
            },
            version: '0.0.2',
            seed: this.seed,
        };
        
        localStorage.setItem('circleBoardGameState', JSON.stringify(gameState));
        return gameState;
    }
    
    // Load game state from localStorage
    loadGameState() {        
        try {
            let success = this.loadVersions.load(this);
            if (!success) {
                console.error('Failed to load game state: Version mismatch or unsupported version');
                return false;
            }
            
            
            
            
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
    resetGameState(seed=null) {
        // Stop existing loops
        this.stopAnimationLoop();
        this.stopPhysicsLoop();
        
        // Reset CircleBoard
        localStorage.removeItem('circleBoardGameState');
        this.circleBoard = new CircleBoard(this.circleBoard.canvas.id);
        if (!seed){
            this.seed = new Math.seedrandom();
        }
        else{
            this.seed = new Math.seedrandom(seed);
        }
        this.baseUpgradeShop.resetShop();
        this.clickShop.resetShop();
        this.temporaryMultipliers = {
            clickValue: 1,
            ballValue: 1,
            circleSpeed: 1,

        };
        this.temporaryMultipliersActiveFrames = {}; 
        if (this.clickerObject) {
            this.clickerOjbect = new ClickerObject(this.elements.clickerCanvas.id);
        }
        // Initialize the CircleBoard
        this.circleBoard.initialize(this.seed);
        this.circleBoard.setSeed(this.seed);
        this.clickerObject.setSeed(this.seed);
        // Update displays
        this.updateBalanceDisplay();
        this.setupShopUI();
        
        // Start animation and physics loop
        this.circleBoard.isRunning = true;  // Make sure isRunning flag is set to true
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
        // Create the game container and initialize layout
        this.createGameContainer();
        
        // Apply initial sizing
        this.handleResize();
        
        // Initialize the clicker object
        this.initializeClickerObject();
        
        // Setup UI components
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
        
        // Force a final resize and redraw after everything is initialized
        setTimeout(() => {
            this.handleResize();
            this.circleBoard.render();
            if (this.clickerObject) {
                this.clickerObject.draw();
            }
        }, 300);
    }
    
    // Static method to start the game
    static startGame(canvasId) {
        // Create and initialize the server which will manage everything
        const gameServer = new Server(canvasId);
        
        gameServer.initialize();
        return gameServer;
    }
}