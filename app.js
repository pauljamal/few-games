import React, { useState, useEffect, useRef } from 'react';

// Main App component for the Color Wheel Game
const App = () => {
  // Use a ref to access the SVG element for drag calculations
  const svgRef = useRef(null);
  
  // State variables for the game
  const [score, setScore] = useState(0);
  const [targetColor, setTargetColor] = useState({ r: 0, g: 0, b: 0 });
  const [playerColor, setPlayerColor] = useState({ r: 0, g: 0, b: 0 });
  
  // State for tab angles in degrees
  const [angles, setAngles] = useState({
    r: 0,
    g: 120,
    b: 240,
  });
  
  // State to manage drag interaction
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTab, setDraggedTab] = useState(null);
  const [winMessageVisible, setWinMessageVisible] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(60);
  const timerRef = useRef(null);

  // Scoring state for win streaks
  const [multiplier, setMultiplier] = useState(1);

  // State for the color theory cheat sheet pop-up
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  
  // Sound generation functions using Web Audio API
  const playSound = (frequency, duration, type) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    gainNode.gain.setValueAtTime(1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
  };

  const playWinSound = () => {
    playSound(440, 0.2, 'sine');
    setTimeout(() => playSound(660, 0.2, 'sine'), 250);
  };

  const playLoseSound = () => {
    playSound(300, 0.5, 'triangle');
    setTimeout(() => playSound(200, 0.5, 'triangle'), 500);
  };

  // Constants for the color wheel
  const wheelRadius = 120;
  const wheelCenter = { x: 150, y: 150 };
  
  // Function to generate a new random target color and start a new round
  const generateNewColor = () => {
    const newColor = {
      r: Math.floor(Math.random() * 256),
      g: Math.floor(Math.random() * 256),
      b: Math.floor(Math.random() * 256),
    };
    setTargetColor(newColor);
    setWinMessageVisible(false);
    setIsGameActive(true);
    setIsPaused(false);
    setTimeLeft(60); // Reset timer
  };
  
  // Function to calculate color value (0-255) from a normalized angle (0-360)
  const calculateColorFromAngle = (angle) => {
    // Normalize the angle to be within 0-360 degrees
    const normalizedAngle = angle >= 0 ? angle : 360 + (angle % 360);
    // Convert angle to a value between 0 and 255
    return Math.round((normalizedAngle / 360) * 255);
  };

  // Function to calculate the position of a tab from its angle
  const getTabPosition = (angle) => {
    // Convert angle to radians for trigonometric functions
    const radians = (angle * Math.PI) / 180;
    // Calculate x and y coordinates on the circle
    const x = wheelCenter.x + wheelRadius * Math.cos(radians);
    const y = wheelCenter.y + wheelRadius * Math.sin(radians);
    return { x, y };
  };

  // Function to calculate angle from mouse/touch position
  const calculateAngleFromPos = (clientX, clientY) => {
    const svgRect = svgRef.current.getBoundingClientRect();
    const x = clientX - (svgRect.left + wheelCenter.x);
    const y = clientY - (svgRect.top + wheelCenter.y);
    // Calculate the angle using Math.atan2 and convert from radians to degrees
    let angle = Math.atan2(y, x) * (180 / Math.PI);
    // Normalize angle to be between 0 and 360
    if (angle < 0) {
      angle += 360;
    }
    return angle;
  };

  // Handler for mouse and touch start events
  const handleStartDrag = (e, tabName) => {
    e.preventDefault();
    if (!isGameActive || isPaused) return; // Prevent dragging if game is over or paused
    setIsDragging(true);
    setDraggedTab(tabName);
  };

  // Handler for mouse and touch end events
  const handleEndDrag = () => {
    setIsDragging(false);
    setDraggedTab(null);
  };

  // Handler for mouse and touch move events
  const handleMove = (e) => {
    if (!isDragging || !isGameActive || isPaused) return;
    
    // Prevent the default touch action, like scrolling
    e.preventDefault();

    // Get client coordinates, handling both mouse and touch events
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

    const newAngle = calculateAngleFromPos(clientX, clientY);
    
    // Update the angle of the dragged tab
    setAngles(prevAngles => ({
      ...prevAngles,
      [draggedTab]: newAngle,
    }));
  };
  
  // Resets all tabs to their default positions
  const resetTabs = () => {
    setAngles({
      r: 0,
      g: 120,
      b: 240,
    });
  };
  
  // Effect to update the player's color whenever tab angles change
  useEffect(() => {
    const r = calculateColorFromAngle(angles.r);
    const g = calculateColorFromAngle(angles.g);
    const b = calculateColorFromAngle(angles.b);
    setPlayerColor({ r, g, b });
  }, [angles]);

  // Effect to handle win condition and score update
  useEffect(() => {
    if (!winMessageVisible && isGameActive) {
      const isMatch = (color1, color2) => {
        // Define tolerance for each RGB channel
        const tolerance = 15;
        // Check if each channel is within the tolerance range
        return (
          Math.abs(color1.r - color2.r) <= tolerance &&
          Math.abs(color1.g - color2.g) <= tolerance &&
          Math.abs(color1.b - color2.b) <= tolerance
        );
      };
      
      // Check for a match and update state if a match is found
      if (isMatch(targetColor, playerColor)) {
        setScore(prevScore => prevScore + (100 * multiplier));
        setMultiplier(prevMult => prevMult + 1); // Increase multiplier on win
        setWinMessageVisible(true);
        setIsGameActive(false); // Stop game on win
        playWinSound(); // Play win sound
      }
    }
  }, [playerColor, targetColor, winMessageVisible, isGameActive, multiplier]);

  // Effect to handle the game timer
  useEffect(() => {
    if (isGameActive && timeLeft > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prevTime => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && isGameActive) {
      // Game over
      setIsGameActive(false);
      setMultiplier(1); // Reset multiplier on lose
      playLoseSound(); // Play lose sound
    }

    return () => {
      clearInterval(timerRef.current);
    };
  }, [isGameActive, timeLeft, isPaused]);

  // Effect to lock/unlock screen scrolling
  useEffect(() => {
    if (isDragging || showCheatSheet) {
      // Lock scrolling by setting overflow to hidden on the body
      document.body.style.overflow = 'hidden';
    } else {
      // Unlock scrolling by setting overflow back to auto
      document.body.style.overflow = 'auto';
    }
  }, [isDragging, showCheatSheet]);
  
  // Effect to set up and clean up global event listeners for dragging
  useEffect(() => {
    // Get mouse/touch event listeners based on dragging state
    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEndDrag);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEndDrag);
    } else {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEndDrag);
    }
    
    // Clean-up function to remove listeners
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging]);
  
  // Initialize the game on component mount
  useEffect(() => {
    generateNewColor();
  }, []);

  // Get the positions for each draggable tab
  const { x: rX, y: rY } = getTabPosition(angles.r);
  const { x: gX, y: gY } = getTabPosition(angles.g);
  const { x: bX, y: bY } = getTabPosition(angles.b);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center bg-gradient-to-br from-purple-800 to-blue-900 font-sans">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl p-6 md:p-8 flex flex-col items-center space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-row justify-between items-center w-full">
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800">
            Color Wheel Game
          </h1>
          <div className="flex items-center space-x-2">
            <div className="flex items-center text-lg md:text-2xl font-bold text-slate-600 space-x-2">
              <span role="img" aria-label="trophy">🏆</span>
              <span>Score: {score}</span>
            </div>
          </div>
        </header>

        {/* Timer Display */}
        <div className="text-3xl md:text-4xl font-bold text-slate-700 tracking-wider">
          <span className={`${timeLeft <= 10 && timeLeft > 0 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Color Display Section */}
        <div className="flex flex-col md:flex-row justify-center items-center w-full space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex flex-col items-center">
            <div
              className="w-48 md:w-56 h-16 md:h-20 rounded-xl shadow-lg border-2 border-slate-300 transition-colors duration-300"
              style={{ backgroundColor: `rgb(${targetColor.r}, ${targetColor.g}, ${targetColor.b})` }}
            ></div>
            <p className="mt-2 text-sm text-center text-slate-600">
              <span className="font-bold">Target</span>
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div
              className="w-48 md:w-56 h-16 md:h-20 rounded-xl shadow-lg border-2 border-slate-300 transition-colors duration-300"
              style={{ backgroundColor: `rgb(${playerColor.r}, ${playerColor.g}, ${playerColor.b})` }}
            ></div>
            <p className="mt-2 text-sm text-center text-slate-600">
              <span className="font-bold">Your Color</span>
            </p>
          </div>
        </div>
        
        {/* Pause Message Banner */}
        {isPaused && (
          <div className="w-full text-center py-3 px-4 bg-yellow-200 text-yellow-800 rounded-lg font-bold text-lg shadow-inner animate-fade-in-down">
            Game Paused! ⏸️
          </div>
        )}

        {/* Win/Lose Message Banner */}
        {winMessageVisible ? (
          <div className="w-full text-center py-3 px-4 bg-green-200 text-green-800 rounded-lg font-bold text-lg shadow-inner animate-fade-in-down">
            <span role="img" aria-label="celebration">🎉</span> Perfect match! Well done!
            {multiplier > 1 && (
              <span className="ml-2">({multiplier - 1}x Streak!)</span>
            )}
          </div>
        ) : timeLeft === 0 && !isGameActive ? (
          <div className="w-full text-center py-3 px-4 bg-red-200 text-red-800 rounded-lg font-bold text-lg shadow-inner animate-fade-in-down">
            <span role="img" aria-label="sad">⏰</span> Out of time! Try again.
          </div>
        ) : null}

        {/* Color Wheel Section */}
        <div className="relative">
          {/* Main wheel background with conic gradient */}
          <div
            className="w-[300px] h-[300px] rounded-full shadow-lg"
            style={{
              background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
            }}
          ></div>
          {/* Inner circle with radial gradient */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-inner"
            style={{
              width: `${(wheelRadius * 2)}px`,
              height: `${(wheelRadius * 2)}px`,
              background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,255,255,0) 100%)'
            }}
          ></div>

          {/* SVG canvas for draggable tabs */}
          <svg
            ref={svgRef}
            className="absolute top-0 left-0"
            viewBox="0 0 300 300"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Red Tab */}
            <g
              className={`cursor-grab active:cursor-grabbing transform transition-transform duration-100 ease-in-out ${(!isGameActive || isPaused) && 'pointer-events-none'}`}
              onMouseDown={(e) => handleStartDrag(e, 'r')}
              onTouchStart={(e) => handleStartDrag(e, 'r')}
            >
              <circle cx={rX} cy={rY} r="12" fill="#ff4444" stroke="white" strokeWidth="3" className="drop-shadow-sm"></circle>
              <text x={rX} y={rY + 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" alignmentBaseline="central">R</text>
            </g>

            {/* Green Tab */}
            <g
              className={`cursor-grab active:cursor-grabbing transform transition-transform duration-100 ease-in-out ${(!isGameActive || isPaused) && 'pointer-events-none'}`}
              onMouseDown={(e) => handleStartDrag(e, 'g')}
              onTouchStart={(e) => handleStartDrag(e, 'g')}
            >
              <circle cx={gX} cy={gY} r="12" fill="#44ff44" stroke="white" strokeWidth="3" className="drop-shadow-sm"></circle>
              <text x={gX} y={gY + 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" alignmentBaseline="central">G</text>
            </g>

            {/* Blue Tab */}
            <g
              className={`cursor-grab active:cursor-grabbing transform transition-transform duration-100 ease-in-out ${(!isGameActive || isPaused) && 'pointer-events-none'}`}
              onMouseDown={(e) => handleStartDrag(e, 'b')}
              onTouchStart={(e) => handleStartDrag(e, 'b')}
            >
              <circle cx={bX} cy={bY} r="12" fill="#4444ff" stroke="white" strokeWidth="3" className="drop-shadow-sm"></circle>
              <text x={bX} y={bY + 2} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white" alignmentBaseline="central">B</text>
            </g>
          </svg>
        </div>

        {/* Control Buttons */}
        <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 w-full justify-center">
          <button
            onClick={resetTabs}
            disabled={!isGameActive || isPaused}
            className={`py-3 px-6 rounded-xl font-bold shadow-md transition-colors duration-200 ${(!isGameActive || isPaused) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
          >
            Reset
          </button>
          <button
            onClick={generateNewColor}
            className="py-3 px-6 bg-blue-500 text-white rounded-xl font-bold shadow-md hover:bg-blue-600 transition-colors duration-200"
          >
            New Color
          </button>
          <button
            onClick={() => setIsPaused(!isPaused)}
            disabled={!isGameActive}
            className={`py-3 px-6 rounded-xl font-bold shadow-md transition-colors duration-200 ${!isGameActive ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : isPaused ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500'}`}
          >
            {isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          <button
            onClick={() => setShowCheatSheet(true)}
            className="py-3 px-6 bg-purple-500 text-white rounded-xl font-bold shadow-md hover:bg-purple-600 transition-colors duration-200"
          >
            Color Theory 🎨
          </button>
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-slate-500 mt-4">
          <p className="p-2">Drag the R, G, B tabs around the color wheel to mix colors and match the target!</p>
        </div>
      </div>

      {/* Color Theory Cheat Sheet Pop-up */}
      {showCheatSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900 bg-opacity-75 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative flex flex-col">
            <button
              onClick={() => setShowCheatSheet(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-4">
              Color Theory Cheat Sheet
            </h2>
            <div className="prose max-w-none text-slate-600 overflow-y-auto max-h-[70vh]">
              <p>Understanding these basic ideas can help you win! 🧠</p>
              <ul className="list-disc list-inside space-y-4">
                <li>
                  <span className="font-bold">Primary Colors: The Building Blocks 🧱</span>
                  <ul className="list-disc list-inside ml-4">
                    <li>❤️ Red</li>
                    <li>💚 Green</li>
                    <li>💙 Blue</li>
                  </ul>
                  <p className="mt-2 text-sm">You can't make these colors by mixing others.</p>
                </li>
                <li>
                  <span className="font-bold">Secondary Colors: Mix 'Em Up! 🧪</span>
                  <ul className="list-disc list-inside ml-4">
                    <li>❤️ + 💚 = 💛 Yellow</li>
                    <li>❤️ + 💙 = 💜 Magenta</li>
                    <li>💚 + 💙 = 🌊 Cyan</li>
                  </ul>
                  <p className="mt-2 text-sm">These are made by mixing two primary colors.</p>
                </li>
                <li>
                  <span className="font-bold">Complementary Colors: Opposite Attract! ☯️</span>
                  <ul className="list-disc list-inside ml-4">
                    <li>❤️ Red & 🌊 Cyan</li>
                    <li>💚 Green & 💜 Magenta</li>
                    <li>💙 Blue & 💛 Yellow</li>
                  </ul>
                  <p className="mt-2 text-sm">These are across from each other on the color wheel and give you a high-contrast look.</p>
                </li>
                <li>
                  <span className="font-bold">Analogous Colors: Best Friends Forever! 🤗</span>
                  <ul className="list-disc list-inside ml-4">
                    <li>Colors next to each other on the wheel, like Blue, Green, and Cyan.</li>
                  </ul>
                  <p className="mt-2 text-sm">They create a soft, friendly look.</p>
                </li>
                <li>
                  <span className="font-bold">Light & Dark: Changing the Mood 💡</span>
                  <ul className="list-disc list-inside ml-4">
                    <li><span className="font-bold">Tint:</span> A color with white added to make it lighter. ⚪️</li>
                    <li><span className="font-bold">Shade:</span> A color with black added to make it darker. ⚫️</li>
                  </ul>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
