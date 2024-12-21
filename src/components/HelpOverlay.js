import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import '../styles/HelpOverlay.css';

const HelpOverlay = ({ isVisible, onClose, isDarkMode, toggleDarkMode }) => {
  if (!isVisible) return null;

  return (
    <div className="overlay">
      <div className="content">
        <h2>About OnTrack</h2>
        <p>OnTrack uses the NJTransit RailData API to find the real-time status of NJTransit trains, given the train number.</p>
        <h3>Please Note</h3>
        <ul className="list">
          <li>The API does not always show terminated trains as having departed from their last stop.</li>
          <li>Trains significantly in the future (ex, 10 hours) may have incomplete stop data.</li>
          <li>The API does serve data for Amtrak and SEPTA trains travelling to New Jersey. This data can be incomplete.</li>
        </ul>
        <button onClick={onClose} className="helpCloseButton">Close</button>
        <button onClick={toggleDarkMode} className="darkModeToggle">
          {isDarkMode ? <FaSun /> : <FaMoon />}
        </button>
      </div>
    </div>
  );
};

export default HelpOverlay;
