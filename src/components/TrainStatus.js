import React, { useState, useEffect, useCallback } from 'react';
import { getBackendBase } from '../utils/backend';
import TrainInfo from './TrainInfo';
import TrainSchedule from './TrainSchedule';
import '../styles/TrainStatus.css'; // Updated import path

const TrainStatus = ({ initialTrainNumber = '' }) => {
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber); // Tracks train number, re-renders the component
  const [trainData, setTrainData] = useState(null); // Stores the train information from the API
  const [loading, setLoading] = useState(false); // Shows if the data is currently being fetched
  const [error, setError] = useState(''); // Stores error messages
  const [isTrainActive, setIsTrainActive] = useState(true); // To track if the train is active
  const [nextStop, setNextStop] = useState(null); // To store the next stop
  const [lastStop, setLastStop] = useState(null); // To store the last stop
  const [showTrainPrefix, setShowTrainPrefix] = useState(false); // State to manage the "Train" prefix
  const [isEditing, setIsEditing] = useState(false); // State to track if the input field is being edited

  const trainStatusClass = 'TrainStatus';

  const fetchTrainStopList = useCallback(async (number) => {
    // Frontend now calls backend, which hides the API key and proxies the NJ Transit request.
    setLoading(true);
    setError('');
    setTrainData(null);

    const startTime = Date.now();

    try {
      const base = await getBackendBase();
      const url = `${base}/api/train-data?train=${encodeURIComponent(number)}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch train data');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      if (data.errorMessage) {
        // Upstream API-specific message
        throw new Error(data.errorMessage);
      }
      if (!data || !data.TRAIN_ID) {
        setError('No data found for this train. It may not be currently active.');
        return;
      }

      setTrainData(data);
      determineStops(data);
      setShowTrainPrefix(true);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const minimumLoadingTime = 1000;
      const remainingTime = minimumLoadingTime - elapsedTime;

      if (remainingTime > 0) {
        setTimeout(() => setLoading(false), remainingTime);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => { // Sees if there's a train number given, and fetches the relevant information
    if (initialTrainNumber) {
      setTrainNumber(initialTrainNumber);
      fetchTrainStopList(initialTrainNumber);
    }
  }, [initialTrainNumber, fetchTrainStopList]);

  // API key is no longer fetched in the browser. The backend now holds the key
  // and proxies the request to NJ Transit. This function was intentionally removed.

  const handleSubmit = (e) => { // When the form is submitted, the entire page is prevented from reloading, and the train data is fetched
    e.preventDefault();
    if (!trainNumber) return; // Prevent submission if trainNumber is empty
    console.log('REACT_APP_TEST:', process.env.REACT_APP_TEST);
    fetchTrainStopList(trainNumber);
  };

  const handleFocus = () => {
    setShowTrainPrefix(false); // Hide the "Train" prefix when input is focused
    setIsEditing(true); // Set editing state to true when input is focused
  };

  const handleBlur = () => {
    if (trainNumber && trainData && !error && !isEditing) {
      setShowTrainPrefix(true); // Show the "Train" prefix when input loses focus and conditions are met
    }
  };

  const handleChange = (e) => {
    setTrainNumber(e.target.value);
    setShowTrainPrefix(false); // Hide the "Train" prefix when user is typing
    setIsEditing(true); // Set editing state to true when user is typing
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
    <div className={trainStatusClass}>
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          placeholder="Enter Train Number"
          value={showTrainPrefix && trainNumber && !isEditing ? `Train ${trainNumber}` : trainNumber}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="input"
        />
        <button
          type="submit"
          className={`button ${!trainNumber ? 'buttonDisabled' : ''}`}
          disabled={!trainNumber}
        >
          {loading ? <div className="loadingCircle"></div> : 'Check Status'}
        </button>
      </form>
      
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && trainData && (
        <div>
          <TrainInfo
            trainData={trainData}
            isTrainActive={isTrainActive}
            nextStop={nextStop}
            lastStop={lastStop}
            getMinutesUntilArrival={getMinutesUntilArrival}
            getStopStatus={getStopStatus}
          />
          <TrainSchedule
            trainData={trainData}
            isTrainActive={isTrainActive}
            nextStop={nextStop}
            formatTime={formatTime}
            getStopStatus={getStopStatus}
          />
        </div>
      )}
    </div>
  );
};

export default TrainStatus;
