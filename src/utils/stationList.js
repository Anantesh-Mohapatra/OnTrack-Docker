import { getBackendBase } from './backend';

// Memoized promise — first call fetches, every later call awaits the same
// promise. Same singleton pattern as getBackendBase. Survives the lifetime
// of the page; ~20KB payload, fine to hold in memory.
let stationListPromise = null;

export function getStationList() {
  if (!stationListPromise) {
    stationListPromise = (async () => {
      try {
        const base = await getBackendBase();
        const res = await fetch(`${base}/api/station-list`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data : [];
      } catch {
        stationListPromise = null;
        return [];
      }
    })();
  }
  return stationListPromise;
}

// Map a vehicle-data NEXT_STOP string to an index in the given train's STOPS
// array using NJT's published crosswalk. Returns -1 when:
//   - inputs are malformed or station list is empty (caller falls back)
//   - NEXT_STOP isn't in the station list (likely a new/renamed station
//     that postdates our cached list)
//   - resolved STATION_2CHAR codes don't appear in this train's STOPS
//   - more than one stop matches (very rare; defensive)
//
// The "Secaucus" case (STATION_14CHAR matches three codes: SC/SE/TS) is
// resolved trivially because any given train's route only contains one of
// the three — the intersection picks it.
export function resolveNextStopIndex(stops, nextStopName, stationList) {
  if (!Array.isArray(stops) || !nextStopName || !Array.isArray(stationList) || !stationList.length) {
    return -1;
  }
  const codes = new Set(
    stationList
      .filter((s) => s && s.STATION_14CHAR === nextStopName)
      .map((s) => s.STATION_2CHAR)
  );
  if (!codes.size) return -1;
  const matches = [];
  for (let i = 0; i < stops.length; i++) {
    if (codes.has(stops[i]?.STATION_2CHAR)) matches.push(i);
  }
  return matches.length === 1 ? matches[0] : -1;
}
