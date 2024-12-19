import React from 'react';
import lineNames from '../data/lineNames.json';

// TrainInfo component displays information about a train
const TrainInfo = ({ trainData, isTrainActive, nextStop, lastStop, getMinutesUntilArrival, formatStatus, getStopStatus }) => {
  const isLeaving = nextStop && new Date() < new Date(trainData.STOPS[0]?.TIME);

  return (
    <div style={{ ...styles.pillContainer, backgroundImage: `url(https://raw.githubusercontent.com/Anantesh-Mohapatra/OnTrack-Docker/c82ee99803b71e07ee4a7106b71c134452e1247e/public/assets/${trainData.LINECODE}.svg)`, backgroundPosition: 'calc(100% - 10px) calc(100% - 10px)', backgroundSize: '75px 75px', backgroundRepeat: 'no-repeat' }}>
      <div style={styles.header}>
        <h2>To {lastStop?.STATIONNAME || 'N/A'}</h2>
      </div>

      {isTrainActive ? (
        <div style={styles.activeInfo}>
          {isLeaving ? (
            <>Leaves <strong>{nextStop?.STATIONNAME || 'N/A'}</strong> in {getMinutesUntilArrival(nextStop?.TIME)} minutes.</>
          ) : (
            <>Reaching <strong>{nextStop?.STATIONNAME || 'N/A'}</strong> in {getMinutesUntilArrival(nextStop?.TIME)} minutes.</>
          )}
        </div>
      ) : (
        <div style={styles.inactiveInfo}>
          This train has concluded its journey at {lastStop?.STATIONNAME || 'N/A'}.
        </div>
      )}

      {isTrainActive && (
        <div style={{ ...styles.statusPill, backgroundColor: 'rgba(160, 160, 160, 0.8)' }}>
          <span style={{ ...styles.statusText, textAlign: 'left' }}>
            {getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME)}
          </span>
          <span style={{ ...styles.statusCircle, backgroundColor: getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME) === 'On Time' ? '#90EE90' : '#FF4500' }}></span>
        </div>
      )}

      <div style={{ ...styles.linePill, borderColor: trainData.BACKCOLOR }}>
        <span style={styles.lineText}>{lineNames[trainData.LINECODE] || 'N/A'}</span>
        <div style={{ ...styles.lineCircle, backgroundColor: trainData.BACKCOLOR }}></div>
      </div>
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
    position: 'relative', // Added to position background image
  },
  header: {
    textAlign: 'left',
    marginBottom: '20px',
  },
  linePill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '5px 10px',
    borderRadius: '15px',
    border: '2px solid',
    marginBottom: '10px',
    maxWidth: '200px', // Reduced width
  },
  lineText: {
    flex: 1,
    textAlign: 'left',
    display: 'flex',
    alignItems: 'center', // Vertically center the text
  },
  lineCircle: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    marginLeft: '10px', // Adjusted margin to 10 pixels
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
    width: '100px',
    padding: '5px 10px', // Increased size to match PopularTrains
    borderRadius: '15px',
    marginBottom: '5px',
    backgroundColor: 'rgba(160, 160, 160, 0.8)',
  },
  statusText: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align text to the left
    padding: '2px 0',
    color: '#FFFFFF', // Always white color
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
