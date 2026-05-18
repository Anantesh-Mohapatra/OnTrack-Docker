import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getBackendBase } from '../utils/backend';
import '../styles/PopularTrains.css';

// Four customizable slots. Each slot is either null (= use a dynamic default,
// which we pick fresh on every page load from currently-running trains) or an
// object { trainNumber, stop } overriding that slot.
const NUM_SLOTS = 4;
const STORAGE_KEY = 'ontrack.popularSlots';
// Separate flag for the mobile "tap and hold to customize" hint. Dismissed
// either by the user tapping × or implicitly by saving their first slot.
const HINT_DISMISSED_KEY = 'ontrack.popularHintDismissed';
// Fallback if vehicleData is unavailable (e.g., offline or backend down).
// Keeps the app usable with the previous hardcoded experience.
const FALLBACK_WEEKDAY = ['3720', '3725', '3243', '3883'];
const FALLBACK_WEEKEND = ['7826', '7867', '7232', '7273'];
const LONG_PRESS_MS = 500;
// Matches the @media breakpoint in PopularTrains.css. Below this, the inline
// editor would push other cards out of the 2x2 grid into a 2+1+1 reflow that
// reads as broken — so on mobile we render the editor as a modal overlay
// instead, leaving the grid intact behind it.
const MOBILE_MAX_PX = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

function loadSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return Array(NUM_SLOTS).fill(null);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return Array(NUM_SLOTS).fill(null);
    // Normalize length — if we later change NUM_SLOTS, old data won't break.
    return Array.from({ length: NUM_SLOTS }, (_, i) => {
      const s = parsed[i];
      if (!s || typeof s !== 'object' || !s.trainNumber) return null;
      return { trainNumber: String(s.trainNumber), stop: s.stop ? String(s.stop) : null };
    });
  } catch {
    return Array(NUM_SLOTS).fill(null);
  }
}

function saveSlots(slots) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch {
    // localStorage may be unavailable (private mode / quota). Non-fatal.
  }
}

// Pick four default train numbers from currently-running trains, one per
// distinct line. If vehicle data fails or gives us fewer than four distinct
// lines, top up from the hardcoded fallback list.
function pickDefaultsFromVehicles(vehicles) {
  const today = new Date().getDay();
  const fallback = today === 0 || today === 6 ? FALLBACK_WEEKEND : FALLBACK_WEEKDAY;
  if (!Array.isArray(vehicles) || vehicles.length === 0) return [...fallback];

  const byLine = new Map();
  for (const v of vehicles) {
    const line = v?.TRAIN_LINE;
    const id = v?.ID;
    if (!line || !id) continue;
    if (!byLine.has(line)) byLine.set(line, []);
    byLine.get(line).push(String(id));
  }

  const lines = [...byLine.keys()];
  // Fisher-Yates shuffle for line order so defaults rotate between loads.
  for (let i = lines.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lines[i], lines[j]] = [lines[j], lines[i]];
  }

  const chosen = [];
  for (const line of lines) {
    if (chosen.length >= NUM_SLOTS) break;
    const trains = byLine.get(line);
    const pick = trains[Math.floor(Math.random() * trains.length)];
    chosen.push(pick);
  }
  // Top up with the fallback list if we got fewer than NUM_SLOTS distinct lines.
  for (const f of fallback) {
    if (chosen.length >= NUM_SLOTS) break;
    if (!chosen.includes(f)) chosen.push(f);
  }
  return chosen.slice(0, NUM_SLOTS);
}

function todayYYYYMMDD() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date()).replace(/-/g, '');
}

// Format a STOPS-array time string like "21-Apr-2026 05:48:00 PM" to "5:48 PM".
function formatTime(isoLike) {
  if (!isoLike) return 'N/A';
  const d = new Date(Date.parse(isoLike));
  if (isNaN(d)) return 'N/A';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

// Canonicalize a station name so GTFS and realtime API variants match.
// Known differences between the two sources include:
//   - Abbreviations: "Jersey Ave." vs "Jersey Avenue", "Secaucus Upper Lvl"
//     vs "Secaucus Upper Level".
//   - Suffix words: "Newark Airport" vs "Newark Airport Railroad Station",
//     "Edison" vs "Edison Station".
// We lowercase, drop punctuation, expand abbreviations, then strip generic
// suffix words so both spellings collapse to the same key.
function canonStation(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/\b(lvl)\b/g, 'level')
    .replace(/\b(ave)\b/g, 'avenue')
    .replace(/\b(st)\b/g, 'street')
    .replace(/\brailroad station\b/g, '')
    .replace(/\bstation\b/g, '')
    .replace(/\bterminal\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Find a live STOP whose name matches the target (possibly from a different
// source). Uses canonStation so name variants still match.
function findStop(stops, target) {
  if (!stops || !target) return null;
  const t = canonStation(target);
  return stops.find((s) => canonStation(s.STATIONNAME) === t) || null;
}

// Title-case a station name. Needed because GTFS returns stops in ALL CAPS
// ("NEW YORK PENN STATION", "JERSEY AVE.") while the realtime API returns
// them pre-formatted ("New York Penn Station", "Jersey Ave."). Normalizing
// everything here means the dropdown, the saved value, and the card display
// stay consistent regardless of source.
// State-code tokens (NJ, NY, PA, etc.) stay uppercase so station names like
// "Middletown NJ" don't come out as "Middletown Nj".
function titleCase(name) {
  if (!name) return name;
  return name
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\b(nj|ny|pa|ct|ma|ri|de|md|va)\b/gi, (m) => m.toUpperCase());
}

const PopularTrains = ({ onSelectTrain }) => {
  // User-customized slots (persisted).
  const [slots, setSlots] = useState(() => loadSlots());
  // Dynamic defaults picked from vehicle-data. Stable for the session.
  // Seed synchronously with the hardcoded fallback so the first render shows
  // real cards instead of blank "—" placeholders. The /api/vehicle-data fetch
  // below then swaps in fresh, line-diversified defaults once it resolves.
  const [defaultNumbers, setDefaultNumbers] = useState(() => pickDefaultsFromVehicles(null));
  // Per-slot live train data from /api/train-data (keyed by index).
  const [trainsData, setTrainsData] = useState(Array(NUM_SLOTS).fill(null));
  // Which slot index is currently being edited (-1 = none).
  const [editingIndex, setEditingIndex] = useState(-1);
  // Mobile-only "tap and hold to customize" hint. Dismissed permanently on
  // first ×-tap or first successful save. Hidden on desktop via CSS.
  const [hintDismissed, setHintDismissed] = useState(() => {
    try { return localStorage.getItem(HINT_DISMISSED_KEY) === '1'; } catch { return false; }
  });
  const dismissHint = useCallback(() => {
    setHintDismissed(true);
    try { localStorage.setItem(HINT_DISMISSED_KEY, '1'); } catch {}
  }, []);
  const isMobile = useIsMobile();

  // Each slot's effective train number: user override, else dynamic default.
  const effectiveNumbers = useMemo(() => {
    return Array.from({ length: NUM_SLOTS }, (_, i) => {
      const custom = slots[i];
      if (custom?.trainNumber) return custom.trainNumber;
      return defaultNumbers[i] || null;
    });
  }, [slots, defaultNumbers]);

  // Fetch vehicle data once on mount, pick defaults, keep stable for session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = await getBackendBase();
        const res = await fetch(`${base}/api/vehicle-data`);
        const vehicles = res.ok ? await res.json() : null;
        if (cancelled) return;
        setDefaultNumbers(pickDefaultsFromVehicles(vehicles));
      } catch {
        if (cancelled) return;
        setDefaultNumbers(pickDefaultsFromVehicles(null));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch live data for each effective train number.
  useEffect(() => {
    let cancelled = false;
    const fetchOne = async (num) => {
      if (!num) return null;
      try {
        const base = await getBackendBase();
        const res = await fetch(`${base}/api/train-data?train=${encodeURIComponent(num)}`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.error ? null : data;
      } catch {
        return null;
      }
    };
    (async () => {
      const results = await Promise.all(effectiveNumbers.map(fetchOne));
      if (!cancelled) setTrainsData(results);
    })();
    return () => { cancelled = true; };
  }, [effectiveNumbers]);

  const updateSlot = useCallback((index, slot) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = slot;
      saveSlots(next);
      return next;
    });
    // A successful save proves the user has found the customizer, so the
    // hint has done its job — dismiss it implicitly.
    if (slot) dismissHint();
  }, [dismissHint]);

  const getStopStatus = (arrivalTime, departureTime) => {
    if (!arrivalTime || !departureTime) return 'N/A';
    const arrival = new Date(Date.parse(arrivalTime));
    const departure = new Date(Date.parse(departureTime));
    if (isNaN(arrival) || isNaN(departure)) return 'N/A';
    return arrival > departure ? 'Late' : 'On Time';
  };

  // On mobile, suppress inline editing inside SlotCard and render the editor
  // as a modal overlay (below) — that way the 2x2 grid stays intact behind it
  // instead of reflowing when one slot becomes wider.
  const inlineEditingIndex = isMobile ? -1 : editingIndex;
  const showOverlay = isMobile && editingIndex >= 0;
  const overlaySlot = showOverlay ? slots[editingIndex] : null;
  const overlayInitial = showOverlay
    ? (overlaySlot || { trainNumber: effectiveNumbers[editingIndex] || '', stop: null })
    : null;

  return (
    <div className="popularTrainsContainer">
      <div className="trainContainer">
        {Array.from({ length: NUM_SLOTS }, (_, index) => (
          <SlotCard
            key={index}
            index={index}
            trainNumber={effectiveNumbers[index]}
            train={trainsData[index]}
            slot={slots[index]}
            isEditing={inlineEditingIndex === index}
            onEnterEdit={() => setEditingIndex(index)}
            onExitEdit={() => setEditingIndex(-1)}
            onSave={(newSlot) => { updateSlot(index, newSlot); setEditingIndex(-1); }}
            onUseRandom={() => { updateSlot(index, null); setEditingIndex(-1); }}
            onSelect={(num) => onSelectTrain(num)}
            getStopStatus={getStopStatus}
          />
        ))}
      </div>
      {!hintDismissed && (
        <div className="popularTrainsHint" role="note">
          <span className="popularTrainsHintText">Tap and hold a slot to customize</span>
          <button
            type="button"
            className="popularTrainsHintClose"
            aria-label="Dismiss hint"
            onClick={dismissHint}
          >
            ×
          </button>
        </div>
      )}
      {showOverlay && (
        <div
          className="editOverlay"
          role="dialog"
          aria-modal="true"
          aria-label="Customize slot"
          onClick={() => setEditingIndex(-1)}
        >
          <div className="editOverlayInner" onClick={(e) => e.stopPropagation()}>
            <EditPanel
              initial={overlayInitial}
              onSave={(newSlot) => { updateSlot(editingIndex, newSlot); setEditingIndex(-1); }}
              onUseRandom={() => { updateSlot(editingIndex, null); setEditingIndex(-1); }}
              onCancel={() => setEditingIndex(-1)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Per-slot card + inline editor ----

const SlotCard = ({
  index, trainNumber, train, slot, isEditing,
  onEnterEdit, onExitEdit, onSave, onUseRandom, onSelect, getStopStatus,
}) => {
  const cardRef = useRef(null);
  const longPressTimer = useRef(null);
  const longPressFired = useRef(false);

  // Long-press detection for touch devices. We only enter edit mode after
  // LONG_PRESS_MS of continuous contact; a short tap still selects the train.
  const onTouchStart = () => {
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onEnterEdit();
    }, LONG_PRESS_MS);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };
  const onTouchEnd = () => cancelLongPress();
  const onTouchMove = () => cancelLongPress();

  const onClick = () => {
    // If a long-press just fired, swallow the click so we don't also navigate.
    if (longPressFired.current) { longPressFired.current = false; return; }
    if (train && train.TRAIN_ID) onSelect(trainNumber);
  };

  if (isEditing) {
    return (
      <EditPanel
        initial={slot || { trainNumber: trainNumber || '', stop: null }}
        onSave={onSave}
        onUseRandom={onUseRandom}
        onCancel={onExitEdit}
      />
    );
  }

  const isAvailable = !!(train && train.TRAIN_ID);
  const backgroundColor = isAvailable ? train.BACKCOLOR : '#888888';
  const textColor = isAvailable ? train.FORECOLOR : '#FFFFFF';
  const pillBackgroundColor = isAvailable ? 'rgba(160,160,160,0.8)' : 'rgba(102,102,102,0.8)';

  // Which stop's ETA to show on the card.
  // - Customized slot with a saved stop: that stop (fall back to destination
  //   if the stop isn't on today's route — NJT changes routes sometimes).
  // - Otherwise: the train's destination (last stop). This replaces the old
  //   NYP / Metropark / Woodbridge heuristic, which only made sense for the
  //   original author's commute.
  let targetStop = null;
  let stopMismatch = false;
  if (isAvailable && train.STOPS?.length) {
    const destination = train.STOPS[train.STOPS.length - 1];
    if (slot?.stop) {
      const match = findStop(train.STOPS, slot.stop);
      if (match) {
        targetStop = match;
      } else {
        targetStop = destination;
        stopMismatch = true;
      }
    } else {
      targetStop = destination;
    }
  }

  const timeToStation = targetStop ? formatTime(targetStop.TIME) : 'N/A';
  const stationLabel = targetStop?.STATIONNAME || 'N/A';
  const customStatus = isAvailable
    ? getStopStatus(train.STOPS?.[0]?.TIME, train.STOPS?.[0]?.DEP_TIME)
    : 'N/A';
  const circleColor = customStatus === 'On Time' ? '#90EE90' : 'red';

  return (
    <div
      ref={cardRef}
      className={`trainCard ${isAvailable ? '' : 'trainCardDisabled'}`}
      style={{ backgroundColor, color: textColor }}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchCancel={cancelLongPress}
    >
      <button
        type="button"
        className="editButton"
        aria-label={`Customize slot ${index + 1}`}
        onClick={(e) => { e.stopPropagation(); onEnterEdit(); }}
      >
        ✎
      </button>
      <h3>{trainNumber ? `Train ${trainNumber}` : '—'}</h3>
      {isAvailable ? (
        <>
          <p className="stationText">To {stationLabel}: {timeToStation}</p>
          {stopMismatch && (
            <p className="stopMismatch">(saved stop not on today's route)</p>
          )}
          <div className="popularTrainsStatusPill" style={{ color: textColor, backgroundColor: pillBackgroundColor }}>
            <span className="popularTrainsStatusText">{customStatus}</span>
            <span className="popularTrainsStatusCircle" style={{ borderColor: textColor, backgroundColor: circleColor }}></span>
          </div>
        </>
      ) : (
        <p>Train is not currently active</p>
      )}
    </div>
  );
};

// Inline editor used in place of the card while the user is customizing.
// Stop options always come from GTFS /api/scheduled-stops — it returns the
// FULL route for any train on any date, unlike the realtime API which only
// returns upcoming stops once a train is in progress.
//
// Flow: typing a train number auto-loads its stops (debounced). The stop
// picker is optional — saving without one falls back to the destination.
// The shuffle button always offers a one-tap return to a random active train.
const AUTO_LOAD_DEBOUNCE_MS = 450;

const EditPanel = ({ initial, onSave, onUseRandom, onCancel }) => {
  const [trainInput, setTrainInput] = useState(initial.trainNumber || '');
  // Title-case the saved stop on open — older saves may have been stored in
  // ALL CAPS (if they were made while the train was inactive and stops came
  // from GTFS, before we normalized at the source). Title-casing here keeps
  // the pre-selection matching the dropdown options.
  const [stopInput, setStopInput] = useState(titleCase(initial.stop) || '');
  const [stopOptions, setStopOptions] = useState([]);
  // Which train number's stops are currently in `stopOptions`. Used to detect
  // when the typed input has diverged from what's loaded (so we re-fetch).
  const [loadedFor, setLoadedFor] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Escape closes the editor — keyboard-only users shouldn't have to Tab
  // across to the × button. Registered globally because focus may be on
  // any element inside the panel (input, select, buttons) when pressed.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Fetch stops for the entered train. GTFS is the primary source because it
  // returns the FULL route — the realtime API only returns upcoming stops
  // once a train is in progress, which would hide passed stops from the
  // dropdown. Live is still used as a fallback if GTFS doesn't cover the
  // train (e.g., it's not on today's service calendar but somehow exists).
  const loadStopsFor = useCallback(async (num) => {
    setLoadError('');
    setIsLoading(true);
    setStopOptions([]);
    setLoadedFor(null);
    try {
      const base = await getBackendBase();
      const schedRes = await fetch(`${base}/api/scheduled-stops?train=${encodeURIComponent(num)}`);
      if (schedRes.ok) {
        const sched = await schedRes.json();
        if (sched?.stops?.length) {
          const opts = sched.stops.map(titleCase);
          setStopOptions(opts);
          setLoadedFor(num);
          // If the user had a saved stop whose exact casing/naming differs
          // from the GTFS dropdown (e.g., they saved "Jersey Avenue" from
          // live, but GTFS uses "Jersey Ave."), swap to the dropdown's
          // canonical spelling so the pre-selection works.
          setStopInput((prev) => {
            if (!prev) return prev;
            if (opts.includes(prev)) return prev;
            const match = opts.find((o) => canonStation(o) === canonStation(prev));
            return match || '';
          });
          return;
        }
      }
      // GTFS unavailable (backend hasn't loaded the feed yet) is a different
      // failure mode than "we have the feed but this train isn't scheduled".
      // Surface it with a message that won't confuse users into thinking
      // their input is wrong.
      if (schedRes.status === 503) {
        setLoadError('Schedule data is temporarily unavailable. Try again in a moment.');
        return;
      }
      const liveRes = await fetch(`${base}/api/train-data?train=${encodeURIComponent(num)}`);
      const live = liveRes.ok ? await liveRes.json() : null;
      if (live?.STOPS?.length) {
        const opts = live.STOPS.map((s) => titleCase(s.STATIONNAME));
        setStopOptions(opts);
        setLoadedFor(num);
        return;
      }
      setLoadError('No train found.');
    } catch (err) {
      setLoadError('Could not load stops. Check connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-load whenever the typed train number changes — debounced so we don't
  // hammer the API mid-typing. Empty input resets everything to a clean
  // "type a train number" state. Re-running for the same already-loaded
  // number is a no-op so re-opening the editor doesn't refetch needlessly.
  // We don't clear stopInput here: loadStopsFor preserves a saved stop if the
  // new train still hits it, and otherwise clears it once stops arrive. That
  // also means the saved-stop pre-selection survives StrictMode's effect
  // re-runs (a setStopInput('') here would race against that preservation).
  const trimmedTrain = trainInput.trim();
  useEffect(() => {
    if (!trimmedTrain) {
      setStopOptions([]);
      setLoadedFor(null);
      setLoadError('');
      setIsLoading(false);
      return undefined;
    }
    if (trimmedTrain === loadedFor) return undefined;
    const t = setTimeout(() => loadStopsFor(trimmedTrain), AUTO_LOAD_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [trimmedTrain, loadedFor, loadStopsFor]);

  // Save is allowed once the user has:
  //   1. A non-empty train number whose stops loaded successfully, and
  //   2. Either no stop chosen (we'll fall back to destination) OR a stop
  //      that's actually on that train's route.
  const canSave =
    !!trimmedTrain &&
    trimmedTrain === loadedFor &&
    !isLoading &&
    !loadError &&
    (stopInput === '' || stopOptions.includes(stopInput));

  const handleSave = () => {
    if (!canSave) return;
    // Empty stop persists as null so the card uses its destination default.
    onSave({ trainNumber: trimmedTrain, stop: stopInput || null });
  };

  const handleFormSubmit = (e) => {
    // Pressing Enter in the input submits the form — treat that as Save.
    e.preventDefault();
    handleSave();
  };

  return (
    <div className="trainCard editCard">
      <div className="editHeader">
        <h3>Customize</h3>
        <div className="editHeaderActions">
          {/* Shuffle lives in the header — it's an alternative to entering
              your own train, not an alternative to Save. Keeping it away from
              the Save button avoids accidental taps. */}
          <button
            type="button"
            className="editIconBtn"
            onClick={onUseRandom}
            aria-label="Use a random active train"
            title="Use a random active train"
          >
            <ShuffleIcon />
          </button>
          <button
            type="button"
            className="editIconBtn editCloseBtn"
            aria-label="Close customizer"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
      </div>

      <form onSubmit={handleFormSubmit} className="editForm">
        <label className="editLabel" htmlFor="editTrainInput">Train number</label>
        <input
          ref={inputRef}
          id="editTrainInput"
          className="editInput editInputFull"
          type="text"
          inputMode="numeric"
          value={trainInput}
          onChange={(e) => setTrainInput(e.target.value)}
          placeholder="e.g. 3725"
        />
      </form>

      <div className="editField">
        <label className="editLabel" htmlFor="editStopSelect">Stop (optional)</label>
        <select
          id="editStopSelect"
          className="editSelect"
          value={stopInput}
          onChange={(e) => setStopInput(e.target.value)}
          disabled={stopOptions.length === 0}
        >
          <option value="">
            {isLoading
              ? 'Loading stops…'
              : stopOptions.length === 0
                ? (trimmedTrain ? 'No stops loaded' : 'Enter a train number first')
                : 'Use destination'}
          </option>
          {stopOptions.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>
      {loadError && <p className="editError">{loadError}</p>}

      <div className="editActions">
        <button
          type="button"
          className="editSaveBtn"
          onClick={handleSave}
          disabled={!canSave}
        >
          Save
        </button>
      </div>
    </div>
  );
};

// Inline Lucide-style shuffle glyph. Inline so we don't pull in an icon
// dependency for one button; `currentColor` lets it inherit the dark-mode
// theme tweaks applied to .editIconBtn.
const ShuffleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M16 3h5v5" />
    <path d="M4 20 21 3" />
    <path d="M21 16v5h-5" />
    <path d="m15 15 6 6" />
    <path d="m4 4 5 5" />
  </svg>
);

export default PopularTrains;
