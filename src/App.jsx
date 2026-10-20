import { useEffect, useRef, useState } from 'react';
import Server from './Server';
import PrestigePopup from './components/PrestigePopup';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const clickerCanvasRef = useRef(null); // Add ref for clicker canvas
  const [, setCount] = useState(0);
  const [prestigeData, setPrestigeData] = useState(null);
  const [isPrestigePopupOpen, setIsPrestigePopupOpen] = useState(false);
  const initialized = useRef(false);
  const serverRef = useRef(null); // Store server instance

  useEffect(() => {
    // Initialize the game when the component mounts
    if (canvasRef.current && clickerCanvasRef.current && !initialized.current) {
      // Pass both canvas elements directly to Server
      initialized.current = true; // Set initialized to true to prevent re-initialization
      const server = Server.startGame(canvasRef.current, clickerCanvasRef.current);
      serverRef.current = server; // Store server reference
      setPrestigeData(server.getPrestigeShopData());
      // Optionally store server in state/ref if you need to interact with it later
      return () => {
        // Cleanup if needed when component unmounts
        // e.g., server.stopGame();
      };
    }
  }, []);

  useEffect(() => {
    const refreshPrestigeData = () => {
      const server = serverRef.current;
      if (server) {
        setPrestigeData(server.getPrestigeShopData());
      }
    };

    const refreshInterval = window.setInterval(refreshPrestigeData, 250);
    return () => window.clearInterval(refreshInterval);
  }, []);

  // Handler functions for prestige popup
  const handleOpenPrestigeShop = () => {
    setIsPrestigePopupOpen(true);
  };

  const handleClosePrestigeShop = () => {
    setIsPrestigePopupOpen(false);
  };

  const handlePrestigePurchase = (itemName) => {
    if (serverRef.current) {
      const success = serverRef.current.buyPrestigeUpgrade(itemName);
      if (success) {
        // Force re-render so the prestige tree picks up the new level/price
        setCount(prev => prev + 1);
        setPrestigeData(serverRef.current.getPrestigeShopData());
      }
      return success;
    }
    return false;
  };

  const handlePrestige = () => {
    const server = serverRef.current;
    if (!server) return false;
    const preview = server.calculatePrestigePreview();
    if (!preview.canPrestige) {
      window.alert(`Cannot prestige: earn at least ${preview.minimumRunPoints} run points first.`);
      return false;
    }
    const confirmed = window.confirm(
      `Prestige for ${preview.estimatedAward} points?\n\nRun points, shapes, and shop progress will reset. Permanent prestige upgrades remain.`
    );
    if (!confirmed) return false;

    const result = server.prestige();
    if (result.success) {
      setCount(prev => prev + 1);
      setPrestigeData(server.getPrestigeShopData());
      window.alert(`Prestige complete! You earned ${result.awarded} prestige points.`);
      return true;
    }
    setPrestigeData(server.getPrestigeShopData());
    window.alert(result.reason);
    return false;
  };

  return (
    <div>
      <h1>Bouncing Balls Inside Circle</h1>

      <div className="shop-balance-container">
        <label htmlFor="shopBalance"> Balance: <span id="shopBalance">0</span></label>
        <label htmlFor="clickShopBalance"> Click Shop Balance: <span id="clickShopBalance"> 0 </span></label>
        <label htmlFor="fpsCounter"> FPS: <span id="fpsCounter">0</span></label>
      </div>
      <div className="stats">
        <h3>Stats</h3>
        <div className="stat">
          <label htmlFor="offWallB"> Collision off wall per/sec: <span id="offWallB">0</span></label>
          <label htmlFor="offBallB"> Collision off other Balls per/sec: <span id="offBallB">0</span></label>
        </div>
      </div>
      <div className="container">
        <div className="canvas-container">
          <canvas ref={canvasRef} id="bouncingBallsCanvas"></canvas>
          <canvas ref={clickerCanvasRef} id="clickerCanvas"></canvas>
        </div>
        <div id="shopContainer" className="shop-container"></div>
        
      </div>
      <div className="controls">
        <button id="pauseButton">Pause</button>
        <button id="saveButton">Save</button>
        <button id="resetButton">Reset</button>
        <button
          onClick={handlePrestige}
          className="prestige-button"
          disabled={!prestigeData?.canPrestige}
          title={prestigeData?.canPrestige ? 'Convert this run into prestige points' : 'Earn more run points to prestige'}
        >
          Prestige
        </button>
        <button onClick={handleOpenPrestigeShop} className="prestige-button">
          Prestige Shop
        </button>
      </div>
      
      {/* Prestige Popup */}
      {serverRef.current && (
        <PrestigePopup 
          isOpen={isPrestigePopupOpen}
          onClose={handleClosePrestigeShop}
          prestigeShop={prestigeData}
          onPurchase={handlePrestigePurchase}
          onPrestige={handlePrestige}
        />
      )}
    </div>
  );
}

export default App;
