import React, { useState, useEffect, useRef } from 'react';
import './PrestigePopup.css';

const PrestigePopup = ({ isOpen, onClose, prestigeShop, onPurchase }) => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [canAfford, setCanAfford] = useState({});
  const [zoom, setZoom] = useState(1);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const treeRef = useRef();

  // Define the upgrade tree structure with grid positions
  const upgradeTree = {
    nodes: [
      {
        id: 'unlock-square',
        name: 'Unlock Square',
        gridPosition: { row: 2, col: 3 }, // Center top
        dependencies: [],
        description: 'Unlocks square shapes in the game'
      },
      {
        id: 'increase-circle-size',
        name: 'Increase Base Circle Size',
        gridPosition: { row: 3, col: 2 }, // Left middle
        dependencies: [],
        description: 'Makes the container circle larger'
      },
      {
        id: 'increase-ball-speed',
        name: 'Increase Ball Speed',
        gridPosition: { row: 4, col: 4 }, // Right middle
        dependencies: ['unlock-square'],
        description: 'Increases the speed of all shapes'
      },
      {
        id: 'increase-ball-value',
        name: 'Increase Ball Value',
        gridPosition: { row: 5, col: 2 }, // Left bottom
        dependencies: ['increase-circle-size'],
        description: 'Increases points earned from collisions'
      },
      {
        id: 'increase-click-value',
        name: 'Increase Click Value',
        gridPosition: { row: 6, col: 4 }, // Right bottom
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

  // Update selected item when prestigeShop data changes
  useEffect(() => {
    if (selectedItem && prestigeShop) {
      const updatedItem = getItemByName(selectedItem.item.name);
      if (updatedItem && (updatedItem.level !== selectedItem.item.level || updatedItem.price !== selectedItem.item.price)) {
        setSelectedItem({ node: selectedItem.node, item: updatedItem });
      }
    }
  }, [prestigeShop, selectedItem]);

  // Zoom handler
  useEffect(() => {
    const handleWheel = (e) => {
      if (!treeRef.current || !isOpen) return;
      if (e.ctrlKey) return; // Don't interfere with browser zoom
      e.preventDefault();
      setZoom(z => Math.max(0.5, Math.min(2, z - e.deltaY * 0.001)));
    };
    const tree = treeRef.current;
    tree?.addEventListener('wheel', handleWheel, { passive: false });
    return () => tree?.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  // Drag handlers
  useEffect(() => {
    const tree = treeRef.current;
    if (!tree) return;
    let isDragging = false;

    const handleMouseDown = (e) => {
      // Only start drag if not clicking on an upgrade node
      if (e.target.classList.contains('upgrade-node')) return;
      setDragging(true);
      isDragging = true;
      dragStart.current = { x: e.clientX - drag.x, y: e.clientY - drag.y };
    };
    const handleMouseMove = (e) => {
      if (!dragging && !isDragging) return;
      // Adjust drag limits based on zoom
      const limit = 200 * zoom; // scale the drag limit with zoom
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;
      newX = Math.max(-limit, Math.min(limit, newX));
      newY = Math.max(-limit, Math.min(limit, newY));
      setDrag({ x: newX, y: newY });
    };
    const handleMouseUp = () => {
      setDragging(false);
      isDragging = false;
    };

    tree.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      tree.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, drag.x, drag.y, zoom]);

  const getItemByName = (name) => {
    return prestigeShop?.upgrades?.find(item => item.name === name);
  };

  // Calculate SVG connection positions based on grid layout
  const getConnectionPosition = (gridPos) => {
    // Convert grid position to percentage-based coordinates for SVG
    // Grid is 3 columns x 3 rows, so each cell is roughly 33.33% wide/tall
    const cellWidth = 100 / 9; // 11.11%
    const cellHeight = 100 / 9; // 11.11%

    // Center of each grid cell
    const x = (gridPos.col - 0.5) * cellWidth;
    const y = (gridPos.row - 0.5) * cellHeight;
    
    return { x, y };
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
    // Do NOT recenter or change drag/zoom when clicking an item
    setSelectedItem({ node, item });
  };

  const handlePurchase = () => {
    if (selectedItem && onPurchase) {
      const success = onPurchase(selectedItem.item.name);
      if (success) {
        // Wait a moment for the parent component to update, then refresh selected item
        setTimeout(() => {
          const updatedItem = getItemByName(selectedItem.item.name);
          if (updatedItem) {
            setSelectedItem({ node: selectedItem.node, item: updatedItem });
          }
        }, 10);
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
          <div
            className="upgrade-tree"
            ref={treeRef}
            style={{
              transform: `scale(${zoom}) translate(${drag.x / zoom}px, ${drag.y / zoom}px)`,
              transition: dragging ? 'none' : 'transform 0.2s'
            }}
          >
            <svg className="connections-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {upgradeTree.connections.map((connection, index) => {
                const fromNode = upgradeTree.nodes.find(n => n.id === connection.from);
                const toNode = upgradeTree.nodes.find(n => n.id === connection.to);
                
                if (!fromNode || !toNode) return null;
                if (!isItemUnlocked(toNode.dependencies)) return null; // Skip if toNode is not unlocked

                const fromPos = getConnectionPosition(fromNode.gridPosition);
                const toPos = getConnectionPosition(toNode.gridPosition);
                
                const fromItem = getItemByName(fromNode.name);
                const isConnectionActive = fromItem && fromItem.level > 0;
                
                return (
                  <line
                    key={index}
                    x1={fromPos.x}
                    y1={fromPos.y}
                    x2={toPos.x}
                    y2={toPos.y}
                    className={`connection-line ${isConnectionActive ? 'active' : 'inactive'}`}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </svg>
            
            <div className="upgrade-grid">
              {upgradeTree.nodes.map((node) => {
                const item = getItemByName(node.name);
                const isUnlocked = isItemUnlocked(node.dependencies);
                if (!isUnlocked) return null; 
                const isPurchased = item && item.level > 0;
                const affordable = canAfford[node.name];
                let value = ''
                if(item.level == item.maxLevel){
                  value = "max"
                }
                else{
                  value = isPurchased ? 'purchased': '';
                }
                
                return (
                  <div
                    key={node.id}
                    className={`upgrade-node ${value} ${!isUnlocked ? 'locked' : ''} ${affordable && isUnlocked ? 'affordable' : 'unaffordable'}`}
                    style={{
                      gridRow: node.gridPosition.row,
                      gridColumn: node.gridPosition.col
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