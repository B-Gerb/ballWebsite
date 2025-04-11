// Example of how to use the new class structure

document.addEventListener('DOMContentLoaded', () => {
    // Create and initialize the server which will manage everything
    const gameServer = new Server('bouncingBallsCanvas');
    gameServer.initialize();
    
    // Add shop buttons to the UI
    const shopContainer = document.getElementById('shopContainer');
    
    if (shopContainer) {
        gameServer.shop.items.forEach(item => {
            const button = document.createElement('button');
            button.className = 'shop-item-button';
            button.innerHTML = `
                <h3>${item.name}</h3>
                <p>Level: <span id="${item.name.replace(/\s+/g, '-')}-level">${item.level}</span></p>
                <p>Cost: <span id="${item.name.replace(/\s+/g, '-')}-cost">${item.price.toFixed(2)}</span></p>
            `;
            
            button.addEventListener('click', () => {
                const success = gameServer.buyItem(item.name);
                
                if (success) {
                    // Update button text after purchase
                    const levelSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = button.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                } else {
                    // Show message if not enough balance
                    alert(`Not enough balance to buy ${item.name}. Need ${gameServer.shop.itemCost(item, 1)[0].toFixed(2)}, have ${gameServer.shop.balance.toFixed(2)}`);
                }
            });
            
            shopContainer.appendChild(button);
        });
        
        // Add reset button
        const resetButton = document.createElement('button');
        resetButton.textContent = 'Reset Game';
        resetButton.className = 'reset-button';
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset the game? This will erase all progress.')) {
                gameServer.resetGameState();
                
                // Update shop buttons
                gameServer.shop.items.forEach(item => {
                    const levelSpan = document.querySelector(`#${item.name.replace(/\s+/g, '-')}-level`);
                    const costSpan = document.querySelector(`#${item.name.replace(/\s+/g, '-')}-cost`);
                    const valueSpan = document.querySelector(`#${item.name.replace(/\s+/g, '-')}-value`);
                    
                    if (levelSpan) levelSpan.textContent = item.level;
                    if (costSpan) costSpan.textContent = item.price.toFixed(2);
                    if (valueSpan) valueSpan.textContent = item.getValue();
                });
            }
        });
        
        shopContainer.appendChild(resetButton);
    }
});