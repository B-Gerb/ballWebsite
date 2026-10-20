// Server.js - migrated from legacy code
// Export the Server class for use in React

import CircleBoard from './circleboard/CircleBoard';
import baseUpgradeShop from './shops/baseUpgradeShop';
import clickShop from './shops/clickShop';
import prestigeShop from './shops/prestigeShop';
import ClickerObject from './clicking/ClickerObject';
import { PRESTIGE_EQUATIONS } from './prestigeEquations';

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
        
        // Permanent prestige state and run-only state.
        this.prestigeStats = {
            lifetimePoints: 0,
            lastAward: null,
            totalPrestiges: 0
        };
        this.run = {
            totalPointsEarned: 0,
            totalWallHits: 0
        };
        
        // Prestige unlock states
        this.squareUnlocked = false;
        this.triangleUnlocked = false;
        
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
                clickUpgradeEffectiveness: 1,
                circleWallValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                currencyMultiplier: 1,
                globalSpeed: 1,
                globalSize: 1,
                speedCollisionValue: 1,
                sizeCollisionValue: 1,
                massCollisionValue: 1,
                prestigeGain: 1,
                costScaling: {
                    circle: 1,
                    square: 1,
                    triangle: 1
                },
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1,
                        size: 1
                    },
                    square: {
                        speed: 1,
                        value: 1,
                        size: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1,
                        size: 1
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
        this.applyAllPrestigeUpgrades();
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
        this.saveTimerId = null;
        this.saveIdleCallbackId = null;
        this.physicsUpdateInterval = 1000 / 60; 
        this.lastPhysicsUpdate = 0;
        this.physicsTimerId = null;
        this.handleWindowResize = this.handleWindowResize.bind(this);

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
                const clickMultiplier = this.getSafeMultiplier(
                    this.multipliers.temporaryMultipliers.clickValue
                    * this.multipliers.prestigeMultipliers.clickValue
                    * this.multipliers.prestigeMultipliers.clickUpgradeEffectiveness
                    * this.multipliers.prestigeMultipliers.currencyMultiplier
                );
                const clickPoints = this.getSafeMultiplier(this.clickerValue) * clickMultiplier;
                this.clickShop.addBalance(clickPoints);
                this.addPointsAndCheckPrestige(clickPoints);
            this.updateBalanceDisplay();
            this.updateButtonAppearance();
        };
        this.clickerObject.setSeed(this.seed);    }

    getSafeMultiplier(value) {
        return Number.isFinite(value) && value >= 0 ? value : 1;
    }

    getSafeProduct(...values) {
        return values.reduce((product, value) => (
            product * this.getSafeMultiplier(value)
        ), 1);
    }
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
        this.removeMenuButtonListeners();

        this.menuButtonHandlers = {};

        if (this.elements.pauseButton) {
            this.menuButtonHandlers.pause = () => {
                console.log("pauseButton");
                const isRun = this.toggleAnimation();
                const buttonText = isRun ? 'Pause' : 'Resume';
                this.elements.pauseButton.textContent = buttonText;
            };
            this.elements.pauseButton.addEventListener('click', this.menuButtonHandlers.pause);
        }
        
        if (this.elements.resetButton) {
            this.menuButtonHandlers.reset = () => {
                // Create the popup with a seed input field
                const popup = popUps({
                    message: 'Are you sure you want to reset the game?',
                    buttons: [                        {
                            text: 'Yes',
                            function: () => {
                                const seedInput = document.getElementById('game-seed-input');
                                const seed = seedInput ? seedInput.value : null;
                                
                                this.resetAllProgress(seed);
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
            };
            this.elements.resetButton.addEventListener('click', this.menuButtonHandlers.reset);
        }

        if (this.elements.saveButton) {
            this.menuButtonHandlers.save = () => {
                this.saveGameState();
            };
            this.elements.saveButton.addEventListener('click', this.menuButtonHandlers.save);
        }
    }

    removeMenuButtonListeners() {
        const handlers = this.menuButtonHandlers;
        if (!handlers) return;

        if (handlers.pause) {
            this.elements.pauseButton?.removeEventListener('click', handlers.pause);
        }
        if (handlers.reset) {
            this.elements.resetButton?.removeEventListener('click', handlers.reset);
        }
        if (handlers.save) {
            this.elements.saveButton?.removeEventListener('click', handlers.save);
        }
        this.menuButtonHandlers = null;
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', this.handleWindowResize);
    }

    handleWindowResize() {
        this.handleResize();
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
        this.updatePrestigeFocusButton();

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
        balanceShopSection.innerHTML = `
            <div class="shop-tabs" role="tablist" aria-label="Upgrade menus">
                <button type="button" class="shop-tab is-active" role="tab" aria-selected="true">
                    Balance Shop
                </button>
                <button
                    type="button"
                    class="shop-tab prestige-focus-button is-locked"
                    role="tab"
                    aria-selected="false"
                    aria-label="Prestige locked. Earn 1 prestige point to unlock"
                    title="Earn 1 prestige point to unlock Prestige"
                >
                    <span class="prestige-focus-icon" aria-hidden="true">🔒</span>
                    <span class="prestige-focus-label">Prestige</span>
                </button>
            </div>
        `;
        balanceShopSection.querySelector('.prestige-focus-button').addEventListener('click', (event) => {
            if (event.currentTarget.disabled) return;
            window.dispatchEvent(new CustomEvent('open-prestige-focus'));
        });
        this.updatePrestigeFocusButton(balanceShopSection);
        shopContainer.appendChild(balanceShopSection);
        
        // Add shop items organized by category
        for (const [shopName, shop] of Object.entries(this.baseUpgradeShop.items)) {
            // Create category header
            const categoryHeader = document.createElement('h3');
            categoryHeader.textContent = shopName;
            const categoryDetails = document.createElement('details');
            categoryDetails.open = true;
            const categorySummary = document.createElement('summary');
            categorySummary.textContent = shopName;
            categoryDetails.appendChild(categorySummary);

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
                    this.buyItemBShop(item.name);
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    this.updateButtonAppearance();
                });
                
                categoryGrid.appendChild(button);
            }
            
            categoryDetails.appendChild(categoryGrid);
            balanceShopSection.appendChild(categoryDetails);
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

    updatePrestigeFocusButton(root = document) {
        const button = root.querySelector?.('.prestige-focus-button');
        if (!button) return;

        const unlocked = this.prestigeStats.totalPrestiges > 0
            || this.calculatePrestigePreview().estimatedAward >= 1;
        button.classList.toggle('is-locked', !unlocked);
        button.classList.toggle('is-unlocked', unlocked);
        button.disabled = !unlocked;
        button.setAttribute(
            'aria-label',
            unlocked
                ? 'Open Prestige'
                : 'Prestige locked. Earn 1 prestige point to unlock',
        );
        button.title = unlocked
            ? 'Open Prestige'
            : 'Earn 1 prestige point to unlock Prestige';
        const icon = button.querySelector('.prestige-focus-icon');
        if (icon) icon.textContent = unlocked ? '🔓' : '🔒';
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
            case "triangleShop":
                switch (item[0].name) {
                    case "Add Triangle":
                        this.circleBoard.addNewTriangles(amount);
                        break;
                    case "Increase Triangle Size Range Min":
                        this.circleBoard.shapeInfo.Triangle.baseMinSide = item[0].getValue();
                        break;
                    case "Increase Triangle Size Range Max":
                        this.circleBoard.shapeInfo.Triangle.baseMaxSide = item[0].getValue();
                        break;
                    case "Increase Triangle Speed Min":
                        this.circleBoard.shapeInfo.Triangle.baseMinSpeed = item[0].getValue();
                        break;
                    case "Increase Triangle Speed Max":
                        this.circleBoard.shapeInfo.Triangle.baseMaxSpeed = item[0].getValue();
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

    applyCostScalingMultiplier(shopName, multiplier) {
        const items = this.baseUpgradeShop.items[shopName];
        if (!items) return;
        items.forEach((item) => {
            item.costScalingMultiplier = multiplier;
        });
    }

    applyPrestigeUpgradeEffect(upgradeName) {
        const item = this.prestigeUpgradeShop.getItem(upgradeName);
        if (!item) return;
        const value = item.valueEquation(item.level);
        
        switch (item.effectKey) {
            case "unlockSquare":
                // Enable square shapes in the game
                this.baseUpgradeShop.addSquaresToShop();
                this.setupShopUI();
                console.log("Squares unlocked!");
                break;

            case "unlockTriangle":
                this.triangleUnlocked = true;
                this.baseUpgradeShop.addTrianglesToShop();
                this.setupShopUI();
                break;
                
            case "circleWallValue":
                this.multipliers.prestigeMultipliers.circleWallValue = value;
                break;

            case "triangleValue":
            case "triangleCollisionValue":
                this.multipliers.prestigeMultipliers.shapes.triangle.value =
                    Math.max(this.multipliers.prestigeMultipliers.shapes.triangle.value, value);
                break;

            case "triangleSize":
                this.multipliers.prestigeMultipliers.shapes.triangle.size = value;
                break;

            case "triangleSpeed":
                this.multipliers.prestigeMultipliers.shapes.triangle.speed = value;
                break;

            case "squareValue":
            case "squareCollisionValue":
                this.multipliers.prestigeMultipliers.shapes.square.value =
                    Math.max(this.multipliers.prestigeMultipliers.shapes.square.value, value);
                break;

            case "squareSize":
                this.multipliers.prestigeMultipliers.shapes.square.size = value;
                break;

            case "squareSpeed":
                this.multipliers.prestigeMultipliers.shapes.square.speed = value;
                break;

            case "clickValue":
                this.multipliers.prestigeMultipliers.clickValue = value;
                break;

            case "clickUpgradeEffectiveness":
                this.multipliers.prestigeMultipliers.clickUpgradeEffectiveness = value;
                break;

            case "currencyMultiplier":
                this.multipliers.prestigeMultipliers.currencyMultiplier = value;
                break;

            case "globalSpeed":
                this.multipliers.prestigeMultipliers.globalSpeed = value;
                break;

            case "globalSize":
                this.multipliers.prestigeMultipliers.globalSize = value;
                break;

            case "circleCostScaling":
                this.multipliers.prestigeMultipliers.costScaling.circle = 1 / value;
                this.applyCostScalingMultiplier(
                    'ballShop',
                    this.multipliers.prestigeMultipliers.costScaling.circle
                );
                break;

            case "squareCostScaling":
                this.multipliers.prestigeMultipliers.costScaling.square = 1 / value;
                this.applyCostScalingMultiplier(
                    'squareShop',
                    this.multipliers.prestigeMultipliers.costScaling.square
                );
                break;

            case "triangleCostScaling":
                this.multipliers.prestigeMultipliers.costScaling.triangle = 1 / value;
                this.applyCostScalingMultiplier(
                    'triangleShop',
                    this.multipliers.prestigeMultipliers.costScaling.triangle
                );
                break;

            case "speedCollisionValue":
                this.multipliers.prestigeMultipliers.speedCollisionValue = value;
                break;

            case "sizeCollisionValue":
                this.multipliers.prestigeMultipliers.sizeCollisionValue = value;
                break;

            case "massCollisionValue":
                this.multipliers.prestigeMultipliers.massCollisionValue = value;
                break;

            case "prestigeGain":
                this.multipliers.prestigeMultipliers.prestigeGain = value;
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
        const preview = this.calculatePrestigePreview();
        return {
            balance: this.prestigeUpgradeShop.getBalance(),
            ...preview,
            prestige: this.prestigeStats,
            upgrades: this.prestigeUpgradeShop.items.map(item => ({
                name: item.name,
                level: item.level,
                maxLevel: item.maxLevel,
                price: item.price,
                valueEquation: item.valueEquation,
                effectKey: item.effectKey,
                canAfford: this.prestigeUpgradeShop.getBalance() >= item.price
            }))
        };
    }

    calculatePrestigePreview() {
        const totalPointsEarned = this.run.totalPointsEarned;
        const totalCollisions = this.circleBoard.getTotalShapeCollisions();
        const basePrestigePoints = PRESTIGE_EQUATIONS.basePoints(totalPointsEarned);
        const collisionMultiplier = PRESTIGE_EQUATIONS.collisionMultiplier(totalCollisions);
        const prestigeUpgradeMultiplier = this.multipliers.prestigeMultipliers.prestigeGain || 1;
        const estimatedAward = PRESTIGE_EQUATIONS.finalAward(
            totalPointsEarned,
            totalCollisions,
            prestigeUpgradeMultiplier
        );

        return {
            totalPointsEarned,
            totalCollisions,
            basePrestigePoints,
            collisionMultiplier,
            prestigeUpgradeMultiplier,
            estimatedAward,
            minimumRunPoints: PRESTIGE_EQUATIONS.minimumRunPoints,
            canPrestige: totalPointsEarned >= PRESTIGE_EQUATIONS.minimumRunPoints && estimatedAward > 0
        };
    }

    prestige() {
        const preview = this.calculatePrestigePreview();
        if (!preview.canPrestige) {
            return {
                success: false,
                reason: `Earn at least ${PRESTIGE_EQUATIONS.minimumRunPoints} run points before prestiging.`,
                ...preview
            };
        }

        this.prestigeUpgradeShop.addBalance(preview.estimatedAward);
        this.prestigeStats.lifetimePoints += preview.estimatedAward;
        this.prestigeStats.lastAward = preview.estimatedAward;
        this.prestigeStats.totalPrestiges += 1;
        this.resetRunState();
        this.saveGameState();

        return {
            success: true,
            awarded: preview.estimatedAward,
            ...this.calculatePrestigePreview()
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
                points: this.prestigeUpgradeShop.getBalance(),
                lifetimePoints: this.prestigeStats.lifetimePoints,
                lastAward: this.prestigeStats.lastAward,
                totalPrestiges: this.prestigeStats.totalPrestiges,
                totalPointsEarned: this.run.totalPointsEarned,
                prestigePointsEarned: this.prestigeStats.lifetimePoints,
                totalCollisions: this.circleBoard.getTotalShapeCollisions(),
                totalWallHits: this.run.totalWallHits
            },
            version: '0.0.7',
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

            if (!success) {
                console.error('Failed to load game state: Version mismatch or unsupported version');
                return false;
            }

            console.log('Game state loaded successfully');
            return true;
        } catch (error) {
            console.error('Error loading game state:', error);
            return false;
        }
    }
    
    // Reset the complete account, including permanent prestige progress.
    resetAllProgress(seed=null) {
        this.prestigeUpgradeShop.resetShop();
        this.prestigeStats = {
            lifetimePoints: 0,
            lastAward: null,
            totalPrestiges: 0
        };
        this.resetRunState(seed);
        this.saveGameState();
    }

    // Reset run progress while retaining permanent prestige upgrades and points.
    resetRunState(seed=null) {
        // Stop existing loops
        this.stopGame();
        
        // Reset CircleBoard
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
        this.triangleUnlocked = false;
        this.multipliers = {
            prestigeMultipliers: {
                clickValue: 1,
                clickUpgradeEffectiveness: 1,
                circleWallValue: 1,
                shapeValue: 1,
                shapeSpeed: 1,
                currencyMultiplier: 1,
                globalSpeed: 1,
                globalSize: 1,
                speedCollisionValue: 1,
                sizeCollisionValue: 1,
                massCollisionValue: 1,
                prestigeGain: 1,
                costScaling: {
                    circle: 1,
                    square: 1,
                    triangle: 1
                },
                shapes: {
                    circle: {
                        speed: 1,
                        value: 1,
                        size: 1
                    },
                    square: {
                        speed: 1,
                        value: 1,
                        size: 1
                    },
                    triangle: {
                        speed: 1,
                        value: 1,
                        size: 1
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
            this.clickerObject.clickCount = 0;
        }
        this.clickerValue = 1;
        // Initialize the CircleBoard
        this.circleBoard.initialize(this.seed);
        this.circleBoard.setSeed(this.seed);
        this.clickerObject.setSeed(this.seed);
        this.run = {
            totalPointsEarned: 0,
            totalWallHits: 0
        };
        this.applyAllPrestigeUpgrades();
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
    
    // Add normal points to the current run.
    addPointsAndCheckPrestige(points) {
        if (!Number.isFinite(points) || points <= 0) return;
        this.run.totalPointsEarned += points;
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
            this.lastUiUpdate = lastFrameTime;
            this.lastSaveTime = lastFrameTime;

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
                                        const shapeCount = this.circleBoard.shapes.length;
                                        // A single shape cannot collide with another shape, so
                                        // substeps are only needed as the board fills.
                                        const subIntervals = shapeCount < 25
                                            ? 1
                                            : Math.min(8, Math.max(2, Math.ceil(shapeCount / 75)));
                    for (const shape of this.circleBoard.shapes) {
                        const shapeName = shape.getName().toLowerCase();


                        const shapeMultipliers = this.multipliers.prestigeMultipliers.shapes[shapeName]
                            || { speed: 1, value: 1, size: 1 };
                        const temporaryShapeMultipliers =
                            this.multipliers.temporaryMultipliers.shapes[shapeName]
                            || { speed: 1, value: 1 };
                        const totalSpeedMultiplier = this.getSafeProduct(
                            this.multipliers.prestigeMultipliers.shapeSpeed,
                            this.multipliers.prestigeMultipliers.globalSpeed,
                            this.multipliers.temporaryMultipliers.shapeSpeed,
                            shapeMultipliers.speed,
                            temporaryShapeMultipliers.speed
                        );
                        speedMultipliers[shapeName] = totalSpeedMultiplier/subIntervals;
                    }

                    for (let i = 0; i < subIntervals; i++) {


                        const stats = this.circleBoard.updatePhysics(speedMultipliers);

                        // Update balances based on shape collisions
                        this.run.totalWallHits += stats.total.totalWallHits;
                        for (const [shapeType, shapeStats] of Object.entries(stats)) {
                            if(shapeType === 'total') continue;
                            const shapeName = shapeType.toLowerCase();
                            const shapeMultipliers = this.multipliers.prestigeMultipliers.shapes[shapeName]
                                || { speed: 1, value: 1, size: 1 };
                            const temporaryShapeMultipliers =
                                this.multipliers.temporaryMultipliers.shapes[shapeName]
                                || { speed: 1, value: 1 };
                            
                            // Calculate total value multiplier for this shape
                            const totalValueMultiplier = this.getSafeProduct(
                                this.multipliers.prestigeMultipliers.shapeValue,
                                this.multipliers.prestigeMultipliers.currencyMultiplier,
                                this.multipliers.prestigeMultipliers.globalSize,
                                this.multipliers.prestigeMultipliers.speedCollisionValue,
                                this.multipliers.prestigeMultipliers.sizeCollisionValue,
                                this.multipliers.prestigeMultipliers.massCollisionValue,
                                this.multipliers.temporaryMultipliers.shapeValue,
                                shapeMultipliers.size,
                                shapeMultipliers.value,
                                temporaryShapeMultipliers.value
                            );
                            switch (shapeType) {
                                case 'Circle':
                                {
                                    const wallHitPoints = shapeStats.totalWallHits
                                        * totalValueMultiplier
                                        * this.multipliers.prestigeMultipliers.circleWallValue;
                                    this.baseUpgradeShop.addBalance(wallHitPoints);
                                    this.addPointsAndCheckPrestige(wallHitPoints);
                                    break;
                                }
                                case 'Square':
                                {
                                    const collisionPoints = shapeStats.totalShapeCollisions * totalValueMultiplier;
                                    this.baseUpgradeShop.addBalance(collisionPoints);
                                    this.addPointsAndCheckPrestige(collisionPoints);
                                    break;
                                }
                            }
                        }
                    }

                    if (currentTime - this.lastUiUpdate >= 100) {
                        this.updateButtonAppearance();
                        this.updateCollisionDisplay();
                        this.updateBalanceDisplay();
                        this.lastUiUpdate = currentTime;
                    }

                    this.processTemporaryMultipliers();

                    if (currentTime - this.lastSaveTime >= 1000) {
                        this.scheduleSave();
                        this.lastSaveTime = currentTime;
                    }

                    accumulator -= frameInterval;
                }

                // Render at the current frame rate
                this.circleBoard.render();
                this.clickerObject?.draw();
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

    scheduleSave() {
        if (this.saveTimerId || this.saveIdleCallbackId) return;

        const save = () => {
            this.saveTimerId = null;
            this.saveIdleCallbackId = null;
            this.saveGameState();
        };

        if ('requestIdleCallback' in window) {
            this.saveIdleCallbackId = window.requestIdleCallback(save, { timeout: 2000 });
        } else {
            this.saveTimerId = window.setTimeout(save, 0);
        }
    }

    cancelScheduledSave() {
        if (this.saveTimerId) {
            window.clearTimeout(this.saveTimerId);
            this.saveTimerId = null;
        }
        if (this.saveIdleCallbackId) {
            window.cancelIdleCallback(this.saveIdleCallbackId);
            this.saveIdleCallbackId = null;
        }
    }

    destroy() {
        this.stopGame();
        this.cancelScheduledSave();
        this.clickerObject?.destroy();
        this.removeMenuButtonListeners();
        window.removeEventListener('resize', this.handleWindowResize);
    }
    
    initialize() {

        // Initialize the clicker object
        this.initializeClickerObject();

        // Setup menu listeners before loading so saved-state controls remain
        // available. The shop is built once by the selected initialization path.
        this.setupMenuButtons();



        // Try to load saved state
        if (!this.loadGameState()) {
            // No saved state, initialize with defaults
            this.circleBoard.initialize();
            this.circleBoard.addNewBalls(1);

            // Force resize and render BEFORE starting the game loop
            this.setupShopUI();
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
