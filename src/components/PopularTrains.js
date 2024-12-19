import React, { useState, useEffect } from 'react';

const PopularTrains = ({ onSelectTrain }) => {
  const [trainsData, setTrainsData] = useState([]);
  const popularTrainNumbers = [3326, 3255, 3256, 3883]; // List of popular trains

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
  }, []);

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
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {popularTrainNumbers.map((trainNumber, index) => {
          const train = trainsData[index];
          const isAvailable = train && train.TRAIN_ID;
          const backgroundColor = isAvailable ? train.BACKCOLOR : '#888888';
          const textColor = isAvailable ? train.FORECOLOR : '#FFFFFF';

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

          // Handle display text when the train is not active
          const displayText = isAvailable
            ? (
              <>
                <p>Status: {customStatus}</p>
                <p>To {targetStation}: {timeToStation}</p>
              </>
            )
            : <p>Train is not currently active</p>;

          return (
            <div
              key={trainNumber}
              onClick={() => isAvailable && onSelectTrain(trainNumber)}
              style={{
                backgroundColor,
                color: textColor,
                width: '150px',
                padding: '10px',
                borderRadius: '5px',
                textAlign: 'center',
                cursor: isAvailable ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.5,
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

export default PopularTrains;
