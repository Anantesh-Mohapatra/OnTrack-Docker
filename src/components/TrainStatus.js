import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getBackendBase } from '../utils/backend';
import TrainInfo from './TrainInfo';
import TrainSchedule from './TrainSchedule';
import '../styles/TrainStatus.css'; // Updated import path
import TrainLocation from './TrainLocation';

const TrainStatus = ({ initialTrainNumber = '' }) => {
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber); // Tracks train number, re-renders the component
  const [trainData, setTrainData] = useState(null); // Stores the train information from the API
  const [vehicleList, setVehicleList] = useState(null); // Fleet snapshot from /api/vehicle-data — source of truth for GPS
  const [loading, setLoading] = useState(false); // Shows if the data is currently being fetched
  const [error, setError] = useState(''); // Stores error messages
  const [isTrainActive, setIsTrainActive] = useState(true); // To track if the train is active
  const [nextStop, setNextStop] = useState(null); // To store the next stop
  const [lastStop, setLastStop] = useState(null); // To store the last stop
  const [showTrainPrefix, setShowTrainPrefix] = useState(false); // State to manage the "Train" prefix
  const [isEditing, setIsEditing] = useState(false); // State to track if the input field is being edited

  const trainStatusClass = 'TrainStatus';

  const lastRequestRef = useRef({ train: null, ts: 0 });

  const fetchTrainStopList = useCallback(async (number) => {
    // Frontend now calls backend, which hides the API key and proxies the NJ Transit request.
    // De-dup frequent identical requests (helps with React.StrictMode double effects in dev)
    const now = Date.now();
    if (number === lastRequestRef.current.train && now - lastRequestRef.current.ts < 2000) {
      console.debug('Skipping duplicate fetch for train', number);
      return;
    }
    lastRequestRef.current = { train: number, ts: now };

    setLoading(true);
    setError('');
    setTrainData(null);
    setVehicleList(null);

    const startTime = now;

    try {
      const base = await getBackendBase();
      // Fire both endpoints in parallel — vehicle-data has the real GPS we need
      // for TrainLocation, and pulling it alongside the stop list avoids a
      // second round-trip after the user already sees the schedule.
      // Wrap vehicle-data so its failure never sinks the whole lookup; we just
      // hide the map in that case.
      const [response, vehicleData] = await Promise.all([
        fetch(`${base}/api/train-data?train=${encodeURIComponent(number)}`),
        // maxAge=30 — the map marker needs to reflect ~recent position; PopularTrains
        // omits the param and gets the server's 5-minute default since it only needs
        // line/ID metadata.
        fetch(`${base}/api/vehicle-data?maxAge=30`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
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
      setVehicleList(Array.isArray(vehicleData) ? vehicleData : null);
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

  const CANCELLED_STATUSES = new Set(['cancelled', 'canceled']);

  const isStopCancelled = (stop) => {
    // The API only exposes cancellations via stop_status; we surface it so the UI never labels a cancelled stop as "On Time"/"Late".
    // NJ Transit has returned both "CANCELED" and "CANCELLED" (one- or two-L variants), so we normalize and accept either spelling.
    const statusFlag = stop?.stop_status || stop?.STOP_STATUS || stop?.StopStatus;
    if (typeof statusFlag !== 'string') return false;

    const normalized = statusFlag.trim().toLowerCase();
    return CANCELLED_STATUSES.has(normalized);
  };

  const allStopsCancelled = useMemo(() => {
    if (!Array.isArray(trainData?.STOPS) || trainData.STOPS.length === 0) return false;
    return trainData.STOPS.every(isStopCancelled);
  }, [trainData]);

  // Determine the next stop and last stop
  const determineStops = useCallback((data) => {
    if (!data || !data.STOPS) return;  // Exits if there's incomplete or missing data

    const stops = data.STOPS; // Gets the list of stops
    const lastStopIndex = stops.length - 1; // Gets the index of the last stop

    // Set the last stop to the final stop in the list
    setLastStop(stops[lastStopIndex]);

    if (allStopsCancelled) {
      // Even if departure timestamps are missing or stale, a fully cancelled stop list means the train is no longer running.
      // We flip the activity flag here so downstream UI never shows a cancelled train as "active" or "on time".
      setIsTrainActive(false);
      setNextStop(null);
      return;
    }

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
  }, [allStopsCancelled]);

  // Keep activity/next-stop state in sync any time new train data arrives or a cancellation status flips.
  useEffect(() => {
    if (!trainData) return;

    determineStops(trainData);
  }, [determineStops, trainData]);

  // Calculate custom status for each stop based on arrival and departure times
  // While the NJ Transit API also provided stop status, this is only updated after the train *leaves* the specific station
  // The custom status allows us to find the status before the train leaves that station
  // The API does not update the departure time - this remains as originally scheduled
  // But the API does update arrival time based on real-time data
  // As a result, it is possible to see if the train is delayed by comparing these two times
  const getStopStatus = (stop) => {
    if (!stop) return 'N/A';
    if (isStopCancelled(stop)) return 'Cancelled';

    const { TIME: arrivalTime, DEP_TIME: departureTime } = stop;
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

  // Derive coordinates by looking up the train in the vehicle-data fleet snapshot.
  // getVehicleData is NJT's authoritative GPS source (what their own app uses);
  // getTrainStopList's CAPACITY[].LATITUDE often returns "0.0" when there's no fix,
  // which previously rendered the map off the coast of Africa.
  const coords = useMemo(() => {
    const id = trainData?.TRAIN_ID;
    if (!id || !Array.isArray(vehicleList)) return { has: false, lat: null, lon: null };
    const v = vehicleList.find((x) => String(x?.ID) === String(id));
    if (!v) return { has: false, lat: null, lon: null };
    const lat = parseFloat(v.LATITUDE);
    const lon = parseFloat(v.LONGITUDE);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return { has: false, lat: null, lon: null };
    // Defensive: reject NJT's "no fix" 0,0 placeholder if it ever leaks through here too.
    if (lat === 0 && lon === 0) return { has: false, lat: null, lon: null };
    return { has: true, lat, lon };
  }, [trainData, vehicleList]);

  const prevCoordsRef = useRef({ has: false, lat: null, lon: null });
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (coords.has && (!prev.has || prev.lat !== coords.lat || prev.lon !== coords.lon)) {
      console.info('TrainLocation: showing map at', { lat: coords.lat, lon: coords.lon });
    } else if (!coords.has && prev.has) {
      console.info('TrainLocation: location data no longer available; hiding map');
    } else if (!coords.has && !prev.has && trainData) {
      console.info('TrainLocation: no coordinates in vehicle data; map hidden');
    }
    prevCoordsRef.current = coords;
  }, [coords, trainData]);

  return (
    <div className={trainStatusClass}>
      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          inputMode="numeric"
          placeholder="Enter train number"
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
          {loading ? <div className="loadingCircle"></div> : 'Check'}
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
            allStopsCancelled={allStopsCancelled}
            getMinutesUntilArrival={getMinutesUntilArrival}
            getStopStatus={getStopStatus}
          />
          <TrainSchedule
            key={`schedule-${trainData.TRAIN_ID}`}
            trainData={trainData}
            isTrainActive={isTrainActive}
            nextStop={nextStop}
            formatTime={formatTime}
            getStopStatus={getStopStatus}
          />
          {coords.has && (
            <TrainLocation
              lat={coords.lat}
              lon={coords.lon}
              trainName={`Train ${trainData.TRAIN_ID}`}
              trainNumber={trainData.TRAIN_ID}
              backColor={trainData.BACKCOLOR}
              foreColor={trainData.FORECOLOR}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TrainStatus;
