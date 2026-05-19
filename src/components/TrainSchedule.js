import React from 'react';
import '../styles/TrainSchedule.css';

// Split-flap character renderer. Re-keys each character on value change
// so the flap-in animation fires per-character. Words stay unbroken
// (`flap-word`) so long station names wrap at spaces, not mid-character.
const Flap = ({ text, staggered = true, className = '' }) => {
  const s = String(text ?? '');
  const parts = s.split(/(\s+)/);
  let charIdx = 0;
  return (
    <span className={className}>
      {parts.map((part, pi) => {
        if (part === '') return null;
        if (/^\s+$/.test(part)) {
          charIdx += part.length;
          return <React.Fragment key={`s-${pi}`}>{part}</React.Fragment>;
        }
        return (
          <span key={`w-${pi}`} className="flapWord">
            {part.split('').map((c) => {
              const i = charIdx++;
              return (
                <span
                  key={`${i}-${c}`}
                  className="flap"
                  style={{ animationDelay: staggered ? `${i * 22}ms` : '0ms' }}
                >
                  {c}
                </span>
              );
            })}
          </span>
        );
      })}
    </span>
  );
};

const roundUpToNearestMinute = (time) => {
  const date = new Date(time);
  if (date.getSeconds() > 0) date.setMinutes(date.getMinutes() + 1);
  date.setSeconds(0, 0);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const copyToClipboard = (trainNumber, station, arrivalTime, isFirstStation) => {
  const roundedTime = roundUpToNearestMinute(arrivalTime);
  const action = isFirstStation ? 'leaving' : 'reaching';
  const message = `I am on Train ${trainNumber}, ${action} ${station} at ${roundedTime}. You can see my train status at https://ontrack-551821400291.us-central1.run.app/`;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(message).catch(() => {});
  }
};

// Short HH:MM display so the board reads like a real Solari unit.
// 'N/A' is preserved when the API doesn't return a timestamp.
const fmtShort = (time) => {
  if (!time) return '—';
  const d = new Date(Date.parse(time));
  if (isNaN(d)) return '—';
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
};

const TrainSchedule = ({ trainData, isTrainActive, nextStop, getStopStatus }) => {
  if (!trainData?.STOPS?.length) return null;

  return (
    <section className={`solari TrainSchedule ${isTrainActive ? '' : 'greyedTable'}`}>
      <div className="boardHead">
        <span>Station</span>
        <span className="r">Arr</span>
        <span className="r depCol">Dep</span>
        <span className="r">Status</span>
      </div>

      {trainData.STOPS.map((stop, index) => {
        const departed = stop.DEPARTED === 'YES';
        const isNext = isTrainActive && stop.STATIONNAME === nextStop?.STATIONNAME;
        const rowClass =
          (departed ? 'departed departedRow ' : '') +
          (isNext ? 'next nextStopHighlight ' : '');
        const status = getStopStatus(stop);

        return (
          <div
            className={`boardRow ${rowClass.trim()}`}
            key={`${stop.STATIONNAME}-${index}`}
          >
            <span
              className="station cell"
              onClick={() =>
                copyToClipboard(trainData.TRAIN_ID, stop.STATIONNAME, stop.TIME, index === 0)
              }
              title="Click to copy a share message"
            >
              <Flap text={stop.STATIONNAME || '—'} staggered={index < 6} />
            </span>
            <span className="time r cell">
              <Flap text={fmtShort(stop.TIME)} staggered={false} />
            </span>
            <span className="time r depCol cell">
              <Flap text={fmtShort(stop.DEP_TIME)} staggered={false} />
            </span>
            <span
              className={`status r cell ${
                status === 'Late' ? 'late delayed' : status === 'Cancelled' ? 'cancelled' : 'ontime onTime'
              }`}
            >
              <Flap
                text={status === 'Late' ? 'LATE' : status === 'Cancelled' ? 'CXL' : 'ON TIME'}
                staggered={false}
              />
            </span>
          </div>
        );
      })}
    </section>
  );
};

export default TrainSchedule;
