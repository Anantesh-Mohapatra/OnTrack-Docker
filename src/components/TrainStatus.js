import React, { useState, useEffect } from 'react';

const TrainStatus = ({ initialTrainNumber = '' }) => {
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber); // Tracks train number, re-renders the component
  const [trainData, setTrainData] = useState(null); // Stores the train information from the API
  const [loading, setLoading] = useState(false); // Shows if the data is currently being fetched
  const [error, setError] = useState(''); // Stores error messages
  const [isTrainActive, setIsTrainActive] = useState(true); // To track if the train is active
  const [nextStop, setNextStop] = useState(null); // To store the next stop
  const [lastStop, setLastStop] = useState(null); // To store the last stop

  useEffect(() => { // Sees if there's a train number given, and fetches the relevant information
    if (initialTrainNumber) {
      setTrainNumber(initialTrainNumber);
      fetchTrainStopList(initialTrainNumber);
    }
  }, [initialTrainNumber]);

  const fetchTrainStopList = async (number) => { // Gets train information from API
    const token = process.env.REACT_APP_NJTRANSIT_API_KEY; // Get API token from .env file

    if (!token) { // Error handling
      setError('Token not found. Please check .env setup.');
      return;
    }

    setLoading(true);
    setError('');
    setTrainData(null);

    const formData = new FormData(); // Makes API request
    formData.append('token', token);
    formData.append('train', number);

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

      const data = await response.json(); // Waits for the API response and then converts it to json

      if (data.errorMessage) { // Error handling
        throw new Error(data.errorMessage);
      } else if (!data || !data.TRAIN_ID) {
        setError('No data found for this train. It may not be currently active.');
        return;
      }

      setTrainData(data);
      determineStops(data); // After the data is acquired, this call determines the next and last stops
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => { // When the form is submitted, the entire page is prevented from reloading, and the train data is fetched
    e.preventDefault();
    fetchTrainStopList(trainNumber);
  };

  // Determine the next stop and last stop
  const determineStops = (data) => {
    if (!data || !data.STOPS) return;  // Exits if there's incomplete or missing data

    const stops = data.STOPS; // Gets the list of stops
    const lastStopIndex = stops.length - 1; // Gets the index of the last stop

    // Set the last stop to the final stop in the list
    setLastStop(stops[lastStopIndex]);

    // Because of how the NJTransit API works, finding the next stop is a little complicated
    // The API usually doesn't mark the first stop as departed
    // This finds 1) if the train is currently active, and 2) what the next stop is
    
    // 1. Check if all stops are "NO" for departed
    // This is the case where the train has not left its first stop yet. It is currently active.
    const allNoDeparted = stops.every((stop) => stop.DEPARTED === 'NO');
    if (allNoDeparted) {
      setIsTrainActive(true); // Train is set as active
      setNextStop(stops[0]); // First stop is the next stop
      return;
    }

    // 2. Check if the last stop has "YES" for departed 
    // This is the case where the train has reached all its destinations, and has concluded its journey. It is inactive.
    if (stops[lastStopIndex].DEPARTED === 'YES') {
      setIsTrainActive(false); // Train is inactive
      setNextStop(null); // No further stops
      return;
    }

    // 3. Find the last "YES" for departed and set the next stop
    // This is the case where the train has at least left the first station, and is enroute. It is active.
    // This approach is helpful if an intermediate station is skipped over, or marked as "NO" in departure for any reason.
    const lastDepartedIndex = stops.map(stop => stop.DEPARTED).lastIndexOf('YES'); // Find the most recent station it has left
    if (lastDepartedIndex >= 0 && lastDepartedIndex < lastStopIndex) { // If there are more stops left...
      setIsTrainActive(true); // Train is active
      setNextStop(stops[lastDepartedIndex + 1]); // Next stop is after the last departed stop
      return;
    }

    // Default case: active train with no next stop
    setIsTrainActive(true);
    setNextStop(null);
  };

  // Calculate custom status for each stop based on arrival and departure times
  // While the NJ Transit API also provided stop status, this is only updated after the train *leaves* the specific station
  // The custom status allows us to find the status before the train leaves that station
  // The API does not update the departure time - this remains as originally scheduled
  // But the API does update arrival time based on real-time data
  // As a result, it is possible to see if the train is delayed by comparing these two times
  const getStopStatus = (arrivalTime, departureTime) => {
    if (!arrivalTime || !departureTime) return 'N/A'; // Handles missing/incomplete data

    const arrival = new Date(Date.parse(arrivalTime)); // Reformats arrival time
    const departure = new Date(Date.parse(departureTime)); // Reformats departure time

    if (isNaN(arrival) || isNaN(departure)) return 'N/A'; // Handles missing/incomplete data (again)

    return arrival > departure ? 'Late' : 'On Time';
    // If arrival time is later than departure time, then it's late. Otherwise, it's on time.
  };

  // Format status with green/red color
  const formatStatus = (status) => {
    switch (status) {
      case 'On Time':
        return <span style={{ color: 'green' }}>On Time</span>; // Formats On Time status
      case 'Late':
        return <span style={{ color: 'red' }}>Late</span>; // Formats Late status
      default:
        return status || 'N/A'; // Error handling
    }
  };

  // Calculate the minutes until the next stop's arrival
  const getMinutesUntilArrival = (time) => {
    if (!time) return 'N/A'; // Error handling

    const stopTime = new Date(Date.parse(time)); // Processes the stop time
    const currentTime = new Date(); // Finds the current time

    if (isNaN(stopTime)) return 'N/A'; // Error handling

    const diffMinutes = Math.floor((stopTime - currentTime) / 60000); // 60000 ms = 1 minute

    return diffMinutes > 0 ? diffMinutes : 0; // Ensures it isn't negative
  };

  // Format the time to 'hh:mm:ss am/pm'
  // This makes the time easier to read, compared to the defualt view
  const formatTime = (time) => {
    if (!time) return 'N/A'; // Error handling

    const date = new Date(Date.parse(time)); // Processes the time

    if (isNaN(date)) return 'N/A';

    let hours = date.getHours(); // Gets the hours
    const minutes = date.getMinutes().toString().padStart(2, '0'); // Gets and formats the minutes (2 digits, leading zero)
    const seconds = date.getSeconds().toString().padStart(2, '0'); // Gets and formats the seconds (2 digits, leading zero)
    const ampm = hours >= 12 ? 'pm' : 'am'; // gets AM/PM, depending if the hours are over 12
    hours = hours % 12 || 12; // Convert to 12-hour format

    return `${hours}:${minutes}:${seconds} ${ampm}`; // Returns a string with the formatted time
  };

  return (
    <div>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          placeholder="Enter Train Number"
          value={trainNumber}
          onChange={(e) => setTrainNumber(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Check Status
        </button>
      </form>
      
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {trainData && (
        <div>
          <h2>Train {trainData.TRAIN_ID} Info</h2>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: trainData.BACKCOLOR,
                marginRight: '10px',
              }}
            ></div>
            <span>Line Code: {trainData.LINECODE || 'N/A'}</span>
          </div>

          {/* Display next and last stop information */}
          {isTrainActive ? (
            <div style={{ marginBottom: '10px' }}>
              <strong>Next Stop:</strong> {nextStop?.STATIONNAME || 'N/A'} in{' '}
              {getMinutesUntilArrival(nextStop?.TIME)} minutes (
              {formatStatus(getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME))}).
            </div>
          
          ) : (
            <div style={{ marginBottom: '10px', fontStyle: 'italic', color: 'red' }}>
              This train has concluded its journey at {lastStop?.STATIONNAME || 'N/A'}.
            </div>
          )}

          <div style={{ marginBottom: '10px' }}>
            <strong>Last Stop:</strong> {lastStop?.STATIONNAME || 'N/A'}
          </div>

          <h2>Schedule</h2>
          <table style={isTrainActive ? styles.table : styles.greyedTable}>
            <thead>
              <tr>
                <th style={styles.header}>Station</th>
                <th style={styles.header}>Arrival Time</th>
                <th style={styles.header}>Departure Time</th>
                <th style={styles.header}>Status</th>
                <th style={styles.header}>Departed</th>
              </tr>
            </thead>
            <tbody>
              {trainData.STOPS.map((stop, index) => (
                <tr
                  key={index}
                  style={
                    stop.STATIONNAME === nextStop?.STATIONNAME && isTrainActive
                      ? { backgroundColor: '#FFFFCC' } // Highlight next stop if active
                      : {}
                  }
                >
                  <td style={styles.cell}>{stop.STATIONNAME || 'N/A'}</td>
                  <td style={styles.cell}>{formatTime(stop.TIME)}</td>
                  <td style={styles.cell}>{formatTime(stop.DEP_TIME)}</td>
                  <td style={styles.cell}>{formatStatus(getStopStatus(stop.TIME, stop.DEP_TIME))}</td>
                  <td style={styles.cell}>{stop.DEPARTED === 'YES' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// CSS styles for centering and table
const styles = {
  form: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  input: {
    padding: '10px',
    fontSize: '16px',
    width: '200px',
    marginRight: '10px',
  },
  button: {
    padding: '10px 20px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
  },
  greyedTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
    opacity: 0.5, // Lightly greyed-out table
  },
  header: {
    border: '1px solid #ccc',
    padding: '8px',
  },
  cell: {
    border: '1px solid #ccc',
    padding: '8px',
  },
};

export default TrainStatus;
