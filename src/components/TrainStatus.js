import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getBackendBase } from '../utils/backend';
import { getStationList, resolveNextStopIndex } from '../utils/stationList';
import TrainInfo from './TrainInfo';
import TrainSchedule from './TrainSchedule';
import '../styles/TrainStatus.css'; // Updated import path
import TrainLocation from './TrainLocation';

// Oldest GPS fix we'll still put on the map. See the coords rule below.
const GPS_MAX_AGE_MS = 5 * 60 * 1000;

const TrainStatus = ({ initialTrainNumber = '' }) => {
  const [trainNumber, setTrainNumber] = useState(initialTrainNumber); // Tracks train number, re-renders the component
  const [trainData, setTrainData] = useState(null); // Stores the train information from the API
  const [vehicleList, setVehicleList] = useState(null); // Fleet snapshot from /api/vehicle-data — used for its NEXT_STOP hint (its lat/lon is just the next station's)
  const [position, setPosition] = useState(null); // { fix, origin } from /api/train-position — drives the map
  const [stationList, setStationList] = useState([]); // STATION_14CHAR ↔ STATION_2CHAR ↔ STATIONNAME crosswalk for NEXT_STOP override
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
    setPosition(null);

    const startTime = now;

    try {
      const base = await getBackendBase();
      // Fire all endpoints in parallel. vehicle-data supplies the NEXT_STOP
      // hint; train-position supplies the map's GPS fix and origin station.
      // Both are wrapped so their failure never sinks the whole lookup — we
      // just skip the override / hide the map in that case.
      const [response, vehicleData, positionData] = await Promise.all([
        fetch(`${base}/api/train-data?train=${encodeURIComponent(number)}`),
        // maxAge=30 — the map marker needs to reflect ~recent position; PopularTrains
        // omits the param and gets the server's 5-minute default since it only needs
        // line/ID metadata.
        fetch(`${base}/api/vehicle-data?maxAge=30`)
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
        fetch(`${base}/api/train-position?train=${encodeURIComponent(number)}`)
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
      setPosition(positionData);
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

  // Load the station crosswalk once per session. Cached at the module level
  // in stationList.js, so refetching across mounts is a no-op.
  useEffect(() => {
    let cancelled = false;
    getStationList().then((list) => { if (!cancelled) setStationList(list); });
    return () => { cancelled = true; };
  }, []);

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

  // Vehicle-data's NEXT_STOP is an independent next-stop signal from the
  // realtime feed. We use it to validate STOPS[].DEPARTED, which NJT
  // sometimes ships with stale YES flags from an earlier run of a recycled
  // train ID (e.g. train 5541 today: Newark Penn DEPARTED:NO but Union and
  // Roselle Park — future stops — DEPARTED:YES).
  const nextStopHint = useMemo(() => {
    const id = trainData?.TRAIN_ID;
    if (!id || !Array.isArray(vehicleList)) return null;
    const v = vehicleList.find((x) => String(x?.ID) === String(id));
    return v?.NEXT_STOP || null;
  }, [trainData, vehicleList]);

  // Apply the NEXT_STOP override: anything at or after the resolved index
  // that's marked DEPARTED:YES gets normalized to NO. Downstream consumers
  // (allStopsCancelled, determineStops, TrainInfo, TrainSchedule) read from
  // this corrected view; raw trainData is preserved in state for traceability.
  const correctedTrainData = useMemo(() => {
    if (!trainData?.STOPS?.length || !nextStopHint || !stationList.length) return trainData;
    const idx = resolveNextStopIndex(trainData.STOPS, nextStopHint, stationList);
    if (idx < 0) {
      // Resolver miss with all inputs present → station list likely stale
      // (new/renamed station) or NEXT_STOP doesn't appear in this train's
      // route. Safe to fall back; surface it so we know if it starts happening.
      console.warn(
        `NEXT_STOP override skipped for train ${trainData.TRAIN_ID}: ` +
        `"${nextStopHint}" not resolvable against station list (${stationList.length} entries). ` +
        `Station list may be stale.`
      );
      return trainData;
    }
    let overrideCount = 0;
    const correctedStops = trainData.STOPS.map((s, i) => {
      if (i >= idx && s.DEPARTED === 'YES') {
        overrideCount++;
        return { ...s, DEPARTED: 'NO' };
      }
      return s;
    });
    if (overrideCount > 0) {
      console.info(
        `NEXT_STOP override active for train ${trainData.TRAIN_ID}: ` +
        `vehicle-data says next stop is "${nextStopHint}" (index ${idx}); ` +
        `clearing stale DEPARTED:YES on ${overrideCount} stop(s).`
      );
    }
    return { ...trainData, STOPS: correctedStops };
  }, [trainData, nextStopHint, stationList]);

  const allStopsCancelled = useMemo(() => {
    if (!Array.isArray(correctedTrainData?.STOPS) || correctedTrainData.STOPS.length === 0) return false;
    return correctedTrainData.STOPS.every(isStopCancelled);
  }, [correctedTrainData]);

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
  // Reads from correctedTrainData so the NEXT_STOP override flows through to next-stop selection.
  useEffect(() => {
    if (!correctedTrainData) return;

    determineStops(correctedTrainData);
  }, [determineStops, correctedTrainData]);

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

  // The one rule for where (and whether) the map shows the train:
  //   1. Fully cancelled            → no map.
  //   2. Hasn't left its first stop → pin at the scheduled origin station.
  //   3. GPS fix ≤ 5 min old        → pin at the fix.
  //   4. Otherwise                  → no map.
  // Terminated trains need no special case: their last fix is at the
  // terminal and ages out of rule 3 within 5 minutes. The age gate also
  // rejects the leftover fix GTFS-RT keeps from a train's previous run.
  // 5 min because NJT updates each train's fix only every ~1–5 minutes.
  const coords = useMemo(() => {
    const none = { has: false, lat: null, lon: null, note: null };
    const stops = correctedTrainData?.STOPS;
    if (!Array.isArray(stops) || !stops.length || allStopsCancelled) return none;

    const hasDeparted = stops.some((s) => s.DEPARTED === 'YES');
    if (!hasDeparted) {
      const origin = position?.origin;
      if (!origin) return none;
      return { has: true, lat: origin.lat, lon: origin.lon, note: null };
    }

    const fix = position?.fix;
    const ageMs = fix ? Date.now() - fix.timestamp : Infinity;
    if (!(ageMs <= GPS_MAX_AGE_MS)) return none;
    const ageMin = Math.max(0, Math.round(ageMs / 60000));
    const note = ageMin === 0 ? 'GPS updated just now' : `GPS updated ${ageMin} min ago`;
    return { has: true, lat: fix.lat, lon: fix.lon, note };
  }, [correctedTrainData, allStopsCancelled, position]);

  const prevCoordsRef = useRef({ has: false, lat: null, lon: null });
  useEffect(() => {
    const prev = prevCoordsRef.current;
    if (coords.has && (!prev.has || prev.lat !== coords.lat || prev.lon !== coords.lon)) {
      console.info('TrainLocation: showing map at', { lat: coords.lat, lon: coords.lon, note: coords.note });
    } else if (!coords.has && prev.has) {
      console.info('TrainLocation: location data no longer available; hiding map');
    } else if (!coords.has && !prev.has && trainData) {
      console.info('TrainLocation: no fresh GPS fix or origin; map hidden');
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
      {!loading && correctedTrainData && (
        <div>
          <TrainInfo
            trainData={correctedTrainData}
            isTrainActive={isTrainActive}
            nextStop={nextStop}
            lastStop={lastStop}
            allStopsCancelled={allStopsCancelled}
            getMinutesUntilArrival={getMinutesUntilArrival}
            getStopStatus={getStopStatus}
          />
          <TrainSchedule
            key={`schedule-${correctedTrainData.TRAIN_ID}`}
            trainData={correctedTrainData}
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
              note={coords.note}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TrainStatus;
