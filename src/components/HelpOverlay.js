import React, { useEffect } from 'react';
import '../styles/HelpOverlay.css';

// The theme toggle previously lived inside this overlay; the redesign
// moves it to a fixed corner button (rendered in App.js) so the help
// panel can stay focused on "what is this app and what should I know
// about the data".
const HelpOverlay = ({ isVisible, onClose }) => {
  useEffect(() => {
    if (!isVisible) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="About OnTrack">
      <div className="content" onClick={(e) => e.stopPropagation()}>
        <div className="helpHead">
          <h2>About OnTrack</h2>
          <button type="button" className="helpClose" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="helpBody">
          <p className="helpLead">
            Given a train number, OnTrack finds real-time information on where it is,
            when it gets to each stop, and whether it's running on time.
          </p>

          <div className="helpSectionLabel">FYI</div>
          <ul className="list helpList">
            <li>The API doesn't always show terminated trains as having departed from their last stop.</li>
            <li><strong>Arrival</strong> times are dynamic ETAs; <strong>departure</strong> times are static scheduled times.</li>
            <li>Trains far in the future (10+ hours) may have incomplete stop data.</li>
            <li>Amtrak and SEPTA trains to New Jersey are included, but may have incomplete data.</li>
            <li>Reported map location may be delayed or approximate.</li>
          </ul>
        </div>

        <div className="helpFoot">Data via the NJ Transit RailData API.</div>
      </div>
    </div>
  );
};

export default HelpOverlay;
