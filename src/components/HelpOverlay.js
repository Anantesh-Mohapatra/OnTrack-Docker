import React from 'react';

const HelpOverlay = ({ isVisible, onClose }) => {
  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.content}>
        <h2>About OnTrack</h2>
        <p>OnTrack uses the NJTransit RailData API to find the real-time status of NJTransit trains, given the train number.</p>
        <h3>Please Note</h3>
        <ul style={styles.list}>
          <li>The API does not always show terminated trains as having departed from their last stop.</li>
          <li>Trains significantly in the future (ex, 10 hours) may have incomplete stop data.</li>
          <li>The API does serve data for Amtrak and SEPTA trains travelling to New Jersey. This data can be incomplete.</li>
        </ul>
        <button onClick={onClose} className="helpCloseButton">Close</button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  content: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '100%',
    textAlign: 'center',
  },
  helpCloseButton: {
    marginTop: '20px',
    padding: '10px 20px',
    backgroundColor: '#f0803d',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  closeButtonHover: {
    backgroundColor: '#b31b90',
  },
  list: {
    textAlign: 'left',
  },
};

export default HelpOverlay;
