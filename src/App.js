import React, { useState, useEffect } from 'react';
import TrainStatus from './components/TrainStatus';
import PopularTrains from './components/PopularTrains';
import HelpOverlay from './components/HelpOverlay';
import './App.css';

// Resolve the initial theme: explicit saved choice wins; otherwise we
// follow the OS via prefers-color-scheme. SSR-safe (window guard).
const getInitialDisplayMode = () => {
  if (typeof window === 'undefined') return 'light';
  const saved = window.localStorage?.getItem('displayMode');
  // Fold legacy values (dark-mode / dark-analog) into the unified 'dark'.
  if (saved === 'dark' || saved === 'dark-mode' || saved === 'dark-analog') return 'dark';
  if (saved === 'light') return 'light';
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

const App = () => {
  const [selectedTrain, setSelectedTrain] = useState('');
  const [isHelpVisible, setIsHelpVisible] = useState(false);
  const [displayMode, setDisplayMode] = useState(getInitialDisplayMode);

  // Apply theme class to body. Localstorage write happens on explicit
  // toggle below — not here — so the OS-derived default doesn't get
  // captured as a "user choice" and freeze the preference.
  useEffect(() => {
    document.body.classList.remove('light', 'dark', 'dark-mode', 'dark-analog');
    document.body.classList.add(displayMode);
  }, [displayMode]);

  // Live-follow the OS color scheme while the user hasn't made an
  // explicit choice. Once they tap the toggle, their saved preference
  // takes over and OS changes stop overriding it.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      if (!window.localStorage?.getItem('displayMode')) {
        setDisplayMode(e.matches ? 'dark' : 'light');
      }
    };
    if (mq.addEventListener) mq.addEventListener('change', onChange);
    else if (mq.addListener) mq.addListener(onChange);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', onChange);
      else if (mq.removeListener) mq.removeListener(onChange);
    };
  }, []);

  const handleSelectTrain = (trainNumber) => {
    setSelectedTrain(trainNumber.toString());
  };

  const toggleHelpOverlay = () => setIsHelpVisible((v) => !v);

  const toggleDisplayMode = () => {
    setDisplayMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try { window.localStorage?.setItem('displayMode', next); } catch {}
      return next;
    });
  };

  const MoonIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
  const SunIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );

  return (
    <div className={`container App ${displayMode}`}>
      <header className="architrave">
        <div className="wordmark">
          <span className="chevrons left" aria-hidden="true">
            <span className="chev orange" />
            <span className="chev magenta" />
            <span className="chev blue" />
          </span>
          <h1 className="title">OnTrack</h1>
          <span className="chevrons" aria-hidden="true">
            <span className="chev orange" />
            <span className="chev magenta" />
            <span className="chev blue" />
          </span>
        </div>
      </header>

      <PopularTrains onSelectTrain={handleSelectTrain} />
      <TrainStatus initialTrainNumber={selectedTrain} />

      <HelpOverlay isVisible={isHelpVisible} onClose={toggleHelpOverlay} />

      <div className="utilityDock" role="group" aria-label="Utility actions">
        <button
          type="button"
          className="dockBtn themeToggle"
          aria-label={displayMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          title={displayMode === 'light' ? 'Switch to dark' : 'Switch to light'}
          onClick={toggleDisplayMode}
        >
          {displayMode === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          type="button"
          className="dockBtn helpButton"
          aria-label="About OnTrack"
          title="About OnTrack"
          onClick={toggleHelpOverlay}
        >
          ?
        </button>
      </div>
    </div>
  );
};

export default App;
