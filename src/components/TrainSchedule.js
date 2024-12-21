import React from 'react';
import '../styles/TrainSchedule.css'; // New import for TrainSchedule styles

const TrainSchedule = ({ trainData, isTrainActive, nextStop, formatTime, getStopStatus }) => {
  return (
    <div>
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
              style={{
                backgroundColor: !isTrainActive
                  ? '' // No additional styling if the train has concluded its journey
                  : stop.STATIONNAME === nextStop?.STATIONNAME && isTrainActive
                  ? '#FFFFCC' // Highlight next stop if active
                  : stop.DEPARTED === 'YES'
                  ? '#f0f0f0' // Slightly grey out if departed
                  : '',
                color: !isTrainActive
                  ? '' // No additional styling if the train has concluded its journey
                  : stop.DEPARTED === 'YES'
                  ? '#a0a0a0' // Make text a tad greyer if departed
                  : '',
              }}
            >
              <td className="cell">{stop.STATIONNAME || 'N/A'}</td>
              <td className="cell">{formatTime(stop.TIME)}</td>
              <td className="cell">{formatTime(stop.DEP_TIME)}</td>
              <td
                className="cell"
                style={{
                  color: getStopStatus(stop.TIME, stop.DEP_TIME) === 'On Time' ? 'green' : 'red',
                }}
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
