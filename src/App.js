import React, { useState, useEffect } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';
import HelpOverlay from './components/HelpOverlay'; // Import HelpOverlay component
import './App.css';

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');
  const [isHelpVisible, setIsHelpVisible] = useState(false); // State for HelpOverlay visibility
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('isDarkMode');
    if (savedDarkMode !== null) {
      setIsDarkMode(savedDarkMode === 'true');
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('isDarkMode', isDarkMode);
  }, [isDarkMode]);

  // Handle train selection from PopularTrains
  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
  };

  // Toggle HelpOverlay visibility
  const toggleHelpOverlay = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`container App ${isDarkMode ? 'dark' : ''}`}>
      <div className="titleContainer">
        <div className="strip"></div>
        <h1 className="title">OnTrack</h1>
        <div className="strip"></div>
      </div>
      
      {/* Add the PopularTrains component */}
      <PopularTrains onSelectTrain={handleSelectTrain} />

      {/* TrainStatus component */}
      <TrainStatus initialTrainNumber={selectedTrain} />
      <HelpOverlay 
        isVisible={isHelpVisible} 
        onClose={toggleHelpOverlay} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
      />
      {!selectedTrain && <div className="helpButton" onClick={toggleHelpOverlay}>?</div>}
    </div>
  );
};

export default App;
