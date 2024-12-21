import React from 'react';
import { FaRegCopy } from 'react-icons/fa';
import lineNames from '../data/lineNames.json';
import '../styles/TrainInfo.css'; // Updated import path

const copyToClipboard = (trainNumber) => {
  const message = `I am on Train ${trainNumber}. You can see my train status at https://ontrack-551821400291.us-central1.run.app/`;
  navigator.clipboard.writeText(message).then(() => {
    // No need to set state for hover effect
  });
};

const TrainInfo = ({ trainData, isTrainActive, nextStop, lastStop, getMinutesUntilArrival, getStopStatus }) => {
  const trainInfoClass = 'TrainInfo';
  const isLeaving = nextStop && new Date() < new Date(trainData.STOPS[0]?.TIME);

  return (
    <div 
      className={`pillContainer ${trainInfoClass}`}
      style={{ backgroundImage: `url(https://raw.githubusercontent.com/Anantesh-Mohapatra/OnTrack-Docker/c82ee99803b71e07ee4a7106b71c134452e1247e/public/assets/${trainData.LINECODE}.svg)`, backgroundPosition: 'calc(100% - 10px) calc(100% - 10px)', backgroundSize: '75px 75px', backgroundRepeat: 'no-repeat' }}
      onClick={() => copyToClipboard(trainData.TRAIN_ID)}
    >
      <div className="trainInfoHeader">
        <h2>To {lastStop?.STATIONNAME || 'N/A'}</h2>
      </div>

      {isTrainActive ? (
        <div className="activeInfo">
          {isLeaving ? (
            <>Leaves <strong>{nextStop?.STATIONNAME || 'N/A'}</strong> in {getMinutesUntilArrival(nextStop?.TIME)} minutes.</>
          ) : (
            <>Reaching <strong>{nextStop?.STATIONNAME || 'N/A'}</strong> in {getMinutesUntilArrival(nextStop?.TIME)} minutes.</>
          )}
        </div>
      ) : (
        <div className="inactiveInfo">
          This train has concluded its journey at {lastStop?.STATIONNAME || 'N/A'}.
        </div>
      )}

      {isTrainActive && (
        <div className="trainInfoStatusPill" style={{ backgroundColor: 'rgba(160, 160, 160, 0.8)' }}>
          <span className="trainInfoStatusText" style={{ textAlign: 'left' }}>
            {getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME)}
          </span>
          <span className="trainInfoStatusCircle" style={{ backgroundColor: getStopStatus(nextStop?.TIME, nextStop?.DEP_TIME) === 'On Time' ? '#90EE90' : '#FF4500' }}></span>
        </div>
      )}

      <div className="linePill" style={{ borderColor: trainData.BACKCOLOR, position: 'relative' }}>
        <span className="lineText">{lineNames[trainData.LINECODE] || 'N/A'}</span>
        <div className="lineCircle" style={{ backgroundColor: trainData.BACKCOLOR }}>
          <FaRegCopy className="copyIcon" />
        </div>
      </div>
    </div>
  );
};

export default TrainInfo;
