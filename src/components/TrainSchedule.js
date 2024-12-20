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
            <th style={styles.header} className="departedColumn">Departed</th>
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
              <td style={styles.cell}>{stop.STATIONNAME || 'N/A'}</td>
              <td style={styles.cell}>{formatTime(stop.TIME)}</td>
              <td style={styles.cell}>{formatTime(stop.DEP_TIME)}</td>
              <td
                style={{
                  ...styles.cell,
                  color: getStopStatus(stop.TIME, stop.DEP_TIME) === 'On Time' ? 'green' : 'red',
                }}
              >
                {getStopStatus(stop.TIME, stop.DEP_TIME)}
              </td>
              <td style={styles.cell} className="departedColumn">{stop.DEPARTED === 'YES' ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TrainSchedule;
