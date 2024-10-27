import React, { useState } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');

  // Handle train selection from PopularTrains
  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>NJTransit Train Tracker</h1>
      
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
  title: {
    marginBottom: '20px',
    textAlign: 'center',
  },
};

export default App;
