import React from 'react';

// TrainInfo component displays information about a train
const TrainInfo = ({ trainData, isTrainActive, nextStop, lastStop, getMinutesUntilArrival, formatStatus, getStopStatus }) => {
  return (
    <div style={styles.pillContainer}>
      <div style={styles.header}>
        <h2>To {lastStop?.STATIONNAME || 'N/A'}</h2>
      </div>

      {isTrainActive ? (
        <div style={styles.activeInfo}>
          Reaching <strong>{nextStop?.STATIONNAME || 'N/A'}</strong> in{' '}
          {getMinutesUntilArrival(nextStop?.TIME)} minutes.
        </div>
      ) : (
        <div style={styles.inactiveInfo}>
          This train has concluded its journey at {lastStop?.STATIONNAME || 'N/A'}.
        </div>
      )}

      <div style={styles.lineInfo}>
        <div style={{ ...styles.colorIndicator, backgroundColor: trainData.BACKCOLOR }}></div>
        <span>Line Code: {trainData.LINECODE || 'N/A'}</span>
      </div>

      {isTrainActive && (
        <div style={{ ...styles.statusPill, backgroundColor: 'rgba(160, 160, 160, 0.8)' }}>
          <span style={styles.statusText}>{getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME)}</span>
          <span style={{ ...styles.statusCircle, backgroundColor: getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME) === 'On Time' ? '#90EE90' : 'red' }}></span>
        </div>
      )}
    </div>
  );
};

const styles = {
  pillContainer: {
    borderRadius: '25px',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    marginBottom: '20px',
  },
  header: {
    textAlign: 'left',
    marginBottom: '20px',
  },
  lineInfo: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
  },
  colorIndicator: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    marginRight: '10px',
  },
  activeInfo: {
    marginBottom: '10px',
  },
  inactiveInfo: {
    marginBottom: '10px',
    fontStyle: 'italic',
    color: 'red',
  },
  statusPill: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px', // Increased size
    borderRadius: '15px',
    marginBottom: '5px',
    backgroundColor: 'rgba(160, 160, 160, 0.8)',
  },
  statusText: {
    flex: 1,
    textAlign: 'center',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px 0',
    color: '#FFFFFF', // Always white font color
  },
  statusCircle: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid #FFFFFF', // Always white border color
    marginLeft: '5px',
  },
};

export default TrainInfo;
