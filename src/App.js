import React, { useState } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';
import HelpOverlay from './components/HelpOverlay'; // Import HelpOverlay component
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Import carousel CSS
import './App.css'; // Import CSS file

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');
  const [isHelpVisible, setIsHelpVisible] = useState(false); // State for HelpOverlay visibility

  // Handle train selection from PopularTrains
  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
  };

  // Toggle HelpOverlay visibility
  const toggleHelpOverlay = () => {
    setIsHelpVisible(!isHelpVisible);
  };

  return (
    <div className="container">
      <div className="titleContainer">
        <div className="strip"></div>
        <h1 className="title">OnTrack</h1>
        <div className="strip"></div>
      </div>
      
      {/* Add the PopularTrains component */}
      <PopularTrains onSelectTrain={handleSelectTrain} />

      {/* TrainStatus component */}
      <TrainStatus initialTrainNumber={selectedTrain} />
      <HelpOverlay isVisible={isHelpVisible} onClose={toggleHelpOverlay} />
      {!selectedTrain && <div className="helpButton" onClick={toggleHelpOverlay}>?</div>}
    </div>
  );
};

export default App;
