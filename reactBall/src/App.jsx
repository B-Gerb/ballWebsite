import { useEffect, useRef, useState } from 'react';
import Server from './Server';
import './App.css';

function App() {
  const canvasRef = useRef(null);
  const clickerCanvasRef = useRef(null); // Add ref for clicker canvas
  const [count, setCount] = useState(0);
  const initialized = useRef(false)

  useEffect(() => {
    // Initialize the game when the component mounts
    if (canvasRef.current && clickerCanvasRef.current && !initialized.current) {
      // Pass both canvas elements directly to Server
      initialized.current = true; // Set initialized to true to prevent re-initialization
      const server = Server.startGame(canvasRef.current, clickerCanvasRef.current);
      // Optionally store server in state/ref if you need to interact with it later
      return () => {
        // Cleanup if needed when component unmounts
        // e.g., server.stopGame();
      };
    }
  }, []);

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
        </div>
        <div className="canvas-container">
          <canvas ref={clickerCanvasRef} id="clickerCanvas"></canvas>
        </div>
        <div id="shop" className="tab-content">
          <div id="shopContainer" className="shop-container"></div>
        </div>
      </div>
      <div className="controls">
        <button id="pauseButton">Pause</button>
        <button id="saveButton">Save</button>
        <button id="resetButton">Reset</button>
      </div>
    </div>
  );
}

export default App;
