import React, { useState, useEffect } from 'react';
import './PrestigePopup.css';

const PrestigePopup = ({ isOpen, onClose, prestigeShop, onPurchase }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [canAfford, setCanAfford] = useState({});

  // Define the upgrade tree structure with connections
  const upgradeTree = {
    nodes: [
      {
        id: 'unlock-square',
        name: 'Unlock Square',
        position: { x: 200, y: 100 },
        dependencies: [],
        description: 'Unlocks square shapes in the game'
      },
      {
        id: 'increase-circle-size',
        name: 'Increase Base Circle Size',
        position: { x: 100, y: 200 },
        dependencies: [],
        description: 'Makes the container circle larger'
      },
      {
        id: 'increase-ball-speed',
        name: 'Increase Ball Speed',
        position: { x: 300, y: 200 },
        dependencies: ['unlock-square'],
        description: 'Increases the speed of all shapes'
      },
      {
        id: 'increase-ball-value',
        name: 'Increase Ball Value',
        position: { x: 100, y: 300 },
        dependencies: ['increase-circle-size'],
        description: 'Increases points earned from collisions'
      },
      {
        id: 'increase-click-value',
        name: 'Increase Click Value',
        position: { x: 300, y: 300 },
        dependencies: ['increase-ball-speed'],
        description: 'Increases points earned from clicking'
      }
    ],
    connections: [
      { from: 'unlock-square', to: 'increase-ball-speed' },
      { from: 'increase-circle-size', to: 'increase-ball-value' },
      { from: 'increase-ball-speed', to: 'increase-click-value' }
    ]
  };

  // Update affordability when shop changes
  useEffect(() => {
    const affordable = {};
    if (prestigeShop && prestigeShop.upgrades) {
      prestigeShop.upgrades.forEach(item => {
        affordable[item.name] = item.canAfford;
      });
    }
    setCanAfford(affordable);
  }, [prestigeShop]);

  const getItemByName = (name) => {
    return prestigeShop?.upgrades?.find(item => item.name === name);
  };

  const isItemUnlocked = (dependencies) => {
    if (!dependencies || dependencies.length === 0) return true;
    
    return dependencies.every(depId => {
      const depNode = upgradeTree.nodes.find(n => n.id === depId);
      if (!depNode) return true;
      
      const depItem = getItemByName(depNode.name);
      return depItem && depItem.level > 0;
    });
  };

  const handleItemClick = (node) => {
    const item = getItemByName(node.name);
    if (!item) return;
    console.log("here!");
    

    
    setSelectedItem({ node, item });
  };

  const handlePurchase = () => {
    if (selectedItem && onPurchase) {
      const success = onPurchase(selectedItem.item.name);
      if (success) {
        setSelectedItem({ node: selectedItem.node, item: getItemByName(selectedItem.item.name) });
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="prestige-backdrop">
      <div className="prestige-popup">
        <div className="prestige-header">
          <h2>Prestige Upgrades</h2>
          <div className="prestige-balance">
            Balance: {prestigeShop?.balance?.toFixed(2) || '0.00'}
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="prestige-content">
          <div className="upgrade-tree">
            <svg className="connections-svg" width="400" height="400">
              {upgradeTree.connections.map((connection, index) => {
                const fromNode = upgradeTree.nodes.find(n => n.id === connection.from);
                const toNode = upgradeTree.nodes.find(n => n.id === connection.to);
                
                if (!fromNode || !toNode) return null;
                
                const fromItem = getItemByName(fromNode.name);
                const isConnectionActive = fromItem && fromItem.level > 0;
                
                return (
                  <line
                    key={index}
                    x1={fromNode.position.x}
                    y1={fromNode.position.y}
                    x2={toNode.position.x}
                    y2={toNode.position.y}
                    className={`connection-line ${isConnectionActive ? 'active' : 'inactive'}`}
                  />
                );
              })}
            </svg>
            
            {upgradeTree.nodes.map((node) => {
              const item = getItemByName(node.name);
              const isUnlocked = isItemUnlocked(node.dependencies);
              if (!isUnlocked) return null; 
              const isPurchased = item && item.level > 0;
              const affordable = canAfford[node.name];
              
              return (
                <div
                  key={node.id}
                  className={`upgrade-node ${isPurchased ? 'purchased' : ''} ${!isUnlocked ? 'locked' : ''} ${affordable && isUnlocked ? 'affordable' : ''}`}
                  style={{
                    left: node.position.x - 50,
                    top: node.position.y - 25
                  }}
                  onClick={() => handleItemClick(node)}
                  title={node.description}
                >
                  <div className="node-name">{node.name}</div>
                  {item && (
                    <div className="node-level">Level: {item.level}</div>
                  )}
                  {!isUnlocked && <div className="lock-icon">🔒</div>}
                </div>
              );
            })}
          </div>
          
          {selectedItem && (
            <div className="item-details">
              <h3>{selectedItem.node.name}</h3>
              <p>{selectedItem.node.description}</p>
              <p>Current Level: {selectedItem.item.level}</p>
              <p>Cost: {selectedItem.item.price.toFixed(2)}</p>
              {selectedItem.item.maxLevel && (
                <p>Max Level: {selectedItem.item.maxLevel}</p>
              )}
              <div className="item-actions">
                <button 
                  onClick={handlePurchase}
                  disabled={!canAfford[selectedItem.item.name] || (selectedItem.item.maxLevel && selectedItem.item.level >= selectedItem.item.maxLevel)}
                  className="purchase-button"
                >
                  {selectedItem.item.maxLevel && selectedItem.item.level >= selectedItem.item.maxLevel ? 'Max Level' : 'Purchase'}
                </button>
                <button onClick={() => setSelectedItem(null)} className="cancel-button">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PrestigePopup;
