import React, { useState, useEffect } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';
import HelpOverlay from './components/HelpOverlay'; // Import HelpOverlay component
import './App.css';

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');
  const [isHelpVisible, setIsHelpVisible] = useState(false); // State for HelpOverlay visibility
  const [displayMode, setDisplayMode] = useState('light'); // State for display mode

  useEffect(() => {
    const savedDisplayMode = localStorage.getItem('displayMode');
    if (savedDisplayMode !== null) {
      setDisplayMode(savedDisplayMode);
    }
  }, []);

  useEffect(() => {
    document.body.classList.remove('light', 'dark-mode', 'dark-analog');
    document.body.classList.add(displayMode);
    localStorage.setItem('displayMode', displayMode);
  }, [displayMode]);

  // Handle train selection from PopularTrains
  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
  };

  // Toggle HelpOverlay visibility
  const toggleHelpOverlay = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  // Toggle display mode
  const toggleDisplayMode = () => {
    setDisplayMode((prevMode) => {
      if (prevMode === 'light') return 'dark-mode';
      if (prevMode === 'dark-mode') return 'dark-analog';
      return 'light';
    });
  };

  return (
    <div className={`container App ${displayMode}`}>
      <div className="titleContainer">
        <div className="strip"></div>
        <h1 className="title">OnTrack</h1>
        <div className="strip"></div>
      </div>
      
      {/* PopularTrains component */}
      <PopularTrains onSelectTrain={handleSelectTrain} />

      {/* TrainStatus component */}
      <TrainStatus initialTrainNumber={selectedTrain} />
      <HelpOverlay 
        isVisible={isHelpVisible} 
        onClose={toggleHelpOverlay} 
        displayMode={displayMode} 
        toggleDisplayMode={toggleDisplayMode} 
      />
      {!selectedTrain && <div className="helpButton" onClick={toggleHelpOverlay}>?</div>}
    </div>
  );
};

export default App;
