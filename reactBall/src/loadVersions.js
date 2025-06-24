/**
 * Game state loading system for different versions
 * Handles backward compatibility and migration between versions
 * (Resizing/scaling code removed)
 */

// Version-specific loaders
const versionLoaders = {
    '0.0.1': load0_0_1,
    '0.0.2': load0_0_2,
    '0.0.3': load0_0_3,
    '0.0.4': load0_0_4
};

/**
 * Main load function - entry point for loading saved game state
 * @param {Object} server - Game server instance
 * @returns {boolean} - Success status
 */
import Circle from './circleboard/circle.js';
import Square from './circleboard/square.js';
function load(server) {
    const savedState = localStorage.getItem('circleBoardGameState');
    
    if (!savedState) {
        console.log('No saved game state found');
        return false;
    }

    try {
        const gameState = JSON.parse(savedState);
        
        if (!gameState.version) {
             loadPreVersion(server, gameState);
        }

        const versionLoader = versionLoaders[gameState.version];
        if (versionLoader) {
            return versionLoader(server, gameState);
        } else {
            console.log('Unknown game version:', gameState.version);
            return false;
        }
    } catch (error) {
        console.error('Error loading game state:', error);
        return false;
    }
}

/**
 * Load game board state (no scaling/resizing)
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function boardLoad(server, gameState) {
    if (!gameState.circleBoard) return;

    const { circleBoard } = gameState;
    
    // Handle shape info (new format vs legacy)
    loadShapeInfo(server, circleBoard);
    
    // Load basic board properties
    server.circleBoard.ballCount = circleBoard.ballCount || server.circleBoard.ballCount;
    server.circleBoard.baseReferenceSize = circleBoard.baseReferenceSize || server.circleBoard.baseReferenceSize;
    
    // Load container properties
    loadContainer(server, circleBoard);
    
    // Load shapes directly without scaling
    loadShapes(server, circleBoard);
}

/**
 * Load shape information with backward compatibility
 * @param {Object} server - Game server instance
 * @param {Object} circleBoard - Circle board state
 */
function loadShapeInfo(server, circleBoard) {
    if (circleBoard.shapeInfo) {
        server.circleBoard.shapeInfo = circleBoard.shapeInfo;
    } else {
        // Legacy support: Map old properties to new shapeInfo structure
        server.circleBoard.shapeInfo = server.circleBoard.shapeInfo || {
            'Circle': {
                baseMinBallSize: 5,
                baseMaxBallSize: 15,
                baseMinBallSpeed: 5,
                baseMaxBallSpeed: 15,
            },
            'Square': {
                baseMinSide: 5,
                baseMaxSide: 15,
                baseMinSpeed: 5,
                baseMaxSpeed: 15,
            }
        };
        
        // Map legacy properties
        const legacyMappings = [
            { from: 'baseMinBallSize', to: 'Circle.baseMinBallSize' },
            { from: 'baseMaxBallSize', to: 'Circle.baseMaxBallSize' },
            { from: 'baseMinBallSpeed', to: 'Circle.baseMinBallSpeed' },
            { from: 'baseMaxBallSpeed', to: 'Circle.baseMaxBallSpeed' }
        ];
        
        legacyMappings.forEach(({ from, to }) => {
            if (circleBoard[from]) {
                const [shape, prop] = to.split('.');
                server.circleBoard.shapeInfo[shape][prop] = circleBoard[from];
            }
        });
    }
}

/**
 * Load container properties
 * @param {Object} server - Game server instance
 * @param {Object} circleBoard - Circle board state
 */
function loadContainer(server, circleBoard) {
    if (circleBoard.container) {
        server.circleBoard.container = circleBoard.container;
    }
}

/**
 * Load shapes directly without scaling
 * @param {Object} server - Game server instance
 * @param {Object} circleBoard - Circle board state
 */
function loadShapes(server, circleBoard) {
    server.circleBoard.shapes = [];
    let counter = 0;
    
    if (circleBoard.shapes && Array.isArray(circleBoard.shapes)) {
        circleBoard.shapes.forEach(savedShape => {
            const shape = createShape(savedShape, counter++);
            if (shape) {
                server.circleBoard.shapes.push(shape);
            }
        });
    } else if (circleBoard.balls && Array.isArray(circleBoard.balls)) {
        // Legacy ball format
        circleBoard.balls.forEach(savedBall => {
            const circle = Circle.create(
                savedBall.position.x, 
                savedBall.position.y, 
                savedBall.radius, 
                savedBall.color, 
                savedBall.velocity.x, 
                savedBall.velocity.y
            );
            circle.id = counter++;
            server.circleBoard.shapes.push(circle);
        });
    } else {
        // No saved shapes, initialize with default
        server.circleBoard.addNewBalls(1);
    }
}

/**
 * Create a shape from saved data (no scaling)
 * @param {Object} savedShape - Saved shape data
 * @param {number} id - Shape ID
 * @returns {Object|null} - Created shape or null
 */
function createShape(savedShape, id) {
    let shape = null;
    
    switch (savedShape.name) {
        case 'Circle':
            shape = Circle.create(
                savedShape.center.x,
                savedShape.center.y,
                savedShape.radius,
                savedShape.color,
                savedShape.velocity.x,
                savedShape.velocity.y,
                savedShape.baseRadius
            );
            break;
            
        case 'Square':
            shape = Square.create(
                savedShape.center.x,
                savedShape.center.y,
                savedShape.side,
                savedShape.rotation,
                savedShape.color,
                savedShape.velocity.x,
                savedShape.velocity.y,
                savedShape.baseSide
            );
            break;
            
        default:
            console.error('Unknown shape type:', savedShape.name);
            return null;
    }
    
    if (shape) {
        shape.id = id;
    }
    
    return shape;
}

/**
 * Load base upgrade shop state
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadbaseUpgradeShop(server, gameState) {
    if (!gameState.baseUpgradeShop) return;
    
    const { baseUpgradeShop } = gameState;
    server.baseUpgradeShop.balance = baseUpgradeShop.balance || 0;
    
    if (!baseUpgradeShop.items) return;
    
    if (Array.isArray(baseUpgradeShop.items)) {
        // Legacy format - flat array
        loadLegacyShopItems(server, baseUpgradeShop.items);
    } else if (typeof baseUpgradeShop.items === 'object') {
        // New format - categorized items
        loadCategorizedShopItems(server, baseUpgradeShop.items);
    }
}

/**
 * Load legacy shop items (flat array format)
 * @param {Object} server - Game server instance
 * @param {Array} items - Saved items array
 */
function loadLegacyShopItems(server, items) {
    items.forEach(savedItem => {
        for (const category in server.baseUpgradeShop.items) {
            const item = server.baseUpgradeShop.items[category].find(i => i.name === savedItem.name);
            if (item) {
                item.price = savedItem.price;
                item.level = savedItem.level;
                break;
            }
        }
    });
}

/**
 * Load categorized shop items
 * @param {Object} server - Game server instance
 * @param {Object} items - Saved items by category
 */
function loadCategorizedShopItems(server, items) {
    for (const category in items) {
        // Handle square shop category
        if (category === 'squareShop' && !server.baseUpgradeShop.items.squareShop) {
            server.baseUpgradeShop.addSquaresToShop();
        }
        
        if (server.baseUpgradeShop.items[category]) {
            items[category].forEach(savedItem => {
                const item = server.baseUpgradeShop.items[category].find(i => i.name === savedItem.name);
                if (item) {
                    item.price = savedItem.price;
                    item.level = savedItem.level;
                }
            });
        }
    }
}

/**
 * Load click shop state
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadclickShop(server, gameState) {
    if (!gameState.clickShop) return;
    
    const { clickShop } = gameState;
    server.clickShop.balance = clickShop.balance || 0;
    
    if (clickShop.items && Array.isArray(clickShop.items)) {
        clickShop.items.forEach(savedItem => {
            const item = server.clickShop.getItem(savedItem.name);
            if (item) {
                item.price = savedItem.price;
                item.level = savedItem.level;
                
                // Special handling for click value
                if (savedItem.name === "Increase Click Value") {
                    server.clickerValue = item.getValue() || 1;
                }
            }
        });
    }
}

/**
 * Load seed state
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadSeed(server, gameState) {
    if (gameState.seed) {
        server.setSeed(gameState.seed);
        server.circleBoard.setSeed(gameState.seed);
        server.clickerObject.setSeed(gameState.seed);
    }
}

/**
 * Load clicker state
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadClicker(server, gameState) {
    if (gameState.clicker && server.clickerObject) {
        server.clickerObject.clickCount = gameState.clicker.clickCount || 0;
    }
}

/**
 * Load temporary multiplier state (legacy)
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadTempMultiplier(server, gameState) {
    if (gameState.tempMultiplier) {
        server.temporaryMultipliers = gameState.tempMultiplier.values;
        server.temporaryMultipliersActiveFrames = gameState.tempMultiplier.frames;
    }
}

/**
 * Load multipliers state (current format)
 * @param {Object} server - Game server instance
 * @param {Object} gameState - Saved game state
 */
function loadMultipliers(server, gameState) {
    if (gameState.multipliers) {
        server.multipliers = gameState.multipliers;
    }
    if (gameState.tempMultiplier?.frames) {
        server.temporaryMultipliersActiveFrames = gameState.tempMultiplier.frames;
    }
}

// Version-specific load functions
function load0_0_1(server, gameState) {
    boardLoad(server, gameState);
    loadbaseUpgradeShop(server, gameState);
    loadSeed(server, gameState);
    loadClicker(server, gameState);
    server.updateBalanceDisplay();
    server.setupClickerUI();
    return true;
}

function load0_0_2(server, gameState) {
    boardLoad(server, gameState);
    if (gameState.shops) {
        loadbaseUpgradeShop(server, gameState.shops);
        loadclickShop(server, gameState.shops);
    }
    loadSeed(server, gameState);
    loadClicker(server, gameState);
    loadTempMultiplier(server, gameState);
    server.updateBalanceDisplay();
    server.setupShopUI();
    return true;
}

function load0_0_3(server, gameState) {
    boardLoad(server, gameState);
    if (gameState.shops) {
        loadbaseUpgradeShop(server, gameState.shops);
        loadclickShop(server, gameState.shops);
    }
    loadSeed(server, gameState);
    loadClicker(server, gameState);
    loadTempMultiplier(server, gameState);
    server.updateBalanceDisplay();
    server.setupShopUI();
    return true;
}

function load0_0_4(server, gameState) {
    boardLoad(server, gameState);
    if (gameState.shops) {
        loadbaseUpgradeShop(server, gameState.shops);
        loadclickShop(server, gameState.shops);
    }
    loadSeed(server, gameState);
    loadClicker(server, gameState);
    loadMultipliers(server, gameState);
    server.updateBalanceDisplay();
    server.setupShopUI();
    return true;
}

function loadPreVersion(server, gameState) {
    boardLoad(server, gameState);
    
    // Load legacy shop format
    if (gameState.shop) {
        server.baseUpgradeShop.balance = gameState.shop.balance || 0;
        
        if (gameState.shop.items && Array.isArray(gameState.shop.items)) {
            gameState.shop.items.forEach(savedItem => {
                const item = server.baseUpgradeShop.getItem(savedItem.name)[0];
                if (item) {
                    item.price = savedItem.price;
                    item.level = savedItem.level;
                }
            });
        }
        
        server.updateBalanceDisplay();
        server.setupShopUI();
    }
    
    if (gameState.clicker && server.clickerObject) {
        server.clickerObject.clickCount = gameState.clicker.clickCount || 0;
    }
    
    return true;
}

// Export the main interface
const loadVersions = {
    load
};

export default loadVersions;