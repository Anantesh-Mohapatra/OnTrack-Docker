import React from 'react';
import '../styles/TrainSchedule.css'; // New import for TrainSchedule styles

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
              <td className="cell">{stop.STATIONNAME || 'N/A'}</td>
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
