import React from 'react';
import { FaMoon, FaSun, FaRegClock } from 'react-icons/fa'; // Import FaRegClock for dark-analog mode
import '../styles/HelpOverlay.css';

const HelpOverlay = ({ isVisible, onClose, displayMode, toggleDisplayMode }) => {
  if (!isVisible) return null;

  const getIcon = () => {
    if (displayMode === 'light') return <FaMoon />;
    if (displayMode === 'dark-mode') return <FaRegClock />;
    return <FaSun />;
  };

  return (
    <div className="overlay">
      <div className="content">
        <h2>About OnTrack</h2>
        <p>OnTrack uses the NJTransit RailData API to find the real-time status of NJTransit trains, given the train number.</p>
        <h3>Please Note</h3>
        <ul className="list">
          <li>The API does not always show terminated trains as having departed from their last stop.</li>
          <li>Arrival time is dynamic, showing the calculated ETA. Departure time is static, showing the original scheduled departure time.</li>
          <li>Trains significantly in the future (ex, 10 hours) may have incomplete stop data.</li>
          <li>The API does serve data for Amtrak and SEPTA trains travelling to New Jersey. This data can be incomplete.</li>
        </ul>
        <button onClick={onClose} className="helpCloseButton">Close</button>
        <button onClick={toggleDisplayMode} className="darkModeToggle">
          {getIcon()}
        </button>
      </div>
    </div>
  );
};

export default HelpOverlay;
