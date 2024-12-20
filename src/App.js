import React, { useState } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';
import 'react-responsive-carousel/lib/styles/carousel.min.css'; // Import carousel CSS

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');

  // Handle train selection from PopularTrains
  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
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
};

export default App;
