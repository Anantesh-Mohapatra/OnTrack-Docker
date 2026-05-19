import React from 'react';
import lineNames from '../data/lineNames.json';
import '../styles/TrainInfo.css';

// Click anywhere on the ticket → copy a share message. Replaces the
// old per-line-pill copy affordance; the design omits the explicit copy
// icon but the convenience of "tap the card to share where I am" is too
// good to lose. We surface it via a tooltip on the line stamp.
const copyToClipboard = (trainNumber) => {
  const message = `I am on Train ${trainNumber}. You can see my train status at https://ontrack-551821400291.us-central1.run.app/`;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(message).catch(() => {});
  }
};

const TrainInfo = ({
  trainData,
  isTrainActive,
  nextStop,
  lastStop,
  allStopsCancelled,
  getMinutesUntilArrival,
  getStopStatus,
}) => {
  const isLeaving = nextStop && new Date() < new Date(trainData.STOPS[0]?.TIME);
  const minutes = nextStop ? getMinutesUntilArrival(nextStop?.TIME) : null;
  const statusText = allStopsCancelled ? 'Cancelled' : getStopStatus(nextStop);
  const pillClass =
    statusText === 'Late' ? 'late' : statusText === 'Cancelled' ? 'cancelled' : 'ontime';
  const lineColor = trainData.BACKCOLOR || '#f0803c';
  const lineName = lineNames[trainData.LINECODE] || '';
  const lineCode = trainData.LINECODE;

  // Compute lateness in whole minutes for the pill label.
  let lateMin = 0;
  if (statusText === 'Late' && nextStop?.TIME && nextStop?.DEP_TIME) {
    const a = new Date(Date.parse(nextStop.TIME));
    const d = new Date(Date.parse(nextStop.DEP_TIME));
    if (!isNaN(a) && !isNaN(d)) lateMin = Math.max(0, Math.round((a - d) / 60000));
  }

  const lineStampSrc = lineCode
    ? `${process.env.PUBLIC_URL || ''}/assets/${lineCode}.svg`
    : null;

  return (
    <div
      className="ticket TrainInfo"
      style={{ '--line-color': lineColor, '--line-fore': trainData.FORECOLOR || '#fff' }}
      onClick={() => copyToClipboard(trainData.TRAIN_ID)}
      title="Click to copy a share message"
    >
      {lineStampSrc && (
        <img className="lineStamp" src={lineStampSrc} alt="" aria-hidden="true" />
      )}

      <div className="ticketBody">
        <div className="destination">
          <h2 className="name">
            <span className="toLabel">To</span> {lastStop?.STATIONNAME || 'N/A'}
          </h2>

          {isTrainActive && nextStop ? (
            <p className="next">
              {isLeaving ? 'Leaving' : 'Reaching'} <strong>{nextStop?.STATIONNAME || 'N/A'}</strong>
              {minutes !== 'N/A' && minutes != null ? (
                <>
                  {' '}in <span className="mins">{minutes}</span>{' '}
                  <span className="minsLabel">{minutes === 1 ? 'minute' : 'minutes'}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="next inactiveInfo">
              {allStopsCancelled
                ? 'This train has been cancelled.'
                : `This train has concluded its journey at ${lastStop?.STATIONNAME || 'N/A'}.`}
            </p>
          )}
        </div>
      </div>

      <div className="ticketFoot">
        <span className="lineName">{lineName}</span>
        {isTrainActive && (
          <span className={`statusPill ${pillClass}`}>
            <span className="dot" />
            {statusText === 'Late' && lateMin > 0
              ? `Late · ${lateMin} min`
              : statusText}
          </span>
        )}
      </div>
    </div>
  );
};

export default TrainInfo;
