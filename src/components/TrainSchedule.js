import React from 'react';

const TrainSchedule = ({ trainData, isTrainActive, nextStop, formatTime, getStopStatus, styles }) => {
  return (
    <div>
      <h2>Schedule</h2>
      <table style={isTrainActive ? styles.table : styles.greyedTable}>
        <thead>
          <tr>
            <th style={styles.header}>Station</th>
            <th style={styles.header}>Arrival</th>
            <th style={styles.header}>Departure</th>
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
              <td style={styles.cell}>{getStopStatus(stop.TIME, stop.DEP_TIME)}</td>
              <td style={styles.cell}>{stop.DEPARTED === 'YES' ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrainSchedule;
