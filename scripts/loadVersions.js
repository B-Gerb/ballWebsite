window.loadVersions = {
    load: load
};
function load(server){
    
    const savedState = localStorage.getItem('circleBoardGameState');
    if (!savedState) {
        console.log('No saved game state found');
        return false;
    }
    try {
        const gameState = JSON.parse(savedState);
        if(! "version" in gameState){
            return loadPreVersion(server, gameState);
        }
        else{
            let version = gameState.version;
            switch (version) {
                case '0.0.1':
                    return load0_0_1(server, gameState);  
                case '0.0.2':
                    return load0_0_2(server, gameState);
                default:
                    console.log('Unknown game version:', version);
                    return false;
            }
        }
    }
    catch (error) {
        console.error('Error loading game state:', error);
        return false;
    }

}
function boardLoad(server, gameState){
    if (gameState.circleBoard) {
        server.circleBoard.ballCount = gameState.circleBoard.ballCount || server.circleBoard.ballCount;
        server.circleBoard.baseMinBallSize = gameState.circleBoard.baseMinBallSize || server.circleBoard.baseMinBallSize;
        server.circleBoard.baseMaxBallSize = gameState.circleBoard.baseMaxBallSize || server.circleBoard.baseMaxBallSize;
        server.circleBoard.baseReferenceSize = gameState.circleBoard.baseReferenceSize || server.circleBoard.baseReferenceSize;
        server.circleBoard.baseMinBallSpeed = gameState.circleBoard.baseMinBallSpeed || server.circleBoard.baseMinBallSpeed;
        server.circleBoard.baseMaxBallSpeed = gameState.circleBoard.baseMaxBallSpeed || server.circleBoard.baseMaxBallSpeed;
        server.circleBoard.canvas.width = server.circleBoard.canvas.parentElement.clientWidth;
        server.circleBoard.canvas.height = server.circleBoard.canvas.parentElement.clientHeight;
        server.circleBoard.calculateScaleFactor();
        server.circleBoard.initContainer();
        
        if (gameState.circleBoard.container) {
            server.circleBoard.container.color = gameState.circleBoard.container.color || server.circleBoard.container.color;
            server.circleBoard.container.borderColor = gameState.circleBoard.container.borderColor || server.circleBoard.container.borderColor;
        }
        
        if (gameState.circleBoard.balls && Array.isArray(gameState.circleBoard.balls)) {
            server.circleBoard.balls = gameState.circleBoard.balls.map(ballData => {
                // Ensure baseRadius is present, calculate if missing
                const baseRadius = ballData.baseRadius || 
                    (ballData.size / server.circleBoard.scaleFactor);
                
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
            
        } 
        else{

            // If no saved balls, initialize them
            server.circleBoard.initBalls();
        }
    }
        
}
function loadbaseUpgradeShop(server, gameState){
    if ("baseUpgradeShop" in gameState) {
        server.baseUpgradeShop.balance = gameState.baseUpgradeShop.balance || 0;
        if (gameState.baseUpgradeShop.items && Array.isArray(gameState.baseUpgradeShop.items)) {
            gameState.baseUpgradeShop.items.forEach(savedItem => {
                const item = server.baseUpgradeShop.getItem(savedItem.name);
                if (item) {
                    item.price = savedItem.price;
                    item.level = savedItem.level;
                }
            });
        }




    }
}
function loadSeed(server, gameState){
    if("seed" in gameState){
        server.setSeed(gameState.seed);
        server.circleBoard.setSeed(gameState.seed);
        server.clickerObject.setSeed(gameState.seed);
    }
}
function loadClicker(server, gameState){
    if (gameState.clicker && server.clickerObject) {
        server.clickerObject.clickCount = gameState.clicker.clickCount || 0;
    }
}
function loadclickShop(server, gameState){

    if ("clickShop" in gameState) {
        server.clickShop.balance = gameState.clickShop.balance || 0;
        if (gameState.clickShop.items && Array.isArray(gameState.clickShop.items)) {
            gameState.clickShop.items.forEach(savedItem => {
                const item = server.clickShop.getItem(savedItem.name);
                if (item) {
                    item.price = savedItem.price;
                    item.level = savedItem.level;
                }
            });
        }

    }
}
function loadTempMultiplier(server, gameState){
    if ("tempMultiplier" in gameState) {
        server.temporaryMultipliers = gameState.tempMultiplier.values;
        server.temporaryMultipliersActiveFrames = gameState.tempMultiplier.frames;

    }


}
    

function load0_0_2(server, gameState){
    boardLoad(server, gameState);
    if("shops" in gameState){
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
function load0_0_1(server, gameState){
    boardLoad(server, gameState);
    loadbaseUpgradeShop(server, gameState);
    loadSeed(server, gameState);
    loadClicker(server, gameState);
    server.updateBalanceDisplay();
    server.setupClickerUI();
    return true;
    
  
}
function loadPreVersion(server, gameState){
    boardLoad(server, gameState);

 
    // Load baseUpgradeShop 
    if ("shop" in gameState) {
        server.baseUpgradeShop.balance = gameState.shop.balance || 0;
        
        if (gameState.shop.items && Array.isArray(gameState.shop.items)) {
            gameState.shop.items.forEach(savedItem => {
                const item = server.baseUpgradeShop.getItem(savedItem.name);
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

