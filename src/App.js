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
    <div style={styles.container}>
      <div style={styles.titleContainer}>
        <div style={styles.strip}></div>
        <h1 style={styles.title}>OnTrack</h1>
        <div style={styles.strip}></div>
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

// Styles for the overall layout
const styles = {
  container: {
    padding: '20px',
    margin: '0 auto',
    maxWidth: '800px',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  title: {
    fontFamily: 'Arial, sans-serif',
    fontStyle: 'italic',
    fontSize: '2em',
    margin: '0 10px',
  },
  strip: {
    width: '50px',
    height: '15px',
    background: 'linear-gradient(45deg, #f0803d, #b31b90, #014c97)',
    transform: 'skewX(-20deg)',
  },
  helpButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#f0803d',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5em',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  helpButtonHover: {
    backgroundColor: '#b31b90',
  },
};

export default App;
