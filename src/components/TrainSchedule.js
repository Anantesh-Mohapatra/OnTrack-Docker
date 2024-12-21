import React from 'react';
import '../styles/TrainSchedule.css'; // New import for TrainSchedule styles

const roundUpToNearestMinute = (time) => {
  const date = new Date(time);
  if (date.getSeconds() > 0) {
    date.setMinutes(date.getMinutes() + 1);
  }
  date.setSeconds(0, 0);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  return `${hours}:${minutes} ${ampm}`;
};

const copyToClipboard = (trainNumber, station, arrivalTime, isFirstStation) => {
  const roundedTime = roundUpToNearestMinute(arrivalTime);
  const action = isFirstStation ? 'leaving' : 'reaching';
  const message = `I am on Train ${trainNumber}, ${action} ${station} at ${roundedTime}. You can see my train status at https://ontrack-551821400291.us-central1.run.app/`;
  navigator.clipboard.writeText(message).then(() => {
    // No need to set state for hover effect
  });
};

const TrainSchedule = ({ trainData, isTrainActive, nextStop, formatTime, getStopStatus }) => {
  return (
    <div className="TrainSchedule">
      <h2>Schedule</h2>
      <table className={isTrainActive ? 'table' : 'greyedTable'}>
        <thead>
          <tr>
            <th className="header">Station</th>
            <th className="header">Arrival</th>
            <th className="header">Departure</th>
            <th className="header">Status</th>
            <th className="header departedColumn">Departed</th>
          </tr>
        </thead>
        <tbody>
          {trainData.STOPS.map((stop, index) => (
            <tr
              key={index}
              className={
                !isTrainActive
                  ? ''
                  : stop.STATIONNAME === nextStop?.STATIONNAME && isTrainActive
                  ? 'nextStopHighlight'
                  : stop.DEPARTED === 'YES'
                  ? 'departedRow'
                  : ''
              }
            >
              <td 
                className="cell"
                onClick={() => copyToClipboard(trainData.TRAIN_ID, stop.STATIONNAME, stop.TIME, index === 0)}
              >
                {stop.STATIONNAME || 'N/A'}
              </td>
              <td className="cell">{formatTime(stop.TIME)}</td>
              <td className="cell">{formatTime(stop.DEP_TIME)}</td>
              <td
                className={`cell ${getStopStatus(stop.TIME, stop.DEP_TIME) === 'On Time' ? 'onTime' : 'delayed'}`}
              >
                {getStopStatus(stop.TIME, stop.DEP_TIME)}
              </td>
              <td className="cell departedColumn">{stop.DEPARTED === 'YES' ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrainSchedule;
