import React, { useState, useEffect, useMemo } from 'react';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import './PopularTrains.css';

const PopularTrains = ({ onSelectTrain }) => {
  const [trainsData, setTrainsData] = useState([]);
  const popularTrainNumbers = useMemo(() => [3326, 3255, 3256, 3883], []); // Wrap in useMemo

  // Fetch API key from external URL if undefined or null
  const fetchApiKey = async () => {
    try {
      const response = await fetch('https://ontrack-docker-551821400291.us-central1.run.app/api/key');
      const data = await response.json();
      return data.apiKey;
    } catch (err) {
      console.error('Error fetching API key:', err);
      return null;
    }
  };

  // Fetch data for the popular trains
  useEffect(() => {
    const handleResize = () => {
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Ensure the initial state is set correctly
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchTrainData = async (trainNumber) => { // Get train data from NJTransit API
      let token = process.env.REACT_APP_NJTRANSIT_API_KEY;

      if (!token) { // If token is not found in .env file
        console.log('Local .env secret not found, using external URL');
        token = await fetchApiKey(); // Fetch token from external URL
        if (!token) { // If token is still not found
          console.error('Token not found. Please check .env setup.');
          return null;
        }
      }

      const formData = new FormData();
      formData.append('token', token);
      formData.append('train', trainNumber);

      try {
        const response = await fetch(
          'https://raildata.njtransit.com/api/TrainData/getTrainStopList',
          {
            method: 'POST',
            headers: {
              'Accept': 'text/plain',
            },
            body: formData,
          }
        );
        const data = await response.json();
        return data;
      } catch (err) {
        console.error(`Error fetching train ${trainNumber}:`, err);
        return null;
      }
    };

    const fetchAllTrainsData = async () => {
      const data = await Promise.all( // This runs all the fetchTrainData requests simultaneously
        popularTrainNumbers.map((trainNumber) => fetchTrainData(trainNumber)) // Uses the list of train numbers to get data
      );
      setTrainsData(data); // Stores the data for each train in this array
    };

    fetchAllTrainsData(); // Runs the function so the data is ready when the component is rendered
  }, [popularTrainNumbers]);

  // Calculate time to specific stations
  const getTimeToStation = (stops, targetStation) => {
    if (!stops) return 'N/A'; // Returns N/A if there aren't any stops
    const stop = stops.find((stop) => stop.STATIONNAME === targetStation);
    // ^ Looks through the list of stations for the target station, returns station info
    if (!stop) return 'N/A'; // Returns N/A if the target station isn't found
    return stop.TIME ? new Date(stop.TIME).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A';
    // ^ This converts the time into the desired format
};

  // Determine the custom status based on arrival and departure times
  const getStopStatus = (arrivalTime, departureTime) => {
    if (!arrivalTime || !departureTime) return 'N/A'; // Error handling if items are missing/invalid

    const arrival = new Date(Date.parse(arrivalTime)); // Reformats arrival time
    const departure = new Date(Date.parse(departureTime)); // Reformats departure time

    if (isNaN(arrival) || isNaN(departure)) return 'N/A'; // Error handling if items are missing/invalid

    return arrival > departure ? 'Late' : 'On Time'; // Returns late if arrival > departure, else On Time
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '10px' }}>Popular Trains</h2>
      <div style={styles.trainContainer}>
        {popularTrainNumbers.map((trainNumber, index) => {
          const train = trainsData[index];
          const isAvailable = train && train.TRAIN_ID;
          const backgroundColor = isAvailable ? train.BACKCOLOR : '#888888';
          const textColor = isAvailable ? train.FORECOLOR : '#FFFFFF';
          const pillBackgroundColor = isAvailable ? 'rgba(160, 160, 160, 0.8)' : 'rgba(102, 102, 102, 0.8)'; // Ensure translucent

          // Determine target station: Woodbridge, Metropark, or New York Penn Station
          let targetStation = 'N/A';
          if (isAvailable) {
            const lastStop = train.STOPS[train.STOPS.length - 1]?.STATIONNAME;
            if (lastStop === 'New York Penn Station') {
              targetStation = 'New York Penn Station';
            } else {
              targetStation = train.LINECODE === 'NC' ? 'Woodbridge' : 'Metropark';
            }
          }

          // Calculate arrival time at target station
          const timeToStation = getTimeToStation(train?.STOPS, targetStation);

          // Get custom status for the train
          const customStatus = isAvailable
            ? getStopStatus(train.STOPS[0]?.TIME, train.STOPS[0]?.DEP_TIME)
            : 'N/A';

          // Determine circle color based on status
          const circleColor = customStatus === 'On Time' ? '#90EE90' : 'red';

          // Handle display text when the train is not active
          const displayText = isAvailable
            ? (
              <>
                <p style={styles.stationText}>To {targetStation}: {timeToStation}</p>
                <div style={{ ...styles.statusPill, color: textColor, backgroundColor: pillBackgroundColor }}>
                  <span style={styles.statusText}>{customStatus}</span>
                  <span style={{ ...styles.statusCircle, borderColor: textColor, backgroundColor: circleColor }}></span>
                </div>
              </>
            )
            : <p>Train is not currently active</p>;

          return (
            <div
              key={trainNumber}
              onClick={() => isAvailable && onSelectTrain(trainNumber)}
              className="trainCard" // Add class for hover effect
              style={{
                ...styles.trainCard,
                backgroundColor,
                color: textColor,
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.5,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between', // Ensure consistent placement of the pill
              }}
            >
              <h3>Train {trainNumber}</h3>
              {displayText}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Add responsive styles
const styles = {
  trainContainer: {
    display: 'flex',
    justifyContent: 'center',
    flexWrap: 'wrap', // Allow wrapping for mobile devices
    maxWidth: '100%', // Ensure container does not exceed screen width
  },
  trainCard: {
    width: '120px', // Smaller width for compact display
    padding: '10px',
    borderRadius: '5px',
    textAlign: 'center',
    margin: '10px', // Add margin for spacing between cards
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between', // Ensure consistent placement of the pill
    transition: 'transform 0.2s', // Add transition for hover effect
  },
  stationText: {
    marginTop: '0px', // Reduce top margin to move the text up
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 5px', // Decrease the size of the pill
    borderRadius: '15px',
    marginBottom: '5px',
    backgroundColor: 'rgba(160, 160, 160, 0.8)', // Ensure translucent
  },
  statusText: {
    flex: 1, // Ensure the text takes up the remaining space
    textAlign: 'center', // Center the text
    display: 'flex',
    alignItems: 'center', // Vertically center the text
    justifyContent: 'center', // Center the text horizontally
    padding: '2px 0', // Ensure vertical centering
  },
  statusCircle: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid',
    marginLeft: '5px', // Move the circle to the right of the status
  },
  trainCardHover: {
    boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)', // Add inner shadow on hover
  },
};

// Add media query for mobile devices
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @media (max-width: 768px) {
    .statusText {
      marginTop: '0px'; // Adjusted for mobile
    }
  }
`, styleSheet.cssRules.length);

// Add hover effect
document.addEventListener('DOMContentLoaded', () => {
  const trainCards = document.querySelectorAll('.trainCard');
  trainCards.forEach(card => {
    card.addEventListener('mouseover', () => {
      card.style.transform = 'scale(1.05)';
    });
    card.addEventListener('mouseout', () => {
      card.style.transform = 'scale(1)';
    });
  });
});

export default PopularTrains;
