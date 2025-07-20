// Server.js - migrated from legacy code
// Export the Server class for use in React

import CircleBoard from './circleboard/CircleBoard';
import baseUpgradeShop from './shops/baseUpgradeShop';
import clickShop from './shops/clickShop';
import prestigeShop from './shops/prestigeShop';
import ClickerObject from './clicking/ClickerObject';

// TODO: Import or define dependencies like CircleBoard, baseUpgradeShop, clickShop, prestigeShop, ClickerObject, etc.

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
import seedrandom from 'seedrandom';
import loadVersions from './loadVersions';
class Server {
    constructor(canvasElement, clickerCanvasElement) {
        // Pass the canvas element directly
        this.circleBoard = new CircleBoard(canvasElement);

        this.baseUpgradeShop = new baseUpgradeShop();
        this.clickShop = new clickShop();
        this.prestigeUpgradeShop = new prestigeShop();
        
        // Prestige tracking
        this.totalPointsEarned = 0;
        this.prestigePointsEarned = 0;
        
        // Give some initial prestige points for testing
        this.prestigeUpgradeShop.addBalance(100);
        
        // Prestige unlock states
        this.squareUnlocked = false;
        
        // Apply any existing prestige upgrades
        this.applyAllPrestigeUpgrades();
        
        // FPS counter variables
        this.fpsCounter = document.getElementById('fpsCounter');
        this.frameCount = 0;
        this.lastFpsUpdate = 0;
        this.fps = 60;  // Initialize with target FPS
        this.fpsCounter.textContent = this.fps;  // Set initial display value

        // Add visibility state tracking
        this.isVisible = true;
        this.lastVisibleTime = performance.now();

        this.multipliers = {
            prestigeMultipliers: {
                clickValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                circleSize: 1,
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1
                    },
                    square: {
                        speed: 1,
                        value: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1
                    }
                }
            },
            temporaryMultipliers: {
                clickValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1
                    },
                    square: {
                        speed: 1,
                        value: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1
                    }
                }
            }
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
            // Clicker canvas
            clickerCanvas: clickerCanvasElement
        };
        // Remove createGameContainer logic for clickerCanvas
        this.clickerObject = null;
        this.clickerValue = 1;

        // Animation and physics timing
        this.animationFrameId = null;
        this.physicsUpdateInterval = 1000 / 60; 
        this.lastPhysicsUpdate = 0;
        this.physicsTimerId = null;

        this.setupEventListeners();
        this.seed = seedrandom();

    }
    setSeed(seed) {
        this.seed = seed;
    }    
    
    initializeClickerObject() {
        // Use the clickerCanvas element passed in
        if (!this.elements.clickerCanvas) return;
        this.clickerObject = new ClickerObject(this.elements.clickerCanvas);
        const originalHandleClick = this.clickerObject.handleClick;
        this.clickerObject.handleClick = () => {
            if(!this.circleBoard.isRunning) return;
            originalHandleClick.call(this.clickerObject); // for animation purposes
            this.clickShop.addBalance(
                this.clickerValue * this.multipliers.temporaryMultipliers.clickValue
               * this.multipliers.prestigeMultipliers.clickValue);
            this.addPointsAndCheckPrestige(this.clickerValue * this.multipliers.temporaryMultipliers.clickValue);
            this.updateBalanceDisplay();
            this.updateButtonAppearance();
        };
        this.clickerObject.setSeed(this.seed);    }
    handleResize() { 
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Let CSS handle all layout decisions - we just size the canvases
        const container = document.querySelector('.container');
        if (!container) return;
        
        // Calculate available space for the circle board
        // Account for container padding, gaps, and shop space
        const containerPadding = 40; // 20px padding on each side
        const containerGap = 30; // gap between elements
        const shopMinWidth = 400; // minimum shop width
        
        // Calculate how much space is actually available for canvas area
        let availableWidth;
        if (windowWidth > (shopMinWidth + 600 + containerGap + containerPadding)) {
            // Wide screen: shop and canvas side by side
            availableWidth = windowWidth - shopMinWidth - containerGap - containerPadding;
        } else {
            // Narrow screen: canvas gets full width (shop will wrap below)
            availableWidth = windowWidth - containerPadding;
        }
        
        // Leave space for clicker canvas (roughly 300px + gap)
        const clickerSpace = 320;
        const boardAvailableWidth = availableWidth - clickerSpace;
        
        // Calculate board size
        const availableHeight = windowHeight * 0.8; // Use 80% of viewport height
        let boardSize = Math.min(boardAvailableWidth, availableHeight);
        
        // Ensure reasonable bounds
        boardSize = Math.max(boardSize, 100); // Minimum size
        boardSize = Math.min(boardSize, 1000); // Maximum size
        
        // Get current board size
        const currentBoardSize = this.circleBoard.canvas.width || 500;

        // Only update if size changed significantly
        if (Math.abs(boardSize - currentBoardSize) > 10) {
            this.circleBoard.updateCanvasSize(boardSize);
        }
        else{
            return; // No significant change, skip further updates
        }
        
        // Handle clicker canvas - size it proportionally to board
        const clickerCanvas = this.elements.clickerCanvas;
        if (clickerCanvas) {
            let clickerWidth = Math.min(boardSize * 0.6, 300);
            let clickerHeight = Math.min(boardSize * 0.3, 150);
            
    
            
            clickerWidth = Math.round(clickerWidth);
            clickerHeight = Math.round(clickerHeight);
            
            // Only update if size changed
            const currentClickerWidth = clickerCanvas.width || 0;
            if (Math.abs(clickerWidth - currentClickerWidth) > 10) {
                console.log(`Resizing clicker from ${currentClickerWidth}x${clickerCanvas.height} to ${clickerWidth}x${clickerHeight}`);
                
                clickerCanvas.style.width = `${clickerWidth}px`;
                clickerCanvas.style.height = `${clickerHeight}px`;
                clickerCanvas.width = clickerWidth;
                clickerCanvas.height = clickerHeight;
                
                // Update the clicker object if it exists
                if (this.clickerObject) {
                    this.clickerObject.updateSize?.(clickerWidth, clickerHeight);
                }
            }
        }
        
        // Force a render after changes
        setTimeout(() => {
            this.circleBoard.render();
            if (this.clickerObject) {
                this.clickerObject.draw();
            }
        }, 50);
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
                    buttons: [                        {
                            text: 'Yes',
                            function: () => {
                                const seedInput = document.getElementById('game-seed-input');
                                const seed = seedInput ? seedInput.value : null;
                                
                                this.resetGameState(seed);
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
    
    
    // Toggle animation state
    toggleAnimation() {
        if (this.circleBoard.toggleSimulation()) {
            this.startGame();
        } else {
            this.stopGame();
        }
        return this.circleBoard.isRunning;
    }
    
    // Update the collision display
    updateCollisionDisplay() {
        if (this.elements.offWallB) {
            this.elements.offWallB.textContent = this.circleBoard.getWallHitsPerSecond().toFixed(2);
        }
        if (this.elements.offBallB) {
            this.elements.offBallB.textContent = this.circleBoard.getShapeCollisionsPerSecond().toFixed(2);
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
    updateBaseUpgradeShopAppearance() {
        const buttons = document.querySelectorAll('.baseUpgrade-shop-item-button');
        
        buttons.forEach(button => {
            const itemName = button.querySelector('h3').textContent;
            
            const item = this.baseUpgradeShop.getItem(itemName)[0];
            if (item) {
                const canAfford = this.baseUpgradeShop.balance >= this.baseUpgradeShop.itemCost(item, 1)[0];
                
                if (canAfford) {
                    button.classList.remove('cannot-afford');
                } else {
                    button.classList.add('cannot-afford');
                }
            }
        });
    }
    updateClickShopAppearance() {
        const buttons = document.querySelectorAll('.click-shop-item-button');
        buttons.forEach(button => {
            const itemName = button.querySelector('h3').textContent;
            
            const item = this.clickShop.getItem(itemName);
            if (item) {
                const canAfford = this.clickShop.balance >= this.clickShop.itemCost(item, 1)[0];
                
                if (canAfford) {
                    button.classList.remove('cannot-afford');
                } else {
                    button.classList.add('cannot-afford');
                }
            }
        });
    }


    updateButtonAppearance() {
        this.updateBaseUpgradeShopAppearance();
        this.updateClickShopAppearance();
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
        
        // Create Balance Shop section
        const balanceShopSection = document.createElement('div');
        balanceShopSection.className = 'shop-section';
        balanceShopSection.innerHTML = '<h2>Balance Shop</h2>';
        shopContainer.appendChild(balanceShopSection);
        
        // Add shop items organized by category
        for (const [shopName, shop] of Object.entries(this.baseUpgradeShop.items)) {
            // Create category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = shopName;
            balanceShopSection.appendChild(categoryHeader);
            
            // Create grid container for this category
            const categoryGrid = document.createElement('div');
            categoryGrid.className = 'shop-items-grid';
            
            for (const item of shop) {
                const button = document.createElement('button');
                button.className = `shop-item-button baseUpgrade-shop-item-button ${shopName}-shop-item-button`;
                
                const canAfford = this.baseUpgradeShop.balance >= this.baseUpgradeShop.itemCost(item, 1)[0];
                if (!canAfford) {
                    button.classList.add('cannot-afford');
                }
                
                button.innerHTML = `
                    <h3 class="base-upgrade-itemNames">${item.name}</h3>
                    <p>Level: <span id="${item.name.replace(/\s+/g, '-')}-level">${item.level}</span></p>
                    <p>Cost: <span id="${item.name.replace(/\s+/g, '-')}-cost">${item.price.toFixed(2)}</span></p>
                `;
                
                button.dataset.itemName = item.name;
                button.dataset.shopCategory = shopName;
                
                button.addEventListener('click', () => {
                    const success = this.buyItemBShop(item.name);
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    this.updateButtonAppearance();
                });
                
                categoryGrid.appendChild(button);
            }
            
            balanceShopSection.appendChild(categoryGrid);
        }

        // Create Click Shop section
        const clickShopSection = document.createElement('div');
        clickShopSection.className = 'shop-section';
        clickShopSection.innerHTML = '<h2>Click Shop</h2>';
        
        const clickShopGrid = document.createElement('div');
        clickShopGrid.className = 'shop-items-grid';

        this.clickShop.items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'shop-item-button click-shop-item-button';
            
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
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    this.updateButtonAppearance();
                }
            });
            
            clickShopGrid.appendChild(button);
        });
        
        clickShopSection.appendChild(clickShopGrid);
        shopContainer.appendChild(clickShopSection);
    }
                    
           
    
    // Buy an item from the shop
    buyItemBShop(itemName, amount = 1) {
        const item = this.baseUpgradeShop.getItem(itemName);
        
        if (!item) {
            console.error(`Item ${itemName} not found`);
            return false;
        }
        
        const success = this.baseUpgradeShop.buyItem(item[0], amount);
        
        if (success) {
            this.applyItemEffectBShop(item, amount);
            this.updateBalanceDisplay();
            this.saveGameState();
        }
        
        return success;
    }
    
    // Apply the effect of an item to the CircleBoard
    applyItemEffectBShop(item, amount=1) {
        switch (item[1]) {
            case "ballShop":
                switch(item[0].name) {
                    case "Add Ball":
                        this.circleBoard.addNewBalls(amount);
                        break;
                
                    case "Increase Ball Size Range Min":
                        this.circleBoard.shapeInfo.Circle.baseMinBallSize = item[0].getValue();
                        break;
                        
                    case "Increase Ball Size Range Max":
                        this.circleBoard.shapeInfo.Circle.baseMaxBallSize = item[0].getValue();
                        break;
                        
                    case "Increase Ball Speed Min":
                        this.circleBoard.shapeInfo.Circle.baseMinBallSpeed = item[0].getValue();
                        break;
                        
                    case "Increase Ball Speed Max":
                        this.circleBoard.shapeInfo.Circle.baseMaxBallSpeed = item[0].getValue();
                        break;
                        
                    case "Decrease Large Circle Size":
                        this.circleBoard.baseReferenceSize = item[0].getValue();
                        break;
                }
                break;
            case "squareShop":
                switch(item[0].name) {
                    case "Add Square":
                        this.circleBoard.addNewSquares(amount);
                        break;
                    
                    case "Increase Square Size Range Min":
                        this.circleBoard.shapeInfo.Square.baseMinSide = item[0].getValue();
                        break;
                        
                    case "Increase Square Size Range Max":
                        this.circleBoard.shapeInfo.Square.baseMaxSide = item[0].getValue();
                        break;
                        
                    case "Increase Square Speed Min":
                        this.circleBoard.shapeInfo.Square.baseMinSpeed = item[0].getValue();
                        break;
                        
                    case "Increase Square Speed Max":
                        this.circleBoard.shapeInfo.Square.baseMaxSpeed = item[0].getValue();
                        break;
                }
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
                    this.multipliers.temporaryMultipliers.clickValue /= this.temporaryMultipliersActiveFrames.tclickValue.multiplier;
                    this.multipliers.temporaryMultipliers.clickValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tclickValue.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tclickValue.multiplier = item.getValue();
                }
                else{
                    this.multipliers.temporaryMultipliers.clickValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tclickValue = {
                        multiplier: item.getValue(),
                        frames: 600, // 10 seconds
                        name: "tclickValue"
                    };
                }

                break;
                
            case "Temporary Ball Value Multiplier":
                if('tcircleValue' in this.temporaryMultipliersActiveFrames){
                    this.multipliers.temporaryMultipliers.shapeValue /= this.temporaryMultipliersActiveFrames.tcircleValue.multiplier;
                    this.multipliers.temporaryMultipliers.shapeValue *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tcircleValue.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tcircleValue.multiplier = item.getValue();
                }

                else{
                    this.multipliers.temporaryMultipliers.shapeValue *= item.getValue();

                    this.temporaryMultipliersActiveFrames.tcircleValue = {
                        multiplier: item.getValue(),
                        frames: 600, // 10 seconds
                        name: "tcircleValue"
                    };
                }

                break;
            case "Temporary Speed Multiplier":
                if('tcircleSpeed' in this.temporaryMultipliersActiveFrames){
                    this.multipliers.temporaryMultipliers.shapeSpeed /= this.temporaryMultipliersActiveFrames.tcircleSpeed.multiplier;
                    this.multipliers.temporaryMultipliers.shapeSpeed *= item.getValue();
                    this.temporaryMultipliersActiveFrames.tcircleSpeed.frames += 600; // 10 seconds
                    this.temporaryMultipliersActiveFrames.tcircleSpeed.multiplier = item.getValue();
                }
                else{
                    this.multipliers.temporaryMultipliers.shapeSpeed *= item.getValue();

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
    
    // Prestige shop methods using prestigeShop class
    buyPrestigeUpgrade(upgradeName) {
        const success = this.prestigeUpgradeShop.buyItemByName(upgradeName);
        if (success) {
            this.applyPrestigeUpgradeEffect(upgradeName);
            this.saveGameState();
        }
        return success;
    }

    applyPrestigeUpgradeEffect(upgradeName) {
        const item = this.prestigeUpgradeShop.getItem(upgradeName);
        if (!item) return;
        
        switch (upgradeName) {
            case "Unlock Square":
                // Enable square shapes in the game
                this.baseUpgradeShop.addSquaresToShop();
                this.setupShopUI();
                console.log("Squares unlocked!");
                break;
                
            case "Increase Base Circle Size":
                // Increase the circle board size based on item level
                const sizeIncrease = item.level * 0.1; // 10% per level
                this.multipliers.prestigeMultipliers.circleSize = 1 + sizeIncrease;
                console.log(`Circle size increased by ${sizeIncrease * 100}%`);
                break;
                
            case "Increase Ball Speed":
                // Increase ball speed multiplier based on item level
                this.multipliers.prestigeMultipliers.shapeSpeed = 1 + (item.level * 2); // 20% per level
                console.log(`Ball speed increased by ${item.level * 20}%`);
                break;
                
            case "Increase Ball Value":
                // Increase points from ball collisions based on item level
                this.multipliers.prestigeMultipliers.shapeValue = 1 + item.level; // 100% per level
                console.log(`Ball value increased by ${item.level * 100}%`);
                break;
                
            case "Increase Click Value":
                // Increase click value multiplier based on item level
                this.multipliers.prestigeMultipliers.clickValue = 1 + item.level; // 100% per level
                console.log(`Click value increased by ${item.level * 100}%`);
                break;
        }
    }

    // Apply all prestige upgrades (call this on game start/load)
    applyAllPrestigeUpgrades() {
        this.prestigeUpgradeShop.items.forEach(item => {
            if (item.level > 0) {
                this.applyPrestigeUpgradeEffect(item.name);
            }
        });
    }

    // Get prestige shop data for UI (compatible with PrestigePopup)
    getPrestigeShopData() {
        return {
            balance: this.prestigeUpgradeShop.getBalance(),
            upgrades: this.prestigeUpgradeShop.items.map(item => ({
                name: item.name,
                level: item.level,
                maxLevel: item.maxLevel,
                price: item.price,
                canAfford: this.prestigeUpgradeShop.getBalance() >= item.price
            }))
        };
    }
    
    // Save game state to localStorage
    saveGameState() {
        const gameState = {
            circleBoard: {
                shapeInfo: this.circleBoard.shapeInfo, // Save the entire shapeInfo object
                baseReferenceSize: this.circleBoard.baseReferenceSize,
                shapes: this.circleBoard.shapes.map(shape => {
                    // Get shape information for saving
                    const info = shape.getInformation();
                    
                    // Return a serializable object
                    return info;
                }),
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
                    // Save the categorized items structure
                    items: Object.entries(this.baseUpgradeShop.items).reduce((acc, [category, itemsList]) => {
                        acc[category] = itemsList.map(item => ({
                            name: item.name,
                            price: item.price,
                            level: item.level
                        }));
                        return acc;
                    }, {})
                },
                prestigeShop: {
                    balance: this.prestigeUpgradeShop.getBalance(),
                    items: this.prestigeUpgradeShop.items.map(item => ({
                        name: item.name,
                        level: item.level,
                        price: item.price,
                        dependencies: item.dependencies
                    }))
                }
            },
            multipliers: {
                prestigeMultipliers: this.multipliers.prestigeMultipliers,
                temporaryMultipliers: this.multipliers.temporaryMultipliers
            },
            tempMultiplier: {
                frames: this.temporaryMultipliersActiveFrames,
                values: this.temporaryMultipliers
            },
            clicker: {
                clickCount: this.clickerObject ? this.clickerObject.clickCount : 0
            },
            prestige: {
                totalPointsEarned: this.totalPointsEarned,
                prestigePointsEarned: this.prestigePointsEarned
            },
            version: '0.0.5', // Increment version number for prestigeShop support
            seed: this.seed,
        };
        
        localStorage.setItem('circleBoardGameState', JSON.stringify(gameState));
        return gameState;
    }

    
    // Load game state from localStorage
    loadGameState() {        
        try {
            if (!localStorage.getItem('circleBoardGameState')) {
                
                return false;
            }
            let success = loadVersions.load(this);
            this.prestigeUpgradeShop.addBalance(100);

            this.handleResize();
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
        this.stopGame();
        
        // Reset CircleBoard
        localStorage.removeItem('circleBoardGameState');
        const canvas = this.circleBoard.canvas;
        this.circleBoard = new CircleBoard(canvas);
        if (!seed){
            this.seed = seedrandom();
        }
        else{
            this.seed = seedrandom(seed);
        }
        this.baseUpgradeShop.resetShop();
        this.clickShop.resetShop();
        this.prestigeUpgradeShop.resetShop();
        this.prestigeUpgradeShop.addBalance(100000);

        this.multipliers = {
            prestigeMultipliers: {
                clickValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1
                    },
                    square: {
                        speed: 1,
                        value: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1
                    }
                }
            },
            temporaryMultipliers: {
                clickValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1
                    },
                    square: {
                        speed: 1,
                        value: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1
                    }
                }
            }
        };
        this.temporaryMultipliersActiveFrames = {};
        if (this.clickerObject) {
            this.clickerOjbect = new ClickerObject(this.elements.clickerCanvas);
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
        this.handleResize();
        this.circleBoard.addNewBalls(1);

        this.startGame();
        
        console.log('Game state reset successfully');
    }
    
    // Method to add points and check for prestige point earning
    addPointsAndCheckPrestige(points) {
        this.totalPointsEarned += points;
        
        // Give prestige points every 1000 total points earned
        const prestigePointsToGive = Math.floor(this.totalPointsEarned / 1000) - this.prestigePointsEarned;
        if (prestigePointsToGive > 0) {
            this.prestigeUpgradeShop.addBalance(prestigePointsToGive);
            this.prestigePointsEarned += prestigePointsToGive;
        }
    }
    
    startGame() {
        if (!this.animationFrameId) {
            const targetFPS = 60;
            const frameInterval = 1000 / targetFPS;
            let lastFrameTime = performance.now();
            let accumulator = 0;

            // Initialize FPS tracking variables
            this.frameCount = 0;
            this.frames = 0;
            this.lastFpsUpdate = performance.now();

            const gameLoop = (currentTime) => {
                if (!this.circleBoard.isRunning) {
                    this.animationFrameId = requestAnimationFrame(gameLoop);
                    return;
                }

                // Handle visibility changes
                if (document.hidden) {
                    if (this.isVisible) {
                        this.isVisible = false;
                        this.lastVisibleTime = currentTime;
                    }
                    this.animationFrameId = requestAnimationFrame(gameLoop);
                    return;
                } else if (!this.isVisible) {
                    this.isVisible = true;
                    lastFrameTime = currentTime;
                    accumulator = 0;
                }

                // Calculate FPS
                this.frameCount++;
                this.frames++;
                if (currentTime - this.lastFpsUpdate >= 1000) {
                    this.fps = Math.round(this.frames * 1000 / (currentTime - this.lastFpsUpdate));
                    this.fpsCounter.textContent = this.fps;
                    this.frames = 0;
                    this.lastFpsUpdate = currentTime;
                }

                const deltaTime = Math.min(currentTime - lastFrameTime, frameInterval * 2); // Cap delta time
                lastFrameTime = currentTime;

                accumulator += deltaTime;

                // Update physics at fixed time steps
                while (accumulator >= frameInterval) {

                    // Calculate speed multipliers for each shape
                    const speedMultipliers = {};
                                        let subIntervals = 8;
                    if( this.circleBoard.shapes.length > 450){
                        subIntervals = subIntervals- Math.min(5, round(this.circleBoard.shapes.length - 500) / 35)

                    }
                    for (const shape of this.circleBoard.shapes) {
                        const shapeName = shape.getName().toLowerCase();


                        const totalSpeedMultiplier = this.multipliers.prestigeMultipliers.shapeSpeed * 
                                                   this.multipliers.temporaryMultipliers.shapeSpeed *
                                                   this.multipliers.prestigeMultipliers.shapes[shapeName].speed *
                                                   this.multipliers.temporaryMultipliers.shapes[shapeName].speed;
                        speedMultipliers[shapeName] = totalSpeedMultiplier/subIntervals;
                    }

                    for (let i = 0; i < subIntervals; i++) {


                        const stats = this.circleBoard.updatePhysics(speedMultipliers);

                        // Update balances based on shape collisions
                        for (const [shapeType, shapeStats] of Object.entries(stats)) {
                            if(shapeType === 'total') continue;
                            const shapeName = shapeType.toLowerCase();
                            
                            // Calculate total value multiplier for this shape
                            const totalValueMultiplier = this.multipliers.prestigeMultipliers.shapeValue * 
                                                    this.multipliers.temporaryMultipliers.shapeValue *
                                                    this.multipliers.prestigeMultipliers.shapes[shapeName].value *
                                                    this.multipliers.temporaryMultipliers.shapes[shapeName].value;
                            switch (shapeType) {
                                case 'Circle':
                                    const wallHitPoints = shapeStats.totalWallHits * totalValueMultiplier;
                                    this.baseUpgradeShop.addBalance(wallHitPoints);
                                    this.addPointsAndCheckPrestige(wallHitPoints);
                                    break;
                                case 'Square':
                                    const collisionPoints = shapeStats.totalShapeCollisions * totalValueMultiplier;
                                    this.baseUpgradeShop.addBalance(collisionPoints);
                                    this.addPointsAndCheckPrestige(collisionPoints);
                                    break;
                            }
                        }
                    }

                    this.updateButtonAppearance();
                    this.updateCollisionDisplay();
                    this.updateBalanceDisplay();

                    this.processTemporaryMultipliers();

                    if (this.frameCount > 60) {
                        this.saveGameState();
                        this.frameCount = 0;
                    }

                    accumulator -= frameInterval;
                }

                // Render at the current frame rate
                this.circleBoard.render();
                this.animationFrameId = requestAnimationFrame(gameLoop);
            };

            this.lastFpsUpdate = performance.now();
            this.animationFrameId = requestAnimationFrame(gameLoop);
        }
    }
    processTemporaryMultipliers() {
        for (let key in this.temporaryMultipliersActiveFrames) {
            let value = this.temporaryMultipliersActiveFrames[key];
            value.frames--;
            if (value.frames <= 0) {
                switch(value.name) {
                    case "tclickValue":
                        this.multipliers.temporaryMultipliers.clickValue /= value.multiplier;
                        delete this.temporaryMultipliersActiveFrames[key];
                        break;
                    case "tcircleValue":
                        this.multipliers.temporaryMultipliers.shapeValue /= value.multiplier;
                        delete this.temporaryMultipliersActiveFrames[key];
                        break;
                    case "tcircleSpeed":
                        this.multipliers.temporaryMultipliers.shapeSpeed /= value.multiplier;
                        delete this.temporaryMultipliersActiveFrames[key];
                        break;
                }
            }
        }
    }
    
    stopGame() {
        if (this.animationFrameId) {
            window.cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }
    
    initialize() {

        // Initialize the clicker object
        this.initializeClickerObject();

        // Setup UI components
        this.setupShopUI();
        this.setupMenuButtons();



        // Try to load saved state
        if (!this.loadGameState()) {
            // No saved state, initialize with defaults
            this.circleBoard.initialize();
            this.circleBoard.addNewBalls(1);

            // Force resize and render BEFORE starting the game loop
            this.handleResize();
            this.circleBoard.render();

            // Start the game loop
            this.startGame();
        } else {
            // After loading, ensure proper sizing and rendering
            this.handleResize();
            this.circleBoard.render();
            
            // Start the game loop
            this.startGame();
        }

        // Update displays
        this.updateCollisionDisplay();
        this.updateBalanceDisplay();

        // Final resize after everything is loaded to ensure proper scaling
        setTimeout(() => {
            this.handleResize();
            if (this.clickerObject) {
                this.clickerObject.draw();
            }
        }, 100);
    }
        
    // Static method to start the game
    static startGame(canvasElement, clickerCanvasElement) {
        // Create and initialize the server which will manage everything
        const gameServer = new Server(canvasElement, clickerCanvasElement);
        
        gameServer.initialize();
        return gameServer;
    }
}

export { popUps };
export default Server;
